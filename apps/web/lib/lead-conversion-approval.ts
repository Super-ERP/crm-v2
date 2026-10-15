export type LeadConversionInput = {
  leadId: string
  createOpportunity?: boolean
  opportunityName?: string | null
  funnelName?: string | null
  expectedCloseDate?: string | null
  existingAccountId?: string | null
  newAccount?: {
    accountType?: "client" | "reseller" | null
    code?: string | null
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
  if (!input.existingAccountId && !/^[A-Z0-9]{2,6}$/.test((input.newAccount?.code ?? "").trim().toUpperCase()))
    throw new Error("A company code (2–6 letters/digits) is required for the new account")
  if (input.expectedCloseDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.expectedCloseDate) || Number.isNaN(Date.parse(input.expectedCloseDate)) || new Date(input.expectedCloseDate).toISOString().slice(0, 10) !== input.expectedCloseDate))
    throw new Error("Enter a valid expected close date")
}
