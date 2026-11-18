"use client"

import { LocationFields } from "@/components/location-fields"

import { useConversionDuplicateCheck } from "@/components/use-conversion-duplicate-check"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2Icon, TargetIcon, CheckCircle2Icon, TriangleAlertIcon, LoaderCircleIcon } from "lucide-react"
import { showActionError } from "@/lib/show-action-error"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { OBJECT_TILES } from "@/components/object-tile"
import type { Option, CountryOption } from "@/lib/lookups"
import { convertLeadAction, updateLead, type Lead, type LeadInput } from "../../actions"

const NEW_ACCOUNT = "__new__"

function matchingAccountId(companyName: string | null, accounts: Option[]): string {
  const normalizedCompany = companyName?.trim().toLocaleLowerCase()
  if (!normalizedCompany) return NEW_ACCOUNT

  return (
    accounts.find(
      (account) => account.name.trim().toLocaleLowerCase() === normalizedCompany
    )?.id ?? NEW_ACCOUNT
  )
}

/**
 * Full-page lead conversion (replaces the old cramped dialog). Converting is
 * always the full cascade — Account + Contact + Opportunity + Funnel — seeded
 * into the (only) sales pipeline at its first stage, so there is nothing to
 * pick about pipelines here.
 */
export function ConvertForm({
  lead,
  accountOptions,
  countries: _countries = [],
  projectNatures,
}: {
  lead: Lead
  accountOptions: Option[]
  countries?: CountryOption[]
  projectNatures: { code: string; name: string }[]
}) {
  const router = useRouter()
  const defaultDealName = `${lead.companyName || lead.name} opportunity`
  const [opportunityName, setOpportunityName] = React.useState(defaultDealName)
  // Mirrors the Opportunity name until the user deliberately diverges it.
  const [funnelName, setFunnelName] = React.useState(defaultDealName)
  const [funnelNameTouched, setFunnelNameTouched] = React.useState(false)
  const [expectedCloseDate, setExpectedCloseDate] = React.useState("")
  const [accountId, setAccountId] = React.useState<string>(() =>
    matchingAccountId(lead.companyName, accountOptions)
  )
  const [newType, setNewType] = React.useState<"client" | "reseller">("client")
  const [registrationNumber, setRegistrationNumber] = React.useState("")
  const [projectNatureCode, setProjectNatureCode] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [addr, setAddr] = React.useState({
    line1: "",
    locationCityId: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [emailValue, setEmailValue] = React.useState(lead.email ?? "")
  const [emailSaving, setEmailSaving] = React.useState(false)
  const [emailError, setEmailError] = React.useState("")
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const creatingNew = accountId === NEW_ACCOUNT
  const duplicate = useConversionDuplicateCheck(lead.id, registrationNumber, undefined, creatingNew && !!registrationNumber.trim())
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())
  const missingEmail = !validEmail
  const selectedAccountName = creatingNew
    ? lead.companyName || lead.name
    : accountOptions.find((account) => account.id === accountId)?.name ?? "Selected account"

  function onOpportunityNameChange(next: string) {
    setOpportunityName(next)
    if (!funnelNameTouched) setFunnelName(next)
  }

  // Names every unmet requirement so the disabled Convert button is never a
  // silent dead end — the list renders next to it.
  const missing = [
    missingEmail ? "a lead email" : null,
    !accountId ? "Account" : null,
    creatingNew && !registrationNumber.trim() ? "SSM registration number" : null,
    !projectNatureCode ? "Project Nature" : null,
    creatingNew && !addr.country.trim() ? "Country" : null,
    !opportunityName.trim() ? "Opportunity name" : null,
    !funnelName.trim() ? "Funnel name" : null,
  ].filter((m): m is string => m !== null)

  const blocked = submitting || missing.length > 0 || duplicate.blocked

  async function saveLeadEmail() {
    const email = emailValue.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.")
      return
    }

    setEmailSaving(true)
    setEmailError("")
    try {
      const input: LeadInput = {
        name: lead.name,
        companyName: lead.companyName,
        email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
      }
      const result = await updateLead(lead.id, input)
      if (!result.ok) {
        showActionError(result)
        return
      }
      setEmailValue(email)
      toast.success("Lead email updated")
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleConvert() {
    setSubmitting(true)
    try {
      const res = await convertLeadAction({
        leadId: lead.id,
        createOpportunity: true,
        opportunityName,
        funnelName,
        expectedCloseDate: expectedCloseDate || null,
        projectNatureCode,
        existingAccountId: creatingNew ? null : accountId,
        newAccount: creatingNew
          ? {
              accountType: newType,
              registrationNumber,
              phone: newPhone || null,
              address: {
                line1: addr.line1 || null,
                locationCityId: addr.locationCityId || null,
                city: addr.city || null,
                state: addr.state || null,
                postcode: addr.postcode || null,
                country: addr.country || null,
              },
            }
          : null,
      })
      if (!res.ok) {
        showActionError(res)
        return
      }
      if (res.data.pending) {
        toast.success("Conversion submitted for Sales Admin review")
        router.push(`/leads/${lead.id}`)
        router.refresh()
        return
      }
      toast.success("Lead converted", {
        description: creatingNew
          ? "Company account, contact, opportunity and funnel created."
          : "Contact, opportunity and funnel added to the existing account.",
      })
      if (res.data.opportunityId) {
        router.push(`/opportunities/${res.data.opportunityId}`)
      } else {
        router.push(`/leads/${lead.id}`)
      }
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      {missingEmail ? (
        <div className="grid gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <div className="grid gap-1">
            <p className="font-medium text-destructive">Add a contact email to continue</p>
            <p className="text-muted-foreground">
              The converted contact uses this email. Save it here and continue without leaving conversion.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label required htmlFor="convert-lead-email">Lead email</Label>
              <Input
                required id="convert-lead-email"
                type="email"
                autoComplete="email"
                value={emailValue}
                onChange={(event) => {
                  setEmailValue(event.target.value)
                  setEmailError("")
                }}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "convert-lead-email-error" : undefined}
              />
              {emailError ? (
                <p id="convert-lead-email-error" className="text-xs text-destructive" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>
            <Button type="button" variant="outline" onClick={saveLeadEmail} disabled={emailSaving}>
              {emailSaving ? "Saving…" : "Save email"}
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-md text-white ${OBJECT_TILES.account.color}`}>
            <Building2Icon className="size-4" />
          </div>
          <div className="grid gap-0.5">
            <CardTitle className="text-base"><h2>Account</h2></CardTitle>
            <CardDescription>Contact: {lead.name}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label required htmlFor="convert-account">Account</Label>
            <Combobox
              aria-required="true" id="convert-account"
              value={accountId}
              onChange={(v) => setAccountId(v || "")}
              options={[
                { value: NEW_ACCOUNT, label: `New account — ${lead.companyName || lead.name}` },
                ...accountOptions.map((a) => ({ value: a.id, label: a.name })),
              ]}
              placeholder="Choose an account"
              searchPlaceholder="Search accounts…"
              emptyMessage="No accounts found."
            />

          </div>

          {creatingNew ? (
            <div className="grid gap-4 border-t pt-4">
              <h3 className="text-sm font-medium">Account Details</h3>
              <div className="grid items-start gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="new-acct-type">Type</Label>
                  <Combobox
                    id="new-acct-type"
                    value={newType}
                    onChange={(v) => setNewType(v === "reseller" ? "reseller" : "client")}
                    options={[
                      { value: "client", label: "Client (end user)" },
                      { value: "reseller", label: "Reseller (channel)" },
                    ]}
                    placeholder="Client (end user)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label required htmlFor="new-acct-ssm">SSM registration number</Label>
                  <Input required id="new-acct-ssm" aria-invalid={!!duplicate.registrationDuplicate} aria-describedby={registrationNumber.trim() ? "new-acct-ssm-status" : undefined} value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} maxLength={120} />

                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-acct-phone">Office phone</Label>
                  <Input
                    id="new-acct-phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="03-2782 2100"
                  />
                </div>
              </div>

              {registrationNumber.trim() ? <div id="new-acct-ssm-status" role="status" className="flex flex-wrap items-center gap-2 text-xs">
                {duplicate.checking ? <span className="inline-flex items-center gap-1 text-muted-foreground"><LoaderCircleIcon className="size-3 animate-spin" aria-hidden="true"/>Checking existing accounts…</span> : duplicate.error ? <span className="text-destructive">Could not check. Edit the SSM number to retry.</span> : <>
                  <Badge variant="outline" className={duplicate.registrationDuplicate ? "text-destructive" : "text-muted-foreground"}>{duplicate.registrationDuplicate ? <TriangleAlertIcon aria-hidden="true"/> : <CheckCircle2Icon aria-hidden="true"/>}{duplicate.registrationDuplicate ? "SSM already exists — select the existing account" : "No SSM match in CRM"}</Badge>
                  <Badge variant="outline" className={duplicate.similarName ? "text-warning" : "text-muted-foreground"}>{duplicate.similarName ? <TriangleAlertIcon aria-hidden="true"/> : <CheckCircle2Icon aria-hidden="true"/>}{duplicate.similarName ? "Similar company name found" : "No similar company name"}</Badge>
                  {duplicate.registrationDuplicate || duplicate.similarName ? <Link className="link" href="/accounts" target="_blank" rel="noreferrer">Review accounts ↗</Link> : null}
                </>}
              </div> : null}
              <h3 className="text-sm font-medium">Address</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-acct-line1">Street address</Label>
                  <Input
                    id="new-acct-line1"
                    value={addr.line1}
                    onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))}
                    placeholder="Level 10, Menara ABC, Jalan Sultan Ismail"
                  />
                </div>
                <LocationFields idPrefix="new-acct" countryRequired value={addr} onChange={next=>setAddr(a=>({...a,country:next.country ?? "",state:next.state ?? "",city:next.city ?? "",locationCityId:next.locationCityId ?? ""}))}>
                  <div className="grid gap-2"><Label htmlFor="new-acct-postcode">Postcode</Label><Input id="new-acct-postcode" value={addr.postcode} onChange={e=>setAddr(a=>({...a,postcode:e.target.value}))}/></div>
                </LocationFields>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-md text-white ${OBJECT_TILES.opportunity.color}`}>
            <TargetIcon className="size-4" />
          </div>
          <div className="grid gap-0.5">
            <CardTitle className="text-base"><h2>Opportunity &amp; Funnel</h2></CardTitle>
            <CardDescription>
              Created together in the Sales Funnel at its first stage.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label required htmlFor="conversion-nature">Project Nature</Label><Combobox aria-required="true" id="conversion-nature" value={projectNatureCode} onChange={setProjectNatureCode} options={projectNatures.map(n => ({ value: n.code, label: n.name }))} placeholder="Select Project Nature" /></div>
            <div className="grid gap-2">
              <Label htmlFor="opp-close">Expected close date</Label>
              <Input
                id="opp-close"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label required htmlFor="opp-name">Opportunity name</Label>
              <Input
                required id="opp-name"
                value={opportunityName}
                onChange={(e) => onOpportunityNameChange(e.target.value)}
                placeholder={defaultDealName}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label required htmlFor="funnel-name">Funnel name</Label>
              <Input
                required id="funnel-name"
                value={funnelName}
                onChange={(e) => {
                  setFunnelNameTouched(true)
                  setFunnelName(e.target.value)
                }}
                placeholder={opportunityName || defaultDealName}
              />

            </div>

          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/leads/${lead.id}`} />}
        >
          Cancel
        </Button>
        <Button type="button" onClick={() => setConfirmOpen(true)} disabled={blocked}>
          Review conversion
        </Button>
      </div>
      {missing.length > 0 && !submitting ? (
        <p className="text-right text-xs text-muted-foreground" role="status">
          Required fields: {missing.join(" · ")}
        </p>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Submit for Sales Admin review. Records are created after approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="grid gap-3 rounded-md border p-3 text-sm">
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-medium break-words">{selectedAccountName}</dd>
              <dd className="text-xs text-muted-foreground">
                {creatingNew ? "A new account will be created." : "The contact will be added to this account."}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium break-words">{lead.name}</dd>
              <dd className="break-all text-xs text-muted-foreground">{emailValue.trim()}</dd>
            </div>
            <div className="grid gap-0.5"><dt className="text-muted-foreground">Project Nature</dt><dd className="font-medium">{projectNatures.find(nature=>nature.code===projectNatureCode)?.name}</dd></div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Opportunity</dt>
              <dd className="font-medium break-words">{opportunityName}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">First funnel</dt>
              <dd className="font-medium break-words">{funnelName}</dd>
            </div>
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Back to edit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert} disabled={blocked}>
              {submitting ? "Submitting…" : "Submit conversion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
