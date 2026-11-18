import { expect, it } from "vitest"
import { resolveFinanceParty } from "@/lib/finance-party"
it("keeps explicit parties and inherited document parties ahead of quotation defaults", () => {
  expect(resolveFinanceParty("Explicit payer", "Parent payer", "Quote payer", "End customer")).toBe("Explicit payer")
  expect(resolveFinanceParty(null, "Parent payer", "Quote payer", "End customer")).toBe("Parent payer")
  expect(resolveFinanceParty(null, null, "Quote payer", "End customer")).toBe("Quote payer")
  expect(resolveFinanceParty(null, null, null, "End customer")).toBe("End customer")
})
