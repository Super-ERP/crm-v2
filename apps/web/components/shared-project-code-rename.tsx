"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { usePermissions } from "./command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import { previewSharedCodeRename, renameSharedCode } from "@/app/(app)/funnel/commit-setup-actions"
import { showActionError } from "@/lib/show-action-error"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"

export function SharedProjectCodeRename({ code, navigate = false, onRenamed }: { code: string; navigate?: boolean; onRenamed?: () => void }) {
  const permissions = usePermissions(), router = useRouter()
  const [impact, setImpact] = useState<{ code: string; funnels: number; opportunities: number; version: string } | null>(null)
  const [next, setNext] = useState("")
  const [pending, start] = useTransition()
  if (!permissions.has(PERMISSIONS.PROJECT_CODE_RENAME) || !permissions.has(PERMISSIONS.TENANT_SETTINGS) || !permissions.has(PERMISSIONS.RECORDS_MANAGE_ALL)) return null
  return <><Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => {
    const result = await previewSharedCodeRename(code)
    if (!result.ok) { showActionError(result); return }
    setImpact(result.data); setNext(code)
  })}>Rename shared Project Code</Button>
    <Dialog open={!!impact} onOpenChange={open => { if (!open && !pending) setImpact(null) }}><DialogContent><DialogHeader><DialogTitle>Rename shared Project Code</DialogTitle><DialogDescription>Updates the shared code across linked Funnels and parent Opportunities. Existing documents keep their recorded codes.</DialogDescription></DialogHeader>
      <div className="rounded-md bg-muted p-3 text-sm"><strong>{impact?.code}</strong><p className="mt-1 text-muted-foreground">{impact?.funnels} Funnels · {impact?.opportunities} Opportunities</p></div>
      <div className="grid gap-2"><Label htmlFor="shared-project-code-new">New Project Code</Label><Input id="shared-project-code-new" disabled={pending} value={next} onChange={e => setNext(e.target.value)} maxLength={80}/></div>
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setImpact(null)}>Cancel</Button><Button disabled={pending || !impact || !next.trim() || next.trim().toUpperCase() === impact.code} onClick={() => start(async () => {
        if (!impact) return
        const result = await renameSharedCode(impact.code, next, impact.version)
        if (!result.ok) { showActionError(result); return }
        setImpact(null); onRenamed?.(); toast.success("Shared Project Code renamed")
        if (navigate) router.push(`/project-codes/view?code=${encodeURIComponent(result.data.code)}`)
        router.refresh()
      })}>{pending ? "Renaming…" : "Rename linked records"}</Button></DialogFooter>
    </DialogContent></Dialog></>
}
