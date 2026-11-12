"use client"


import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, MoreHorizontal, Plus } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { formatDate } from "@/lib/format"
import { useOpenOnNewParam } from "@/hooks/use-open-on-new-param"
import { usePermissions } from "@/components/command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import type { Option, CountryOption } from "@/lib/lookups"
import { AccountForm } from "./account-form"
import { listAccountPage, type AccountListItem } from "./actions"

function RowActions({ account }: { account: AccountListItem }) {
  const router = useRouter()
  const perms = usePermissions()
  const canUpdate = perms.has(PERMISSIONS.ACCOUNT_UPDATE)

  return (
    <div className="flex items-center justify-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem nativeButton={false} render={<Link href={`/accounts/${account.id}`} />}>
            View
          </DropdownMenuItem>
          {canUpdate ? (
            <DropdownMenuItem onClick={() => router.push(`/accounts/${account.id}?edit=1`)}>
              Edit
            </DropdownMenuItem>
          ) : null}

        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  )
}

export function AccountsTable({
  initialPage,
  filterOptions,
  parentOptions,
  industries,
  countries,
  currencies,
  presets,
}: {
  initialPage: { rows: AccountListItem[]; total: number }
  filterOptions: { types: string[]; industries: string[]; owners: string[] }
  parentOptions: Option[]
  industries: string[]
  countries: CountryOption[]
  currencies: string[]
  /** Tenant form presets (default country / phone prefix) for the create form. */
  presets?: { defaultCountry: string; phonePrefix: string }
}) {
  const data = initialPage.rows
  const router = useRouter()
  const perms = usePermissions()
  const canCreate = perms.has(PERMISSIONS.ACCOUNT_CREATE)
  const [newOpen, setNewOpen] = React.useState(false)
  // Auto-open from the header "+ New" quick-create deep link (/accounts?new=1).
  useOpenOnNewParam(() => setNewOpen(true))

  const columns = React.useMemo<ColumnDef<AccountListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: linkCell(
          (r) => `/accounts/${r.id}`,
          (r) => r.name
        ),
      },
      {
        accessorKey: "ownerName",
        header: "Owner",
        cell: ({ row }) =>
          row.original.ownerName ?? (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "code",
        header: ({ column }) => <SortableHeader column={column} title="Code" />,
        cell: ({ row }) =>
          row.original.code ? (
            <span className="font-mono text-xs">{row.original.code}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "accountType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.accountType === "reseller" ? "Reseller" : "Client"}
          </Badge>
        ),
      },
      {
        accessorKey: "currency",
        header: "Currency",
        cell: ({ row }) => row.original.currency,
      },
      {
        accessorKey: "industry",
        header: "Industry",
        cell: ({ row }) => row.original.industry ?? "—",
      },
      {
        accessorKey: "parentAccountName",
        header: "Parent account",
        cell: ({ row }) =>
          row.original.parentAccountId ? (
            <Link
              href={`/accounts/${row.original.parentAccountId}`}
              className="link"
            >
              {row.original.parentAccountName ?? "—"}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column} title="Created" />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions account={row.original} />
        ),
        enableHiding: false,
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      server={{ total: initialPage.total, loadPage: listAccountPage }}
      tableId="accounts"
      filters={[
        { type: "enum", columnId: "accountType", title: "Type", options: filterOptions.types.map((value) => ({ value, label: value })) },
        { type: "enum", columnId: "industry", title: "Industry", options: filterOptions.industries.map((value) => ({ value, label: value })) },
        { type: "relation", columnId: "ownerName", title: "Owner", options: filterOptions.owners.map((value) => ({ value, label: value })) },
      ]}
      searchColumn="name"
      searchPlaceholder="Search accounts…"
      emptyIcon={Building2}
      emptyMessage="No accounts yet"
      emptyDescription="Add a customer account to start tracking contacts and Funnels."
      emptyAction={
        canCreate ? (
          <AccountForm
            parentOptions={parentOptions}
            endUserOptions={parentOptions}
            industries={industries}
            countries={countries}
            currencies={currencies}
            presets={presets}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New account
              </Button>
            }
            onSaved={() => router.refresh()}
          />
        ) : undefined
      }
      toolbar={
        canCreate ? (
          <AccountForm
            parentOptions={parentOptions}
            endUserOptions={parentOptions}
            industries={industries}
            countries={countries}
            currencies={currencies}
            presets={presets}
            open={newOpen}
            onOpenChange={setNewOpen}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New account
              </Button>
            }
            onSaved={() => router.refresh()}
          />
        ) : undefined
      }
    />
  )
}
