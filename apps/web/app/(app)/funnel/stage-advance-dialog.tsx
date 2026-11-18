"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { showActionError } from "@/lib/show-action-error"

import {
  missingFromKeys,
  requiresCloseRemarks,
  closeRemarksLabel,
  stagesRequiredBefore,
  requiredKeysForStages,
  isRollbackTransition,
  requiresApprovalForTransition,
  requiresTransitionReason,
  type StageGate,
  type CustomFunnelField,
} from "@/lib/stage-gate"

import { Button } from "@/components/ui/button"
import { StatusCallout } from "@/components/status-callout"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AttachmentUpload } from "@/components/attachments/attachment-upload"
import { formatPercent } from "@/lib/format"
import type { PpvvcPatch } from "@/lib/ppvvc"
import { StageBadge } from "./stage-badge"
import { requiresCommitSetup, type ProjectCodeChoice } from "@/lib/commit-stage"
import { ProjectCodePicker } from "@/components/project-code-picker"
import { MilestoneAllocation } from "@/components/payment-milestone-table"
import { BillingScheduleEditor, type ScheduleErrors } from "@/components/billing-schedule-editor"
import { BILLING_MONTHS, validateBillingSchedule, validateQuotationItemAllocation, type BillingScheduleInput } from "@/lib/billing-schedule"
import { getCommitSetup } from "./commit-setup-actions"
import { advanceStageAction } from "./actions"
import { selectableTargets } from "./stage-transitions"

// Where each Opportunity-level preset gate field is edited, so a blocked move
// can deep-link straight to it. Keys absent here live on the Funnel's own
// Details panel (procurementStage, negotiationDate, estimate, contact, …).
const OPP_ANALYSIS_KEYS = new Set([
  "vision",
  "objective",
  "value",
  "powerSponsorContact",
  "powerSponsorBudgetLimit",
  "oppEstimatedBudget",
  "oppEstimatedCloseDate",
])
const OPP_DETAILS_KEYS = new Set(["ownerContact", "ownerBudgetLimit"])

type Stage = {
  id: string
  code: string
  name: string
  kind: string
  probability: string
  sortOrder: number
  requiresApprovalToEnter: boolean
  /** Configurable entry requirements (field keys) for this stage. */
  requiredFields: string[]
}

export function StageAdvanceDialog({
  funnelId,
  currentStageId,
  stages,
  trigger,
  open: openProp,
  onOpenChange,
  initialTargetStageId,
  gate,
  opportunityId,
  opportunityName,
  skipPpvvc = false,
}: {
  funnelId: string
  currentStageId: string
  stages: Stage[]
  trigger?: React.ReactElement
  /** Controlled open state. When provided, the dialog can be driven externally
   * (e.g. opened by the funnel board after a gated drag-drop). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Pre-select a target stage when the dialog opens (controlled usage). */
  initialTargetStageId?: string
  /** Resolved per-stage entry gate (preset + custom field completeness). */
  gate?: StageGate
  /** Tenant custom-field definitions, so required fields can be filled inline. */
  customFieldDefs?: CustomFunnelField[]
  /** The funnel's current custom-field values (prefill the inputs). */
  customValues?: Record<string, string>
  /** Parent Opportunity container — preset fields (Vision, Owner Contact, …)
   * live there, not on this Funnel, so a blocked move needs a way there. */
  opportunityId?: string
  opportunityName?: string
  /** Authoritative Opportunity PPVVC values, shown inline for gated moves. */
  ppvvc?: PpvvcPatch | null
  canEditPpvvc?: boolean
  skipPpvvc?: boolean
}) {
  const router = useRouter()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const focusError = () => requestAnimationFrame(() => { const root=contentRef.current; const target=root?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? root?.querySelector<HTMLElement>('[data-validation-summary]'); target?.focus() })
  const [openState, setOpenState] = React.useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openState
  const setOpen = React.useCallback(
    (o: boolean) => {
      if (!isControlled) setOpenState(o)
      onOpenChange?.(o)
    },
    [isControlled, onOpenChange]
  )
  // Seed the target from a controlled pre-selection (e.g. the board opens this
  // dialog, freshly keyed per gated drop, with a chosen target stage).
  const [targetStageId, setTargetStageId] = React.useState(
    initialTargetStageId ?? ""
  )
  const [reason, setReason] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [approvalRequestId, setApprovalRequestId] = React.useState<
    string | null
  >(null)
  const ordered = React.useMemo(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  )
  // Only stages the server's state machine will actually accept as a move.
  const selectable = selectableTargets(ordered, currentStageId)
  const target = ordered.find((s) => s.id === targetStageId)
  const from = ordered.find((s) => s.id === currentStageId)
  const rollback = !!from && !!target && isRollbackTransition(from, target)
  const needsApproval = !!from && !!target && requiresApprovalForTransition(from, target)
  const commitRequired = !!from && !!target && !rollback && requiresCommitSetup(from,target,ordered)
  const [setup,setSetup] = React.useState<Awaited<ReturnType<typeof getCommitSetup>> | null>(null)
  const [attempted,setAttempted] = React.useState(false)
  const [validationError,setValidationError] = React.useState("")
  const [setupError,setSetupError] = React.useState("")
  const [projectCodeChoice,setProjectCodeChoice] = React.useState<ProjectCodeChoice|null>(null)
  const [billingSchedule,setBillingSchedule] = React.useState<BillingScheduleInput[] | undefined>(undefined)
  React.useEffect(()=>{
    if(!open || !commitRequired)return
    let live=true
    getCommitSetup(funnelId).then(data=>{if(live){setSetup(data);setProjectCodeChoice(choice=>choice ?? (data.code ? {mode:"existing",code:data.code} : null));setSetupError("")}}).catch(error=>{if(live)setSetupError(error instanceof Error?error.message:"Could not load commit requirements")})
    return()=>{live=false}
  },[open,commitRequired,funnelId])
  const targetId = target?.id
  const targetKind = target?.kind

  // Advancing to a stage checks every earlier stage, including the current one.
  const requiredStages = targetId
    ? stagesRequiredBefore(ordered, currentStageId, targetId)
    : []
  const requiredKeys = requiredKeysForStages(requiredStages, {
    skipPpvvcForWonTransition: skipPpvvc || targetKind === "WON",
  })
  const allMissing = missingFromKeys(
    requiredKeys,
    gate ?? { satisfied: {}, labels: {} }
  )
  const missing = commitRequired ? allMissing.filter(field=>field.key!=="expectedInvoice") : allMissing
  const isTerminal = target ? requiresCloseRemarks(target.kind) : false
  const needsReason = !!from && !!target && requiresTransitionReason(from, target)
  const showReason = needsApproval || needsReason
  const blocked = missing.length > 0 || (needsReason && !reason.trim()) || (commitRequired && (!setup || !projectCodeChoice || (projectCodeChoice.mode==='existing' && !projectCodeChoice.code)))

  const planRows = billingSchedule ?? setup?.rows ?? []
  const codeMissing = !projectCodeChoice || (projectCodeChoice.mode !== 'new' && !projectCodeChoice.code.trim())
  const fieldErrors: ScheduleErrors = {}
  if(attempted) planRows.forEach((row,index)=>{
    const errors: ScheduleErrors[number] = {}
    if(!row.title.trim()) errors.title='Enter a milestone title.'
    if(!/^\d+(\.\d{1,2})?$/.test(row.amount)||Number(row.amount)<=0) errors.amount='Enter a positive amount in cents.'
    if(!(BILLING_MONTHS as readonly string[]).includes(row.expectedInvoiceMonth)||!Number.isInteger(row.expectedInvoiceYear)||row.expectedInvoiceYear<1900||row.expectedInvoiceYear>9999) errors.period='Select an invoice month and valid year.'
    if(Object.keys(errors).length)fieldErrors[index]=errors
  })
  const stageLabel = React.useCallback(
    (s: Stage) => `${s.name.toLowerCase().startsWith(s.code.toLowerCase() + " —") ? s.name : `${s.code} — ${s.name}`} · ${formatPercent(s.probability)}`,
    []
  )
  const stageItems = React.useMemo(
    () => selectable.map((s) => ({ value: s.id, label: stageLabel(s) })),
    [selectable, stageLabel]
  )

  function reset() {
    setAttempted(false)
    setValidationError("")
    setSetupError("")
    setTargetStageId("")
    setProjectCodeChoice(null)
    setBillingSchedule(undefined)
    setSetup(null)
    setReason("")
    setApprovalRequestId(null)
    setSubmitting(false)
  }

  async function onSubmit() {
    if (!targetStageId) {
      toast.error("Pick a target stage")
      return
    }
    if (missing.length > 0) {
      toast.error(`${missing.length} required field${missing.length > 1 ? "s" : ""} still missing`, {
        description: "See the checklist in this dialog for where to fill each one in.",
      })
      return
    }
    if (needsReason && !reason.trim()) {
      toast.error(
        isTerminal ? "Close remarks are required" : "A reason is required for this stage"
      )
      return
    }
    setAttempted(true)
    setValidationError("")
    if(commitRequired) {
      if(codeMissing) { focusError(); return }
      if(!setup || setupError) { setValidationError('Load the payment plan before advancing.'); focusError(); return }
      if(setup.canManageSchedule) {
        try {
          validateBillingSchedule(planRows)
          if(!setup.hasLockedRows)validateQuotationItemAllocation(planRows,setup.lines)
          if(setup.quote && planRows.reduce((sum,row)=>sum+Math.round(Number(row.amount)*100),0)!==Math.round(Number(setup.quote.net)*100)) throw new Error('Payment milestones must equal the quotation net amount excluding tax.')
        } catch(error) { setValidationError(error instanceof Error?error.message:'Check the payment plan.'); focusError(); return }
      }
    }
    setSubmitting(true)
    try {
      const res = await advanceStageAction({
        funnelId,
        targetStageId,
        reason: reason.trim() || undefined,
        skipPpvvc,
        projectCodeChoice: commitRequired ? projectCodeChoice ?? undefined : undefined,
        billingSchedule: commitRequired ? billingSchedule : undefined,
      })
      if (!res.ok) {
        showActionError(res)
        return
      }
      const result = res.data
      if (result.moved) {
        // Moved immediately — there's no approval request to attach to.
        toast.success(rollback ? "Stage moved back" : "Stage advanced")
        setOpen(false)
        reset()
        router.refresh()
      } else {
        toast.success("Sent for approval")
        // Keep the dialog open so the requester can attach more files.
        if (result.approvalRequestId) {
          setApprovalRequestId(result.approvalRequestId)
        } else {
          setOpen(false)
          reset()
        }
        router.refresh()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not advance stage")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if(submitting)return
        setOpen(o)
        if (!o) reset()
      }}
    >
      {isControlled && !trigger ? null : (
        <DialogTrigger render={trigger ?? <Button>Advance stage</Button>} />
      )}
      <DialogContent ref={contentRef} size="wide" className={commitRequired && !approvalRequestId ? "flex max-h-[90svh] flex-col overflow-hidden sm:max-w-[1100px]" : undefined}>
        <DialogHeader>
          <DialogTitle>{commitRequired ? `Advance to ${target?.code} — Commit` : rollback ? "Move back" : "Advance stage"}</DialogTitle>
          <DialogDescription>
            {commitRequired ? setup?.funnelName ?? "Prepare this Funnel for Commit." : needsApproval
              ? "This stage change requires approval before it takes effect."
              : rollback
                ? "Move this Funnel back to an earlier stage."
                : "Move this Funnel to a new stage."}
          </DialogDescription>
        </DialogHeader>

        {approvalRequestId ? (
          <div className="grid gap-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              Your request is pending approval. You can attach supporting
              documents below, or manage it from{" "}
              <Link href="/approvals" className="font-medium underline">
                Approvals
              </Link>
              .
            </div>
            <div className="grid gap-2">
              <Label>Attachments</Label>
              <AttachmentUpload
                attachableType="stage_approval_request"
                attachableId={approvalRequestId}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className={commitRequired ? "flex min-h-0 flex-1 flex-col" : "grid gap-4"}>
            <div className={commitRequired ? "grid min-h-0 gap-5 overflow-y-auto px-1 pb-4" : "grid gap-4"}>
            <div className="grid gap-2 sm:max-w-sm">
              <Label>Target stage</Label>
              <Select
                value={targetStageId}
                onValueChange={(v) => setTargetStageId((v as string) ?? "")}
                items={stageItems}
              >
                <SelectTrigger width="full">
                  <SelectValue placeholder="Pick a stage…" />
                </SelectTrigger>
                <SelectContent>
                  {selectable.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {stageLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {target ? (
                <div className="pt-1">
                  <StageBadge
                    name={target.name}
                    kind={target.kind}
                    probability={target.probability}
                  />
                </div>
              ) : null}
            </div>

            {commitRequired ? <section className="grid gap-5" aria-label="Commit billing requirements">
              <section className="grid gap-3 rounded-lg border p-4" aria-labelledby="commit-code-title">
                <h3 id="commit-code-title" className="text-sm font-semibold">Project Code <span className="text-destructive">*</span></h3>
                <ProjectCodePicker value={projectCodeChoice} onChange={setProjectCodeChoice} currentCode={setup?.code} validationError={attempted && codeMissing ? "Generate a new code or select an existing code." : undefined}/>
              </section>
              <section className="grid min-w-0 gap-3 rounded-lg border p-4" aria-labelledby="commit-plan-title">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="commit-plan-title" className="text-sm font-semibold">Payment Milestones <span className="text-destructive">*</span></h3>{setup?.quote ? <Link className="link text-sm" href={`/quotations/${setup.quote.id}?tab=milestones`} target="_blank">{setup.quote.number} — open payment plan ↗</Link> : null}</div>
                {setupError ? <p role="alert" className="text-sm text-destructive">{setupError}</p> : !setup ? <p role="status" className="text-sm text-muted-foreground">Loading payment plan…</p> : <>
                  {setup.quote ? <MilestoneAllocation total={setup.quote.net} scheduled={planRows.reduce((sum,row)=>sum+Math.round(Number(row.amount||0)*100),0)/100} currency={setup.currency} totalLabel="Quotation net"/> : <p className="text-sm text-muted-foreground">Select a primary quotation to prepare payment milestones.</p>}
                  <BillingScheduleEditor currency={setup.currency} disabled={submitting} readOnly={!setup.canManageSchedule} quotationId={setup.quote?.id} dateOnly={setup.hasLockedRows} rows={planRows} onChange={setBillingSchedule} lines={setup.lines} errors={fieldErrors}/>
                </>}
              </section>
            </section> : null}

            {!rollback && target && missing.length > 0 ? (
              <StatusCallout tone="warning" className="p-3">
                <p className="font-medium">Complete earlier-stage fields first</p>
                <ul className="mt-2 grid gap-1.5">
                  {missing.map((m) => {
                    const onAnalysis = OPP_ANALYSIS_KEYS.has(m.key)
                    const onDetails = OPP_DETAILS_KEYS.has(m.key)
                    const href =
                      opportunityId && (onAnalysis || onDetails)
                        ? `/opportunities/${opportunityId}${onAnalysis ? "?tab=analysis" : ""}`
                        : null
                    return (
                      <li key={m.key} className="flex flex-wrap items-baseline gap-x-1.5">
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-warning"
                        />
                        <span>{m.label}</span>
                        {href ? (
                          <Link
                            href={href}
                            target="_blank"
                            className="text-xs font-medium underline"
                          >
                            fill in on {opportunityName ?? "the Opportunity"} ↗
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            — on this Funnel&apos;s Details panel
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fill these in on the Funnel or Opportunity details, then come back and advance.
                </p>
              </StatusCallout>
            ) : null}

            {showReason ? (
              <div className="grid gap-2">
                <Label htmlFor="advance-reason">
                  {isTerminal && target
                    ? closeRemarksLabel(target.kind)
                    : needsReason ? "Reopen reason" : "Approval note (optional)"}{" "}
                  {needsReason ? <span className="text-destructive">*</span> : null}
                </Label>
                <Textarea
                  id="advance-reason"
                  placeholder={
                    isTerminal
                      ? "Why is this funnel being closed? (recorded on the stage history)"
                      : needsReason ? "Why is this Closed Lost funnel being reopened?" : "Optional context for the reviewer"
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {isTerminal
                    ? "Close remarks are kept on the funnel's stage history."
                    : needsApproval
                      ? "Your request is routed to an approver — track its status under Approvals."
                      : "The reason is kept on the funnel's stage history."}
                </p>
              </div>
            ) : null}

            </div>
            {validationError ? <p role="alert" tabIndex={-1} data-validation-summary className="py-2 text-sm text-destructive">{validationError}</p> : null}
            <DialogFooter className={commitRequired ? "shrink-0 border-t pt-4" : undefined}>
              <Button
                disabled={submitting}
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={submitting || (commitRequired ? missing.length>0 || !setup || !!setupError || (needsReason && !reason.trim()) : blocked)}
              >
                {needsApproval ? "Request approval" : rollback ? "Move back" : commitRequired ? `Advance to ${target?.code}` : "Advance"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
