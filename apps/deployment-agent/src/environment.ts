import { constants } from "node:fs"
import { lstat, open, readFile } from "node:fs/promises"

const KEY = /^[A-Z][A-Z0-9_]*$/
const DB_NAME = /^[a-zA-Z_][a-zA-Z0-9_$]{0,62}$/
const PORT = /^[1-9][0-9]{0,4}$/
const EDITABLE = new Set(["DB_NAME", "DB_HOST_PORT"])

export type DatabaseConfiguration = {
  databaseName: string | null
  hostPort: number | null
  containerHost: "db"
  containerPort: 5432
  applicationUser: "crm_app"
  administratorUser: "postgres"
  applicationPasswordConfigured: boolean
  administratorPasswordConfigured: boolean
}

type ParsedEnvironment = { lines: string[]; values: Map<string, string> }

function parse(source: string): ParsedEnvironment {
  const lines = source.split("\n")
  const values = new Map<string, string>()
  for (const line of lines) {
    if (line === "" || line.trimStart().startsWith("#")) continue
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line)
    if (!match || values.has(match[1])) throw new Error("Invalid environment file")
    values.set(match[1], match[2])
  }
  return { lines, values }
}

function validUpdate(key: string, value: string): boolean {
  if (!EDITABLE.has(key)) return false
  return key === "DB_NAME" ? DB_NAME.test(value) : PORT.test(value) && Number(value) <= 65535
}

export async function readDatabaseConfiguration(path: string): Promise<DatabaseConfiguration> {
  const original = await readFile(path, "utf8")
  const parsed = parse(original)
  const appPassword = parsed.values.get("CRM_APP_PASSWORD")
  const adminPassword = parsed.values.get("POSTGRES_PASSWORD")
  const hostPort = parsed.values.get("DB_HOST_PORT")
  return {
    databaseName: parsed.values.get("DB_NAME") ?? null,
    hostPort: hostPort !== undefined && PORT.test(hostPort) ? Number(hostPort) : null,
    containerHost: "db",
    containerPort: 5432,
    applicationUser: "crm_app",
    administratorUser: "postgres",
    applicationPasswordConfigured: Boolean(appPassword && !appPassword.includes("CHANGE_ME") && !appPassword.includes("change_me")),
    administratorPasswordConfigured: Boolean(adminPassword && !adminPassword.includes("CHANGE_ME") && !adminPassword.includes("change_me")),
  }
}

export async function updateEnvironment(path: string, updates: Record<string, string>): Promise<{ changedKeys: string[]; configuration: DatabaseConfiguration }> {
  const file = await lstat(path)
  if (!file.isFile() || file.isSymbolicLink() || (file.mode & 0o007) !== 0) throw new Error("Environment file is not secure")
  const original = await readFile(path, "utf8")
  const parsed = parse(original)
  for (const [key, value] of Object.entries(updates)) {
    if (!KEY.test(key) || !validUpdate(key, value)) throw new Error("Environment update is not allowed")
  }
  const remaining = new Map(Object.entries(updates))
  const lines = parsed.lines.map((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line)
    if (!match || !remaining.has(match[1])) return line
    const value = remaining.get(match[1])!
    remaining.delete(match[1])
    return `${match[1]}=${value}`
  })
  while (lines.at(-1) === "") lines.pop()
  if (remaining.size > 0 && lines.length > 0) lines.push("")
  for (const [key, value] of remaining) lines.push(`${key}=${value}`)
  const handle = await open(
    path,
    constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW,
  )
  try {
    await handle.writeFile(`${lines.join("\n")}\n`, "utf8")
    await handle.sync()
    await handle.close()
  } catch (error) {
    await handle.close().catch(() => undefined)
    await open(path, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW)
      .then(async (rollback) => { await rollback.writeFile(original, "utf8"); await rollback.sync(); await rollback.close() })
      .catch(() => undefined)
    throw error
  }
  return { changedKeys: Object.keys(updates), configuration: await readDatabaseConfiguration(path) }
}
