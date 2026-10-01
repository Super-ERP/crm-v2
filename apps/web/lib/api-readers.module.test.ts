import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"

import {
  accounts,
  funnels,
  funnelStageHistory,
  intercompanyDealParties,
  intercompanyDeals,
  leads,
  member,
  opportunities,
  persons,
  pipelineStages,
  projects,
  quotations,
  stageApprovalRequests,
} from "@/db/schema"
import { createDisabledModuleMap } from "@/lib/module-registry"
import { accountsList, funnelsGet, funnelsList, leadsList, opportunitiesList, personsGet, personsList, quotationsList } from "@/lib/api-readers"
import type { QuotationStatus } from "@/lib/quotation-transitions"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"

const moduleState = vi.hoisted(() => ({
  map: {
    projects: false,
    salesOrders: false,
    finance: false,
    forecast: false,
    audit: false,
    advancedRoles: false,
    documentation: false,
  },
}))

vi.mock("@/lib/modules.server", () => ({
  getEntitledModuleMap: vi.fn(async () => moduleState.map),
}))

const ctx = {
  tenantId: "tenant-1",
  memberId: "member-1",
  isSuperadmin: true,
  can: () => true,
} as unknown as ServerContext

function tableTx(entries: Array<[object, unknown[]]>): Tx & {
  whereCalls: Array<{ table: object | undefined; condition: unknown }>
  joins: object[]
  limits: number[]
  offsets: number[]
} {
  const queues = new Map(entries.map(([table, values]) => [table, [...values]]))
  const whereCalls: Array<{ table: object | undefined; condition: unknown }> = []
  const joins: object[] = []
  const limits: number[] = []
  const offsets: number[] = []
  return {
    select: vi.fn(() => {
      let value: unknown = []
      let currentTable: object | undefined
      const promise = () => Promise.resolve(value)
      const chain: Record<string, unknown> = {
        from: vi.fn((table: object) => {
          currentTable = table
          value = queues.get(table)?.shift() ?? []
          return chain
        }),
        innerJoin: vi.fn((table: object) => {
          joins.push(table)
          return chain
        }),
        leftJoin: vi.fn((table: object) => {
          joins.push(table)
          return chain
        }),
        where: vi.fn((condition: unknown) => {
          whereCalls.push({ table: currentTable, condition })
          return chain
        }),
        orderBy: vi.fn(() => chain),
        groupBy: vi.fn(() => chain),
        limit: vi.fn((value: number) => {
          limits.push(value)
          return chain
        }),
        offset: vi.fn((value: number) => {
          offsets.push(value)
          return chain
        }),
        then: (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) =>
          promise().then(resolve, reject),
      }
      return chain
    }),
    whereCalls,
    joins,
    limits,
    offsets,
  } as unknown as Tx & {
    whereCalls: Array<{ table: object | undefined; condition: unknown }>
    joins: object[]
    limits: number[]
    offsets: number[]
  }
}

describe("module-owned nested API readers", () => {
  beforeEach(() => {
    moduleState.map = createDisabledModuleMap()
  })

  it("does not query or return project rows from a core person detail", async () => {
    const tx = tableTx([
      [persons, [[{ person: { id: "person-1" }, accountName: "Acme", accountOwner: "member-1" }]]],
      [funnels, [[{ id: "funnel-1", name: "Deal" }]]],
      [projects, [[{ id: "project-secret", name: "Secret project" }]]],
    ])

    const detail = await personsGet(tx, ctx, "person-1")

    expect(detail?.projects).toEqual([])
    expect((tx.select as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
  })

  it("does not query or return intercompany parties from the funnel list", async () => {
    const tx = tableTx([
      [funnels, [[{ id: "funnel-1", name: "Deal" }], [{ count: 1 }]]],
      [intercompanyDealParties, [[{
        funnelId: "funnel-1",
        partnerEntityId: "partner-secret",
        partnerName: "Secret partner",
        shareType: "percent",
        shareValue: "40",
        currency: "MYR",
        manualFxRate: null,
      }]]],
    ])

    const result = await funnelsList(tx, ctx, { limit: 50, offset: 0 })

    expect(result.rows[0]?.parties).toEqual([])
    expect((tx.select as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
  })

  it("returns typed soft-deleted quotation history for funnel revision actions", async () => {
    const deletedAt = new Date("2026-08-18T00:00:00Z")
    const tx = tableTx([
      [funnels, [[{
        id: "funnel-1",
        accountId: "account-1",
        opportunityId: "opportunity-1",
        ownerMemberId: "member-1",
        currentStageId: "stage-1",
        pipelineId: "pipeline-1",
        primaryPersonId: null,
        primaryQuotationId: null,
        isIntercompany: false,
      }]]],
      [accounts, [[{ name: "Acme" }]]],
      [opportunities, [[{ id: "opportunity-1" }]]],
      [member, [[{ name: "Owner" }]]],
      [pipelineStages, [[{ id: "stage-1", name: "Open" }], [{ id: "stage-1", name: "Open" }]]],
      [quotations, [[{
        id: "quote-1",
        quoteNumber: "Q10001-1",
        status: "sent",
        total: "100.00",
        currency: "MYR",
        isPrimary: false,
        deletedAt,
      }]]],
      [funnelStageHistory, [[]]],
      [stageApprovalRequests, [[]]],
    ])

    const detail = await funnelsGet(tx, ctx, "funnel-1")

    expect(detail).not.toBeNull()
    const quotation = detail!.quotations[0]!
    const status: QuotationStatus = quotation.status
    expect(status).toBe("sent")
    expect(quotation.deletedAt).toBe(deletedAt)

    const quotationSelection = (tx.select as ReturnType<typeof vi.fn>).mock.calls.find(
      ([selection]) =>
        selection &&
        typeof selection === "object" &&
        (selection as Record<string, unknown>).status === quotations.status &&
        (selection as Record<string, unknown>).deletedAt === quotations.deletedAt
    )
    expect(quotationSelection).toBeDefined()

    const quotationWhere = tx.whereCalls.find(({ table }) => table === quotations)
    expect(quotationWhere).toBeDefined()
    const query = new PgDialect().sqlToQuery(quotationWhere!.condition as SQL<unknown>)
    expect(query.sql).not.toContain('"quotations"."deleted_at"')
  })

  it("returns account, funnel, and parent opportunity details for quotation filters", async () => {
    const tx = tableTx([
      [quotations, [[{
        q: { id: "quote-1", quoteNumber: "Q10001-1", funnelId: "funnel-1" },
        accountId: "account-1",
        accountName: "Acme Ltd",
        accountCode: "ACM-01",
        funnelId: "funnel-1",
        funnelName: "ERP migration",
        opportunityId: "opportunity-1",
        opportunityCode: "OPP-27-001",
        opportunityName: "FY27 Modernization",
        lineItemCount: 2,
      }], [{ count: 1 }]]],
    ])

    const result = await quotationsList(tx, ctx, { limit: 500, offset: 0 })

    expect(result.rows[0]).toMatchObject({
      id: "quote-1",
      accountId: "account-1",
      accountName: "Acme Ltd",
      accountCode: "ACM-01",
      funnelName: "ERP migration",
      opportunityId: "opportunity-1",
      opportunityCode: "OPP-27-001",
      opportunityName: "FY27 Modernization",
    })
    expect(tx.joins).toContain(accounts)
    expect(tx.joins).toContain(opportunities)
  })

  it("applies quotation search and filters before limiting a page", async () => {
    const tx = tableTx([[quotations, [[], [{ count: 42 }]]]])
    await quotationsList(tx, ctx, {
      limit: 25,
      offset: 50,
      query: { search: "Acme", accountIds: ["account-1"], statuses: ["draft"] },
    })

    expect(tx.limits).toEqual([25])
    expect(tx.offsets).toEqual([50])
    const where = tx.whereCalls.filter(({ table }) => table === quotations)
    expect(where).toHaveLength(2)
    for (const call of where) {
      const compiled = new PgDialect().sqlToQuery(call.condition as SQL<unknown>)
      expect(compiled.params).toContain("account-1")
      expect(compiled.params).toContain("draft")
      expect(compiled.params).toContain("%Acme%")
    }
  })

  it("uses the same bounded funnel stage, owner, and search conditions for rows and totals", async () => {
    const tx = tableTx([[funnels, [[], [{ count: 31, valueTotal: "130000" }]]]])
    const result = await funnelsList(tx, ctx, {
      limit: 25, offset: 25, stageId: "stage-1",
      query: { search: "Acme", selections: { accountOwnerMemberId: ["member-2"], status: ["open"] } },
    })
    expect(result).toMatchObject({ total: 31, valueTotal: "130000" })
    expect(tx.limits).toEqual([25])
    expect(tx.offsets).toEqual([25])
    const where = tx.whereCalls.filter(({ table }) => table === funnels)
    expect(where).toHaveLength(2)
    for (const call of where) {
      const params = new PgDialect().sqlToQuery(call.condition as SQL<unknown>).params
      expect(params).toContain("stage-1")
      expect(params).toContain("member-2")
      expect(params).toContain("open")
      expect(params).toContain("%Acme%")
    }
  })

  it("filters accounts, contacts, leads, and opportunities before their page limits", async () => {
    const cases = [
      { table: accounts, run: (tx: Tx) => accountsList(tx, ctx, { limit: 25, offset: 50, query: { search: "Acme", selections: { industry: ["Technology"] } } }), selected: "Technology" },
      { table: persons, run: (tx: Tx) => personsList(tx, ctx, { limit: 25, offset: 50, query: { search: "Acme", selections: { accountName: ["Acme"] } } }), selected: "Acme" },
      { table: leads, run: (tx: Tx) => leadsList(tx, ctx, { limit: 25, offset: 50, query: { search: "Acme", selections: { status: ["new"] } } }), selected: "new" },
      { table: opportunities, run: (tx: Tx) => opportunitiesList(tx, ctx, { limit: 25, offset: 50, query: { search: "Acme", selections: { accountId: ["account-1"] } } }), selected: "account-1" },
    ]
    for (const item of cases) {
      const tx = tableTx([[item.table, [[], [{ count: 0 }]]]])
      await item.run(tx)
      expect(tx.limits).toEqual([25])
      expect(tx.offsets).toEqual([50])
      const where = tx.whereCalls.filter(({ table }) => table === item.table)
      expect(where).toHaveLength(2)
      for (const call of where) {
        const params = new PgDialect().sqlToQuery(call.condition as SQL<unknown>).params
        expect(params).toContain("%Acme%")
        expect(params).toContain(item.selected)
      }
    }
  })

  it("does not query or return parties or partner responses from funnel detail", async () => {
    const tx = tableTx([
      [funnels, [[{
        id: "funnel-1",
        accountId: "account-1",
        opportunityId: "opportunity-1",
        ownerMemberId: "member-1",
        currentStageId: "stage-1",
        pipelineId: "pipeline-1",
        primaryPersonId: null,
        primaryQuotationId: null,
        isIntercompany: true,
      }]]],
      [accounts, [[{ name: "Acme" }]]],
      [opportunities, [[{ id: "opportunity-1" }]]],
      [intercompanyDealParties, [[{
        funnelId: "funnel-1",
        partnerEntityId: "partner-secret",
        partnerName: "Secret partner",
        shareType: "percent",
        shareValue: "40",
        currency: "MYR",
        manualFxRate: null,
      }]]],
      [intercompanyDeals, [[{
        partnerEntityId: "partner-secret",
        response: "accepted",
        reason: null,
        respondedAt: new Date("2026-01-01"),
      }]]],
      [member, [[{ name: "Owner" }]]],
      [pipelineStages, [[{ id: "stage-1", name: "Open" }], [{ id: "stage-1", name: "Open" }]]],
      [quotations, [[]]],
      [funnelStageHistory, [[]]],
      [stageApprovalRequests, [[]]],
    ])

    const detail = await funnelsGet(tx, ctx, "funnel-1")

    expect(detail?.parties).toEqual([])
    expect(detail?.partnerResponses).toEqual([])
    expect((tx.select as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(9)
  })
})
