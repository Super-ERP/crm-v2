"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, HashIcon, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { ProjectCodeLink } from "@/components/project-code-link"
import { listRelatedProjectCodes, type RelatedProjectCodePage } from "./project-code-actions"

/** Compact content for the existing account/contact related-record tabs. */
export function ProjectCodePanel({ kind, recordId, initialPage }: { kind: "account" | "person"; recordId: string; initialPage: RelatedProjectCodePage }) {
  const [page,setPage]=React.useState(initialPage)
  const [search,setSearch]=React.useState('')
  const [pageIndex,setPageIndex]=React.useState(0)
  const [loading,setLoading]=React.useState(false)
  const [error,setError]=React.useState(false)
  const [retry,setRetry]=React.useState(0)
  const initial=React.useRef(true)
  React.useEffect(()=>{
    if(initial.current){initial.current=false;return}
    let cancelled=false
    const timer=setTimeout(()=>{
      setLoading(true);setError(false)
      void listRelatedProjectCodes(kind,recordId,pageIndex,{search,pageSize:25}).then(next=>{
        if(!cancelled)setPage(next)
      }).catch(()=>{if(!cancelled)setError(true)}).finally(()=>{if(!cancelled)setLoading(false)})
    },180)
    return ()=>{cancelled=true;clearTimeout(timer)}
  },[kind,recordId,pageIndex,search,retry])
  return <div className="space-y-4">
    <div className="relative max-w-sm"><Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="pl-9" aria-label="Search linked project codes" placeholder="Search project codes or funnels…" value={search} onChange={event=>{setSearch(event.target.value);setPageIndex(0)}}/></div>
    {error?<div role="alert" className="flex items-center gap-2 text-sm text-destructive">Could not load project codes.<Button variant="outline" size="sm" onClick={()=>setRetry(value=>value+1)}>Retry</Button></div>:null}
    <div aria-busy={loading} className={loading?'opacity-60':undefined}>
      {page.rows.length?<ul className="divide-y">{page.rows.map(row=><li key={row.funnelId} className="space-y-2 py-4 first:pt-0">
        <Link href={`/funnel/${row.funnelId}`} className="link text-sm font-medium">{row.funnelName}</Link>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">{[
          ['Project code',row.projectCode],['Cross-deal code',row.crossDealProjectCode],['CRM code',row.crmProjectCode],
        ].filter(([,code])=>code).map(([label,code])=><div key={label} className="space-y-0.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd><ProjectCodeLink code={code}/></dd></div>)}</dl>
        {row.opportunityId?<p className="text-xs text-muted-foreground">Opportunity: <Link className="link" href={`/opportunities/${row.opportunityId}`}>{row.opportunityName}</Link></p>:null}
      </li>)}</ul>:<EmptyState icon={HashIcon} title="No active project codes" description="Project codes appear for accessible funnels at Commit (4A) or Closed Won."/>}
    </div>
    {page.hasNextPage||pageIndex>0?<div className="flex items-center justify-between gap-2 border-t pt-3 text-sm"><span className="text-muted-foreground">Page {pageIndex+1}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading||pageIndex===0} onClick={()=>setPageIndex(current=>current-1)}><ChevronLeft/>Previous</Button><Button variant="outline" size="sm" disabled={loading||!page.hasNextPage} onClick={()=>setPageIndex(current=>current+1)}>Next<ChevronRight/></Button></div></div>:null}
  </div>
}
