"use server"

import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { listProjectCodes, getProjectCode } from "@/server/services/project-codes"

export async function listProjectCodePage(search: string, page: unknown = 0) {
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => listProjectCodes(tx, ctx, { search, page }))
}

export async function getProjectCodeDetail(code: string, page: unknown = 0) {
  const modules = await getEntitledModuleMap()
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => getProjectCode(tx, ctx, code, page, modules.projects))
}
