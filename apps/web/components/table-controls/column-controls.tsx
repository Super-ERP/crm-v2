"use client"
import type { Table as TableInstance } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
export function ColumnControls<T>({table,onReset,labels}:{table:TableInstance<T>;onReset:()=>void;labels:Record<string,string>}) {
 const columns=table.getAllLeafColumns()
 const order=table.getState().columnOrder
 const ordered=[...columns].sort((a,b)=>(order.indexOf(a.id)<0?columns.indexOf(a):order.indexOf(a.id))-(order.indexOf(b.id)<0?columns.indexOf(b):order.indexOf(b.id)))
 return <Dialog><DialogTrigger render={<Button variant="outline" size="sm"><SlidersHorizontal className="size-4"/>Columns</Button>}/>
  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
   <DialogHeader><DialogTitle>Table columns</DialogTitle><DialogDescription>Choose visible columns, their order, width and pinned position. Changes are saved to your layout.</DialogDescription></DialogHeader>
   <div className="space-y-2">{ordered.map((column,index)=>{
    const title=labels[column.id] ?? (typeof column.columnDef.header==='string'?column.columnDef.header:column.id.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' '))
    function move(delta:number){const ids=ordered.map(c=>c.id);[ids[index],ids[index+delta]]=[ids[index+delta],ids[index]];table.setColumnOrder(ids)}
    return <div key={column.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
     <label className="flex min-w-32 flex-1 items-center gap-2 text-sm capitalize"><input type="checkbox" checked={column.getIsVisible()} disabled={!column.getCanHide()} onChange={event=>column.toggleVisibility(event.target.checked)}/>{title}</label>
     <Button variant="ghost" size="icon-sm" disabled={index===0} aria-label={`Move ${title} up`} onClick={()=>move(-1)}><ArrowUp/></Button>
     <Button variant="ghost" size="icon-sm" disabled={index===ordered.length-1} aria-label={`Move ${title} down`} onClick={()=>move(1)}><ArrowDown/></Button>
     <Input className="w-20" type="number" min={48} max={800} value={Math.round(column.getSize())} aria-label={`${title} width in pixels`} onChange={event=>{const value=event.target.valueAsNumber;if(Number.isFinite(value))table.setColumnSizing(current=>({...current,[column.id]:Math.max(48,Math.min(800,value))}))}}/>
     <select className="h-8 rounded-md border bg-background px-2 text-sm" aria-label={`${title} pinned position`} value={column.getIsPinned()||'none'} onChange={event=>column.pin(event.target.value==='none'?false:event.target.value as 'left'|'right')}><option value="none">Unpinned</option><option value="left">Pin left</option><option value="right">Pin right</option></select>
    </div>
   })}</div>
   <Button variant="outline" onClick={onReset}>Reset column layout</Button>
  </DialogContent>
 </Dialog>
}
