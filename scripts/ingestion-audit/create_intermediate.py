"""Create a new, explicitly reconstructed intermediate profile; never alter history."""
import argparse
import difflib
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


def create(base, out):
    base, out = Path(base), Path(out)
    if out.exists():
        raise FileExistsError(out)
    shutil.copytree(base, out, ignore=shutil.ignore_patterns('node_modules', '__pycache__'))
    path = out / 'source/apps/web/db/import/plan.ts'
    original = path.read_text()
    code = original
    def replace(start, end, replacement):
        nonlocal code
        a = code.index(start)
        b = code.index(end, a)
        code = code[:a] + replacement + code[b:]
    replace('  for(const [sourceId,override]', '  const normalizePrecision=',
            '  if(Object.keys(options.quoteFunnelOverrides??{}).length)throw new Error("Intermediate profile does not support missing-parent overrides")\n\n')
    replace('      for(const l of lines){', '      headerDiscount=money(headerDiscount)',
            '      // Intermediate: source prices are validated directly; no negative-line repair.\n')
    replace('  // Infer only a unique end user', '  for(const quote of group("Quote")) {',
            '  // Intermediate: no reseller end-user inference from quotation contacts.\n')
    old='if(person&&person.values.account_id!==recipient) {change(quote,"attention_contact_id",null,"Omitted contact outside recipient account, matching manual recipient validation");note(quote,"ContactId","Attention contact omitted: belongs to a different recipient account")}'
    assert old in code
    code=code.replace(old, 'if(person&&person.values.account_id!==recipient) quarantine(quote,"INTERMEDIATE_CONTACT_ACCOUNT_MISMATCH: quotation contact belongs to a different recipient account; automatic omission/end-user inference unavailable")')
    replace('    const candidates=label?group("Quote")', '    if(!milestone.values.funnel_id)',
            '    if(label)note(milestone,"Quote_Name_Lookup__c; Quote_Number__c","Intermediate profile does not resolve quotation names/references; optional quotation link omitted")\n')
    # Validate converted contacts before required-parent propagation.
    replace('  for(const lead of group("Lead").filter', '  for(const [funnelId,quotes] of quoteGroups)', '')
    marker='  // Required relationships are a fixed-point validation:'
    code=code.replace(marker, '''  for(const lead of group("Lead").filter(r=>r.status==="ready"&&r.values.status==="converted")){
    const accountId=original(lead).ConvertedAccountId
    const person=target(lead,"converted_person_id")
    if(accountId&&person&&person.values.account_id!==ctx.detId("Account",accountId))
      quarantine(lead,"INTERMEDIATE_CONVERTED_CONTACT_MISMATCH: converted contact belongs to another account; automatic optional-link repair unavailable")
  }
''' + marker)
    replace('  for(const f of group("Opportunity").filter(r=>r.status==="ready"&&r.values.primary_quotation_id)){',
            '  normalizePrecision()\n  const rates=',
            '  // Intermediate: preserve original OpportunityLineItem snapshots; no superseding or generated replacement products.\n')
    code=code.replace('import { projectQuoteProduct } from "../../server/services/quote-sync-projection"\n','')
    # Field reports must describe the actual intermediate behavior.
    code=code.replace('Infer end user only from one unique different account of quotation contacts; ambiguous/missing end user remains null and is reported.', 'No end-user inference in intermediate profile; end-user link remains unset.')
    code=code.replace('Keep the contact only when its AccountId matches ConvertedAccountId; otherwise preserve the account link, omit the incompatible optional contact link, and report the reason.', 'Quarantine converted leads when Contact.AccountId differs from ConvertedAccountId; no automatic optional-contact repair.')
    code=code.replace('Use source funnel ID, or an explicit data-owner-approved missing-parent override. Validate the target and log the decision; child lines retain their original QuoteId and follow automatically.', 'Use source funnel ID only. Missing parents quarantine quotations and their child lines; approved overrides are unsupported in this profile.')
    code=code.replace('Negative adjustment lines become header discounts and zero-value descriptive lines.', 'Negative adjustment lines are rejected by the numeric validator; no header-discount workaround.')
    code=code.replace('Keep only contacts belonging to the recipient account (including a uniquely resolved reseller end user); otherwise omit this optional link and report it.', 'Require quotation contacts to belong to the recipient account. Quarantine mismatches; no contact omission or reseller end-user inference.')
    code=code.replace('For funnels with a valid primary quote, supersede the old snapshot and rebuild products using the same projection as manual quote sync. Otherwise preserve the historical source snapshot. Superseded source fields are not claimed as transferred.', 'Preserve original historical product snapshots. No primary-quotation projection, superseding, or generated replacement products; snapshots may differ from quotation products.')
    code=code.replace('Resolve exact quote ID/reference/name within the source funnel only when unique. Ambiguous names are omitted; missing funnel IDs are not guessed.', 'Do not resolve quotation names/references in this profile; optional quotation link remains unset. Missing funnel IDs are not guessed.')
    path.write_text('// Reconstructed intermediate profile created 2026-09-29; not a historical release.\n'+code)
    (out/'changes.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),path.read_text().splitlines(True),fromfile='latest/plan.ts',tofile='intermediate/plan.ts')))
    manifest=json.loads((out/'manifest.json').read_text())
    manifest.update(snapshot=out.name,createdAt=datetime.now(timezone.utc).isoformat(),reconstructed=True,
                    derivedFrom=base.name,baseManifestSha256=hashlib.sha256((base/'manifest.json').read_bytes()).hexdigest(),
                    description='New intermediate profile, not historical evidence; basic fixes without later relationship and product-line recovery')
    manifest['files']={str(p.relative_to(out/'source')):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((out/'source').rglob('*')) if p.is_file()}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'snapshot':out.name,'reconstructed':True,'files':len(manifest['files'])}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--out',required=True)
    a=p.parse_args();create(a.base,a.out)
