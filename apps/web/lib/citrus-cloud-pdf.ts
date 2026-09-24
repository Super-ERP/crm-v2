import pdfmake from "pdfmake"
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces"
import MarkdownIt from "markdown-it"
import markdownItIns from "markdown-it-ins"

import type { QuotationDocument } from "@/app/(app)/quotations/actions"
import { splitQuotationDescriptionTitle } from "@/lib/quotation-description"
import { formatMalaysianPhone } from "@/lib/format"

const PAGE_WIDTH = 595.28
const PAGE_MARGIN = 30
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2
const LINE_WIDTHS = [36, 30, 202, 36, 35, 68, 62, 66.28]
const INK = "#26313d"
const MUTED = "#66717e"
const RULE = "#56616d"
const HIGHLIGHT = "#fff3d6"
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false }).use(markdownItIns)

pdfmake.addFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
})
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy((path) => /^Helvetica(?:-Bold|-Oblique|-BoldOblique)?$/.test(path))

type Logo = { data: string }

function date(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed)
}

function money(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(amount) ? amount : 0
  )
}

function address(doc: QuotationDocument): string {
  const value = doc.account?.address
  if (!value) return ""
  return [
    value.line1,
    value.line2,
    [value.postcode, value.city, value.state].filter(Boolean).join(" "),
    value.country,
  ].filter(Boolean).join("\n")
}

function inlineRuns(value: string): Content[] {
  const inline = markdown.parseInline(value, {})[0]
  const runs: Content[] = []
  let bold = 0
  let italics = 0
  let underline = 0
  for (const token of inline?.children ?? []) {
    if (token.type === "strong_open") bold++
    else if (token.type === "strong_close") bold--
    else if (token.type === "em_open") italics++
    else if (token.type === "em_close") italics--
    else if (token.type === "ins_open") underline++
    else if (token.type === "ins_close") underline--
    else if (token.type === "text" || token.type === "code_inline") {
      runs.push({
        text: token.content,
        bold: bold > 0,
        italics: italics > 0,
        decoration: underline > 0 ? "underline" : undefined,
        color: bold > 0 ? INK : italics > 0 ? MUTED : undefined,
      })
    } else if (token.type === "softbreak" || token.type === "hardbreak") {
      runs.push({ text: "\n" })
    }
  }
  return runs
}

function description(value: string): Content {
  const blocks: Content[] = []
  let listDepth = 0
  let heading = false
  for (const token of markdown.parse(value, {})) {
    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") listDepth++
    if (token.type === "bullet_list_close" || token.type === "ordered_list_close") listDepth--
    if (token.type === "heading_open") heading = true
    if (token.type === "heading_close") heading = false
    if (token.type !== "inline") continue
    const prefix = listDepth > 0 ? [{ text: "- ", color: MUTED }] : []
    blocks.push({
      text: [...prefix, ...inlineRuns(token.content)],
      bold: heading,
      color: listDepth > 0 ? MUTED : INK,
      margin: [0, 0, 0, listDepth > 0 ? 1 : 6],
      lineHeight: 1.16,
    })
  }
  return { stack: blocks.length ? blocks : [{ text: "" }] }
}

function customerMeta(doc: QuotationDocument): Content {
  const quote = doc.quotation
  const rows = [
    ["Ref. No", quote.quoteNumber],
    ["Date", date(quote.quoteDate ?? quote.createdAt)],
    ["Currency", quote.currency],
    ["Delivery", quote.delivery ?? "—"],
    ["Payment Term", quote.paymentTerm ?? "—"],
    ["Quote Validity", date(quote.validUntil)],
    ["Price", quote.currency],
  ]
  return {
    columns: [
      {
        width: 340,
        stack: [
          { columns: [{ width: 33, text: "To:" }, { width: "*", stack: [
            { text: doc.account?.name ?? "—", bold: true, margin: [0, 0, 0, 2] },
            { text: address(doc) },
          ] }], margin: [0, 0, 0, 24] },
          { columns: [{ width: 33, text: "Attn:" }, { width: "*", text: doc.contact?.name ?? "—" }] },
          { columns: [{ width: 33, text: "Project:" }, { width: "*", text: doc.projectName }] },
          { columns: [{ width: 33, text: "Email:" }, { width: "*", text: doc.contact?.email ?? "—" }] },
        ],
      },
      {
        width: CONTENT_WIDTH - 340,
        table: {
          widths: [76, 8, "*"],
          body: rows.map(([label, value]) => [
            { text: label, margin: [0, 0, 0, 3] },
            { text: ":" },
            { text: value },
          ]),
        },
        layout: "noBorders",
      },
    ],
    columnGap: 0,
    margin: [0, 5, 0, 29],
    unbreakable: true,
  }
}

function lineTable(doc: QuotationDocument): Content {
  const currency = doc.quotation.currency
  const header = ["Item", "SKU", "Description", "QTY", "UOM", `Unit Price\n${currency}`, `Subtotal\n${currency}`, `Total Price\n${currency}`]
    .map((text, index) => ({ text, alignment: index < 3 ? "left" as const : "right" as const, fontSize: 8, margin: [0, 2, 0, 4] as [number, number, number, number] }))
  const body: TableCell[][] = [header]
  for (const [index, line] of doc.lines.entries()) {
    const { title, body: detail } = splitQuotationDescriptionTitle(line.description)
    const item: Content[] = []
    if (title) {
      item.push({
        table: { widths: ["*"], body: [[{ text: title, bold: true, fillColor: HIGHLIGHT, margin: [LINE_WIDTHS[0] + LINE_WIDTHS[1], 2, 0, 2] }]] },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      })
    }
    item.push({
      table: {
        widths: LINE_WIDTHS,
        body: [[
          { text: String(index + 1) },
          { text: line.sku ?? "" },
          description(detail),
          { text: String(Number(line.quantity)), alignment: "right" },
          { text: line.uom ?? "", alignment: "right" },
          { text: money(line.unitPrice), alignment: "right" },
          { text: money(line.lineSubtotal), alignment: "right" },
          { text: money(line.lineTotal), alignment: "right" },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 0 },
    })
    body.push([{ colSpan: 8, stack: item, margin: [0, 0, 0, 10] }, {}, {}, {}, {}, {}, {}, {}])
  }
  return {
    table: { widths: LINE_WIDTHS, headerRows: 1, dontBreakRows: true, body },
    layout: {
      hLineWidth: (index: number) => index === 1 ? 0.8 : 0,
      hLineColor: () => RULE,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    fontSize: 8,
  }
}

function closing(doc: QuotationDocument): Content {
  const quote = doc.quotation
  const rate = Number(quote.taxRateSnapshot)
  const taxLabel = Number.isFinite(rate) && rate > 0 ? `SST @ ${rate}%` : "SST"
  return {
    unbreakable: true,
    stack: [
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.8, lineColor: RULE }], margin: [0, 0, 0, 3] },
      { columns: [
        { width: 340, text: [{ text: "Note:\n" }, { text: quote.notes ?? "", color: MUTED }], margin: [62, 14, 8, 0] },
        { width: CONTENT_WIDTH - 340, table: { widths: ["*", 64], body: [
          ["Total (excl. of SST)", money(quote.subtotal)],
          [taxLabel, money(quote.taxTotal)],
          ["Total (Inclusive of SST)", money(quote.total)],
        ].map(([label, value]) => [{ text: label, alignment: "right", margin: [0, 6, 0, 6] }, { text: value, alignment: "right", margin: [0, 6, 0, 6] }]) }, layout: "noBorders" },
      ] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.8, lineColor: RULE }], margin: [0, 0, 0, 7] },
      { columns: [
        { width: 340, text: "Please Quote Our Reference Number When Placing An Order", bold: true },
        { width: CONTENT_WIDTH - 340, stack: [
          { text: "Prepared by," },
          { text: doc.preparedBy?.name ?? "", bold: true },
          { text: doc.preparedBy?.email ?? "" },
        ] },
      ] },
      { text: "This Quotation is computer generated and no signature is required.", italics: true, fontSize: 8, color: MUTED, margin: [0, 30, 0, 0] },
    ],
    fontSize: 8,
  }
}

export function citrusCloudDocumentDefinition(doc: QuotationDocument, logo?: Logo | null): TDocumentDefinitions {
  const header: Content = logo
    ? { image: logo.data, fit: [165, 57] }
    : { text: "CITRUS", fontSize: 25, bold: true, color: "#d99537" }
  return {
    pageSize: "A4",
    pageMargins: [PAGE_MARGIN, 58, PAGE_MARGIN, 35],
    defaultStyle: { font: "Helvetica", fontSize: 8, color: INK },
    footer: (page) => ({
      columns: [
        { width: "*", text: `${doc.entityName}  w: ${doc.company.website ?? ""}    e: ${doc.company.email ?? ""}    p: ${formatMalaysianPhone(doc.company.phone)}`, color: MUTED },
        { width: 20, text: String(page), alignment: "right", color: MUTED },
      ],
      margin: [PAGE_MARGIN, 0, PAGE_MARGIN, 0],
      fontSize: 8,
    }),
    content: [
      { columns: [
        { width: 265, stack: [header] },
        { width: "*", stack: [
          { text: [
            { text: doc.entityName.toUpperCase(), bold: true },
            { text: doc.company.registrationNo ? `  ${doc.company.registrationNo}` : "", fontSize: 8 },
          ], fontSize: 10 },
          { text: doc.company.address ?? "", margin: [0, 2, 0, 0] },
        ] },
      ], margin: [0, 0, 0, 8], unbreakable: true },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.8, lineColor: RULE }] },
      { text: "QUOTATION", bold: true, fontSize: 12, alignment: "center", margin: [0, 1, 0, 0] },
      { canvas: [
        { type: "line", x1: 0, y1: 0, x2: 33, y2: 0, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 274, y1: 0, x2: 307, y2: 0, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 0, y1: 0, x2: 0, y2: 13, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 307, y1: 0, x2: 307, y2: 13, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 0, y1: 82, x2: 33, y2: 82, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 274, y1: 82, x2: 307, y2: 82, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 0, y1: 69, x2: 0, y2: 82, lineWidth: 0.8, lineColor: RULE },
        { type: "line", x1: 307, y1: 69, x2: 307, y2: 82, lineWidth: 0.8, lineColor: RULE },
      ], absolutePosition: { x: PAGE_MARGIN - 4, y: 135 } },
      customerMeta(doc),
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.8, lineColor: RULE }], margin: [0, 0, 0, 4] },
      lineTable(doc),
      closing(doc),
    ],
  }
}

export async function renderCitrusCloudPdf(doc: QuotationDocument, logo?: Logo | null): Promise<Buffer> {
  return pdfmake.createPdf(citrusCloudDocumentDefinition(doc, logo)).getBuffer()
}
