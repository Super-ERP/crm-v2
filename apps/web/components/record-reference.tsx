"use client"

import Link from "next/link"

/** The reader decides availability using the destination's own permission and scope. */
export function RecordReference({ href, label, available = true }: {
  href: string
  label: string | null | undefined
  available?: boolean
}) {
  if (!label) return <span className="text-muted-foreground">Unavailable</span>
  return available ? <Link href={href} className="link" onClick={event => event.stopPropagation()}>{label}</Link> : <span title="Record unavailable or outside your access">{label}</span>
}
