import assert from 'node:assert/strict'
import test from 'node:test'
import { releaseScope } from '../scripts/release-scope.mjs'
for (const [files, expected] of [
  [['docs/guide.md', 'README.md'], { erp: false, vendor: false }],
  [['apps/web/tests/login.test.ts'], { erp: false, vendor: false }],
  [['apps/control-plane/src/ui/service-controls.tsx'], { erp: false, vendor: true }],
  [['apps/web/lib/auth.ts', 'deploy/client/compose.yaml'], { erp: true, vendor: false }],
  [['packages/control-protocol/src/index.ts'], { erp: true, vendor: true }],
  [['pnpm-lock.yaml'], { erp: true, vendor: true }],
  [['new-runtime/config.json'], { erp: true, vendor: true }],
]) test(`routes ${files.join(', ')}`, () => assert.deepEqual(releaseScope(files), expected))
test('test-only edits still run the affected checks', () => {
  assert.deepEqual(releaseScope(['apps/web/tests/auth.test.ts'], {includeTests:true}), {erp:true,vendor:false})
  assert.deepEqual(releaseScope(['apps/control-plane/tests/ui.test.ts'], {includeTests:true}), {erp:false,vendor:true})
})
