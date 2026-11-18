export type AuditIdentity = { id: string; name: string; href: string }
export type AuditIdentityRequest = { entityType: string; entityId: string }
export type AuditIdentityLoader = (type: string, ids: string[]) => Promise<AuditIdentity[]>
const SUPPORTED = new Set(["lead", "account", "person", "opportunity", "opportunity_container", "funnel"])

/** Loader returns only live, permission/owner-authorized identities. Batch once per type. */
export async function resolveAuditIdentities(rows: AuditIdentityRequest[], load: AuditIdentityLoader) {
  const groups = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!SUPPORTED.has(row.entityType)) continue
    const ids = groups.get(row.entityType) ?? new Set<string>()
    ids.add(row.entityId)
    groups.set(row.entityType, ids)
  }
  const references = new Map<string, AuditIdentity>()
  await Promise.all([...groups].map(async ([type, ids]) => {
    for (const identity of await load(type, [...ids])) {
      if (ids.has(identity.id)) references.set(`${type}:${identity.id}`, identity)
    }
  }))
  return rows.map(row => references.get(`${row.entityType}:${row.entityId}`) ?? null)
}
