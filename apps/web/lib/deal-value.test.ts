import { describe, expect, it } from "vitest"
import { dealValue } from "./deal-value"

describe("effective deal value provenance", () => {
  it("preserves an explicit zero estimate over a positive quote", () => {
    expect(dealValue({estimatedAmount:"0",amount:"500"})).toEqual({amount:"0",source:"Estimated"})
  })
  it("identifies quoted net fallback and missing values", () => {
    expect(dealValue({estimatedAmount:null,amount:"500",primaryQuotationId:"q",primaryQuotationNumber:"Q100-2"})).toEqual({amount:"500",source:"From Q100-2"})
    expect(dealValue({estimatedAmount:null,amount:"75"})).toEqual({amount:"75",source:"Stored deal value"})
    expect(dealValue({estimatedAmount:null,amount:null})).toEqual({amount:null,source:"Not set"})
  })
})
