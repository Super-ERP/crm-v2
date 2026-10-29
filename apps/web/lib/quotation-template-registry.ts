import { and, eq } from "drizzle-orm"
import type { Tx } from "@/lib/actions"
import { quotationTemplates } from "@/db/schema"
import { normalizeQuotationPdfTemplateCode } from "@/lib/quotation-pdf-template"

export type QuotationTemplateRenderMode = "builtin" | "html" | string

export type QuotationTemplateSpec = {
  code: string
  label: string
  legacyTemplateCode: string | null
  renderMode: string
  htmlTemplate: string | null
  cssTemplate: string | null
}

export async function getActiveQuotationTemplateByCode(
  tx: Tx,
  tenantId: string,
  rawCode: string | null | undefined
): Promise<QuotationTemplateSpec | null> {
  const code = normalizeQuotationPdfTemplateCode(rawCode)
  if (!code) return null
  const [row] = await tx
    .select({
      code: quotationTemplates.code,
      label: quotationTemplates.label,
      legacyTemplateCode: quotationTemplates.legacyTemplateCode,
      renderMode: quotationTemplates.renderMode,
      htmlTemplate: quotationTemplates.htmlTemplate,
      cssTemplate: quotationTemplates.cssTemplate,
    })
    .from(quotationTemplates)
    .where(
      and(
        eq(quotationTemplates.organizationId, tenantId),
        eq(quotationTemplates.code, code),
        eq(quotationTemplates.isActive, true)
      )
    )
    .limit(1)
  return row ?? null
}

export async function listActiveQuotationTemplateCodes(
  tx: Tx,
  tenantId: string
): Promise<Set<string>> {
  const rows = await tx
    .select({ code: quotationTemplates.code })
    .from(quotationTemplates)
    .where(
      and(
        eq(quotationTemplates.organizationId, tenantId),
        eq(quotationTemplates.isActive, true)
      )
    )
  return new Set(rows.map((row) => row.code))
}
