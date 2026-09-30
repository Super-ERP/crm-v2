"""Preserve an importer and its local TS dependency closure without changing it."""
import argparse
import hashlib
import json
import posixpath
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def snapshot(repo, destination, revision=None):
    repo, destination = Path(repo).resolve(), Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=False)
    def read(path):
        if revision:
            return subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=repo, stderr=subprocess.DEVNULL)
        return (repo / path).read_bytes()
    pending = ["apps/web/db/import/import.ts", "apps/web/tsconfig.json", "apps/web/package.json", "pnpm-lock.yaml"]
    files = {}
    while pending:
        path = pending.pop()
        if path in files:
            continue
        data = read(path)
        target = destination / "source" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        files[path] = hashlib.sha256(data).hexdigest()
        if not path.endswith((".ts", ".tsx")):
            continue
        for spec in re.findall(r'(?:from\s*|import\s*)[\"\x27]([^\"\x27]+)[\"\x27]', data.decode()):
            if not spec.startswith((".", "@/")):
                continue
            base = "apps/web/" + spec[2:] if spec.startswith("@/") else posixpath.normpath(posixpath.join(posixpath.dirname(path), spec))
            candidates = [base, base + ".ts", base + ".tsx", base + "/index.ts"]
            for candidate in candidates:
                try:
                    read(candidate)
                    pending.append(candidate)
                    break
                except (OSError, subprocess.CalledProcessError):
                    pass
            else:
                raise RuntimeError(f"Unresolved snapshot dependency: {path} -> {spec}")
    manifest = {"snapshot": destination.name, "createdAt": datetime.now(timezone.utc).isoformat(),
                "gitCommit": subprocess.check_output(["git", "rev-parse", revision or "HEAD"], cwd=repo, text=True).strip(),
                "workingTreeSnapshot": not bool(revision), "files": dict(sorted(files.items()))}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--revision")
    args = p.parse_args()
    result = snapshot(args.repo, args.out, args.revision)
    print(json.dumps({"snapshot": result["snapshot"], "files": len(result["files"]), "commit": result["gitCommit"]}))
