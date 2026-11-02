import { describe, expect, it } from "vitest"
import { parseQuotationDate } from "@/lib/quotation-date"

describe("quotation date", () => {
  it("accepts backdated, future and leap-day calendar dates unchanged", () => {
    for (const date of ["2020-01-01", "2030-12-31", "2024-02-29"]) expect(parseQuotationDate(date)).toBe(date)
  })
  it("rejects missing, malformed and impossible dates", () => {
    for (const date of [null, "", "2026-02-29", "2026-04-31", "2026-13-01", "02/11/2026", "0000-01-01"]) {
      expect(() => parseQuotationDate(date)).toThrow("Quotation date must be a valid date")
    }
  })
})
