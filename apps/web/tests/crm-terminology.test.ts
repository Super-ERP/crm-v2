import { describe, expect, it } from "vitest"
import { CRM_TERMS } from "@/lib/crm-terminology"
import { getTableFields } from "@/lib/table-controls/registry"
import { businessFieldDefinitions } from "@/lib/table-controls/relationships"

describe("shared product terminology", () => {
  it("keeps saved field IDs while matching catalog columns, filters and related fields", () => {
    for (const fields of [getTableFields("products"), businessFieldDefinitions("products")]) {
      expect(fields.find(field => field.id === "productCode")?.label).toBe(CRM_TERMS.productCategory)
      expect(fields.find(field => field.id === "subcategory")?.label).toBe(CRM_TERMS.productSubcategory)
    }
  })
  it("uses product category for the legacy opportunity-item category field", () => {
    expect(businessFieldDefinitions("opportunityProducts").find(field => field.id === "productCategory")?.label).toBe(CRM_TERMS.productCategory)
  })
})
