import { beforeEach, describe, expect, it, vi } from "vitest"

import { createDisabledModuleMap, type ModuleId } from "@/lib/module-registry"

const mocks = vi.hoisted(() => {
  class TestModuleAccessDeniedError extends Error {
    constructor(readonly moduleId: string) {
      super(`The ${moduleId} module is not licensed.`)
      this.name = "ModuleAccessDeniedError"
    }
  }
  return {
    map: {
      projects: false,
      salesOrders: false,
      finance: false,
      forecast: false,
      audit: false,
      advancedRoles: false,
      documentation: false,
    },
    TestModuleAccessDeniedError,
    requireContext: vi.fn(),
    runInTenant: vi.fn(),
  }
})

vi.mock("@/lib/modules.server", () => {
  async function requireEntitledModule(id: ModuleId) {
    if (!mocks.map[id]) throw new mocks.TestModuleAccessDeniedError(id)
  }
  return {
    ModuleAccessDeniedError: mocks.TestModuleAccessDeniedError,
    getEntitledModuleMap: vi.fn(async () => mocks.map),
    requireEntitledModule,
    withEntitledModule: vi.fn(async (id: ModuleId, work: () => unknown) => {
      await requireEntitledModule(id)
      return work()
    }),
  }
})

vi.mock("@/lib/server-context", () => ({
  requireContext: mocks.requireContext,
  getServerContext: mocks.requireContext,
  assertCan: vi.fn(),
}))

vi.mock("@/db", () => ({
  db: {},
  runInTenant: mocks.runInTenant,
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { listSalesOrderPage } from "@/app/(app)/sales-orders/actions"
import { listFinanceDocPage } from "@/app/(app)/billing/actions"
import { listInboundIntercompanyDealPage } from "@/app/(app)/intercompany/actions"
import { getForecast } from "@/app/(app)/forecast/actions"
import { listAuditPage } from "@/app/(app)/audit/actions"

describe("direct optional action denial matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.map = createDisabledModuleMap()
  })

  it.each([
    ["sales order", "salesOrders", () => listSalesOrderPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] })],
    ["billing", "finance", () => listFinanceDocPage("sale", { pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] })],
    ["intercompany", "finance", () => listInboundIntercompanyDealPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] })],
    ["forecast", "forecast", () => getForecast()],
    ["audit", "audit", () => listAuditPage({ pageIndex: 0, pageSize: 25, search: "", sorting: [], filters: [] })],
  ] as const)("denies the real %s action before context or tenant work", async (_label, moduleId, invoke) => {
    await expect(invoke()).rejects.toMatchObject({ moduleId })
    expect(mocks.requireContext).not.toHaveBeenCalled()
    expect(mocks.runInTenant).not.toHaveBeenCalled()
  })
})
