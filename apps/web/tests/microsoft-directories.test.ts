import { describe, expect, it } from "vitest"
import { parseMicrosoftDirectories, resolveMicrosoftProvider } from "@/lib/microsoft-directories"

const primary = "11111111-1111-4111-8111-111111111111"
const external = "22222222-2222-4222-8222-222222222222"
const config = JSON.stringify([{ tenantId: external, domains: ["q-armour.com"] }])

describe("approved Microsoft directories", () => {
  it("preserves the original provider when no external directory is configured", () => {
    expect(parseMicrosoftDirectories(primary, "")).toEqual([
      { tenantId: primary, providerId: "microsoft-entra-id", domains: [] },
    ])
  })
  it("routes an exact normalized email domain, never a suffix or display name", () => {
    const routes = parseMicrosoftDirectories(primary, config)
    expect(resolveMicrosoftProvider(" USER@Q-ARMOUR.COM ", routes)).toBe(`microsoft-entra-${external}`)
    expect(resolveMicrosoftProvider("user@quandatics.com", routes)).toBe("microsoft-entra-id")
    expect(resolveMicrosoftProvider("user@fakeq-armour.com", routes)).toBe("microsoft-entra-id")
    expect(resolveMicrosoftProvider("User <user@q-armour.com>", routes)).toBeNull()
    expect(resolveMicrosoftProvider("user@@q-armour.com", routes)).toBeNull()
  })
  it.each(["common", "organizations", "consumers", "", "not-a-guid"])("rejects primary authority %s", (tenant) => {
    expect(() => parseMicrosoftDirectories(tenant, config)).toThrow()
  })
  it.each([
    "not-json", "{}", '[{"tenantId":"common","domains":["q-armour.com"]}]',
    JSON.stringify([{ tenantId: external, domains: [] }]),
    JSON.stringify([{ tenantId: external, domains: ["*.q-armour.com"] }]),
    JSON.stringify([{ tenantId: primary, domains: ["q-armour.com"] }]),
    JSON.stringify([{ tenantId: external, domains: ["q-armour.com"] }, { tenantId: "33333333-3333-4333-8333-333333333333", domains: ["Q-ARMOUR.COM"] }]),
    JSON.stringify([{ tenantId: external, domains: ["q-armour.com"] }, { tenantId: external, domains: ["other.com"] }]),
  ])("rejects unsafe/ambiguous external configuration", (value) => {
    expect(() => parseMicrosoftDirectories(primary, value)).toThrow()
  })
})
