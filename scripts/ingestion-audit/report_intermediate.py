"""Verify an isolated intermediate import and export honest three-version evidence."""
import csv
import hashlib
import json
import subprocess
from collections import Counter
from decimal import Decimal
from pathlib import Path
from build_comparison import write_csv
from verify_local import identifier

workspace=Path(__file__).resolve().parents[3]
out=workspace/'outputs/ingestion-intermediate-20260929'
previous=workspace/'outputs/ingestion-versions-20260929'
load=lambda p:json.loads(p.read_text())
r=load(out/'logs/commit/migration-report.json')
repeat=load(out/'logs/repeat/migration-report.json')
base=load(previous/'comparison-data.json')
assert r['committed'] and not r['rolledBack']
assert repeat['committed'] and sum(x['inserted'] for x in repeat['summary'])==0
assert sum(x['failed']+x['notAttempted'] for x in r['summary'])==0
assert all(not x.get('generated') for x in r['outcomes'])
latest_inventory={i['object']:i['sha256'] for i in load(previous/'logs/v3-latest-commit/migration-report.json')['inventory']}
for i in r['inventory']:
    assert i['sha256']==latest_inventory[i['object']]==hashlib.sha256((workspace/'Full Data'/f"{i['object']}.csv").read_bytes()).hexdigest()

mappings=load(workspace/'import-audit-20260925/mappings.json')
def query(sql):
    return json.loads(subprocess.check_output(['docker','exec','crm-import-audit-20260925','psql','-U','postgres','-d','crm_version_intermediate_20260929','-Atc',sql],text=True))
tables={m['object']:query(f"select coalesce(json_agg(row_to_json(t)), '[]') from (select * from {m['table']} where tenant_id='import-audit') t") for m in mappings}
outcomes={(o['object'],o['sourceId']):o for o in r['outcomes']}
checks={'database':'crm_version_intermediate_20260929','tableCounts':{},'sourceHashesMatched':len(r['inventory']),'repeatedInserts':0,'quoteTotalsChecked':0}
for s in r['summary']:
    actual={x['id'] for x in tables[s['object']]}
    expected={identifier('new',o['object'],o['sourceId'],'import-audit') for o in r['outcomes'] if o['object']==s['object'] and o['status'] in ('inserted','existing')}
    assert actual==expected,s['object']
    checks['tableCounts'][s['object']]=len(actual)
summary=[]
for old in base['summary']:
    s=next(s for s in r['summary'] if s['object']==old[0])
    summary.append([old[0],old[1],old[2],old[3],s['inserted'],s['quarantined'],s['failed'],old[4],old[5],old[6]])
old_records={(x[0],x[1]):x for x in base['records']}
records=[]; rejected=[];source_rows={}
for m in mappings:
    obj=m['object']
    with (workspace/'Full Data'/f'{obj}.csv').open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);headers=reader.fieldnames;rows=list(reader)
    source_rows[obj]={x['Id']:x for x in rows}
    failed_raw=[]
    for n,row in enumerate(rows,1):
        o=outcomes[obj,row['Id']];old=old_records[obj,row['Id']]
        record=[obj,row['Id'],n,old[3],o['status'],old[6],bool(o.get('verified')),o['reason']]
        records.append(record)
        if o['status'] not in ('inserted','existing'):
            rejected.append(record)
            failed_raw.append([row.get(h,'') for h in headers]+[o['status'],'Validation rejection before SQL',o['reason']])
    if failed_raw:write_csv(out/'csv/rejected-original-records'/f'{obj}.csv',headers+['Migration_status','Migration_error_type','Migration_error_message'],failed_raw)
for q in tables['Quote']:
    original=next(x for x in source_rows['Quote'].values() if identifier('new','Quote',x['Id'],'import-audit')==q['id'])
    for field,value in [('Total_Excluding_Tax__c',Decimal(str(q['subtotal']))-Decimal(str(q['discount_total']))),('Tax_Amount__c',Decimal(str(q['tax_total']))),('Total_Including_Tax__c',Decimal(str(q['total'])))]:
        if original.get(field):assert Decimal(original[field])==value,(original['Id'],field)
    checks['quoteTotalsChecked']+=1
checks['storedBusinessRows']=sum(checks['tableCounts'].values())
checks['rejectedAbsentFromDatabase']=len(rejected)
checks['allPassed']=True
(out/'logs/database-verification.json').write_text(json.dumps(checks,indent=2))
headers=['Object','Source ID','CSV record number','Original result','Intermediate result','Latest result','Intermediate readback verified','Intermediate error message']
write_csv(out/'csv/record-comparison.csv',headers,records)
write_csv(out/'csv/validation-rejections.csv',headers,rejected)
write_csv(out/'csv/database-failures.csv',headers,[x for x in rejected if x[4]=='failed'])
reasons=Counter((x[0],x[-1]) for x in rejected)
reason_rows=[[a,n,b] for (a,b),n in reasons.items()]
write_csv(out/'csv/rejection-reasons.csv',['Object','Affected records','Exact validation error'],reason_rows)
recognized={m['object'] for m in mappings}|{'User'}
fields=[[f['object'],f['field'],f['populated'],f['disposition'],f['target'],f['verifiedRecordRows'],f['technique']] for f in r['fields'] if f['object'] in recognized]
fh=['Object','Source field','Populated values','Disposition','Target / usage','Verified record rows using field','Technique / limitation']
write_csv(out/'csv/field-mapping.csv',fh,fields)
write_csv(out/'csv/unmapped-populated-fields.csv',fh,[x for x in fields if x[2] and x[3].startswith('omitted')])
notes=[[x['object'],x['sourceId'],x['fields'],x['technique']] for x in r['exceptions']]
write_csv(out/'csv/field-notes.csv',['Object','Source ID','Fields','Technique / omission'],notes)
write_csv(out/'csv/users.csv',['Source ID','Status','Member ID','Technique'],[[x['sourceId'],x['status'],x['memberId'],x['technique']] for x in r['users']])
payload={'summary':summary,'records':records,'rejected':rejected,'recordHeaders':headers,'reasons':reason_rows,'fields':fields,'fieldHeaders':fh,'notes':notes,'checks':checks,
         'metrics':{'successful':checks['storedBusinessRows'],'validationRejected':len(rejected),'databaseFailed':0,'superseded':0,'sourceBusinessRows':len(records)},
         'provenance':[['Created','2026-09-29; reconstructed intermediate profile, not a historical release'],['Base','Preserved v3-latest working-tree snapshot; see versions/intermediate-basic-fixes/manifest.json and changes.patch'],['Source','Same 1,114 CSV hashes as original/latest comparison; 414,209 total source rows'],['Scope','8,529 business source rows; 23 users separately; 405,657 unsupported rows outside all versions'],['Errors','549 actual planner validation rejections, before SQL. No invented PostgreSQL errors.'],['Product-line difference','Intermediate retains all 1,012 historical product snapshots; latest supersedes 861 and generates 1,159 replacement rows. Raw success counts are not a quality ranking.'],['Exclusions','No missing-parent overrides, reseller end-user inference, incompatible-contact omission, milestone quote-name resolution, negative-line conversion, or primary-quote product projection'],['Retained','Basic mapping fixes, direct valid links, quotation totals/numbering, ordinary primary-quote selection, taxonomy, explicit optional cleanup for rejected targets, transactional SQL/readback validation'],['Logs','logs/dry-run, logs/commit, logs/repeat, logs/database-verification.json'],['CSV errors','csv/rejected-original-records retains source columns, then status, error type and exact error message. Formula-leading text is apostrophe-escaped; source files are unchanged.'],['Users','15 existing memberships reused; 8 omitted. Not counted in the business totals.'],['Historical packages','../ingestion-versions-20260929 contains unchanged original and latest scripts, logs and Excel.']]}
(out/'comparison-data.json').write_text(json.dumps(payload,indent=2))
(out/'summary.json').write_text(json.dumps(payload['metrics'],indent=2))
print(json.dumps({'metrics':payload['metrics'],'verification':checks,'reasons':reason_rows},indent=2))
