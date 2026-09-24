import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { QuotationDocument } from "@/app/(app)/quotations/actions"
import { EntityQuotationDocument } from "@/app/(app)/quotations/[id]/preview/entity-quotation-document"
import { ExternalQuotationDocument } from "@/app/(app)/quotations/[id]/preview/external-quotation-document"

const doc = {
    quotation: {
    quoteNumber: "Q-1",
    quoteDate: "2026-08-04",
    createdAt: new Date("2026-08-04T00:00:00Z"),
    validUntil: null,
    currency: "MYR",
    subtotal: "100.00",
    taxTotal: "8.00",
    total: "108.00",
      taxRateSnapshot: "8.000",
      notes: "Saved customer note",
      delivery: "14 days",
      paymentTerm: "30 days",
    },
  lines: [],
  entityName: "CITRUS CLOUD SDN BHD",
  entityCode: "CC",
  entitySlug: "citrus-cloud",
  projectName: "Gitlab Services",
  preparedBy: { name: "Finance Team", email: "finance@example.com" },
  pdfTemplateKey: "cc",
  accountQuotationTemplateCode: null,
  company: {
    address: "A-08-01, EKOCHERAS",
    registrationNo: "202201014400 (1460097-U)",
    phone: "+603-2857 8098",
    email: "contact@example.com",
    website: "www.example.com",
    bankDetails: null,
    quoteFooter: null,
    hasLogo: true,
  },
   account: {
    name: "Recipient Account",
    code: "REC",
    phone: "+6012 345 6789",
    address: { line1: "A-08-01", city: "Kuala Lumpur", country: "Malaysia" },
  },
   contact: { name: "Ada Contact", email: "ada@example.com", phone: "+6012" },
} as unknown as QuotationDocument

describe("EntityQuotationDocument", () => {
  it("renders CC branding and the tax rate from the quotation snapshot", () => {
    const html = renderToStaticMarkup(
      createElement(EntityQuotationDocument, { doc, template: "cc" })
    )

    expect(html).toContain('src="/api/tenant-logo?v=none"')
    expect(html).toContain("Item")
    expect(html).toContain("SKU")
    expect(html).toContain("Subtotal")
    expect(html).toContain("SST @ 8%")
    expect(html).toContain("Ada Contact")
    expect(html).toContain("14 days")
    expect(html).toContain("30 days")
    expect(html).toContain("Saved customer note")
  })

  it("renders saved terms and attention contact in external templates", () => {
    const html = renderToStaticMarkup(
      createElement(ExternalQuotationDocument, {
        doc,
        template: {
          code: "external",
          label: "External",
          legacyTemplateCode: null,
          renderMode: "html",
          htmlTemplate:
            "<p>{{customerContact}}|{{customerAddress}}|{{delivery}}|{{paymentTerm}}|{{notes}}|{{quoteDate}}|{{subtotal}}|{{taxLabel}}|{{companyPhone}}</p>",
          cssTemplate: null,
        },
      })
    )

    expect(html).toContain(
      "Ada Contact|A-08-01, Kuala Lumpur, Malaysia|14 days|30 days|Saved customer note|04/08/2026|100.00|SST @ 8%|+603-2857 8098"
    )
  })

  it("places a leading Citrus Cloud description title above the priced row", () => {
    const withLine = {
      ...doc,
      lines: [{
        id: "line-1",
        description: "# Professional Services\n\nConfigure Cloudera nodes\n\n*Estimate: 2-3 man-days*",
        sku: null,
        quantity: "1",
        uom: "unit",
        unitPrice: "9000.00",
        lineSubtotal: "9000.00",
        lineTotal: "9000.00",
      }],
    } as QuotationDocument
    const html = renderToStaticMarkup(createElement(EntityQuotationDocument, { doc: withLine, template: "cc" }))
    expect(html.indexOf("Professional Services")).toBeLessThan(html.indexOf("Configure Cloudera nodes"))
    expect(html).toContain('background-color:#fff4d6')
    expect(html).toContain('print-color-adjust:exact')
    expect(html).toContain('data-quotation-section-title')
    expect(html).toContain('data-quotation-section-row')
    expect(html).toContain('data-quotation-description')
    expect(html).toContain('data-quotation-lines')
    expect(html).toContain('data-quotation-line-group')
    expect(html).toContain('class="avoid-break flex')
    expect(html).toContain("<em>Estimate: 2-3 man-days</em>")
  })

  it("keeps each Citrus Cloud title and item in its own print group", () => {
    const lines = Array.from({ length: 6 }, (_, index) => ({
      id: `line-${index + 1}`,
      description: `# Service ${index + 1}\n\nDetails for item ${index + 1}`,
      sku: null,
      quantity: "1",
      uom: "unit",
      unitPrice: "0.00",
      lineSubtotal: "0.00",
      lineTotal: "0.00",
    }))
    const html = renderToStaticMarkup(createElement(EntityQuotationDocument, {
      doc: { ...doc, lines } as QuotationDocument,
      template: "cc",
    }))
    expect(html.match(/data-quotation-line-group/g)).toHaveLength(6)
    expect(html.indexOf("Service 6")).toBeLessThan(html.indexOf("Total (excl. of SST)"))
  })
})
