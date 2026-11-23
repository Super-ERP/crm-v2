import {describe,it,expect} from 'vitest'
import {canEnterProjectCodes,canRenameProjectCodes} from '@/lib/project-code-permissions'
const actor=(permissions:string[],isSuperadmin=false)=>({isSuperadmin,can:(key:string)=>permissions.includes(key)})
describe('Project Code identifier administration',()=>{
 it('denies broad sales access and isolated permission grants',()=>{
  expect(canRenameProjectCodes(actor(['records.manage_all']))).toBe(false)
  expect(canRenameProjectCodes(actor(['project_code.rename']))).toBe(false)
  expect(canRenameProjectCodes(actor(['tenant.settings']))).toBe(false)
 })
 it('allows tenant administration with rename permission and Superadmin',()=>{
  expect(canRenameProjectCodes(actor(['tenant.settings','project_code.rename']))).toBe(true)
  expect(canRenameProjectCodes(actor([],true))).toBe(true)
 })
 it('lets Sales Admin enter Funnel codes without rename rights',()=>{
  expect(canEnterProjectCodes(actor(['project_code.enter']))).toBe(true)
  expect(canRenameProjectCodes(actor(['project_code.enter']))).toBe(false)
  expect(canEnterProjectCodes(actor(['records.manage_all','opportunity.update']))).toBe(false)
  expect(canEnterProjectCodes(actor(['tenant.settings','project_code.rename']))).toBe(true)
 })
})
