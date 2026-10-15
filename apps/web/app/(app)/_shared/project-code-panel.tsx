"use client"

import { ProjectCodeLink } from "@/components/project-code-link"
import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listRelatedProjectCodes, type RelatedProjectCodePage } from "./project-code-actions"
import { toast } from "sonner"

export function ProjectCodePanel({ kind, recordId, initialPage }: { kind: "account" | "person"; recordId: string; initialPage: RelatedProjectCodePage }) {
  const [loaded, setLoaded] = React.useState<{ source: RelatedProjectCodePage; page: RelatedProjectCodePage } | null>(null)
  const page = loaded?.source === initialPage ? loaded.page : initialPage
  const [pending, startTransition] = React.useTransition()
  function navigate(index: number) {
    startTransition(async () => {
      try { setLoaded({ source: initialPage, page: await listRelatedProjectCodes(kind, recordId, index) }) }
      catch { toast.error("Project codes could not be loaded") }
    })
  }
  return <Card><CardHeader><CardTitle>Project codes</CardTitle></CardHeader><CardContent className="grid gap-4">
    <p className="text-sm text-muted-foreground">Open a code to explore its connected sales records. Codes appear for funnels at Commit (4A) and Closed Won.</p>
    {page.rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr className="border-b"><th className="p-2">Project code</th><th className="p-2">Cross-deal project code</th><th className="p-2">CRM project code</th><th className="p-2">Funnel</th><th className="p-2">Opportunity</th></tr></thead>
      <tbody>{page.rows.map(row => <tr key={row.funnelId} className="border-b"><td className="p-2 font-mono"><ProjectCodeLink code={row.projectCode} /></td><td className="p-2 font-mono"><ProjectCodeLink code={row.crossDealProjectCode} /></td><td className="p-2 font-mono"><ProjectCodeLink code={row.crmProjectCode} /></td><td className="p-2"><Link className="link" href={`/funnel/${row.funnelId}`}>{row.funnelName}</Link></td><td className="p-2">{row.opportunityId && row.opportunityName ? <Link className="link" href={`/opportunities/${row.opportunityId}`}>{row.opportunityName}</Link> : "—"}</td></tr>)}</tbody>
    </table></div> : <p className="text-sm text-muted-foreground">No active project codes on linked sales records you can access.</p>}
    <nav className="flex items-center justify-between gap-3" aria-label="Related project code pages">
      <Button variant="outline" disabled={pending || page.pageIndex === 0} onClick={() => navigate(page.pageIndex - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page.pageIndex + 1}</span><Button variant="outline" disabled={pending || !page.hasNextPage} onClick={() => navigate(page.pageIndex + 1)}>Next</Button>
    </nav>
  </CardContent></Card>
}
