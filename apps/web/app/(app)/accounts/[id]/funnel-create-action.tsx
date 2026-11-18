"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Never infer a deal from reader ordering, even for an Account's empty related lists. */
export function FunnelCreateAction({ funnels, accountId, kind }: {
  funnels: Array<{funnelId: string; name: string}>
  accountId: string
  kind: "project" | "quotation"
}) {
  const id = useId()
  const [selected, setSelected] = useState("")
  const funnel = funnels.find(row => row.funnelId === selected)
  const href = funnel ? kind === "project" ? `/projects?new=1&funnelId=${funnel.funnelId}&accountId=${accountId}` : `/quotations/new?funnelId=${funnel.funnelId}` : null
  return <div className="flex flex-wrap items-end gap-2 text-left">
    <div className="grid min-w-0 max-w-full gap-1 text-xs">
      <label htmlFor={id}>Choose Funnel for new {kind}</label>
      <select id={id} value={selected} onChange={event => setSelected(event.target.value)} className="h-8 w-full min-w-0 max-w-full rounded-md border bg-background px-2 text-sm">
        <option value="">Select a Funnel…</option>
        {funnels.map(row => <option key={row.funnelId} value={row.funnelId}>{row.name}</option>)}
      </select>
    </div>
    {href ? <Button size="sm" nativeButton={false} render={<Link href={href} />}><Plus className="size-4" />New {kind}</Button> : <Button size="sm" disabled><Plus className="size-4" />New {kind}</Button>}
  </div>
}
