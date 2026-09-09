import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source = readFileSync(new URL('../deploy-staging.yml', import.meta.url), 'utf8')
test('staging verifies signed production bundle before local smoke and promotion', () => {
  assert.match(source, /release run is not a successful main release/)
  assert.match(source, /cosign verify-blob/)
  assert.match(source, /client-deployment-bundle-/)
  assert.ok(source.indexOf('cosign verify-blob') < source.indexOf('smoke-release.mjs'))
  assert.ok(source.indexOf('smoke-release.mjs') < source.indexOf('gh workflow run deploy.yml'))
  assert.doesNotMatch(source, /trycloudflare|tunnel|git clone|force-recreate|ALTER ROLE/)
})
