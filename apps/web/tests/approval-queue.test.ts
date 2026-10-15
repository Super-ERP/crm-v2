import { describe,expect,it } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { approvalQueueSql } from '@/server/services/approval-queue-query'
import { decodeApprovalCursor,encodeApprovalCursor,mergeApprovalQueue } from '@/lib/approval-queue'
const item=(kind:'stage'|'quotation'|'lead',id:string,time:string)=>({kind,id,queueSortKey:time})
describe('one oldest-first approval queue',()=>{
 it('merges workflows globally with exact microsecond ordering and stable ID/type ties',()=>{
  const rows=mergeApprovalQueue([item('quotation','b','1000001'),item('stage','a','1000002'),item('lead','a','1000001')],'oldest')
  expect(rows.map(r=>`${r.kind}:${r.id}`)).toEqual(['lead:a','quotation:b','stage:a'])
  expect(mergeApprovalQueue([item('stage','a','100'),item('quotation','a','100'),item('lead','a','100')],'oldest').map(r=>r.kind)).toEqual(['lead','quotation','stage'])
  expect(mergeApprovalQueue(rows,'newest').map(r=>r.queueSortKey)).toEqual(['1000002','1000001','1000001'])
 })
 it('round-trips and validates a bounded cursor without losing timestamp precision',()=>{
  const row=item('quotation','12345678-1234-4234-8234-123456789abc','1792000000000123')
  expect(decodeApprovalCursor(encodeApprovalCursor(row))).toEqual(row)
  expect(()=>decodeApprovalCursor('bad')).toThrow()
  expect(()=>decodeApprovalCursor('x'.repeat(2000))).toThrow()
 })
 it('counts scoped search matches before cursor pagination and binds search/cursor values',()=>{
  const cursor=item('lead','12345678-1234-4234-8234-123456789abc','1792000000000123')
  const q=new PgDialect().sqlToQuery(approvalQueueSql(sql`SELECT 'x' AS id, '1792000000000123' AS "queueSortKey", 'sample' AS "queueSearch"`,'quotation',{order:'oldest',search:"O'Reilly_%",cursor}))
  expect(q.sql).toContain('LEFT JOIN LATERAL')
  expect(q.sql).toContain('count(*)')
  expect(q.sql).toContain('ASC')
  expect(q.sql).not.toContain("O'Reilly")
  expect(q.params).toContain("%O'Reilly\\_\\%%")
  expect(q.params).toContain(cursor.queueSortKey)
  expect(q.params).toContain(26)
 })
})
