import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { describe, expect, it } from 'vitest'
import type { Tx } from '@/db'
import { createTablePreferenceService } from '@/server/services/table-controls/preferences'
const url=process.env.TEST_DATABASE_ADMIN_URL
;(url?describe:describe.skip)('table preference ownership',()=>{
 it('isolates tenant/member/list and updates only the exact preference key',async()=>{
  const client=postgres(url!,{max:1})
  try { await drizzle(client).transaction(async transaction=>{
   await transaction.execute(sql.raw('create temporary table table_preferences (id uuid default gen_random_uuid(), organization_id text not null, member_id text not null, list_key text not null, layout jsonb not null, updated_at timestamptz default now(), unique(organization_id,member_id,list_key)) on commit drop'))
   const tx=transaction as unknown as Tx
   const own=createTablePreferenceService(tx,{tenantId:'qm',memberId:'me'})
   const other=createTablePreferenceService(tx,{tenantId:'qm',memberId:'other'})
   const foreign=createTablePreferenceService(tx,{tenantId:'qa',memberId:'me'})
   const layout={visibility:{name:false},order:['name'],widths:{name:200},pinning:{left:['name'],right:[]}}
   await own.save('accounts',layout)
   expect(await other.read('accounts')).toBeNull()
   expect(await foreign.read('accounts')).toBeNull()
   expect(await own.read('leads')).toBeNull()
   await other.save('accounts',{...layout,widths:{name:400}})
   await own.save('accounts',{...layout,widths:{name:300}})
   expect((await own.read('accounts'))?.widths.name).toBe(300)
   expect((await other.read('accounts'))?.widths.name).toBe(400)
   await expect(own.save('private-users',layout)).rejects.toThrow('Unknown table')
  })}finally{await client.end()}
 })
})
