"use client"

import * as React from "react"
import { useRecordEditor } from "@/components/use-record-editor"
import { RecordHeaderActions } from "@/components/record-header-actions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RecordPhoneField } from "@/components/record-phone-field"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent, TabsList } from "@/components/ui/tabs"
import { ActivityTimeline } from "@/components/activity/activity-timeline"
import { DocumentsSection, type SectionDocument } from "@/components/documents-section"
import {
  CountTab,
  DetailAside,
  DetailCardHeader,
  FieldRow,
  FieldSection,
  RelatedCard,
  TabsCard,
} from "@/components/detail-page"
import type { InlineValue } from "@/components/inline-value"
import { PhoneNumberDisplay } from "@/components/phone-input"
import { usePermissions } from "@/components/command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import { type ProgressStep } from "@/components/stage-progress"
import { showActionError } from "@/lib/show-action-error"
import {
  StagePathView,
  type PathStep,
  type PathStepState,
  type PathNote,
} from "@/components/stage-path-view"
import { setLeadStatus, setLeadStage, updateLead, type LeadInput } from "../actions"

/** Map the dot-stepper steps onto the shared chevron-path steps, marking which
 *  segments are clickable via the supplied predicate. */
function toPathSteps(
  steps: ProgressStep[],
  isClickable: (id: string, state: PathStepState) => boolean
): PathStep[] {
  return steps.map((s) => {
    const state: PathStepState = s.state === "terminal" ? "upcoming" : s.state
    return {
      id: s.id,
      label: s.label,
      state,
      tone: s.tone,
      clickable: isClickable(s.id, state),
    }
  })
}

export type LeadConverted = {
  accountId: string | null
  accountName: string | null
  personId: string | null
  personName: string | null
  funnelId: string | null
  funnelName: string | null
}

/** Raw scalar fields the page marks inline-editable (Salesforce-style). */
export type LeadEditKey = "name" | "companyName" | "email" | "phone" | "source"

export type LeadDetailSection = {
  title: string
  fields: { label: string; value: React.ReactNode; editKey?: LeadEditKey }[]
}

export type LeadDetailData = {
  leadId: string
  canVoid: boolean
  workflowActions?: React.ReactNode
  status: string
  sections: LeadDetailSection[]
  /** Raw field values — updateLead is full-replace, so each inline save
   *  merges the one edited field into this snapshot. */
  record: LeadInput
  leadSteps: ProgressStep[]
  leadNote: PathNote
  funnelSteps: ProgressStep[] | null
  funnelNote: PathNote
  converted: LeadConverted | null
  activity: React.ComponentProps<typeof ActivityTimeline>["items"]
  files: SectionDocument[]
}

/** Lead detail: a details panel + conversion links on the left; the lead/funnel
 *  progress and tabbed Activity/Documents on the right. */
export function LeadDetailBody({
  leadId,
  canVoid,
  workflowActions,
  status,
  sections,
  record: initialRecord,
  leadSteps,
  leadNote,
  funnelSteps,
  funnelNote,
  converted,
  activity,
  files,
}: LeadDetailData) {
  const [tab, setTab] = React.useState("activity")
  const router = useRouter()
  const perms = usePermissions()
  const canUpdate = perms.has(PERMISSIONS.LEAD_UPDATE)
  const revalidate = `/leads/${leadId}`


  // Converted/disqualified leads are terminal — their status is locked.
  const terminal = status === "converted" || status === "disqualified"
  const interactive = canUpdate && !terminal
  // Only the pre-outcome statuses are click-settable; Convert/Disqualify have
  // their own flows in the page header.
  const STATUS_SETTABLE = ["new", "contacted", "qualified"]

  async function changeStatus(next: string) {
    if (!workflowInteractive) return
    const res = await setLeadStatus(leadId, next)
    if (!res.ok) {
      showActionError(res)
      return
    }
    toast.success("Lead status updated")
    router.refresh()
  }

  const editor = useRecordEditor<LeadInput>({ initial: initialRecord, onSave: draft => updateLead(leadId, draft) })
  const record = editor.record
  const saveField = editor.stage
  const workflowInteractive = interactive && !editor.editing && !editor.saving

  async function changeFunnelStage(stageId: string) {
    if (!workflowInteractive) return
    const res = await setLeadStage(leadId, stageId)
    if (!res.ok) {
      showActionError(res)
      return
    }
    toast.success("Stage updated")
    router.refresh()
  }

  const leadPathSteps = toPathSteps(
    leadSteps,
    (id, state) =>
      workflowInteractive && STATUS_SETTABLE.includes(id) && state !== "current"
  )
  const funnelPathSteps = funnelSteps
    ? toPathSteps(funnelSteps, (_id, state) => workflowInteractive && state !== "current")
    : null

  return (
    <fieldset key={editor.session} disabled={editor.saving} className="grid min-w-0 gap-4 lg:grid-cols-3 lg:items-start" onInputCapture={editor.markDirty}>
      {/* Left column — details + conversion links */}
      <DetailAside>
        <Card>
          <DetailCardHeader kind="lead" eyebrow="Lead" actions={<RecordHeaderActions canEdit={interactive} editing={editor.editing} saving={editor.saving} onEdit={editor.start} onSave={editor.save} onCancel={editor.cancel} voidTarget={canVoid ? { type: "lead", id: leadId } : undefined} />} />
          {editor.error ? <p role="alert" className="px-6 text-sm text-destructive">{editor.error}</p> : null}
          <CardContent className="grid gap-5 text-sm">
            {sections.map((section) => (
              <FieldSection key={section.title} title={section.title}>
                {section.fields.map((d) => {
                  // Terminal (converted/disqualified) leads are locked, like
                  // the status path above.
                  const key = interactive && editor.editing ? d.editKey : undefined
                  return (
                    <FieldRow key={d.label} label={d.label}>
                      {!key ? (
                        d.label === "Phone" ? (
                          <PhoneNumberDisplay value={record.phone} />
                        ) : (
                          d.value
                        )
                      ) : key === "phone" ? (
                        <RecordPhoneField
                          value={record.phone}
                          onChange={(next) => saveField({ phone: next || null })}
                        />
                      ) : (
                        <DraftValue
                          value={record[key] ?? ""}
                          display={
                            record[key] || "—"
                          }
                          title={`Click to edit ${d.label.toLowerCase()}`}
                          onSave={(next) => {
                            // Keep invalid drafts so Save can surface server validation.
                            if (key === "name" || key === "email") {
                              return saveField({ [key]: next })
                            }
                            return saveField({ [key]: next || null })
                          }}
                        />
                      )}
                    </FieldRow>
                  )
                })}
              </FieldSection>
            ))}
          </CardContent>
        </Card>

        <RelatedCard
          items={[
            ...(converted?.accountId
              ? [
                  {
                    kind: "account" as const,
                    label: converted.accountName ?? "Account",
                    href: `/accounts/${converted.accountId}`,
                  },
                ]
              : []),
            ...(converted?.personId
              ? [
                  {
                    kind: "contact" as const,
                    label: converted.personName ?? "Contact",
                    href: `/persons/${converted.personId}`,
                  },
                ]
              : []),
            ...(converted?.funnelId
              ? [
                  {
                    kind: "funnel" as const,
                    label: converted.funnelName ?? "Opportunity",
                    href: `/opportunities/${converted.funnelId}`,
                  },
                ]
              : []),
            {
              kind: "document" as const,
              label: "Documents",
              count: files.length,
              onSelect: () => setTab("documents"),
            },
          ]}
        />
      </DetailAside>

      {/* Right column — progress + tabbed Activity / Documents */}
      <div className="grid gap-4 lg:col-span-2">
        {workflowActions ? <Card>
          <CardHeader><CardTitle className="text-base">Workflow actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {editor.editing ? <p className="text-sm text-muted-foreground">Save or cancel record changes to use workflow actions.</p> : workflowActions}
          </CardContent>
        </Card> : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <StagePathView
              steps={leadPathSteps}
              note={leadNote}
              hint={
                workflowInteractive && !leadNote
                  ? "Click a stage to update the lead status."
                  : undefined
              }
              onStepClick={workflowInteractive ? changeStatus : undefined}
            />
            {funnelPathSteps ? (
              <div className="border-t pt-6">
                <StagePathView
                  steps={funnelPathSteps}
                  note={funnelNote}
                  hint={
                    workflowInteractive && !funnelNote
                      ? "Click a stage to move the lead's funnel."
                      : undefined
                  }
                  onStepClick={workflowInteractive ? changeFunnelStage : undefined}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <TabsCard value={tab} onValueChange={setTab}>
          <TabsList>
            <CountTab value="activity">Activity</CountTab>
            <CountTab value="documents" count={files.length}>
              Documents
            </CountTab>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <ActivityTimeline
              entityType="lead"
              entityId={leadId}
              items={activity}
              revalidate={revalidate}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <DocumentsSection
              uploadType="lead"
              uploadId={leadId}
              documents={files}
              revalidate={revalidate}
            />
          </TabsContent>
        </TabsCard>
      </div>
    </fieldset>
  )
}

/** Controlled scalar input: all edits belong to the record's Save/Cancel draft. */
function DraftValue({ value, type = "text", multiline, title, onSave }: React.ComponentProps<typeof InlineValue>) {
  const props = { value, "aria-label": title?.replace(/^Click to (edit|change) /, ""), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { void onSave(event.target.value) } }
  return multiline ? <Textarea {...props} rows={3} /> : <Input {...props} type={type} step={type === "number" ? "0.01" : undefined} />
}
