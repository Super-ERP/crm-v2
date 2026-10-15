import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, statSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { planProjectCodeBackfill } from '../db/import/project-code-backfill-plan'
import { MAPPINGS } from '../db/import/mapping'
import { TECHNIQUES } from '../db/import/plan'
import { migrationId } from '../db/import/plan'
const tenant = 'qm'
const source = { Id: 'sf1', Opportunity__c: 'parent', Project_Code__c: '  MiX / 01  ', Project_Code_For_Cross_Deal__c: 'Other' }
const funnel = { id: migrationId(tenant, 'Opportunity', 'sf1'), tenant_id: tenant, opportunity_id: migrationId(tenant, 'Opportunity_ID__c', 'parent'), deleted_at: null as string | null, updated_at: '2026-01-01T00:00:00Z', project_code: null as string | null, cross_deal_project_code: null as string | null }
const plan = (rows = [funnel], sources = [source]) => planProjectCodeBackfill({ Opportunity: { headers: Object.keys(source), rows: sources } }, tenant, { funnels: rows })
describe('Salesforce project code recovery', () => {
  it('preserves independent source text and trims only its edges', () => {
    expect(plan().ready[0].after).toEqual({ projectCode: 'MiX / 01', crossDealProjectCode: 'Other' })
  })
  it('is idempotent and protects manually populated values', () => {
    expect(plan([{ ...funnel, project_code: 'MiX / 01', cross_deal_project_code: 'Other' }]).alreadyCaptured).toBe(1)
    expect(plan([{ ...funnel, project_code: 'manual' }]).review).toHaveLength(1)
    expect(plan([{ ...funnel, project_code: 'manual' }]).ready).toHaveLength(0)
  })
  it('rejects wrong tenant, deleted, parent scope mismatch, missing ID and duplicate source IDs', () => {
    for (const row of [{ ...funnel, tenant_id: 'other' }, { ...funnel, deleted_at: 'now' }, { ...funnel, opportunity_id: 'wrong' }]) expect(plan([row]).review).toHaveLength(1)
    expect(plan([], [{ ...source, Id: '' }]).review).toHaveLength(1)
    expect(plan([funnel], [source, source]).ready).toHaveLength(0)
  })
})

it('maps both source identifiers for future imports and documents their independent transfer', () => {
  const mapping = MAPPINGS.find(m => m.object === 'Opportunity')!
  for (const [field, column] of [['Project_Code__c', 'project_code'], ['Project_Code_For_Cross_Deal__c', 'cross_deal_project_code']]) {
    expect(mapping.fields[field].col).toBe(column)
    expect(mapping.fields[field].xform?.('  Case / 01  ', {} as never)).toBe('Case / 01')
    expect(TECHNIQUES.Opportunity.some(t => t.fields.includes(field) && t.targets.includes(column))).toBe(true)
  }
  expect(MAPPINGS.find(m => m.object === 'Opportunity_ID__c')!.fields.Project_Code__c).toBeUndefined()
})

it('CLI defaults to private offline dry run and refuses snapshot apply', () => {
  const directory = mkdtempSync(join(tmpdir(), 'project-code-cli-'))
  try {
    const input = join(directory, 'source'); mkdirSync(input)
    writeFileSync(join(input, 'Opportunity.csv'), 'Id,Opportunity__c,Project_Code__c,Project_Code_For_Cross_Deal__c\nsf1,parent,  MiX / 01  ,Other\n')
    const snapshot = join(directory, 'snapshot.json'); writeFileSync(snapshot, JSON.stringify({ funnels: [funnel] }))
    const args = ['--import', 'tsx', 'db/import/backfill-salesforce-project-codes.ts', '--dir', input, '--tenant', tenant, '--snapshot', snapshot, '--report-dir', join(directory, 'reports')]
    const result = JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' }))
    expect(result).toMatchObject({ mode: 'dry-run', ready: 1, review: 0 })
    expect(statSync(result.reportDirectory).mode & 0o777).toBe(0o700)
    expect(statSync(join(result.reportDirectory, readdirSync(result.reportDirectory)[0])).mode & 0o777).toBe(0o600)
    expect(() => execFileSync(process.execPath, [...args, '--apply'], { stdio: 'pipe' })).toThrow()
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
