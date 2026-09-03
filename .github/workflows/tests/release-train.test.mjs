import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const releaseUrl = new URL("../release.yml", import.meta.url)
const stagingPublisherUrl = new URL("../publish-staging-images.yml", import.meta.url)
const legacyReleaseScriptUrl = new URL("../../../scripts/release-one-command.sh", import.meta.url)
const source = readFileSync(releaseUrl, "utf8")
const { parse } = await import("yaml")
const workflow = parse(source)

test("successful main quality runs create one automatic release", () => {
  assert.deepEqual(workflow.on?.workflow_run?.workflows, ["quality"])
  assert.deepEqual(workflow.on?.workflow_run?.branches, ["main"])
  assert.match(workflow.jobs?.release?.if ?? "", /conclusion == 'success'/)
  assert.equal(workflow.concurrency?.group, "release-main")
  assert.equal(workflow.concurrency?.["cancel-in-progress"], false)
  assert.equal(workflow.permissions?.actions, "write")
  assert.equal(workflow.permissions?.contents, "write")
})

test("release labels select semver behavior and documentation changes skip release", () => {
  for (const label of ["release:none", "release:minor", "release:major"]) {
    assert.match(source, new RegExp(label.replace(":", "\\:")))
  }
  assert.match(source, /docs\/\|README/)
  assert.match(source, /git tag -a/)
  assert.match(source, /gh workflow run release-images\.yml/)
})

test("legacy duplicate staging builder and local release driver are removed", () => {
  assert.equal(existsSync(stagingPublisherUrl), false)
  assert.equal(existsSync(legacyReleaseScriptUrl), false)
})

test("third-party actions remain commit pinned", () => {
  const actions = [...source.matchAll(/uses:\s*([^\s#]+)/g)].map((match) => match[1])
  assert.ok(actions.length > 0)
  for (const action of actions) assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/)
})
