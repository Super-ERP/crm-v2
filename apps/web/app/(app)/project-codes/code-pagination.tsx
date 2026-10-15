import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function CodePagination({ pageIndex, hasNextPage, href }: { pageIndex: number; hasNextPage: boolean; href: (page: number) => string }) {
  return <nav className="flex items-center justify-between gap-3" aria-label="Project code pages">
    {pageIndex > 0 ? <Link className={buttonVariants({ variant: "outline" })} href={href(pageIndex - 1)}><ChevronLeft />Previous</Link> : <span className="text-sm text-muted-foreground">First page</span>}
    <span className="text-sm tabular-nums text-muted-foreground">Page {pageIndex + 1}</span>
    {hasNextPage ? <Link className={buttonVariants({ variant: "outline" })} href={href(pageIndex + 1)}>Next<ChevronRight /></Link> : <span className="text-sm text-muted-foreground">Last page</span>}
  </nav>
}
