import { describe, expect, it } from 'vitest'
import { normalizeAccountCode } from '@/lib/account-code'
describe('account code editing',()=>{
 it('preserves an unchanged imported code when saving other account fields',()=>{
  expect(normalizeAccountCode('MERIDIAN','MERIDIAN')).toBe('MERIDIAN')
  expect(normalizeAccountCode('Legacy-code','Legacy-code')).toBe('Legacy-code')
 })
 it('validates newly supplied and changed codes even on legacy accounts',()=>{
  expect(()=>normalizeAccountCode('MERIDIAN')).toThrow('Account code must be 2–6 characters')
  expect(()=>normalizeAccountCode('ANOTHERLONG','MERIDIAN')).toThrow()
  expect(normalizeAccountCode(' new1 ','MERIDIAN')).toBe('NEW1')
 })
 it('retains optional clearing and normalizes valid new codes',()=>{
  expect(normalizeAccountCode(null,'MERIDIAN')).toBeNull()
  expect(normalizeAccountCode(' ')).toBeNull()
  expect(normalizeAccountCode(' qa ')).toBe('QA')
 })
})
