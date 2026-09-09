import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// Disposable local smoke environment: never connects to client data or the vendor agent.
const directory = resolve(process.argv[2])
const manifest = JSON.parse(readFileSync(resolve(directory, 'release-manifest.json'), 'utf8'))
const project = `crm-smoke-${process.env.GITHUB_RUN_ID ?? Date.now()}`
if (!/^crm-smoke-[0-9]+$/.test(project)) throw new Error('Invalid smoke project')
const secret = () => randomBytes(32).toString('hex')
const postgres = secret(), app = secret()
const environment = {
  ...process.env,
  COMPOSE_PROJECT_NAME: project, STORAGE_ID: project, DB_NAME: 'crm',
  POSTGRES_IMAGE: 'docker.io/library/postgres@sha256:dc17045ccfd343b49600570ea734b9c4991cf1c3f3302e67df51e3b402dd55c4',
  CADDY_IMAGE: 'docker.io/library/caddy@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648',
  POSTGRES_PASSWORD: postgres, CRM_APP_PASSWORD: app,
  DATABASE_ADMIN_URL: `postgres://postgres:${postgres}@db:5432/crm`,
  MIGRATOR_DATABASE_URL: `postgres://postgres:${postgres}@db:5432/crm`,
  APP_DATABASE_URL: `postgres://crm_app:${app}@db:5432/crm`,
  PLATFORM_MASTER_EMAIL: 'master@staging.example.com', PLATFORM_MASTER_PASSWORD: secret(),
  BOOTSTRAP_OWNER_EMAIL: 'master@staging.example.com', BETTER_AUTH_SECRET: secret(),
  APP_URL: 'http://127.0.0.1:18092', BETTER_AUTH_URL: 'http://127.0.0.1:18092',
  DEPLOYMENT_ID: randomUUID(), AGENT_WEB_SECRET: randomBytes(32).toString('base64url'),
  RELEASE_TAG: manifest.release_tag, SOURCE_COMMIT_SHA: manifest.source_commit,
  APPLICATION_VERSION: manifest.release_version, AGENT_VERSION: manifest.release_version,
  MIGRATION_VERSION: manifest.migration_version,
  CONTROL_PLANE_URL: 'https://unused.example.invalid', DEPLOYMENT_ENV: 'staging',
  IMAGE_DIGEST: manifest.images.find(image => image.name === 'web').digest,
  SEED_SAMPLE_DATA: 'false', GATEWAY_HOST_PORT: '18092', DB_HOST_PORT: '15439',
}
// Trust set is public, supplied by the staging environment, never borrowed from production.
if (!environment.VENDOR_ENTITLEMENT_TRUST_SET) throw new Error('Staging trust set is missing')
for (const name of ['web', 'migrator', 'backup', 'agent']) environment[`${name.toUpperCase()}_IMAGE`] = manifest.images.find(image => image.name === name).image_ref
const override = resolve(directory, 'smoke.override.yaml')
writeFileSync(override, 'services:\n  gateway:\n    ports: !override\n      - "127.0.0.1:18092:8081"\n')
const compose = (...args) => execFileSync('docker', ['compose', '--env-file', '/dev/null', '-p', project, '-f', resolve(directory, 'compose.yaml'), '-f', override, ...args], { env: environment, stdio: 'inherit' })
try {
  compose('up', '-d', '--wait', '--wait-timeout', '90', 'db')
  compose('run', '--rm', '--no-deps', 'migrate')
  compose('up', '-d', '--wait', '--wait-timeout', '120', 'web', 'gateway')
  execFileSync(resolve(directory, 'healthcheck.sh'), { env: { ...environment, HEALTHCHECK_URL: 'http://127.0.0.1:18092/api/health' }, stdio: 'inherit' })
  const response = await fetch('http://127.0.0.1:18092/api/auth/sign-in/email', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: environment.APP_URL },
    body: JSON.stringify({ email: environment.PLATFORM_MASTER_EMAIL, password: 'invalid-smoke-test-password' }),
  })
  const result = await response.json()
  if (response.status !== 401 || result.code !== 'INVALID_EMAIL_OR_PASSWORD') throw new Error('Master password policy did not reach credential validation')
  console.log(`Production bundle smoke passed: ${manifest.release_tag}`)
} finally {
  // This project is generated above; only its disposable volumes are removed.
  compose('down', '--volumes', '--remove-orphans')
}
