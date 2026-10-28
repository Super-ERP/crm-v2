"use client"
import {Download,FileSpreadsheet} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
export type TableExportFormat='xlsx'|'csv'
export function TableExportDialog({open,onOpenChange,onExport,busy}:{open:boolean;onOpenChange:(open:boolean)=>void;onExport:(format:TableExportFormat)=>void;busy:boolean}){
 return <Dialog open={open} onOpenChange={next=>{if(!busy)onOpenChange(next)}}><DialogContent>
  <DialogHeader><DialogTitle>Export current view</DialogTitle><DialogDescription>Download all matching rows across every page, with your applied filters, sorting and visible columns. Page size does not limit the export.</DialogDescription></DialogHeader>
  <p className="text-sm text-muted-foreground">Clear filters to export all accessible records. Exports support up to 100,000 rows; your record permissions still apply.</p>
  <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>onExport('xlsx')}><FileSpreadsheet/>Excel (.xlsx)</Button><Button variant="outline" disabled={busy} onClick={()=>onExport('csv')}><Download/>CSV (.csv)</Button></div>
  {busy?<p role="status" className="text-sm text-muted-foreground">Preparing your export…</p>:null}
 </DialogContent></Dialog>
}
