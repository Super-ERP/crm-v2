import { expect, it } from "vitest"
import { projectBillingTotals } from "@/lib/project-billing-totals"
it("counts documentary receipts rather than manually settled invoice faces and nets credits", () => {
  const totals = projectBillingTotals([
    { kind: "invoice", status: "issued", amount: "100", currency: "USD" },
    { kind: "invoice", status: "settled", amount: "200", currency: "USD" },
    { kind: "receipt", status: "issued", amount: "40", currency: "USD" },
    { kind: "receipt", status: "draft", amount: "80", currency: "USD" },
    { kind: "credit_note", status: "issued", amount: "10", currency: "USD" },
    { kind: "receipt", status: "issued", amount: "700", currency: "MYR" },
  ], "USD")
  expect(totals).toMatchObject({ invoiced: 300, paid: 40, creditNotes: 10, outstanding: 250 })
})

it("keeps empty and voided receipts at zero and preserves credit balances", () => {
  expect(projectBillingTotals([], "USD").paid).toBe(0)
  const totals = projectBillingTotals([
    { kind: "invoice", status: "settled", amount: "100", currency: "USD" },
    { kind: "receipt", status: "cancelled", amount: "90", currency: "USD" },
    { kind: "receipt", status: "issued", amount: "80", currency: "USD" },
    { kind: "credit_note", status: "issued", amount: "30", currency: "USD" },
  ], "USD")
  expect(totals.paid).toBe(80)
  expect(totals.outstanding).toBe(-10)
})
