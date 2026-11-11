"use client"
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RecordVoidButton } from '@/components/record-void-button'
import { VOID_ENTITY_LABELS,type VoidEntityType } from '@/lib/record-void'
import { findVoidRecords } from './actions'
export function VoidRecordFinder({types}:{types:VoidEntityType[]}) {
 const [type,setType]=React.useState<VoidEntityType>(types[0]??'funnel'),[search,setSearch]=React.useState(''),[rows,setRows]=React.useState<Array<{id:string;label:string}>>([]),[loading,setLoading]=React.useState(false),[error,setError]=React.useState(false),[retry,setRetry]=React.useState(0)
 React.useEffect(()=>{
  let active=true
  const timer=setTimeout(()=>{setLoading(true);setRows([]);setError(false);void findVoidRecords({type,search}).then(value=>{if(active)setRows([...value])}).catch(()=>{if(active)setError(true)}).finally(()=>{if(active)setLoading(false)})},200)
  return()=>{active=false;clearTimeout(timer)}
 },[type,search,retry])
 if(!types.length)return <p className="text-sm">Your role cannot submit void requests.</p>
 return <div className="grid gap-4"><div className="flex flex-wrap gap-3"><label className="grid gap-1 text-sm">Record type<select className="h-9 rounded-md border bg-background px-3" value={type} onChange={event=>setType(event.target.value as VoidEntityType)}>{types.map(value=><option key={value} value={value}>{VOID_ENTITY_LABELS[value]}</option>)}</select></label><label className="grid flex-1 gap-1 text-sm">Search by name or number<Input value={search} maxLength={200} onChange={event=>setSearch(event.target.value)}/></label></div>{loading?<p role="status" className="text-sm">Loading records…</p>:null}{error?<div role="alert"><p>Could not load records.</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Retry</Button></div>:null}<ul className="divide-y rounded-md border">{rows.map(row=><li key={`${type}:${row.id}`} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 break-words text-sm">{row.label}</span><RecordVoidButton target={{type,id:row.id}}/></li>)}</ul>{!loading&&!error&&!rows.length?<p className="text-sm text-muted-foreground">No matching accessible records.</p>:null}<p className="text-sm text-muted-foreground">Showing up to 30 matches. Search to narrow the list. Requests and decisions appear in Approvals.</p></div>
}
