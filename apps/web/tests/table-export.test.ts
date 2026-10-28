import { describe,it,expect } from 'vitest'
import { collectTableExport,tableCsv } from '@/lib/table-controls/export'
import { getTableFields } from '@/lib/table-controls/registry'
const query={pageIndex:5,pageSize:25,search:'needle',filters:[],sorting:[{id:'name',desc:true}]}
describe('complete table exports',()=>{
 it('exports every matching page while retaining the captured query',async()=>{
  const calls:unknown[]=[]
  const rows=await collectTableExport(query,async q=>{calls.push(q);return {rows:Array.from({length:q.pageIndex===2?5:100},(_,i)=>i+q.pageIndex*100),total:205}})
  expect(rows).toHaveLength(205)
  expect(calls).toEqual([0,1,2].map(pageIndex=>({...query,pageIndex,pageSize:100})))
 })
 it('never downloads a silently truncated or changing result',async()=>{
  await expect(collectTableExport(query,async q=>({rows:q.pageIndex?[]:[1],total:2}))).rejects.toThrow('before all matching')
  await expect(collectTableExport(query,async q=>({rows:[1],total:q.pageIndex?3:2}))).rejects.toThrow('Records changed')
  await expect(collectTableExport(query,async()=>({rows:[],total:100001}))).rejects.toThrow('exceeds')
 })
 it('rejects duplicate stable identities in quotation usage and code directory pages',async()=>{
  for(const key of ['quotationId','code'])await expect(collectTableExport(query,async()=>({rows:[{[key]:'same'}],total:2}))).rejects.toThrow('Records changed')
 })
 it('quotes multiline data, protects spreadsheet formulas, excludes actions and preserves currency',()=>{
  const fields=getTableFields('accounts',['name','actions'])
  const csv=tableCsv([{name:' =HYPERLINK("x")\nnext'}],fields.map(field=>({field,value:(r:{name:string})=>r.name})),'UTC')
  expect(csv).toContain('"\' =HYPERLINK(""x"")\nnext"')
  expect(csv).not.toContain('Actions')
  const money=getTableFields('payment-milestones',['amount'])[0]
  expect(tableCsv([{amount:'100.00'}],[{field:money,value:r=>r.amount,currency:()=> 'MYR'}],'UTC')).toContain('\"100.00\",\"MYR\"')
 })
 it('keeps negative numeric amounts usable in Excel while blocking formulas',()=>{
  const field=getTableFields('payment-milestones',['amount'])[0]
  expect(tableCsv([{amount:'-12.50'}],[{field,value:row=>row.amount,currency:()=> 'MYR'}],'UTC')).toContain('"-12.50","MYR"')
 })
})
