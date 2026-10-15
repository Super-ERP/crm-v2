import { expect,it } from 'vitest'
import { getTableFields } from '@/lib/table-controls/registry'
import { evaluateFilterTree } from '@/lib/table-controls/evaluate'
import { computedTableValue } from '@/lib/table-controls/client-values'
import { tableFieldSignature } from '@/lib/table-controls/state'
import type { FilterGroup } from '@/lib/table-controls/types'
const context={now:new Date('2026-10-15'),timezone:'UTC'}
const tree=(fieldId:string,value:unknown,operator='equals'):FilterGroup=>({kind:'group',id:'root',logic:'and',children:[{kind:'condition',id:'c',fieldId,operator:operator as never,value}]})
it('keeps semantic metadata identity stable across new rendering-column objects',()=>{
 expect(tableFieldSignature([{id:'name',cell:()=>1}],{amount:'MYR'})).toBe(tableFieldSignature([{id:'name',cell:()=>2}],{amount:'MYR'}))
 expect(tableFieldSignature([{id:'name'}],{})).not.toBe(tableFieldSignature([{id:'status'}],{}))
})
it('compares the displayed currency bucket rather than a nullable legacy scalar',()=>{
 const fields=getTableFields('opportunities',['totalEstimatedFunnelAmount'])
 const row={totalEstimatedFunnelAmount:null,currency:'EUR',estimatedTotalsByCurrency:[{currency:'MYR',total:'100'},{currency:'USD',total:'200'}]}
 const get=(record:unknown,id:string)=>computedTableValue(record as Record<string,unknown>,id)
 expect(evaluateFilterTree(row,tree('totalEstimatedFunnelAmount',{amount:100,currency:'MYR'}),fields,context,get)).toBe(true)
 expect(evaluateFilterTree(row,tree('totalEstimatedFunnelAmount',undefined,'empty'),fields,context,get)).toBe(false)
 expect(evaluateFilterTree(row,tree('totalEstimatedFunnelAmount',{amount:100,currency:'EUR'}),fields,context,get)).toBe(false)
})
it('locks an identifier that exists in each concrete related table',()=>{
 expect(getTableFields('account-quotations',['quoteNumber','status','total']).filter(f=>f.required).map(f=>f.id)).toContain('quoteNumber')
})
