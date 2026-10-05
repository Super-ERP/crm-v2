"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2Icon, TargetIcon } from "lucide-react"
import { showActionError } from "@/lib/show-action-error"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  countries = [],
}: {
  lead: Lead
  accountOptions: Option[]
  countries?: CountryOption[]
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
  const [newCode, setNewCode] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [addr, setAddr] = React.useState({
    line1: "",
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
  const stateOptions = countries.find((c) => c.name === addr.country)?.states ?? []
  const codeValid = /^[A-Za-z0-9]{2,6}$/.test(newCode.trim())
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
    creatingNew && !codeValid ? "a valid account code (2–6 letters/digits)" : null,
    creatingNew && !addr.country.trim() ? "Country" : null,
    !opportunityName.trim() ? "Opportunity name" : null,
    !funnelName.trim() ? "Funnel name" : null,
  ].filter((m): m is string => m !== null)

  const blocked = submitting || missing.length > 0

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
        existingAccountId: creatingNew ? null : accountId,
        newAccount: creatingNew
          ? {
              accountType: newType,
              code: newCode.trim().toUpperCase(),
              phone: newPhone || null,
              address: {
                line1: addr.line1 || null,
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
              <Label htmlFor="convert-lead-email">Lead email</Label>
              <Input
                id="convert-lead-email"
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
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>
              “{lead.name}” becomes a contact for “{lead.companyName || lead.name}”.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="convert-account">
              Account{" "}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Combobox
              id="convert-account"
              value={accountId}
              onChange={(v) => setAccountId(v || "")}
              options={[
                { value: NEW_ACCOUNT, label: "Create new account" },
                ...accountOptions.map((a) => ({ value: a.id, label: a.name })),
              ]}
              placeholder="Choose an account"
              searchPlaceholder="Search accounts…"
              emptyMessage="No accounts found."
            />
            <p className="text-xs text-muted-foreground">
              {!accountId
                ? "Attach the contact to an existing account, or create a new one."
                : creatingNew
                  ? `A new account will be created from “${lead.companyName || lead.name}”.`
                  : "Matched by company name. The contact will be added to this account."}
            </p>
          </div>

          {creatingNew ? (
            <div className="grid gap-4 rounded-lg border p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                New account details
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
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
                  <Label htmlFor="new-acct-code">
                    Company code{" "}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </Label>
                  <Input
                    id="new-acct-code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="TTDC"
                    maxLength={6}
                    className="uppercase"
                  />
                  {newCode && !codeValid ? (
                    <p className="text-xs text-destructive">2–6 letters/digits.</p>
                  ) : null}
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

              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Address
              </p>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="new-acct-city">City</Label>
                    <Input
                      id="new-acct-city"
                      value={addr.city}
                      onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
                      placeholder="Kuala Lumpur"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-acct-postcode">Postcode</Label>
                    <Input
                      id="new-acct-postcode"
                      value={addr.postcode}
                      onChange={(e) => setAddr((a) => ({ ...a, postcode: e.target.value }))}
                      placeholder="50250"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-acct-country">
                      Country{" "}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </Label>
                    {countries.length > 0 ? (
                      <Combobox
                        id="new-acct-country"
                        value={addr.country}
                        onChange={(v) =>
                          // States are country-scoped — reset state on change.
                          setAddr((a) => ({ ...a, country: v || "", state: "" }))
                        }
                        options={countries.map((c) => ({ value: c.name, label: c.name }))}
                        placeholder="Choose a country"
                        searchPlaceholder="Search countries…"
                        emptyMessage="Add countries in Settings."
                      />
                    ) : (
                      <Input
                        id="new-acct-country"
                        value={addr.country}
                        onChange={(e) => setAddr((a) => ({ ...a, country: e.target.value }))}
                        placeholder="Malaysia"
                      />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-acct-state">State</Label>
                    {stateOptions.length > 0 ? (
                      <Combobox
                        id="new-acct-state"
                        value={addr.state}
                        onChange={(v) => setAddr((a) => ({ ...a, state: v || "" }))}
                        options={stateOptions.map((s) => ({ value: s, label: s }))}
                        placeholder="Optional"
                        searchPlaceholder="Search states…"
                        emptyMessage="No states."
                      />
                    ) : (
                      <Input
                        id="new-acct-state"
                        value={addr.state}
                        onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}
                        placeholder="Optional"
                        disabled={countries.length > 0 && !addr.country}
                      />
                    )}
                  </div>
                </div>
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
            <CardTitle className="text-base">Opportunity &amp; Funnel</CardTitle>
            <CardDescription>
              Created together in the Sales Funnel at its first stage.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="opp-name">
                Opportunity name{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="opp-name"
                value={opportunityName}
                onChange={(e) => onOpportunityNameChange(e.target.value)}
                placeholder={defaultDealName}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="funnel-name">
                Funnel name{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="funnel-name"
                value={funnelName}
                onChange={(e) => {
                  setFunnelNameTouched(true)
                  setFunnelName(e.target.value)
                }}
                placeholder={opportunityName || defaultDealName}
              />
              <p className="text-xs text-muted-foreground">
                The first deal under this Opportunity — usually the same name.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opp-close">Expected close date</Label>
              <Input
                id="opp-close"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
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
        <p className="text-right text-xs text-destructive" role="status">
          To convert, fill in: {missing.join(" · ")}
        </p>
      ) : null}
      <p className="text-right text-xs text-muted-foreground">
        You&apos;ll review the account and sales records before conversion.
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates linked sales records and cannot be undone. Check the account and names before continuing.
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
              {submitting ? "Converting…" : "Convert lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
