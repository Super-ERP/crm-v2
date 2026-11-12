"use client"

import * as React from "react"
import { formatOpportunityEstimatedTotals } from "@/lib/opportunity-currency"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AccountDraftPhone } from "./account-draft-phone"
import { useUnsavedChanges } from "@/components/use-unsaved-changes"
import type { AccountRow } from "../actions"
import { Plus } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useInlineSave } from "@/components/use-inline-save"
import { PhoneNumberDisplay } from "@/components/phone-input"
import { InlineValue } from "@/components/inline-value"
import { InlineCombobox } from "@/components/inline-combobox"
import type { MemberOption, Option, CountryOption } from "@/lib/lookups"
import { StageBadge } from "@/app/(app)/funnel/stage-badge"
import { AccountContacts } from "./account-contacts"
import {
  updateAccount,
  type AccountFunnelItem,
  type AccountInput,
  type AccountOpportunityItem,
  type AccountProjectItem,
  type AccountQuotationItem,
  type BillingAddress,
  type PersonRow,
} from "../actions"

// Status pills render via the app-wide <StatusBadge> tone map.

export type AccountChild = {
  id: string
  name: string
  accountType: string | null
}

/** Structured billing-address subfields, each its own inline editor. */
export type AccountAddressKey = keyof BillingAddress

/** Raw scalar fields the page marks inline-editable (Salesforce-style). */
export type AccountEditKey =
  | "name"
  | "code"
  | "endUserAccountId"
  | "accountType"
  | "owner"
  | "industry"
  | "parent"
  | "phone"
  | "website"
  | "registrationNumber"
  | "currency"
  | `address.${AccountAddressKey}`

export type AccountDetailSection = {
  title: string
  fields: { label: string; value: React.ReactNode; editKey?: AccountEditKey }[]
}

export type AccountDetailData = {
  projectCodes?: React.ReactNode
  projectCodeCount?: number
  accountId: string
  editAccount: AccountRow
  countrySettings: CountryOption[]
  sections: AccountDetailSection[]
  /** Raw values used to initialize the account draft for an explicit save. */
  record: AccountInput
  /** Gates every inline editor (ACCOUNT_UPDATE, resolved server-side). */
  canEdit: boolean
  industries: string[]
  parentOptions: Option[]
  currencies: string[]
  /** Country picklist for the inline billing-address country combobox. */
  countries: string[]
  /** Tenant members, for the inline account-owner picker. */
  members: MemberOption[]
  contacts: PersonRow[]
  opportunities: AccountOpportunityItem[]
  pipelines: AccountFunnelItem[]
  projects: AccountProjectItem[]
  projectsEnabled: boolean
  quotations: AccountQuotationItem[]
  childAccounts: AccountChild[]
  activity: React.ComponentProps<typeof ActivityTimeline>["items"]
  documents: React.ComponentProps<typeof DocumentsSection>["documents"]
  /** "New funnel" toolbar button (OPPORTUNITY_CREATE, resolved server-side). */
  newFunnelButton?: React.ReactNode
  /** QUOTATION_CREATE, resolved server-side — gates the empty-state CTA. */
  canCreateQuotation: boolean
  /** projects module + PROJECT_CREATE, resolved server-side. */
  canCreateProject: boolean
}

/** Salesforce-style account detail: highlights + related quick-links on the
 *  left, a tabbed panel of related lists (top 5 + search) on the right. */
export function AccountDetailBody(props: AccountDetailData) {
  const {
    accountId,
    projectCodes,projectCodeCount,
    sections,
    record: savedRecord,
    canEdit,
    industries,
    parentOptions,
    currencies,
    countries,
    members,
    contacts,
    opportunities,
    pipelines,
    projects,
    projectsEnabled,
    quotations,
    childAccounts,
    activity,
    documents,
    newFunnelButton,
    canCreateQuotation,
    canCreateProject,
  } = props

  // Quotations and projects are raised on a funnel, so their empty-state CTAs
  // deep-link the account's first funnel as the prefill.
  const firstFunnelId = pipelines[0]?.funnelId

  const [tab, setTab] = React.useState("details")
  const searchParams = useSearchParams()
  const [editingDetails, setEditingDetails] = React.useState(canEdit && searchParams.get("edit") === "1")
  const [record, setRecord] = React.useState(savedRecord)
  const draftRef = React.useRef(savedRecord)
  const [editSession, setEditSession] = React.useState(0)
  const [detailsDirty, setDetailsDirty] = React.useState(false)
  const [detailsBusy, setDetailsBusy] = React.useState(false)
  const confirmDiscard = useUnsavedChanges(detailsDirty, detailsBusy)
  const router = useRouter()
  const editButton = React.useRef<HTMLButtonElement>(null)
  const closeEditor = () => {
    setEditingDetails(false)
    setRecord(savedRecord)
    draftRef.current = savedRecord
    setEditSession(value => value + 1)
    setDetailsDirty(false)
    setDetailsBusy(false)
    if (searchParams.get("edit") === "1") router.replace(`/accounts/${accountId}`, { scroll: false })
    requestAnimationFrame(() => editButton.current?.focus())
  }
  const changeTab = (next: string) => {
    if (next === tab || !confirmDiscard()) return
    closeEditor()
    setTab(next)
  }
  const revalidate = `/accounts/${accountId}`


  const { save } = useInlineSave((draft: AccountInput) => updateAccount(accountId, draft))
  const beginEditor = () => {
    setRecord(savedRecord)
    draftRef.current = savedRecord
    setTab("details")
    setEditingDetails(true)
  }
  const saveField = async (patch: Partial<AccountInput>): Promise<void> => {
    const next = { ...draftRef.current, ...patch }
    draftRef.current = next
    setRecord(next)
    setDetailsDirty(true)
  }
  const saveDetails = async () => {
    // Flush a text editor still focused when Save is activated.
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) active.blur()
    setDetailsBusy(true)
    const success = await save(draftRef.current)
    setDetailsBusy(false)
    if (success) {
      closeEditor()
      router.refresh()
    }
  }

  const typeEditor = () => <InlineCombobox
    value={record.accountType === "reseller" ? "reseller" : "client"}
    display={<Badge variant="outline">{record.accountType === "reseller" ? "Reseller" : "Client"}</Badge>}
    options={[{ value: "client", label: "Client" }, { value: "reseller", label: "Reseller" }]}
    onSave={(next) => saveField({ accountType: next, ...(next === "client" ? { endUserAccountId: null } : {}) })}
    title="Click to change account type"
  />

  const industryOptions = React.useMemo(
    () => industries.map((i) => ({ value: i, label: i })),
    [industries]
  )
  const currencyOptions = React.useMemo(
    () => currencies.map((currency) => ({ value: currency, label: currency })),
    [currencies]
  )
  const countryOptions = React.useMemo(
    () => countries.map((c) => ({ value: c, label: c })),
    [countries]
  )
  const memberOptions = React.useMemo(
    () => members.map((m) => ({ value: m.memberId, label: m.name })),
    [members]
  )
  const ownerName =
    memberOptions.find((o) => o.value === record.ownerMemberId)?.label ?? "—"
  const parentName =
    parentOptions.find((o) => o.id === record.parentAccountId)?.name ?? "—"

  /** Merge one edited billing-address subfield into the structured jsonb. */
  const saveAddress = (sub: AccountAddressKey, next: string) =>
    saveField({
      billingAddress: { ...draftRef.current.billingAddress, [sub]: next || null },
    })

  const opportunityColumns = React.useMemo<ColumnDef<AccountOpportunityItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Opportunity" />,
        cell: linkCell((r) => `/opportunities/${r.id}`, (r) => r.name),
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "funnelCount",
        header: "Funnels",
        cell: ({ row }) => (
          <Badge variant="secondary" className="tabular-nums">
            {row.original.funnelCount}
          </Badge>
        ),
      },
      {
        accessorKey: "totalEstimatedFunnelAmount",
        header: rightHeader("Value"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatOpportunityEstimatedTotals(row.original.estimatedTotalsByCurrency, row.original.currency)}
          </span>
        ),
      },
    ],
    []
  )

  const funnelColumns = React.useMemo<ColumnDef<AccountFunnelItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Funnel" />,
        cell: linkCell((r) => `/funnel/${r.funnelId}`, (r) => r.name),
      },
      {
        id: "stage",
        header: "Stage",
        cell: ({ row }) => (
          <StageBadge
            kind={row.original.stageKind}
            code={row.original.stageCode}
            name={row.original.stageName}
          />
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

  const projectColumns = React.useMemo<ColumnDef<AccountProjectItem>[]>(
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

  const quotationColumns = React.useMemo<ColumnDef<AccountQuotationItem>[]>(
    () => [
      {
        accessorKey: "quoteNumber",
        header: ({ column }) => <SortableHeader column={column} title="Quote" />,
        cell: linkCell((r) => `/quotations/${r.id}`, (r) => r.quoteNumber),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total",
        header: rightHeader("Total"),
        cell: moneyCell(
          (r) => r.total,
          (r) => r.currency
        ),
      },
    ],
    []
  )

  const childColumns = React.useMemo<ColumnDef<AccountChild>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: linkCell((r) => `/accounts/${r.id}`, (r) => r.name),
      },
      {
        accessorKey: "accountType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.accountType === "reseller" ? "Reseller" : "Client"}
          </Badge>
        ),
      },
    ],
    []
  )

  function renderField(d: AccountDetailSection["fields"][number]) {
    if (d.editKey === "endUserAccountId" && (editingDetails ? record : savedRecord).accountType !== "reseller") return null

    const key = canEdit && editingDetails ? d.editKey : undefined
    const addressSub =
      key && key.startsWith("address.")
        ? (key.slice("address.".length) as AccountAddressKey)
        : null
    // What's left after the industry/owner/address branches below.
    const scalarKey =
        key &&
        !addressSub &&
        key !== "endUserAccountId" &&
        key !== "accountType" &&
        key !== "industry" &&
        key !== "parent" &&
        key !== "owner" &&
        key !== "currency"
        ? (key as "name" | "code" | "phone" | "website" | "registrationNumber")
        : null
    return (
      <FieldRow key={`${editSession}-${d.label}`} label={d.label}>
        {!key ? (
          d.label === "Phone" ? <PhoneNumberDisplay value={savedRecord.phone} /> : d.value
        ) : key === "accountType" ? typeEditor() : key === "endUserAccountId" ? (
          <InlineCombobox value={record.endUserAccountId ?? ""}
            display={parentOptions.find(option => option.id === record.endUserAccountId)?.name ?? "—"}
            options={[{ value: "", label: "No default end user" }, ...parentOptions.map(option => ({ value: option.id, label: option.name }))]}
            onSave={next => saveField({ endUserAccountId: next || null })}
            title="Click to change default end user" />
        ) : addressSub ? (
          addressSub === "country" ? (
            <InlineCombobox
              value={record.billingAddress?.country ?? ""}
              display={record.billingAddress?.country || "—"}
              options={countryOptions}
              onSave={(next) => saveAddress("country", next)}
              searchPlaceholder="Search countries…"
              emptyMessage="No countries configured."
              title="Click to change country"
            />
          ) : (
            <InlineValue
              value={record.billingAddress?.[addressSub] ?? ""}
              display={record.billingAddress?.[addressSub] || "—"}
              title={`Click to edit ${d.label.toLowerCase()}`}
              onSave={(next) => saveAddress(addressSub, next)}
            />
          )
        ) : key === "industry" ? (
          <InlineCombobox
            value={record.industry ?? ""}
            display={record.industry || "—"}
            options={industryOptions}
            onSave={(next) => saveField({ industry: next || null })}
            searchPlaceholder="Search industries…"
            emptyMessage="No industries configured."
            title="Click to change industry"
          />
        ) : key === "owner" ? (
          <InlineCombobox
            value={record.ownerMemberId ?? ""}
            display={ownerName}
            options={memberOptions}
            onSave={(next) =>
              next ? saveField({ ownerMemberId: next }) : undefined
            }
            searchPlaceholder="Search members…"
            emptyMessage="No members found."
            title="Click to change owner"
          />
        ) : key === "parent" ? (
          <InlineCombobox
            value={record.parentAccountId ?? ""}
            display={parentName}
            options={[{ value: "", label: "No parent account" }, ...parentOptions.map((option) => ({
              value: option.id,
              label: option.name,
            }))]}
            onSave={(next) =>
              saveField({ parentAccountId: next || null })
            }
            placeholder="No parent account"
            searchPlaceholder="Search parent accounts…"
            emptyMessage="No parent accounts found."
            title="Click to change parent account"
          />
        ) : key === "currency" ? (
          <InlineCombobox
            value={record.currency}
            display={record.currency}
            options={currencyOptions}
            onSave={(next) => saveField({ currency: next })}
            searchPlaceholder="Search currencies…"
            emptyMessage="No currencies configured."
            title="Click to change currency"
          />
        ) : scalarKey === "phone" ? (
          <AccountDraftPhone
            value={record.phone}
            defaultCountry={record.billingAddress?.country}
            onChange={(next) => { void saveField({ phone: next || null }) }}
          />
        ) : scalarKey ? (
          <InlineValue
            value={record[scalarKey] ?? ""}
            display={record[scalarKey] || "—"}
            title={`Click to edit ${d.label.toLowerCase()}`}
            onSave={(next) => {
              // Keep required-field validation at the final server save.
              if (scalarKey === "name") {
                return saveField({ name: next })
              }
              return saveField({ [scalarKey]: next || null })
            }}
          />
        ) : (
          d.value
        )}
      </FieldRow>
    )
  }

  return (
    <fieldset aria-label="Account details" disabled={detailsBusy} className="grid min-w-0 gap-4 lg:grid-cols-3 lg:items-start" onFocusCapture={() => { if (editingDetails) setDetailsDirty(true) }}>
      {/* Left column — account highlights + related quick links */}
      <DetailAside>
        <Card>
          <DetailCardHeader kind="account" eyebrow="Account" />
          <CardContent className="grid gap-5 text-sm">
            {sections.map((section) => (
              <FieldSection key={section.title} title={section.title}>
                {section.fields.map(renderField)}
              </FieldSection>
            ))}
          </CardContent>
        </Card>

        <RelatedCard
          items={[
            { kind: "contact", label: "Contacts", count: contacts.length, onSelect: () => changeTab("contacts") },
            { kind: "opportunity", label: "Opportunities", count: opportunities.length, onSelect: () => changeTab("opportunities") },
            { kind: "funnel", label: "Funnels", count: pipelines.length, onSelect: () => changeTab("pipelines") },
            ...(projectsEnabled
              ? [{ kind: "project" as const, label: "Projects", count: projects.length, onSelect: () => changeTab("projects") }]
              : []),
            { kind: "quotation", label: "Quotations", count: quotations.length, onSelect: () => changeTab("quotations") },
            { kind: "account", label: "Child accounts", count: childAccounts.length, onSelect: () => changeTab("children") },
          ]}
        />
      </DetailAside>

      {/* Right column — tabbed related lists */}
      <DetailTabs value={tab} onValueChange={changeTab}>
        <TabsList>
          <CountTab value="details">Details</CountTab>
          <CountTab value="contacts" count={contacts.length}>
            Contacts
          </CountTab>
          <CountTab value="opportunities" count={opportunities.length}>
            Opportunities
          </CountTab>
          <CountTab value="pipelines" count={pipelines.length}>
            Funnels
          </CountTab>
          {projectsEnabled ? (
            <CountTab value="projects" count={projects.length}>
              Projects
            </CountTab>
          ) : null}
          <CountTab value="quotations" count={quotations.length}>
            Quotations
          </CountTab>
          <CountTab value="children" count={childAccounts.length}>
            Child accounts
          </CountTab>
          {projectCodes ? <CountTab value="project-codes" count={projectCodeCount}>Project codes</CountTab> : null}
          <CountTab value="activity">Activity</CountTab>
          <CountTab value="documents" count={documents.length}>
            Documents
          </CountTab>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Account details</h2>
            {!editingDetails && canEdit ? <Button ref={editButton} variant="outline" size="sm" onClick={beginEditor}>Edit</Button> : null}
            {editingDetails ? <div className="flex flex-wrap items-center gap-2">
              <span role="status" className="text-sm text-muted-foreground">{detailsBusy ? "Saving changes…" : "Editing account"}</span>
              <Button variant="outline" size="sm" disabled={detailsBusy} onClick={() => { if (confirmDiscard()) closeEditor() }}>Cancel</Button>
              <Button size="sm" disabled={detailsBusy} onClick={saveDetails}>Save changes</Button>
            </div> : null}
          </div>
          {editingDetails ? <p className="mb-4 text-sm text-muted-foreground">Click a field to edit. Changes are saved together. Changing the owner also transfers related contacts and sales records.</p> : null}
          <div className="grid gap-6 sm:grid-cols-2">
            {sections.map(section => <FieldSection key={section.title} title={section.title}>
              {section.fields.map(renderField)}
            </FieldSection>)}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <AccountContacts accountId={accountId} contacts={contacts} />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <DataTable
            columns={opportunityColumns}
            data={opportunities}
            tableId="account-opportunities"
            searchColumn="name"
            searchPlaceholder="Search opportunities…"
            emptyMessage="No opportunities for this account yet."
            emptyDescription="An opportunity is created automatically when you add a funnel or convert a lead."
            pageSize={5}
          />
        </TabsContent>

        <TabsContent value="pipelines" className="mt-4">
          <DataTable
            columns={funnelColumns}
            data={pipelines}
            tableId="account-pipelines"
            searchColumn="name"
            searchPlaceholder="Search pipelines…"
            emptyMessage="No pipelines for this account yet."
            pageSize={5}
            toolbar={newFunnelButton}
          />
        </TabsContent>

        {projectsEnabled ? <TabsContent value="projects" className="mt-4">
          <DataTable
            columns={projectColumns}
            data={projects}
            tableId="account-projects"
            searchColumn="name"
            searchPlaceholder="Search projects…"
            emptyMessage="No projects for this account yet."
            emptyDescription={
              firstFunnelId
                ? "Projects are created from a funnel."
                : "Projects are created from a funnel — create a funnel for this account first."
            }
            emptyAction={
              canCreateProject && firstFunnelId ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/projects?new=1&funnelId=${firstFunnelId}&accountId=${accountId}`}
                    />
                  }
                >
                  <Plus className="size-4" />
                  New project
                </Button>
              ) : undefined
            }
            pageSize={5}
          />
        </TabsContent> : null}

        <TabsContent value="quotations" className="mt-4">
          <DataTable
            columns={quotationColumns}
            data={quotations}
            tableId="account-quotations"
            searchColumn="quoteNumber"
            searchPlaceholder="Search quotations…"
            emptyMessage="No quotations for this account yet."
            emptyDescription={
              firstFunnelId
                ? "Quotations are raised on a funnel."
                : "Quotations are raised on a funnel — create a funnel for this account first."
            }
            emptyAction={
              canCreateQuotation && firstFunnelId ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link href={`/quotations/new?funnelId=${firstFunnelId}`} />
                  }
                >
                  <Plus className="size-4" />
                  New quotation
                </Button>
              ) : undefined
            }
            pageSize={5}
          />
        </TabsContent>

        <TabsContent value="children" className="mt-4">
          <DataTable
            columns={childColumns}
            data={childAccounts}
            tableId="account-children"
            searchColumn="name"
            searchPlaceholder="Search child accounts…"
            emptyMessage="No child accounts."
            pageSize={5}
          />
        </TabsContent>

        {projectCodes ? <TabsContent value="project-codes" className="mt-4">{projectCodes}</TabsContent> : null}

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline
            entityType="account"
            entityId={accountId}
            items={activity}
            revalidate={revalidate}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsSection
            uploadType="account"
            uploadId={accountId}
            documents={documents}
            revalidate={revalidate}
          />
        </TabsContent>
      </DetailTabs>
    </fieldset>
  )
}
