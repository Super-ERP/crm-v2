"use client"

import * as React from "react"
import { toast } from "sonner"
import { showActionError } from "@/lib/show-action-error"
import { Plus, X } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  updateAutoJoin,
} from "@/app/(app)/settings/actions"
import { AUTO_JOIN_ROLES } from "@/app/(app)/settings/constants"

// ─── Auto-join ───────────────────────────────────────────────────────────────

export function AutoJoinCard({
  domains,
  role,
}: {
  domains: string[]
  role: string | null
}) {
  const [items, setItems] = React.useState<string[]>(domains)
  const [roleName, setRoleName] = React.useState<string>(role ?? "Rep")
  const [draft, setDraft] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const dirty =
    items.join("|") !== domains.join("|") || roleName !== (role ?? "Rep")

  function add() {
    const d = draft.trim().toLowerCase().replace(/^@/, "")
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) {
      toast.error("Enter a valid domain, e.g. acme.com")
      return
    }
    if (items.includes(d)) {
      toast.error(`"${d}" is already listed.`)
      return
    }
    setItems((p) => [...p, d])
    setDraft("")
  }

  function save() {
    startTransition(async () => {
      const res = await updateAutoJoin({ domains: items, role: roleName })
      if (!res.ok) {
        showActionError(res)
        return
      }
      setItems(res.data.domains)
      setRoleName(res.data.role ?? "Rep")
      toast.success("Auto-join saved")
    })
  }

  const roleItems = AUTO_JOIN_ROLES.map((r) => ({ value: r, label: r }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-join by email domain</CardTitle>
        <CardDescription>
          Anyone who signs in with Microsoft using one of these email domains
          joins this workspace automatically with the role below. Leave empty to
          require invites. An admin can change anyone&apos;s role afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5 sm:max-w-xs">
          <label className="text-xs text-muted-foreground">Default role</label>
          <Select
            value={roleName}
            onValueChange={(v) => setRoleName(v || "Rep")}
            items={roleItems}
          >
            <SelectTrigger width="full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleItems.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">
            Allowed email domains
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  add()
                }
              }}
              placeholder="e.g. acme.com"
            />
            <Button type="button" variant="outline" onClick={add}>
              <Plus className="size-4" />
              Add domain
            </Button>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((d) => (
              <Badge key={d} variant="secondary" className="gap-1 pr-1">
                {d}
                <button
                  type="button"
                  onClick={() => setItems((p) => p.filter((x) => x !== d))}
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Remove ${d}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No domains — sign-in is invite-only.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={isPending || !dirty}>
            {isPending ? "Saving…" : "Save auto-join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

