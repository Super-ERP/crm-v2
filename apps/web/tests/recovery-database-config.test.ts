import { readFile } from "node:fs/promises"
import { parse } from "dotenv"
import { describe, expect, it } from "vitest"
import { recoveryDatabaseUrl } from "../db/master-password-recovery"

describe("source-free recovery database configuration", () => {
  it("derives the admin URL from the shipped deployment template rather than its placeholder", async () => {
    const deployment = parse(await readFile("../../deploy/client/.env.example", "utf8"))
    deployment.POSTGRES_PASSWORD = "pass:@/?#$"
    deployment.DB_NAME = "crm"
    expect(recoveryDatabaseUrl(deployment)).toBe("postgres://postgres:pass%3A%40%2F%3F%23%24@db:5432/crm")
  })
  it("honors an explicit administrative URL for source development", () => {
    expect(recoveryDatabaseUrl({}, "postgres://postgres:test@localhost:5432/crm")).toBe("postgres://postgres:test@localhost:5432/crm")
  })
})
