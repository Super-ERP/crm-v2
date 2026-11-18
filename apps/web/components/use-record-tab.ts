"use client"

import { recordTabHref, recordTabValue } from "@/lib/record-tab"
import { useCallback, useSyncExternalStore } from "react"

/** URL-backed detail tabs: preserves other queries, hash and browser history. */
export function useRecordTab<T extends string>(defaultTab: T, tabs: readonly T[], key = "tab", initialSearch = ""): [T, (tab: T) => void] {
  const search = useSyncExternalStore(
    useCallback((notify) => {
      window.addEventListener("popstate", notify)
      window.addEventListener("record-tab-change", notify)
      return () => {
        window.removeEventListener("popstate", notify)
        window.removeEventListener("record-tab-change", notify)
      }
    }, []),
    () => window.location.search,
    () => initialSearch,
  )
  const value = recordTabValue(search, defaultTab, tabs, key)
  const setValue = useCallback((tab: T) => {
    if (!tabs.includes(tab)) return
    window.history.pushState(null, "", recordTabHref(window.location.href, tab, defaultTab, key))
    window.dispatchEvent(new Event("record-tab-change"))
  }, [defaultTab, tabs, key])
  return [value, setValue]
}
