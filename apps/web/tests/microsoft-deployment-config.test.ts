import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

const source = readFileSync(new URL("../../../deploy/client/deploy.sh", import.meta.url), "utf8")
function shellFunction(name: string) {
  const match = source.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, "m"))
  if (!match) throw new Error(`Missing deployment function ${name}`)
  return match[0]
}

describe("Microsoft deployment configuration", () => {
  it("round-trips directory JSON and domains through the real deployment record and rollback functions", () => {
    const directory = mkdtempSync(join(tmpdir(), "crm-microsoft-config-"))
    const mapping = '[{"tenantId":"22222222-2222-4222-8222-222222222222", "domains":["q-armour.com"]}]'
    const credentials = '{"22222222-2222-4222-8222-222222222222":{"clientId":"33333333-3333-4333-8333-333333333333","clientSecret":"test-secret"}}'
    const allowed = "quandatics.com,q-armour.com"
    try {
      const input = join(directory, "input.env")
      writeFileSync(input, `MICROSOFT_EXTERNAL_DIRECTORIES=${mapping}\nMICROSOFT_ALLOWED_DOMAINS=${allowed}\nMICROSOFT_EXTERNAL_CREDENTIALS=${credentials}\n`)
      const result = spawnSync("sh", ["-c", [
        "set -e", 'fail() { echo "$*" >&2; exit 1; }',
        // Database/health URL derivation is unrelated to Microsoft configuration.
        "derive_database_urls() { :; }", "derive_healthcheck_url() { :; }",
        ...["parse_environment", "write_deployment_record", "parse_previous_record", "use_previous_environment", "restore_target_environment"].map(shellFunction),
        'parse_environment "$INPUT_FILE"',
        '[ "$MICROSOFT_EXTERNAL_DIRECTORIES" = "$EXPECTED_MAPPING" ]',
        '[ "$MICROSOFT_ALLOWED_DOMAINS" = "$EXPECTED_DOMAINS" ]',
        '[ "$MICROSOFT_EXTERNAL_CREDENTIALS" = "$EXPECTED_CREDENTIALS" ]',
        "write_deployment_record",
        'parse_previous_record "$DEPLOYMENT_RECORD_FILE"',
        "MICROSOFT_EXTERNAL_DIRECTORIES=changed; MICROSOFT_ALLOWED_DOMAINS=changed; MICROSOFT_EXTERNAL_CREDENTIALS=changed",
        "use_previous_environment",
        '[ "$MICROSOFT_EXTERNAL_DIRECTORIES" = "$EXPECTED_MAPPING" ]',
        '[ "$MICROSOFT_ALLOWED_DOMAINS" = "$EXPECTED_DOMAINS" ]',
        '[ "$MICROSOFT_EXTERNAL_CREDENTIALS" = "$EXPECTED_CREDENTIALS" ]',
        "restore_target_environment",
        '[ "$MICROSOFT_EXTERNAL_DIRECTORIES" = "[]" ]',
        '[ "$MICROSOFT_EXTERNAL_CREDENTIALS" = "{}" ]',
        '[ "$MICROSOFT_ALLOWED_DOMAINS" = "quandatics.com" ]',
      ].join("\n")], { encoding: "utf8", env: {
        PATH: process.env.PATH, NODE_ENV: "test",
        INPUT_FILE: input, DEPLOYMENT_RECORD_FILE: join(directory, "record.env"),
        EXPECTED_MAPPING: mapping, EXPECTED_DOMAINS: allowed, EXPECTED_CREDENTIALS: credentials,
        TARGET_MICROSOFT_EXTERNAL_DIRECTORIES: "[]", TARGET_MICROSOFT_EXTERNAL_CREDENTIALS: "{}", TARGET_MICROSOFT_ALLOWED_DOMAINS: "quandatics.com",
      } })
      expect(result.stderr).toBe("")
      expect(result.status).toBe(0)
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
})
