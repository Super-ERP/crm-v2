import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { requireEntitledRoute } from "@/lib/module-guard"
import { listAuditPage, listAuditFilterOptions } from "./actions"
import { AuditTable } from "./audit-table"

export default async function AuditPage() {
  await requireEntitledRoute("audit")
  const [rows, filterOptions] = await Promise.all([
    listAuditPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
    listAuditFilterOptions(),
  ])

  return (
    <>
      <SiteHeader title="Audit log" />
      <PageBody>
        <p className="text-sm text-muted-foreground">
          A read-only, append-only record of changes across your workspace.
        </p>
        <AuditTable initialPage={rows} filterOptions={filterOptions} />
      </PageBody>
    </>
  )
}
