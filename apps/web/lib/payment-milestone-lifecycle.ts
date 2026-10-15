export const PAYMENT_MILESTONE_STATUSES = ["pending_invoicing", "invoiced"] as const

export type PaymentMilestoneStatus = (typeof PAYMENT_MILESTONE_STATUSES)[number]

export function canTransitionPaymentMilestone(
  from: PaymentMilestoneStatus,
  to: PaymentMilestoneStatus
): boolean {
  return from === to || (from === "pending_invoicing" && to === "invoiced")
}

/** Eligibility is separate from invoicing state; rollback never rewrites history. */
export function isPaymentMilestoneEligible(input: {
  stageCode: string | null | undefined
  stageKind: string | null | undefined
  funnelStatus: string | null | undefined
  quotationStatus: string | null | undefined
}): boolean {
  return input.quotationStatus === "accepted" &&
    (input.funnelStatus === "open" || input.funnelStatus === "won") &&
    (input.stageKind === "WON" || (input.stageKind === "OPEN" && input.stageCode === "4a"))
}
