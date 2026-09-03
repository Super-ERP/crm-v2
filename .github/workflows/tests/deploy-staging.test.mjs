import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowPath = resolve(
  import.meta.dirname,
  "../deploy-staging.yml",
);
const workflow = readFileSync(workflowPath, "utf8");

assert.match(workflow, /Reconcile retained staging database password/);
assert.match(workflow, /ALTER ROLE postgres PASSWORD/);
assert.match(workflow, /\^\[0-9a-f\]\{48\}\$/);

assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /release_run_id:/);
assert.doesNotMatch(workflow, /branches:\s*\[staging\]/);
assert.match(workflow, /release-manifest-/);
assert.match(workflow, /release run is not a successful main release/);
assert.match(workflow, /\.source_commit/);
assert.match(workflow, /\.image_ref/);
assert.match(workflow, /WEB_IMAGE=\$web_image/);
assert.match(workflow, /MIGRATOR_IMAGE=\$migrator_image/);
assert.doesNotMatch(workflow, /:sha-\$\{\{/);
assert.match(workflow, /docker-compose\.staging-images\.yaml/);
assert.match(workflow, /--pull always --no-build/);
assert.match(workflow, /git -C \"\$DIR\" fetch origin main \"\$\{DEPLOY_SHA\}\"/);
assert.match(workflow, /git -C \"\$DIR\" checkout -f \"\$\{DEPLOY_SHA\}\"/);

const pointAuthAtTunnel = workflow.indexOf(
  "- name: Point auth at the tunnel URL and recreate web",
);
const healthCheck = workflow.indexOf(
  "- name: Health check (via the public tunnel URL)",
);
const promotion = workflow.indexOf(
  "- name: Promote verified release to production",
);
const publishAccess = workflow.indexOf("- name: Publish staging access");

assert.ok(pointAuthAtTunnel >= 0, "missing tunnel auth configuration step");
assert.ok(healthCheck > pointAuthAtTunnel, "health check must use the live URL");
assert.ok(promotion > healthCheck, "production promotion must follow health");
assert.ok(publishAccess > promotion, "access details must publish after promotion");

const bootstrap = workflow.slice(0, pointAuthAtTunnel);
const publish = workflow.slice(publishAccess);

assert.ok(
  !bootstrap.includes("Demo admin:"),
  "credentials must not be limited to the first bootstrap run",
);
assert.match(publish, /if: always\(\)?|if: always/);
assert.match(publish, /Microsoft SSO is intentionally unavailable/);
assert.doesNotMatch(publish, /get_env DEMO_ADMIN_PASSWORD/);
assert.doesNotMatch(publish, /get_env SEED_SAMPLE_PASSWORD/);
assert.doesNotMatch(publish, /Demo admin:/);
assert.match(publish, /never printed in workflow logs or summaries/);
assert.doesNotMatch(workflow, /\/api\/auth\/sign-in\/email/);
assert.doesNotMatch(workflow, /get_env DEMO_ADMIN_(?:EMAIL|PASSWORD)/);
assert.match(workflow, /Promote verified release to production/);
assert.match(workflow, /gh workflow run deploy\.yml/);

console.log("deploy-staging workflow health contract OK");
