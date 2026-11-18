import { describe, expect, it } from 'vitest'
import { normalizeAccountCode, authorizeAccountCode } from '@/lib/account-code'
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

describe('account code allocation authorization', () => {
 it('denies allocation by sales even with account create or update access', () => {
  expect(() => authorizeAccountCode('ACME', undefined, false)).toThrow('account.code.manage')
  expect(() => authorizeAccountCode('ACME', null, false)).toThrow('account.code.manage')
  expect(() => authorizeAccountCode('NEXT', 'OLD', false)).toThrow('account.code.manage')
 })
 it('allows unrelated saves retaining current legacy identifiers', () => {
  expect(() => authorizeAccountCode('LEGACY-123', 'LEGACY-123', false)).not.toThrow()
  expect(() => authorizeAccountCode(null, null, false)).not.toThrow()
 })
 it('requires manual allocation and prevents clearing assigned identifiers', () => {
  expect(() => authorizeAccountCode(null, undefined, true)).toThrow('required')
  expect(() => authorizeAccountCode(null, 'OLD', true)).toThrow('required')
  expect(() => authorizeAccountCode('NEW', 'OLD', true)).not.toThrow()
 })
})
