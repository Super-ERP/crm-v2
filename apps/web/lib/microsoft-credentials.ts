import "server-only"
import type { MicrosoftDirectory } from "./microsoft-directories"

export type MicrosoftAppCredentials = { clientId: string; clientSecret: string }

/** Server-only secret configuration. Never include raw values in validation errors. */
export function parseMicrosoftCredentials(raw: string, directories: MicrosoftDirectory[]): Record<string, MicrosoftAppCredentials> {
  const fail = () => { throw new Error("Invalid external Microsoft app credentials.") }
  let parsed: unknown
  try { parsed = raw.trim() ? JSON.parse(raw) : {} } catch { return fail() }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail()
  const expected = new Set(directories.filter((directory) => directory.providerId !== "microsoft-entra-id").map((directory) => directory.tenantId))
  const result: Record<string, MicrosoftAppCredentials> = {}
  for (const [key, value] of Object.entries(parsed)) {
    const tenantId = key.toLowerCase()
    if (!expected.has(tenantId) || result[tenantId] || !value || typeof value !== "object") return fail()
    const { clientId, clientSecret } = value as Partial<MicrosoftAppCredentials>
    if (typeof clientId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clientId)
      || typeof clientSecret !== "string" || !clientSecret.trim() || /[\r\n]/.test(clientSecret)) return fail()
    result[tenantId] = { clientId: clientId.toLowerCase(), clientSecret }
  }
  if ([...expected].some((tenantId) => !result[tenantId])) return fail()
  return result
}
