"use client"
import * as React from "react"
import {useRouter} from "next/navigation"
import {ChevronRight,Loader2} from "lucide-react"
import {toast} from "sonner"
import {showActionError} from "@/lib/show-action-error"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/textarea"
import {Label} from "@/components/ui/label"
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger} from "@/components/ui/alert-dialog"
import {AttachmentList} from "@/components/attachments/attachment-upload"
import {listEntityAttachments,type AttachmentRow} from "@/app/(app)/_shared/attachment-actions"
import {decideApprovalAction,type ApprovalRow} from "./actions"
import {ApprovalReviewFrame,ApprovalRequestMetadata} from "./approval-review-parts"
function Attachments({ requestId }: { requestId: string }) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<AttachmentRow[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && items === null && !loading) {
      setError(false)
      setLoading(true)
      try {
        const data = await listEntityAttachments("stage_approval_request", requestId)
        setItems(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`attachments-${requestId}`}
        disabled={loading}
        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`}
        />
        Attachments
      </button>
      {open ? (
        <div id={`attachments-${requestId}`} className="mt-2 pl-1">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </span>
          ) : error ? (
            <span className="text-xs text-destructive">Attachments could not be loaded. Close and reopen to retry.</span>
          ) : (
            <AttachmentList items={items ?? []} />
          )}
        </div>
      ) : null}
    </div>
  )
}

function StagePath({ row }: { row: ApprovalRow }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{row.fromStageName ?? "—"}</span>
      <ChevronRight className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{row.targetStageName}</span>
    </span>
  )
}

function DecisionDialog({
  row,
  decision,
}: {
  row: ApprovalRow
  decision: "approved" | "rejected"
}) {
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  const approve = decision === "approved"
  const router=useRouter()

  function submit() {
    startTransition(async () => {
      const res = await decideApprovalAction({
        requestId: row.id,
        decision,
        note: note.trim() || undefined,
      })
      if (!res.ok) {
        showActionError(res)
        return
      }
      // An approve can resolve as "obsolete" when the funnel already moved past
      // the requested stage — surface that neutrally rather than as a success.
      if (res.data.status === "obsolete") {
        toast.info(res.data.message)
      } else {
        toast.success(res.data.message)
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button className="min-h-10 max-sm:min-h-11" variant={approve ? "default" : "outline"}>
            {approve ? "Approve stage change" : "Reject"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {approve ? "Approve stage change" : "Reject stage change"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {row.opportunityName} — moving to {row.targetStageName}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`note-${row.id}-${decision}`}>Note (optional)</Label>
          <Textarea
            id={`note-${row.id}-${decision}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a decision note…"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11"
            variant={approve ? "default" : "destructive"}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {approve ? "Approve stage change" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CancelDialog({ row }: { row: ApprovalRow }) {
  const router=useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function submit() {
    startTransition(async () => {
      const res = await decideApprovalAction({
        requestId: row.id,
        decision: "cancelled",
      })
      if (!res.ok) {
        showActionError(res)
        return
      }
      toast.success(res.data.message)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button className="min-h-10 max-sm:min-h-11" variant="outline">
            Cancel
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
          <AlertDialogDescription>
            {row.opportunityName} will stay in its current stage. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" disabled={pending}>Keep request</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11"
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Cancel request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


export function StageApprovalReview({row,incoming}:{row:ApprovalRow;incoming:boolean}) {
 return <ApprovalReviewFrame kind="stage" title={row.opportunityName} subtitle={<StagePath row={row}/>} status={row.status} recordHref={`/funnel/${row.funnelId}`} recordLabel="View funnel" actions={row.status==='pending'?(incoming?<><DecisionDialog row={row} decision="rejected"/><DecisionDialog row={row} decision="approved"/></>:<CancelDialog row={row}/>):null}>
  <section className="space-y-2"><h3 className="text-sm font-semibold">What approval does</h3><p className="text-sm text-muted-foreground">Lets this funnel advance to {row.targetStageName}. Rejection keeps it in its current stage.</p></section>
  <section className="space-y-2"><h3 className="text-sm font-semibold">Reason for request</h3><p className="whitespace-pre-wrap text-sm">{row.reason||'No reason provided.'}</p></section>
  <ApprovalRequestMetadata row={row} incoming={incoming}/>
  <Attachments requestId={row.id}/>
  {row.decisionNote?<section className="space-y-1"><h3 className="text-sm font-semibold">Decision note</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.decisionNote}</p></section>:null}
 </ApprovalReviewFrame>
}
