/** Shared by manual primary-quote sync and the historical importer. */
export type QuoteProductLine = {
  productId: string | null; description: string | null; quantity: string;
  unitPrice: string; lineTotal: string; uom: string | null;
  productCategory: string | null; sortOrder: number;
}
export function projectQuoteProduct(line: QuoteProductLine, tenantId: string, funnelId: string) {
  return {tenantId, funnelId, productId:line.productId, description:line.description,
    quantity:line.quantity, unitPrice:line.unitPrice, totalPrice:line.lineTotal,
    uom:line.uom, productCategory:line.productCategory, sortOrder:line.sortOrder}
}
