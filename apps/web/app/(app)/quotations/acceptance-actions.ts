"use server"

import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { runAction, type ActionResult } from "@/lib/action-result"
import { requireContext, assertCan } from "@/lib/server-context"
import { storage } from "@/lib/storage"
import { toDateString } from "@/lib/dates"
import { backfillAcceptanceDate, classifyBackfill, type BackfillAction } from "@/lib/quotation-acceptance"
import type { QuotationStatus } from "@/lib/quotation-transitions"
import { recordQuotationAcceptance, switchToAcceptedPrimary, undoQuotationAcceptance } from "@/server/services/quotation-acceptance"

const MAX_FILE = 25 * 1024 * 1024

function revalidateQuotation(quotationId: string, funnelId: string) {
  revalidatePath("/quotations")
  revalidatePath(`/quotations/${quotationId}`)
  revalidatePath(`/funnel/${funnelId}`)
  revalidatePath("/payment-milestones")
}

/** Record that the customer accepted a quotation (Owner / Admin / Sales Admin). */
export async function recordQuotationAcceptanceAction(formData: FormData): Promise<ActionResult<{ relinkedMilestones: number; needsReplan: boolean }>> {
  return runAction(async () => {
    const ctx = await requireContext()
    assertCan(ctx, PERMISSIONS.QUOTATION_RECORD_ACCEPTANCE)
    const quotationId = String(formData.get("quotationId") ?? "")
    const acceptedOn = String(formData.get("acceptedOn") ?? "")
    const note = String(formData.get("note") ?? "")
    const file = formData.get("file")
    if (!quotationId) throw new Error("Quotation not found")
    let attachment = null
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE) throw new Error("File exceeds 25 MB")
      const stored = await storage.put(ctx.tenantId, file.name, Buffer.from(await file.arrayBuffer()))
      attachment = { fileName: file.name, contentType: file.type || "application/octet-stream", byteSize: stored.size, storageKey: stored.key }
    }
    const result = await withTenant(PERMISSIONS.QUOTATION_RECORD_ACCEPTANCE, (tx, ctx) =>
      recordQuotationAcceptance(tx, ctx, { quotationId, acceptedOn, note, source: "manual", attachment }))
    revalidateQuotation(quotationId, result.funnelId)
    return { relinkedMilestones: result.relinkedMilestones, needsReplan: result.needsReplan }
  })
}

/** Owner / Admin: undo an acceptance while nothing has been invoiced against it. */
export async function undoQuotationAcceptanceAction(quotationId: string, reason: string): Promise<ActionResult<{ status: string }>> {
  return runAction(async () => {
    const result = await withTenant(PERMISSIONS.QUOTATION_ACCEPTANCE_UNDO, (tx, ctx) => undoQuotationAcceptance(tx, ctx, { quotationId, reason }))
    revalidateQuotation(quotationId, result.funnelId)
    return { status: result.status }
  })
}

export type BackfillRow = {
  funnelId: string
  funnelName: string
  projectCode: string | null
  quotationId: string | null
  quoteNumber: string | null
  quoteStatus: string | null
  acceptedOn: string
  action: BackfillAction
  reason: string
}

async function loadBackfillRows(tx: Parameters<Parameters<typeof withTenant>[1]>[0], tenantId: string): Promise<BackfillRow[]> {
  const today = toDateString()
  const rows = await tx.execute<{
    funnel_id: string; funnel_name: string; project_code: string | null; close_date: string | null
    quotation_id: string | null; quote_number: string | null; quote_status: string | null; quote_date: string | null; accepted_other: string | null
  }>(sql`
    select f.id funnel_id, f.name funnel_name, f.project_code,
      coalesce(f.actual_close_date::text, to_char(f.closed_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD')) close_date,
      q.id quotation_id, q.quote_number, q.status::text quote_status, q.quote_date::text quote_date,
      (select a.id from quotations a where a.funnel_id = f.id and a.tenant_id = f.tenant_id and a.status = 'accepted' and a.deleted_at is null and a.id <> coalesce(q.id, '00000000-0000-0000-0000-000000000000'::uuid) limit 1) accepted_other
    from funnels f
    join pipeline_stages s on s.id = f.current_stage_id
    left join quotations q on q.id = f.primary_quotation_id and q.deleted_at is null
    where f.tenant_id = ${tenantId} and f.deleted_at is null and s.kind = 'WON'
      and coalesce(q.status::text, '') <> 'accepted'
    order by f.name`)
  return rows.map(row => {
    const verdict = classifyBackfill({ primaryStatus: row.quote_status as QuotationStatus | null, acceptedOtherId: row.accepted_other })
    return {
      funnelId: row.funnel_id,
      funnelName: row.funnel_name,
      projectCode: row.project_code,
      quotationId: row.quotation_id,
      quoteNumber: row.quote_number,
      quoteStatus: row.quote_status,
      acceptedOn: backfillAcceptanceDate(row.close_date, row.quote_date, today),
      ...verdict,
    }
  })
}

/** Won Funnels whose primary quotation is not accepted, with what the backfill would do. */
export async function previewAcceptanceBackfill(): Promise<ActionResult<BackfillRow[]>> {
  return runAction(() => withTenant(PERMISSIONS.QUOTATION_ACCEPTANCE_BACKFILL, (tx, ctx) => loadBackfillRows(tx, ctx.tenantId)))
}

export type BackfillOutcome = { accepted: number; switched: number; skipped: { funnelName: string; reason: string }[]; needsReplan: string[]; batchId: string }

/**
 * Apply the backfill to the selected Funnels in one transaction. Each row is
 * re-classified inside the transaction, so a Funnel that changed since the
 * preview is skipped rather than written with stale assumptions.
 */
export async function runAcceptanceBackfill(funnelIds: string[], note: string): Promise<ActionResult<BackfillOutcome>> {
  return runAction(async () => {
    if (!note.trim()) throw new Error("Enter a note for this backfill.")
    if (!funnelIds.length) throw new Error("Select at least one Funnel.")
    const selected = new Set(funnelIds)
    const batchId = randomUUID()
    const outcome = await withTenant(PERMISSIONS.QUOTATION_ACCEPTANCE_BACKFILL, async (tx, ctx) => {
      const rows = (await loadBackfillRows(tx, ctx.tenantId)).filter(row => selected.has(row.funnelId))
      const result: BackfillOutcome = { accepted: 0, switched: 0, skipped: [], needsReplan: [], batchId }
      for (const id of selected) if (!rows.some(row => row.funnelId === id)) result.skipped.push({ funnelName: id, reason: "No longer needs backfill" })
      for (const row of rows) {
        if (row.action === "skip") { result.skipped.push({ funnelName: row.funnelName, reason: row.reason }); continue }
        if (row.action === "switch_primary") {
          const switched = await switchToAcceptedPrimary(tx, ctx, row.funnelId, batchId, note)
          result.switched++
          if (switched.needsReplan) result.needsReplan.push(row.funnelName)
          continue
        }
        const accepted = await recordQuotationAcceptance(tx, ctx, { quotationId: row.quotationId!, acceptedOn: row.acceptedOn, note, source: "backfill", batchId })
        result.accepted++
        if (accepted.needsReplan) result.needsReplan.push(row.funnelName)
      }
      return result
    })
    revalidatePath("/quotations")
    revalidatePath("/funnel")
    revalidatePath("/payment-milestones")
    return outcome
  })
}
