import { constants } from "node:fs"
import { open } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { parse } from "dotenv"
import type { Sql } from "postgres"

/** The deployment template contains placeholders, not usable connection URLs. */
export function recoveryDatabaseUrl(deployment: Record<string, string>, override?: string): string {
  const configured = [override, deployment.DATABASE_ADMIN_URL].find(value => value && value !== "DERIVED_BY_DEPLOY")
  const url = configured ?? (deployment.POSTGRES_PASSWORD && deployment.DB_NAME
    ? `postgres://postgres:${encodeURIComponent(deployment.POSTGRES_PASSWORD)}@db:5432/${encodeURIComponent(deployment.DB_NAME)}`
    : undefined)
  if (!url || !["postgres:", "postgresql:"].includes(new URL(url).protocol)) {
    throw new Error("Administrative database configuration is missing or invalid")
  }
  return url
}

/** Privileged operator-only recovery; never imported by a web route. */
export async function rotateMasterPassword(sql: Sql, options: {
  expectedEmail: string
  envFile: string
  outputFile: string
}): Promise<void> {
  const email = options.expectedEmail.trim().toLowerCase()
  if (!email) throw new Error("Platform master email is required")
  const environment = await open(options.envFile, constants.O_RDWR | constants.O_NOFOLLOW)
  let original: string | undefined
  let changed = false
  async function writeEnvironment(source: string) {
    const buffer = Buffer.from(source)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesWritten } = await environment.write(buffer, offset, buffer.length - offset, offset)
      if (bytesWritten === 0) throw new Error("Environment write made no progress")
      offset += bytesWritten
    }
    await environment.truncate(buffer.length)
    await environment.sync()
  }
  try {
    const metadata = await environment.stat()
    if (!metadata.isFile() || (metadata.mode & 0o007) !== 0) {
      throw new Error("Deployment environment file must be private and regular")
    }
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('crm:master-password-recovery'))`
      original = await environment.readFile("utf8")
      const parsed = parse(original)
      if (parsed.PLATFORM_MASTER_EMAIL?.trim().toLowerCase() !== email) {
        throw new Error("Deployment platform master email does not match")
      }
      for (const key of ["PLATFORM_MASTER_EMAIL", "PLATFORM_MASTER_PASSWORD"]) {
        if (original.split(/\r?\n/).filter(line => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line)).length !== 1) {
          throw new Error("Deployment environment must contain exactly one master email and password")
        }
      }
      const masters = await tx`SELECT id FROM public."user" WHERE lower(email) = ${email} AND is_superadmin = true FOR UPDATE`
      if (masters.length !== 1) throw new Error("Expected exactly one matching superadmin")
      const credentials = await tx`SELECT id FROM public.account WHERE user_id = ${masters[0].id} AND provider_id = 'credential' FOR UPDATE`
      if (credentials.length !== 1) throw new Error("Expected exactly one password credential")
      const password = randomBytes(30).toString("base64url")
      const updated = original.replace(/^PLATFORM_MASTER_PASSWORD=.*$/m, `PLATFORM_MASTER_PASSWORD=${password}`)
      if (parse(updated).PLATFORM_MASTER_PASSWORD !== password) {
        throw new Error("Deployment password assignment is ambiguous")
      }
      const hashed = await hashPassword(password)
      const output = await open(options.outputFile, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
      try {
        await output.writeFile(`${JSON.stringify({ email, password }, null, 2)}\n`)
        await output.sync()
      } finally { await output.close() }
      await tx`UPDATE public.account SET password = ${hashed}, updated_at = now() WHERE id = ${credentials[0].id}`
      await tx`DELETE FROM public.session WHERE user_id = ${masters[0].id}`
      changed = true
      await writeEnvironment(updated)
    })
  } catch (error) {
    if (changed && original !== undefined) {
      await writeEnvironment(original)
    }
    throw error
  } finally { await environment.close() }
}
