import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe,it,expect,vi } from 'vitest'
vi.mock('@/app/(app)/settings/actions',()=>({updateProductCodes:vi.fn()}))
import {ProductCodesCard} from '@/app/(app)/settings/taxonomy/product-codes/product-codes-client'
import {TaxonomyEntryFields,entryErrors} from '@/app/(app)/settings/taxonomy/product-codes/taxonomy-editor-fields'
import {ProductCategoryRow} from '@/app/(app)/settings/taxonomy/product-codes/product-category-row'
const category={code:'COACH',name:'Coaching',subcategories:[{code:'EXEC',name:'Executive coaching'}]}
describe('product category settings presentation',()=>{
 it('validates code formats and duplicates using the existing taxonomy rules',()=>{
  expect(entryErrors('new',{code:'BAD!',name:'Example'},false,[])).toHaveProperty('new-code')
  expect(entryErrors('new',{code:'COACH',name:'Example'},false,['coach'])).toEqual({'new-code':'This code already exists.'})
  expect(entryErrors('new',{code:'A'.repeat(20),name:'Example'},true,[])).toEqual({})
  expect(entryErrors('new',{code:'VALID',name:' '},false,[])).toEqual({'new-name':'Name is required.'})
 })
 it('associates inline error text and format hints with the required input',()=>{
  const html=renderToStaticMarkup(createElement(TaxonomyEntryFields,{prefix:'invalid',value:{code:'!',name:'Example'},errors:{'invalid-code':'Use a valid code.'},onChange:vi.fn(),onError:vi.fn()}))
  expect(html).toContain('aria-invalid="true"')
  expect(html).toContain('aria-describedby="invalid-code-hint invalid-code-error"')
  expect(html).toContain('id="invalid-code-error"')
  expect(html).toContain('Use a valid code.')
 })
 it('starts with collapsed categories and explicit Edit, without editing inputs',()=>{
  const html=renderToStaticMarkup(createElement(ProductCodesCard,{productCodes:[category]}))
  expect(html).toContain('>Edit<');expect(html).toContain('Coaching');expect(html).toContain('1 subcategory')
  expect(html).not.toContain('>Save changes<');expect(html).not.toContain('category code</label>');expect(html).not.toContain('<details open')
 })
 it('labels category and subcategory editing fields',()=>{
  const html=renderToStaticMarkup(createElement(ProductCategoryRow,{category,editing:true,onChange:vi.fn(),onArchive:vi.fn(),onRemoveCategory:vi.fn(),onDraftChange:vi.fn(),onAddSubcategory:vi.fn(),prefix:"category-1",draft:{code:"",name:""},peers:[],errors:{},onError:vi.fn()}))
  for(const label of ['Category code','Category name','Subcategory code','Subcategory name','Archive category','Add subcategory'])expect(html).toContain(label)
  expect(html).toContain('aria-label="Archive subcategory Executive coaching"')
  expect((html.match(/aria-required="true"/g)??[]).length).toBe(6)
 })
})
