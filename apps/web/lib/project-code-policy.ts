/** Codes survive rollback in storage; only Commit and Won are active. */
export function isProjectCodeActive(input: { stageCode?: string | null; stageKind?: string | null; status?: string | null }): boolean {
  return (input.status === "open" || input.status === "won") &&
    (input.stageKind === "WON" || (input.stageKind === "OPEN" && input.stageCode === "4a"))
}

/** A query parameter preserves legacy codes containing slashes, spaces or #. */
export function projectCodeHref(code: string): string {
  return `/project-codes/view?${new URLSearchParams({ code })}`
}
