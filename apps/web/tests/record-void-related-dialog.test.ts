import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({preview:vi.fn(),related:vi.fn(),submit:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}))
vi.mock('sonner',()=>({toast:{success:vi.fn()}}))
vi.mock('@/app/(app)/record-void-actions',()=>({previewRecordVoid:mocks.preview,listRelatedVoidRecords:mocks.related,submitRecordVoid:mocks.submit}))
vi.mock('@/components/ui/button',()=>({Button:({children,...props}:{children:ReactNode})=>createElement('button',props,children)}))
vi.mock('@/components/ui/textarea',()=>({Textarea:(props:object)=>createElement('textarea',props)}))
vi.mock('@/components/ui/dialog',()=>{
 const wrap=({children}:{children:ReactNode})=>createElement('div',null,children)
 return {Dialog:({open,children}:{open:boolean;children:ReactNode})=>open?wrap({children}):null,DialogContent:wrap,DialogHeader:wrap,DialogTitle:wrap,DialogDescription:wrap,DialogFooter:wrap}
})
vi.mock('@/components/ui/dropdown-menu',()=>{
 const wrap=({children}:{children:ReactNode})=>createElement('div',null,children)
 return {DropdownMenu:wrap,DropdownMenuContent:wrap,DropdownMenuSeparator:()=>null,DropdownMenuTrigger:wrap,DropdownMenuItem:({children,onClick}:{children:ReactNode;onClick:()=>void})=>createElement('button',{onClick},children)}
})
import { RecordVoidButton } from '@/components/record-void-button'
import { voidTargetSchema } from '@/lib/record-void'
const parent={type:'account' as const,id:'00000000-0000-4000-8000-000000000001'}
const child={type:'contract' as const,id:'00000000-0000-4000-8000-000000000002',label:'Contract C-2',status:'active',ownerMemberId:'owner',href:null}
let view:ReactTestRenderer
function button(label:string){return view.root.findAllByType('button').find(node=>node.children.join('')===label)!}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);mocks.related.mockResolvedValue({ok:true,data:{rows:[child],nextCursor:null}});mocks.preview.mockImplementation(async target=>({ok:true,data:{target:{...voidTargetSchema.parse(target),label:'Contract C-2'},effects:[],blockers:[],fingerprint:'a'.repeat(64)}}));mocks.submit.mockResolvedValue({ok:true,data:{}})})
afterEach(()=>{act(()=>view.unmount());vi.unstubAllGlobals()})
it('normalizes a related display row to the strict target for preview and submission',async()=>{
 act(()=>{view=create(createElement(RecordVoidButton,{target:parent}))})
 await act(async()=>{button('Related records…').props.onClick()})
 await act(async()=>{button('Review void…').props.onClick()})
 expect(mocks.preview).toHaveBeenCalledWith({type:'contract',id:child.id})
 act(()=>view.root.findByType('textarea').props.onChange({target:{value:'Duplicate legacy contract'}}))
 await act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){}})})
 expect(mocks.submit).toHaveBeenCalledWith({target:{type:'contract',id:child.id},reason:'Duplicate legacy contract',fingerprint:'a'.repeat(64)})
})
it('can expose child cleanup without exposing parent Void',async()=>{
 act(()=>{view=create(createElement(RecordVoidButton,{target:parent,allowVoid:false,allowRelated:true}))})
 expect(button('Void…')).toBeUndefined()
 await act(async()=>{button('Related records…').props.onClick()})
 expect(mocks.related).toHaveBeenCalledWith({parent,after:undefined})
 expect(button('Review void…')).toBeDefined()
})
