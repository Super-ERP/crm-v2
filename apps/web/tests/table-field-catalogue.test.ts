import { describe, expect, it } from 'vitest'
import { getTableFields, getAvailableTableFields, tableSupportsAdvancedFilters } from '@/lib/table-controls/registry'
import { OPTIONAL_TABLE_FIELDS } from '@/lib/table-controls/fields'
import { normalizeTableLayout } from '@/lib/table-controls/state'
describe('universal table field catalogue', () => {
 it('adds approved hidden related fields without changing existing default columns', () => {
  const base = ['title','amount','quoteNumber','status','funnelName']
  const fields = getAvailableTableFields('payment-milestones',base)
  expect(fields.filter(f => base.includes(f.id)).map(f => f.id)).toEqual(base)
  expect(fields.find(f => f.id === 'funnelStageName')).toMatchObject({ type:'enum',defaultVisible:false })
  const layout=normalizeTableLayout({visibility:{amount:false},order:base},fields)
  expect(layout.visibility.amount).toBe(false)
  expect(layout.visibility.funnelStageName).toBe(false)
  expect(fields.find(f=>f.id==='status')?.options?.map(x=>x.value)).toEqual(['pending_invoicing','invoiced'])
  expect(fields.find(f=>f.id==='funnelStatus')?.options?.map(x=>x.value)).toContain('won')
 })
 it('supports every registered adapter, without enabling truncated client filtering', () => {
  expect(tableSupportsAdvancedFilters('so-milestones')).toBe(true)
  expect(tableSupportsAdvancedFilters('settings-api-keys')).toBe(true)
  expect(tableSupportsAdvancedFilters('private-users')).toBe(false)
 })
 it('keeps optional fields explicit and rejects unknown or sensitive fields', () => {
  for(const [key,extras] of Object.entries(OPTIONAL_TABLE_FIELDS)) for(const extra of extras)
   expect(getTableFields(key,[extra.id])[0].type).toBe(extra.type)
  expect(()=>getTableFields('payment-milestones',['invoiceDate'])).toThrow()
  expect(()=>getTableFields('accounts',['password'])).toThrow()
 })
})
