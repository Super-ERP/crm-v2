import { describe, expect, it } from 'vitest'
import { formatOpportunityEstimatedTotals } from '@/lib/opportunity-currency'

const display = (totals: Parameters<typeof formatOpportunityEstimatedTotals>[0], fallback = 'MYR') =>
  formatOpportunityEstimatedTotals(totals, fallback).replace(/\s+/g, ' ')

describe('Opportunity currency totals display', () => {
  it('shows the Malaysian currency once for the reported amount', () => {
    expect(display([{ currency: 'MYR', total: '350000' }])).toBe('RM 350,000.00')
  })
  it('shows a single currency marker for empty totals', () => {
    expect(display([])).toBe('RM 0.00')
    expect(display([], 'USD')).toBe('US$0.00')
  })
  it('keeps different currencies separate without adding duplicate codes', () => {
    expect(display([{ currency: 'MYR', total: '100' }, { currency: 'USD', total: '20' }]))
      .toBe('RM 100.00 · US$20.00')
  })
})
