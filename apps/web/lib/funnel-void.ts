import { z } from "zod"

export const voidDuplicateFunnelSchema = z.object({
  funnelId: z.string().uuid("Select the duplicate funnel"),
  retainedFunnelId: z.string().uuid("Select the funnel to keep"),
  reason: z.string().trim().min(1, "Enter a reason").max(1000, "Reason must be 1000 characters or fewer"),
}).refine(value => value.funnelId !== value.retainedFunnelId, { message: "Choose a different funnel to keep", path: ["retainedFunnelId"] })
export type VoidDuplicateFunnelInput = z.infer<typeof voidDuplicateFunnelSchema>

export function validateVoidDecision(request: { status: string; requesterMemberId: string }, memberId: string, approve: boolean, note: string) {
  if (request.status !== "pending") throw new Error("Request is no longer pending")
  if (request.requesterMemberId === memberId) throw new Error("You cannot decide your own request")
  const trimmed = z.string().trim().max(1000).parse(note)
  if (!approve && !trimmed) throw new Error("Enter a rejection reason")
  return trimmed
}
