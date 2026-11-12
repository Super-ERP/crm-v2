/** New/changed codes are short identifiers. Unchanged imported codes are history. */
export function normalizeAccountCode(code?: string | null, currentCode?: string | null): string | null {
  if (currentCode !== undefined && code === currentCode) return currentCode
  const trimmed = (code ?? "").trim().toUpperCase()
  if (!trimmed) return null
  if (!/^[A-Z0-9]{2,6}$/.test(trimmed)) throw new Error("Account code must be 2–6 characters")
  return trimmed
}
