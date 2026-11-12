"use client"

import * as React from "react"
import { useRecordEditor } from "@/components/use-record-editor"
import { RecordHeaderActions } from "@/components/record-header-actions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent, TabsList } from "@/components/ui/tabs"
import { ActivityTimeline } from "@/components/activity/activity-timeline"
import { DocumentsSection } from "@/components/documents-section"
import {
  DetailAside,
  DetailCardHeader,
  DetailTabs,
  RelatedCard,
  CountTab,
  FieldRow,
} from "@/components/detail-page"
import type { InlineValue } from "@/components/inline-value"
import { PROJECT_STATUS_OPTIONS } from "@/lib/status-meta"
import { formatDate } from "@/lib/format"
import { ProjectSalesOrders } from "@/app/(app)/sales-orders/project-sales-orders"
import { updateProject } from "../actions"
import { MilestonesPanel } from "./milestones-panel"
import { BillingPanel } from "./billing-panel"
import type { ProjectBillingSummary } from "@/app/(app)/billing/actions"

/** Raw scalar fields the page marks inline-editable (Salesforce-style). */
type ProjectRecord = { name: string; startDate: string | null; value: string | null; status: string; quotationId: string | null; notes: string | null }

export type ProjectEditKey = "name" | "startDate" | "value" | "status" | "quotationId"

export type ProjectDetailData = {
  projectId: string
  fields: { label: string; value: React.ReactNode; editKey?: ProjectEditKey }[]
  /** Raw values behind the inline-editable fields (updateProject is patch-style). */
  record: ProjectRecord
  quotationOptions: { id: string; quoteNumber: string }[]
  notes: string | null
  milestones: React.ComponentProps<typeof MilestonesPanel>["milestones"]
  projectValue: string | null
  currency: string
  canManage: boolean
  salesOrders: React.ComponentProps<typeof ProjectSalesOrders>["orders"]
  /** Whether the sales-orders plugin is enabled (gates the Sales orders tab). */
  salesOrdersEnabled: boolean
  canSubmit: boolean
  canApprove: boolean
  activity: React.ComponentProps<typeof ActivityTimeline>["items"]
  documents: React.ComponentProps<typeof DocumentsSection>["documents"]
  /** Finance-module billing rollup; null when the module is off. */
  billing?: ProjectBillingSummary | null
}

/** Project detail: a details panel on the left; tabbed Milestones / Sales
 *  orders / Activity / Documents on the right. */
export function ProjectDetailBody({
  projectId,
  fields,
  record: initialRecord,
  notes: initialNotes,
  quotationOptions,
  milestones,
  projectValue,
  currency,
  canManage,
  salesOrders,
  salesOrdersEnabled,
  canSubmit,
  canApprove,
  activity,
  documents,
  billing = null,
}: ProjectDetailData) {
  const [tab, setTab] = React.useState("milestones")
  const revalidate = `/projects/${projectId}`

  const editor = useRecordEditor<ProjectRecord>({ initial: { ...initialRecord, notes: initialNotes }, onSave: (_draft, changes) => updateProject(projectId, changes) })
  const record = editor.record
  const notes = record.notes
  const saveField = editor.stage


  return (
    <fieldset key={editor.session} disabled={editor.saving} className="grid min-w-0 gap-4 lg:grid-cols-3 lg:items-start" onInputCapture={editor.markDirty}>
      {/* Left column — project details */}
      <DetailAside>
        <Card>
          <DetailCardHeader kind="project" eyebrow="Project" actions={<RecordHeaderActions canEdit={canManage} editing={editor.editing} saving={editor.saving} onEdit={editor.start} onSave={editor.save} onCancel={editor.cancel} voidTarget={canManage ? { type: "project", id: projectId } : undefined} />} />
          {editor.error ? <p role="alert" className="px-6 text-sm text-destructive">{editor.error}</p> : null}
          <CardContent className="grid gap-3 text-sm">
            {fields.map((d) => {
              const key = canManage && editor.editing ? d.editKey : undefined
              return (
                <FieldRow key={d.label} label={d.label}>
                  {!key ? (
                    d.value
                  ) : key === "status" ? (
                    <select aria-label="Status" className="h-9 rounded-md border bg-background px-3" value={record.status} onChange={event => saveField({ status: event.target.value })}>
                      {PROJECT_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : key === "quotationId" ? (
                    <select aria-label="Quotation" className="h-9 rounded-md border bg-background px-3" value={record.quotationId ?? ""} onChange={event => saveField({ quotationId: event.target.value || null })}>
                      <option value="">No quotation</option>
                      {record.quotationId && !quotationOptions.some(option => option.id === record.quotationId) ? <option value={record.quotationId}>Current quotation</option> : null}
                      {quotationOptions.map(option => <option key={option.id} value={option.id}>{option.quoteNumber}</option>)}
                    </select>
                  ) : key === "value" ? (
                    <DraftValue value={record.value ?? ""} display={record.value ?? "—"} type="number" title="Click to edit value" onSave={next => saveField({ value: next || null })} />
                  ) : key === "startDate" ? (
                    <DraftValue
                      value={record.startDate ?? ""}
                      display={formatDate(record.startDate)}
                      formatDraft={(v) => (v ? formatDate(v) : "—")}
                      type="date"
                      title="Click to edit start date"
                      onSave={(next) => saveField({ startDate: next || null })}
                    />
                  ) : (
                    <DraftValue
                      value={record.name}
                      display={record.name}
                      title="Click to edit name"
                      onSave={(next) => {
                        return saveField({ name: next })
                      }}
                    />
                  )}
                </FieldRow>
              )
            })}
          </CardContent>
        </Card>

        <RelatedCard
          items={[
            { kind: "milestone", label: "Milestones", count: milestones.length, onSelect: () => setTab("milestones") },
            ...(salesOrdersEnabled
              ? [{ kind: "salesOrder" as const, label: "Sales orders", count: salesOrders.length, onSelect: () => setTab("orders") }]
              : []),
            { kind: "document", label: "Documents", count: documents.length, onSelect: () => setTab("documents") },
          ]}
        />

        {notes || canManage ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {canManage && editor.editing ? (
                <DraftValue
                  value={notes ?? ""}
                  multiline
                  display={
                    <span className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {notes || "Add notes"}
                    </span>
                  }
                  title="Click to edit notes"
                  onSave={(next) => saveField({ notes: next || null })}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {notes}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DetailAside>

      {/* Right column — tabbed related lists */}
      <DetailTabs value={tab} onValueChange={setTab}>
        <TabsList>
          <CountTab value="milestones" count={milestones.length}>
            Milestones
          </CountTab>
          {salesOrdersEnabled ? (
            <CountTab value="orders" count={salesOrders.length}>
              Sales orders
            </CountTab>
          ) : null}
          {billing ? (
            <CountTab value="billing" count={billing.docs.length}>
              Billing
            </CountTab>
          ) : null}
          <CountTab value="activity">Activity</CountTab>
          <CountTab value="documents" count={documents.length}>
            Documents
          </CountTab>
        </TabsList>

        <TabsContent value="milestones" className="mt-4">
          <MilestonesPanel
            projectId={projectId}
            milestones={milestones}
            projectValue={projectValue}
            currency={currency}
            canManage={canManage}
          />
        </TabsContent>

        {salesOrdersEnabled ? (
          <TabsContent value="orders" className="mt-4">
            <ProjectSalesOrders
              projectId={projectId}
              orders={salesOrders}
              canSubmit={canSubmit}
              canApprove={canApprove}
            />
          </TabsContent>
        ) : null}

        {billing ? (
          <TabsContent value="billing" className="mt-4">
            <BillingPanel
              summary={billing}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline
            entityType="project"
            entityId={projectId}
            items={activity}
            revalidate={revalidate}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsSection
            uploadType="project"
            uploadId={projectId}
            documents={documents}
            revalidate={revalidate}
          />
        </TabsContent>
      </DetailTabs>
    </fieldset>
  )
}

/** Controlled scalar input: all edits belong to the record's Save/Cancel draft. */
function DraftValue({ value, type = "text", multiline, title, onSave }: React.ComponentProps<typeof InlineValue>) {
  const props = { value, "aria-label": title?.replace(/^Click to (edit|change) /, ""), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { void onSave(event.target.value) } }
  return multiline ? <Textarea {...props} rows={3} /> : <Input {...props} type={type} step={type === "number" ? "0.01" : undefined} />
}
