import 'server-only'
import { canEnterProjectCodes, canRenameProjectCodes } from '@/lib/project-code-permissions'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import type { Tx } from '@/db'
import { accounts, funnels, opportunities, tenantSettings } from '@/db/schema'
import type { ServerContext } from '@/lib/server-context'
import { visibleMemberIds, ownerScope, canManageAllRecords, ownsOrManages } from '@/lib/access-scope'
import { normalizeProjectCode, type ProjectCodeChoice } from '@/lib/commit-stage'
import { nextProjectCode } from './numbering'
import { writeAudit } from '@/server/audit'

export async function assertFunnelCodeAccess(tx: Tx, ctx: ServerContext, funnelId: string) {
  const [funnel] = await tx.select().from(funnels).where(and(eq(funnels.id,funnelId),eq(funnels.tenantId,ctx.tenantId),isNull(funnels.deletedAt))).for('update')
  if (!funnel) throw new Error('Funnel not found')
  const visible = await visibleMemberIds(tx,ctx)
  if (!canManageAllRecords(ctx) && !ownsOrManages(visible,funnel.ownerMemberId)) throw new Error('FORBIDDEN: not permitted on this Funnel')
  return funnel
}
/** A picker returns codes only from already accessible, nondeleted Funnels/parents. */
/** Codes are offered only from the same Account as the Funnel being coded. */
export async function availableProjectCodes(tx: Tx,ctx: ServerContext,accountId: string,search='') {
  const visible = await visibleMemberIds(tx,ctx)
  const q=search.trim().slice(0,300)
  const rows=await tx.select({code:funnels.projectCode,parentCode:sql<string|null>`CASE WHEN ${ownerScope(opportunities.ownerMemberId,visible) ?? sql`true`} THEN ${opportunities.projectCode} ELSE NULL END`}).from(funnels)
    .innerJoin(opportunities,and(eq(opportunities.id,funnels.opportunityId),eq(opportunities.tenantId,ctx.tenantId),isNull(opportunities.deletedAt)))
    .where(and(eq(funnels.tenantId,ctx.tenantId),eq(funnels.accountId,accountId),isNull(funnels.deletedAt),ownerScope(funnels.ownerMemberId,visible),
      or(sql`${funnels.projectCode} ilike ${'%'+q.replace(/[\\%_]/g,'\\$&')+'%'}`,and(ownerScope(opportunities.ownerMemberId,visible),sql`${opportunities.projectCode} ilike ${'%'+q.replace(/[\\%_]/g,'\\$&')+'%'}`))))
  return [...new Set(rows.flatMap(row=>[row.code,row.parentCode]).filter((code):code is string=>!!code))].sort().slice(0,100)
}
export async function assignFunnelProjectCode(tx:Tx,ctx:ServerContext,funnelId:string,choice:ProjectCodeChoice) {
  if(!choice || !['new','existing','manual'].includes(choice.mode))throw new Error('Invalid Project Code assignment mode.')
  if(choice.mode==='manual' && !canEnterProjectCodes(ctx))throw new Error('FORBIDDEN: only Sales Admin or administrators can enter Project Codes.')
  const funnel=await assertFunnelCodeAccess(tx,ctx,funnelId)
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ctx.tenantId + ':project-code-assignment'},0))`)
  let code:string
  if(choice.mode==='new') {
    const [account]=await tx.select({code:accounts.code}).from(accounts).where(and(eq(accounts.id,funnel.accountId),eq(accounts.tenantId,ctx.tenantId),isNull(accounts.deletedAt)))
    if(!account?.code?.trim())throw new Error('Ask Sales Admin to assign the Account Code first.')
    if(!funnel.projectNatureCode?.trim())throw new Error('Project Nature is required before generating a project code.')
    // Historical/manual identifiers can overlap the counter format. Never
    // accidentally link a new allocation to an existing identifier.
    for (let attempt=0; ; attempt++) {
      if(attempt>=100)throw new Error('Project code counter conflicts with existing codes. Ask an administrator to review numbering.')
      code=await nextProjectCode(tx,ctx,{accountCode:account.code,projectNatureCode:funnel.projectNatureCode,year:funnel.projectYear})
      const used=await tx.execute(sql`select 1 from funnels where tenant_id=${ctx.tenantId} and (project_code=${code} or cross_deal_project_code=${code}) union all select 1 from opportunities where tenant_id=${ctx.tenantId} and project_code=${code} limit 1`)
      if(!used.length)break
    }
  } else if(choice.mode==='existing') {
    const requested=choice.code.trim()
    const match=(await availableProjectCodes(tx,ctx,funnel.accountId,requested)).find(candidate=>candidate===requested || candidate.toUpperCase()===requested.toUpperCase())
    if(!match) throw new Error('Select a Project Code already used under this Funnel’s Account.')
    code=match // Preserve the exact spelling/punctuation of legacy identifiers.
  } else {
    code=normalizeProjectCode(choice.code)
    const [used]=await tx.execute<{present:boolean}>(sql`select true as present where exists(select 1 from funnels where tenant_id=${ctx.tenantId} and deleted_at is null and (upper(project_code)=${code} or upper(cross_deal_project_code)=${code})) or exists(select 1 from opportunities where tenant_id=${ctx.tenantId} and deleted_at is null and upper(project_code)=${code})`)
    if(used && code!==funnel.projectCode)throw new Error('Project code already exists. Select it using Existing project code to link this Funnel.')
  }
  await tx.update(funnels).set({projectCode:code,updatedAt:new Date()}).where(eq(funnels.id,funnel.id))
  // Compatibility fallback is assigned only once. A later child can intentionally
  // choose another code without rewriting its siblings or historical documents.
  await tx.update(opportunities).set({projectCode:code,updatedAt:new Date()}).where(and(eq(opportunities.id,funnel.opportunityId),eq(opportunities.tenantId,ctx.tenantId),isNull(opportunities.projectCode)))
  await writeAudit(tx,ctx,{action:'funnel.project_code_changed',entityType:'opportunity',entityId:funnel.id,before:{projectCode:funnel.projectCode},after:{projectCode:code,mode:choice.mode}})
  return code
}
export async function assertCommitNature(tx:Tx,ctx:ServerContext,funnel:typeof funnels.$inferSelect) {
  if(!funnel.projectNatureCode?.trim())throw new Error('Project Nature is required before advancing to 4a.')
  const [settings]=await tx.select({types:tenantSettings.projectNatures}).from(tenantSettings).where(eq(tenantSettings.organizationId,ctx.tenantId))
  if(!settings?.types?.some(type=>type.code===funnel.projectNatureCode))throw new Error('Select a configured Project Nature before advancing to 4a.')
  const [account]=await tx.select({code:accounts.code}).from(accounts).where(and(eq(accounts.id,funnel.accountId),isNull(accounts.deletedAt)))
  if(!account?.code?.trim())throw new Error('Ask Sales Admin to assign the Account Code before advancing to 4a.')
}

/** Renaming a shared identifier is a tenant-wide operation, never an implicit merge. */
export async function sharedProjectCodeImpact(tx: Tx, ctx: ServerContext, rawCode: string) {
  if (!canRenameProjectCodes(ctx) || !canManageAllRecords(ctx)) throw new Error('FORBIDDEN: only administrators can rename shared Project Codes.')
  const code = rawCode.trim().toUpperCase()
  if (!code || code.length>300) throw new Error("Invalid existing Project Code.")
  const [impact] = await tx.execute<{ funnels: number; opportunities: number; version: string }>(sql`
    with affected as (
      select 'funnel' as kind, id::text, updated_at::text from funnels where tenant_id=${ctx.tenantId} and deleted_at is null and (upper(project_code)=${code} or upper(cross_deal_project_code)=${code})
      union all select 'opportunity', id::text, updated_at::text from opportunities where tenant_id=${ctx.tenantId} and deleted_at is null and upper(project_code)=${code}
    ) select count(*) filter(where kind='funnel')::int as funnels, count(*) filter(where kind='opportunity')::int as opportunities,
      md5(coalesce(string_agg(kind || id || updated_at, ',' order by kind,id),'')) as version from affected`)
  if (!impact || impact.funnels + impact.opportunities === 0) throw new Error('Project code not found.')
  return { code, ...impact }
}
export async function renameSharedProjectCode(tx: Tx, ctx: ServerContext, rawCode: string, rawNext: string, expectedVersion: string) {
  if (!canRenameProjectCodes(ctx) || !canManageAllRecords(ctx)) throw new Error('FORBIDDEN: only administrators can rename shared Project Codes.')
  const code = rawCode.trim().toUpperCase(), next = normalizeProjectCode(rawNext)
  if (!code || code.length>300) throw new Error("Invalid existing Project Code.")
  if (code === next) throw new Error('Enter a different project code.')
  // Fail safely rather than waiting indefinitely behind an in-progress stage change.
  await tx.execute(sql`set local lock_timeout = '2s'`)
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ctx.tenantId + ':project-code-assignment'},0))`)
  await tx.execute<{ id: string }>(sql`select id from funnels where tenant_id=${ctx.tenantId} and deleted_at is null and (upper(project_code)=${code} or upper(cross_deal_project_code)=${code}) order by id for update`)
  await tx.execute(sql`select id from opportunities where tenant_id=${ctx.tenantId} and deleted_at is null and upper(project_code)=${code} order by id for update`)
  const impact = await sharedProjectCodeImpact(tx, ctx, code)
  if (impact.version !== expectedVersion) throw new Error('Linked records changed. Review the rename impact again.')
  const collision = await tx.execute(sql`select 1 from funnels where tenant_id=${ctx.tenantId} and (upper(project_code)=${next} or upper(cross_deal_project_code)=${next}) union all select 1 from opportunities where tenant_id=${ctx.tenantId} and upper(project_code)=${next} limit 1`)
  if (collision.length) throw new Error('That project code already exists. Change an individual Funnel to link it; shared rename cannot merge codes.')
  await tx.execute(sql`update funnels set project_code=case when upper(project_code)=${code} then ${next} else project_code end, cross_deal_project_code=case when upper(cross_deal_project_code)=${code} then ${next} else cross_deal_project_code end,updated_at=now() where tenant_id=${ctx.tenantId} and deleted_at is null and (upper(project_code)=${code} or upper(cross_deal_project_code)=${code})`)
  await tx.execute(sql`update opportunities set project_code=${next},updated_at=now() where tenant_id=${ctx.tenantId} and deleted_at is null and upper(project_code)=${code}`)
  await writeAudit(tx,ctx,{action:'project_code.renamed',entityType:'project_code',entityId:code,before:{code},after:{code:next,funnels:impact.funnels,opportunities:impact.opportunities}})
  return { code: next, funnels: impact.funnels, opportunities: impact.opportunities }
}
