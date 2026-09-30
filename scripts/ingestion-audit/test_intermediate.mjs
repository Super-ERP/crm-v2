import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {planMigration}=await import(pathToFileURL(path.resolve(process.argv[2],'source/apps/web/db/import/plan.ts')).href);
const src=rows=>({headers:[...new Set(rows.flatMap(Object.keys))],rows});
const options={tenantId:'test',entityCode:'QM',ctx:{resolveOwner:()=> 'member',resolveStage:()=>({pipelineId:'pipeline',stageId:'stage',code:'0e'}),warn:()=>{}}};
const fixture=()=>({
 Account:src([{Id:'a',Company_Name__c:'Acme'}]),
 Opportunity_ID__c:src([{Id:'o',Account_Name_c__c:'a',Opportunity_Year__c:'2026',Opportunity_Number__c:'1'}]),
 Opportunity:src([{Id:'f',Name:'Funnel',AccountId:'a',Opportunity__c:'o',StageName:'0E',SyncedQuoteId:'q'}]),
 Quote:src([{Id:'q',OpportunityId:'f',QuoteNumber:'Q1',Total_Excluding_Tax__c:'100',Total_Including_Tax__c:'100',Tax_Amount__c:'0'}]),
 QuoteLineItem:src([{Id:'l',QuoteId:'q',Quantity:'1',UnitPrice:'100',Description__c:'Service'}]),
 OpportunityLineItem:src([{Id:'old',OpportunityId:'f',Quantity:'1',UnitPrice:'999',TotalPrice:'999'}]),
});
let d=fixture(),p=planMigration(d,options);
assert.ok(p.records.every(r=>r.status==='ready'));
assert.equal(p.records.find(r=>r.sourceId==='old').values.total_price,999);
assert.equal(p.records.filter(r=>r.generated).length,0);
d=fixture();d.QuoteLineItem.rows.push({Id:'credit',QuoteId:'q',Quantity:'1',UnitPrice:'-10',Description__c:'Discount'});
p=planMigration(d,options);
assert.equal(p.records.find(r=>r.sourceId==='q').status,'quarantined');
assert.equal(p.records.find(r=>r.sourceId==='credit').values.unit_price,-10);
assert.equal(p.records.find(r=>r.sourceId==='l').status,'quarantined');
d=fixture();d.Account.rows.push({Id:'other',Company_Name__c:'Other'});d.Contact=src([{Id:'person',AccountId:'other',Name:'Person'}]);d.Quote.rows[0].ContactId='person';
p=planMigration(d,options);assert.ok(p.records.find(r=>r.sourceId==='q').issues.some(i=>i.startsWith('INTERMEDIATE_CONTACT_ACCOUNT_MISMATCH')));
d.Lead=src([{Id:'lead',Name:'Converted person',IsConverted:'true',ConvertedAccountId:'a',ConvertedContactId:'person'}]);
p=planMigration(d,options);assert.ok(p.records.find(r=>r.sourceId==='lead').issues.some(i=>i.startsWith('INTERMEDIATE_CONVERTED_CONTACT_MISMATCH')));
d=fixture();d.Quote.rows[0].OpportunityId='';p=planMigration(d,options);assert.equal(p.records.find(r=>r.sourceId==='q').status,'quarantined');
assert.throws(()=>planMigration(d,{...options,quoteFunnelOverrides:{q:{funnelId:'f',reason:'Reviewed'}}}),/does not support/);
console.log('Intermediate policy checks passed: basic mappings, raw products, negative-line rejection, contact mismatch and missing-parent rejection.');
