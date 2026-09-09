import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const state = vi.hoisted(() => ({ mode: "service_disabled" }))
vi.mock("@/lib/deployment-control", () => ({
  getDeploymentAccess: vi.fn(async () => state),
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("better-auth/cookies", () => ({ getSessionCookie: () => "existing-session" }))
import { proxy, config } from "@/proxy"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"

describe("disabled service request boundary", () => {
  beforeEach(() => { state.mode = "service_disabled" })
  it.each([
    ["/dashboard", "GET"], ["/dashboard", "POST"],
    ["/api/v1/accounts", "GET"], ["/api/v1/accounts", "POST"],
    ["/api/auth/get-session", "GET"], ["/api/auth/sign-in/email", "POST"],
    ["/api/export/report.csv", "GET"],
  ])("blocks %s %s including existing sessions", async (path, method) => {
    const response = await proxy(new NextRequest("https://erp.example" + path, { method }))
    expect(response.status).toBe(403)
    expect(await response.text()).toContain("Service is disabled")
  })
  it.each(["/api/health", "/api/internal/deployment/status", "/api/internal/deployment/entitlement", "/api/internal/deployment/recovery"])(
    "keeps operational path %s reachable", async (path) => {
      const response = await proxy(new NextRequest("https://erp.example" + path))
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })
  it.each(["active", "grace", "read_only"])("preserves customer reads in %s mode", async (mode) => {
    state.mode = mode
    const response = await proxy(new NextRequest("https://erp.example/api/v1/accounts"))
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })
})

describe("service data boundary", () => {
  it("blocks server context resolution before customer data is read", async () => {
    state.mode = "service_disabled"
    const { getServerContext } = await import("@/lib/server-context")
    await expect(getServerContext()).rejects.toThrow("Service is disabled")
  })
  it("blocks API context resolution before customer data is read", async () => {
    state.mode = "service_disabled"
    const { getApiContext } = await import("@/lib/api-auth")
    await expect(getApiContext(new Request("https://erp.example/api/v1/accounts"))).rejects.toThrow("Service is disabled")
  })
})

it.each(["/api/export/report.csv", "/accounts/example.com", "/dashboard"])(
  "applies the service boundary to customer path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true)
  })
