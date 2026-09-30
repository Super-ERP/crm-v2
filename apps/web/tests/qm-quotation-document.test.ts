import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { QuotationDocument } from "@/app/(app)/quotations/actions"
import { QmQuotationDocument } from "@/app/(app)/quotations/[id]/preview/qm-quotation-document"

function documentWithTax(
  taxRateSnapshot: string | null,
  taxSetting: { name: string; ratePercent: string } | null
): QuotationDocument {
  return {
    quotation: {
      quoteNumber: "Q-1",
      quoteDate: "2026-09-30",
      createdAt: new Date("2026-09-30T00:00:00Z"),
      validUntil: null,
      currency: "MYR",
      subtotal: "100.00",
      discountTotal: "0.00",
      taxTotal: "8.00",
      total: "108.00",
      taxRateSnapshot,
      notes: null,
      delivery: null,
      paymentTerm: null,
    },
    taxSetting,
    lines: [],
    entityName: "QUANDATICS (M) SDN BHD",
    company: {
      legalName: "QUANDATICS (M) SDN BHD",
      address: null,
      registrationNo: null,
      sstRegistrationNo: null,
      phone: null,
      email: null,
      website: null,
      bankDetails: null,
      quoteFooter: null,
      hasLogo: false,
    },
    account: null,
    contact: null,
  } as unknown as QuotationDocument
}

describe("QM quotation document", () => {
  it("uses the selected tax name when a draft has no frozen rate", () => {
    const html = renderToStaticMarkup(
      createElement(QmQuotationDocument, {
        doc: documentWithTax(null, { name: "SST 8%", ratePercent: "8.000" }),
      })
    )
    expect(html).toContain("SST 8%")
    expect(html).not.toContain("SST@0%")
  })

  it("uses the saved rate for imported quotations without a linked tax setting", () => {
    const html = renderToStaticMarkup(
      createElement(QmQuotationDocument, { doc: documentWithTax("8.000", null) })
    )
    expect(html).toContain("SST@8%")
  })

  it("keeps the frozen rate when a selected setting has since changed", () => {
    const html = renderToStaticMarkup(
      createElement(QmQuotationDocument, {
        doc: documentWithTax("8.000", { name: "SST 10%", ratePercent: "10.000" }),
      })
    )
    expect(html).toContain("SST@8%")
    expect(html).not.toContain("SST 10%")
  })

  it("does not invent a zero rate when no tax was selected", () => {
    const html = renderToStaticMarkup(
      createElement(QmQuotationDocument, { doc: documentWithTax(null, null) })
    )
    expect(html).toContain("<strong>Tax</strong>")
    expect(html).not.toContain("SST@0%")
  })

  it("emphasizes the order reference instruction", () => {
    const html = renderToStaticMarkup(
      createElement(QmQuotationDocument, { doc: documentWithTax("8.000", null) })
    )
    expect(html).toContain(
      '<strong class="qm-order-instruction">Please Quote Our Ref No When Placing An Order</strong>'
    )
  })
})
