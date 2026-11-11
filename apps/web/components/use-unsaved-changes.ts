"use client"

import * as React from "react"

/** Protect a record form during reload/close and ordinary in-app link navigation. */
export function useUnsavedChanges(dirty: boolean, saving = false) {
  const confirmDiscard = React.useCallback(() => {
    if (saving) return false
    return !dirty || window.confirm("Discard your unsaved changes?")
  }, [dirty, saving])

  React.useEffect(() => {
    if (!dirty && !saving) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      const destination = new URL(anchor.href, location.href)
      if (destination.pathname === location.pathname && destination.search === location.search && destination.origin === location.origin) return
      if (!confirmDiscard()) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation
    const navigate = (event: Event) => {
      const destination = event as Event & { navigationType?: string; destination?: { sameDocument?: boolean } }
      if (destination.navigationType === "traverse" && destination.destination?.sameDocument && event.cancelable && !confirmDiscard()) event.preventDefault()
    }
    navigation?.addEventListener("navigate", navigate)
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", click, true)
    return () => {
      navigation?.removeEventListener("navigate", navigate)
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", click, true)
    }
  }, [dirty, saving, confirmDiscard])

  return confirmDiscard
}
