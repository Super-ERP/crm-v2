/** Validate a calendar date without normalising invalid days into another month. */
export function parseQuotationDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Quotation date must be a valid date")
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value.startsWith("0000")) {
    throw new Error("Quotation date must be a valid date")
  }
  return value
}
