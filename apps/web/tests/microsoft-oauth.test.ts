import { beforeAll, describe, expect, it } from "vitest"
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import { createMicrosoftProviders } from "@/lib/microsoft-oauth"
import { parseMicrosoftDirectories } from "@/lib/microsoft-directories"

const primary = "11111111-1111-4111-8111-111111111111"
const external = "22222222-2222-4222-8222-222222222222"
let keys: Awaited<ReturnType<typeof generateKeyPair>>
let jwks: ReturnType<typeof createLocalJWKSet>
beforeAll(async () => {
  keys = await generateKeyPair("RS256")
  jwks = createLocalJWKSet({ keys: [{ ...await exportJWK(keys.publicKey), kid: "test", alg: "RS256" }] })
})
async function token(tenant = external, audience = "external-client", expiry = "5m") {
  return new SignJWT({ tid: tenant }).setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(`https://login.microsoftonline.com/${tenant}/v2.0`).setAudience(audience)
    .setSubject("microsoft-subject").setIssuedAt().setExpirationTime(expiry).sign(keys.privateKey)
}
function providers(email = "person@q-armour.com", subject = "microsoft-subject") {
  return createMicrosoftProviders({
    directories: parseMicrosoftDirectories(primary, JSON.stringify([{ tenantId: external, domains: ["q-armour.com"] }])),
    clientId: "client", clientSecret: "secret", externalCredentials: { [external]: { clientId: "external-client", clientSecret: "external-secret" } }, baseURL: "https://crm.example.test",
    keySet: () => jwks,
    userInfo: async () => ({ id: subject, email, name: "Pilot", emailVerified: false }),
  })
}
describe("directory-bound Microsoft OAuth", () => {
  it("keeps original provider IDs and uses only tenant-specific endpoints and callbacks", () => {
    const configs = providers()
    expect(configs[0].clientId).toBe("client")
    expect(configs[0].clientSecret).toBe("secret")
    expect(configs[1].clientId).toBe("external-client")
    expect(configs[1].clientSecret).toBe("external-secret")
    expect(configs[0].providerId).toBe("microsoft-entra-id")
    expect(configs[1].tokenUrl).toBe(`https://login.microsoftonline.com/${external}/oauth2/v2.0/token`)
    expect(configs[1].redirectURI).toBe(`https://crm.example.test/api/auth/oauth2/callback/microsoft-entra-${external}`)
    expect(configs[1].pkce).toBe(true)
  })
  it("never falls back to the Quandatics app for an external directory", () => {
    expect(() => createMicrosoftProviders({ directories: parseMicrosoftDirectories(primary, JSON.stringify([{ tenantId: external, domains: ["q-armour.com"] }])), clientId: "client", clientSecret: "secret", baseURL: "https://crm.example.test" })).toThrow("their own app credentials")
  })
  it("rejects the primary app audience even when the external tenant signed the token", async () => {
    expect(await providers()[1].getUserInfo!({ idToken: await token(external, "client"), accessToken: "access" })).toBeNull()
  })
  it("accepts a signed token and matching userinfo in the mapped directory", async () => {
    expect(await providers()[1].getUserInfo!({ idToken: await token(), accessToken: "access" })).toMatchObject({ id: "microsoft-subject", email: "person@q-armour.com" })
  })
  it("retains normal primary-directory login", async () => {
    expect(await providers("person@quandatics.com")[0].getUserInfo!({ idToken: await token(primary, "client"), accessToken: "access" })).not.toBeNull()
  })
  it("rejects another tenant, incorrect audience, expired and unsigned tokens", async () => {
    for (const idToken of [await token(primary, "client"), await token(external, "other-client"), await token(external, "external-client", "-1s"), "unsigned.payload.token"]) {
      expect(await providers()[1].getUserInfo!({ idToken, accessToken: "access" })).toBeNull()
    }
  })
  it("rejects missing tokens, subject substitution and domain mismatch", async () => {
    const tokens = { idToken: await token(), accessToken: "access" }
    expect(await providers()[1].getUserInfo!({ accessToken: "access" })).toBeNull()
    expect(await providers("person@q-armour.com", "another-subject")[1].getUserInfo!(tokens)).toBeNull()
    expect(await providers("person@quandatics.com")[1].getUserInfo!(tokens)).toBeNull()
    expect(await providers()[0].getUserInfo!({ ...tokens, idToken: await token(primary, "client") })).toBeNull()
  })
})
