import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect,vi} from 'vitest'
vi.mock('@/app/(app)/locations/actions',()=>({searchLocations:vi.fn()}))
import {LocationFields} from '@/components/location-fields'
describe('shared address selectors',()=>{
 it('renders searchable selectors, preserves legacy text as selected values, and labels required Country',()=>{
  const html=renderToStaticMarkup(createElement(LocationFields,{idPrefix:'test',countryRequired:true,value:{country:'Legacy Country',state:'Legacy State',city:'Legacy Town'},onChange:vi.fn()}))
  expect((html.match(/role="combobox"/g)??[]).length).toBe(2)
  for(const label of ['Country','State/Province','City/Town','Legacy Country','Legacy State','Legacy Town'])expect(html).toContain(label)
  expect(html).toContain('aria-required="true"')
  expect(html).toContain('value="Legacy Town"')
  expect(html).toContain('autoComplete="address-level2"')
 })
})
