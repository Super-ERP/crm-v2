"use server"

import { getTableFields } from "@/lib/table-controls/registry"

import type { ServerTableQuery } from "@/lib/table-pagination"
import { normalizeRecordListQuery } from "@/lib/record-list-query"
import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { listProjectCodeRelatedRecords, type CodeRelatedKind, listProjectCodes, getProjectCode } from "@/server/services/project-codes"

export async function listProjectCodePage(search: string, page: unknown = 0) {
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => listProjectCodes(tx, ctx, { search, page }))
}

export async function getProjectCodeDetail(code: string, page: unknown = 0) {
  const modules = await getEntitledModuleMap()
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => getProjectCode(tx, ctx, code, page, modules.projects))
}

export async function listProjectCodeTablePage(query: ServerTableQuery) {
  const normalized = normalizeRecordListQuery(query, ["code", "funnelCount"], [],getTableFields("project-codes"))
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => listProjectCodes(tx, ctx, {
    search: normalized.query.search, page: normalized.offset / normalized.limit, pageSize: normalized.limit, sort: normalized.query.sort,filterTree:normalized.query.filterTree,sorting:normalized.query.sorting,
  }))
}

export async function getProjectCodeTablePage(code: string, query: ServerTableQuery) {
  const modules = await getEntitledModuleMap()
  const normalized = normalizeRecordListQuery(query, ["name", "estimatedAmount", "expectedCloseDate", "stageName"], [],getTableFields("project-code-funnels"))
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => getProjectCode(tx, ctx, code, normalized.offset / normalized.limit, modules.projects, {
    search: normalized.query.search, pageSize: normalized.limit, sort: normalized.query.sort,filterTree:normalized.query.filterTree,sorting:normalized.query.sorting,
  }))
}

export async function listCodeRelatedTablePage(code:string,kind:CodeRelatedKind,input:ServerTableQuery) {
 const kinds=['opportunities','quotations','accounts','contacts','projects']
 if(!kinds.includes(kind))throw new Error('Unknown project code relationship')
 const modules=await getEntitledModuleMap()
 const allowed=getTableFields(`code-${kind}`)
 const normalized=normalizeRecordListQuery(input,allowed.filter(f=>f.sortable).map(f=>f.id),[],allowed)
 return withTenant(PERMISSIONS.OPPORTUNITY_VIEW,(tx,ctx)=>listProjectCodeRelatedRecords(tx,ctx,code,kind,{
  page:normalized.offset/normalized.limit,pageSize:normalized.limit,search:normalized.query.search,sorting:normalized.query.sorting,filterTree:normalized.query.filterTree,projectsEnabled:modules.projects,
 }))
}
