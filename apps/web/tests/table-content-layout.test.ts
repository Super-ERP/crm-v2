import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TableCell, TableHead } from '@/components/ui/table'
import { getTableFields } from '@/lib/table-controls/registry'
import { normalizeTableLayout } from '@/lib/table-controls/state'

it('contains long table text within its column instead of painting over adjacent records', () => {
 const html=renderToStaticMarkup(createElement(TableCell,null,'COACHING - BUSINESS INTELLIGENCE'))
 expect(html).toContain('whitespace-normal')
 expect(html).toContain('overflow-hidden')
 expect(html).toContain('[overflow-wrap:anywhere]')
 expect(html).not.toContain('whitespace-nowrap')
})
it('contains narrow column headings without losing their resize handle',()=>{
 const html=renderToStaticMarkup(createElement(TableHead,null,'Expected close date'))
 expect(html).toContain('overflow-hidden')
 expect(html).toContain('whitespace-normal')
})
it('gives identifying text more room than compact product fields',()=>{
 const fields=getTableFields('products')
 expect(fields.find(f=>f.id==='name')!.defaultWidth).toBeGreaterThan(fields.find(f=>f.id==='uom')!.defaultWidth)
 expect(fields.find(f=>f.id==='description')!.defaultWidth).toBeGreaterThan(fields.find(f=>f.id==='isActive')!.defaultWidth)
})
it('starts code detail with focused funnel columns while retaining optional relationships',()=>{
 const fields=getTableFields('project-code-funnels')
 const layout=normalizeTableLayout({},fields)
 for(const id of ['relationship','account','opportunity'])expect(layout.visibility[id]).toBe(false)
 expect(fields.some(f=>f.id==='account')).toBe(true)
 expect(normalizeTableLayout({visibility:{account:true}},fields).visibility.account).toBe(true)
})
