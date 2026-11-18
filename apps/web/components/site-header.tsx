import * as React from "react"
import Link from "next/link"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { TextSizeToggle } from "@/components/text-size-toggle"
import { HeaderActions } from "@/components/command-palette"
import { ReportIssueDialog } from "@/components/report-issue-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type Crumb = { label: string; href?: string }

const DASHBOARD_ROOT: Crumb = { label: "Dashboard", href: "/dashboard" }

export function SiteHeader({
  title,
  breadcrumbs,
}: {
  title: string
  breadcrumbs?: Crumb[]
}) {
  // Always anchor breadcrumb trails at the Dashboard root so a nested detail
  // page keeps a path back home (skip when the page already starts there).
  const crumbs =
    breadcrumbs && breadcrumbs.length
      ? breadcrumbs[0]?.href === DASHBOARD_ROOT.href
        ? breadcrumbs
        : [DASHBOARD_ROOT, ...breadcrumbs]
      : breadcrumbs

  return (
    <header data-site-header className="flex min-h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1 py-2 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        {crumbs && crumbs.length ? (
          <><h1 className="sr-only">{title}</h1><Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              {crumbs.map((c, i) => (
                <React.Fragment key={`${c.label}-${i}`}>
                  <BreadcrumbItem>
                    {c.href && i < crumbs.length - 1 ? (
                      <BreadcrumbLink render={<Link href={c.href} />}>
                        {c.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{c.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {i < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb></>
        ) : (
          <h1 className="min-w-0 flex-1 text-base font-medium break-words">{title}</h1>
        )}
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <HeaderActions />
          <ReportIssueDialog />
          <TextSizeToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
