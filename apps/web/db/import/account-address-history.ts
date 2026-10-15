/** Recover exported address values without assuming an order within a timestamp. */
const fields = { BillingStreet: "line1", BillingCity: "city", BillingState: "state", BillingPostalCode: "postcode", BillingCountry: "country" } as const
export function recoverAccountAddresses(history: Record<string, string>[]) {
  const groups = new Map<string, Map<string, Record<string, string>[]>>()
  for (const row of history) {
    if (!row.AccountId || !(row.Field in fields) || /^(true|1)$/i.test(row.IsDeleted ?? "") || !Number.isFinite(Date.parse(row.CreatedDate))) continue
    const account = groups.get(row.AccountId) ?? new Map<string, Record<string, string>[]>()
    groups.set(row.AccountId, account)
    account.set(row.Field, [...(account.get(row.Field) ?? []), row])
  }
  const ready: { sourceAccountId: string; address: Record<string, string>; historyIds: string[] }[] = []
  const review: { sourceAccountId: string; reason: string }[] = []
  for (const [sourceAccountId, account] of groups) {
    const address: Record<string, string> = {}
    const historyIds: string[] = []
    const conflicts: string[] = []
    for (const [field, rows] of account) {
      const latestTime = Math.max(...rows.map(row => Date.parse(row.CreatedDate)))
      const latest = rows.filter(row => Date.parse(row.CreatedDate) === latestTime)
      // Compare formatting only; keep an exact, deterministic source value.
      const values = [...new Set(latest.map(row => (row.NewValue ?? "").trim()))].sort()
      const distinct = new Set(values.map(value => value.replace(/\s+/g, " ")))
      if (distinct.size !== 1) { conflicts.push(field); continue }
      if (values[0]) address[fields[field as keyof typeof fields]] = values[0]
      historyIds.push(...latest.map(row => row.Id))
    }
    if (conflicts.length) review.push({ sourceAccountId, reason: `Conflicting latest history values at the same timestamp: ${conflicts.join(", ")}` })
    else if (!address.line1) review.push({ sourceAccountId, reason: "Latest history has no street address; country/city alone is insufficient" })
    else ready.push({ sourceAccountId, address, historyIds })
  }
  return { ready, review }
}
