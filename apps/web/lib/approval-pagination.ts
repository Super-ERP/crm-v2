export const APPROVAL_PAGE_SIZE = 25

export function normalizeApprovalPage(value: unknown): number {
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 0 && page <= 10000 ? page : 0
}
