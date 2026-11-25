import { redirect } from "next/navigation"
import { requireContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { previewAcceptanceBackfill } from "@/app/(app)/quotations/acceptance-actions"
import { AcceptanceBackfillClient } from "./backfill-client"

export default async function AcceptanceBackfillPage() {
  const ctx = await requireContext()
  if (!ctx.can(PERMISSIONS.QUOTATION_ACCEPTANCE_BACKFILL)) redirect("/settings")
  const res = await previewAcceptanceBackfill()
  if (!res.ok) throw new Error(res.error)
  return <AcceptanceBackfillClient rows={res.data} />
}
