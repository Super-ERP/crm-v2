import { expect, it } from 'vitest'
import { normalizeTableLayout, validateTableState } from '@/lib/table-controls/state'
import { getTableFields } from '@/lib/table-controls/registry'
const fields=getTableFields('accounts',['name','accountType'])
it('keeps required identifiers visible and reconciles removed columns without duplicates',()=>{
 const result=normalizeTableLayout({visibility:{name:false,removed:false},order:['accountType','accountType','removed'],widths:{name:1,accountType:900,removed:100},pinning:{left:['name','name'],right:['name','accountType','removed']}},fields.map(f=>({...f,required:f.id==='name'})))
 expect(result.visibility).toEqual({name:true})
 expect(result.order).toEqual(['accountType','name'])
 expect(result.widths).toEqual({name:48,accountType:800})
 expect(result.pinning).toEqual({left:['name'],right:['accountType']})
})
it('rejects stale filters rather than silently broadening a saved view',()=>{
 expect(()=>validateTableState({version:2,filterTree:{kind:'group',id:'root',logic:'and',children:[{kind:'condition',id:'a',fieldId:'removed',operator:'equals',value:'x'}]},layout:{}},fields)).toThrow()
})
it('rejects malformed layout values',()=>{
 expect(()=>normalizeTableLayout({widths:{name:Infinity}},fields)).toThrow()
 expect(()=>normalizeTableLayout({pinning:{left:'name',right:[]}},fields)).toThrow()
})
