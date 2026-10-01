import { SecurityClient } from "./security-client"
import { AutoJoinCard } from "./auto-join-card"
import { getSettings } from "../actions"
import { requireContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"

export default async function SecuritySettingsPage() {
  const ctx = await requireContext()
  const settings = ctx.can(PERMISSIONS.TENANT_SETTINGS) ? await getSettings() : null
  return (
    <div className="grid gap-4">
      <SecurityClient />
      {settings ? <AutoJoinCard domains={settings.autoJoinDomains} role={settings.autoJoinRole} /> : null}
    </div>
  )
}
