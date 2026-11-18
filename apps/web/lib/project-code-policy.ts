/** Assigned codes remain visible throughout an open deal, including rollback. */
export function isProjectCodeActive(input: { stageCode?: string | null; stageKind?: string | null; status?: string | null }): boolean {
  return (input.status === "open" || input.status === "won") &&
    (input.stageKind === "WON" || (input.stageKind === "OPEN" && !!input.stageCode && !["won", "lost", "kiv"].includes(input.stageCode)))
}

/** A query parameter preserves legacy codes containing slashes, spaces or #. */
export function projectCodeHref(code: string): string {
  return `/project-codes/view?${new URLSearchParams({ code })}`
}
