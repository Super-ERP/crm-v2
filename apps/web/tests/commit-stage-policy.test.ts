import { describe,it,expect } from 'vitest'
import { requiresCommitSetup,normalizeProjectCode } from '@/lib/commit-stage'
const stages=[{code:'0e',kind:'OPEN',sortOrder:0},{code:'4a',kind:'OPEN',sortOrder:4},{code:'delivery',kind:'OPEN',sortOrder:5},{code:'won',kind:'WON',sortOrder:6},{code:'lost',kind:'LOST',sortOrder:7}]
describe('mandatory commit setup',()=>{
 it('requires setup for direct4a, skipped4a, lateropen and Won but notrollback orlost',()=>{
  for(const target of stages.slice(1,4))expect(requiresCommitSetup(stages[0],target,stages)).toBe(true)
  expect(requiresCommitSetup(stages[3],stages[1],stages)).toBe(false)
  expect(requiresCommitSetup(stages[0],stages[4],stages)).toBe(false)
 })
 it('validates manual identifiers without renumbering historical formats',()=>{
  expect(normalizeProjectCode(' 26-qm-acme-l-390 ')).toBe('26-QM-ACME-L-390')
  for(const input of ['','<script>','a b','x'.repeat(81)])expect(()=>normalizeProjectCode(input)).toThrow()
 })
})
