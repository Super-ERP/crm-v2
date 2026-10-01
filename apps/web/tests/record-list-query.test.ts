import { describe, expect, it } from "vitest"
import { normalizeRecordListQuery } from "@/lib/record-list-query"

describe("normalizeRecordListQuery", () => {
  it("bounds page requests and accepts only configured sort and filter keys", () => {
    const normalized = normalizeRecordListQuery({
      pageIndex: 2, pageSize: 500, search: "  Acme  ",
      sorting: [{ id: "name", desc: true }, { id: "ignored", desc: false }],
      filters: [
        { id: "accountId", value: { type: "relation", value: ["a", "b"] } },
        { id: "status", value: { type: "enum", value: ["open"] } },
        { id: "ignored", value: { type: "relation", value: "secret" } },
      ],
    }, ["name"], ["accountId", "status"])

    expect(normalized).toEqual({
      limit: 25, offset: 50,
      query: { search: "Acme", sort: { id: "name", desc: true }, selections: { accountId: ["a", "b"], status: ["open"] } },
    })
  })

  it("normalizes boolean filters for server queries", () => {
    const normalized = normalizeRecordListQuery({
      pageIndex: -1, pageSize: 100, search: "",
      sorting: [{ id: "injected", desc: true }],
      filters: [{ id: "isActive", value: { type: "boolean", value: false } }],
    }, ["name"], ["isActive"])
    expect(normalized.limit).toBe(100)
    expect(normalized.offset).toBe(0)
    expect(normalized.query.selections.isActive).toEqual(["false"])
    expect(normalized.query.sort).toBeUndefined()
  })
})
