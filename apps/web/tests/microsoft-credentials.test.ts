import { describe, expect, it } from "vitest"
import { parseMicrosoftCredentials } from "@/lib/microsoft-credentials"
import { parseMicrosoftDirectories } from "@/lib/microsoft-directories"

const primary = "11111111-1111-4111-8111-111111111111"
const tenant = "22222222-2222-4222-8222-222222222222"
const client = "33333333-3333-4333-8333-333333333333"
const directories = parseMicrosoftDirectories(primary, JSON.stringify([{ tenantId: tenant, domains: ["q-armour.com"] }]))
describe("separate Microsoft app credentials", () => {
  it("requires an external app registration instead of falling back to primary credentials", () => {
    expect(() => parseMicrosoftCredentials("", directories)).toThrow()
    expect(parseMicrosoftCredentials("", directories.slice(0, 1))).toEqual({})
  })
  it("loads credentials by directory without exposing secret values in errors", () => {
    const credentials = { [tenant]: { clientId: client, clientSecret: "external-secret" } }
    expect(parseMicrosoftCredentials(JSON.stringify(credentials), directories)).toEqual(credentials)
    expect(() => parseMicrosoftCredentials(JSON.stringify({ [tenant]: { clientId: "invalid", clientSecret: "sensitive-value" } }), directories)).toThrow("Invalid external Microsoft app credentials.")
  })
  it.each(["[]", "not-json", "null", JSON.stringify({ [primary]: { clientId: client, clientSecret: "secret" } }), JSON.stringify({ [tenant]: { clientId: client, clientSecret: "" } })])("rejects invalid or unrelated credentials", (raw) => {
    expect(() => parseMicrosoftCredentials(raw, directories)).toThrow()
  })
})
