import { describe, expect, it } from "vitest"
import { normalizeQuotationListQuery } from "@/lib/quotation-list-query"

describe("quotation list paging", () => {
  it("defaults old 500-row views to 25 and never requests an unbounded page", () => {
    expect(normalizeQuotationListQuery({
      pageIndex: 0, pageSize: 500, search: "", sorting: [], filters: [],
    })).toMatchObject({ limit: 25, offset: 0 })
  })

  it("keeps filtering and sorting across server pages", () => {
    expect(normalizeQuotationListQuery({
      pageIndex: 2,
      pageSize: 50,
      search: "  Academy  ",
      sorting: [{ id: "quoteNumber", desc: true }],
      filters: [
        { id: "accountId", value: { type: "relation", value: ["account-1"] } },
        { id: "status", value: { type: "enum", value: ["draft", "sent"] } },
      ],
    })).toEqual({
      limit: 50,
      offset: 100,
      query: {
        search: "Academy",
        sort: { id: "quoteNumber", desc: true },
        accountIds: ["account-1"],
        statuses: ["draft", "sent"],
      },
    })
  })
})
