import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listRolesWithPermissions } from "../actions"
import { RolesManager } from "./roles-manager"
import { requireEntitledRoute } from "@/lib/module-guard"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { getPermissionGroups } from "@/lib/permissions"

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  await requireEntitledRoute("advancedRoles")
  const [{ role: initialRoleId }, roles, modules] = await Promise.all([
    searchParams,
    listRolesWithPermissions(),
    getEntitledModuleMap(),
  ])
  return (
    <>
      <SiteHeader
        title="Roles & permissions"
        breadcrumbs={[{ label: "Team", href: "/team" }, { label: "Roles" }]}
      />
      <PageBody>
        <RolesManager
          roles={roles}
          initialRoleId={initialRoleId}
          permissionGroups={getPermissionGroups(modules)}
        />
      </PageBody>
    </>
  )
}
