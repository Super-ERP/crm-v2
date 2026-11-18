import "server-only"
import { revalidatePath } from "next/cache"

/** A milestone is one record shared by quotation, Funnel, Project and detail views. */
export function revalidateMilestoneViews() {
  for (const path of ['/payment-milestones','/quotations','/funnel','/projects']) revalidatePath(path,'layout')
}
