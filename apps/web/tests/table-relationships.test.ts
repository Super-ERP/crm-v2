import {describe,it,expect} from 'vitest'
import {tableRelationshipFields,tableRelationEntity,BUSINESS_RELATIONSHIPS} from '@/lib/table-controls/relationships'
import {validateFilterTree} from '@/lib/table-controls/filter-tree'
import {TABLE_CATALOG,getAvailableTableFields} from '@/lib/table-controls/registry'
import {evaluateFilterTree} from '@/lib/table-controls/evaluate'
const nested={kind:'group',id:'child',logic:'and',children:[{kind:'condition',id:'status',fieldId:'status',operator:'any-of',value:['pending_invoicing']},{kind:'condition',id:'date',fieldId:'dueDate',operator:'year',value:2026}]}
const tree={kind:'group',id:'root',logic:'and',children:[{kind:'condition',id:'related',fieldId:'related.milestones',operator:'some',value:nested}]}
describe('shared business relationships',()=>{
 it('registers all cardinalities and related panel aliases without changing defaults',()=>{
  expect(BUSINESS_RELATIONSHIPS.map(r=>r.cardinality)).toEqual(expect.arrayContaining(['one','many','many-to-many']))
  expect(TABLE_CATALOG.flatMap(entry=>entry.keys).filter(key=>!tableRelationEntity(key))).toEqual([])
  expect(tableRelationEntity('account-pipelines')).toBe('funnel')
  const fields=getAvailableTableFields('accounts',['name','code'])
  expect(fields.find(f=>f.id==='related.milestones.count')).toMatchObject({type:'number',defaultVisible:false})
  expect(fields.find(f=>f.id==='related.milestones')).toMatchObject({filterOnly:true,type:'collection'})
  expect(fields.filter(f=>f.defaultVisible).map(f=>f.id)).toEqual(['name','code'])
 })
 it('validates nested same-record rules and rejects arbitrary sensitive fields',()=>{
  const fields=tableRelationshipFields('accounts')
  expect(validateFilterTree(tree,fields)).toEqual(tree)
  expect(()=>validateFilterTree({...tree,children:[{...tree.children[0],value:{...nested,children:[{...nested.children[0],fieldId:'password'}]}}]},fields)).toThrow()
 })
 it('does not satisfy child conjunctions using different children, and defines empty every explicitly',()=>{
  const fields=tableRelationshipFields('accounts'),context={now:new Date('2026-01-01'),timezone:'UTC'}
  const rows=[{status:'pending_invoicing',dueDate:'2025-01-01'},{status:'invoiced',dueDate:'2026-01-01'}]
  expect(evaluateFilterTree({'related.milestones':rows},tree as never,fields,context)).toBe(false)
  expect(evaluateFilterTree({'related.milestones':[...rows,{status:'pending_invoicing',dueDate:'2026-02-01'}]},tree as never,fields,context)).toBe(true)
  expect(evaluateFilterTree({'related.milestones':[]},{...tree,children:[{...tree.children[0],operator:'every'}]} as never,fields,context)).toBe(false)
  expect(evaluateFilterTree({'related.milestones':[]},{...tree,children:[{...tree.children[0],operator:'none'}]} as never,fields,context)).toBe(true)
 })
})

import {compactTableLayout,normalizeTableLayout} from '@/lib/table-controls/state'
describe('relationship catalogue layout size',()=>{
 it('does not put all hidden related fields into a default view URL',()=>{
  const fields=getAvailableTableFields('accounts',['name','code'])
  const layout=normalizeTableLayout({},fields)
  expect(compactTableLayout(layout,fields)).toEqual({visibility:{},order:[],widths:{},pinning:{left:[],right:[]}})
  layout.visibility['related.milestones.count']=true
  expect(compactTableLayout(layout,fields).visibility).toEqual({'related.milestones.count':true})
 })
})
