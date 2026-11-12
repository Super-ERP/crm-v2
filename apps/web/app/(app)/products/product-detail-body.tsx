"use client"

import * as React from "react"
import { useRecordEditor } from "@/components/use-record-editor"
import { RecordHeaderActions } from "@/components/record-header-actions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { TabsContent, TabsList } from "@/components/ui/tabs"
import {
  DataTable,
  SortableHeader,
  rightHeader,
  moneyCell,
  linkCell,
} from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  DetailAside,
  DetailCardHeader,
  DetailTabs,
  RelatedCard,
  CountTab,
  FieldRow,
} from "@/components/detail-page"
import type { InlineValue } from "@/components/inline-value"
import { InlineCombobox } from "@/components/inline-combobox"
import { formatMoney } from "@/lib/format"
import type { ProductCategory } from "@/app/(app)/settings/constants"
import {
  listProductUsagePage,
  updateProduct,
  type ProductRow,
  type ProductUsageRow,
  type ProductDealRow,
} from "./actions"

// Status pill: rendered by the app-wide <StatusBadge> tone map.

/**
 * Salesperson-friendly product detail: a left column with the price and key
 * facts in plain language, and a right column with tabs for the full details
 * and the quotations this product appears in (top 5, searchable).
 */
export function ProductDetailBody({
  product: initialProduct,
  codeName: initialCodeName,
  usage,
  deals,
  productCodes,
  canEdit,
}: {
  product: ProductRow
  codeName: string | null
  usage: ProductUsageRow[]
  deals: ProductDealRow[]
  /** Product-line picker options for the inline category combobox. */
  productCodes: ProductCategory[]
  /** Gates every inline editor (PRODUCT_UPDATE, resolved server-side). */
  canEdit: boolean
}) {
  const editor = useRecordEditor<ProductRow>({ initial: initialProduct, onSave: draft => updateProduct(initialProduct.id, draft) })
  const product = editor.record
  const codeName = productCodes.find(category => category.code === product.productCode)?.name ?? initialCodeName
  const saveField = editor.stage
  const loadUsage = React.useCallback((query:import("@/lib/table-pagination").ServerTableQuery)=>listProductUsagePage(initialProduct.id,query),[initialProduct.id])
  const [tab, setTab] = React.useState("usage")

  const codeOptions = React.useMemo(
    () => productCodes.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
    [productCodes]
  )
  const subcategoryOptions = React.useMemo(() => {
    const category = productCodes.find((candidate) => candidate.code === product.productCode)
    return (category?.subcategories ?? []).map((subcategory) => ({
      value: subcategory.code,
      label: `${subcategory.code} · ${subcategory.name}`,
    }))
  }, [product.productCode, productCodes])
  const subcategoryName = React.useMemo(
    () =>
      productCodes
        .find((category) => category.code === product.productCode)
        ?.subcategories.find((subcategory) => subcategory.code === product.subcategory)
        ?.name ?? null,
    [product.productCode, product.subcategory, productCodes]
  )

  const dealColumns = React.useMemo<ColumnDef<ProductDealRow>[]>(
    () => [
      {
        accessorKey: "opportunityName",
        header: ({ column }) => <SortableHeader column={column} title="Opportunity" />,
        cell: ({ row }) =>
          row.original.opportunityId ? (
            <Link
              href={`/opportunities/${row.original.opportunityId}`}
              className="font-medium link"
            >
              {row.original.opportunityName ?? "—"}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "funnelName",
        header: "Funnel",
        cell: ({ row }) => (
          <Link href={`/funnel/${row.original.funnelId}`} className="link">
            {row.original.funnelName}
          </Link>
        ),
      },
      {
        accessorKey: "quantity",
        header: rightHeader("Qty"),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{Number(row.original.quantity)}</div>
        ),
      },
      {
        accessorKey: "unitPrice",
        header: rightHeader("Unit price"),
        cell: moneyCell<ProductDealRow>(
          (r) => r.unitPrice,
          (r) => r.currency
        ),
      },
    ],
    []
  )

  // Distinct pipelines this product appears in (via its quotations).
  const pipelines = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const u of usage) map.set(u.funnelId, u.funnelName)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [usage])

  const usageColumns = React.useMemo<ColumnDef<ProductUsageRow>[]>(
    () => [
      {
        accessorKey: "quoteNumber",
        header: ({ column }) => <SortableHeader column={column} title="Quote" />,
        cell: linkCell<ProductUsageRow>(
          (r) => `/quotations/${r.quotationId}`,
          (r) => r.quoteNumber
        ),
      },
      {
        accessorKey: "funnelName",
        header: "Funnel",
        cell: ({ row }) => (
          <Link
            href={`/funnel/${row.original.funnelId}`}
            className="link"
          >
            {row.original.funnelName}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total",
        header: rightHeader("Total"),
        cell: moneyCell<ProductUsageRow>(
          (r) => r.total,
          (r) => r.currency
        ),
      },
    ],
    []
  )

  return (
    <fieldset key={editor.session} disabled={editor.saving} className="grid min-w-0 gap-4 lg:grid-cols-3 lg:items-start" onInputCapture={editor.markDirty}>
      {/* Left column — the price + key facts, in plain language */}
      <DetailAside>
        <Card>
          <DetailCardHeader kind="product" eyebrow="Product" title="Details" actions={<RecordHeaderActions canEdit={canEdit} editing={editor.editing} saving={editor.saving} onEdit={editor.start} onSave={editor.save} onCancel={editor.cancel} voidTarget={canEdit ? { type: "product", id: initialProduct.id } : undefined} />} />
          {editor.error ? <p role="alert" className="px-6 text-sm text-destructive">{editor.error}</p> : null}
          <CardContent className="grid gap-3">
            <div>
              {canEdit && editor.editing ? (
                <DraftValue
                  value={product.standardPrice}
                  display={
                    <span className="text-2xl font-semibold tabular-nums">
                      {formatMoney(product.standardPrice, product.currency)}
                    </span>
                  }
                  formatDraft={(v) => (
                    <span className="text-2xl font-semibold tabular-nums">
                      {formatMoney(v || "0", product.currency)}
                    </span>
                  )}
                  type="number"
                  title="Click to edit standard price"
                  onSave={(next) => saveField({ standardPrice: next })}
                />
              ) : (
                <div className="text-2xl font-semibold tabular-nums">
                  {formatMoney(product.standardPrice, product.currency)}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {product.uom ? `per ${product.uom}` : "Standard price"} ·{" "}
                {product.currency}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && editor.editing ? (
                <Switch
                  checked={product.isActive}
                  onCheckedChange={(v) => saveField({ isActive: v })}
                  aria-label="Active"
                />
              ) : null}
              {product.isActive ? (
                <Badge variant="secondary">Active — available to quote</Badge>
              ) : (
                <Badge variant="outline">Inactive — hidden from quotes</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">At a glance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <FieldRow label="Product name">
              {canEdit && editor.editing ? <DraftValue value={product.name} display={product.name} title="Click to edit name" onSave={next => saveField({ name: next })} /> : product.name}
            </FieldRow>
            <FieldRow label="Currency">{product.currency}</FieldRow>
            <FieldRow label="Description">
              {canEdit && editor.editing ? <DraftValue value={product.description ?? ""} display={product.description || "—"} multiline title="Click to edit description" onSave={next => saveField({ description: next || null })} /> : <span className="whitespace-pre-wrap text-muted-foreground">{product.description || "No description added."}</span>}
            </FieldRow>
            <FieldRow label="Product line">
              {canEdit && editor.editing ? (
                <InlineCombobox
                  value={product.productCode ?? ""}
                  display={
                    product.productCode ? (
                      <span>
                        <span className="font-mono text-xs">{product.productCode}</span>
                        {codeName ? (
                          <span className="text-muted-foreground"> · {codeName}</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                  options={codeOptions}
                  onSave={(next) =>
                    saveField({ productCode: next || null, subcategory: null })
                  }
                  searchPlaceholder="Search product lines…"
                  emptyMessage="No product lines configured."
                  title="Click to change product line"
                />
              ) : product.productCode ? (
                <span>
                  <span className="font-mono text-xs">{product.productCode}</span>
                  {codeName ? (
                    <span className="text-muted-foreground"> · {codeName}</span>
                  ) : null}
                </span>
              ) : (
                "—"
              )}
            </FieldRow>
            <FieldRow label="Subcategory">
              {canEdit && editor.editing ? (
                <InlineCombobox
                  value={product.subcategory ?? ""}
                  display={
                    product.subcategory ? (
                      <span>
                        {product.subcategory}
                        {subcategoryName ? (
                          <span className="text-muted-foreground"> · {subcategoryName}</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                  options={subcategoryOptions}
                  searchPlaceholder="Search subcategories…"
                  emptyMessage="No subcategories configured for this category."
                  title="Click to change subcategory"
                  onSave={(next) => saveField({ subcategory: next || null })}
                />
              ) : (
                product.subcategory ? (
                  <span>
                    {product.subcategory}
                    {subcategoryName ? (
                      <span className="text-muted-foreground"> · {subcategoryName}</span>
                    ) : null}
                  </span>
                ) : (
                  "—"
                )
              )}
            </FieldRow>
            <FieldRow label="Unit (UOM)">
              {canEdit && editor.editing ? (
                <DraftValue
                  value={product.uom ?? ""}
                  display={product.uom || "—"}
                  title="Click to edit unit"
                  onSave={(next) => saveField({ uom: next || null })}
                />
              ) : (
                (product.uom ?? "—")
              )}
            </FieldRow>
          </CardContent>
        </Card>

        <RelatedCard
          items={[
            {
              kind: "quotation",
              label: "Used in quotes",
              count: usage.length,
              onSelect: () => setTab("usage"),
            },
            {
              kind: "funnel",
              label: "Funnels",
              count: pipelines.length,
              onSelect: () => setTab("usage"),
            },
          ]}
        />
      </DetailAside>

      {/* Right column — tabbed full details */}
      <DetailTabs value={tab} onValueChange={setTab}>
        <TabsList>
          <CountTab value="usage" count={usage.length}>
            Used in quotes
          </CountTab>
          <CountTab value="deals" count={deals.length}>
            On opportunities
          </CountTab>
        </TabsList>

        <TabsContent value="usage" className="mt-4">
          <DataTable
            columns={usageColumns}
            data={usage}
            tableId="product-usage"
            server={{total:usage.length,loadPage:loadUsage}}
            searchColumn="quoteNumber"
            searchPlaceholder="Search quotes…"
            emptyMessage="This product isn't on any quotes yet."
            pageSize={5}
          />
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <DataTable
            columns={dealColumns}
            data={deals}
            tableId="product-deals"
            searchColumn="opportunityName"
            searchPlaceholder="Search opportunities…"
            emptyMessage="This product isn't on any opportunities yet."
            pageSize={5}
          />
        </TabsContent>
      </DetailTabs>
    </fieldset>
  )
}

/** Controlled scalar input: all edits belong to the record's Save/Cancel draft. */
function DraftValue({ value, type = "text", multiline, title, onSave }: React.ComponentProps<typeof InlineValue>) {
  const props = { value, "aria-label": title?.replace(/^Click to (edit|change) /, ""), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { void onSave(event.target.value) } }
  return multiline ? <Textarea {...props} rows={3} /> : <Input {...props} type={type} step={type === "number" ? "0.01" : undefined} />
}
