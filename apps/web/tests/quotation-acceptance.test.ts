import { describe, expect, it } from "vitest"
import { acceptanceDateError, backfillAcceptanceDate, classifyBackfill, recordAcceptanceBlocker } from "@/lib/quotation-acceptance"

const base = { deleted: false, funnelStatus: "won", otherAcceptedQuoteNumber: null }

describe("recordAcceptanceBlocker", () => {
  it("allows draft, approved, sent and expired quotations on open or won funnels", () => {
    for (const status of ["draft", "approved", "sent", "expired"] as const) {
      expect(recordAcceptanceBlocker({ ...base, status })).toBeNull()
      expect(recordAcceptanceBlocker({ ...base, status, funnelStatus: "open" })).toBeNull()
    }
  })
  it("blocks terminal, pending and already-accepted quotations", () => {
    for (const status of ["accepted", "pending_approval", "rejected", "void"] as const) expect(recordAcceptanceBlocker({ ...base, status })).not.toBeNull()
  })
  it("blocks lost or parked funnels, deleted quotations and a second accepted quotation", () => {
    expect(recordAcceptanceBlocker({ ...base, status: "sent", funnelStatus: "lost" })).toMatch(/open or Closed Won/)
    expect(recordAcceptanceBlocker({ ...base, status: "sent", funnelStatus: "on_hold" })).toMatch(/open or Closed Won/)
    expect(recordAcceptanceBlocker({ ...base, status: "sent", deleted: true })).toMatch(/deleted/)
    expect(recordAcceptanceBlocker({ ...base, status: "sent", otherAcceptedQuoteNumber: "Q1-1" })).toMatch(/Q1-1/)
  })
})

describe("acceptanceDateError", () => {
  it("accepts dates between the quotation date and today, ignoring validity", () => {
    expect(acceptanceDateError("2025-12-20", "2026-11-25", "2025-11-01")).toBeNull()
  })
  it("rejects future, pre-quotation and malformed dates", () => {
    expect(acceptanceDateError("2026-11-26", "2026-11-25", null)).toMatch(/future/)
    expect(acceptanceDateError("2025-10-01", "2026-11-25", "2025-11-01")).toMatch(/before the quotation date/)
    expect(acceptanceDateError("", "2026-11-25", null)).not.toBeNull()
    expect(acceptanceDateError("2025-13-45", "2026-11-25", null)).not.toBeNull()
  })
})

describe("backfillAcceptanceDate", () => {
  const today = "2026-11-25"
  it("uses the funnel close date", () => expect(backfillAcceptanceDate("2026-01-10", "2025-12-01", today)).toBe("2026-01-10"))
  it("falls back to today when the close date is missing or in the future", () => {
    expect(backfillAcceptanceDate(null, null, today)).toBe(today)
    expect(backfillAcceptanceDate("2030-01-01", null, today)).toBe(today)
  })
  it("never goes before the quotation date", () => expect(backfillAcceptanceDate("2025-01-01", "2025-06-01", today)).toBe("2025-06-01"))
})

describe("classifyBackfill", () => {
  it("accepts sent, approved and expired primaries", () => {
    for (const s of ["sent", "approved", "expired"] as const) expect(classifyBackfill({ primaryStatus: s, acceptedOtherId: null }).action).toBe("accept")
  })
  it("switches primary when another quotation is already accepted", () => {
    expect(classifyBackfill({ primaryStatus: "sent", acceptedOtherId: "x" }).action).toBe("switch_primary")
    expect(classifyBackfill({ primaryStatus: null, acceptedOtherId: "x" }).action).toBe("switch_primary")
  })
  it("skips drafts, missing primaries and dead quotations for review", () => {
    for (const s of ["draft", "pending_approval", "rejected", "void", null] as const) expect(classifyBackfill({ primaryStatus: s, acceptedOtherId: null }).action).toBe("skip")
  })
})
