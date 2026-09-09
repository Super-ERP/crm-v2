import assert from 'node:assert/strict'
import test from 'node:test'
import { hasVerifiedQuality } from '../scripts/verify-quality.mjs'
const sha = 'a'.repeat(40), repository = 'Super-ERP/crm-v2'
const valid = { head_sha: sha, head_branch: 'main', event: 'push', path: '.github/workflows/quality.yml', status: 'completed', conclusion: 'success', repository: { full_name: repository } }
test('reuses exact successful main verification', () => assert.equal(hasVerifiedQuality([valid], sha, repository), true))
for (const override of [{head_sha:'b'.repeat(40)}, {head_branch:'feature'}, {event:'pull_request'}, {path:'.github/workflows/other.yml'}, {status:'in_progress'}, {conclusion:'failure'}, {repository:{full_name:'fork/repo'}}]) test(`rejects ${JSON.stringify(override)}`, () => assert.equal(hasVerifiedQuality([{...valid,...override}], sha, repository), false))
test('missing evidence fails closed', () => assert.equal(hasVerifiedQuality([], sha, repository), false))
