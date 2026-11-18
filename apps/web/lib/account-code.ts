/** New/changed codes are short identifiers. Unchanged imported codes are history. */
export function normalizeAccountCode(code?: string | null, currentCode?: string | null): string | null {
  if (currentCode !== undefined && code === currentCode) return currentCode
  const trimmed = (code ?? "").trim().toUpperCase()
  if (!trimmed) return null
  if (!/^[A-Z0-9]{2,6}$/.test(trimmed)) throw new Error("Account code must be 2–6 characters")
  return trimmed
}

/** Server policy: sales may retain identifiers but allocation requires the capability. */
export function authorizeAccountCode(code: string | null, currentCode: string | null | undefined, canManage: boolean): void {
  if (currentCode === undefined || code !== currentCode) {
    if (!canManage) throw new Error("FORBIDDEN: missing account.code.manage. Ask Sales Admin to assign the account code.")
    if (!code) throw new Error("Account code is required")
  }
}
