/** Bill-to is quote-specific: a reseller can bill many different end users. */
export function resolveQuotationBillingAccount(endUserAccountId: string | null, billToAccountId?: string | null) {
  return billToAccountId ?? endUserAccountId
}

export function canSelectBillToAccount(
  account: { id: string; accountType: string | null; ownerMemberId: string | null },
  visibleMembers: string[] | null,
  existingBillToAccountId: string | null,
) {
  return account.accountType === "reseller" || account.id === existingBillToAccountId ||
    visibleMembers === null || (account.ownerMemberId !== null && visibleMembers.includes(account.ownerMemberId))
}

export type QuotationBillingSnapshot = {
  account: {
    name: string
    code: string | null
    phone: string | null
    address: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postcode?: string | null; country?: string | null } | null
  }
  contact: { name: string; email: string | null; phone: string | null } | null
}
