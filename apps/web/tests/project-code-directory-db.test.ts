import { randomBytes, randomUUID } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { sql as query } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { Tx, ServerContext } from "@/lib/actions"
import { funnels } from "@/db/schema"
import { visibleProjectCode } from "@/server/services/project-code-visibility"
const scope = vi.hoisted(() => ({ members: ["rep"] as string[] | null, tx: null as unknown as Tx, ctx: null as unknown as ServerContext }))
vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: async () => { throw new Error("Module disabled") } }))
vi.mock("@/db", () => ({ runInTenant: async (_tenant: string, work: (tx: Tx) => Promise<unknown>) => work(scope.tx) }))
vi.mock("@/lib/server-context", () => ({ requireContext: async () => scope.ctx }))
vi.mock("@/lib/access-scope", async original => ({ ...await original<typeof import("@/lib/access-scope")>(), visibleMemberIds: async () => scope.members }))
import { listRelatedProjectCodes } from "@/app/(app)/_shared/project-code-actions"
import { listProjectCodes, getProjectCode } from "@/server/services/project-codes"
const url = process.env.TEST_DATABASE_ADMIN_URL
;(url ? describe.sequential : describe.skip)("project code directory PostgreSQL boundary", () => {
  let admin: postgres.Sql, client: postgres.Sql, tx: Tx
  const database = `crm_code_directory_${randomBytes(6).toString("hex")}`
  const stage = { early: randomUUID(), commit: randomUUID(), won: randomUUID(), lost: randomUUID(), kiv: randomUUID() }
  const parent = randomUUID(), account = randomUUID(), reseller = randomUUID(), contact = randomUUID(), quotation = randomUUID(), delivery = randomUUID()
  const active = randomUUID(), cross = randomUUID(), early = randomUUID(), hidden = randomUUID(), otherTenant = randomUUID()
  const ctx = { tenantId: "qm", memberId: "rep", can: () => true } as unknown as ServerContext
  beforeAll(async () => {
    const root = new URL(url!); root.pathname = "/postgres"
    admin = postgres(root.toString(), { max: 1 }); await admin.unsafe(`create database "${database}"`)
    root.pathname = "/" + database; client = postgres(root.toString(), { max: 1 })
    tx = drizzle(client) as unknown as Tx
    scope.tx = tx; scope.ctx = ctx
    await client.unsafe(`
      create table pipeline_stages (id uuid primary key, tenant_id text, pipeline_id uuid, code text, kind text, name text);
      create table opportunities (id uuid primary key, tenant_id text, name text, owner_member_id text, project_code text, primary_person_id uuid, owner_contact_id uuid, power_sponsor_contact_id uuid, deleted_at timestamptz);
      create table funnels (id uuid primary key, tenant_id text, name text, opportunity_id uuid, owner_member_id text, account_id uuid, current_stage_id uuid, pipeline_id uuid, status text, project_code text, cross_deal_project_code text, primary_person_id uuid, deleted_at timestamptz);
      create table accounts (id uuid primary key, tenant_id text, name text, owner_member_id text, account_type text, deleted_at timestamptz);
      create table persons (id uuid primary key, tenant_id text, first_name text, last_name text, account_id uuid, deleted_at timestamptz);
      create table quotations (id uuid primary key, tenant_id text, quote_number text, funnel_id uuid, bill_to_account_id uuid, attention_contact_id uuid, deleted_at timestamptz);
      create table projects (id uuid primary key, tenant_id text, name text, project_code text, funnel_id uuid, account_id uuid, owner_member_id text, deleted_at timestamptz);
    `)
    const pipeline = randomUUID()
    for (const [key, code, kind] of [["early", "3b", "OPEN"], ["commit", "4a", "OPEN"], ["won", "won", "WON"], ["lost", "lost", "LOST"], ["kiv", "kiv", "PARKED"]] as const) await client`insert into pipeline_stages values (${stage[key]}, 'qm', ${pipeline}, ${code}, ${kind}, ${code})`
    await client`insert into opportunities (id, tenant_id, name, owner_member_id, project_code) values (${parent}, 'qm', 'Pursuit', 'rep', 'INTERNAL')`
    await client`insert into accounts (id, tenant_id, name, owner_member_id, account_type) values (${account}, 'qm', 'End user', 'rep', 'customer'), (${reseller}, 'qm', 'Shared reseller', 'other', 'reseller')`
    await client`insert into persons values (${contact}, 'qm', 'Ada', 'Buyer', ${reseller}, null)`
    for (const [id, owner, st, code, crossCode, tenant] of [
      [active, "rep", stage.commit, "A/a & #1", "CROSS", "qm"], [cross, "rep", stage.won, "SECOND", "A/a & #1", "qm"],
      [early, "rep", stage.early, "EARLY", null, "qm"], [hidden, "other", stage.commit, "HIDDEN", null, "qm"],
      [otherTenant, "rep", stage.commit, "FOREIGN", null, "qa"],
    ]) await client`insert into funnels (id, tenant_id, name, opportunity_id, owner_member_id, account_id, current_stage_id, pipeline_id, status, project_code, cross_deal_project_code) values (${id!}, ${tenant!}, ${code!}, ${parent}, ${owner!}, ${account}, ${st!}, ${pipeline}, ${st === stage.won ? "won" : "open"}, ${code!}, ${crossCode})`
    await client`insert into quotations values (${quotation}, 'qm', 'Q-1', ${active}, ${reseller}, ${contact}, null)`
    await client`insert into projects values (${delivery}, 'qm', 'Delivery', 'A/a & #1', ${active}, ${account}, 'rep', null)`
  })
  afterAll(async () => { await client?.end(); await admin?.unsafe(`drop database "${database}" with (force)`); await admin?.end() })
  beforeEach(() => { scope.members = ["rep"] })
  it("groups literal primary and cross-deal codes and excludes early, hidden and foreign rows", async () => {
    const result = await listProjectCodes(tx, ctx, {})
    expect(result.rows.map(r => r.code)).toEqual(["A/a & #1", "CROSS", "INTERNAL", "SECOND"])
    expect(result.rows.find(r => r.code === "A/a & #1")).toMatchObject({ funnelCount: 2, primaryCount: 1, crossDealCount: 1 })
    expect((await listProjectCodes(tx, ctx, { search: "A/a & #1" })).rows).toHaveLength(1)
    expect((await listProjectCodes(tx, ctx, { search: "%" })).rows).toEqual([])
  })
  it("resolves the end user, shared billed reseller, attention contact and quotation without Projects", async () => {
    const result = await getProjectCode(tx, ctx, "A/a & #1", 0, false)
    expect(result?.funnels).toHaveLength(2)
    expect(result?.accounts.map(r => r.id).sort()).toEqual([account, reseller].sort())
    expect(result?.contacts.map(r => r.id)).toEqual([contact])
    expect(result?.quotations.map(r => r.id)).toEqual([quotation])
    expect(result?.projects).toEqual([])
    expect((await getProjectCode(tx, ctx, "A/a & #1", 0, true))?.projects.map(r => r.id)).toEqual([delivery])
  })
  it("allows the manager subtree, while a representative cannot infer another owner's code", async () => {
    expect(await getProjectCode(tx, ctx, "HIDDEN", 0, false)).toBeNull()
    scope.members = ["rep", "other"]
    expect((await getProjectCode(tx, ctx, "HIDDEN", 0, false))?.funnels.map(r => r.id)).toEqual([hidden])
  })
  it("masks inaccessible parent references in the related-code panel", async () => {
    await client`update opportunities set owner_member_id = 'other' where id = ${parent}`
    const rows = (await listRelatedProjectCodes("account", account)).rows
    expect(rows).toHaveLength(2)
    expect(rows.every(r => r.opportunityId === null && r.opportunityName === null && r.crmProjectCode === null)).toBe(true)
    expect(rows.some(r => r.projectCode === "A/a & #1")).toBe(true)
    expect((await listProjectCodes(tx, ctx, {})).rows.map(r => r.code)).not.toContain("INTERNAL")
    await client`update opportunities set owner_member_id = 'rep' where id = ${parent}`
  })
  it("aggregates only active identifiers without dropping earlier funnel counts", async () => {
    const rows = await tx.select({ count: query<number>`count(*)::int`,
      codes: query<string[]>`array_agg(distinct ${funnels.projectCode}) filter (where ${visibleProjectCode(funnels.projectCode)} is not null)`
    }).from(funnels).where(query`${funnels.tenantId} = 'qm'`)
    expect(rows[0].count).toBe(4)
    expect(rows[0].codes).not.toContain("EARLY")
  })
  it("hides historical codes on rollback and restores the same identifiers on re-entry", async () => {
    await client`update funnels set current_stage_id = ${stage.early} where id = ${active}`
    expect(await getProjectCode(tx, ctx, "CROSS", 0, false)).toBeNull()
    expect((await tx.select({ code: visibleProjectCode(funnels.projectCode) }).from(funnels).where(query`${funnels.id} = ${active}`))[0].code).toBeNull()
    expect((await client`select project_code from funnels where id = ${active}`)[0].project_code).toBe("A/a & #1")
    await client`update funnels set current_stage_id = ${stage.commit} where id = ${active}`
    expect((await getProjectCode(tx, ctx, "CROSS", 0, false))?.funnels.map(r => r.id)).toEqual([active])
  })
  it("excludes Lost, KIV and mismatched pipeline stages even with historical identifiers", async () => {
    for (const id of [stage.lost, stage.kiv]) {
      await client`update funnels set current_stage_id = ${id} where id = ${early}`
      expect(await getProjectCode(tx, ctx, "EARLY", 0, false)).toBeNull()
    }
    await client`update funnels set current_stage_id = ${stage.commit}, pipeline_id = ${randomUUID()} where id = ${early}`
    expect(await getProjectCode(tx, ctx, "EARLY", 0, false)).toBeNull()
  })
})
