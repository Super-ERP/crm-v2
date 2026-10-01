import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listPaymentMilestonePage } from "./actions"
import { PaymentMilestonesTable } from "./payment-milestones-table"

export default async function PaymentMilestonesPage() {
  const milestones = await listPaymentMilestonePage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] })

  return (
    <>
      <SiteHeader title="Payment Milestones" />
      <PageBody>
        <PaymentMilestonesTable initialPage={milestones} />
      </PageBody>
    </>
  )
}
