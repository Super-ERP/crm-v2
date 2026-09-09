import { describe, expect, it } from "vitest"
import { canUsePasswordLogin } from "@/lib/password-login-policy"

const master = {
  email: "owner@example.com",
  platformMasterEmail: "owner@example.com",
  isSuperadmin: true,
  isBreakGlass: false,
  twoFactorEnabled: false,
}

describe("password login policy", () => {
  it("allows the configured platform master", () => {
    expect(canUsePasswordLogin(master)).toBe(true)
  })

  it("requires the configured account to remain a superadmin", () => {
    expect(canUsePasswordLogin({ ...master, isSuperadmin: false })).toBe(false)
  })

  it("allows a separate MFA-protected break-glass account", () => {
    expect(canUsePasswordLogin({
      ...master,
      email: "recovery@example.com",
      isSuperadmin: false,
      isBreakGlass: true,
      twoFactorEnabled: true,
    })).toBe(true)
  })

  it("rejects ordinary password accounts", () => {
    expect(canUsePasswordLogin({ ...master, email: "user@example.com" })).toBe(false)
  })
})
