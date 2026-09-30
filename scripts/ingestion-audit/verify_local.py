"""Read back the two isolated audit databases and verify the exported evidence."""
import argparse
import csv
import hashlib
import json
import subprocess
import uuid
from decimal import Decimal
from pathlib import Path


def identifier(version, obj, sid, tenant):
    key = ("crm-v2::import::" + obj + ":" + sid) if version == "old" else json.dumps(["salesforce-v2", tenant, obj, sid], separators=(",", ":"))
    raw = bytearray((hashlib.sha1 if version == "old" else hashlib.sha256)(key.encode()).digest()[:16])
    raw[6] = (raw[6] & 15) | 80
    raw[8] = (raw[8] & 63) | 128
    return str(uuid.UUID(bytes=bytes(raw)))


def verify(workspace, out):
    workspace, out = Path(workspace), Path(out)
    mappings = json.loads((workspace / "import-audit-20260925/mappings.json").read_text())
    report = json.loads((out / "logs/v3-latest-commit/migration-report.json").read_text())
    def query(db, sql):
        return json.loads(subprocess.check_output(["docker", "exec", "crm-import-audit-20260925", "psql", "-U", "postgres", "-d", db, "-Atc", sql], text=True))
    old = {m["object"]: query("crm_version_old_20260929", f"select coalesce(json_agg(id),'[]') from {m['table']}") for m in mappings}
    (out / "logs/v1-original-replay/stored-ids.json").write_text(json.dumps(old, indent=2))
    checks = {"tenant": report["tenant"], "oldStoredRows": sum(map(len, old.values()))}
    tables = {m["object"]: query("crm_version_latest_20260929", f"select coalesce(json_agg(row_to_json(t)),'[]') from (select * from {m['table']}) t") for m in mappings}
    def source(obj):
        with (workspace / "Full Data" / (obj + ".csv")).open(encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))
    def mid(obj, sid):
        return identifier("new", obj, sid, report["tenant"])
    quotes = {r["id"]: r for r in tables["Quote"]}
    errors = []
    for s in source("Quote"):
        r = quotes[mid("Quote", s["Id"])]
        for field, value in [("Total_Excluding_Tax__c", Decimal(str(r["subtotal"])) - Decimal(str(r["discount_total"]))),
                             ("Tax_Amount__c", Decimal(str(r["tax_total"]))), ("Total_Including_Tax__c", Decimal(str(r["total"])) )]:
            if s.get(field) and Decimal(s[field]) != value:
                errors.append({"sourceId": s["Id"], "field": field, "source": s[field], "stored": str(value)})
    leads = {r["id"]: r for r in tables["Lead"]}
    contacts = {r["Id"]: r for r in source("Contact")}
    lead_errors, counts = [], {"converted": 0, "accountLinks": 0, "contactLinks": 0, "crossAccountContactOmissions": 0}
    for s in source("Lead"):
        if s.get("IsConverted", "").lower() != "true":
            continue
        counts["converted"] += 1
        r = leads[mid("Lead", s["Id"])]
        a, c = s.get("ConvertedAccountId"), s.get("ConvertedContactId")
        expected_a = mid("Account", a) if a else None
        incompatible = bool(a and c and contacts[c]["AccountId"] != a)
        expected_c = mid("Contact", c) if c and not incompatible else None
        counts["accountLinks"] += bool(r["converted_account_id"])
        counts["contactLinks"] += bool(r["converted_person_id"])
        counts["crossAccountContactOmissions"] += incompatible
        if r["converted_account_id"] != expected_a or r["converted_person_id"] != expected_c or r["status"] != "converted":
            lead_errors.append(s["Id"])
    checks.update(quoteTotalsChecked=len(quotes), quoteTotalErrors=errors, convertedLeadCounts=counts,
                  convertedLeadErrors=lead_errors, newStoredRows=sum(map(len, tables.values())),
                  newTableCounts={k: len(v) for k, v in tables.items()})
    expected = {s["object"]: s["inserted"] + s["existing"] + sum(1 for r in report["generatedRecords"] if r["object"] == s["object"] and r["verified"]) for s in report["summary"]}
    checks["tableCountErrors"] = [k for k, n in expected.items() if len(tables[k]) != n]
    checks["allPassed"] = not errors and not lead_errors and not checks["tableCountErrors"] and checks["oldStoredRows"] == 2231
    (out / "logs/database-verification.json").write_text(json.dumps(checks, indent=2) + "\n")
    assert checks["allPassed"], checks
    print(json.dumps(checks, indent=2))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--workspace", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()
    verify(args.workspace, args.out)
