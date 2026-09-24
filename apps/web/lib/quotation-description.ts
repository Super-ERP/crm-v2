import MarkdownIt from "markdown-it"
import markdownItIns from "markdown-it-ins"

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false })
  .use(markdownItIns)

/** Shared, HTML-escaped Markdown rendering for quotation previews and templates. */
export function renderQuotationDescriptionHtml(value: string): string {
  return markdown.render(value)
}

/** A leading Markdown heading becomes a section row in the Citrus Cloud document. */
export function splitQuotationDescriptionTitle(value: string): { title: string | null; body: string } {
  const match = /^#\s+([^\n]+)\n?/.exec(value)
  return match
    ? { title: match[1].trim(), body: value.slice(match[0].length).trimStart() }
    : { title: null, body: value }
}
