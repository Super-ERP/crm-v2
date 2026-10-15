import { expect,it } from 'vitest'
import { mergeQuickFilterTree } from '@/lib/table-controls/state'
import { getTableFields } from '@/lib/table-controls/registry'
import { EMPTY_FILTER_TREE } from '@/lib/table-controls/types'
import { evaluateFilterTree } from '@/lib/table-controls/evaluate'
it('keeps Funnel year shortcuts and advanced groups in one effective AND tree',()=>{
 const fields=getTableFields('funnel',['id','status','expectedCloseDate'])
 const tree=mergeQuickFilterTree({...EMPTY_FILTER_TREE,children:[{kind:'condition',id:'advanced',fieldId:'id',operator:'contains',value:'Target'}]},{expectedCloseDate:{type:'enum',value:['2025','2026']},status:{type:'enum',value:['won']}},fields)
 const context={now:new Date(),timezone:'UTC'}
 expect(evaluateFilterTree({id:'Target',status:'won',expectedCloseDate:'2026-01-01'},tree,fields,context)).toBe(true)
 expect(evaluateFilterTree({id:'Target',status:'open',expectedCloseDate:'2026-01-01'},tree,fields,context)).toBe(false)
 expect(evaluateFilterTree({id:'Target',status:'won',expectedCloseDate:'2024-01-01'},tree,fields,context)).toBe(false)
})
it('preserves false and legacy Primary/Other choices',()=>{
 const fields=getTableFields('persons',['primary'])
 const tree=mergeQuickFilterTree(EMPTY_FILTER_TREE,{primary:{type:'enum',value:['Other']}},fields)
 expect(evaluateFilterTree({primary:false},tree,fields,{now:new Date(),timezone:'UTC'})).toBe(true)
})
it('refuses to invent a currency for legacy monetary filters',()=>{
 expect(()=>mergeQuickFilterTree(EMPTY_FILTER_TREE,{amount:{type:'money',operator:'equals',value:0}},getTableFields('funnel',['amount']))).toThrow('currency')
})
