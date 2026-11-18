/** User-facing domain names. Database keys and saved-view field IDs stay stable. */
export const CRM_TERMS = {
  productName: "Product name",
  unitOfMeasure: "Unit of measure",
  productCategory: "Product category",
  productSubcategory: "Product subcategory",
  productCategories: "Product Categories",
  quotationItem: "Quotation item",
} as const

/** productCode is the category identifier, not a unique catalog-item SKU. */
export const PRODUCT_FIELD_LABELS: Readonly<Record<string, string>> = {
  productCode: CRM_TERMS.productCategory,
  productCategory: CRM_TERMS.productCategory,
  subcategory: CRM_TERMS.productSubcategory,
  productSubcategory: CRM_TERMS.productSubcategory,
}
