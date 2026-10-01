import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listOpportunityPage, listOpportunityFilterOptions } from "./actions"
import { OpportunitiesTable } from "./opportunities-table"

export default async function OpportunitiesPage() {
  const [opportunities, filterOptions] = await Promise.all([
    listOpportunityPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
    listOpportunityFilterOptions(),
  ])
  return (
    <>
      <SiteHeader title="Opportunities" />
      <PageBody>
        <OpportunitiesTable initialPage={opportunities} filterOptions={filterOptions} />
      </PageBody>
    </>
  )
}
