import { afterEach, describe, expect, it, vi } from "vitest"

const cleanup = vi.hoisted(() => [] as (() => void)[])
vi.mock("react", () => ({
  useCallback: (fn: unknown) => fn,
  useEffect: (effect: () => (() => void) | undefined) => {
    const dispose = effect()
    if (dispose) cleanup.push(dispose)
  },
}))
import { useUnsavedChanges } from "@/components/use-unsaved-changes"

afterEach(() => {
  cleanup.splice(0).forEach(dispose => dispose())
  vi.unstubAllGlobals()
})

function browser(acceptDiscard: boolean) {
  const window = Object.assign(new EventTarget(), { confirm: vi.fn(() => acceptDiscard), navigation: new EventTarget() })
  const document = new EventTarget()
  vi.stubGlobal("window", window)
  vi.stubGlobal("document", document)
  return { window, document }
}

describe("unsaved record changes", () => {
  it("allows clean tab changes without a confirmation", () => {
    const { window } = browser(false)
    expect(useUnsavedChanges(false)()).toBe(true)
    expect(window.confirm).not.toHaveBeenCalled()
  })
  it("keeps dirty edits when discard is declined and allows explicit discard", () => {
    const { window } = browser(false)
    const discard = useUnsavedChanges(true)
    expect(discard()).toBe(false)
    window.confirm.mockReturnValue(true)
    expect(discard()).toBe(true)
  })
  it("blocks tab changes while saving without asking to discard", () => {
    const { window } = browser(true)
    expect(useUnsavedChanges(true, true)()).toBe(false)
    expect(window.confirm).not.toHaveBeenCalled()
  })
  it("protects reload and same-document back navigation, and removes guards on unmount", () => {
    const { window } = browser(false)
    useUnsavedChanges(true)
    const reload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(reload)
    expect(reload.defaultPrevented).toBe(true)
    const back = Object.assign(new Event("navigate", { cancelable: true }), { navigationType: "traverse", destination: { sameDocument: true } })
    window.navigation.dispatchEvent(back)
    expect(back.defaultPrevented).toBe(true)
    cleanup.splice(0).forEach(dispose => dispose())
    const cleanReload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(cleanReload)
    expect(cleanReload.defaultPrevented).toBe(false)
  })
})
