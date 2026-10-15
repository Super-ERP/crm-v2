import Link from "next/link"
import { SearchIcon, HashIcon, ArrowUpRightIcon } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { PageBody, PageHeader } from "@/components/page-header"
import { ProjectCodeLink } from "@/components/project-code-link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { projectCodeHref } from "@/lib/project-code-policy"
import { listProjectCodePage } from "./actions"
import { CodePagination } from "./code-pagination"

export default async function ProjectCodesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams
  const search = typeof sp.q === "string" ? sp.q.slice(0, 300) : ""
  const result = await listProjectCodePage(search, sp.page)
  return <>
    <SiteHeader title="Project Codes" />
    <PageBody>
      <PageHeader title="Project Codes" description="Find a project code and follow its connected sales records." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action="/project-codes" className="flex w-full items-center gap-2 sm:max-w-lg" role="search">
          <div className="relative min-w-0 flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-2 size-4 text-muted-foreground" /><Input key={search} aria-label="Search project codes" name="q" defaultValue={search} placeholder="Search project codes…" className="pl-9" maxLength={300} /></div>
          <Button type="submit">Search</Button>
          {search ? <Link className="text-sm text-primary hover:underline" href="/project-codes">Clear</Link> : null}
        </form>
        <p className="text-xs text-muted-foreground">Active at Commit (4A) and Closed Won</p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table><TableHeader><TableRow><TableHead className="pl-4">Project code</TableHead><TableHead>Used as</TableHead><TableHead className="text-right">Linked funnels</TableHead><TableHead className="w-12"><span className="sr-only">Open code</span></TableHead></TableRow></TableHeader>
          <TableBody>{result.rows.map(row => <TableRow key={row.code}><TableCell className="pl-4 py-4"><ProjectCodeLink code={row.code} className="text-sm font-medium" /></TableCell><TableCell><div className="flex flex-wrap gap-1.5">{row.primaryCount > 0 ? <Badge variant="secondary">Primary</Badge> : null}{row.crossDealCount > 0 ? <Badge variant="outline">Cross-deal</Badge> : null}{row.crmCount > 0 ? <Badge variant="outline">CRM</Badge> : null}</div></TableCell><TableCell className="text-right tabular-nums">{row.funnelCount}</TableCell><TableCell><Link href={projectCodeHref(row.code)} aria-label={`Open ${row.code}`} className="inline-flex rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><ArrowUpRightIcon className="size-4" /></Link></TableCell></TableRow>)}</TableBody>
        </Table>
        {!result.rows.length ? <div className="grid justify-items-center gap-2 px-6 py-14 text-center"><HashIcon className="mb-2 size-7 text-muted-foreground" /><h3 className="font-medium">{search ? "No matching project codes" : "No active project codes yet"}</h3><p className="max-w-md text-sm text-muted-foreground">{search ? "Try part of the code or clear your search." : "Codes appear when a funnel you can access reaches Commit (4A) or Closed Won."}</p></div> : null}
      </div>
      <CodePagination {...result} href={page => `/project-codes?${new URLSearchParams({ q: search, page: String(page) })}`} />
    </PageBody>
  </>
}
