import { requireContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { getEntitledModuleMap } from "@/lib/modules.server"
import {
  listAccountOptions,
  listMembers,
  listFunnelsWithStages,
  listCustomFunnelFields,
  listEntities,
  listCurrencies,
} from "@/lib/lookups"
import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listOpportunities, listPersonsWithAccount } from "./actions"
import { FunnelViews } from "./funnel-views"
import { OpportunityForm } from "./opportunity-form"

export default async function OpportunitiesPage() {
  const ctx = await requireContext()
  const [
    rows,
    accounts,
    persons,
    members,
    pipelines,
    customFunnelFields,
    entities,
    currencies,
    modules,
  ] = await Promise.all([
    listOpportunities(),
    listAccountOptions(),
    listPersonsWithAccount(),
    listMembers(),
    listFunnelsWithStages(),
    listCustomFunnelFields(),
    listEntities(),
    listCurrencies(),
    getEntitledModuleMap(),
  ])

  const canCreate = ctx.can(PERMISSIONS.OPPORTUNITY_CREATE)
  const canAdvance = ctx.can(PERMISSIONS.STAGE_ADVANCE)

  const newButton = canCreate ? (
    <OpportunityForm
      mode="create"
      accounts={accounts}
      persons={persons}
      members={members}
      pipelines={pipelines}
      customFieldDefs={customFunnelFields}
      entityOptions={entities}
      financeEnabled={modules.finance}
      currencies={currencies}
      defaultOwnerMemberId={ctx.memberId}
    />
  ) : undefined

  return (
    <>
      <SiteHeader title="Funnel" />
      <PageBody>
        <FunnelViews rows={rows} pipelines={pipelines} canAdvance={canAdvance} customFieldDefs={customFunnelFields} memberId={ctx.memberId} newButton={newButton} />
      </PageBody>
    </>
  )
}
