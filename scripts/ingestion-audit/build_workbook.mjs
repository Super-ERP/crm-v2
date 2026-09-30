import fs from 'node:fs/promises';
import path from 'node:path';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';
const out=path.resolve(process.argv[2] || '.');
const d=JSON.parse(await fs.readFile(path.join(out,'comparison-data.json'),'utf8'));
const wb=Workbook.create(); const previews=[];
const col=n=>String.fromCharCode(65+n);
function sheet(name,headers,rows,widths,note){
 const s=wb.worksheets.add(name);s.showGridLines=false;
 const last=col(headers.length-1), end=rows.length+4;
 s.getRange(`A1:${last}${end}`).format.font={name:'Arial',size:10};
 s.getRange(`A1:${last}${end}`).format.rowHeight=30;
 s.mergeCells(`A1:${last}1`);s.getRange('A1').values=[[name]];s.getRange('A1').format.font={size:17,bold:true,color:'#17364D'};
 s.mergeCells(`A2:${last}2`);s.getRange('A2').values=[[note]];s.getRange(`A2:${last}2`).format.wrapText=true;s.getRange('A2').format.rowHeight=42;
 s.getRange('A4').write([headers,...rows.map(r=>r.map(v=>typeof v==='string' && /^[=+@\-\t\r\n]/.test(v)?"'"+v:v))]);
 s.tables.add(`A4:${last}${end}`,true,name.replaceAll(' ','')+'Table');
 s.getRange(`A4:${last}4`).format={fill:'#17364D',font:{color:'#FFFFFF',bold:true},wrapText:true,rowHeight:42};
 s.getRange(`A5:${last}${end}`).format.wrapText=true;
 widths.forEach((w,i)=>s.getRange(`${col(i)}:${col(i)}`).format.columnWidth=w);
 s.freezePanes.freezeRows(4);s.freezePanes.freezeColumns(2);
 if (['Record results','Old failures','Field notes','Users','Versions'].includes(name)) s.getRange(`A5:${last}${end}`).format.rowHeight=90;
 previews.push([name,`A1:${last}9`]); return s;
}
const s=sheet('Comparison',d.summaryHeaders,d.summary,[29,15,15,15,18,18,19,19],'29 September 2026 · Same full source export · Isolated local tenant: import-audit · Business rows only; users shown separately.');
s.getRange('B5:H17').format.numberFormat='#,##0';
s.getRange('A17').values=[['TOTAL']];s.getRange('B17:H17').formulas=[[...Array(7)].map((_,i)=>`=SUM(${col(i+1)}5:${col(i+1)}16)`)];s.getRange('A17:H17').format.fill='#DDEEF0';s.getRange('A17:H17').format.font.bold=true;
const notes=[
['Record interpretation','Old: 2,231 inserted / 6,298 failed. Latest: 7,668 transferred / 861 superseded / 0 failed.'],
['Replacement technique','861 older OpportunityLineItem snapshots were not copied. Latest generated 1,159 replacement rows from quotation data.'],
['Stored latest rows','8,827 = 7,668 transferred source rows + 1,159 generated rows. Superseded records are not failures.'],
['Field coverage','603 populated object-field pairs: old 134 mapped/used, 469 unmapped; latest 220 mapped/used, 383 unmapped.'],
['Mapping meaning','Mapped/used includes identity, validation and derivation; it does not mean every original value was copied unchanged.'],
['Outside both importers','405,657 rows across 1,101 unsupported objects (308 populated). Includes Salesforce logs/configuration; excluded from business failures.'],
['Users, separately','23 source users: old 14 eligible members present, 1 failed, 8 filtered; latest 15 reused memberships, 8 omitted.'],
['Local verification','All 943 quotation totals matched; 201 converted-account links and 196 converted-contact links; 3 cross-account contacts deliberately omitted.'],
['Repeat verification','Latest repeat: 0 new inserts, 7,668 existing source records, 861 superseded, 0 failures.'],
['Error provenance','Full old database errors come from the 29 Sep replay of unchanged original code; original 25 Sep log is retained separately.'],
['Failed original rows','CSV bundle: v1-failed-source-records contains original columns followed by diagnosis, database error and database detail.'],
['Evidence','See Versions, logs/database-verification.json, each run.json, snapshot manifests and CSV detail ledgers.']];
notes.forEach((r,i)=>{let n=20+i;s.getRange(`A${n}`).values=[[r[0]]];s.mergeCells(`B${n}:H${n}`);s.getRange(`B${n}`).values=[[r[1]]];s.getRange(`A${n}:H${n}`).format.wrapText=true;s.getRange(`A${n}:H${n}`).format.rowHeight=34;});
previews[0]=['Comparison','A1:H31'];
sheet('Record results',d.recordHeaders,d.records,[25,27,13,15,30,65,17,55,17,70,95],'8,529 business source records. Filter Old result = failed. Exact replay database error and detail are the final two columns.');
sheet('Old failures',d.recordHeaders,d.records.filter(r=>r[3]==='failed'),[25,27,13,15,30,65,17,55,17,70,95],'6,298 failed business records. For every original source column plus appended errors, use the per-object CSV files. User failure is in Users.');
sheet('Field mapping',d.fieldHeaders,d.fields,[25,35,14,14,14,24,45,14,24,45,16,75],'697 fields across the 13 recognized objects, including empty fields. 1 = mapped/used; 0 = unmapped. See notes for per-record omissions.');
sheet('Field notes',d.exceptionHeaders,d.exceptions,[25,27,40,32,105],'2,370 notes include ordinary transformations, deliberate replacements and omissions. These are not all failures.');
sheet('Unsupported objects',['Object','Source rows','Fields','Reason','Source file'],d.unsupportedObjects,[45,17,15,70,50],'Objects outside both importers. CSV bundle includes all 405,657 affected record identifiers and all populated unsupported fields.');
sheet('Users',['Source ID','Old result','Latest result','Latest technique','Old database error','Old database detail'],d.users,[29,30,22,80,80,95],'Separate from business-record totals. Audit targets retained seeded memberships; reused users are not new user insertions.');
sheet('Versions',['Version','Commit / HEAD','Working-tree snapshot','Files','Manifest SHA256','Evidence'],d.versions,[25,58,22,12,80,100],'v1 = original code; v2 = committed historical baseline; v3 = latest uncommitted working-tree snapshot. Full source files and manifests included.');
sheet('Source manifest',['Object','Source rows','SHA256','Source file'],d.sourceManifest,[45,18,85,80],'1,114 source CSVs / 414,209 source rows. Source hashes match historical confirmed report and current replay. Original CSVs are unchanged.');
wb.recalculate();
await fs.mkdir(path.join(out,'previews'),{recursive:true});
await fs.writeFile(path.join(out,'workbook-inspection.json'),JSON.stringify(await wb.inspect({kind:'region',sheetId:'Comparison',range:'A17:H17',maxChars:3000})));
for(const [name,range] of previews){const b=await wb.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(path.join(out,'previews',name+'.png'),new Uint8Array(await b.arrayBuffer()));console.log('Rendered '+name);}
await fs.writeFile(path.join(out,'formula-check.json'),JSON.stringify(await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:3000})));
await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,'CRM-ingestion-old-vs-latest.xlsx'));console.log('Workbook exported');
