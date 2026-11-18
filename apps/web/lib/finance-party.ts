/** New documents only: explicit input and parent history precede quote defaults. */
export function resolveFinanceParty(explicit: string | null | undefined, parent: string | null | undefined, billTo: string | null | undefined, endCustomer: string | null | undefined): string | null {
  return explicit?.trim() || parent || billTo || endCustomer || null
}
