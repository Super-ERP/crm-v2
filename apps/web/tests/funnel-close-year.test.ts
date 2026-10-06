import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { expectedCloseYearFilter } from "@/server/services/funnel-filters"

const dialect = new PgDialect()

describe("expected close year filtering", () => {
  it("bounds the whole calendar year with an exclusive next-year boundary", () => {
    const condition = expectedCloseYearFilter(sql`close_date`, ["2026"])
    const query = dialect.sqlToQuery(condition!)
    expect(query.params).toEqual(["2026-01-01", "2027-01-01"])
    expect(query.sql).toContain(">=")
    expect(query.sql).toContain("<")
  })
  it("combines selected years and leaves an unfiltered query alone", () => {
    expect(expectedCloseYearFilter(sql`close_date`, undefined)).toBeUndefined()
    expect(expectedCloseYearFilter(sql`close_date`, [])).toBeUndefined()
    const query = dialect.sqlToQuery(expectedCloseYearFilter(sql`close_date`, ["2025", "2027"])!)
    expect(query.sql).toContain(" or ")
    expect(query.params).toEqual(["2025-01-01", "2026-01-01", "2027-01-01", "2028-01-01"])
  })
  it("does not broaden results for malformed selected years", () => {
    const query = dialect.sqlToQuery(expectedCloseYearFilter(sql`close_date`, ["2026-foo", "0", "malformed"])!)
    expect(query.sql).toBe("false")
  })
})
