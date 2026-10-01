import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { DashboardCurrencyProvider, selectAvailableCurrency } from "@/app/(app)/dashboard/dashboard-currency"
import { KpiSection } from "@/app/(app)/dashboard/kpi-section"

describe("dashboard currency selection", () => {
  it("falls back when a refreshed dashboard no longer contains the selected currency", () => {
    expect(selectAvailableCurrency("USD", "MYR", ["MYR"])).toBe("MYR")
    expect(selectAvailableCurrency("USD", "MYR", ["EUR"])).toBe("EUR")
  })

  it("shows only the selected currency's pipeline value without converting or combining amounts", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardCurrencyProvider, {
        available: ["MYR", "USD"],
        defaultCurrency: "USD",
      }, createElement(KpiSection, {
          myPipeline: {
            count: 2,
            byCurrency: [
              { currency: "MYR", count: 1, total: "1000" },
              { currency: "USD", count: 1, total: "20" },
            ],
          },
          orgPipeline: null,
          approvalsCount: 0,
          canApproveAll: false,
          followUpsCount: 0,
          followUpDueDays: 7,
          hasOverdue: false,
        }))
    )

    expect(html).toContain("Display currency")
    expect(html).toContain("$20.00")
    expect(html).not.toContain("RM1,000.00")
    expect(html).toContain("1 USD owned funnels")
  })
})
