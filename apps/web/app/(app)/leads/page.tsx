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
import { listLeads } from "./actions"
import { LeadsTable } from "./leads-table"

export default async function LeadsPage() {
  const [rows, pipelines, members, accountOptions, leadSources, lossReasons, presets] =
    await Promise.all([
      listLeads(),
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
          data={rows}
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
