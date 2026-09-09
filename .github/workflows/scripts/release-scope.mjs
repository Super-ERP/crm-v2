import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function releaseScope(files, { includeTests = false } = {}) {
  let erp = false, vendor = false
  for (const file of files) {
    if (/^(docs\/|README(?:\.[^/]*)?$)/i.test(file) || (!includeTests && /(^|\/)(tests\/|[^/]+\.(test|spec)\.[^/]+$)/.test(file))) continue
    if (file.startsWith('apps/control-plane/')) vendor = true
    else if (/^(apps\/(web|deployment-agent)\/|deploy\/|docker\/|Dockerfile$|docker-compose[^/]*$)/.test(file)) erp = true
    else { erp = true; vendor = true }
  }
  return { erp, vendor }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.env.SOURCE_SHA
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error('Invalid source SHA')
  const files = execFileSync('git', ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-m', sha], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  for (const [key, value] of Object.entries(releaseScope(files, { includeTests: process.env.CHECK_MODE === 'true' }))) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
}
