export type MicrosoftDirectory = {
  tenantId: string
  providerId: string
  /** Empty only for the original directory; external domains are exclusive. */
  domains: string[]
}

const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/

export function parseMicrosoftDirectories(primaryTenantId: string, raw: string): MicrosoftDirectory[] {
  const primary = primaryTenantId.trim().toLowerCase()
  if (!guid.test(primary)) throw new Error("MICROSOFT_TENANT_ID must be a directory GUID.")
  let parsed: unknown
  try { parsed = raw.trim() ? JSON.parse(raw) : [] } catch {
    throw new Error("MICROSOFT_EXTERNAL_DIRECTORIES must be a JSON array.")
  }
  if (!Array.isArray(parsed)) throw new Error("MICROSOFT_EXTERNAL_DIRECTORIES must be a JSON array.")
  const directories: MicrosoftDirectory[] = [{ tenantId: primary, providerId: "microsoft-entra-id", domains: [] }]
  const tenants = new Set([primary])
  const domains = new Set<string>()
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || typeof entry.tenantId !== "string" || !Array.isArray(entry.domains)) {
      throw new Error("Each external Microsoft directory requires tenantId and domains.")
    }
    const tenantId = entry.tenantId.trim().toLowerCase()
    if (!guid.test(tenantId) || tenants.has(tenantId)) throw new Error("Microsoft directory IDs must be unique directory GUIDs.")
    const mapped: string[] = []
    for (const value of entry.domains) {
      const domain = typeof value === "string" ? value.trim().toLowerCase() : ""
      if (!domainPattern.test(domain) || domains.has(domain)) throw new Error("Microsoft email domains must be valid, exact and unique.")
      domains.add(domain)
      mapped.push(domain)
    }
    if (!mapped.length) throw new Error("External Microsoft directories require at least one email domain.")
    tenants.add(tenantId)
    directories.push({ tenantId, providerId: `microsoft-entra-${tenantId}`, domains: mapped })
  }
  return directories
}

export function microsoftEmailDomain(email: string): string | null {
  const value = email.trim().toLowerCase()
  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(value)) return null
  const domain = value.split("@")[1]
  return domainPattern.test(domain) ? domain : null
}

export function resolveMicrosoftProvider(email: string, directories: Pick<MicrosoftDirectory, "providerId" | "domains">[]): string | null {
  const domain = microsoftEmailDomain(email)
  if (!domain) return null
  return directories.find((directory) => directory.domains.includes(domain))?.providerId
    ?? directories.find((directory) => directory.providerId === "microsoft-entra-id")?.providerId
    ?? null
}
