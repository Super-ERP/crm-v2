import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function hasVerifiedQuality(runs, sha, repository) {
  return /^[0-9a-f]{40}$/.test(sha ?? '') && runs.some(run =>
    run.head_sha === sha && run.head_branch === 'main' && ['push', 'workflow_dispatch'].includes(run.event) &&
    run.path === '.github/workflows/quality.yml' && run.status === 'completed' &&
    run.conclusion === 'success' && run.repository?.full_name === repository)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.env.SOURCE_SHA, repository = process.env.GITHUB_REPOSITORY
  if (!/^[0-9a-f]{40}$/.test(sha ?? '') || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Invalid release identity')
  const response = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/actions/workflows/quality.yml/runs?head_sha=${sha}&per_page=100`], { encoding: 'utf8' }))
  if (!hasVerifiedQuality(response.workflow_runs, sha, repository)) throw new Error('No successful main quality check for this exact source commit')
  console.log(`Reusing successful main quality verification for ${sha}`)
}
