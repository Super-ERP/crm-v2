"use client"

import * as React from 'react'
import {useRouter} from 'next/navigation'
import {ArrowLeft,CheckCheck,HelpCircle,Inbox,Loader2,Search} from 'lucide-react'
import {formatDistanceStrict} from 'date-fns'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs'
import {PageHeader} from '@/components/page-header'
import {ObjectTile} from '@/components/object-tile'
import {EmptyState} from '@/components/empty-state'
import {formatDate,formatMoney} from '@/lib/format'
import {cn} from '@/lib/utils'
import {APPROVAL_TYPE_LABELS,approvalItemTitle,type ApprovalKind,type ApprovalOrder,type ApprovalQueuePage} from '@/lib/approval-queue'
import {listApprovalQueue} from './queue-actions'
import {QuotationApprovalCard} from './quotation-cards'
import {LeadConversionApprovalCard} from './lead-conversion-cards'
import {StageApprovalReview} from './stage-approval-review'
import {ApprovalReviewStatus} from './approval-review-parts'

function RoutingHelp(){
 return <details className="relative max-w-full text-sm"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><HelpCircle className="size-4"/>How approvals work</summary><div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md"><p>Requests are routed through the reporting line to an eligible manager. Only the assigned approver can decide a request; you cannot approve your own request.</p><p>Managers with no reporting manager can proceed directly where the workflow permits. Managers with a superior need approval. Missing reporting configuration does not grant a bypass.</p><p>Review the submitted details before deciding. Quotation and lead-conversion rejections require a reason; the funnel-stage decision note is optional.</p></div></details>
}
export function ApprovalsClient({tab,initialPage}:{tab:'incoming'|'mine';initialPage:ApprovalQueuePage}){
 const router=useRouter()
 const [navigating,startNavigation]=React.useTransition()
 const [search,setSearch]=React.useState('')
 const [type,setType]=React.useState<'all'|ApprovalKind>('all')
 const [order,setOrder]=React.useState<ApprovalOrder>('oldest')
 const [trail,setTrail]=React.useState<Array<string|null>>([null])
 const [selectedKey,setSelectedKey]=React.useState<string|null>(null)
 const [mobileReview,setMobileReview]=React.useState(false)
 const [retry,setRetry]=React.useState(0)
 const input={tab,search:search.trim(),type,order,cursor:trail[trail.length-1]}
 const queryKey=JSON.stringify(input)
 const firstKey=React.useRef(queryKey)
 const [loaded,setLoaded]=React.useState({source:initialPage,page:initialPage,key:queryKey})
 const [loading,setLoading]=React.useState(false)
 const [error,setError]=React.useState(false)
 const first=React.useRef(true)
 const queueRef=React.useRef<HTMLDivElement>(null)
 const reviewBackRef=React.useRef<HTMLButtonElement>(null)
 React.useEffect(()=>{if(mobileReview&&window.matchMedia("(max-width: 1023px)").matches)reviewBackRef.current?.focus()},[mobileReview,selectedKey])
 React.useEffect(()=>{
  if(first.current){first.current=false;if(queryKey===firstKey.current)return}
  let cancelled=false
  const timer=setTimeout(()=>{
   setLoading(true);setError(false)
   void listApprovalQueue(JSON.parse(queryKey)).then(page=>{
    if(!cancelled){setLoaded({source:initialPage,page,key:queryKey});queueRef.current?.scrollTo({top:0})}
   }).catch(()=>{if(!cancelled)setError(true)}).finally(()=>{if(!cancelled)setLoading(false)})
  },180)
  return ()=>{cancelled=true;clearTimeout(timer)}
 },[queryKey,initialPage,retry])
 const page=loaded.page
 const stale=loaded.key!==queryKey||loaded.source!==initialPage
 const busy=loading||(!error&&stale)||navigating
 const selected=page.items.find(item=>`${item.kind}:${item.id}`===selectedKey)??page.items[0]
 const total=Object.values(page.counts).reduce((sum,count)=>sum+count,0)
 const filtered=!!search.trim()||type!=='all'
 function resetPage(){setTrail([null]);setMobileReview(false)}
 function backToQueue(){setMobileReview(false);setTimeout(()=>queueRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus(),0)}
 return <div className="flex min-w-0 flex-col gap-4">
  <div className={cn(mobileReview&&'hidden lg:block')}><PageHeader title="Review requests" description="Review the context, then make your decision."><RoutingHelp/></PageHeader></div>
  <Tabs value={tab} onValueChange={value=>startNavigation(()=>router.push(`/approvals?tab=${value}`))} className={cn(mobileReview&&'hidden lg:block')}><TabsList variant="line"><TabsTrigger value="incoming" disabled={navigating}>Needs my review</TabsTrigger><TabsTrigger value="mine" disabled={navigating}>My requests</TabsTrigger></TabsList></Tabs>
  <div className={cn('flex flex-wrap items-center gap-2',mobileReview&&'hidden lg:flex')}>
   <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden/><Input aria-label="Search approval requests" placeholder="Search requests, customers or requesters…" className="pl-9" value={search} maxLength={200} onChange={event=>{setSearch(event.target.value);resetPage()}}/></div>
   <label className="sr-only" htmlFor="approval-type">Request type</label><select id="approval-type" value={type} onChange={event=>{setType(event.target.value as typeof type);resetPage()}} className="h-9 max-w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="all">All types</option><option value="quotation">Quotations</option><option value="stage">Funnel stages</option><option value="lead">Lead conversions</option></select>
   <label className="sr-only" htmlFor="approval-order">Request order</label><select id="approval-order" value={order} onChange={event=>{setOrder(event.target.value as ApprovalOrder);resetPage()}} className="ml-auto h-9 max-w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
  </div>
  {mobileReview?<Button ref={reviewBackRef} variant="ghost" className="min-h-11 self-start lg:hidden" onClick={backToQueue}><ArrowLeft/>Back to requests</Button>:null}
  {error?<div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm"><p>Could not load the current requests. Retry before making a decision.</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Retry</Button></div>:null}
  <div aria-busy={busy} className={cn('min-w-0 overflow-hidden rounded-lg border lg:grid lg:h-[calc(100dvh-19rem)] lg:min-h-[26rem] lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.8fr)]',mobileReview&&'h-[calc(100dvh-9rem)]')}>
   <div className={cn('flex h-full min-h-0 flex-col lg:border-r',mobileReview&&'hidden lg:flex')}>
    <div role="status" aria-live="polite" className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b px-4 py-3 text-xs text-muted-foreground"><span>{busy?'Loading requests…':`${total} ${total===1?'request':'requests'}${filtered?' matching filters':tab==='incoming'?' awaiting your review':''}`}</span>{busy?<Loader2 className="size-4 animate-spin" aria-hidden/>:null}</div>
    <div ref={queueRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
     {page.items.length?<ul>{page.items.map(item=>{
      const key=`${item.kind}:${item.id}`,active=selected?.kind===item.kind&&selected.id===item.id
      const context=item.kind==='quotation'?item.row.customerName:item.kind==='lead'?item.row.companyName:`${item.row.fromStageName??'—'} → ${item.row.targetStageName}`
      return <li key={key}><button aria-pressed={active} disabled={busy||error} onClick={()=>{setSelectedKey(key);setMobileReview(true)}} className={cn('flex w-full min-w-0 flex-col gap-1.5 border-b p-3 text-left transition-colors hover:bg-muted/50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait',active&&'bg-primary/5 ring-1 ring-inset ring-primary/30')}>
       <span className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-2"><ObjectTile kind={item.kind==='stage'?'funnel':item.kind==='lead'?'lead':'quotation'} className="size-5" iconClassName="size-3"/>{APPROVAL_TYPE_LABELS[item.kind]}</span><span title={item.row.requestedAt??undefined}>{item.row.requestedAt?(page.asOf?formatDistanceStrict(new Date(item.row.requestedAt),new Date(page.asOf),{addSuffix:true}):formatDate(item.row.requestedAt)):'Date unavailable'}</span></span>
       <span className="flex w-full min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{approvalItemTitle(item)}</span>{item.kind==='quotation'?<span className="text-xs tabular-nums">{formatMoney(item.row.total,item.row.currency)}</span>:null}</span>
       <span className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{context}</span>
       <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{item.row.requesterName??'Unknown requester'}</span>{tab==='mine'?<ApprovalReviewStatus status={item.row.status}/>:null}</span>
      </button></li>
     })}</ul>:<EmptyState icon={filtered?Search:CheckCheck} title={filtered?'No matching requests':trail.length>1?'No requests on this page':tab==='incoming'?"You’re up to date":'No requests yet'} description={filtered?'Try another search or request type.':trail.length>1?'Use Previous to return to earlier requests.':tab==='incoming'?'Requests assigned to you will appear here.':'Your submitted approval requests will appear here.'}/>}
    </div>
    <nav aria-label="Approval queue pages" className="flex shrink-0 items-center justify-between gap-2 border-t p-3"><Button size="sm" variant="outline" className="min-h-10" disabled={busy||trail.length===1} onClick={()=>{setTrail(current=>current.slice(0,-1));setMobileReview(false)}}>Previous</Button><span className="text-xs text-muted-foreground">Page {trail.length}</span><Button size="sm" variant="outline" className="min-h-10" disabled={busy||!page.hasNextPage} onClick={()=>{if(page.nextCursor)setTrail(current=>[...current,page.nextCursor]);setMobileReview(false)}}>Next</Button></nav>
   </div>
   <fieldset disabled={busy||error||stale} className={cn('h-full min-h-0 min-w-0 flex-col border-0 p-0 lg:flex',mobileReview?'flex':'hidden')}>
    {selected?(selected.kind==='quotation'?<QuotationApprovalCard key={`${selected.kind}:${selected.id}`} row={selected.row} incoming={tab==='incoming'}/>:selected.kind==='lead'?<LeadConversionApprovalCard key={`${selected.kind}:${selected.id}`} row={selected.row} incoming={tab==='incoming'}/>:<StageApprovalReview key={`${selected.kind}:${selected.id}`} row={selected.row} incoming={tab==='incoming'}/>):<div className="flex h-full items-center justify-center"><EmptyState icon={Inbox} title="Select a request to review" description="Request details and decision controls appear here."/></div>}
   </fieldset>
  </div>
 </div>
}
