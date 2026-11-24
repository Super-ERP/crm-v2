import { renderQuotationDescriptionHtml } from "@/lib/quotation-description"

export type QuotationTemplateLineContext = {
  sku?: string | null
  description?: string | null
  quantity?: string | number | null
  uom?: string | null
  unitPrice?: string | number | null
  lineSubtotal?: string | number | null
  lineTotal?: string | number | null
}

export type QuotationTemplateContext = {
  lines?: readonly QuotationTemplateLineContext[]
  [key: string]: unknown
}

export type RenderedQuotationTemplate = {
  html: string
  css: string
}

const TOKEN_PATTERN = /{{\s*([^{}]+?)\s*}}/g

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function displayValue(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function resolveToken(token: string, context: QuotationTemplateContext): unknown {
  const normalized = token.trim()
  if (normalized === "this") return context
  const path = normalized.startsWith("this.") ? normalized.slice(5) : normalized
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") {
      return (value as Record<string, unknown>)[key]
    }
    return undefined
  }, context)
}

function renderHtmlTokens(template: string, context: QuotationTemplateContext, line = false): string {
  return template.replace(TOKEN_PATTERN, (_match, token: string) => {
    const value = displayValue(resolveToken(token, context))
    if (line && (token.trim() === "description" || token.trim() === "this.description")) {
      return renderQuotationDescriptionHtml(value)
    }
    return escapeHtml(value)
  })
}

function renderLineBlocks(template: string, context: QuotationTemplateContext): string {
  return template.replace(
    /{{\s*#each\s+lines\s*}}([\s\S]*?){{\s*\/each\s*}}/g,
    (_match, body: string) =>
      (context.lines ?? [])
        .map((line, index) =>
          renderHtmlTokens(body, {
            ...context,
            ...line,
            "@index": index + 1,
            index: index + 1,
            this: line,
          }, true)
        )
        .join("")
  )
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|iframe|object|embed|form|link|meta|base)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|iframe|object|embed|form|link|meta|base)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, "")
}

function sanitizeCss(css: string): string {
  return css
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/url\s*\([\s\S]*?\)/gi, "")
    .replace(/expression\s*\([\s\S]*?\)/gi, "")
    .replace(/behavior\s*:[^;{}]+;?/gi, "")
    .replace(/-moz-binding\s*:[^;{}]+;?/gi, "")
    .replace(/<\/?style\b[^>]*>/gi, "")
    .replace(/<\/style/gi, "\\3C/style")
}

export function renderQuotationTemplate({
  htmlTemplate,
  cssTemplate,
  context,
}: {
  htmlTemplate: string
  cssTemplate?: string | null
  context: QuotationTemplateContext
}): RenderedQuotationTemplate {
  const withLines = renderLineBlocks(htmlTemplate, context)
  return {
    html: sanitizeHtml(renderHtmlTokens(withLines, context)),
    css: sanitizeCss(cssTemplate ?? ""),
  }
}

/**
 * Custom HTML templates written before the address was a token never print the
 * customer's address. When a template has no `customerAddress` token, place it
 * right after the customer code (or name) so the address always appears.
 */
export function ensureCustomerAddress(htmlTemplate: string): string {
  if (/{{\s*customerAddress\s*}}/.test(htmlTemplate)) return htmlTemplate
  const after = (token: string) => new RegExp(`{{\\s*${token}\\s*}}`)
  const anchor = after("customerCode").test(htmlTemplate) ? "customerCode" : after("customerName").test(htmlTemplate) ? "customerName" : null
  if (!anchor) return htmlTemplate
  return htmlTemplate.replace(after(anchor), (m) => `${m}<br>{{customerAddress}}`)
}

/**
 * Custom templates without a `notes` token never print the quotation notes
 * (bank details, terms). Append a notes block at the end when notes exist.
 */
export function ensureNotes(htmlTemplate: string, cssTemplate: string | null | undefined, notes: string | null | undefined) {
  const css = cssTemplate ?? ""
  if (!notes?.trim() || /{{\s*notes\s*}}/.test(htmlTemplate)) return { htmlTemplate, cssTemplate: css }
  return {
    htmlTemplate: `${htmlTemplate}<div class="qt-auto-notes">{{notes}}</div>`,
    cssTemplate: `${css}\n.qt-auto-notes{white-space:pre-line;padding:12px 8px;font-size:11px;line-height:1.5;}`,
  }
}
