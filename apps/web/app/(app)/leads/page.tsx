import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import {
  listFunnelsWithStages,
  listMembers,
  listLeadSources,
  listLossReasons,
  listAccountOptions,
  getFormPresets,
} from "@/lib/lookups"
import { listLeadPage, listLeadFilterSources } from "./actions"
import { LeadsTable } from "./leads-table"

export default async function LeadsPage() {
  const [initialPage, filterSources, pipelines, members, accountOptions, leadSources, lossReasons, presets] =
    await Promise.all([
      listLeadPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
      listLeadFilterSources(),
      listFunnelsWithStages(),
      listMembers(),
      listAccountOptions(),
      listLeadSources(),
      listLossReasons(),
      getFormPresets(),
    ])

  return (
    <>
      <SiteHeader title="Leads" />
      <PageBody>
        <LeadsTable
          initialPage={initialPage}
          filterSources={filterSources}
          pipelines={pipelines}
          members={members}
          accountOptions={accountOptions}
          leadSources={leadSources}
          lossReasons={lossReasons}
                    defaultCountry={presets.defaultCountry || "MY"}
        />
      </PageBody>
    </>
  )
}
