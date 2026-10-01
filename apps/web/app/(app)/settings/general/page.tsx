import { getSettings } from "@/app/(app)/settings/actions"
import { GeneralClient } from "./general-client"

export default async function GeneralSettingsPage() {
  return <GeneralClient settings={await getSettings()} />
}
