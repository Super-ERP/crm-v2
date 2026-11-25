import type { QuotationStatus } from "@/lib/quotation-transitions"

/**
 * Recorded acceptance: an Owner / Admin / Sales Admin records that the
 * customer accepted a quotation, skipping the approval and send steps and
 * ignoring the validity date (the note is the record of why). Used one at a
 * time on the quotation page and in bulk to backfill Won Funnels.
 */

/** Statuses a recorded acceptance may start from. */
export const RECORDABLE_STATUSES: readonly QuotationStatus[] = ["draft", "approved", "sent", "expired"]

export function recordAcceptanceBlocker(input: {
  status: QuotationStatus
  deleted: boolean
  funnelStatus: string
  otherAcceptedQuoteNumber: string | null
}): string | null {
  if (input.deleted) return "This quotation has been deleted."
  if (input.status === "accepted") return "This quotation is already accepted."
  if (input.status === "pending_approval") return "This quotation is waiting for approval. Decide or recall the approval first."
  if (input.status === "rejected" || input.status === "void") return `A ${input.status} quotation can’t be accepted. Create a revision instead.`
  if (!RECORDABLE_STATUSES.includes(input.status)) return "This quotation can’t be accepted."
  if (input.funnelStatus !== "open" && input.funnelStatus !== "won") return "Acceptance can only be recorded on an open or Closed Won Funnel."
  if (input.otherAcceptedQuoteNumber) return `${input.otherAcceptedQuoteNumber} is already the accepted quotation for this Funnel. Undo that acceptance first.`
  return null
}

/** Validate a user-entered acceptance date (YYYY-MM-DD). Returns an error or null. */
export function acceptanceDateError(date: string, today: string, quoteDate: string | null): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return "Enter the date the customer accepted."
  if (date > today) return "The acceptance date can’t be in the future."
  if (quoteDate && date < quoteDate) return `The acceptance date can’t be before the quotation date (${quoteDate}).`
  return null
}

/**
 * Backfill date: the Funnel's close date, falling back to today when it is
 * missing or in the future; never earlier than the quotation date.
 */
export function backfillAcceptanceDate(closeDate: string | null, quoteDate: string | null, today: string): string {
  let date = closeDate && closeDate <= today ? closeDate : today
  if (quoteDate && date < quoteDate && quoteDate <= today) date = quoteDate
  return date
}

export type BackfillAction = "accept" | "switch_primary" | "skip"

export function classifyBackfill(input: {
  primaryStatus: QuotationStatus | null
  acceptedOtherId: string | null
}): { action: BackfillAction; reason: string } {
  if (input.primaryStatus === "accepted") return { action: "skip", reason: "Already accepted" }
  if (input.acceptedOtherId) return { action: "switch_primary", reason: "An accepted quotation exists; make it primary" }
  if (!input.primaryStatus) return { action: "skip", reason: "No primary quotation — review first" }
  if (input.primaryStatus === "sent" || input.primaryStatus === "approved" || input.primaryStatus === "expired") return { action: "accept", reason: "Record acceptance" }
  if (input.primaryStatus === "draft") return { action: "skip", reason: "Draft — review first" }
  if (input.primaryStatus === "pending_approval") return { action: "skip", reason: "Waiting for approval — review first" }
  return { action: "skip", reason: `Primary quotation is ${input.primaryStatus} — review first` }
}
