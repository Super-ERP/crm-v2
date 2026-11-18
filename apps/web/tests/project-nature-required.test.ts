import { describe, expect, it } from "vitest"
import { assertProjectNatures } from "@/lib/project-nature"

describe("required configured Project Nature", () => {
  it("rejects missing and unconfigured choices", () => {
    expect(() => assertProjectNatures([], [{ code: "WEB" }])).toThrow("required")
    expect(() => assertProjectNatures(["WEB", "GUESS"], [{ code: "WEB" }])).toThrow("configured")
  })
  it("accepts only the configured codes", () => {
    expect(() => assertProjectNatures(["WEB"], [{ code: "WEB" }])).not.toThrow()
  })
})
