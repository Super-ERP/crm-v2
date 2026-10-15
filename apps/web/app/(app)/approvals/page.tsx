import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { Forbidden } from "@/components/forbidden"
import { getServerContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import {
  listIncomingApprovals,
  listMyApprovals,
} from "./actions"
import { listQuotationApprovals } from "./quotation-actions"
import { ApprovalsClient } from "./approvals-client"

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; quotationPage?: string }> }) {
  // Both workflows share the inbox; each read and mutation enforces its own permissions.
  const ctx = await getServerContext()
  const canParticipate =
    !!ctx &&
    (ctx.can(PERMISSIONS.STAGE_ADVANCE_APPROVE) ||
      ctx.can(PERMISSIONS.STAGE_ADVANCE) ||
      ctx.can(PERMISSIONS.QUOTATION_APPROVE) ||
      ctx.can(PERMISSIONS.QUOTATION_UPDATE))

  if (!canParticipate) {
    return (
      <>
        <SiteHeader title="Approvals" />
        <PageBody>
          <Forbidden description="Approvals are handled by people who request or approve funnel-stage changes and quotations. Your role doesn't take part in this workflow." />
        </PageBody>
      </>
    )
  }

  const params = await searchParams
  const tab = params.tab === "mine" ? "mine" : "incoming"
  const quotationApprovals = await listQuotationApprovals(tab, params.quotationPage)
  const approvals = tab === "mine" ? await listMyApprovals(params.page) : await listIncomingApprovals(params.page)

  return (
    <>
      <SiteHeader title="Approvals" />
      <PageBody>
        <ApprovalsClient
          tab={tab}
          page={approvals}
          quotationPage={quotationApprovals}
        />
      </PageBody>
    </>
  )
}
