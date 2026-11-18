import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect,vi} from 'vitest'
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}))
vi.mock('@/app/(app)/leads/actions',()=>({convertLeadAction:vi.fn(),updateLead:vi.fn()}))
vi.mock('@/app/(app)/leads/conversion-duplicate-actions',()=>({checkConversionDuplicates:vi.fn()}))
vi.mock('@/app/(app)/locations/actions',()=>({searchLocations:vi.fn()}))
import {ConvertForm} from '@/app/(app)/leads/[id]/convert/convert-form'
import type {Lead} from '@/app/(app)/leads/actions'
describe('lead conversion information hierarchy',()=>{
 it('groups Project Nature with sales fields and shows new-account identity only once',()=>{
  const lead={id:'lead',name:'Alex Demo',companyName:'Example Company',email:'alex@example.invalid'} as Lead
  const html=renderToStaticMarkup(createElement(ConvertForm,{lead,accountOptions:[],projectNatures:[{code:'L',name:'License'}]}))
  expect(html.indexOf('id="conversion-nature"')).toBeGreaterThan(html.indexOf('Opportunity &amp; Funnel'))
  expect(html.indexOf('id="conversion-nature"')).toBeLessThan(html.indexOf('id="opp-name"'))
  expect(html).toContain('New account — Example Company')
  expect(html).not.toContain('A new account will be created from')
  expect(html).not.toContain('becomes a contact for')
  expect(html).toContain('grid items-start gap-4 sm:grid-cols-3')
  expect(html).toContain('id="new-acct-postcode"')
 })
})
