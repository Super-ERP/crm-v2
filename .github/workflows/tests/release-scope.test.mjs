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

test('cumulative scope retains ERP changes when a newer documentation push supersedes them', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { execFileSync } = await import('node:child_process')
  const directory = mkdtempSync(join(tmpdir(), 'release-scope-'))
  const git = (...args) => execFileSync('git', args, {cwd: directory, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim()
  try {
    git('init'); git('config','user.email','test@example.invalid'); git('config','user.name','Test')
    writeFileSync(join(directory,'README.md'),'initial'); git('add','.'); git('commit','-m','initial')
    const base = git('rev-parse','HEAD')
    mkdirSync(join(directory,'apps/web/lib'),{recursive:true})
    writeFileSync(join(directory,'apps/web/lib/auth.ts'),'changed'); git('add','.'); git('commit','-m','ERP change')
    writeFileSync(join(directory,'README.md'),'documentation'); git('add','.'); git('commit','-m','newer docs')
    const output = join(directory,'outputs')
    execFileSync(process.execPath,[new URL('../scripts/release-scope.mjs',import.meta.url).pathname],{cwd:directory,env:{...process.env,SOURCE_SHA:git('rev-parse','HEAD'),BASE_SHA:base,GITHUB_OUTPUT:output}})
    assert.equal(readFileSync(output,'utf8'),'erp=true\nvendor=false\n')
  } finally { rmSync(directory,{recursive:true,force:true}) }
})
