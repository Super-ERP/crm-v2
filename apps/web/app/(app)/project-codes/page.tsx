import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { listProjectCodePage } from "./actions"
import { ProjectCodesTable } from "./project-codes-table"

export default async function ProjectCodesPage({ searchParams }: { searchParams: Promise<{ q?: string; "project-codes_q"?: string }> }) {
  const sp = await searchParams
  if (sp.q && !sp["project-codes_q"]) redirect(`/project-codes?${new URLSearchParams({ "project-codes_q": sp.q })}`)
  const search = sp["project-codes_q"]
  const initialPage = await listProjectCodePage(typeof search === "string" ? search.slice(0, 300) : "")
  return <>
    <SiteHeader title="Project Codes" />
    <PageBody><ProjectCodesTable initialPage={initialPage} /></PageBody>
  </>
}
