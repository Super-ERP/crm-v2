import * as React from 'react'
import Link from 'next/link'
import {StatusBadge} from '@/components/status-badge'
import {ObjectTile} from '@/components/object-tile'
import {Button} from '@/components/ui/button'
import {formatDate} from '@/lib/format'
import {APPROVAL_TYPE_LABELS,type ApprovalKind} from '@/lib/approval-queue'

export function ApprovalReviewStatus({status}:{status:string}) {
 const waiting=status==='pending'||status==='pending_approval'
 return <StatusBadge status={waiting?'pending':status} label={waiting?'Awaiting approval':undefined}/>
}
export function ApprovalReviewFrame({kind,title,subtitle,status,children,recordHref,recordLabel,actions}:{kind:ApprovalKind;title:string;subtitle?:React.ReactNode;status:string;children?:React.ReactNode;recordHref:string;recordLabel:string;actions?:React.ReactNode}) {
 return <section className="flex h-full min-h-0 min-w-0 flex-col" aria-label={`${APPROVAL_TYPE_LABELS[kind]} review`}>
  <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b p-5">
   <div className="flex min-w-0 items-start gap-3"><ObjectTile kind={kind==='stage'?'funnel':kind==='lead'?'lead':'quotation'} className="size-9"/><div className="min-w-0 space-y-1"><h2 className="break-words text-lg font-semibold [overflow-wrap:anywhere]">{title}</h2><p className="text-sm text-muted-foreground">{APPROVAL_TYPE_LABELS[kind]}</p>{subtitle?<div className="text-sm">{subtitle}</div>:null}</div></div>
   <ApprovalReviewStatus status={status}/>
  </header>
  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 [overflow-wrap:anywhere]">{children}</div>
  <footer data-slot="approval-review-actions" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-muted/20 p-4">
   <Button nativeButton={false} variant="outline" className="min-h-10 max-sm:min-h-11" render={<Link href={recordHref}/>}>{recordLabel}</Button>
   <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
  </footer>
 </section>
}
export function ApprovalFact({label,children}:{label:string;children:React.ReactNode}) {
 return <div className="min-w-0 space-y-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm">{children}</dd></div>
}
export function ApprovalRequestMetadata({row,incoming}:{row:{requesterName:string|null;approverName:string|null;requestedAt:string|null;decidedAt:string|null};incoming:boolean}) {
 return <dl className="grid gap-4 border-t pt-4 sm:grid-cols-2">
  <ApprovalFact label="Requested by">{row.requesterName??'Unknown'}</ApprovalFact>
  <ApprovalFact label="Submitted">{row.requestedAt?<time dateTime={row.requestedAt} title={row.requestedAt}>{formatDate(row.requestedAt)}</time>:'Submission date unavailable'}</ApprovalFact>
  {!incoming?<ApprovalFact label="Approver">{row.approverName??'Unrouted'}</ApprovalFact>:null}
  {row.decidedAt?<ApprovalFact label="Last decision">{formatDate(row.decidedAt)}</ApprovalFact>:null}
 </dl>
}
