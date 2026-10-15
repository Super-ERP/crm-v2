import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return <><SiteHeader title="Project Codes" /><PageBody><span className="sr-only" role="status">Loading project codes</span><Skeleton className="h-8 w-52" /><Skeleton className="h-9 w-full max-w-lg" /><Skeleton className="h-80 w-full rounded-xl" /></PageBody></>
}
