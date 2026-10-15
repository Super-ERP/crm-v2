import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { PageBody } from "@/components/page-header"
import { getProjectCodeDetail } from "../actions"
import { ProjectCodeDetailBody } from "./project-code-detail-body"

export default async function ProjectCodePage({ searchParams }: { searchParams: Promise<{ code?: string; tab?: string }> }) {
  const sp = await searchParams
  if (typeof sp.code !== "string") notFound()
  const detail = await getProjectCodeDetail(sp.code)
  if (!detail) notFound()
  return <>
    <SiteHeader title="Project code" breadcrumbs={[{ label: "Project Codes", href: "/project-codes" }, { label: detail.code }]} />
    <PageBody><ProjectCodeDetailBody key={detail.code} initialDetail={detail} initialTab={sp.tab} /></PageBody>
  </>
}
