import { describe, expect, it } from "vitest"
import { recoverAccountAddresses } from "@/db/import/account-address-history"
const row = (account: string, field: string, value: string, date = "2026-01-01T00:00:00Z") => ({ Id: `${account}-${field}-${value}`, AccountId: account, Field: field, NewValue: value, CreatedDate: date, IsDeleted: "false" })
describe("Salesforce account address history recovery", () => {
  it("uses the latest NewValue for each component, preserving multiline streets", () => {
    const recovered = recoverAccountAddresses([row("a", "BillingStreet", "Old street"), row("a", "BillingStreet", "New street\nSecond line", "2026-02-01T00:00:00Z"), row("a", "BillingPostalCode", "00100")])
    expect(recovered.ready).toEqual([{ sourceAccountId: "a", address: { line1: "New street\nSecond line", postcode: "00100" }, historyIds: expect.any(Array) }])
  })
  it("does not choose an arbitrary order for conflicting changes at the same timestamp", () => {
    const history = [row("a", "BillingStreet", "1 Jalan"), row("a", "BillingStreet", "1A Jalan")]
    expect(recoverAccountAddresses(history)).toMatchObject({ ready: [], review: [{ sourceAccountId: "a", reason: expect.stringContaining("Conflicting") }] })
    expect(recoverAccountAddresses(history.reverse())).toMatchObject({ ready: [] })
  })
  it("never resurrects cleared values or restores only country without a street", () => {
    expect(recoverAccountAddresses([row("a", "BillingStreet", "Old"), row("a", "BillingStreet", "", "2026-02-01T00:00:00Z"), row("b", "BillingCountry", "MY")]).ready).toEqual([])
  })
  it("ignores deleted history and unrelated fields", () => {
    expect(recoverAccountAddresses([{ ...row("a", "BillingStreet", "Deleted"), IsDeleted: "true" }, row("b", "Phone", "123")]).ready).toEqual([])
  })
})
