import { or, sql, type SQLWrapper } from "drizzle-orm"

/** Date ranges include every day in a selected year and keep null dates excluded. */
export function expectedCloseYearFilter(column: SQLWrapper, selections?: string[]) {
  if (!selections?.length) return undefined
  const years = [...new Set(selections)].filter((year) => /^[1-9]\d{3}$/.test(year))
  if (!years.length) return sql`false`
  return or(...years.map((year) => sql`(${column} >= ${`${year}-01-01`}::date and ${column} < ${`${Number(year) + 1}-01-01`}::date)`))
}
