"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import Link from "next/link"
import { useBusinessTimezone, useTablePreferenceIdentity } from "@/components/table-controls/business-timezone"
import { AdvancedFilterEditor } from "@/components/table-controls/advanced-filter-editor"
import {describeFilter,removeFilterNode} from "@/lib/table-controls/header-filters"
import { computedTableValue } from "@/lib/table-controls/client-values"
import { evaluateFilterTree } from "@/lib/table-controls/evaluate"
import { validateFilterTree } from "@/lib/table-controls/filter-tree"
import { ColumnControls } from "@/components/table-controls/column-controls"
import { readTablePreferences, saveTablePreferences } from "@/app/(app)/_shared/table-preference-actions"
import { getTableFields, tableExists } from "@/lib/table-controls/registry"
import { tableFieldSignature, mergeQuickFilterTree, normalizeTableLayout, validateTableState } from "@/lib/table-controls/state"
import { EMPTY_FILTER_TREE, type TableLayout, type FilterGroup } from "@/lib/table-controls/types"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { formatMoney } from "@/lib/format"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  matchesGlobalSearch,
  matchesFilter,
  parseDataTableFilterParam,
  validateFilterValue,
  type DataTableFilterDefinition,
  type DataTableFilterValue,
  type DateFilterOperator,
  type NumericFilterOperator,
  type TextFilterOperator,
} from "@/lib/data-table-filters"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { StatusCallout } from "@/components/status-callout"
import { SavedViewMenu } from "@/components/saved-view-menu"
import type { SavedViewPayload } from "@/lib/saved-views"
import { applySavedViewPayload } from "@/lib/data-table-saved-views"
import { normalizeTablePageSize, TABLE_PAGE_SIZES, type ServerTableQuery } from "@/lib/table-pagination"
import type { LucideIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface DataTableFacet {
  columnId: string
  title: string
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumn?: string
  searchPlaceholder?: string
  /** Title shown in the empty state when there are no rows. */
  emptyMessage?: string
  /** Optional guidance copy under the empty-state title. */
  emptyDescription?: string
  /** Optional icon for the empty state. */
  emptyIcon?: LucideIcon
  /** Optional call-to-action (e.g. a create button) for the empty state. */
  emptyAction?: React.ReactNode
  toolbar?: React.ReactNode
  /** Render a second view using the same filtered rows and toolbar state. */
  renderFilteredView?: (rows: TData[], query: ServerTableQuery) => React.ReactNode
  pageSize?: number
  /** Typed, datatype-aware column filters. */
  filters?: DataTableFilterDefinition[]
  /** Columns to expose as multi-select faceted filters. */
  facets?: DataTableFacet[]
  /** Namespaces the URL state params so multiple tables can coexist on a page. */
  tableId?: string
  /** Explicitly disable saved views only for a table that cannot persist them. */
  savedViews?: boolean
  /**
   * Server-side row cap. When `data.length >= cap`, a notice is shown so users
   * know the list is truncated and should refine their search.
   */
  fieldCurrencies?: Record<string,string>
  advancedFilters?: boolean
  cap?: number
  /** Fetch a bounded page after search, filters, sorting, or page controls change. */
  server?: {
    total: number
    loadPage: (query: ServerTableQuery) => Promise<{ rows: TData[]; total: number }>
  }
}

const facetFilterFn = (
  row: { getValue: (id: string) => unknown },
  id: string,
  value: string[]
) => !value?.length || value.includes(String(row.getValue(id)))

const typedFilterFn = (
  row: { getValue: (id: string) => unknown },
  id: string,
  value: DataTableFilterValue
) => matchesFilter(row.getValue(id), value)

function hasActiveFilterValue(value: DataTableFilterValue | undefined): boolean {
  if (!value) return false
  switch (value.type) {
    case "text":
      return value.value != null && value.value.trim() !== ""
    case "number":
    case "money":
      return value.operator === "between"
        ? value.min != null && value.max != null
        : value.value != null
    case "date":
      return value.operator === "between"
        ? value.from != null && value.to != null
        : value.value != null && value.value !== ""
    case "boolean":
      return value.value != null
    case "enum":
      return !!value.value?.length
    case "relation":
      return Array.isArray(value.value) ? value.value.length > 0 : !!value.value
  }
}

// Global search: a row matches when ANY column's value contains the query
// (case-insensitive substring). tanstack ORs this across every filterable
// column, so one search box searches the whole table — the right behaviour as
// the imported data set keeps growing.
const globalFilterFn = (
  row: { getValue: (id: string) => unknown },
  columnId: string,
  value: string
) => {
  return matchesGlobalSearch(row.getValue(columnId), value)
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  emptyDescription,
  emptyIcon,
  emptyAction,
  toolbar,
  renderFilteredView,
  pageSize = 25,
  filters,
  facets,
  tableId,
  savedViews = true,
  cap,
  advancedFilters,
  fieldCurrencies,
  server,
}: DataTableProps<TData, TValue>) {
  const isMobile=useIsMobile()
  const filterIds = React.useMemo(
    () => new Set((filters ?? []).map((filter) => filter.columnId)),
    [filters]
  )
  const facetIds = React.useMemo(
    () => new Set((facets ?? []).map((f) => f.columnId)),
    [facets]
  )

  const definitionSignature=tableFieldSignature(columns,fieldCurrencies)
  const fieldDefinitions = React.useMemo(() => {
    const metadata=JSON.parse(definitionSignature) as {ids:string[];currencies:Record<string,string>}
    return tableId && tableExists(tableId) ? getTableFields(tableId,metadata.ids).map(field=>({...field,currency:metadata.currencies[field.id]})) : []
  },[tableId,definitionSignature])
  const preferenceIdentity=useTablePreferenceIdentity()
  const currentFields=React.useRef(fieldDefinitions)
  React.useEffect(()=>{currentFields.current=fieldDefinitions},[fieldDefinitions])
  const advancedEnabled = advancedFilters ?? (!!tableId && (!server && cap == null && tableId !== 'product-usage' || !!server && ['leads','accounts','persons','opportunities','funnel','quotations','products','projects','payment-milestones','sales-orders','finance-sale','finance-purchase','audit','intercompany-inbound','project-codes','project-code-funnels','product-usage','code-opportunities','code-quotations','code-accounts','code-contacts','code-projects'].includes(tableId)))
  const businessTimezone = useBusinessTimezone()
  // inject a faceted filterFn for facet columns so multi-select arrays work
  const filterFields=React.useMemo(()=>fieldDefinitions.map(field=>{const quick=filters?.find(filter=>filter.columnId===field.id);return {...field,options:quick&&'options' in quick?quick.options:field.options}}),[fieldDefinitions,filters])
  const tableColumns = React.useMemo(
    () =>
      columns.map((c) => {
        const id =
          (c as { id?: string; accessorKey?: string }).id ??
          (c as { accessorKey?: string }).accessorKey
        const field = fieldDefinitions.find(field=>field.id===id)
        const configured = { ...c, size: c.size ?? field?.defaultWidth, minSize: c.minSize ?? field?.minWidth, enableHiding: field?.required ? false : c.enableHiding }
        if (id && filterIds.has(id)) return { ...configured, filterFn: typedFilterFn }
        return id && facetIds.has(id) ? { ...configured, filterFn: facetFilterFn } : configured
      }),
    [columns, facetIds, filterIds, fieldDefinitions]
  )

  // --- URL-persisted table state (bookmarkable / shareable / survives nav) ---
  const searchParams = useSearchParams()
  const pathname = usePathname()
  // Namespace params per table so multiple tables on one page don't collide.
  const key = React.useCallback(
    (name: string) => (tableId ? `${tableId}_${name}` : name),
    [tableId]
  )

  // Read the initial state from the URL exactly once on mount.
  const initial = React.useMemo(() => {
    const sorting: SortingState = []
    const sortParam = searchParams.get(key("sort"))
    if (sortParam) {
      for (const piece of sortParam.split(",")) {
        const [id, dir] = piece.split(":")
        if (id) sorting.push({ id, desc: dir === "desc" })
      }
    }

    const columnFilters: ColumnFiltersState = []
    for (const filter of filters ?? []) {
      const typedValue = parseDataTableFilterParam(
        searchParams.get(key(`f_${filter.columnId}`)),
        filter.type
      )
      if (
        typedValue &&
        typedValue.type === filter.type &&
        hasActiveFilterValue(typedValue)
      ) {
        columnFilters.push({ id: filter.columnId, value: typedValue })
      }
    }
    for (const f of facets ?? []) {
      if (filterIds.has(f.columnId)) continue
      const v = searchParams.get(key(`f_${f.columnId}`))
      if (v) columnFilters.push({ id: f.columnId, value: v.split(",") })
    }

    const globalFilter = searchParams.get(key("q")) ?? ""

    const columnVisibility: VisibilityState = {}
    const hidden = searchParams.get(key("hide"))
    if (hidden) for (const c of hidden.split(",")) columnVisibility[c] = false

    const pageIndex = Math.max(0, (Number(searchParams.get(key("page"))) || 1) - 1)
    const requestedSize = Number(searchParams.get(key("size")))
    const size = TABLE_PAGE_SIZES.some((option) => option === requestedSize)
      ? requestedSize
      : pageSize

    let filterTree=EMPTY_FILTER_TREE
    let filterError=''
    const encodedTree=searchParams.get(key("filter_v2"))
    if(searchParams.get(key("filter_v2_view")))filterError="These filters must be loaded from a Saved View"
    if(encodedTree)try {filterTree=validateFilterTree(JSON.parse(encodedTree),fieldDefinitions)}catch(e){filterError=e instanceof Error?e.message:'Invalid filters'}
    let layout:TableLayout|undefined
    let layoutError=false
    const encoded=searchParams.get(key("layout_v2"))
    if(encoded)try {layout=normalizeTableLayout(JSON.parse(encoded),fieldDefinitions)}catch{layoutError=true}
    return {
      filterTree,filterError,layout,layoutError,
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      pagination: { pageIndex, pageSize: size } as PaginationState,
    }
    // Intentionally read the URL once on mount; state is the source of truth after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [filterTree,setFilterTree]=React.useState<FilterGroup>(initial.filterTree)
  const [filterError,setFilterError]=React.useState(initial.filterError)
  const [sorting, setSorting] = React.useState<SortingState>(initial.sorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initial.columnFilters
  )
  const [globalFilter, setGlobalFilter] = React.useState<string>(
    initial.globalFilter
  )
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initial.layout?.visibility ?? normalizeTableLayout({visibility:initial.columnVisibility},fieldDefinitions).visibility
  )
  const [columnOrder, setColumnOrder] = React.useState<string[]>(initial.layout?.order ?? [])
  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>(initial.layout?.widths ?? {})
  const [columnPinning, setColumnPinning] = React.useState<{left:string[];right:string[]}>(initial.layout?.pinning ?? {left:[],right:[]})
  const [preferencesReady, setPreferencesReady] = React.useState(false)
  const layoutChanged = React.useRef(false)
  const preferenceLoaded = React.useRef(false)
  const [pagination, setPagination] = React.useState<PaginationState>(
    initial.pagination
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [serverRows, setServerRows] = React.useState(data)
  const [serverTotal, setServerTotal] = React.useState(server?.total ?? data.length)
  const [serverLoading, setServerLoading] = React.useState(false)
  const [serverError, setServerError] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const serverLoadPage = server?.loadPage
  const serverInitialTotal = server?.total

  const hasInitialUrlState =
    !!initial.filterTree.children.length || !!initial.filterError || !!initial.layout || initial.layoutError ||
    initial.sorting.length > 0 ||
    initial.columnFilters.length > 0 ||
    initial.globalFilter.length > 0 ||
    Object.keys(initial.columnVisibility).length > 0 ||
    initial.pagination.pageIndex > 0 ||
    initial.pagination.pageSize !== pageSize

  const effectiveFilters=React.useMemo(()=>{
    try{return {tree:advancedEnabled?mergeQuickFilterTree(filterTree,Object.fromEntries(columnFilters.map(filter=>[filter.id,filter.value])) as SavedViewPayload['filters']['columns'],fieldDefinitions):filterTree,error:''}}
    catch(error){return {tree:filterTree,error:error instanceof Error?error.message:'Check the filter values.'}}
  },[advancedEnabled,filterTree,columnFilters,fieldDefinitions])
  const skipFirstServerFetch = React.useRef(false)
  const initialDataSynced = React.useRef(false)
  React.useEffect(() => {
    if (serverInitialTotal == null) return
    if (!initialDataSynced.current) {
      initialDataSynced.current = true
      return
    }
    setServerRows(data)
    setServerTotal(serverInitialTotal)
    setRefreshKey((key) => key + 1)
  }, [data, serverInitialTotal])

  React.useEffect(() => {
    if (!serverLoadPage || filterError || effectiveFilters.error) return
    if (skipFirstServerFetch.current) {
      skipFirstServerFetch.current = false
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setServerLoading(true)
      setServerError(false)
      serverLoadPage({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: globalFilter,
        ...(advancedEnabled?{filterTree:effectiveFilters.tree}:{}),
        sorting,
        filters: (advancedEnabled?columnFilters.filter(filter=>!fieldDefinitions.some(field=>field.id===filter.id)):columnFilters) as ServerTableQuery["filters"],
      }).then((result) => {
        if (cancelled) return
        setServerRows(result.rows)
        setServerTotal(result.total)
        setServerLoading(false)
        const lastPage = Math.max(0, Math.ceil(result.total / pagination.pageSize) - 1)
        if (pagination.pageIndex > lastPage) {
          setPagination((current) => ({ ...current, pageIndex: lastPage }))
        }
      }).catch(() => {
        if (cancelled) return
        setServerLoading(false)
        setServerError(true)
      })
    }, globalFilter ? 180 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [serverLoadPage, pagination.pageIndex, pagination.pageSize, globalFilter, sorting, columnFilters, refreshKey,filterTree,filterError,advancedEnabled,effectiveFilters,fieldDefinitions])

  // Write state back to the URL whenever it changes, using history.replaceState
  // (NOT router.replace): a soft router navigation re-runs the server component,
  // which hands us a fresh `data` array whose new reference trips tanstack's
  // autoResetPageIndex and snaps pagination back — so Next/sort/filter would
  // "jump back". history.replaceState keeps the URL bookmarkable while leaving
  // `data` stable and avoiding a server round-trip (instant, smooth).
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const serializedTree=JSON.stringify(filterTree)
    if(filterTree.children.length && serializedTree.length<=4000){params.set(key("filter_v2"),serializedTree);params.delete(key("filter_v2_view"))}
    else if(filterTree.children.length){params.delete(key("filter_v2"));params.set(key("filter_v2_view"),"required")}
    else if(!filterError){params.delete(key("filter_v2"));params.delete(key("filter_v2_view"))}
    if(columnOrder.length || Object.keys(columnSizing).length || columnPinning.left.length || columnPinning.right.length)
      params.set(key("layout_v2"),JSON.stringify({visibility:columnVisibility,order:columnOrder,widths:columnSizing,pinning:columnPinning}))
    else params.delete(key("layout_v2"))

    if (sorting.length)
      params.set(
        key("sort"),
        sorting.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(",")
      )
    else params.delete(key("sort"))

    if (globalFilter) params.set(key("q"), globalFilter)
    else params.delete(key("q"))

    for (const f of facets ?? []) {
      if (filterIds.has(f.columnId)) continue
      const fv = columnFilters.find((c) => c.id === f.columnId)?.value as
        | string[]
        | undefined
      if (fv && fv.length) params.set(key(`f_${f.columnId}`), fv.join(","))
      else params.delete(key(`f_${f.columnId}`))
    }

    for (const filter of filters ?? []) {
      const fv = columnFilters.find((c) => c.id === filter.columnId)?.value as
        | DataTableFilterValue
        | undefined
      const validation = fv ? validateFilterValue(fv) : null
      if (
        fv &&
        fv.type === filter.type &&
        validation?.success &&
        hasActiveFilterValue(fv)
      ) {
        params.set(key(`f_${filter.columnId}`), JSON.stringify(fv))
      } else {
        params.delete(key(`f_${filter.columnId}`))
      }
    }

    const hiddenCols = Object.entries(columnVisibility)
      .filter(([, v]) => v === false)
      .map(([id]) => id)
    if (hiddenCols.length) params.set(key("hide"), hiddenCols.join(","))
    else params.delete(key("hide"))

    if (pagination.pageIndex > 0)
      params.set(key("page"), String(pagination.pageIndex + 1))
    else params.delete(key("page"))
    if (pagination.pageSize !== pageSize)
      params.set(key("size"), String(pagination.pageSize))
    else params.delete(key("size"))

    const qs = params.toString()
    const current = window.location.search.replace(/^\?/, "")
    if (qs !== current) {
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname
      )
    }
  }, [
    sorting,
    filterTree,filterError,
    columnFilters,
    globalFilter,
    columnVisibility,
    columnOrder,columnSizing,columnPinning,
    pagination,
    facets,
    filters,
    filterIds,
    pageSize,
    key,
    pathname,
  ])

  const clientRows = React.useMemo(()=>sorting.length ? [...data].sort((a,b)=>{const id=(row:TData)=>String((row as Record<string,unknown>).id??(row as Record<string,unknown>).funnelId??(row as Record<string,unknown>).quotationId??'');return id(a)<id(b)?-1:id(a)>id(b)?1:0}) : data,[data,sorting.length])
  const tableData = React.useMemo(() => server ? serverRows : advancedEnabled && effectiveFilters.tree.children.length ? clientRows.filter(row=>evaluateFilterTree(row,effectiveFilters.tree,fieldDefinitions,{now:new Date(),timezone:businessTimezone},(record,id)=>{
      const column=columns.find(c=>((c as {id?:string}).id??(c as {accessorKey?:string}).accessorKey)===id)
      if(tableId==='settings-api-keys'&&id==='status'){const row=record as {revokedAt?:Date;expiresAt:Date};return row.revokedAt?'Revoked':new Date(row.expiresAt)<=new Date()?'Expired':'Active'}
      if(['totalEstimatedFunnelAmount','primary','converted','roles','lastActive','manager','relationship','stage','default','active','approval','forecast'].includes(id))return computedTableValue(record as Record<string,unknown>,id)
      if(column && 'accessorFn' in column && column.accessorFn)return column.accessorFn(record as TData,0)
      return (record as Record<string,unknown>)[id]
    })) : clientRows, [server,serverRows,clientRows,advancedEnabled,fieldDefinitions,businessTimezone,columns,effectiveFilters,tableId])
  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnOrder, columnSizing, columnPinning,
      pagination,
      rowSelection,
    },
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    onGlobalFilterChange: (updater) => {
      setGlobalFilter(updater)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    globalFilterFn,
    onColumnVisibilityChange: updater => { layoutChanged.current=true; setColumnVisibility(updater) },
    onColumnOrderChange: updater => { layoutChanged.current=true; setColumnOrder(updater) },
    onColumnSizingChange: updater => { layoutChanged.current=true; setColumnSizing(updater) },
    onColumnPinningChange: updater => { layoutChanged.current=true; setColumnPinning(current=>{const next=typeof updater==='function'?updater(current):updater;return {left:next.left??[],right:next.right??[]}}) },
    columnResizeMode: "onChange",
    defaultColumn: { minSize:48, maxSize:800, size:160 },
    maxMultiSortColCount: 5,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: !!server,
    manualFiltering: !!server,
    manualSorting: !!server,
    rowCount: server ? serverTotal : undefined,
  })


  const applyLayout = React.useCallback((layout:TableLayout) => {
    setColumnVisibility(layout.visibility); setColumnOrder(layout.order)
    setColumnSizing(layout.widths); setColumnPinning(layout.pinning)
  }, [])
  React.useEffect(() => {
    let cancelled=false
    preferenceLoaded.current=false;layoutChanged.current=false;setPreferencesReady(false)
    if (!hasInitialUrlState)applyLayout(normalizeTableLayout({},currentFields.current))
    if (!tableId || !tableExists(tableId)) {setPreferencesReady(true);return}
    void readTablePreferences(tableId).then(layout=>{
      if (!cancelled && layout && !hasInitialUrlState && !layoutChanged.current) applyLayout(normalizeTableLayout(layout,currentFields.current))
    }).catch(()=>{}).finally(()=>{if(!cancelled){preferenceLoaded.current=true;setPreferencesReady(true)}})
    return ()=>{cancelled=true}
  }, [tableId,preferenceIdentity,hasInitialUrlState,applyLayout])
  React.useEffect(() => {
    if (!tableId || !preferencesReady || !preferenceLoaded.current || !layoutChanged.current) return
    const timer=setTimeout(()=>{
      void saveTablePreferences(tableId,{visibility:columnVisibility,order:columnOrder,widths:columnSizing,pinning:columnPinning}).then(result=>{if(!result.ok)toast.error(result.error)}).catch(()=>toast.error("Could not save table layout."))
    },700)
    return ()=>clearTimeout(timer)
  },[tableId,preferenceIdentity,preferencesReady,columnVisibility,columnOrder,columnSizing,columnPinning])
  function resetColumnLayout(){layoutChanged.current=true;applyLayout(normalizeTableLayout({},fieldDefinitions))}
  function columnStyle(column:Column<TData,unknown>):React.CSSProperties {
    const pin=isMobile?false:column.getIsPinned()
    return {width:column.getSize(),minWidth:column.getSize(),maxWidth:column.getSize(),position:pin?'sticky':undefined,left:pin==='left'?column.getStart('left'):undefined,right:pin==='right'?column.getAfter('right'):undefined,zIndex:pin?1:undefined,background:pin?'var(--background)':undefined}
  }

  // Search is shown whenever a caller opts in via `searchColumn` (kept as the
  // enable flag) — but it now filters ACROSS ALL columns, not just that one.
  const showSearch = !!searchColumn
  const hasActiveFilters = columnFilters.length > 0 || globalFilter.length > 0 || filterTree.children.length>0 || !!filterError || !!effectiveFilters.error

  const currentSavedPayload = React.useMemo<SavedViewPayload>(
    () => ({
      ...(tableId && tableExists(tableId) ? {tableState:{version:2 as const,filterTree:effectiveFilters.tree,layout:{visibility:columnVisibility,order:columnOrder,widths:columnSizing,pinning:columnPinning}}} : {}),
      filters: {
        ...(globalFilter ? { global: globalFilter } : {}),
        columns: Object.fromEntries(columnFilters.filter(filter=>!advancedEnabled||!!effectiveFilters.error||!fieldDefinitions.some(field=>field.id===filter.id)).map((filter) => [filter.id, filter.value])) as SavedViewPayload["filters"]["columns"],
      },
      sorting: sorting.map(({ id, desc }) => ({ id, desc })),
      visibility: columnVisibility,
      pageSize: pagination.pageSize,
    }),
    [effectiveFilters,advancedEnabled,fieldDefinitions,columnFilters, columnVisibility, columnOrder, columnSizing, columnPinning, tableId, globalFilter, pagination.pageSize, sorting]
  )

  const applySavedView = React.useCallback(
    (payload: SavedViewPayload) => {
      let state
      try { state=payload.tableState ? validateTableState(payload.tableState,fieldDefinitions) : null }
      catch { toast.error("This view uses a filter that is no longer available. Update the view before applying it."); return }
      const result = applySavedViewPayload(
        payload,
        columns.map(
          (column) =>
            (column as { id?: string; accessorKey?: string }).id ??
            (column as { accessorKey?: string }).accessorKey
        ).filter((id): id is string => !!id),
        filters ?? [],
        (facets ?? []).map((facet) => facet.columnId)
      )
      if(result.invalidFilters){toast.error("This view uses filters that are no longer available. Update the view before applying it.");return}
      if(state?.filterTree.children.length&&!advancedEnabled){toast.error("Advanced filters are not available for this list yet.");return}
      setFilterTree(state?.filterTree??EMPTY_FILTER_TREE);setFilterError('')
      if(state)applyLayout(state.layout)
      setSorting(result.sorting)
      setColumnFilters(result.columnFilters)
      setGlobalFilter(payload.filters.global ?? "")
      if(!state)setColumnVisibility(result.columnVisibility)
      setPagination({ pageIndex: 0, pageSize: server ? normalizeTablePageSize(result.pageSize) : result.pageSize })
      if (result.stale) toast.warning("Some saved view columns are no longer available.")
    },
    [columns, facets, filters, server, fieldDefinitions, applyLayout,advancedEnabled]
  )

  const resetToBaseView = React.useCallback(() => {
    setFilterTree(EMPTY_FILTER_TREE);setFilterError('')
    setSorting([])
    setColumnFilters([])
    setGlobalFilter("")
    setColumnVisibility({});setColumnOrder([]);setColumnSizing({});setColumnPinning({left:[],right:[]})
    setPagination({ pageIndex: 0, pageSize })
  }, [pageSize])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
              className="px-8"
            />
            {globalFilter ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setGlobalFilter("")
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className={renderFilteredView ? "order-3 flex w-full min-w-0 flex-wrap items-center gap-2" : "contents"}>
          {(filters ?? []).filter(filter=>!advancedEnabled||!!renderFilteredView||!fieldDefinitions.some(field=>field.id===filter.columnId)).map((filter) => {
            const col = table.getColumn(filter.columnId)
            if (!col) return null
            return (
              <TypedFilter
                key={filter.columnId}
                column={col}
                definition={filter}
              />
            )
          })}

          {(facets ?? []).filter(facet=>!advancedEnabled||!!renderFilteredView||!fieldDefinitions.some(field=>field.id===facet.columnId)).map((f) => {
            if (filterIds.has(f.columnId)) return null
            const col = table.getColumn(f.columnId)
            if (!col) return null
            return <FacetFilter key={f.columnId} column={col} title={f.title} />
          })}

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterTree(EMPTY_FILTER_TREE);setFilterError('')
                setColumnFilters([])
                setGlobalFilter("")
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
              className="text-muted-foreground"
            >
              <X className="size-4" /> Reset
            </Button>
          ) : null}
        </div>

        <div className={cn("ml-auto flex flex-wrap items-center justify-end gap-2", renderFilteredView && "order-2 shrink-0")}>
          {advancedEnabled&&renderFilteredView?<AdvancedFilterEditor fields={filterFields} value={effectiveFilters.tree} timezone={businessTimezone} onApply={tree=>{setColumnFilters(current=>current.filter(filter=>!fieldDefinitions.some(field=>field.id===filter.id)));setFilterTree(tree);setFilterError('');setPagination(current=>({...current,pageIndex:0}))}}/>:null}
          {toolbar}
          {tableId && savedViews && preferencesReady ? (
            <SavedViewMenu
              key={`${preferenceIdentity}:${tableId}`}
              listKey={tableId}
              currentPayload={currentSavedPayload}
              currentStateValid={!filterError&&!effectiveFilters.error}
              applyDefault={!hasInitialUrlState}
              onApply={applySavedView}
              onReset={resetToBaseView}
            />
          ) : null}
          <ColumnControls table={table} onReset={resetColumnLayout} labels={Object.fromEntries(fieldDefinitions.map(field=>[field.id,field.label]))} />
        </div>
      </div>

      {advancedEnabled&&effectiveFilters.tree.children.length>0?<div aria-label="Active filters" className="flex min-w-0 flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">{effectiveFilters.tree.logic==='and'?'Match all:':'Match any:'}</span>{effectiveFilters.tree.children.map(node=><div key={node.id} className="flex max-w-full min-w-0 items-center rounded-md border bg-muted/30 pr-1"><AdvancedFilterEditor fields={filterFields} value={effectiveFilters.tree} timezone={businessTimezone} title={describeFilter(node,filterFields)} onApply={tree=>{setColumnFilters(current=>current.filter(filter=>!fieldDefinitions.some(field=>field.id===filter.id)));setFilterTree(tree);setFilterError('');setPagination(current=>({...current,pageIndex:0}))}}/><Button size="icon-sm" variant="ghost" aria-label={`Remove ${describeFilter(node,filterFields)}`} onClick={()=>{setColumnFilters(current=>current.filter(filter=>!fieldDefinitions.some(field=>field.id===filter.id)));setFilterTree(removeFilterNode(effectiveFilters.tree,node.id));setPagination(current=>({...current,pageIndex:0}))}}><X className="size-3.5"/></Button></div>)}</div>:null}
      {JSON.stringify(filterTree).length>4000?<p role="status" className="text-xs text-muted-foreground">These filters are too large for a shareable link. Save them as a view to reuse them.</p>:null}
      {effectiveFilters.error?<StatusCallout role="alert" tone="danger">{effectiveFilters.error}</StatusCallout>:null}
      {filterError?<StatusCallout role="alert" tone="danger">{filterError}. Edit or clear the filters to continue.</StatusCallout>:null}
      {initial.layoutError?<StatusCallout role="alert" tone="warning">The saved column layout is invalid. Reset the column layout to continue.</StatusCallout>:null}
      {serverError ? (
        <StatusCallout role="alert" tone="danger" className="flex items-center gap-2">
          Could not load this page.
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>Retry</Button>
        </StatusCallout>
      ) : null}

      {!server && cap != null && data.length >= cap ? (
        <StatusCallout tone="warning" className="text-xs">
          Showing the most recent {cap} — refine your search to see more.
        </StatusCallout>
      ) : null}

      {filterError || effectiveFilters.error ? null : renderFilteredView ? renderFilteredView(table.getFilteredRowModel().rows.map((row) => row.original), {
        pageIndex: pagination.pageIndex, pageSize: pagination.pageSize, search: globalFilter,
        sorting, ...(advancedEnabled?{filterTree:effectiveFilters.tree}:{}), filters: (advancedEnabled?columnFilters.filter(filter=>!fieldDefinitions.some(field=>field.id===filter.id)):columnFilters) as ServerTableQuery["filters"],
      }) : <div className="overflow-hidden rounded-lg border">
        <Table style={{tableLayout:"fixed",width:table.getTotalSize(),minWidth:"100%"}}> 
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {[...headerGroup.headers].sort((a,b)=>{const rank=(c:Column<TData,unknown>)=>c.getIsPinned()==='left'?0:c.getIsPinned()==='right'?2:1;return rank(a.column)-rank(b.column)}).map((header) => (
                  <TableHead key={header.id} style={columnStyle(header.column)} className="relative">
                    {header.isPlaceholder
                      ? null
                      : advancedEnabled && filterFields.find(field=>field.id===header.column.id)?.operators.length ? <AdvancedFilterEditor
                        fields={filterFields} value={effectiveFilters.tree} fieldId={header.column.id}
                        title={typeof header.column.columnDef.header==='string'?header.column.columnDef.header:filterFields.find(field=>field.id===header.column.id)!.label}
                        timezone={businessTimezone} sorting={header.column.getIsSorted()}
                        onSort={header.column.getCanSort()?direction=>{if(direction===false)header.column.clearSorting();else header.column.toggleSorting(direction==='desc')}:undefined}
                        onApply={tree=>{setColumnFilters(current=>current.filter(filter=>!fieldDefinitions.some(field=>field.id===filter.id)));setFilterTree(tree);setFilterError('');setPagination(current=>({...current,pageIndex:0}))}}
                      /> : flexRender(header.column.columnDef.header, header.getContext())}
                    <div role="separator" aria-orientation="vertical" aria-label={`Resize ${header.column.id}`} tabIndex={0} onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} onDoubleClick={()=>header.column.resetSize()} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();layoutChanged.current=true;setColumnSizing(current=>({...current,[header.column.id]:Math.max(48,Math.min(800,header.column.getSize()+(event.key==='ArrowRight'?8:-8)))}))}}} className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none bg-border opacity-0 hover:opacity-100 focus:opacity-100" />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {serverLoading ? (
              <TableRow><TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">Loading records…</TableCell></TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={columnStyle(cell.column)} title={typeof cell.getValue() === "string" ? cell.getValue() as string : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyMessage}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {server
            ? `${serverTotal} matching row(s)`
            : hasActiveFilters
            ? `${table.getFilteredRowModel().rows.length} of ${data.length} row(s)`
            : `${data.length} row(s)`}
        </span>
        {!renderFilteredView ? <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...new Set([pageSize, ...TABLE_PAGE_SIZES])].sort((a, b) => a - b).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div> : null}
      </div>
    </div>
  )
}

type FilterColumn = Pick<
  Column<unknown, unknown>,
  "getFilterValue" | "setFilterValue"
>

function setTypedFilter(column: FilterColumn, value: DataTableFilterValue) {
  column.setFilterValue(value)
}

function clearTypedFilter(column: FilterColumn) {
  column.setFilterValue(undefined)
}

function filterTitle(definition: DataTableFilterDefinition): string {
  return definition.title ?? definition.label ?? definition.columnId
}

function filterOperators(
  configured: readonly string[] | undefined,
  fallback: readonly string[]
): readonly string[] {
  const allowed = configured?.filter((operator) => fallback.includes(operator))
  return allowed?.length ? allowed : fallback
}

function defaultOperator<T extends string>(
  configured: readonly T[] | undefined,
  fallback: readonly T[],
  current: string | undefined
): T {
  const options = filterOperators(configured, fallback)
  return (current && options.includes(current as T) ? current : options[0]) as T
}

// Menu typeahead must not consume typing or caret navigation in form controls.
function keepFilterInputFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation()
}

function OperatorSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <select
      onKeyDown={keepFilterInputFocus}
      aria-label="Filter operator"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace(/-/g, " ")}
        </option>
      ))}
    </select>
  )
}

function TypedFilter<TData, TValue>({
  column,
  definition,
}: {
  column: Column<TData, TValue>
  definition: DataTableFilterDefinition
}) {
  const filterColumn = column as unknown as FilterColumn
  const current = column.getFilterValue() as DataTableFilterValue | undefined
  const title = filterTitle(definition)
  const active = hasActiveFilterValue(current)

  switch (definition.type) {
    case "text": {
      const typed = current?.type === "text" ? current : undefined
      const operator = defaultOperator(definition.operators, ["contains", "equals", "starts-with"], typed?.operator)
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="border-dashed">
                <ListFilter className="size-4" />
                {title}
                {active ? <Badge variant="secondary" className="ml-1 rounded px-1 text-xs">1</Badge> : null}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-64 space-y-2 p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-0 text-xs text-muted-foreground">
                {title}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <OperatorSelect
              value={operator}
              options={filterOperators(definition.operators, ["contains", "equals", "starts-with"])}
              onChange={(next) =>
                setTypedFilter(filterColumn, {
                  type: "text",
                  operator: next as TextFilterOperator,
                  value: typed?.value ?? "",
                })
              }
            />
            <Input
              onKeyDown={keepFilterInputFocus}
              autoFocus
              value={typed?.value ?? ""}
              onChange={(event) =>
                setTypedFilter(filterColumn, {
                  type: "text",
                  operator,
                  value: event.target.value,
                })
              }
              placeholder="Value"
            />
            {active ? <DropdownMenuItem onClick={() => clearTypedFilter(filterColumn)}>Clear</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    case "number":
    case "money": {
      const typed = current?.type === definition.type ? current : undefined
      const operator = defaultOperator(
        definition.operators,
        ["equals", "greater-than", "less-than", "between"],
        typed?.operator
      )
      const isBetween = operator === "between"
      const input = (field: "value" | "min" | "max", placeholder: string) => (
        <Input
              onKeyDown={keepFilterInputFocus}
          type="number"
          value={typed?.[field] == null ? "" : String(typed[field])}
          onChange={(event) => {
            const raw = event.target.value
            const nextValue = raw === "" ? undefined : Number(raw)
            setTypedFilter(filterColumn, {
              type: definition.type,
              operator,
              ...(field === "value" ? { value: nextValue } : { [field]: nextValue }),
              ...(field !== "value" && typed?.[field === "min" ? "max" : "min"] != null
                ? { [field === "min" ? "max" : "min"]: typed[field === "min" ? "max" : "min"] }
                : {}),
            } as DataTableFilterValue)
          }}
          placeholder={placeholder}
        />
      )
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="border-dashed">
                <ListFilter className="size-4" />
                {title}
                {active ? <Badge variant="secondary" className="ml-1 rounded px-1 text-xs">1</Badge> : null}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-64 space-y-2 p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-0 text-xs text-muted-foreground">
                {title}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <OperatorSelect
              value={operator}
              options={filterOperators(definition.operators, ["equals", "greater-than", "less-than", "between"])}
              onChange={(next) =>
                setTypedFilter(filterColumn, {
                  type: definition.type,
                  operator: next as NumericFilterOperator,
                  ...(typed?.value != null ? { value: typed.value } : {}),
                  ...(typed?.min != null ? { min: typed.min } : {}),
                  ...(typed?.max != null ? { max: typed.max } : {}),
                })
              }
            />
            {isBetween ? (
              <div className="grid grid-cols-2 gap-2">
                {input("min", "Min")}
                {input("max", "Max")}
              </div>
            ) : (
              input("value", "Value")
            )}
            {active ? <DropdownMenuItem onClick={() => clearTypedFilter(filterColumn)}>Clear</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    case "date": {
      const typed = current?.type === "date" ? current : undefined
      const operator = defaultOperator(definition.operators, ["on", "before", "after", "between"], typed?.operator)
      const isBetween = operator === "between"
      const dateInput = (field: "value" | "from" | "to", placeholder: string) => (
        <Input
              onKeyDown={keepFilterInputFocus}
          type="date"
          aria-label={placeholder}
          value={typed?.[field] ?? ""}
          onChange={(event) =>
            setTypedFilter(filterColumn, {
              type: "date",
              operator,
              ...(field === "value" ? { value: event.target.value } : { [field]: event.target.value }),
              ...(field !== "value" && typed?.[field === "from" ? "to" : "from"]
                ? { [field === "from" ? "to" : "from"]: typed[field === "from" ? "to" : "from"] }
                : {}),
            } as DataTableFilterValue)
          }
        />
      )
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="border-dashed">
                <ListFilter className="size-4" />
                {title}
                {active ? <Badge variant="secondary" className="ml-1 rounded px-1 text-xs">1</Badge> : null}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-64 space-y-2 p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-0 text-xs text-muted-foreground">
                {title}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <OperatorSelect
              value={operator}
              options={filterOperators(definition.operators, ["on", "before", "after", "between"])}
              onChange={(next) =>
                setTypedFilter(filterColumn, {
                  type: "date",
                  operator: next as DateFilterOperator,
                  ...(typed?.value ? { value: typed.value } : {}),
                  ...(typed?.from ? { from: typed.from } : {}),
                  ...(typed?.to ? { to: typed.to } : {}),
                })
              }
            />
            {isBetween ? (
              <div className="grid grid-cols-2 gap-2">
                {dateInput("from", "From")}
                {dateInput("to", "To")}
              </div>
            ) : (
              dateInput("value", "Date")
            )}
            {active ? <DropdownMenuItem onClick={() => clearTypedFilter(filterColumn)}>Clear</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    case "boolean": {
      const typed = current?.type === "boolean" ? current : undefined
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="border-dashed">
                <ListFilter className="size-4" />
                {title}
                {active ? <Badge variant="secondary" className="ml-1 rounded px-1 text-xs">1</Badge> : null}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-40 p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-0 text-xs text-muted-foreground">{title}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <OperatorSelect
              value={typed?.value == null ? "any" : String(typed.value)}
              options={["any", "true", "false"]}
              onChange={(next) =>
                next === "any"
                  ? clearTypedFilter(filterColumn)
                  : setTypedFilter(filterColumn, { type: "boolean", value: next === "true" })
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    case "enum":
    case "relation":
      return (
        <OptionFilter
          column={filterColumn}
          definition={definition}
          current={current}
          title={title}
          active={active}
        />
      )
  }
}

function OptionFilter({
  column,
  definition,
  current,
  title,
  active,
}: {
  column: FilterColumn
  definition: Extract<DataTableFilterDefinition, { type: "enum" | "relation" }>
  current: DataTableFilterValue | undefined
  title: string
  active: boolean
}) {
  const [query, setQuery] = React.useState("")
  const selected =
    current?.type === "enum"
      ? new Set(current.value ?? [])
      : current?.type === "relation"
        ? new Set(Array.isArray(current.value) ? current.value : current.value ? [current.value] : [])
        : new Set<string>()
  const options = (definition.options ?? []).filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  )
  const displayedOptions = options.length > 100
    ? [...options.filter((option) => selected.has(option.value)), ...options.filter((option) => !selected.has(option.value))].slice(0, 100)
    : options

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setTypedFilter(column, { type: definition.type, value: Array.from(next) })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed">
            <ListFilter className="size-4" />
            {title}
            {active ? <Badge variant="secondary" className="ml-1 rounded px-1 text-xs">{selected.size}</Badge> : null}
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className="max-h-[min(28rem,calc(100vh-6rem))] w-[min(22rem,calc(100vw-2rem))] overflow-auto p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-0 text-xs text-muted-foreground">{title}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {(definition.type === "relation" || (definition.options?.length ?? 0) > 20) ? (
          <Input
              onKeyDown={keepFilterInputFocus}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="mb-2"
          />
        ) : null}
        {options.length === 0 ? (
          <div className="px-1 py-2 text-xs text-muted-foreground">No values</div>
        ) : (
          <DropdownMenuGroup>
            {displayedOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selected.has(option.value)}
                onCheckedChange={() => toggle(option.value)}
                className="min-h-9 whitespace-normal py-2 pr-10 pl-2 leading-5"
              >
                <FilterOptionLabel label={option.label} />
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}
        {options.length > displayedOptions.length ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Showing {displayedOptions.length} of {options.length}. Search to narrow the list.</p>
        ) : null}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => clearTypedFilter(column)}>Clear</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterOptionLabel({ label }: { label: string }) {
  const separator = " — "
  const splitAt = label.indexOf(separator)
  if (splitAt < 0) return <span>{label}</span>

  return (
    <span className="grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)] items-baseline gap-2">
      <span className="font-mono text-xs font-medium text-muted-foreground">
        {label.slice(0, splitAt)}
      </span>
      <span className="min-w-0 truncate" title={label.slice(splitAt + separator.length)}>
        {label.slice(splitAt + separator.length)}
      </span>
    </span>
  )
}

function FacetFilter<TData, TValue>({
  column,
  title,
}: {
  column: Column<TData, TValue>
  title: string
}) {
  const selected = new Set((column.getFilterValue() as string[]) ?? [])
  const options = Array.from(column.getFacetedUniqueValues().keys())
    .filter((v) => v != null && v !== "")
    .map((v) => String(v))
    .sort()

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    const arr = Array.from(next)
    column.setFilterValue(arr.length ? arr : undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed">
            <ListFilter className="size-4" />
            {title}
            {selected.size > 0 ? (
              <Badge variant="secondary" className="ml-1 rounded px-1 text-xs">
                {selected.size}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="max-h-72 w-52 overflow-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground capitalize">
            {title}
          </DropdownMenuLabel>
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No values
            </div>
          ) : (
            options.map((value) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={selected.has(value)}
                onCheckedChange={() => toggle(value)}
                className="capitalize"
              >
                {value.replace(/_/g, " ")}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuGroup>
        {selected.size > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => column.setFilterValue(undefined)}>
              Clear
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Reusable sortable column header. Use as a column's `header`. */
export function SortableHeader({
  column,
  title,
  className,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any
  title: string
  className?: string
}) {
  const sorted = column.getIsSorted() as "asc" | "desc" | false
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2 h-7 max-w-full min-w-0 data-[state=open]:bg-accent",
        sorted && "text-foreground",
        className
      )}
      title="Click to sort; Shift+click to add a sort field"
      onClick={(event) => column.toggleSorting(sorted === "asc",event.shiftKey)}
    >
      <span className="min-w-0 truncate">{title}</span>
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 size-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground/60" />
      )}
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* Column-def factories for the cell shapes repeated across every      */
/* table: right-aligned money, and the primary-name record link.       */
/* ------------------------------------------------------------------ */

/** Right-aligned column header (pairs with moneyCell). */
export function rightHeader(title: string) {
  return function RightHeader() {
    return <div className="text-right">{title}</div>
  }
}

/** Right-aligned tabular money cell; em-dash when the amount is empty. */
export function moneyCell<TData>(
  amount: (row: TData) => string | number | null | undefined,
  currency: (row: TData) => string | null | undefined
) {
  return function MoneyCell({ row }: { row: { original: TData } }) {
    const value = amount(row.original)
    return (
      <div className="text-right tabular-nums">
        {value != null && value !== ""
          ? formatMoney(String(value), currency(row.original) ?? undefined)
          : "—"}
      </div>
    )
  }
}

/** Primary-name cell linking to the record's detail page. */
export function linkCell<TData>(
  href: (row: TData) => string,
  label: (row: TData) => React.ReactNode
) {
  return function LinkCell({ row }: { row: { original: TData } }) {
    return (
      <Link href={href(row.original)} className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] font-medium link">
        {label(row.original)}
      </Link>
    )
  }
}
