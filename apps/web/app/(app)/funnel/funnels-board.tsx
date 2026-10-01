"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { showActionError } from "@/lib/show-action-error"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMoney, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FunnelWithStages } from "@/lib/lookups"
import type { ServerTableQuery } from "@/lib/table-pagination"
import {
  advanceStageAction,
  listFunnelStagePage,
  type OpportunityListRow,
} from "./actions"
import {
  requiresApprovalForTransition,
  requiresTransitionReason,
  type CustomFunnelField,
} from "@/lib/stage-gate"
import { StageAdvanceDialog } from "./stage-advance-dialog"
import { canTransition } from "./stage-transitions"

function kindAccent(kind: string): string {
  switch (kind) {
    case "WON":
      return "bg-emerald-500"
    case "LOST":
      return "bg-red-500"
    case "PARKED":
      return "bg-amber-500"
    default:
      return "bg-sky-500"
  }
}

type Stage = FunnelWithStages["stages"][number]

/** Inner content of an opportunity card — shared by the live card and the
 * drag overlay. */
function CardBody({ c }: { c: OpportunityListRow }) {
  return (
    <>
      <p className="truncate text-sm font-medium">{c.name}</p>
      <p className="truncate text-xs text-muted-foreground">{c.accountName}</p>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold tabular-nums">
          {(c.estimatedAmount ?? c.amount)
            ? formatMoney((c.estimatedAmount ?? c.amount)!, c.currency)
            : "—"}
        </span>
        <span className="max-w-[45%] min-w-0 truncate text-right text-xs text-muted-foreground" title={c.ownerName ?? undefined}>
          {c.ownerName ?? ""}
        </span>
      </div>
    </>
  )
}

function DraggableCard({
  c,
  draggable,
}: {
  c: OpportunityListRow
  draggable: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: c.id,
    data: { stageId: c.stageId },
    disabled: !draggable,
  })

  // Read-only users keep a navigable card but no drag handles attached.
  const dragProps = draggable ? { ...attributes, ...listeners } : {}

  return (
    <Card
      ref={draggable ? setNodeRef : undefined}
      className={cn(
        "gap-0 py-0 transition-colors hover:border-primary/50",
        isDragging && "opacity-40"
      )}
      {...dragProps}
    >
      <CardContent className="px-3 py-3">
        {/* The Link stays navigable: the PointerSensor only starts a drag
            after a small movement, so plain clicks open the deal. */}
        <Link href={`/funnel/${c.id}`} className="block">
          <span className="block [&_p:first-child]:hover:underline">
            <CardBody c={c} />
          </span>
        </Link>
      </CardContent>
    </Card>
  )
}

function StageColumn({
  stage,
  cards,
  draggable,
  total,
  valueTotal,
  loading,
  loadingMore,
  error,
  onMore,
}: {
  stage: Stage
  cards: OpportunityListRow[]
  draggable: boolean
  total: number
  valueTotal: string
  loading: boolean
  loadingMore: boolean
  error: boolean
  onMore: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id },
    disabled: !draggable,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3 transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", kindAccent(stage.kind))} />
          <span className="min-w-0 truncate text-sm font-medium" title={stage.name}>{stage.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatPercent(stage.probability)}
          </span>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
          {total}
        </span>
      </div>

      <div className="text-xs text-muted-foreground tabular-nums">
        {formatMoney(valueTotal)}
      </div>

      <div className="flex min-h-2 flex-col gap-2">
        {cards.map((c) => (
          <DraggableCard
            key={c.id}
            c={c}
            draggable={draggable}
          />
        ))}
        {cards.length < total ? (
          <Button type="button" variant="outline" size="sm" className="w-full" disabled={loadingMore} onClick={onMore}>
            {loadingMore ? "Loading…" : `Show 25 more (${total - cards.length} remaining)`}
          </Button>
        ) : null}
        {loading ? <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p> : null}
        {error ? <Button type="button" variant="outline" size="sm" onClick={onMore}>Retry loading</Button> : null}
        {!loading && !error && cards.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
            No pipelines
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function OpportunitiesBoard({
  query,
  pipelines,
  canAdvance,
  customFieldDefs = [],
}: {
  query: ServerTableQuery
  pipelines: FunnelWithStages[]
  /** When false the board is read-only: cards aren't draggable and drops are
   * ignored, so a user without stage-advance can't move pipelines. */
  canAdvance: boolean
  /** Tenant custom-field definitions, so a gated drop can collect required fields. */
  customFieldDefs?: CustomFunnelField[]
}) {
  const router = useRouter()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small drag before activating so card links remain clickable.
      activationConstraint: { distance: 6 },
    })
  )

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [selectedPipelineId, setSelectedPipelineId] = React.useState(() => pipelines.find((pipeline) => pipeline.isDefault)?.id ?? pipelines[0]?.id ?? "")
  type StagePage = { rows: OpportunityListRow[]; total: number; valueTotal: string; loadingMore?: boolean; error?: boolean }
  const [stagePages, setStagePages] = React.useState<Record<string, StagePage>>({})
  const [reloadKey, setReloadKey] = React.useState(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [scrollEdges, setScrollEdges] = React.useState({ left: false, right: false })
  // Controlled stage-advance dialog, opened when a drop targets a gated stage.
  const [gated, setGated] = React.useState<{
    funnelId: string
    currentStageId: string
    targetStageId: string
  } | null>(null)

  const loadedCards = React.useMemo(() => Object.values(stagePages).flatMap((page) => page.rows), [stagePages])

  // Optimistic card placement: on drop we move the card immediately and let
  // advanceStageAction() reconcile via router.refresh(). useOptimistic reverts
  // to `data` automatically when the transition settles, so a rejected move
  // (or one that only queued an approval) rolls back on its own.
  const [optimisticData, moveCard] = React.useOptimistic(
    loadedCards,
    (
      state: OpportunityListRow[],
      move: { id: string; targetStageId: string }
    ) =>
      state.map((o) =>
        o.id === move.id ? { ...o, stageId: move.targetStageId } : o
      )
  )

  const defaultFunnel =
    pipelines.find((f) => f.id === selectedPipelineId) ?? pipelines.find((f) => f.isDefault) ?? pipelines[0] ?? null

  const stages = React.useMemo(
    () =>
      defaultFunnel
        ? [...defaultFunnel.stages].sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [defaultFunnel]
  )
  const queryKey = JSON.stringify({ search: query.search, sorting: query.sorting, filters: query.filters })
  const stageQuery = React.useMemo<ServerTableQuery>(() => ({
    ...JSON.parse(queryKey) as Pick<ServerTableQuery, "search" | "sorting" | "filters">,
    pageIndex: 0, pageSize: 25,
  }), [queryKey])
  const stageIds = stages.map((stage) => stage.id).join(",")

  React.useEffect(() => {
    let cancelled = false
    void Promise.all(stageIds.split(",").filter(Boolean).map(async (stageId): Promise<[string, StagePage]> => {
      try {
        return [stageId, await listFunnelStagePage({ ...stageQuery, stageId })]
      } catch {
        return [stageId, { rows: [], total: 0, valueTotal: "0", error: true }]
      }
    })).then((pages) => {
      if (!cancelled) setStagePages(Object.fromEntries(pages))
    })
    return () => { cancelled = true }
  }, [stageIds, stageQuery, reloadKey])

  async function loadMore(stageId: string) {
    const current = stagePages[stageId]
    if (current?.loadingMore) return
    setStagePages((pages) => ({ ...pages, [stageId]: { ...(pages[stageId] ?? { rows: [], total: 0, valueTotal: "0" }), loadingMore: true, error: false } }))
    try {
      const page = await listFunnelStagePage({ ...stageQuery, stageId, pageIndex: Math.floor((current?.rows.length ?? 0) / 25) })
      setStagePages((pages) => ({ ...pages, [stageId]: {
        ...page, rows: [...(pages[stageId]?.rows ?? []), ...page.rows], loadingMore: false,
      } }))
    } catch {
      setStagePages((pages) => ({ ...pages, [stageId]: { ...(pages[stageId] ?? { rows: [], total: 0, valueTotal: "0" }), loadingMore: false, error: true } }))
    }
  }

  const updateScrollEdges = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setScrollEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    })
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollEdges()
    const observer = new ResizeObserver(updateScrollEdges)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    return () => observer.disconnect()
  }, [stages, updateScrollEdges])

  function scrollStages(direction: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(288, el.clientWidth * 0.75), behavior: "smooth" })
  }

  // Only show deals that live on this funnel, bucketed by stage.
  const byStage = React.useMemo(() => {
    const map = new Map<string, OpportunityListRow[]>()
    for (const s of stages) map.set(s.id, [])
    if (defaultFunnel) {
      for (const o of optimisticData) {
        if (o.pipelineId !== defaultFunnel.id) continue
        const bucket = map.get(o.stageId)
        if (bucket) bucket.push(o)
      }
    }
    return map
  }, [stages, optimisticData, defaultFunnel])

  const activeCard = React.useMemo(
    () =>
      activeId ? optimisticData.find((o) => o.id === activeId) ?? null : null,
    [activeId, optimisticData]
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    // Fail-closed: ignore drops entirely for read-only users.
    if (!canAdvance) return
    const { active, over } = event
    if (!over) return

    const funnelId = String(active.id)
    const targetStageId = String(over.id)
    const fromStageId = active.data.current?.stageId as string | undefined

    // Dropped on its own column — nothing to do.
    if (targetStageId === fromStageId) return

    const fromStage = stages.find((s) => s.id === fromStageId)
    const toStage = stages.find((s) => s.id === targetStageId)
    if (!fromStage || !toStage) return

    // Reject illegal moves up front so the board matches the server's rules.
    if (!canTransition(fromStage, toStage)) {
      toast.error("That stage move isn't allowed")
      return
    }

    // Approval- or reason-gated transition: open dialog before moving.
    if (
      requiresApprovalForTransition(fromStage, toStage) ||
      requiresTransitionReason(fromStage, toStage)
    ) {
      setGated({
        funnelId,
        currentStageId: fromStageId ?? "",
        targetStageId,
      })
      return
    }

    // Move the card now (optimistic), then advance on the server. On failure
    // we surface the error and the transition unwinds the optimistic move; on
    // success router.refresh() reconciles against the authoritative data.
    React.startTransition(async () => {
      moveCard({ id: funnelId, targetStageId })
      const res = await advanceStageAction({
        funnelId,
        targetStageId,
        skipPpvvc: true,
      })
      if (!res.ok) {
        showActionError(res)
        return
      }
      toast.success(res.data.moved ? "Moved" : "Sent for approval")
      setReloadKey((key) => key + 1)
      router.refresh()
    })
  }

  if (!defaultFunnel) {
    return (
      <p className="text-sm text-muted-foreground">
        No funnel configured. Ask an admin to set one up.
      </p>
    )
  }

  return (
    <>
      {pipelines.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pipeline</span>
          <Select value={defaultFunnel.id} onValueChange={(value) => setSelectedPipelineId(value ?? "")}>
            <SelectTrigger className="w-[min(18rem,100%)]"><SelectValue /></SelectTrigger>
            <SelectContent>{pipelines.map((pipeline) => <SelectItem key={pipeline.id} value={pipeline.id}>{pipeline.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ) : null}
      <DndContext
        id="funnel-board"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="relative min-w-0 max-w-full">
          <div
            ref={scrollRef}
            role="region"
            aria-label="Sales funnel stages"
            tabIndex={0}
            onScroll={updateScrollEdges}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault()
                scrollStages(event.key === "ArrowLeft" ? -1 : 1)
              }
            }}
            className="flex w-full min-w-0 gap-4 overflow-x-auto scroll-smooth pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                cards={byStage.get(stage.id) ?? []}
                draggable={canAdvance}
                total={stagePages[stage.id]?.total ?? 0}
                valueTotal={stagePages[stage.id]?.valueTotal ?? "0"}
                loading={!stagePages[stage.id]}
                loadingMore={!!stagePages[stage.id]?.loadingMore}
                error={!!stagePages[stage.id]?.error}
                onMore={() => loadMore(stage.id)}
              />
            ))}
          </div>
          {!activeId && scrollEdges.left ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background/80 to-transparent pl-1.5">
              <Button type="button" variant="outline" size="icon-lg" className="pointer-events-auto sticky top-[45svh] rounded-full border-border/70 bg-background/95 shadow-lg shadow-black/10 backdrop-blur-sm transition-transform hover:scale-105 hover:bg-background dark:shadow-black/30" aria-label="Scroll stages left" title="Scroll stages left" onClick={() => scrollStages(-1)}>
                <ChevronLeft className="size-5" />
              </Button>
            </div>
          ) : null}
          {!activeId && scrollEdges.right ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background/80 to-transparent pr-1.5 text-right">
              <Button type="button" variant="outline" size="icon-lg" className="pointer-events-auto sticky top-[45svh] rounded-full border-border/70 bg-background/95 shadow-lg shadow-black/10 backdrop-blur-sm transition-transform hover:scale-105 hover:bg-background dark:shadow-black/30" aria-label="Scroll stages right" title="Scroll stages right" onClick={() => scrollStages(1)}>
                <ChevronRight className="size-5" />
              </Button>
            </div>
          ) : null}
        </div>

        <DragOverlay>
          {activeCard ? (
            <Card className="w-64 gap-0 border-primary/50 py-0 shadow-lg">
              <CardContent className="px-3 py-3">
                <CardBody c={activeCard} />
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {gated ? (
        <StageAdvanceDialog
          key={`${gated.funnelId}-${gated.targetStageId}`}
          funnelId={gated.funnelId}
          currentStageId={gated.currentStageId}
          stages={stages}
          initialTargetStageId={gated.targetStageId}
          customFieldDefs={customFieldDefs}
          customValues={
            loadedCards.find((c) => c.id === gated.funnelId)?.customFields ?? {}
          }
          skipPpvvc
          open
          onOpenChange={(o) => {
            if (!o) { setGated(null); setReloadKey((key) => key + 1) }
          }}
        />
      ) : null}
    </>
  )
}
