import "dotenv/config"
import postgres from "postgres"
import { readFile } from "node:fs/promises"
import { parse } from "dotenv"
import { parseArgs } from "node:util"
import { recoveryDatabaseUrl, rotateMasterPassword } from "./master-password-recovery"

async function main() {
  const { values } = parseArgs({ options: {
    "env-file": { type: "string" },
    "output-file": { type: "string" },
    help: { type: "boolean" },
  } })
  if (values.help) {
    console.log("reset-master --env-file /private/deployment.env --output-file /private/new-password.json")
    return
  }
  if (!values["env-file"] || !values["output-file"]) {
    throw new Error("Provide --env-file and --output-file")
  }
  const deployment = parse(await readFile(values["env-file"], "utf8"))
  const email = (process.env.PLATFORM_MASTER_EMAIL ?? deployment.PLATFORM_MASTER_EMAIL)?.trim().toLowerCase()
  const databaseUrl = recoveryDatabaseUrl(deployment, process.env.DATABASE_ADMIN_URL)
  if (!email) throw new Error("Missing platform master email")
  const sql = postgres(databaseUrl, { max: 1 })
  try {
    await rotateMasterPassword(sql, { expectedEmail: email, envFile: values["env-file"], outputFile: values["output-file"] })
    console.log("Platform master password rotated; sessions revoked. Retrieve it from the private output file.")
  } finally { await sql.end() }
}

main().catch(() => {
  // Database and filesystem errors can contain secrets or SQL parameters.
  console.error("Password recovery failed. No secrets logged. Inspect the private output file if one was created; reconcile database and deployment configuration before retrying.")
  process.exitCode = 1
})
