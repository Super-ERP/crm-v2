import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync, writeFileSync } from "node:fs"
import type { QuotationDocument } from "../../app/(app)/quotations/actions"
import { QmQuotationDocument } from "../../app/(app)/quotations/[id]/preview/qm-quotation-document"
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


process.chdir("../..")
const outDir = process.argv[2]
if (!outDir) throw new Error("Pass an output directory")
const css = readFileSync("apps/web/app/globals.css", "utf8").replace(/^@import[^;]+;/gm, "")
const cases: Array<{name: string; count: number; description?: string; notes?: string; terms?: string}> = [
  {name: "short", count: 1},
  {name: "discount-short", count: 2},
  {name: "discount-multi-page", count: 30},
  ...[10, 11, 12, 13, 14].map(count => ({name: `boundary-${count}`, count})),
  {name: "multi-page", count: 30},
  {name: "long-description", count: 1, description: Array.from({length: 100}, (_, i) => `Paragraph${i + 1} Implementation services and support for the project.`).join("\n\n")},
  {name: "long-notes", count: 1, notes: Array.from({length: 80}, (_, i) => `${i + 1}. Note${i + 1} Contract conditions for this quotation.`).join("\n")},
  {name: "long-terms", count: 1, terms: Array.from({length: 100}, (_, i) => `Term${i + 1} Payment and delivery conditions for this quotation.`).join("\n")},
]
for (const template of ["qm", "qa"] as const) {
 for (const fixture of cases) {
  const doc = documentWithTax("8.000", null)
  doc.lines = Array.from({length: fixture.count}, (_, i) => ({id: String(i), description: fixture.description ?? `Service ${i + 1}\nImplementation and support services`, quantity: "1", uom: "Unit", unitPrice: "100", discountAmount: fixture.name.startsWith("discount-") ? "10" : "0", lineSubtotal: fixture.name.startsWith("discount-") ? "90" : "100"})) as QuotationDocument["lines"]
  if (fixture.name === "discount-short") {
    doc.lines = [
      {id: "1", description: "1. Subsidiary Set Up\n2. Intercompany Function Implementation\n3. SST Implementation\n4. E-Invoice Implementation", quantity: "11", uom: "Mandays", unitPrice: "1800", discountAmount: "1980", lineSubtotal: "17820"},
      {id: "2", description: "Annual Managed Services (AMS)\n- Engineering support including SST and E-Invoice", quantity: "1", uom: "Time", unitPrice: "3465", discountAmount: "346.50", lineSubtotal: "3118.50"},
    ] as QuotationDocument["lines"]
    Object.assign(doc.quotation, {subtotal: "20938.50", taxTotal: "1675.08", total: "22613.58"})
  }
  doc.quotation.notes = fixture.notes ?? "1. Prices valid for the quotation period.\n2. Work begins after acceptance."
  doc.company.quoteFooter = fixture.terms ?? "Payment due within 30 days."
  doc.company.bankDetails = "Sample payment details."
  doc.company.phone = "+60 3 8681 9808"
  doc.company.email = template === "qa" ? "training@quandatics.com" : "contact@quandatics.com"
  doc.company.website = template === "qm" ? "www.quandatics.com" : null
  if(template === "qa") doc.company.legalName = "Quandatics Academy Sdn Bhd"
  let html = renderToStaticMarkup(createElement(QmQuotationDocument, {doc, template}))
  const asset = template === "qa" ? "qa-academy-logo.png" : "qm-quandatics-logo.png"
  const dataUri = "data:image/png;base64," + readFileSync(`apps/web/public/${asset}`).toString("base64")
  html = html.replace(`src="/${asset}"`, `src="${dataUri}"`)
  writeFileSync(`${outDir}/${template}-${fixture.name}.html`, `<!doctype html><html><head><style>body {margin:0} ${css}</style></head><body><main>${html}</main></body></html>`)
 }
}
