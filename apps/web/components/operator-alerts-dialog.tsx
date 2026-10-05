"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react"

import {
  listOperatorAlerts,
  resolveOperatorAlerts,
} from "@/app/(app)/_shared/operator-alert-actions"
import type { OperatorAlertRow } from "@/server/services/operator-alerts-types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ChoiceChip } from "@/components/ui/choice-chip"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge, type StatusTone } from "@/components/status-badge"

type Severity = "info" | "warning" | "error" | "critical"

const SEVERITY_META: Record<
  Severity,
  { icon: React.ComponentType<{ className?: string }>; tone: StatusTone; label: string }
> = {
  info: { icon: InfoIcon, tone: "info", label: "Info" },
  warning: { icon: AlertTriangleIcon, tone: "warning", label: "Warning" },
  error: { icon: AlertCircleIcon, tone: "danger", label: "Error" },
  critical: { icon: ShieldAlertIcon, tone: "danger", label: "Critical" },
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const { icon: Icon, tone, label } = SEVERITY_META[severity] ?? SEVERITY_META.error
  return (
    <StatusBadge
      status={severity}
      tone={tone}
      className="gap-1"
      label={
        <>
          <Icon className="size-3" />
          {label}
        </>
      }
    />
  )
}

function AlertRow({
  alert,
  onResolve,
}: {
  alert: OperatorAlertRow
  onResolve: (id: string) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const resolved = alert.resolvedAt != null

  return (
    <div className={`rounded-lg border px-3 py-2 ${resolved ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-2">
        <SeverityBadge severity={alert.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{alert.summary}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(alert.createdAt).toLocaleString()}
            </span>
          </div>
          {alert.tenantName ? (
            <p className="text-xs text-muted-foreground">
              {alert.tenantName}
              {alert.userEmail ? ` · ${alert.userEmail}` : ""}
            </p>
          ) : alert.userEmail ? (
            <p className="text-xs text-muted-foreground">{alert.userEmail}</p>
          ) : null}
          {resolved && alert.resolvedBy ? (
            <p className="mt-1 text-xs text-success">
              <CheckCircle2Icon className="mr-1 inline size-3" />
              Resolved by {alert.resolvedBy}
            </p>
          ) : null}
        </div>
      </div>

      {alert.detail ? (
        <>
          <button
            type="button"
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
            {expanded ? "Hide detail" : "Show detail"}
          </button>
          {expanded && (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground whitespace-pre-wrap break-all">
              {alert.detail}
            </pre>
          )}
        </>
      ) : null}

      {!resolved && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onResolve(alert.id)}
          >
            Mark resolved
          </button>
        </div>
      )}
    </div>
  )
}

export function OperatorAlertsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [alerts, setAlerts] = React.useState<OperatorAlertRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<Severity | "all">("all")
  const [unresolvedOnly, setUnresolvedOnly] = React.useState(false)

  async function load() {
    setLoading(true)
    try {
      const opts = {
        ...(filter !== "all" ? { severity: filter } : {}),
        ...(unresolvedOnly ? { unresolvedOnly: true } : {}),
        limit: 100,
      }
      const data = await listOperatorAlerts(opts as Parameters<typeof listOperatorAlerts>[0])
      setAlerts(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load alerts")
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentionally calling load() when dialog opens; load() sets loading state
  React.useEffect(() => { if (open) load() }, [open])

  async function handleResolve(id: string) {
    try {
      await resolveOperatorAlerts([id])
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, resolvedAt: new Date(), resolvedBy: "operator" } : a
        )
      )
      toast.success("Alert resolved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve alert")
    }
  }

  const unresolvedCount = alerts.filter((a) => !a.resolvedAt).length
  const displayed = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle>Operator alerts</DialogTitle>
              <DialogDescription>
                Platform incidents and unexpected errors.
                {unresolvedCount > 0 ? ` ${unresolvedCount} unresolved.` : " All resolved."}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={load}
              title="Refresh"
              aria-label="Refresh alerts"
            >
              <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        {/* Severity filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "critical", "error", "warning", "info"] as const).map((sev) => (
            <ChoiceChip
              key={sev}
              selected={filter === sev}
              onClick={() => setFilter(sev)}
            >
              {sev === "all" ? "All" : SEVERITY_META[sev].label}
            </ChoiceChip>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch
              size="sm"
              checked={unresolvedOnly}
              onCheckedChange={setUnresolvedOnly}
              aria-label="Unresolved only"
            />
            Unresolved only
          </label>
        </div>

        {loading ? (
          <div className="grid gap-2 py-1" role="status" aria-label="Loading alerts">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            title="No matching alerts"
            description="Try another severity or include resolved alerts."
            className="py-8"
          />
        ) : (
          <div className="grid gap-2">
            {displayed.map((alert) => (
              <AlertRow key={alert.id} alert={alert} onResolve={handleResolve} />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
