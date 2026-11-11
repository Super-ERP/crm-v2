import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import { funnels, projectCounters, quotations, tenantSettings } from "@/db/schema"
import { toDateString } from "@/lib/dates"
import { formatQuoteRef, QUOTE_PAD_WIDTH, quotationSeriesKey } from "@/lib/quote-number"
import type { ServerContext } from "@/lib/server-context"

/**
 * True for a Postgres unique-constraint violation (SQLSTATE 23505). A minted
 * document number (quote / SO / project code) can collide when the tenant's
 * "Next number" was set at or below an already-issued value. Callers should
 * catch this and surface a friendly retry message instead of the raw
 * "duplicate key value violates unique constraint …" error.
 */
export function isDuplicateNumberError(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: unknown }).code === "23505"
  )
}

/** Allocate under the funnel lock. Revisions retain a source prefix; duplicates
 * claim a new tenant-wide prefix. Deleted history always reserves its numbers.
 * Ordinary create continues the funnel's original/default series for compatibility. */
export async function nextQuoteNumber(
  tx: Tx,
  ctx: ServerContext,
  funnelId: string,
  options: { newSeries?: boolean; sourceQuoteNumber?: string; sourceSeriesKey?: string } = {}
): Promise<{ quoteNumber: string; version: number; seriesKey: string }> {
  const [f] = await tx
    .select({ quoteRunningNumber: funnels.quoteRunningNumber })
    .from(funnels)
    .where(and(eq(funnels.id, funnelId), eq(funnels.tenantId, ctx.tenantId), isNull(funnels.deletedAt)))
    .limit(1)
    .for("update")
  if (!f) throw new Error("Funnel not found")

  const [ts] = await tx
    .select({ pad: tenantSettings.quotePadWidth })
    .from(tenantSettings)
    .where(eq(tenantSettings.organizationId, ctx.tenantId))
    .limit(1)
  // No settings row — fail loudly rather than mint a bogus number that
  // collides for every such tenant.
  if (!ts) throw new Error("Quotation numbering is not configured for this tenant")

  let running = f.quoteRunningNumber
  if (running == null || options.newSeries) {
    // Atomically claim a fresh parent number. Only the first series sets the
    // funnel default; independent duplicates never overwrite that default.
    const [s] = await tx
      .update(tenantSettings)
      .set({ quoteNextNumber: sql`${tenantSettings.quoteNextNumber} + 1` })
      .where(eq(tenantSettings.organizationId, ctx.tenantId))
      .returning({ next: tenantSettings.quoteNextNumber })
    if (!s) throw new Error("Quotation numbering is not configured for this tenant")
    running = s.next - 1
    if (f.quoteRunningNumber == null) await tx
      .update(funnels)
      .set({ quoteRunningNumber: running, updatedAt: new Date() })
      .where(eq(funnels.id, funnelId))
  }

  if (options.newSeries) {
    const quoteNumber=formatQuoteRef({running, rev:1, earliestQuoteDate:null, pad:ts.pad ?? QUOTE_PAD_WIDTH})
    return {quoteNumber,version:1,seriesKey:quoteNumber.replace(/-[^-]+$/, '')}
  }

  const sourcePrefix = options.sourceSeriesKey ?? (options.sourceQuoteNumber ? quotationSeriesKey(options.sourceQuoteNumber) : undefined)
  const series = sourcePrefix
    ? sql`${quotations.seriesKey} = ${sourcePrefix}`
    : sql`${quotations.seriesKey} = (
        select q.series_key from quotations q
        where q.funnel_id = ${funnelId} order by q.created_at, q.version, q.id limit 1
      )`
  const [agg] = await tx.select({
    seriesKey: sql<string | null>`min(${quotations.seriesKey})`,
    maxVersion: sql<number>`coalesce(max(${quotations.version}), 0)`,
    minCreatedAt: sql<string | null>`min(${quotations.createdAt})`,
  }).from(quotations).where(and(eq(quotations.funnelId, funnelId), series))
  const rev = (agg?.maxVersion ?? 0) + 1
  const prefix = sourcePrefix ?? agg?.seriesKey
  const quoteNumber = prefix ? `${prefix}-${rev}` : formatQuoteRef({
    running, rev, earliestQuoteDate: agg?.minCreatedAt ?? null, pad: ts.pad ?? QUOTE_PAD_WIDTH,
  })
  return { quoteNumber, version: rev, seriesKey: prefix ?? quotationSeriesKey(quoteNumber) }
}

/**
 * Allocate the next SO number for the entity: {EntityCode}SO-{running}.
 * Each entity keeps its own counter.
 */
export async function nextSoNumber(tx: Tx, ctx: ServerContext): Promise<string> {
  const [s] = await tx
    .update(tenantSettings)
    .set({ soNextNumber: sql`${tenantSettings.soNextNumber} + 1` })
    .where(eq(tenantSettings.organizationId, ctx.tenantId))
    .returning({
      entityCode: tenantSettings.entityCode,
      next: tenantSettings.soNextNumber,
      pad: tenantSettings.soPadWidth,
    })
  // A zero-row UPDATE means the tenant has no settings row — fail loudly rather
  // than mint a bogus ENTSO-0000 that collides for every such tenant.
  if (!s) throw new Error("Sales-order numbering is not configured for this tenant")
  const assigned = s.next - 1
  const entity = (s.entityCode || "ENT").toUpperCase()
  const running = String(assigned).padStart(s.pad ?? 4, "0")
  return `${entity}SO-${running}`
}

/**
 * Allocate the next project code in the format
 * `{YYYY}-{ENTITY}-{ACCOUNTCODE}-{PROJECTNATURE}-{NNN}` (e.g.
 * `2026-DEMO-ACME-WEB-001`):
 *   - YYYY        — the deal's CONTRACT/LICENSE start year when supplied
 *                   (`opts.year`, from opportunity.projectYear / project start
 *                   date); falls back to the current local calendar year.
 *   - ENTITY      — tenant_settings.entityCode (fallback "ENT").
 *   - ACCOUNTCODE — the account's short code (fallback "ACC").
 *   - PROJECTNATURE — the project's chosen project-nature code (fallback "GEN").
 *   - NNN         — a running number that RESETS PER YEAR per tenant, taken from
 *                   `project_counters` and zero-padded to projectPadWidth (3).
 *
 * The running number is bumped atomically via an upsert on (tenant_id, year), so
 * concurrent project creations never reuse a number. Call inside the same tx
 * that inserts the project. All segments are upper-cased.
 */
export async function nextProjectCode(
  tx: Tx,
  ctx: ServerContext,
  {
    accountCode,
    projectNatureCode,
    year: contractYear,
  }: { accountCode: string; projectNatureCode: string; year?: number | null }
): Promise<string> {
  // Contract/license start year when known, else the current calendar year.
  const year =
    contractYear && contractYear > 0
      ? Math.trunc(contractYear)
      : Number(toDateString().slice(0, 4))

  // Atomically take-and-increment the per-year counter. next_number holds the
  // value to assign NEXT; on first use we seed it to 2 and assign 1, on every
  // subsequent use we bump by 1 and assign the prior value (returned - 1).
  const [counter] = await tx
    .insert(projectCounters)
    .values({ tenantId: ctx.tenantId, year, nextNumber: 2 })
    .onConflictDoUpdate({
      target: [projectCounters.tenantId, projectCounters.year],
      set: { nextNumber: sql`${projectCounters.nextNumber} + 1` },
    })
    .returning({ next: projectCounters.nextNumber })
  const assigned = (counter?.next ?? 2) - 1

  const [s] = await tx
    .select({
      entityCode: tenantSettings.entityCode,
      pad: tenantSettings.projectPadWidth,
    })
    .from(tenantSettings)
    .where(eq(tenantSettings.organizationId, ctx.tenantId))
    .limit(1)

  const yyyy = String(year)
  const entity = (s?.entityCode || "ENT").toUpperCase()
  const acct = (accountCode || "ACC").toUpperCase()
  const product = (projectNatureCode || "GEN").toUpperCase()
  const running = String(assigned).padStart(s?.pad ?? 3, "0")
  return `${yyyy}-${entity}-${acct}-${product}-${running}`
}
