export type LeadConversionInput = {
  leadId: string
  createOpportunity?: boolean
  opportunityName?: string | null
  funnelName?: string | null
  projectNatureCode?: string | null
  expectedCloseDate?: string | null
  existingAccountId?: string | null
  newAccount?: {
    accountType?: "client" | "reseller" | null
    code?: string | null
    registrationNumber?: string | null
    phone?: string | null
    address?: Record<string, string | null | undefined> | null
  } | null
}

function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`
  return JSON.stringify(value)
}

export function assertConversionSnapshot(saved: unknown, current: unknown): void {
  if (canonical(saved) !== canonical(current)) throw new Error("Lead details changed after submission. Cancel this request and submit the conversion again.")
}

export function validateConversionInput(input: LeadConversionInput): void {
  if (!input.leadId) throw new Error("Lead is required")
  if (!input.existingAccountId && !normalizeRegistrationNumber(input.newAccount?.registrationNumber)) throw new Error("SSM registration number is required for the new account")
  if (input.createOpportunity && !input.projectNatureCode?.trim()) throw new Error("Project Nature is required")
  if (input.expectedCloseDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.expectedCloseDate) || Number.isNaN(Date.parse(input.expectedCloseDate)) || new Date(input.expectedCloseDate).toISOString().slice(0, 10) !== input.expectedCloseDate))
    throw new Error("Enter a valid expected close date")
}

export type LeadConversionReview = { accountCode?: string; registrationChecked?: boolean; independentAccountConfirmed?: boolean }

/** Punctuation and spacing do not identify independent registered companies. */
export function normalizeRegistrationNumber(value?: string | null): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function validateConversionReview(input: LeadConversionInput, review?: LeadConversionReview): LeadConversionInput {
  if (input.existingAccountId) return input
  const code = (review?.accountCode ?? "").trim().toUpperCase()
  if (!/^[A-Z0-9]{2,6}$/.test(code)) throw new Error("A company code (2–6 letters/digits) is required for the new account")
  return { ...input, newAccount: { ...input.newAccount, code } }
}
