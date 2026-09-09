import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
test('local smoke uses isolated production Compose with staging public trust', () => {
  const workflow = readFileSync(new URL('../deploy-staging.yml', import.meta.url), 'utf8')
  const smoke = readFileSync(new URL('../../../deploy/client/ops/smoke-release.mjs', import.meta.url), 'utf8')
  assert.match(workflow, /secrets.STAGING_VENDOR_ENTITLEMENT_TRUST_SET/)
  assert.match(smoke, /crm-smoke-/)
  assert.match(smoke, /compose.yaml/)
  assert.match(smoke, /127.0.0.1:18092:8081/)
  assert.match(smoke, /finally/)
  assert.doesNotMatch(smoke, /quandatics-client|crm-v2_pgdata/)
})
