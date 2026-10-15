/** Match explicit source billing names; never invent a reseller from a contact. */
export function resolveSourceBillTo(input: {
  billToName: string
  contactAccountId: string | null
  endUserAccountId: string | null
  accounts: { id: string; name: string }[]
}): { accountId: string | null; issue: string | null } {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en")
  if (!input.billToName.trim()) return { accountId: input.endUserAccountId, issue: null }
  const matches = input.accounts.filter(account => normalize(account.name) === normalize(input.billToName))
  const contactMatch = matches.find(account => account.id === input.contactAccountId)
  if (contactMatch) return { accountId: contactMatch.id, issue: null }
  if (matches.length !== 1) return { accountId: null, issue: `${matches.length} accounts match explicit Bill To; review required` }
  if (input.contactAccountId && input.contactAccountId !== matches[0].id) {
    return { accountId: null, issue: "Bill To conflicts with quote contact account; review required" }
  }
  return { accountId: matches[0].id, issue: null }
}
