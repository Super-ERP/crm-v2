import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({confirm:vi.fn(),refresh:vi.fn(),error:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:mocks.refresh})}))
vi.mock('@/components/use-unsaved-changes',()=>({useUnsavedChanges:()=>mocks.confirm}))
vi.mock('@/lib/show-action-error',()=>({showActionError:mocks.error}))
import { useRecordEditor } from '@/components/use-record-editor'
type Record={name:string;phone:string}
let editor:ReturnType<typeof useRecordEditor<Record>>,view:ReactTestRenderer
const initial={name:'Original',phone:'+60123456789'}
function mount(save:(record:Record,patch:Partial<Record>)=>Promise<{ok:boolean;error?:string}>){
 function Probe(){editor=useRecordEditor({initial,onSave:save});return null}
 act(()=>{view=create(createElement(Probe))})
}
beforeEach(()=>{
 vi.clearAllMocks();mocks.confirm.mockReturnValue(true)
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 vi.stubGlobal('document',{activeElement:null})
 vi.stubGlobal('HTMLInputElement',class {})
 vi.stubGlobal('HTMLTextAreaElement',class {})
})
afterEach(()=>{if(view)act(()=>view.unmount());vi.unstubAllGlobals()})
describe('shared record draft lifecycle',()=>{
 it('submits one merged draft and keeps server failures available for retry',async()=>{
  const save=vi.fn().mockResolvedValueOnce({ok:false,error:'Name rejected'}).mockResolvedValueOnce({ok:true})
  mount(save);act(()=>editor.start());act(()=>editor.stage({name:'Changed'}));act(()=>editor.stage({phone:'+6581234567'}))
  await act(async()=>{await editor.save()})
  expect(save).toHaveBeenLastCalledWith({name:'Changed',phone:'+6581234567'},{name:'Changed',phone:'+6581234567'})
  expect(editor.editing).toBe(true);expect(editor.record.name).toBe('Changed');expect(editor.error).toBe('Name rejected')
  await act(async()=>{await editor.save()})
  expect(editor.editing).toBe(false);expect(mocks.refresh).toHaveBeenCalledTimes(1)
 })
 it('cancel honours unsaved confirmation and discards the entire draft',()=>{
  mount(vi.fn());act(()=>editor.start());act(()=>editor.stage({name:'Changed'}))
  mocks.confirm.mockReturnValue(false);act(()=>{editor.cancel()});expect(editor.record.name).toBe('Changed');expect(editor.editing).toBe(true)
  mocks.confirm.mockReturnValue(true);act(()=>{editor.cancel()});expect(editor.record).toEqual(initial);expect(editor.editing).toBe(false)
 })
 it('locks draft changes and prevents duplicate submissions while a save is pending',async()=>{
  let resolve!:(value:{ok:boolean})=>void
  const save=vi.fn(()=>new Promise<{ok:boolean}>(done=>{resolve=done}))
  mount(save);act(()=>editor.start());act(()=>editor.stage({name:'First'}))
  let pending!:Promise<unknown>
  act(()=>{pending=editor.save();void editor.save()})
  expect(save).toHaveBeenCalledTimes(1)
  act(()=>editor.stage({name:'Too late'}));expect(editor.record.name).toBe('First')
  await act(async()=>{resolve({ok:true});await pending})
  expect(editor.saving).toBe(false)
 })
 it('flushes a focused text field before taking the submitted snapshot',async()=>{
  const save=vi.fn().mockResolvedValue({ok:true});mount(save);act(()=>editor.start())
  const input=new HTMLInputElement();input.blur=()=>editor.stage({name:'Last keystroke'})
  Object.assign(document,{activeElement:input})
  await act(async()=>{await editor.save()})
  expect(save).toHaveBeenCalledWith({name:'Last keystroke',phone:initial.phone},{name:'Last keystroke'})
 })
})
