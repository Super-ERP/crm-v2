import {describe,it,expect} from 'vitest'
import {prepareColumnFilter,removeFilterNode,describeFilter} from '@/lib/table-controls/header-filters'
import {evaluateFilterTree} from '@/lib/table-controls/evaluate'
import {getTableFields} from '@/lib/table-controls/registry'
import type {FilterGroup} from '@/lib/table-controls/types'
const fields=getTableFields('account-pipelines',['name','status'])
const tree:FilterGroup={kind:'group',id:'root',logic:'and',children:[{kind:'group',id:'choices',logic:'or',children:[{kind:'condition',id:'a',fieldId:'name',operator:'equals',value:'Alpha'},{kind:'condition',id:'b',fieldId:'name',operator:'equals',value:'Beta'}]}]}
describe('header filters',()=>{
 it('opens existing nested column rules without changing their AND/OR meaning',()=>{
  const draft=prepareColumnFilter(tree,fields[0],'new')
  expect(draft).toEqual(tree)
  expect(evaluateFilterTree({name:'Beta'},draft,fields,{now:new Date(),timezone:'UTC'})).toBe(true)
  expect(evaluateFilterTree({name:'Gamma'},draft,fields,{now:new Date(),timezone:'UTC'})).toBe(false)
 })
 it('starts the selected column when it has no condition without mutating saved state',()=>{
  const draft=prepareColumnFilter(tree,fields[1],'new')
  expect(draft.children[1]).toMatchObject({kind:'condition',fieldId:'status',id:'new'})
  expect(tree.children).toHaveLength(1)
 })
 it('removes an entire chip group while preserving remaining sibling rules',()=>{
  const combined:FilterGroup={...tree,children:[...tree.children,{kind:'condition',id:'c',fieldId:'status',operator:'empty'}]}
  expect(removeFilterNode(combined,'choices').children).toEqual([{kind:'condition',id:'c',fieldId:'status',operator:'empty'}])
  expect(describeFilter(tree.children[0],fields)).toBe('(Name equals Alpha OR Name equals Beta)')
 })
})
