import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { Forbidden } from "@/components/forbidden"
import { getServerContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { listApprovalQueue } from "./queue-actions"
import { ApprovalsClient } from "./approvals-client"

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // All three workflows share the inbox; each read and mutation enforces its own permissions.
  const ctx = await getServerContext()
  const canParticipate =
    !!ctx &&
    (ctx.can(PERMISSIONS.STAGE_ADVANCE_APPROVE) ||
      ctx.can(PERMISSIONS.STAGE_ADVANCE) ||
      ctx.can(PERMISSIONS.QUOTATION_APPROVE) ||
      ctx.can(PERMISSIONS.QUOTATION_UPDATE) ||
      ctx.can(PERMISSIONS.LEAD_CONVERT) ||
      ctx.can(PERMISSIONS.LEAD_CONVERT_APPROVE))

  if (!canParticipate) {
    return (
      <>
        <SiteHeader title="Approvals" />
        <PageBody>
          <Forbidden description="Approvals are handled by people who request or approve funnel-stage changes, quotations and lead conversions. Your role doesn't take part in this workflow." />
        </PageBody>
      </>
    )
  }

  const params = await searchParams
  const tab = params.tab === "mine" ? "mine" : "incoming"
  const queue = await listApprovalQueue({tab,order:"oldest"})

  return (
    <>
      <SiteHeader title="Approvals" />
      <PageBody>
        <ApprovalsClient key={tab} tab={tab} initialPage={queue} />
      </PageBody>
    </>
  )
}
