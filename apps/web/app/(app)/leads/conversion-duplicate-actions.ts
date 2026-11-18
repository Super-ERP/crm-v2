"use server"

import { similarCompanyName } from "@/server/services/company-name-match"
import { sql } from "drizzle-orm"
import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { visibleMemberIds } from "@/lib/access-scope"
import { normalizeRegistrationNumber } from "@/lib/lead-conversion-approval"

/** Returns only collision flags, never another salesperson's account details. */
export async function checkConversionDuplicates(leadId: string, registrationNumber: string, accountCode?: string) {
  return withTenant(PERMISSIONS.LEAD_CONVERT, async (tx, ctx) => {
    const visible = await visibleMemberIds(tx, ctx)
    const scope = visible === null ? sql`true` : visible.length ? sql`owner_member_id IN (${sql.join(visible.map(id => sql`${id}`), sql`,`)})` : sql`false`
    const lead = await tx.execute<{ companyName: string | null; name: string }>(sql`SELECT company_name AS "companyName", name FROM leads WHERE tenant_id=${ctx.tenantId} AND id::text=${leadId} AND deleted_at IS NULL AND ${scope} LIMIT 1`)
    if (!lead.length) throw new Error("Lead not available")
    if (accountCode !== undefined && (!ctx.can(PERMISSIONS.ACCOUNT_CODE_MANAGE) || !ctx.can(PERMISSIONS.LEAD_CONVERT_APPROVE))) throw new Error("Not permitted to review account codes")
    const registration = normalizeRegistrationNumber(registrationNumber.slice(0, 120))
    const code = (accountCode ?? "").trim().toUpperCase().slice(0, 6)
    const [result] = await tx.execute<{ registrationDuplicate: boolean; codeDuplicate: boolean; similarName: boolean }>(sql`
      SELECT EXISTS (SELECT 1 FROM accounts WHERE tenant_id=${ctx.tenantId} AND deleted_at IS NULL AND ${registration} <> '' AND regexp_replace(upper(coalesce(registration_number,'')), '[^A-Z0-9]', '', 'g')=${registration}) AS "registrationDuplicate",
      EXISTS (SELECT 1 FROM accounts WHERE tenant_id=${ctx.tenantId} AND deleted_at IS NULL AND ${code} <> '' AND upper(btrim(code))=${code}) AS "codeDuplicate",
      EXISTS (SELECT 1 FROM accounts a WHERE a.tenant_id=${ctx.tenantId} AND a.deleted_at IS NULL
        AND ${similarCompanyName(lead[0].companyName || lead[0].name || "", sql`a.name`)}) AS "similarName"
    `)
    return result
  })
}
