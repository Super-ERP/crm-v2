import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listAccountOptions, listIndustries, listCountries, listCurrencies, getFormPresets } from "@/lib/lookups"
import { listAccountPage, listAccountFilterOptions } from "./actions"
import { AccountsTable } from "./accounts-table"

export default async function AccountsPage() {
  const [initialPage, filterOptions, parentOptions, industries, countries, currencies, presets] = await Promise.all([
    listAccountPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
    listAccountFilterOptions(),
    listAccountOptions(),
    listIndustries(),
    listCountries(),
    listCurrencies(),
    getFormPresets(),
  ])

  return (
    <>
      <SiteHeader title="Accounts" />
      <PageBody>
        <AccountsTable
          initialPage={initialPage}
          filterOptions={filterOptions}
          parentOptions={parentOptions}
          industries={industries}
          countries={countries}
          currencies={currencies}
          presets={presets}
        />
      </PageBody>
    </>
  )
}
