import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { describe, expect, it } from "vitest"
import { authSessionPolicy } from "@/lib/session-policy"

describe("recovery session revocation", () => {
  it("rejects an existing signed-in cookie after its database session is revoked", async () => {
    const database: Record<string, unknown[]> = { user: [], session: [], account: [], verification: [] }
    const auth = betterAuth({
      baseURL: "http://localhost:3000",
      secret: "test-session-revocation-secret-at-least-32-characters",
      database: memoryAdapter(database),
      emailAndPassword: { enabled: true },
      session: authSessionPolicy,
    })
    const signedIn = await auth.api.signUpEmail({
      body: { email: "owner@example.com", password: "test-password-for-recovery", name: "Owner" },
      asResponse: true,
    })
    expect(signedIn.status).toBe(200)
    const headers = new Headers({ cookie: signedIn.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") })
    expect((await auth.api.getSession({ headers }))?.user.email).toBe("owner@example.com")
    database.session.length = 0
    expect(await auth.api.getSession({ headers })).toBeNull()
  })
})
