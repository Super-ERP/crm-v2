import { z } from "zod"
import type { SavedViewRow } from "@/db/schema"
import { validateFilterValue, type DataTableFilterValue } from "@/lib/data-table-filters"

export type SavedViewFilters = {
  global?: string
  columns: Record<string, DataTableFilterValue | readonly string[]>
}

export type SavedViewPayload = {
  filters: SavedViewFilters
  sorting: { id: string; desc: boolean }[]
  visibility: Record<string, boolean>
  pageSize: number
}

export type SavedView = {
  id: string
  listKey: string
  name: string
  payload: SavedViewPayload
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

const filterColumnsSchema = z.record(z.string().min(1).max(100), z.unknown()).superRefine(
  (columns, context) => {
    for (const [columnId, value] of Object.entries(columns)) {
      const validFacet =
        Array.isArray(value) && value.every((item) => typeof item === "string")
      if (!validFacet && !validateFilterValue(value).success) {
        context.addIssue({
          code: "custom",
          path: [columnId],
          message: "Invalid data table filter.",
        })
      }
    }
  }
)

export const savedViewPayloadSchema = z
  .object({
    filters: z
      .object({
        global: z.string().max(500).optional(),
        columns: filterColumnsSchema,
      })
      .strict(),
    sorting: z
      .array(
        z.object({ id: z.string().min(1).max(100), desc: z.boolean() }).strict()
      )
      .max(50),
    visibility: z.record(z.string().min(1).max(100), z.boolean()),
    pageSize: z.number().int().min(1).max(1000),
  })
  .strict()

export function validateSavedViewPayload(input: unknown):
  | { success: true; value: SavedViewPayload }
  | { success: false; error: string } {
  const parsed = savedViewPayloadSchema.safeParse(input)
  if (parsed.success) return { success: true, value: parsed.data as SavedViewPayload }
  return {
    success: false,
    error: parsed.error.issues[0]?.message ?? "Invalid saved view payload.",
  }
}

export const savedViewListKeySchema = z.string().trim().min(1).max(100)
export const savedViewNameSchema = z.string().trim().min(1).max(100)
export const savedViewIdSchema = z.string().uuid()
export const savedViewInputSchema = z
  .object({
    listKey: savedViewListKeySchema,
    name: savedViewNameSchema,
    payload: savedViewPayloadSchema,
  })
  .strict()

export type SavedViewInput = z.input<typeof savedViewInputSchema>

type SavedViewOwner = { tenantId: string; memberId: string }

export type SavedViewRepositoryRow = SavedViewRow
export type SavedViewRepositoryInsert = Pick<
  SavedViewRow,
  | "organizationId"
  | "memberId"
  | "listKey"
  | "name"
  | "filters"
  | "sorting"
  | "visibility"
  | "pageSize"
  | "isDefault"
>

export interface SavedViewRepository {
  list(listKey: string): Promise<SavedViewRepositoryRow[]>
  get(id: string): Promise<SavedViewRepositoryRow | undefined>
  insert(input: SavedViewRepositoryInsert): Promise<SavedViewRepositoryRow>
  update(
    id: string,
    patch: Partial<SavedViewRepositoryRow>
  ): Promise<SavedViewRepositoryRow | undefined>
  delete(id: string): Promise<boolean>
  clearDefaults(listKey: string, owner: SavedViewOwner): Promise<void>
}

export function savedViewRlsAllows(
  rowOrganizationId: string,
  currentTenantId: string | null | undefined
) {
  return Boolean(currentTenantId) && rowOrganizationId === currentTenantId
}

function assertOwned(row: SavedViewRepositoryRow | undefined, owner: SavedViewOwner) {
  if (
    !row ||
    !savedViewRlsAllows(row.organizationId, owner.tenantId) ||
    row.memberId !== owner.memberId
  ) {
    throw new Error("Saved view not found.")
  }
  return row
}

export function createSavedViewService(
  repository: SavedViewRepository,
  owner: SavedViewOwner
) {
  return {
    async list(listKey: string) {
      const parsedListKey = savedViewListKeySchema.parse(listKey)
      const rows = await repository.list(parsedListKey)
      return rows
        .filter(
          (row) =>
            savedViewRlsAllows(row.organizationId, owner.tenantId) &&
            row.memberId === owner.memberId
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    async get(id: string) {
      return assertOwned(await repository.get(savedViewIdSchema.parse(id)), owner)
    },
    async save(input: SavedViewInput) {
      const parsed = savedViewInputSchema.parse(input)
      return repository.insert({
        organizationId: owner.tenantId,
        memberId: owner.memberId,
        listKey: parsed.listKey,
        name: parsed.name,
        filters: parsed.payload.filters,
        sorting: parsed.payload.sorting,
        visibility: parsed.payload.visibility,
        pageSize: parsed.payload.pageSize,
        isDefault: false,
      })
    },
    async rename(id: string, name: string) {
      const row = assertOwned(await repository.get(savedViewIdSchema.parse(id)), owner)
      const parsedName = savedViewNameSchema.parse(name)
      return assertOwned(
        await repository.update(row.id, { name: parsedName, updatedAt: new Date() }),
        owner
      )
    },
    async duplicate(id: string, name: string) {
      const source = assertOwned(await repository.get(savedViewIdSchema.parse(id)), owner)
      const parsedName = savedViewNameSchema.parse(name)
      return repository.insert({
        organizationId: owner.tenantId,
        memberId: owner.memberId,
        listKey: source.listKey,
        name: parsedName,
        filters: source.filters,
        sorting: source.sorting,
        visibility: source.visibility,
        pageSize: source.pageSize,
        isDefault: false,
      })
    },
    // Call inside the tenant transaction so clearing and setting stay atomic.
    async setDefault(id: string) {
      const parsedId = savedViewIdSchema.parse(id)
      const selected = assertOwned(await repository.get(parsedId), owner)
      await repository.clearDefaults(selected.listKey, owner)
      return assertOwned(
        await repository.update(selected.id, {
          isDefault: true,
          updatedAt: new Date(),
        }),
        owner
      )
    },
    async delete(id: string) {
      const row = assertOwned(await repository.get(savedViewIdSchema.parse(id)), owner)
      if (!(await repository.delete(row.id))) throw new Error("Saved view not found.")
    },
  }
}
