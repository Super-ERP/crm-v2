import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRightIcon, HashIcon } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { projectCodeHref } from "@/lib/project-code-policy"
import { getProjectCodeDetail } from "../actions"
import { CodePagination } from "../code-pagination"

type RecordRef = { id: string; name: string; role?: string }
function RelatedRecords({ title, rows, base }: { title: string; rows: RecordRef[]; base: string }) {
  return <section className="min-w-0"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">{title}<span className="font-normal tabular-nums text-muted-foreground">{rows.length}</span></h2>
    {rows.length ? <ul className="divide-y rounded-xl border bg-card">{rows.map(row => <li key={row.id}><Link className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring" href={`${base}/${row.id}`}><span className="grid min-w-0 gap-0.5"><span className="break-words text-sm text-primary group-hover:underline">{row.name}</span>{row.role ? <span className="text-xs text-muted-foreground">{row.role}</span> : null}</span><ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" /></Link></li>)}</ul> : <p className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">No linked {title.toLowerCase()} you can access.</p>}
  </section>
}

export default async function ProjectCodePage({ searchParams }: { searchParams: Promise<{ code?: string; page?: string }> }) {
  const sp = await searchParams
  if (typeof sp.code !== "string") notFound()
  const detail = await getProjectCodeDetail(sp.code, sp.page)
  if (!detail) notFound()
  const opportunities = [...new Map(detail.funnels.flatMap(f => f.opportunity ? [[f.opportunity.id, f.opportunity] as const] : [])).values()]
  return <>
    <SiteHeader title="Project code" breadcrumbs={[{ label: "Project Codes", href: "/project-codes" }, { label: detail.code }]} />
    <PageBody className="gap-6">
      <div className="flex items-start gap-3 border-b pb-5"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><HashIcon className="size-5" /></div><div className="grid min-w-0 gap-2"><h1 className="break-all font-mono text-xl font-semibold sm:text-2xl">{detail.code}</h1><p className="text-sm text-muted-foreground">Connected sales records at Commit (4A) and Closed Won. Only records you can access appear here.</p></div></div>
      <section className="grid gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Funnels</h2><span className="text-xs text-muted-foreground">Primary and cross-deal links stay separate</span></div>
        <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead className="pl-4">Funnel</TableHead><TableHead>Relationship</TableHead><TableHead>Stage</TableHead><TableHead>Opportunity</TableHead></TableRow></TableHeader><TableBody>{detail.funnels.map(f => <TableRow key={f.id}><TableCell className="min-w-48 pl-4 py-4"><Link className="text-primary hover:underline" href={`/funnel/${f.id}`}>{f.name}</Link></TableCell><TableCell><div className="flex flex-wrap gap-1.5">{f.primary ? <Badge variant="secondary">Primary</Badge> : null}{f.crossDeal ? <Badge variant="outline">Cross-deal</Badge> : null}{f.crm ? <Badge variant="outline">CRM</Badge> : null}</div></TableCell><TableCell className="whitespace-nowrap">{f.stageName}</TableCell><TableCell>{f.opportunity ? <Link className="text-primary hover:underline" href={`/opportunities/${f.opportunity.id}`}>{f.opportunity.name}</Link> : "—"}</TableCell></TableRow>)}</TableBody></Table></div>
        <CodePagination {...detail} href={page => `${projectCodeHref(detail.code)}&page=${page}`} />
      </section>
      <div className="grid gap-5 border-t pt-5"><p className="text-xs text-muted-foreground">Related records for the funnels on this page.</p><div className="grid gap-x-6 gap-y-7 md:grid-cols-2 xl:grid-cols-3"><RelatedRecords title="Opportunities" rows={opportunities} base="/opportunities" /><RelatedRecords title="Quotations" rows={detail.quotations} base="/quotations" /><RelatedRecords title="Accounts" rows={detail.accounts} base="/accounts" /><RelatedRecords title="Contacts" rows={detail.contacts} base="/persons" />{detail.projects.length ? <RelatedRecords title="Delivery Projects" rows={detail.projects} base="/projects" /> : null}</div></div>
    </PageBody>
  </>
}
