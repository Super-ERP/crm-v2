"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { FieldRow } from "@/components/detail-page"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { OpportunityContainerDetail, OpportunityContainerUpdateInput } from "@/app/(app)/opportunities/actions"

type Opportunity = OpportunityContainerDetail["opportunity"]

function AnalysisSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <section className="grid gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 text-left text-sm font-semibold"
      >
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !open && "-rotate-90"
          )}
        />
        {title}
      </button>
      {open ? (
        <div className="grid gap-3">{children}</div>
      ) : null}
    </section>
  )
}

function AnalysisRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <FieldRow inline label={label}>
      {children}
    </FieldRow>
  )
}

export function OpportunityAnalysis({
  opportunity,
  contact,
  contactOptions,
  canEdit,
  onSave,
}: {
  opportunity: Opportunity
  contact?: OpportunityContainerDetail["powerSponsorContact"]
  contactOptions: { value: string; label: string }[]
  canEdit: boolean
  onSave: (patch: OpportunityContainerUpdateInput) => Promise<void>
}) {
  const o = opportunity
  const contactDisplay = contact ? (
    <span className="link">{contact.name}</span>
  ) : (
    "—"
  )

  return (
    <div className="grid gap-5">
      <AnalysisSection title="1-P: Power Sponsor (PS)">
        <AnalysisRow label="Power Sponsor Contact">
          {canEdit ? (
            <Combobox
              value={o.powerSponsorContactId ?? ""}
              options={contactOptions}
              onChange={(next) => onSave({ powerSponsorContactId: next || null })}
              placeholder="Optional"
              searchPlaceholder="Search contacts…"
              emptyMessage="No contacts for this account."
              aria-label="Power sponsor contact"
            />
          ) : (
            contactDisplay
          )}
        </AnalysisRow>
        <AnalysisRow label="Power Sponsor Designation">
          {contact?.designation || "—"}
        </AnalysisRow>
        <AnalysisRow label="Power Sponsor Budget Limit">
          {canEdit ? (
            <Input aria-label="power sponsor budget limit" type="number" value={o.powerSponsorBudgetLimit ?? ""} onChange={event => void onSave({ powerSponsorBudgetLimit: event.target.value || null })} />
          ) : (
            formatMoney(o.powerSponsorBudgetLimit, o.currency)
          )}
        </AnalysisRow>
      </AnalysisSection>

      <AnalysisSection title="2-P: Pain (Objective)">
        <AnalysisRow label="Objective">
          {canEdit ? (
            <Input aria-label="objective" type="text" value={o.pain ?? ""} onChange={event => void onSave({ pain: event.target.value || null })} />
          ) : (
            o.pain || "—"
          )}
        </AnalysisRow>
      </AnalysisSection>

      <AnalysisSection title="3-V: Vision">
        <AnalysisRow label="Vision">
          {canEdit ? (
            <Input aria-label="vision" type="text" value={o.vision ?? ""} onChange={event => void onSave({ vision: event.target.value || null })} />
          ) : (
            o.vision || "—"
          )}
        </AnalysisRow>
      </AnalysisSection>

      <AnalysisSection title="4-V: Value">
        <AnalysisRow label="Value">
          {canEdit ? (
            <Input aria-label="value" type="text" value={o.value ?? ""} onChange={event => void onSave({ value: event.target.value || null })} />
          ) : (
            o.value || "—"
          )}
        </AnalysisRow>
      </AnalysisSection>

      <AnalysisSection title="5-C: Control">
        <AnalysisRow label="Estimated Budget">
          {canEdit ? (
            <Input aria-label="estimated budget" type="number" value={o.estimatedBudget ?? ""} onChange={event => void onSave({ estimatedBudget: event.target.value || null })} />
          ) : (
            formatMoney(o.estimatedBudget, o.currency)
          )}
        </AnalysisRow>
        <AnalysisRow label="Estimated Close Date">
          {canEdit ? (
            <Input aria-label="estimated close date" type="date" value={o.estimatedCloseDate ?? ""} onChange={event => void onSave({ estimatedCloseDate: event.target.value || null })} />
          ) : (
            formatDate(o.estimatedCloseDate)
          )}
        </AnalysisRow>
      </AnalysisSection>
    </div>
  )
}
