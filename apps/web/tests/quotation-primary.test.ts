import { describe, expect, it } from "vitest"
import { canSetQuotationPrimary } from "@/lib/quotation-primary"

describe("primary quotation selection", () => {
  it.each(["draft", "pending_approval", "approved", "sent", "accepted", "rejected", "expired", "void"])("allows non-primary %s quotations without changing status", status => {
    const quotation = { status, isPrimary: false, deletedAt: null }
    expect(canSetQuotationPrimary(quotation, true)).toBe(true)
    expect(quotation.status).toBe(status)
  })
  it("preserves permission, archive and already-primary guards", () => {
    expect(canSetQuotationPrimary({isPrimary:false,deletedAt:null},false)).toBe(false)
    expect(canSetQuotationPrimary({isPrimary:false,deletedAt:new Date()},true)).toBe(false)
    expect(canSetQuotationPrimary({isPrimary:true,deletedAt:null},true)).toBe(false)
  })
})
