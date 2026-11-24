import { describe, expect, it } from "vitest"

import { renderQuotationTemplate } from "@/lib/quotation-template-renderer"

describe("renderQuotationTemplate", () => {
  it("renders escaped values and repeated lines while removing unsafe markup", () => {
    const result = renderQuotationTemplate({
      htmlTemplate:
        '<div onclick="alert(1)">{{entityName}}<img src="{{logoUrl}}"><script>alert(1)</script>{{#each lines}}<p>{{@index}} {{description}}</p>{{/each}}</div>',
      cssTemplate: '@import url("https://evil.example/style.css"); .x { color: red; } </style><script>alert(1)</script>',
      context: {
        entityName: "<Trusted Entity>",
        logoUrl: "/api/tenant-logo",
        delivery: "14 days",
        paymentTerm: "30 days",
        lines: [
          { description: "First <service>", quantity: "1", lineTotal: "10.00" },
          { description: "Second", quantity: "2", lineTotal: "20.00" },
        ],
      },
    })

    expect(result.html).toContain("&lt;Trusted Entity&gt;")
    expect(result.html).toContain("1 <p>First &lt;service&gt;</p>")
    expect(result.html).toContain("2 <p>Second</p>")
    expect(result.html).toContain('src="/api/tenant-logo"')
    expect(result.html).not.toContain("<script")
    expect(result.html).not.toContain("onclick")
    expect(result.css).not.toContain("@import")
    expect(result.css).not.toContain("url(")
    expect(result.css).not.toContain("</style>")
  })

  it("renders saved quotation content as ordinary escaped template values", () => {
    const result = renderQuotationTemplate({
      htmlTemplate: "{{delivery}}|{{paymentTerm}}|{{notes}}|{{customerContact}}",
      context: {
        delivery: "14 days",
        paymentTerm: "30 days",
        notes: "Saved <note>",
        customerContact: "Ada Contact",
      },
    })

    expect(result.html).toBe("14 days|30 days|Saved &lt;note&gt;|Ada Contact")
  })

  it("renders formatted line descriptions while escaping user HTML", () => {
    const result = renderQuotationTemplate({
      htmlTemplate: "{{#each lines}}<div>{{description}}</div>{{/each}}",
      context: { lines: [{ description: "**Bold** *italic* ++underlined++\nNext line <script>alert(1)</script>" }] },
    })
    expect(result.html).toContain("<strong>Bold</strong>")
    expect(result.html).toContain("<em>italic</em>")
    expect(result.html).toContain("<ins>underlined</ins>")
    expect(result.html).toContain("Next line &lt;script&gt;alert(1)&lt;/script&gt;")
    expect(result.html).not.toContain("<script>")
  })
})

import { ensureCustomerAddress as ensureCustomerAddressForTest } from '@/lib/quotation-template-renderer'

describe('ensureCustomerAddress', () => {
  it('adds the customer address after the code when a template lacks it', () => {
    const out = ensureCustomerAddressForTest('<td>{{customerName}}<br>{{customerCode}}</td>')
    expect(out).toBe('<td>{{customerName}}<br>{{customerCode}}<br>{{customerAddress}}</td>')
  })
  it('falls back to the name, and leaves templates that already print it alone', () => {
    expect(ensureCustomerAddressForTest('<td>{{ customerName }}</td>')).toContain('{{customerAddress}}')
    const has = '<td>{{customerName}}</td><p>{{customerAddress}}</p>'
    expect(ensureCustomerAddressForTest(has)).toBe(has)
    expect(ensureCustomerAddressForTest('<p>none</p>')).toBe('<p>none</p>')
  })
})

import { ensureNotes as ensureNotesForTest, renderQuotationTemplate as renderForNotesTest } from '@/lib/quotation-template-renderer'

describe('ensureNotes', () => {
  it('appends notes when the template has no notes token and notes exist', () => {
    const r = ensureNotesForTest('<p>x</p>', '', 'Bank: CIMB\nAcc: 1')
    const out = renderForNotesTest({ ...r, context: { notes: 'Bank: CIMB\nAcc: 1' } })
    expect(out.html).toContain('Bank: CIMB')
    expect(out.css).toContain('pre-line')
  })
  it('leaves templates with a notes token or empty notes unchanged', () => {
    expect(ensureNotesForTest('<p>{{notes}}</p>', null, 'n').htmlTemplate).toBe('<p>{{notes}}</p>')
    expect(ensureNotesForTest('<p>x</p>', null, '  ').htmlTemplate).toBe('<p>x</p>')
  })
})
