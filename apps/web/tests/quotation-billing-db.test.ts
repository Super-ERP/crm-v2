import { randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import postgres from "postgres"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { migrationId } from "@/db/import/plan"

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL
const integration = adminUrl ? describe.sequential : describe.skip
integration("quotation billing migration and recovery PostgreSQL boundary", () => {
  let server: ReturnType<typeof postgres>
  let sql: ReturnType<typeof postgres>
  let databaseName: string
  let databaseUrl: string
  let directory: string
  const tenant = "billing-test"
  const id = (object: string, source: string) => migrationId(tenant, object, source)
  beforeAll(async () => {
    const rootUrl = new URL(adminUrl!); rootUrl.pathname = "/postgres"
    server = postgres(rootUrl.toString(), { max: 1 })
    databaseName = `crm_billing_${randomBytes(6).toString("hex")}`
    await server.unsafe(`CREATE DATABASE "${databaseName}"`)
    rootUrl.pathname = `/${databaseName}`; databaseUrl = rootUrl.toString()
    sql = postgres(databaseUrl, { max: 1 })
    await sql.unsafe(`CREATE TABLE accounts (id uuid PRIMARY KEY, tenant_id text, name text, code text, phone text, billing_address jsonb, deleted_at timestamptz);
      CREATE TABLE persons (id uuid PRIMARY KEY, tenant_id text, account_id uuid, first_name text, last_name text, email text, phone text, deleted_at timestamptz);
      CREATE TABLE quotations (id uuid PRIMARY KEY, tenant_id text, funnel_id uuid, quote_number text, status text, total numeric, attention_contact_id uuid, updated_at timestamptz DEFAULT now(), deleted_at timestamptz);
      CREATE TABLE audit_log (id uuid DEFAULT gen_random_uuid(), tenant_id text, action text, entity_type text, entity_id text, "before" jsonb, "after" jsonb, source text, metadata jsonb);`)
    await sql`insert into accounts (id, tenant_id, name, billing_address) values (${id("Account", "end")}, ${tenant}, 'MCMC', null), (${id("Account", "bill")}, ${tenant}, 'Uniti', '{"line1":"Billing street"}')`
    await sql`insert into persons (id,tenant_id,account_id,first_name) values (${id("Contact", "person")},${tenant},${id("Account", "bill")},'Billing Contact')`
    await sql`insert into quotations (id,tenant_id,funnel_id,quote_number,status,total) values (${id("Quote", "quote")},${tenant},${id("Opportunity", "funnel")},'Q123-1','accepted',123.45)`
    const migration = await readFile(path.resolve("db/migrations/0097_quotation_bill_to.sql"), "utf8")
    for (const statement of migration.split("--> statement-breakpoint").filter(s => s.trim())) await sql.unsafe(statement)
    directory = await mkdtemp(path.join(tmpdir(), "crm-billing-test-"))
    await mkdir(path.join(directory, "source"))
    for (const [name, content] of Object.entries({
      Account: "Id,Name\nend,MCMC\nbill,Uniti\n", Company__c: "Id,Name\n", Contact: "Id,AccountId\nperson,bill\n",
      Quote: "Id,AccountId,ContactId,Bill_To_Name__c\nquote,end,person,Uniti\n",
    })) await writeFile(path.join(directory, "source", name + ".csv"), content)
  }, 30_000)
  afterAll(async () => {
    await sql?.end()
    if (databaseName) await server.unsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
    await server?.end()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const run = (apply = false) => JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "db/import/backfill-quotation-billing.ts", "--dir", path.join(directory, "source"), "--tenant", tenant, "--report-dir", path.join(directory, apply ? "apply" : "dry"), ...(apply ? ["--apply"] : [])], { encoding: "utf8", env: { ...process.env, DATABASE_ADMIN_URL: databaseUrl } }))
  it("dry-runs without mutation, recovers billing with audit, and reruns without changing history", async () => {
    expect(run()).toMatchObject({ ready: 1, review: 0, mode: "dry-run" })
    expect((await sql`select bill_to_account_id from quotations`)[0].bill_to_account_id).toBeNull()
    expect(run(true)).toMatchObject({ ready: 1, review: 0, mode: "apply" })
    const [quote] = await sql`select * from quotations`
    expect(quote).toMatchObject({ quote_number: "Q123-1", status: "accepted", total: "123.45", bill_to_account_id: id("Account", "bill"), attention_contact_id: id("Contact", "person"), billing_snapshot: { account: { name: "Uniti", address: { line1: "Billing street" } } } })
    expect(await sql`select action from audit_log`).toEqual([expect.objectContaining({ action: "quotation.billing_backfilled" })])
    expect(run(true)).toMatchObject({ ready: 0, alreadyCaptured: 1 })
    expect((await sql`select * from quotations`)[0]).toEqual(quote)
    expect((await sql`select * from audit_log`).length).toBe(1)
    await expect(sql`delete from accounts where id = ${id("Account", "bill")}`).rejects.toMatchObject({ code: "23503" })
  }, 30_000)
})
