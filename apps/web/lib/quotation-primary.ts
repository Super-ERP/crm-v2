/** Primary is a user-selected reference; approval/sending status is independent. */
export function canSetQuotationPrimary(quotation: { isPrimary: boolean; deletedAt: unknown }, canUpdate: boolean): boolean {
  return canUpdate && !quotation.isPrimary && quotation.deletedAt == null
}
