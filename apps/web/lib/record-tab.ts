/** Select a valid detail tab, treating stale/shared unknown values as default. */
export function recordTabValue<T extends string>(search: string, defaultTab: T, tabs: readonly T[], key = "tab"): T {
  const value = new URLSearchParams(search).get(key) as T
  return tabs.includes(value) ? value : defaultTab
}

/** Preserve list return context, table filters and anchors when changing tabs. */
export function recordTabHref<T extends string>(href: string, tab: T, defaultTab: T, key = "tab"): string {
  const url = new URL(href)
  if (tab === defaultTab) url.searchParams.delete(key)
  else url.searchParams.set(key, tab)
  return `${url.pathname}${url.search}${url.hash}`
}
