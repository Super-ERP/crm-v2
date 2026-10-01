import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { requireContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { listQuotationPage, listQuotationFilterOptions } from "./actions"
import { QuotationsTable } from "./quotations-table"

export default async function QuotationsPage() {
  const [initialPage, filterOptions, ctx] = await Promise.all([
    listQuotationPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
    listQuotationFilterOptions(),
    requireContext(),
  ])
  const canCreate = ctx.can(PERMISSIONS.QUOTATION_CREATE)
  return (
    <>
      <SiteHeader title="Quotations" />
      <PageBody>
        <QuotationsTable initialPage={initialPage} filterOptions={filterOptions} canCreate={canCreate} />
      </PageBody>
    </>
  )
}
