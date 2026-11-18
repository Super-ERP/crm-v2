import { describe, expect, it } from 'vitest'
import { getTableFields } from '@/lib/table-controls/registry'
import { tableCsv } from '@/lib/table-controls/export'
import { normalizeTableLayout } from '@/lib/table-controls/state'

describe('shared table field meaning', () => {
  it('uses the effective deal-value label in controls and CSV without changing saved IDs', () => {
    const [field] = getTableFields('funnel', ['amount'])
    expect(field.label).toBe('Deal value (excl. tax)')
    expect(field.description).toContain('estimate')
    expect(field.description).toContain('primary quotation')
    expect(tableCsv([{amount:'100',currency:'USD'}], [{field,value:r=>r.amount,currency:r=>r.currency}], 'Asia/Kuala_Lumpur'))
      .toContain('"Deal value (excl. tax)","Deal value (excl. tax) currency"')
    expect(normalizeTableLayout({visibility:{amount:true},widths:{amount:190}}, [field]).widths.amount).toBe(190)
  })
  it('distinguishes forecast estimates, quote totals and recorded document amounts', () => {
    expect(getTableFields('forecast',['opportunityValue','recognizedWeightedValue']).map(field=>field.label))
      .toEqual(['Estimated deal value / allocated basis','Our weighted share'])
    expect(getTableFields('quotations',['total'])[0].label).toBe('Total (incl. tax)')
    expect(getTableFields('finance-sale',['amount'])[0].label).toBe('Document total (as recorded)')
    expect(getTableFields('payment-milestones',['amount'])[0].label).toBe('Planned amount (excl. tax)')
  })
})
