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
