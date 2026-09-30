"""Build a common, source-ID-based comparison from historical and fresh run evidence."""
import argparse
import csv
import hashlib
import json
import re
import shutil
from collections import Counter
from pathlib import Path
from verify_local import identifier


def safe(value):
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return "'" + value
    return value


def write_csv(path, headers, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        count = 0
        for row in rows:
            writer.writerow([safe(v) for v in row])
            count += 1
    return count


def build(workspace, output):
    workspace, output = Path(workspace), Path(output)
    history, source, csvdir = workspace / "import-audit-20260925", workspace / "Full Data", output / "csv"
    def load(path):
        return json.loads(path.read_text())
    latest = load(output / "logs/v3-latest-commit/migration-report.json")
    confirmed = load(history / "confirmed-commit/migration-report.json")
    old_fields, old_audit = load(history / "fields.json"), load(history / "excel-data.json")
    mappings = load(history / "mappings.json")
    supported = {m["object"] for m in mappings}
    recognized = supported | {"User"}
    old_ids = {k: set(v) for k, v in load(output / "logs/v1-original-replay/stored-ids.json").items()}
    server_log = (output / "logs/v1-original-replay/postgres-errors.log").read_text()
    db_errors = {}
    for block in re.split(r'(?=^\d{4}-\d\d-\d\d .*? ERROR:)', server_log, flags=re.M):
        error = re.search(r' ERROR:  (.*)', block)
        statement = re.search(r' STATEMENT:  insert into "([^"]+)"', block)
        detail = re.search(r' DETAIL:  (.*)', block)
        if error and statement:
            db_errors.setdefault(statement[1], []).append((error[1], detail[1] if detail else ""))
    table_for = {m["object"]: m["table"] for m in mappings}
    failures = {(r[0], r[1]): r for r in old_audit["rejected"]}
    causes = {r[0]: r for r in old_audit["causes"]}
    new_outcomes = {(r["object"], r["sourceId"]): r for r in latest["outcomes"] if not r.get("generated")}
    field_index = {(r["object"], r["field"]): r for r in latest["fields"]}
    old_used = lambda r: r["status"] not in ("unmapped", "unsupported object")
    new_used = lambda r: not r["disposition"].startswith("omitted")
    source_by_object = {}
    source_manifest = []
    confirmed_hashes = {r["object"]: r["sha256"] for r in confirmed["inventory"]}
    for i in latest["inventory"]:
        path = source / (i["object"] + ".csv")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest == i["sha256"] == confirmed_hashes[i["object"]], "Source export changed: " + i["object"]
        source_manifest.append([i["object"], i["rows"], digest, str(path)])
        if i["object"] in recognized:
            with path.open(encoding="utf-8-sig", newline="") as f:
                source_by_object[i["object"]] = list(csv.DictReader(f))
    fields = []
    for old in old_fields:
        new = field_index.get((old["object"], old["field"]))
        if new is None:
            assert old["object"] not in recognized, "Recognized-object header mismatch"
            new = {"disposition": "omitted populated field" if old["populated_rows"] else "omitted empty field", "target": "", "fieldExceptionRows": 0,
                   "technique": "Unsupported object. Header parsing differs for this unsupported export; never imported."}
        fields.append([old["object"], old["field"], old["source_rows"], old["populated_rows"],
                       int(old_used(old)), old["status"], old["target"], int(new_used(new)),
                       new["disposition"], new["target"], new["fieldExceptionRows"], new["technique"]])
    field_headers = ["Object", "Source field", "Source records", "Populated values", "Old mapped or used", "Old disposition", "Old target", "New mapped or used", "New disposition", "New target", "Records with field notes", "New technique / limitation"]
    recognized_fields = [r for r in fields if r[0] in recognized]
    old_unmapped = [r for r in recognized_fields if r[3] > 0 and not r[4]]
    new_unmapped = [r for r in recognized_fields if r[3] > 0 and not r[7]]
    write_csv(csvdir / "all-fields-comparison.csv", field_headers, fields)
    write_csv(csvdir / "v1-unmapped-fields.csv", field_headers, old_unmapped)
    write_csv(csvdir / "v3-unmapped-fields.csv", field_headers, new_unmapped)
    write_csv(csvdir / "unsupported-populated-fields.csv", field_headers, (r for r in fields if r[0] not in recognized and r[3] > 0))
    records, old_failed = [], []
    generated = Counter(r["object"] for r in latest["generatedRecords"] if r.get("verified"))
    record_headers = ["Object", "Source ID", "CSV record number", "Old result", "Old failure field", "Old diagnosis", "Latest result", "Latest reason", "Latest readback verified", "Old database error message (29 Sep replay)", "Old database error detail (29 Sep replay)"]
    for obj in sorted(supported):
        failed_raw = []
        error_index = 0
        for n, row in enumerate(source_by_object[obj], 1):
            sid = row["Id"]
            inserted = identifier("old", obj, sid, "") in old_ids[obj]
            f = failures.get((obj, sid)) if not inserted else None
            assert inserted or f, "No original rejection evidence for " + sid
            reason = causes[f[5]][7] if f else ""
            new = new_outcomes[(obj, sid)]
            error, detail = "", ""
            if not inserted:
                error, detail = db_errors[table_for[obj]][error_index]
                error_index += 1
                # Legacy inserts are sequential in CSV order. Validate the logged
                # failing-row ID or foreign-key UUID against that source row.
                expected_id = identifier("old", obj, sid, "")
                if detail.startswith("Failing row contains"):
                    assert expected_id in detail, "Server error/source row mismatch: " + sid
                elif "Key (" in detail:
                    expected_refs = {identifier("old", target, row.get(field, ""), "") for field, target in [("AccountId", "Account"), ("Account_Name_c__c", "Account"), ("OpportunityId", "Opportunity"), ("Opportunity__c", "Opportunity_ID__c"), ("QuoteId", "Quote")] if row.get(field)}
                    assert any(ref in detail for ref in expected_refs), "FK error/source row mismatch: " + sid
            rec = [obj, sid, n, "inserted" if inserted else "failed", f[3] if f else "", reason, new["status"], new["reason"], bool(new.get("verified")), error, detail]
            records.append(rec)
            if not inserted:
                old_failed.append(rec)
                failed_raw.append(list(row.values()) + [f[3], reason, error, detail])
        assert error_index == len(db_errors.get(table_for[obj], [])), "Unmatched DB errors: " + obj
        if failed_raw:
            write_csv(csvdir / "v1-failed-source-records" / (obj + ".csv"), list(source_by_object[obj][0]) + ["Migration_failure_field", "Migration_failure_diagnosis", "Migration_database_error", "Migration_database_error_detail"], failed_raw)
    write_csv(csvdir / "record-comparison.csv", record_headers, records)
    write_csv(csvdir / "v1-failed-records.csv", record_headers, old_failed)
    write_csv(csvdir / "v3-failed-or-quarantined-records.csv", record_headers, (r for r in records if r[6] in ("failed", "quarantined", "not_attempted")))
    write_csv(csvdir / "v3-superseded-records.csv", record_headers, (r for r in records if r[6] == "superseded"))
    objects = [[r["object"], r["rows"], len(r["headers"]), "Unsupported object; deliberately outside both importers", r["object"] + ".csv"] for r in latest["inventory"] if r["object"] not in recognized]
    write_csv(csvdir / "unsupported-objects.csv", ["Object", "Source records", "Fields", "Reason", "Source file"], objects)
    def unsupported_records():
        for obj, _, _, reason, name in objects:
            with (source / name).open(encoding="utf-8-sig", newline="") as f:
                for n, r in enumerate(csv.DictReader(f), 1):
                    yield [obj, r.get("Id", ""), n, name, reason, "v1-original; v2-confirmed; v3-latest"]
    omitted_rows = write_csv(csvdir / "unsupported-records-all-versions.csv", ["Object", "Source ID (blank if absent)", "CSV record number", "Source file", "Reason", "Versions"], unsupported_records())
    value_counts = {}
    for version, omitted in [("v1", old_unmapped), ("v3", new_unmapped)]:
        def values():
            for field in omitted:
                obj, name = field[:2]
                for n, record in enumerate(source_by_object[obj], 1):
                    if record.get(name):
                        yield [obj, record.get("Id", ""), n, name, record[name], "No mapping in this version"]
        value_counts[version] = write_csv(csvdir / (version + "-unmapped-field-values.csv"), ["Object", "Source ID", "CSV record number", "Source field", "Source value", "Reason"], values())
    exceptions = []
    for note in latest["exceptions"]:
        reason = note["technique"]
        if "superseded" in reason.lower():
            kind = "Replaced snapshot"
        elif any(term in reason.lower() for term in ("omitted", "not migrated", "left unset", "no single unambiguous", "unlinked historical", "absent/quarantined")):
            kind = "Omitted link / unsupported value / default"
        else:
            kind = "Transformation / mapping note"
        exceptions.append([note["object"], note["sourceId"], note["fields"], kind, reason])
    exception_headers = ["Object", "Source ID", "Source or target fields", "Classification", "Reason / technique"]
    write_csv(csvdir / "v3-record-field-notes.csv", exception_headers, exceptions)
    write_csv(csvdir / "v3-field-omissions-and-defaults.csv", exception_headers, (r for r in exceptions if r[3].startswith("Omitted")))
    write_csv(csvdir / "v3-value-changes.csv", ["Object", "Source ID", "Target field", "Before", "After", "Technique"], ([r["object"], r["sourceId"], r["field"], json.dumps(r["before"], ensure_ascii=False), json.dumps(r["after"], ensure_ascii=False), r["technique"]] for r in latest["changes"]))
    write_csv(csvdir / "v3-user-results.csv", ["Source ID", "Status", "Member ID", "Technique"], ([r["sourceId"], r["status"], r["memberId"], r["technique"]] for r in latest["users"]))
    users, failed_users = [], []
    latest_users = {r["sourceId"]: r for r in latest["users"]}
    for row in source_by_object["User"]:
        sid = row["Id"]
        eligible = row.get("IsActive", "").lower() in ("true", "1", "yes") and row.get("UserType", "") in ("", "Standard")
        failed = ("User", sid) in failures
        err, detail = db_errors["user"][0] if failed else ("", "")
        if failed:
            assert row.get("Email", row.get("Username")) in detail
            failed_users.append(list(row.values()) + [err, detail])
        nu = latest_users[sid]
        users.append([sid, "failed" if failed else "eligible member present" if eligible else "filtered out", nu["status"], nu["technique"], err, detail])
    write_csv(csvdir / "user-comparison.csv", ["Source ID", "Old result", "Latest result", "Latest technique", "Old DB error", "Old DB error detail"], users)
    write_csv(csvdir / "v1-failed-source-records/User.csv", list(source_by_object["User"][0]) + ["Migration_database_error", "Migration_database_error_detail"], failed_users)
    summary = []
    for row in latest["summary"]:
        obj = row["object"]
        old_count = len(old_ids[obj])
        summary.append([obj, row["sourceRows"], old_count, row["sourceRows"] - old_count, row["inserted"] + row["existing"], row["superseded"], row["quarantined"] + row["failed"] + row["notAttempted"], generated[obj]])
    assert len(records) == 8529 and len(old_failed) == 6298 and omitted_rows == 405657
    assert sum(r[4] + r[5] + r[6] for r in summary) == len(records)
    assert sum(r[4] for r in summary) == 7668 and sum(r[5] for r in summary) == 861
    metrics = {"sourceBusinessRows": len(records), "oldInserted": sum(r[2] for r in summary), "oldFailed": len(old_failed),
               "newTransferred": sum(r[4] for r in summary), "newSuperseded": sum(r[5] for r in summary), "newFailed": sum(r[6] for r in summary),
               "generatedReplacementRows": sum(generated.values()), "unsupportedRecords": omitted_rows, "unsupportedObjects": len(objects),
               "populatedRecognizedFieldPairs": sum(r[3] > 0 for r in recognized_fields),
               "oldMappedUsedPopulatedFields": sum(r[4] for r in recognized_fields if r[3] > 0), "oldUnmappedPopulatedFields": len(old_unmapped),
               "newMappedUsedPopulatedFields": sum(r[7] for r in recognized_fields if r[3] > 0), "newUnmappedPopulatedFields": len(new_unmapped),
               "unmappedPopulatedValueCounts": value_counts}
    versions = []
    for name, status in [("v1-original", "Original code; historical run plus fresh isolated replay with failures"), ("v2-confirmed", "Committed baseline; historical successful run 25 Sep"), ("v3-latest", "Working-tree snapshot including converted-lead fix; fresh dry-run, commit and repeat")]:
        manifest = load(output / "versions" / name / "manifest.json")
        versions.append([name, manifest["gitCommit"], manifest["workingTreeSnapshot"], len(manifest["files"]), hashlib.sha256((output / "versions" / name / "manifest.json").read_bytes()).hexdigest(), status])
    old_report = {"reportKind": "normalized observed replay; not a native legacy report", "basis": "stored-ids.json + console.log; failure explanations from original historical field audit", "summary": [{"object": r[0], "sourceRows": r[1], "inserted": r[2], "failed": r[3]} for r in summary], "failedRecordCount": len(old_failed)}
    (output / "logs/v1-original-replay/normalized-report.json").write_text(json.dumps(old_report, indent=2))
    history_out = output / "logs/historical-20260925"
    history_out.mkdir(exist_ok=True)
    for src, name in [(history / "local-import.log", "v1-original.log"), (history / "confirmed-commit/migration-report.json", "v2-confirmed-report.json"), (history / "confirmed-database-verification.json", "v2-database-verification.json")]:
        shutil.copy2(src, history_out / name)
    # Confirm the historical report is bound to the preserved baseline helper bytes.
    for name, digest in confirmed["codeHashes"].items():
        archived = output / "versions/v2-confirmed/source/apps/web/db/import" / name
        assert hashlib.sha256(archived.read_bytes()).hexdigest() == digest, "Historical code hash mismatch: " + name
    payload = {"metrics": metrics, "summaryHeaders": ["Object", "Source rows", "Old inserted", "Old failed", "Latest transferred", "Latest superseded", "Latest failed / blocked", "Generated replacements"], "summary": summary,
               "fieldHeaders": field_headers, "fields": recognized_fields, "recordHeaders": record_headers, "records": records,
               "exceptionHeaders": exception_headers, "exceptions": exceptions, "unsupportedObjects": objects, "versions": versions,
               "sourceManifest": source_manifest, "verified": load(output / "logs/database-verification.json"), "failureCauses": old_audit["causes"], "users": users}
    (output / "comparison-data.json").write_text(json.dumps(payload, ensure_ascii=False))
    (output / "summary.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--workspace", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()
    build(args.workspace, args.out)
