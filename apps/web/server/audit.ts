import "server-only"
import type { Tx } from "@/db"
import { auditLog } from "@/db/schema"
import type { ServerContext } from "@/lib/server-context"
import { createHash } from "node:crypto"

export type AuditOutcome = "success" | "denied" | "error"
type AuditValue = boolean | number | string | null | AuditValue[] | { [key: string]: AuditValue }
const sensitiveKeyPattern = /authorization|cookie|credential|password|secret|token|apikey|privatekey/i

function sanitizeMetadata(value: unknown, depth = 0): AuditValue {
  if (depth > 6) throw new TypeError("Audit metadata exceeds structural limit")
  if (value === null || typeof value === "boolean" || typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadata(item, depth + 1))
  if (typeof value === "object") {
    const output: Record<string, AuditValue> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (sensitiveKeyPattern.test(key.replace(/[^a-z0-9]/gi, ""))) {
        throw new TypeError("Audit metadata contains sensitive field")
      }
      output[key] = sanitizeMetadata(item, depth + 1)
    }
    if (Buffer.byteLength(JSON.stringify(output)) > 8_192) {
      throw new TypeError("Audit metadata exceeds byte limit")
    }
    return output
  }
  throw new TypeError("Audit metadata contains unsupported value")
}

export async function writeAudit(
  tx: Tx,
  ctx: ServerContext,
  entry: {
    action: string
    entityType: string
    entityId: string
    before?: unknown
    after?: unknown
    outcome?: AuditOutcome
    source?: string
    metadata?: unknown
    requestId?: string
  }
): Promise<void> {
  await tx.insert(auditLog).values({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    actorMemberId: ctx.memberId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: (entry.before as object | null) ?? null,
    after: (entry.after as object | null) ?? null,
    outcome: entry.outcome ?? "success",
    source: entry.source ?? "application",
    metadata: entry.metadata == null ? null : sanitizeMetadata(entry.metadata),
    requestIdHash: entry.requestId
      ? createHash("sha256").update(entry.requestId).digest("hex")
      : null,
  })
}

/**
 * Audit an authentication / entity-lifecycle event (sign-in, entity creation)
 * that happens outside a normal ServerContext. audit_log is FORCE-RLS, so the
 * row MUST be tenant-scoped: call inside runInTenant(tenantId, …) so
 * app.current_tenant matches the tenantId written here. IP/user-agent (when
 * known) ride in the `after` payload since audit_log has no user_agent column.
 */
export async function writeAuthAudit(
  tx: Tx,
  entry: {
    tenantId: string
    action: string
    actorUserId: string | null
    actorMemberId?: string | null
    ip?: string | null
    userAgent?: string | null
    entityType?: string
    entityId?: string
    after?: unknown
    outcome?: AuditOutcome
    source?: string
    metadata?: unknown
    requestId?: string
  }
): Promise<void> {
  await tx.insert(auditLog).values({
    tenantId: entry.tenantId,
    actorUserId: entry.actorUserId,
    actorMemberId: entry.actorMemberId ?? null,
    action: entry.action,
    entityType: entry.entityType ?? "auth",
    entityId: entry.entityId ?? entry.actorUserId ?? "unknown",
    ip: entry.ip ?? null,
    outcome: entry.outcome ?? "success",
    source: entry.source ?? "authentication",
    metadata: entry.metadata == null ? null : sanitizeMetadata(entry.metadata),
    requestIdHash: entry.requestId
      ? createHash("sha256").update(entry.requestId).digest("hex")
      : null,
    after:
      entry.after != null
        ? (entry.after as object)
        : entry.userAgent
          ? { userAgent: entry.userAgent }
          : null,
  })
}
