/** Pure quotation reference formatting. Each independent series has a running
 * number; revisions retain its prefix. Duplicate allocates a fresh series.
 * Existing original series retain their legacy date-based format. */

/** Default zero-pad width for the running number, overridable per tenant. */
export const QUOTE_PAD_WIDTH = 4

/**
 * The format switch date: funnels whose earliest quote predates this get the
 * legacy Salesforce-era `Q{yy}-...` numbering; on/after this, the new
 * `Q1...` numbering applies. Compared as an instant (UTC midnight) so the
 * comparison is unambiguous regardless of caller/server timezone.
 */
export const QUOTE_FORMAT_CUTOFF = new Date("2025-09-01T00:00:00.000Z")

/**
 * Format the Salesforce-style quote reference for a given running number +
 * revision, choosing old vs. new format from the funnel's earliest quote
 * date (or the new format when there is none yet, i.e. this call IS the
 * funnel's first quote).
 */
export function formatQuoteRef({
  running,
  rev,
  earliestQuoteDate,
  pad = QUOTE_PAD_WIDTH,
}: {
  /** The funnel's shared running number (assigned once per funnel). */
  running: number
  /** This quote's revision within the funnel (quotations.version). */
  rev: number
  /**
   * The funnel's earliest quote's creation timestamp, or `null` when this
   * call is minting the funnel's first quote (no earlier quote exists yet).
   */
  earliestQuoteDate: Date | string | null
  /** Zero-pad width for the running number (tenant-configurable). */
  pad?: number
}): string {
  const runningStr = String(Math.trunc(running)).padStart(pad, "0")
  const revStr = String(Math.trunc(rev))
  const earliest = typeof earliestQuoteDate === "string"
    ? new Date(earliestQuoteDate)
    : earliestQuoteDate

  if (earliest !== null && Number.isNaN(earliest.getTime())) {
    throw new TypeError("Invalid earliest quotation date")
  }

  if (earliest !== null && earliest.getTime() < QUOTE_FORMAT_CUTOFF.getTime()) {
    const yy = earliest.toISOString().slice(2, 4)
    return `Q${yy}-${runningStr}-${revStr}`
  }
  return `Q1${runningStr}-${revStr}`
}

/** Legacy references without a canonical revision suffix are independent series. */
export function quotationSeriesKey(reference: string): string {
  return /^Q([0-9]{2}-[0-9]+|1[0-9]+)-[0-9]+$/.test(reference)
    ? reference.replace(/-[^-]+$/, '') : reference
}
