import 'dotenv/config'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { parseArgs } from 'node:util'
import { createHash, randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { parseCsv } from './csv'
import { planProjectCodeBackfill, type ProjectCodeSnapshot } from './project-code-backfill-plan'
import { applyProjectCodeBackfill } from './project-code-backfill-db'
async function main() {
  const { values } = parseArgs({ options: { dir: { type: 'string' }, tenant: { type: 'string' }, 'report-dir': { type: 'string' }, snapshot: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!values.dir || !values.tenant || !values['report-dir']) throw new Error('Required: --dir <export> --tenant <tenant ID> --report-dir <private output>')
  if (values.apply && values.snapshot) throw new Error('Snapshots are read-only; apply requires a live database')
  const raw = readFileSync(join(values.dir, 'Opportunity.csv'), 'utf8')
  const parsed = parseCsv(raw)
  for (const field of ['Id', 'Opportunity__c', 'Project_Code__c', 'Project_Code_For_Cross_Deal__c']) if (!parsed.headers.includes(field)) throw new Error(`Missing required source column: ${field}`)
  const hashes = { Opportunity: createHash('sha256').update(raw).digest('hex') }
  const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL
  if (!values.snapshot && !url) throw new Error('Live mode requires DATABASE_ADMIN_URL or DATABASE_URL')
  const sql = values.snapshot ? null : postgres(url!, { max: 1 })
  try {
    const stored: ProjectCodeSnapshot = values.snapshot ? JSON.parse(readFileSync(values.snapshot, 'utf8')) : { funnels: await sql!`select id, tenant_id, opportunity_id, deleted_at, updated_at::text, project_code, cross_deal_project_code from funnels where tenant_id = ${values.tenant}` } as ProjectCodeSnapshot
    const plan = planProjectCodeBackfill({ Opportunity: parsed }, values.tenant, stored)
    const output = resolve(values['report-dir'], `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`)
    const source = resolve(values.dir)
    if (output === source || output.startsWith(source + '/')) throw new Error('Reports must be outside the source export')
    mkdirSync(output, { recursive: true, mode: 0o700 })
    writeFileSync(join(output, 'project-code-backfill.json'), JSON.stringify({ generatedAt: new Date().toISOString(), mode: values.apply ? 'apply' : 'dry-run', sourceHashes: hashes, ...plan }, null, 2), { mode: 0o600 })
    if (values.apply) {
      const count = await applyProjectCodeBackfill(sql!, plan, hashes)
      writeFileSync(join(output, 'committed.json'), JSON.stringify({ count, committedAt: new Date().toISOString() }), { mode: 0o600 })
    }
    console.log(JSON.stringify({ mode: values.apply ? 'apply' : 'dry-run', sourceCount: plan.sourceCount, ready: plan.ready.length, review: plan.review.length, alreadyCaptured: plan.alreadyCaptured, reportDirectory: output }))
  } finally { await sql?.end() }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
