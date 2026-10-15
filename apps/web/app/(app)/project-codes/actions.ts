"use server"

import type { ServerTableQuery } from "@/lib/table-pagination"
import { normalizeRecordListQuery } from "@/lib/record-list-query"
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

export async function listProjectCodeTablePage(query: ServerTableQuery) {
  const normalized = normalizeRecordListQuery(query, ["code", "funnelCount"], [])
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => listProjectCodes(tx, ctx, {
    search: normalized.query.search, page: normalized.offset / normalized.limit, pageSize: normalized.limit, sort: normalized.query.sort,
  }))
}

export async function getProjectCodeTablePage(code: string, query: ServerTableQuery) {
  const modules = await getEntitledModuleMap()
  const normalized = normalizeRecordListQuery(query, ["name", "estimatedAmount", "expectedCloseDate", "stageName"], [])
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => getProjectCode(tx, ctx, code, normalized.offset / normalized.limit, modules.projects, {
    search: normalized.query.search, pageSize: normalized.limit, sort: normalized.query.sort,
  }))
}
