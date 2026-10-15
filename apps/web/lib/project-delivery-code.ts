/** A delivery record shares its immutable identity with its source CRM funnel. */
export async function resolveDeliveryCode(sourceCode: string | null | undefined, manualCode: string | undefined, generate: () => Promise<string>) {
  if (sourceCode) {
    if (manualCode && manualCode !== sourceCode) throw new Error("Project code must match the source funnel code")
    return sourceCode
  }
  return manualCode || generate()
}

export function validateDeliverySource(accountId: string, source: { id: string; accountId: string } | null, quotation: { funnelId: string } | null) {
  if (source && source.accountId !== accountId) throw new Error("Source funnel belongs to a different account")
  if (quotation && (!source || quotation.funnelId !== source.id)) throw new Error("Selected quotation does not belong to the source funnel")
}

export function reusableDeliveryProject<T extends { accountId: string; deletedAt: Date | null }>(project: T, accountId: string, visible: boolean): T {
  if (project.accountId !== accountId || !visible || project.deletedAt) throw new Error("Project code conflict: an existing delivery project cannot be linked in this account or access scope")
  return project
}
