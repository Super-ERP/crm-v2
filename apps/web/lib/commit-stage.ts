/** Commit requirements cannot be disabled by tenant stage-field configuration. */
export function requiresCommitSetup(from: { sortOrder: number }, target: { code: string; kind: string; sortOrder: number }, stages: readonly { code: string; kind: string; sortOrder: number }[]): boolean {
  if (target.sortOrder <= from.sortOrder) return false
  const commit = stages.find(stage => stage.kind === 'OPEN' && stage.code.toLowerCase() === '4a')
  return target.kind === 'WON' || (!!commit && target.sortOrder >= commit.sortOrder && target.kind === 'OPEN')
}
export type ProjectCodeChoice = { mode: 'new' } | { mode: 'existing'; code: string } | { mode: 'manual'; code: string }
export function normalizeProjectCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,79}$/.test(code)) throw new Error('Project code must be 2–80 letters, numbers, dots, slashes, underscores or hyphens.')
  return code
}
