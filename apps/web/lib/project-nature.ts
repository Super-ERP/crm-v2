/** Validate explicit nature choices while allowing untouched legacy records. */
export function assertProjectNatures(natures: readonly string[], configured: readonly { code: string }[]): void {
  if (!natures.length || natures.some(code => !code.trim())) throw new Error("Project Nature is required")
  if (natures.some(code => !configured.some(n => n.code === code))) throw new Error("Choose a configured Project Nature")
}
