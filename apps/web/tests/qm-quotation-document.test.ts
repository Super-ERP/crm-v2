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

describe("QA quotation document", () => {
  it("uses the QM layout with the Academy logo and company details", () => {
    const doc = documentWithTax("8.000", null)
    doc.company.legalName = "Quandatics Academy Sdn Bhd"
    doc.company.registrationNo = "201701022646 (1236812-W)"
    doc.company.address = "A-08-01 & 02, Ekocheras, No. 693, Jalan Cheras Batu 5,\n56000 Kuala Lumpur."
    doc.company.phone = "+60 3 8681 9808"
    doc.company.email = "training@quandatics.com"
    const html = renderToStaticMarkup(createElement(QmQuotationDocument, { doc, template: "qa" }))
    expect(html).toContain('data-template="qa"')
    expect(html).toContain('src="/qa-academy-logo.png"')
    expect(html).toContain("Quandatics Academy Sdn Bhd")
    expect(html).toContain("201701022646 (1236812-W)")
    expect(html).toContain("training@quandatics.com")
    expect(html).toContain("qm-lines")
    expect(html).toContain("SST@8%")
  })
})


describe.each(["qm", "qa"] as const)("%s quotation sign-off", (template) => {
  it("follows notes, terms, and payment details before the separate footer", () => {
    const doc = documentWithTax("8.000", null)
    doc.quotation.notes = "Final quotation note."
    doc.company.quoteFooter = "Final terms."
    doc.company.bankDetails = "Final payment details."
    const html = renderToStaticMarkup(createElement(QmQuotationDocument, { doc, template }))
    const signoff = html.indexOf('class="qm-signoff"')
    expect(signoff).toBeGreaterThan(html.indexOf("Final quotation note."))
    expect(signoff).toBeGreaterThan(html.indexOf("Final terms."))
    expect(signoff).toBeGreaterThan(html.indexOf("Final payment details."))
    expect(html.indexOf("This Quotation is computer generated")).toBeGreaterThan(signoff)
    expect(html.indexOf('class="qm-footer qm-footer-screen"')).toBeGreaterThan(signoff)
    expect(html).not.toContain("qm-signoff-page")
    expect(html.match(/class="qm-page /g)).toHaveLength(1)
  })
})



describe("QA/QM print footer", () => {
  it("puts tenant contact details in the page margin instead of an overlapping fixed footer", () => {
    const doc = documentWithTax("8.000", null)
    doc.company.email = "contact@quandatics.com"
    const html = renderToStaticMarkup(createElement(QmQuotationDocument, { doc }))
    expect(html).toContain("@page qm-quotation")
    expect(html).toContain("@bottom-left")
    expect(html).toContain("contact@quandatics.com")
    expect(html).not.toContain('class="qm-footer qm-footer-print"')
  })

  it("escapes company text so it cannot terminate a CSS string or style element", () => {
    const doc = documentWithTax("8.000", null)
    doc.company.legalName = 'Company "</style><script>alert(1)</script>\\\nEnd'
    const html = renderToStaticMarkup(createElement(QmQuotationDocument, { doc }))
    const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1]
    expect(css).toBeDefined()
    expect(css).not.toContain("</style>")
    expect(css).not.toContain("<script>")
    expect(css).toContain(String.raw`\22 `)
    expect(css).toContain(String.raw`\3c `)
    expect(css).toContain(String.raw`\5c `)
    expect(css).toContain(String.raw`\a `)
  })
})
