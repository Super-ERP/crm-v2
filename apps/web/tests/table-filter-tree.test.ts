import { expect, it } from "vitest"
import { getTableFields } from "@/lib/table-controls/registry"
import { validateFilterTree } from "@/lib/table-controls/filter-tree"
import { evaluateFilterTree } from "@/lib/table-controls/evaluate"
const fields = getTableFields('project-code-funnels', ['name','estimatedAmount','expectedCloseDate','status'])
const context = { now: new Date('2026-10-15T10:00:00Z'), timezone: 'Asia/Kuala_Lumpur' }
const group = (children: unknown[], logic = 'and') => ({ kind: 'group', id: crypto.randomUUID(), logic, children })
const rule = (fieldId: string, operator: string, value?: unknown) => ({ kind: 'condition', id: crypto.randomUUID(), fieldId, operator, value })
it('applies nested groups and literal punctuation', () => {
  const tree = group([group([rule('status','any-of',['open']),rule('status','any-of',['won'])],'or'),rule('expectedCloseDate','year',2026),rule('name','contains','%_\\')])
  const validated = validateFilterTree(tree, fields)
  expect(evaluateFilterTree({ name: 'A %_\\ deal',status:'won',expectedCloseDate:'2026-12-31'}, validated, fields,context)).toBe(true)
  expect(evaluateFilterTree({ name: 'A %_\\ deal',status:'won',expectedCloseDate:'2025-12-31'},validated,fields,context)).toBe(false)
})
it('never broadens invalid and excessive trees', () => {
  expect(() => validateFilterTree(group([rule('password','equals','x')]),fields)).toThrow()
  expect(() => validateFilterTree(group(Array.from({length:51},()=>rule('name','contains','a'))),fields)).toThrow()
  let tree = group([]); for(let i=0;i<5;i++) tree = group([tree])
  expect(() => validateFilterTree(tree,fields)).toThrow()
  expect(() => validateFilterTree(group([rule('name','any-of',Array(101).fill('a'))]),fields)).toThrow()
  expect(() => validateFilterTree(group([rule('name','contains','a'.repeat(33000))]),fields)).toThrow()
})
it('requires explicit valid currency and preserves zero/null distinctions', () => {
  expect(() => validateFilterTree(group([rule('estimatedAmount','equals',100)]),fields)).toThrow()
  const tree = validateFilterTree(group([rule('estimatedAmount','equals',{amount:0,currency:'MYR'})]),fields)
  expect(evaluateFilterTree({estimatedAmount:'0',currency:'MYR'},tree,fields,context)).toBe(true)
  expect(evaluateFilterTree({estimatedAmount:null,currency:'MYR'},tree,fields,context)).toBe(false)
  expect(evaluateFilterTree({estimatedAmount:'0',currency:'USD'},tree,fields,context)).toBe(false)
})
it('rejects impossible dates, inverted ranges, invalid operators and duplicate condition IDs', () => {
  expect(() => validateFilterTree(group([rule('expectedCloseDate','on','2026-02-30')]),fields)).toThrow()
  expect(() => validateFilterTree(group([rule('expectedCloseDate','between',['2026-12-01','2026-01-01'])]),fields)).toThrow()
  const r=rule('name','contains','a'); expect(() => validateFilterTree(group([r,r]),fields)).toThrow()
})
it('resolves relative dates at evaluation time and excludes null from negative matches', () => {
  const tree=validateFilterTree(group([rule('expectedCloseDate','relative','this-year')]),fields)
  expect(evaluateFilterTree({expectedCloseDate:'2026-01-01'},tree,fields,context)).toBe(true)
  expect(evaluateFilterTree({expectedCloseDate:'2026-01-01'},tree,fields,{...context,now:new Date('2027-01-01')})).toBe(false)
  const negative=validateFilterTree(group([rule('name','not-contains','test')]),fields)
  expect(evaluateFilterTree({name:null},negative,fields,context)).toBe(false)
})
it('handles empty root groups as no user restriction', () => expect(validateFilterTree(group([]), fields).children).toEqual([]))
it('treats empty associations as empty and compares relation selections by identity',()=>{
 const relation={...getTableFields('accounts',['ownerName'])[0],id:'ownerName'}
 const tree=validateFilterTree(group([rule('ownerName','any-of',['member-a'])]),[relation])
 expect(evaluateFilterTree({ownerName:{id:'member-a',label:'Alex'}},tree,[relation],context)).toBe(true)
 const empty=validateFilterTree(group([rule('ownerName','empty')]),[relation])
 expect(evaluateFilterTree({ownerName:[null,'']},empty,[relation],context)).toBe(true)
})
it('rejects year zero and handles the last supported calendar day without overflow',()=>{
 expect(()=>validateFilterTree(group([rule('expectedCloseDate','on','0000-01-01')]),fields)).toThrow()
 const last=validateFilterTree(group([rule('expectedCloseDate','on','9999-12-31')]),fields)
 expect(evaluateFilterTree({expectedCloseDate:'9999-12-31'},last,fields,context)).toBe(true)
 const after=validateFilterTree(group([rule('expectedCloseDate','after','9999-12-31')]),fields)
 expect(evaluateFilterTree({expectedCloseDate:'9999-12-31'},after,fields,context)).toBe(false)
})
