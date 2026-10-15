import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProjectCodeSummary } from '@/components/project-code-link'
import { normalizeTableLayout } from '@/lib/table-controls/state'
import { getTableFields } from '@/lib/table-controls/registry'

const render = (props: Parameters<typeof ProjectCodeSummary>[0]) => renderToStaticMarkup(createElement(ProjectCodeSummary, props))
describe('project code presentation', () => {
  it('renders identical Salesforce codes once without a secondary label', () => {
    const html = render({ code: '24-QM-AAS-L-011', crossDealCode: '24-QM-AAS-L-011' })
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).not.toContain('Cross-deal reference')
  })
  it('keeps differing cross-deal references clickable with a clear label', () => {
    const html = render({ code: '26-QM-DNET-L-178', crossDealCode: '25-QM-DNET-L-451' })
    expect(html.match(/<a /g)).toHaveLength(2)
    expect(html).toContain('Cross-deal reference')
    expect(html).toContain('code=25-QM-DNET-L-451')
  })
  it('deduplicates aggregate references without hiding different project codes', () => {
    const html = render({ codes: ['A', 'B', 'A'], crossDealCodes: ['A', 'C', 'C'] })
    expect(html.match(/<a /g)).toHaveLength(3)
  })
  it('preserves a reference-only record without inventing a primary code', () => {
    const html = render({ crossDealCode: 'QA-REFERENCE' })
    expect(html).toContain('Cross-deal reference')
    expect(html).toContain('QA-REFERENCE')
  })
  it('hides the separate reference column by default while retaining saved choices and filters', () => {
    const fields = getTableFields('funnel', ['id', 'projectCode', 'crossDealProjectCode'])
    expect(normalizeTableLayout({}, fields).visibility.crossDealProjectCode).toBe(false)
    expect(normalizeTableLayout({ visibility: { crossDealProjectCode: true } }, fields).visibility.crossDealProjectCode).toBe(true)
    expect(fields.find(f => f.id === 'crossDealProjectCode')?.operators).toContain('equals')
  })
})
