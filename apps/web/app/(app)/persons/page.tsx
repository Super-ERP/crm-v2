import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listAccountOptions, getFormPresets } from "@/lib/lookups"
import { listPersonPage } from "./actions"
import { PersonsTable } from "./persons-table"

export default async function PersonsPage() {
  const [persons, accounts, presets] = await Promise.all([
    listPersonPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
    listAccountOptions(),
    getFormPresets(),
  ])

  return (
    <>
      <SiteHeader title="Contacts" />
      <PageBody>
        <PersonsTable
          initialPage={persons}
          accounts={accounts}
                    defaultCountry={presets.defaultCountry || "MY"}
        />
      </PageBody>
    </>
  )
}
