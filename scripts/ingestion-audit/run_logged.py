"""Run either preserved importer with immutable run logs and source/code hashes.

Database credentials are accepted only through environment variables. Each run
requires a new output directory. Native importer code and behavior are unchanged.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


def redact(text):
    return re.sub(r"postgres(?:ql)?://[^\s\"']+", "[DATABASE_URL REDACTED]", text)


def observed_failures(text):
    return sum(map(int, re.findall(r"\bfailed:\s*(\d+)", text))) + len(re.findall(r"user failed\s*\(", text))


def run(args):
    snapshot, repo, source, out = [Path(v).resolve() for v in (args.snapshot, args.repo, args.data, args.out)]
    out.mkdir(parents=True, exist_ok=False)
    events = out / "events.jsonl"
    def log(event, **details):
        with events.open("a") as f:
            f.write(json.dumps({"at": now(), "event": event, **details}) + "\n")
    state = {"startedAt": now(), "snapshot": snapshot.name, "tenant": args.tenant,
             "mode": "commit" if args.commit else "dry-run", "exitCode": None, "completed": False}
    log("started", **state)
    try:
        if not (os.environ.get("DATABASE_ADMIN_URL") or os.environ.get("DATABASE_URL")):
            raise RuntimeError("Set DATABASE_ADMIN_URL explicitly; implicit importer fallback is disabled by this wrapper")
        manifest = json.loads((snapshot / "manifest.json").read_text())
        for name, expected in manifest["files"].items():
            if hashlib.sha256((snapshot / "source" / name).read_bytes()).hexdigest() != expected:
                raise RuntimeError(f"Snapshot hash mismatch: {name}")
        state["snapshotManifestSha256"] = hashlib.sha256((snapshot / "manifest.json").read_bytes()).hexdigest()
        state["sourceHashes"] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(source.glob("*.csv"))}
        app = snapshot / "source/apps/web"
        deps = app / "node_modules"
        if not deps.exists():
            deps.symlink_to(repo / "apps/web/node_modules", target_is_directory=True)
        tsx = repo / "apps/web/node_modules/.bin/tsx"
        cmd = [str(tsx), "--tsconfig", str(app / "tsconfig.json"), str(app / "db/import/import.ts"),
               f"--tenant={args.tenant}", f"--dir={source}", f"--report-dir={out}"]
        if args.owner:
            cmd.append(f"--owner={args.owner}")
        if args.quote_funnel_map:
            override = Path(args.quote_funnel_map).resolve()
            state["overrideSha256"] = hashlib.sha256(override.read_bytes()).hexdigest()
            cmd.append(f"--quote-funnel-map={override}")
        if args.commit:
            cmd.append("--commit")
        # Run from the snapshot app so dotenv cannot load the working CRM's .env.
        with (out / "console.log").open("w") as console:
            child = subprocess.Popen(cmd, cwd=app, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for raw in child.stdout:
                line = redact(raw)
                console.write(line)
                console.flush()
                log("output", message=line.rstrip("\n"))
            state["exitCode"] = child.wait()
        text = (out / "console.log").read_text()
        state["observedLegacyFailures"] = observed_failures(text)
        native = out / "migration-report.json"
        if native.exists():
            r = json.loads(native.read_text())
            state.update(committed=r["committed"], rolledBack=r["rolledBack"], summary=r["summary"])
            state["reportSha256"] = hashlib.sha256(native.read_bytes()).hexdigest()
        else:
            state["nativeReportAvailable"] = False
            state["persistenceNote"] = "Legacy importer has no transactional result manifest; commit may have partially persisted. Inspect counts/logs."
        state["completed"] = True
        code = state["exitCode"] or (1 if state["observedLegacyFailures"] else 0)
        state["wrapperExitCode"] = code
    except Exception as error:
        state["error"] = redact(str(error))
        state["wrapperExitCode"] = code = 1
        log("error", message=state["error"])
    finally:
        state["finishedAt"] = now()
        log("finished", exitCode=state.get("wrapperExitCode", 1), completed=state["completed"])
        (out / "run.json").write_text(json.dumps(state, indent=2) + "\n")
    print(json.dumps({k: state.get(k) for k in ("snapshot", "completed", "wrapperExitCode", "error")}))
    return code


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    for name in ("snapshot", "repo", "data", "tenant", "out"):
        p.add_argument("--" + name, required=True)
    p.add_argument("--owner")
    p.add_argument("--quote-funnel-map")
    p.add_argument("--commit", action="store_true")
    sys.exit(run(p.parse_args()))
