"use client"

import * as React from "react"
import { BarChart3, PackageIcon, CalendarDaysIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { EmptyState } from "@/components/empty-state"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import type {
  SalesByOwnerStage,
  ClosedDealsByProduct,
  SalesActivityMonth,
} from "./actions"
import { useDashboardCurrency } from "./dashboard-currency"

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

// Recharts needs a stable palette per stage. Cycle the theme chart vars.
const STAGE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
] as const

type OwnerRow = { owner: string } & Record<string, number | string>

/**
 * One horizontal bar per Account owner, stacked by Sales Stage; measure =
 * estimated Funnel amount in the selected currency. Stages
 * are ordered by their ladder position so the legend/stack read left→right in
 * pipeline order.
 */
function SalesByOwnerStageChart({ data }: { data: SalesByOwnerStage[] }) {
  const { currency } = useDashboardCurrency()
  const { rows, config, stageKeys, stageLabels } = React.useMemo(() => {
    const selectedData = data.filter((row) => row.currency === currency)
    // Distinct stages, ordered by ladder position → drives stack + legend.
    const stageOrder = new Map<string, { name: string; sort: number }>()
    for (const d of selectedData) {
      if (!stageOrder.has(d.stageId)) {
        stageOrder.set(d.stageId, { name: d.stageName, sort: d.stageSort })
      }
    }
    const stages = [...stageOrder.entries()].sort(
      (a, b) => a[1].sort - b[1].sort
    )
    // Stage names can contain spaces/em-dashes (e.g. "1d — Qualified"), which
    // breaks a `var(--color-<name>)` reference — use the stage id (already a
    // safe token) as the recharts dataKey / CSS var key, name stays the label.
    const config: ChartConfig = {}
    const stageKeys: string[] = []
    const stageLabels = new Map<string, string>()
    stages.forEach(([stageId, s], i) => {
      config[stageId] = {
        label: s.name,
        color: STAGE_COLORS[i % STAGE_COLORS.length],
      }
      stageKeys.push(stageId)
      stageLabels.set(stageId, s.name)
    })

    // One row per owner, each stage summed into its own key.
    const byOwner = new Map<string, OwnerRow>()
    for (const d of selectedData) {
      const row = byOwner.get(d.ownerMemberId) ?? { owner: d.ownerName }
      const prev = Number(row[d.stageId] ?? 0)
      row[d.stageId] = prev + d.amount
      byOwner.set(d.ownerMemberId, row)
    }
    // Sort owners by their total, biggest first (Salesforce-style ranking).
    const rows = [...byOwner.values()].sort((a, b) => {
      const sum = (r: OwnerRow) =>
        stageKeys.reduce((n, k) => n + Number(r[k] ?? 0), 0)
      return sum(b) - sum(a)
    })
    return { rows, config, stageKeys, stageLabels }
  }, [data, currency])

  const hasData = rows.length > 0 && stageKeys.length > 0
  // Give each owner row room; grow the chart with the owner count.
  const height = Math.max(220, rows.length * 44 + 60)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4" />
          Sales by Account owner ({currency})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        {hasData ? (
          <ChartContainer
            config={config}
            className="aspect-auto w-full"
            style={{ height }}
          >
            <BarChart
              accessibilityLayer
              data={rows}
              layout="vertical"
              margin={{ left: 12, right: 16 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatMoneyCompact(Number(v), currency)}
              />
              <YAxis
                type="category"
                dataKey="owner"
                tickLine={false}
                axisLine={false}
                width={110}
                interval={0}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex flex-1 justify-between gap-3 leading-none">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatMoney(Number(value), currency)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {stageKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={stageLabels.get(key)}
                  stackId="stage"
                  fill={`var(--color-${key})`}
                />
              ))}
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState
            icon={BarChart3}
            title={`No ${currency} funnel estimates`}
            description="Select another currency to view its owner and stage breakdown."
          />
        )}
      </CardContent>
    </Card>
  )
}

const productConfig = {
  amount: {
    label: "Amount",
    color: "var(--primary)",
  },
} satisfies ChartConfig

/**
 * One horizontal bar per product category; measure = closed-won line amount
 * in the selected currency.
 */
function ClosedDealsByProductChart({ data }: { data: ClosedDealsByProduct[] }) {
  const { currency } = useDashboardCurrency()
  const rows = React.useMemo(
    () => data.filter((row) => row.currency === currency).sort((a, b) => b.amount - a.amount),
    [data, currency]
  )
  const hasData = rows.length > 0
  const height = Math.max(220, rows.length * 44 + 60)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="size-4" />
          Closed deals by product ({currency})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        {hasData ? (
          <ChartContainer
            config={productConfig}
            className="aspect-auto w-full"
            style={{ height }}
          >
            <BarChart
              accessibilityLayer
              data={rows}
              layout="vertical"
              margin={{ left: 12, right: 16 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatMoneyCompact(Number(v), currency)}
              />
              <YAxis
                type="category"
                dataKey="category"
                tickLine={false}
                axisLine={false}
                width={110}
                interval={0}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) => (
                      <span className="font-mono font-medium tabular-nums">
                        {formatMoney(Number(value), currency)}
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState
            icon={PackageIcon}
            title={`No ${currency} closed-deal products`}
            description="Select another currency to view its product breakdown."
          />
        )}
      </CardContent>
    </Card>
  )
}

const activityConfig = {
  count: {
    label: "Record Count",
    color: "var(--primary)",
  },
} satisfies ChartConfig

/**
 * Chart C — "Sales Activity This Year": count of activities logged per
 * calendar month (Jan…current month), solid SF-blue bars with the value
 * printed on top of each bar (matches the Salesforce home page chart).
 */
export function SalesActivityChart({
  data,
  canViewAll,
  currentMonth,
}: {
  data: SalesActivityMonth[]
  canViewAll: boolean
  currentMonth: number
}) {
  const rows = React.useMemo(() => {
    const byMonth = new Map(data.map((d) => [d.month, d.count]))
    return Array.from({ length: currentMonth }, (_, i) => ({
      month: MONTH_LABELS[i],
      count: byMonth.get(i + 1) ?? 0,
    }))
  }, [data, currentMonth])

  const hasData = rows.some((r) => r.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon className="size-4" />
          {canViewAll ? "Team activity this year" : "My activity this year"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        {hasData ? (
          <ChartContainer
            config={activityConfig}
            className="aspect-auto w-full"
            style={{ height: 260 }}
          >
            <BarChart accessibilityLayer data={rows} margin={{ top: 20 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                label={{ value: "Month", position: "insideBottom", offset: -8 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Record Count",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="count"
                  position="top"
                  className="fill-foreground text-xs"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState
            icon={CalendarDaysIcon}
            title="No activity logged this year"
            description="Logged activities by month will appear here."
          />
        )}
      </CardContent>
    </Card>
  )
}

/** The two monetary pipeline charts. */
export function DashboardCharts({
  salesByOwnerStage,
  closedDealsByProduct,
}: {
  salesByOwnerStage: SalesByOwnerStage[]
  closedDealsByProduct: ClosedDealsByProduct[]
}) {
  return (
    <>
      <SalesByOwnerStageChart data={salesByOwnerStage} />
      <ClosedDealsByProductChart data={closedDealsByProduct} />
    </>
  )
}
