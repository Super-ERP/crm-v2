import type { QuotationDocument } from "../../actions"
import { QuotationDescription } from "@/components/quotation-description-view"

function date(value: Date | string | null): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed)
}

function money(value: string | number, currency: string): string {
  const amount = new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
  return `${currency}${amount}`
}

function taxLabel(doc: QuotationDocument): string {
  const snapshot = doc.quotation.taxRateSnapshot
  const selected = doc.taxSetting
  // A sent quotation keeps its frozen rate even if the live tax setting is
  // subsequently edited. Drafts use the currently selected setting's name.
  if (selected?.name.trim() && (snapshot == null || Number(snapshot) === Number(selected.ratePercent))) {
    return selected.name.trim()
  }
  const rate = snapshot ?? selected?.ratePercent
  const numericRate = rate == null ? NaN : Number(rate)
  return Number.isFinite(numericRate) ? `SST@${numericRate}%` : "Tax"
}

function addressLines(doc: QuotationDocument): string[] {
  const address = doc.account?.address
  if (!address) return []
  const town = [address.postcode, address.city, address.state]
    .filter(Boolean)
    .join(" ")
  return [address.line1, address.line2, town]
    .filter((line): line is string => Boolean(line?.trim()))
}

function parseNotes(value: string | null | undefined): string[] {
  const source = (value ?? "").trim()
  if (!source) return []
  const lines = source.split(/\r?\n/)
  const items: string[] = []
  let current = ""
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      if (current) {
        items.push(current)
        current = ""
      }
      continue
    }
    const item = line.match(/^(?:\d+[.)]|[-*•])\s+(.*)$/)
    if (item) {
      if (current) items.push(current)
      current = item[1]
    } else {
      current = current ? `${current} ${line}` : line
    }
  }
  if (current) items.push(current)
  return items
}

function formatQmNote(value: string): string {
  return value.replace(/[\t ]+(https?:\/\/\S+)/g, "\n$1")
}

function subjectAndDescription(value: string, index: number): { subject: string | null; description: string } {
  if (index !== 0) return { subject: null, description: value }
  const [firstLine, ...rest] = value.split(/\r?\n/)
  const match = firstLine.match(/^\s*Subject:\s*(.*)$/i)
  if (!match) return { subject: null, description: value }
  return { subject: match[1].trim(), description: rest.join("\n").trim() }
}

function Footer({ doc, screen = false }: { doc: QuotationDocument; screen?: boolean }) {
  const website = doc.company.website?.replace(/^https?:\/\//i, "")
  const companyName = doc.company.legalName || doc.entityName
  const footerName = /^QUANDATICS \(M\) SDN BHD$/i.test(companyName)
    ? "Quandatics (M) Sdn Bhd"
    : companyName
  return (
    <footer className={`qm-footer${screen ? " qm-footer-screen" : " qm-footer-print"}`}>
      <span className="qm-footer-contact">
        {footerName}
        {website ? ` | w: ${website}` : ""}
        {doc.company.email ? ` | e: ${doc.company.email}` : ""}
        {doc.company.phone ? ` | p: ${doc.company.phone}` : ""}
      </span>
      <strong>CONFIDENTIAL</strong>
    </footer>
  )
}

export function QmQuotationDocument({ doc, template = "qm" }: { doc: QuotationDocument; template?: "qm" | "qa" }) {
  const quote = doc.quotation
  const notes = parseNotes(quote.notes)
  const currency = quote.currency || "MYR"
  const discount = Number(quote.discountTotal) || 0
  const netSubtotal = Number(quote.subtotal) - discount

  return (
    <div id="quote-doc" data-template={template} className="qm-document">
      <section className="qm-page qm-first-page">
        <header className="qm-company-header">
          <div className="qm-logo-slot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template === "qa" ? "/qa-academy-logo.png" : "/qm-quandatics-logo.png"}
              alt={template === "qa" ? "Quandatics Academy" : "Quandatics Malaysia"}
              className={template === "qa" ? "qm-logo-qa" : undefined}
            />
          </div>
          <div className="qm-company-details">
            <strong>{doc.company.legalName || doc.entityName}</strong>
            {doc.company.registrationNo ? <div>Company Reg No.: {doc.company.registrationNo}</div> : null}
            {doc.company.address ? <div className="qm-company-address">{doc.company.address}</div> : null}
            {doc.company.sstRegistrationNo ? <div className="qm-sst">SST Reg No.: {doc.company.sstRegistrationNo}</div> : null}
          </div>
        </header>

        <h1 className="qm-title">QUOTATION</h1>

        <section className="qm-meta">
          <div className="qm-recipient">
            <div className="qm-recipient-name"><b>To</b><strong>{doc.account?.name ?? ""}</strong></div>
            <div className="qm-address-row"><b>Address</b><div>{addressLines(doc).map((line, i) => <div key={`${i}-${line}`}>{line}</div>)}</div></div>
            <div className="qm-recipient-row"><b>Attn</b><span>{doc.contact?.name ?? ""}</span></div>
            <div className="qm-recipient-row"><b>Tel</b><span>{doc.contact?.phone ?? ""}</span></div>
            <div className="qm-recipient-row"><b>Email</b><span>{doc.contact?.email ?? ""}</span></div>
          </div>
          <div className="qm-quote-meta">
            <div><b>Ref. No</b><span>{quote.quoteNumber}</span></div>
            <div><b>Date</b><span>{date(quote.quoteDate ?? quote.createdAt)}</span></div>
            <div><b>Currency</b><span>{currency}</span></div>
            <div><b>Delivery</b><span>{quote.delivery ?? ""}</span></div>
            <div><b>Payment Term</b><span>{quote.paymentTerm ?? ""}</span></div>
            <div><b>Quote Validity</b><span>{date(quote.validUntil)}</span></div>
            <strong className="qm-order-instruction">Please Quote Our Ref No When Placing An Order</strong>
          </div>
        </section>

        <table className="qm-lines">
          <colgroup>
            <col className="qm-col-item" /><col className="qm-col-description" />
            <col className="qm-col-quantity" /><col className="qm-col-uom" />
            <col className="qm-col-unit-price" /><col className="qm-col-subtotal" />
          </colgroup>
          <thead><tr>
            <th>Item</th><th>Description</th><th>Quantity</th><th>UOM</th><th>Unit Price</th><th>Sub-total</th>
          </tr></thead>
            {doc.lines.map((line, index) => {
              const { subject, description } = subjectAndDescription(line.description, index)
              const qmDescription = description
                .replace(/^([\t ]*)- /gm, "$1\\- ")
                .replace(/^([\t ]*)#(?=\s)/gm, "$1\\#")
              return (
                <tbody key={line.id} className={index % 2 === 1 ? "qm-row-alt" : ""}>
                  <tr>
                    <td className="qm-item-no">{index + 1}</td>
                    <td className="qm-description">
                      {subject ? <div className="qm-subject-label">Subject: {subject}</div> : null}
                      <QuotationDescription value={qmDescription} className="qm-line-description" />
                    </td>
                    <td className="qm-number">{Number(line.quantity).toFixed(2)}</td>
                    <td className="qm-uom">{line.uom ?? ""}</td>
                    <td className="qm-money">{money(line.unitPrice, currency)}</td>
                    <td className="qm-money">{money(line.lineSubtotal, currency)}</td>
                  </tr>
                </tbody>
              )
            })}
        </table>

        <div className="qm-totals">
            {discount > 0 ? <>
              <div><strong>Subtotal</strong><span>{money(quote.subtotal, currency)}</span></div>
              <div><strong>Discount</strong><span>-{money(discount, currency)}</span></div>
            </> : null}
            <div><strong>Total Excluding Tax</strong><span>{money(netSubtotal, currency)}</span></div>
            <div><strong>{taxLabel(doc)}</strong><span>{money(quote.taxTotal, currency)}</span></div>
            <div><strong>Total Including Tax</strong><span>{money(quote.total, currency)}</span></div>
        </div>
        {notes.length ? (
            <section className="qm-notes">
              <strong>Note:</strong>
              <ol>{notes.map((note, index) => <li key={`${index}-${note}`}><QuotationDescription value={formatQmNote(note)} className="qm-note-text" /></li>)}</ol>
            </section>
        ) : null}
        {doc.company.quoteFooter ? <div className="qm-terms"><strong>Terms</strong><div>{doc.company.quoteFooter}</div></div> : null}
        {doc.company.bankDetails ? <div className="qm-terms"><strong>Payment details</strong><div>{doc.company.bankDetails}</div></div> : null}
        <Footer doc={doc} screen />
      </section>

      <section className="qm-page qm-signoff-page">
        <span>Please Quote Our Reference Number When Placing An Order</span>
        <p>This Quotation is computer generated and no signature is required.</p>
        <Footer doc={doc} screen />
      </section>
      <Footer doc={doc} />
    </div>
  )
}
