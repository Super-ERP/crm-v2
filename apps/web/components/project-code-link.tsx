"use client"

import Link from "next/link"
import { projectCodeHref } from "@/lib/project-code-policy"
import { cn } from "@/lib/utils"

export function ProjectCodeLink({ code, className }: { code?: string | null; className?: string }) {
  return code ? <Link href={projectCodeHref(code)} className={cn("font-mono text-xs text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring break-all", className)} onClick={event => event.stopPropagation()}>{code}</Link> : <span className="text-muted-foreground">—</span>
}

export function ProjectCodeLinks({ codes }: { codes?: string[] }) {
  return codes?.length ? <div className="flex flex-wrap gap-x-3 gap-y-1">{codes.map(code => <ProjectCodeLink key={code} code={code} />)}</div> : <span className="text-muted-foreground">—</span>
}

/** One main identifier, with Salesforce references only when they add information. */
export function ProjectCodeSummary({ code, crossDealCode, codes = [], crossDealCodes = [] }: {
  code?: string | null
  crossDealCode?: string | null
  codes?: string[]
  crossDealCodes?: string[]
}) {
  const primary = [...new Set([code, ...codes].filter((value): value is string => !!value))]
  const references = [...new Set([crossDealCode, ...crossDealCodes].filter((value): value is string => !!value && !primary.includes(value)))]
  return <div className="space-y-1.5">
    {primary.length ? <ProjectCodeLinks codes={primary} /> : references.length ? null : <span className="text-muted-foreground">—</span>}
    {references.length ? <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">Cross-deal reference</p>
      <ProjectCodeLinks codes={references} />
    </div> : null}
  </div>
}
