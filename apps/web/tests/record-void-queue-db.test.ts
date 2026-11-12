import { randomBytes, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ context: vi.fn(), tenant: vi.fn() }))
vi.mock('@/lib/server-context', () => ({ requireContext: mocks.context }))
vi.mock('@/db', () => ({ runInTenant: mocks.tenant }))
vi.mock('@/lib/action-result', () => ({ runAction: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/modules.server', () => ({ getEntitledModuleMap: async () => ({finance: false, projects: false, salesOrders: false}), requireEntitledModule: vi.fn() }))
vi.mock('@/lib/access-scope', () => ({ visibleMemberIds: async () => null, canManageAllRecords: () => true, ownsOrManages: () => true }))
import { listUniversalVoidRequests } from '@/app/(app)/record-void-actions'
const url = process.env.TEST_DATABASE_ADMIN_URL
;(url ? describe : describe.skip)('record void queue on PostgreSQL', () => {
  let admin: Sql, pg: Sql, database: string
  const tenant = randomUUID(), base = randomUUID(), financial = randomUUID()
  beforeAll(async () => {
    const uri = new URL(url!); uri.pathname = '/postgres'; admin = postgres(uri.toString(), {max: 1})
    database = `crm_void_queue_${randomBytes(5).toString('hex')}`
    await admin.unsafe(`create database "${database}"`)
    uri.pathname = `/${database}`; pg = postgres(uri.toString(), {max: 2})
    const db = drizzle(pg)
    await migrate(db, {migrationsFolder: resolve(process.cwd(), 'db/migrations')})
    mocks.tenant.mockImplementation((_tenant, work) => db.transaction(async tx => {
      await tx.execute(sql`select set_config('app.current_tenant',${tenant},true)`)
      return work(tx)
    }))
    await pg`insert into organization(id,name,slug) values (${tenant},'Queue regression',${tenant})`
    for (const id of ['requester','reviewer']) {
      await pg`insert into "user"(id,name,email) values (${id},${id},${id+'@queue.invalid'})`
      await pg`insert into member(id,organization_id,user_id) values (${id},${tenant},${id})`
    }
    for (const [id, required] of [[base, []], [financial, ['finance.reverse']]] as const) {
      const impact = {target: {label: 'Account', type: 'account', id: randomUUID()}, requiredPermissions: required}
      await pg`insert into record_void_requests(id,tenant_id,entity_type,entity_id,requester_member_id,reason,impact) values (${id},${tenant},'account',${randomUUID()},'requester','Correction',${JSON.stringify(impact)}::jsonb)`
    }
  })
  afterAll(async () => {
    if (pg) await pg.end()
    if (admin) { if (database) await admin.unsafe(`drop database if exists "${database}" with (force)`); await admin.end() }
  })
  function context(permissions: string[]) {
    const keys = new Set(permissions)
    mocks.context.mockResolvedValue({tenantId: tenant, memberId: 'reviewer', permissions: keys, can: (key: string) => keys.has(key)})
  }
  it('loads incoming requests with multiple permission keys and excludes financial requests without reversal rights', async () => {
    context(['record.void.approve','account.view'])
    const result = await listUniversalVoidRequests('incoming', {order: 'oldest'})
    expect(result.rows.map(row => row.id)).toEqual([base])
    expect(result.total).toBe(1)
  })
  it('includes financial requests only with the separate reversal grant', async () => {
    context(['record.void.approve','account.view','finance.reverse'])
    const result = await listUniversalVoidRequests('incoming', {order: 'oldest'})
    expect(result.rows.map(row => row.id).sort()).toEqual([base,financial].sort())
    expect(result.total).toBe(2)
  })
})
