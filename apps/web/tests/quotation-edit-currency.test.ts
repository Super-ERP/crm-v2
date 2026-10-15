import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  withTenant: vi.fn(),
  runAction: vi.fn(async (work: () => Promise<unknown>) => ({
    ok: true,
    data: await work(),
  })),
  visibleMemberIds: vi.fn(async () => []),
  canManageAllRecords: vi.fn(() => true),
  ownsOrManages: vi.fn(() => false),
  writeAudit: vi.fn(),
}))

vi.mock("@/lib/actions", () => ({
  withTenant: mocks.withTenant,
  requireContext: vi.fn(),
}))
vi.mock("@/lib/action-result", () => ({ runAction: mocks.runAction }))
vi.mock("@/lib/access-scope", () => ({
  visibleMemberIds: mocks.visibleMemberIds,
  canManageAllRecords: mocks.canManageAllRecords,
  ownsOrManages: mocks.ownsOrManages,
  ownerScope: vi.fn(),
}))
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }))
vi.mock("@/server/services/activity", () => ({ logActivity: vi.fn() }))
vi.mock("@/server/services/quote-sync", () => ({
  syncFunnelProductsFromQuote: vi.fn(),
}))
vi.mock("@/server/services/value", () => ({
  quoteNet: vi.fn(),
  syncOpportunityAmount: vi.fn(),
}))
vi.mock("@/server/services/numbering", () => ({ nextQuoteNumber: vi.fn() }))
vi.mock("@/app/(app)/payment-milestones/actions", () => ({
  seedDefaultFunnelMilestone: vi.fn(),
}))
vi.mock("@/lib/modules.server", () => ({
  getEntitledModuleMap: vi.fn(async () => ({})),
}))
vi.mock("@/lib/quotation-template-registry", () => ({ listActiveQuotationTemplateCodes: vi.fn(async () => new Set(["default"])), getActiveQuotationTemplateByCode: vi.fn(async () => null) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { getQuotationDocument, updateQuotation } from "@/app/(app)/quotations/actions"

type Chain = {
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  for: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  values: ReturnType<typeof vi.fn>
  returning: ReturnType<typeof vi.fn>
  then: Promise<unknown>["then"]
}

function chain(value: unknown, updates: unknown[]): Chain {
  const promise = Promise.resolve(value)
  const q = {} as Chain
  Object.assign(q, { leftJoin: vi.fn(() => q), orderBy: vi.fn(() => q) })
  q.from = vi.fn(() => q)
  q.where = vi.fn(() => q)
  q.limit = vi.fn(() => q)
  q.for = vi.fn(() => q)
  q.set = vi.fn((payload: unknown) => {
    updates.push(payload)
    return q
  })
  q.values = vi.fn(() => q)
  q.returning = vi.fn(() => q)
  q.then = promise.then.bind(promise)
  return q
}

function txWithSelects(values: unknown[], updatedRow: unknown = { id: "quotation-1" }) {
  const queue = [...values]
  const updates: unknown[] = []
  const tx = {
    select: vi.fn(() => chain(queue.shift() ?? [], updates)),
    update: vi.fn(() => chain([updatedRow], updates)),
    delete: vi.fn(() => chain([], updates)),
    insert: vi.fn(() => chain([], updates)),
  }
  return { tx, updates }
}

describe("quotation edit currency persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps the draft quotation currency when edit input omits an override", async () => {
    const existing = {
      id: "quotation-1",
      funnelId: "funnel-1",
      status: "draft",
      currency: "USD",
      isPrimary: false,
    }
    const { tx, updates } = txWithSelects([
      [existing],
      [{ ownerMemberId: "member-1", currency: "MYR" }],
      [{ currencies: ["MYR", "USD"], defaultCurrency: "MYR" }],
      [{ taxInclusive: false }],
    ])
    mocks.withTenant.mockImplementation(async (_permission, work) =>
      work(tx, { tenantId: "tenant-1" })
    )

    const result = await updateQuotation("quotation-1", {
      taxSettingId: null,
      validUntil: null,
      notes: null,
      headerDiscount: "0",
      lines: [
        {
          description: "Consulting",
          quantity: "1",
          unitPrice: "100",
          discountAmount: "0",
        },
      ],
    })

    expect(result.ok).toBe(true)
    expect(updates[0]).toMatchObject({ currency: "USD" })
  })

  it("saves a draft when its unchanged attention contact is now unavailable", async () => {
    const existing = {
      id: "quotation-1",
      funnelId: "funnel-1",
      status: "draft",
      currency: "USD",
      isPrimary: false,
      attentionContactId: "legacy-contact",
      notes: "Saved note",
      delivery: "14 days",
      paymentTerm: "30 days",
    }
    const updated = { ...existing, total: "100.00" }
    const { tx } = txWithSelects([
      [existing],
      [{ ownerMemberId: "member-1", currency: "MYR", accountId: "account-1" }],
      [{ currencies: ["MYR", "USD"], defaultCurrency: "MYR" }],
      [{ taxInclusive: false }],
    ], updated)
    mocks.withTenant.mockImplementation(async (_permission, work) =>
      work(tx, { tenantId: "tenant-1" })
    )

    const result = await updateQuotation("quotation-1", {
      taxSettingId: null,
      validUntil: null,
      notes: existing.notes,
      delivery: existing.delivery,
      paymentTerm: existing.paymentTerm,
      attentionContactId: existing.attentionContactId,
      headerDiscount: "0",
      lines: [
        {
          description: "Consulting",
          quantity: "1",
          unitPrice: "100",
          discountAmount: "0",
        },
      ],
    })

    expect(result.ok).toBe(true)
    expect(tx.select).toHaveBeenCalledTimes(4)
    const auditEntry = mocks.writeAudit.mock.calls.at(-1)?.[2] as {
      before: Record<string, unknown>
      after: Record<string, unknown>
    }
    expect(auditEntry.before).toEqual({
      attentionContactId: "legacy-contact",
      notes: "Saved note",
      delivery: "14 days",
      paymentTerm: "30 days",
    })
    expect(auditEntry.after).toEqual(auditEntry.before)
  })
})

it("changes billing to a shared reseller, validates its contact, and stores its address snapshot", async () => {
  const existing = { id: "quotation-1", funnelId: "funnel-1", status: "draft", currency: "MYR", isPrimary: false, billToAccountId: null, attentionContactId: null }
  const { tx, updates } = txWithSelects([
    [existing], [{ ownerMemberId: "member-1", currency: "MYR", accountId: "end-user" }],
    [{ currencies: ["MYR"], defaultCurrency: "MYR" }], [{ taxInclusive: false }],
    [{ id: "reseller", accountType: "reseller", ownerMemberId: "other" }],
    [{ accountId: "reseller" }], [{ name: "Uniti", code: null, phone: null, address: { line1: "Billing street" } }],
    [{ firstName: "Billing", lastName: "Contact", email: null, phone: null }],
  ])
  mocks.withTenant.mockImplementation(async (_permission, work) => work(tx, { tenantId: "tenant-1" }))
  await updateQuotation("quotation-1", { billToAccountId: "reseller", attentionContactId: "billing-contact", taxSettingId: null, validUntil: null, notes: null, lines: [] })
  expect(updates[0]).toMatchObject({ billToAccountId: "reseller", attentionContactId: "billing-contact", billingSnapshot: { account: { name: "Uniti", address: { line1: "Billing street" } }, contact: { name: "Billing Contact" } } })
})

it("rejects an end-user contact when billing changes to a reseller", async () => {
  const { tx, updates } = txWithSelects([
    [{ id: "quotation-1", funnelId: "funnel-1", status: "draft", currency: "MYR", billToAccountId: null, attentionContactId: "end-contact" }],
    [{ ownerMemberId: "member-1", currency: "MYR", accountId: "end-user" }],
    [{ currencies: ["MYR"], defaultCurrency: "MYR" }], [{ taxInclusive: false }],
    [{ id: "reseller", accountType: "reseller", ownerMemberId: "other" }], [{ accountId: "end-user" }],
  ])
  mocks.withTenant.mockImplementation(async (_permission, work) => work(tx, { tenantId: "tenant-1" }))
  await expect(updateQuotation("quotation-1", { billToAccountId: "reseller", attentionContactId: "end-contact", taxSettingId: null, validUntil: null, notes: null, lines: [] })).rejects.toThrow("Attention contact must belong to recipient account")
  expect(updates).toEqual([])
})

it("renders issued billing snapshots after live company details change", async () => {
  mocks.ownsOrManages.mockReturnValue(true)
  const billingSnapshot = { account: { name: "Uniti (issued)", code: null, phone: "123", address: { line1: "Original billing street" } }, contact: { name: "Original billing contact", email: null, phone: null } }
  const { tx } = txWithSelects([
    [{ q: { id: "quote", status: "sent", billToAccountId: "reseller", attentionContactId: "old-contact", billingSnapshot }, oppOwner: "member-1", accountId: "mcmc", projectName: "MCMC deal" }],
    [], [{ name: "Uniti renamed", billingAddress: { line1: "New street" }, accountType: "reseller", endUserAccountId: "another-end-user" }],
    [{ name: "Seller", slug: "seller" }], [],
  ])
  mocks.withTenant.mockImplementation(async (_permission, work) => work(tx, { tenantId: "tenant-1" }))
  const document = await getQuotationDocument("quote")
  expect(document?.account).toEqual(billingSnapshot.account)
  expect(document?.contact).toEqual(billingSnapshot.contact)
  expect(document?.projectName).toBe("MCMC deal")
})
