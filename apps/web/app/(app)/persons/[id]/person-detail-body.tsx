"use client"

import * as React from "react"
import { useRecordEditor } from "@/components/use-record-editor"
import { RecordHeaderActions } from "@/components/record-header-actions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RecordPhoneField } from "@/components/record-phone-field"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/status-badge"
import { TabsContent, TabsList } from "@/components/ui/tabs"
import {
  DataTable,
  SortableHeader,
  linkCell,
  moneyCell,
  rightHeader,
} from "@/components/data-table"
import { ActivityTimeline } from "@/components/activity/activity-timeline"
import { DocumentsSection } from "@/components/documents-section"
import {
  CountTab,
  DetailAside,
  DetailCardHeader,
  DetailTabs,
  FieldRow,
  FieldSection,
  RelatedCard,
} from "@/components/detail-page"
import { PhoneNumberDisplay } from "@/components/phone-input"
import type { InlineValue } from "@/components/inline-value"
import { InlineCombobox } from "@/components/inline-combobox"
import { StageBadge } from "@/app/(app)/funnel/stage-badge"
import {
  updatePerson,
  type PersonInput,
  type PersonOpportunity,
  type PersonProject,
} from "../actions"

// Status pills render via the app-wide <StatusBadge> tone map.

/** Raw scalar fields the page marks inline-editable (Salesforce-style). */
export type PersonEditKey =
  | "firstName"
  | "lastName"
  | "title"
  | "department"
  | "email"
  | "phone"
  | "accountId"
  | "isPrimary"

export type PersonDetailSection = {
  title: string
  fields: { label: string; value: React.ReactNode; editKey?: PersonEditKey }[]
}

export type PersonDetailData = {
  projectCodes?: React.ReactNode
  projectCodeCount?: number
  personId: string
  sections: PersonDetailSection[]
  /** Raw field values — updatePerson is full-replace, so each inline save
   *  merges the one edited field into this snapshot. */
  record: PersonInput
  /** Gates every inline editor (PERSON_UPDATE, resolved server-side). */
  canEdit: boolean
  /** Account picker options for the linked-account inline combobox. */
  accounts: { id: string; name: string }[]
  funnels: PersonOpportunity[]
  projects: PersonProject[]
  activity: React.ComponentProps<typeof ActivityTimeline>["items"]
  documents: React.ComponentProps<typeof DocumentsSection>["documents"]
}

/** Contact detail: a highlights + related-links panel on the left; tabbed
 *  Funnels / Projects / Activity / Documents on the right (each top-5 + search). */
export function PersonDetailBody({
  personId,
  projectCodes,projectCodeCount,
  sections,
  record: initialRecord,
  canEdit,
  accounts,
  funnels,
  projects,
  activity,
  documents,
}: PersonDetailData) {
  const [tab, setTab] = React.useState("pipelines")
  const revalidate = `/persons/${personId}`


  const editor = useRecordEditor<PersonInput>({ initial: initialRecord, onSave: draft => updatePerson(personId, draft) })
  const record = editor.record
  const saveField = editor.stage

  const accountOptions = React.useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  )

  // Contacts don't own funnels/projects — those live on the linked account, so
  // the empty states point there.
  const accountLink = record.accountId ? (
    <Link href={`/accounts/${record.accountId}`} className="link text-sm">
      Go to account
    </Link>
  ) : undefined

  const funnelColumns = React.useMemo<ColumnDef<PersonOpportunity>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Funnel" />,
        cell: linkCell((r) => `/funnel/${r.id}`, (r) => r.name),
      },
      {
        id: "stage",
        header: "Stage",
        cell: ({ row }) =>
          row.original.stageName ? (
            <StageBadge
              kind={row.original.stageKind}
              name={row.original.stageName}
              probability={row.original.stageProbability}
            />
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "amount",
        header: rightHeader("Value"),
        cell: moneyCell(
          (r) => r.amount,
          (r) => r.currency
        ),
      },
    ],
    []
  )

  const projectColumns = React.useMemo<ColumnDef<PersonProject>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: linkCell((r) => `/projects/${r.id}`, (r) => r.name),
      },
      {
        accessorKey: "projectCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.projectCode}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  )

  return (
    <fieldset key={editor.session} disabled={editor.saving} className="grid min-w-0 gap-4 lg:grid-cols-3 lg:items-start" onInputCapture={editor.markDirty}>
      {/* Left column — contact highlights + related quick links */}
      <DetailAside>
        <Card>
          <DetailCardHeader kind="contact" eyebrow="Contact" actions={<RecordHeaderActions canEdit={canEdit} editing={editor.editing} saving={editor.saving} onEdit={editor.start} onSave={editor.save} onCancel={editor.cancel} voidTarget={canEdit ? { type: "person", id: personId } : undefined} />} />
          {editor.error ? <p role="alert" className="px-6 text-sm text-destructive">{editor.error}</p> : null}
          <CardContent className="grid gap-5 text-sm">
            {sections.map((section) => (
              <FieldSection key={section.title} title={section.title}>
                {section.fields.map((d) => {
                  const key = canEdit && editor.editing ? d.editKey : undefined
                  return (
                    <FieldRow key={d.label} label={d.label}>
                      {!key ? (
                        d.label === "Phone" ? <PhoneNumberDisplay value={record.phone} /> : d.value
                      ) : key === "isPrimary" ? (
                        <Switch
                          checked={record.isPrimary ?? false}
                          onCheckedChange={(v) => saveField({ isPrimary: v })}
                          aria-label="Primary contact"
                        />
                      ) : key === "accountId" ? (
                        <InlineCombobox
                          value={record.accountId}
                          display={
                            accountOptions.find((o) => o.value === record.accountId)
                              ?.label ?? "—"
                          }
                          options={accountOptions}
                          onSave={(next) => saveField({ accountId: next })}
                          searchPlaceholder="Search accounts…"
                          emptyMessage="No accounts found."
                          title="Click to change account"
                        />
                      ) : key === "phone" ? (
                        <RecordPhoneField
                          value={record.phone}
                          onChange={(next) => saveField({ phone: next || null })}
                        />
                      ) : (
                        <DraftValue
                          value={record[key] ?? ""}
                          display={record[key] || "—"}
                          title={`Click to edit ${d.label.toLowerCase()}`}
                          onSave={(next) => {
                            // Keep invalid drafts so Save can surface server validation.
                            if (key === "firstName") {
                              return saveField({ firstName: next })
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
            { kind: "funnel", label: "Funnels", count: funnels.length, onSelect: () => setTab("pipelines") },
            { kind: "project", label: "Projects", count: projects.length, onSelect: () => setTab("projects") },
          ]}
        />
      </DetailAside>

      {/* Right column — tabbed related lists */}
      <DetailTabs value={tab} onValueChange={setTab}>
        <TabsList>
          <CountTab value="pipelines" count={funnels.length}>
            Funnels
          </CountTab>
          <CountTab value="projects" count={projects.length}>
            Projects
          </CountTab>
          {projectCodes ? <CountTab value="project-codes" count={projectCodeCount}>Project codes</CountTab> : null}
          <CountTab value="activity">Activity</CountTab>
          <CountTab value="documents" count={documents.length}>
            Documents
          </CountTab>
        </TabsList>

        <TabsContent value="pipelines" className="mt-4">
          <DataTable
            columns={funnelColumns}
            data={funnels}
            tableId="person-pipelines"
            searchColumn="name"
            searchPlaceholder="Search pipelines…"
            emptyMessage="No pipelines for this contact yet."
            emptyDescription="Funnels are created on the contact's account."
            emptyAction={accountLink}
            pageSize={5}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <DataTable
            columns={projectColumns}
            data={projects}
            tableId="person-projects"
            searchColumn="name"
            searchPlaceholder="Search projects…"
            emptyMessage="No projects for this contact yet."
            emptyDescription="Projects are created from a funnel on the contact's account."
            emptyAction={accountLink}
            pageSize={5}
          />
        </TabsContent>

        {projectCodes ? <TabsContent value="project-codes" className="mt-4">{projectCodes}</TabsContent> : null}

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline
            entityType="person"
            entityId={personId}
            items={activity}
            revalidate={revalidate}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsSection
            uploadType="person"
            uploadId={personId}
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
