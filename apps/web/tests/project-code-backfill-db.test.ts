import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migrationId } from '../db/import/plan'
import { planProjectCodeBackfill, type ProjectCodeSnapshot } from '../db/import/project-code-backfill-plan'
import { applyProjectCodeBackfill } from '../db/import/project-code-backfill-db'
const url = process.env.TEST_DATABASE_ADMIN_URL
;(url ? describe.sequential : describe.skip)('project codes PostgreSQL boundary', () => {
  let admin: postgres.Sql, sql: postgres.Sql
  const database = `crm_project_code_${randomBytes(6).toString('hex')}`
  const tenant = 'qm'
  const parent = migrationId(tenant, 'Opportunity_ID__c', 'parent')
  const source = { Id: 'sf1', Opportunity__c: 'parent', Project_Code__c: ' A/a ', Project_Code_For_Cross_Deal__c: 'B' }
  beforeAll(async () => {
    const root = new URL(url!); root.pathname = '/postgres'
    admin = postgres(root.toString(), { max: 1 }); await admin.unsafe(`create database "${database}"`)
    root.pathname = '/' + database; sql = postgres(root.toString(), { max: 1 })
    await sql.unsafe('create table opportunities (id uuid primary key, tenant_id text, project_code text, deleted_at timestamptz); create table funnels (id uuid primary key, tenant_id text, opportunity_id uuid, deleted_at timestamptz, updated_at timestamptz default now()); create table audit_log (tenant_id text, action text, entity_type text, entity_id uuid, "before" jsonb, "after" jsonb, source text, metadata jsonb)')
    await sql.unsafe(readFileSync('db/migrations/0099_funnel_project_codes.sql', 'utf8').replaceAll('--> statement-breakpoint', ''))
    await sql`insert into opportunities values (${parent}, ${tenant}, 'INTERNAL', null)`
    await sql`insert into funnels (id, tenant_id, opportunity_id) values (${migrationId(tenant, 'Opportunity', 'sf1')}, ${tenant}, ${parent})`
  })
  afterAll(async () => { await sql?.end(); await admin?.unsafe(`drop database "${database}" with (force)`); await admin?.end() })
  const plan = async () => planProjectCodeBackfill({ Opportunity: { headers: Object.keys(source), rows: [source] } }, tenant, { funnels: await sql`select id, tenant_id, opportunity_id, deleted_at, project_code, cross_deal_project_code, updated_at::text as updated_at from funnels` } as ProjectCodeSnapshot)
  it('atomically updates source identifiers, audits and leaves the internal code untouched; reruns do nothing', async () => {
    const pending = await plan()
    expect(pending.ready).toHaveLength(1)
    await applyProjectCodeBackfill(sql, pending, { Opportunity: 'hash' })
    expect((await sql`select project_code from opportunities`)[0].project_code).toBe('INTERNAL')
    expect((await sql`select project_code, cross_deal_project_code from funnels`)[0]).toEqual({ project_code: 'A/a', cross_deal_project_code: 'B' })
    expect((await plan()).alreadyCaptured).toBe(1)
    await applyProjectCodeBackfill(sql, await plan(), {})
    expect(await sql`select * from audit_log`).toHaveLength(1)
    await expect(applyProjectCodeBackfill(sql, pending, {})).rejects.toThrow('transaction rolled back')
    expect(await sql`select * from audit_log`).toHaveLength(1)
  })
  it('rolls back earlier updates and audits when a later guarded row changes', async () => {
    const second = { ...source, Id: 'sf2' }
    await sql`update funnels set project_code = null, cross_deal_project_code = null`
    await sql`insert into funnels (id, tenant_id, opportunity_id) values (${migrationId(tenant, 'Opportunity', 'sf2')}, ${tenant}, ${parent})`
    const snapshot = { funnels: await sql`select id, tenant_id, opportunity_id, deleted_at, project_code, cross_deal_project_code, updated_at::text as updated_at from funnels` } as ProjectCodeSnapshot
    const pending = planProjectCodeBackfill({ Opportunity: { headers: Object.keys(source), rows: [source, second] } }, tenant, snapshot)
    await sql`update funnels set project_code = 'manual' where id = ${migrationId(tenant, 'Opportunity', 'sf2')}`
    await expect(applyProjectCodeBackfill(sql, pending, {})).rejects.toThrow('transaction rolled back')
    expect((await sql`select project_code from funnels where id = ${migrationId(tenant, 'Opportunity', 'sf1')}`)[0].project_code).toBeNull()
    expect(await sql`select * from audit_log`).toHaveLength(1)
  })

})
