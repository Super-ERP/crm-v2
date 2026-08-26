import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { readDatabaseConfiguration, updateEnvironment } from "../src/environment.js"

describe("deployment environment configuration", () => {
  it("reports database metadata without returning password values", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crm-agent-"))
    const path = join(directory, ".env")
    await writeFile(path, "DB_NAME=crm\nDB_HOST_PORT=5433\nCRM_APP_PASSWORD=secret\nPOSTGRES_PASSWORD=admin\n", { mode: 0o600 })
    const result = await readDatabaseConfiguration(path)
    expect(result).toMatchObject({ databaseName: "crm", hostPort: 5433, applicationPasswordConfigured: true, administratorPasswordConfigured: true })
    expect(JSON.stringify(result)).not.toContain("secret")
  })

  it("updates only allowlisted values and preserves secure mode", async () => {
    const directory = await mkdtemp(join(tmpdir(), "crm-agent-"))
    const path = join(directory, ".env")
    await writeFile(path, "DB_NAME=crm\nDB_HOST_PORT=5433\n", { mode: 0o600 })
    await updateEnvironment(path, { DB_HOST_PORT: "55433" })
    expect(await readFile(path, "utf8")).toContain("DB_HOST_PORT=55433")
    await expect(updateEnvironment(path, { POSTGRES_PASSWORD: "nope" })).rejects.toThrow("not allowed")
    await chmod(path, 0o600)
  })
})
