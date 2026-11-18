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

const {parse}=await import('yaml')
const workflow=parse(source)
test('automatic staging consumes only a completed successful trusted release run',()=>{
 assert.deepEqual(workflow.on.workflow_run,{workflows:['release-images'],types:['completed'],branches:['main']})
 const job=workflow.jobs['deploy-staging']
 for(const guard of ["conclusion == 'success'","event == 'workflow_dispatch'","head_branch == 'main'","head_repository.full_name == github.repository"])assert.ok(job.if.includes(guard),guard)
 assert.equal(job.env.RELEASE_RUN_ID,'${{ github.event.workflow_run.id || inputs.release_run_id }}')
 assert.equal(workflow.on.workflow_dispatch.inputs.release_run_id.required,true)
 assert.equal(workflow.concurrency['cancel-in-progress'],false)
 assert.equal(job['timeout-minutes'],30)
})
