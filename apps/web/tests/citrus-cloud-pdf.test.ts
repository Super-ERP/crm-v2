import { describe, expect, it } from "vitest"

import type { QuotationDocument } from "@/app/(app)/quotations/actions"
import { citrusCloudDocumentDefinition, renderCitrusCloudPdf } from "@/lib/citrus-cloud-pdf"

const description = "# Professional Services\n\nConfigure existing Cloudera nodes from self sign to authorised SSL cert (Total 12 nodes)\n\n*Estimate: 2-3 man-days (weekend/after business hour services)*\n\n- Production (12 nodes)\n- SSL certs to be provided by customer\n\n**End User: AEON Credit (M) Sdn Bhd**\n\n++Underlined term++"

function documentWithLines(count: number): QuotationDocument {
  return {
    quotation: {
      quoteNumber: "Q10002-1", quoteDate: "2026-09-22", createdAt: new Date("2026-09-22"), validUntil: "2026-10-22",
      currency: "MYR", subtotal: "9100.00", taxTotal: "0.00", total: "9100.00", taxRateSnapshot: "0.000",
      notes: "All prices quoted are in MYR and is net to Quandatics. Excluded merchant, bank charges or additional taxation.",
      delivery: "14 working-days upon PO", paymentTerm: "45 Days",
    },
    lines: Array.from({ length: count }, (_, index) => ({
      id: `line-${index + 1}`, description, sku: null, quantity: "1.000", uom: "unit",
      unitPrice: "9100.00", lineSubtotal: "9100.00", lineTotal: "9100.00",
    })),
    entityName: "CITRUS CLOUD SDN BHD", projectName: "NTT DATA opportunity",
    preparedBy: { name: "Finance Team", email: "finance@example.com" },
    company: { registrationNo: "202201014400", address: "Kuala Lumpur", phone: "+603-2857 8098", email: "contact@example.com", website: "example.com" },
    account: { name: "NTT DATA MALAYSIA SDN BHD", address: { line1: "Level 11, 1 First Avenue", city: "Petaling Jaya", country: "Malaysia" } },
    contact: { name: "ENG CHEE SIONG", email: "eng@example.com" },
  } as QuotationDocument
}

describe("Citrus Cloud PDF", () => {
  it("retains the reference layout sections and Markdown styles", () => {
    const definition = citrusCloudDocumentDefinition(documentWithLines(1))
    const content = JSON.stringify(definition.content)
    expect(content).toContain("QUOTATION")
    expect(content).toContain("Professional Services")
    expect(content).toContain("Total (Inclusive of SST)")
    expect(content).toContain('"italics":true')
    expect(content).toContain('"decoration":"underline"')
    expect(content.indexOf("Professional Services")).toBeLessThan(content.indexOf("Total (excl. of SST)"))
  })

  it("paginates six long items before totals with a native PDF table", async () => {
    const pdf = await renderCitrusCloudPdf(documentWithLines(6))
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(2)
  })

  it("continues an unusually long item across pages", async () => {
    const doc = documentWithLines(1)
    doc.lines[0]!.description = `# Professional Services\n\n${"Cloudera node configuration and certificate validation. ".repeat(240)}`
    const pdf = await renderCitrusCloudPdf(doc)
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length).toBeGreaterThan(1)
  })
})
