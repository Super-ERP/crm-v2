"use server"

import { writeOperatorAlert } from "@/server/services/operator-alerts"
import { getServerContext } from "@/lib/server-context"
import type { AlertSeverity, OperatorAlertRow } from "@/server/services/operator-alerts-types"
import { listOperatorAlerts as listAlerts, resolveOperatorAlerts as resolveAlerts } from "@/server/services/operator-alerts"

// ─── reportIncident ───────────────────────────────────────────────────────────

type IncidentInput = {
  severity?: AlertSeverity
  summary: string
  detail?: string
  source?: string
  errorMessage?: string
  errorDigest?: string
}

/**
 * Server action that reports an incident to the operator alert log.
 * Designed to be called from the React error boundary — it NEVER throws so
 * the boundary's render is never itself broken by a reporting failure.
 */
export async function reportIncident(input: IncidentInput): Promise<void> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error("Authentication required")
  const summary = input.summary.trim().slice(0, 200)
  if (!summary) throw new Error("Incident summary is required")

  try {
    const error = input.errorMessage != null
      ? Object.assign(new Error(input.errorMessage), { digest: input.errorDigest })
      : undefined
    await writeOperatorAlert({
      severity: input.severity,
      summary,
      detail: input.detail?.slice(0, 8_000),
      source: (input.source ?? "app_error_boundary").slice(0, 100),
      ctx,
      error,
    })
  } catch {
    console.error("incident_persistence_failed")
  }
}

// ─── Operator alerts read/list ───────────────────────────────────────────────

export async function listOperatorAlerts(options?: {
  severity?: AlertSeverity | null
  unresolvedOnly?: boolean
  limit?: number
}): Promise<OperatorAlertRow[]> {
  return listAlerts(options)
}

// ─── Resolve ────────────────────────────────────────────────────────────────

export async function resolveOperatorAlerts(ids: string[]): Promise<void> {
  return resolveAlerts(ids)
}
