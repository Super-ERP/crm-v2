import { PERMISSIONS } from '@/lib/permissions'
import type { ServerContext } from '@/lib/server-context'

/** Identifier changes require tenant administration, not broad sales record access. */
export function canRenameProjectCodes(ctx: Pick<ServerContext,'can'|'isSuperadmin'>) {
  return ctx.isSuperadmin || (ctx.can(PERMISSIONS.PROJECT_CODE_RENAME) && ctx.can(PERMISSIONS.TENANT_SETTINGS))
}
