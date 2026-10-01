import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listProductCodes, listCurrencies } from "@/lib/lookups"
import { listProductPage } from "./actions"
import { ProductsTable } from "./products-table"

export default async function ProductsPage() {
  const [products, productCodes, currencies] = await Promise.all([
    listProductPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] }),
    listProductCodes(),
    listCurrencies(),
  ])

  return (
    <>
      <SiteHeader title="Products" />
      <PageBody>
        <ProductsTable initialPage={products} productCodes={productCodes} currencies={currencies} />
      </PageBody>
    </>
  )
}
