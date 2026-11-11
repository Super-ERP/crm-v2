import { z } from "zod"

export const voidDuplicateFunnelSchema = z.object({
  funnelId: z.string().uuid("Select the duplicate funnel"),
  retainedFunnelId: z.string().uuid("Select the funnel to keep"),
  reason: z.string().trim().min(1, "Enter a reason").max(1000, "Reason must be 1000 characters or fewer"),
}).refine(value => value.funnelId !== value.retainedFunnelId, { message: "Choose a different funnel to keep", path: ["retainedFunnelId"] })
export type VoidDuplicateFunnelInput = z.infer<typeof voidDuplicateFunnelSchema>
