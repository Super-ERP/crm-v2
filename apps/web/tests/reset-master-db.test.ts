import postgres, { type Sql } from "postgres"
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { verifyPassword } from "better-auth/crypto"
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it } from "vitest"
import { rotateMasterPassword } from "../db/master-password-recovery"

const url = process.env.TEST_DATABASE_ADMIN_URL
const integration = url ? describe.sequential : describe.skip
integration("platform master password recovery", () => {
  let sql: Sql
  let server: Sql
  let databaseName: string
  let folder: string
  beforeAll(async () => {
    const target = new URL(url!)
    target.pathname = "/postgres"
    server = postgres(target.toString(), { max: 1 })
    databaseName = `crm_recovery_${process.pid}_${Date.now()}`
    await server.unsafe(`CREATE DATABASE "${databaseName}"`)
    target.pathname = `/${databaseName}`
    sql = postgres(target.toString(), { max: 1 })
    await sql`CREATE TABLE "user" (id text PRIMARY KEY, email text, is_superadmin boolean)`
    await sql`CREATE TABLE account (id text PRIMARY KEY, user_id text, provider_id text, password text, updated_at timestamptz)`
    await sql`CREATE TABLE session (id text PRIMARY KEY, user_id text)`
  })
  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "crm-master-reset-"))
    await writeFile(join(folder, ".env"), "PLATFORM_MASTER_EMAIL=owner@example.com\nPLATFORM_MASTER_PASSWORD=old-password\nOTHER=keep\n", { mode: 0o600 })
    await sql`TRUNCATE account, session, "user"`
    await sql`INSERT INTO "user" VALUES ('master','owner@example.com',true),('other','other@example.com',false)`
    await sql`INSERT INTO account VALUES ('oauth','master','microsoft-entra-id',null,now()),('credential','master','credential','old-hash',now()),('other','other','credential','other-hash',now())`
    await sql`INSERT INTO session VALUES ('master-session','master'),('other-session','other')`
  })
  afterEach(async () => { if (folder) await rm(folder, { recursive: true, force: true }) })
  afterAll(async () => {
    await sql?.end()
    if (server) {
      if (databaseName) await server.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`)
      await server.end()
    }
  })
  const options = () => ({ envFile: join(folder, ".env"), outputFile: join(folder, "password.txt"), expectedEmail: "owner@example.com" })
  it("updates only the password credential, revokes only master sessions and persists the generated password", async () => {
    await rotateMasterPassword(sql, options())
    const secret = JSON.parse(await readFile(options().outputFile, "utf8"))
    const accounts = await sql`SELECT * FROM account ORDER BY id`
    expect(await verifyPassword({ hash: accounts.find(a => a.id === "credential")!.password, password: secret.password })).toBe(true)
    expect(accounts.find(a => a.id === "oauth")!.password).toBeNull()
    expect(accounts.find(a => a.id === "other")!.password).toBe("other-hash")
    expect(await sql`SELECT id FROM session`).toEqual([expect.objectContaining({ id: "other-session" })])
    expect(await readFile(options().envFile, "utf8")).toContain(`PLATFORM_MASTER_PASSWORD=${secret.password}\nOTHER=keep`)
    expect((await stat(options().outputFile)).mode & 0o777).toBe(0o600)
  })
  it("rejects a non-superadmin without changing credentials or deployment environment", async () => {
    await sql`UPDATE "user" SET is_superadmin=false WHERE id='master'`
    await expect(rotateMasterPassword(sql, options())).rejects.toThrow("superadmin")
    expect((await sql`SELECT password FROM account WHERE id='credential'`)[0].password).toBe("old-hash")
    expect(await readFile(options().envFile, "utf8")).toContain("PLATFORM_MASTER_PASSWORD=old-password")
  })
  it("fails closed on duplicate password credentials", async () => {
    await sql`INSERT INTO account VALUES ('duplicate','master','credential','old-hash',now())`
    await expect(rotateMasterPassword(sql, options())).rejects.toThrow("credential")
    expect(await readFile(options().envFile, "utf8")).toContain("PLATFORM_MASTER_PASSWORD=old-password")
    expect((await sql`SELECT count(*)::int AS n FROM session`)[0].n).toBe(2)
  })
  it("restores the environment when a deferred database check aborts commit", async () => {
    await sql`CREATE FUNCTION reject_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test commit failure'; END $$`
    await sql`CREATE CONSTRAINT TRIGGER reject_reset AFTER UPDATE ON account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_reset()`
    try {
      await expect(rotateMasterPassword(sql, options())).rejects.toThrow("test commit failure")
      expect((await sql`SELECT password FROM account WHERE id='credential'`)[0].password).toBe("old-hash")
      expect(await readFile(options().envFile, "utf8")).toContain("PLATFORM_MASTER_PASSWORD=old-password")
      expect((await sql`SELECT count(*)::int AS n FROM session`)[0].n).toBe(2)
    } finally {
      await sql`DROP TRIGGER reject_reset ON account`
      await sql`DROP FUNCTION reject_reset()`
    }
  })
  it.each(["export PLATFORM_MASTER_PASSWORD=override", "  PLATFORM_MASTER_PASSWORD = override"])("rejects duplicate dotenv assignments: %s", async extra => {
    const original = await readFile(options().envFile, "utf8") + extra + "\n"
    await writeFile(options().envFile, original)
    await expect(rotateMasterPassword(sql, options())).rejects.toThrow("exactly one")
    expect(await readFile(options().envFile, "utf8")).toBe(original)
    expect((await sql`SELECT password FROM account WHERE id='credential'`)[0].password).toBe("old-hash")
  })
  it("does not overwrite an existing recovery file", async () => {
    await writeFile(options().outputFile, "existing", { mode: 0o600 })
    await expect(rotateMasterPassword(sql, options())).rejects.toThrow()
    expect(await readFile(options().outputFile, "utf8")).toBe("existing")
    expect((await sql`SELECT password FROM account WHERE id='credential'`)[0].password).toBe("old-hash")
  })
  it("rolls back database changes if the environment cannot be safely updated", async () => {
    await writeFile(options().envFile, "PLATFORM_MASTER_EMAIL=wrong@example.com\nPLATFORM_MASTER_PASSWORD=old-password\n", { mode: 0o600 })
    await expect(rotateMasterPassword(sql, options())).rejects.toThrow("email")
    expect((await sql`SELECT password FROM account WHERE id='credential'`)[0].password).toBe("old-hash")
  })
})
