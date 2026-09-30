import fs from 'node:fs/promises';
import path from 'node:path';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const out=path.resolve(process.argv[2]);
const d=JSON.parse(await fs.readFile(path.join(out,'comparison-data.json'),'utf8'));
const w=Workbook.create(),views=[];
const letter=n=>String.fromCharCode(65+n);
function add(name,headers,rows,widths,note,height=42){
 const s=w.worksheets.add(name);s.showGridLines=false;
 const last=letter(headers.length-1),end=rows.length+4;
 s.getRange(`A1:${last}${end}`).format.font={name:'Arial',size:11};
 s.getRange(`A1:${last}${end}`).format.rowHeight=height;
 s.mergeCells(`A1:${last}1`);s.getRange('A1').values=[[name]];s.getRange('A1').format.font={size:18,bold:true,color:'#17364D'};
 s.mergeCells(`A2:${last}2`);s.getRange('A2').values=[[note]];s.getRange('A2').format.wrapText=true;s.getRange('A2').format.rowHeight=48;
 s.getRange('A4').write([headers,...rows.map(r=>r.map(v=>typeof v==='string'&&/^[=+@\-\t\r\n]/.test(v)?"'"+v:v))]);
 s.tables.add(`A4:${last}${end}`,true,name.replaceAll(' ','')+'Table');
 s.getRange(`A4:${last}4`).format={fill:'#17364D',font:{color:'#FFFFFF',bold:true},wrapText:true,rowHeight:60};
 s.getRange(`A5:${last}${end}`).format.wrapText=true;
 widths.forEach((x,i)=>s.getRange(`${letter(i)}:${letter(i)}`).format.columnWidth=x);
 s.freezePanes.freezeRows(4);s.freezePanes.freezeColumns(2);
 views.push([name,`A1:${last}${Math.min(end,9)}`]);return s;
}
const s=add('Version comparison',['Object','Source rows','Original success','Original DB failed','Intermediate success','Intermediate rejected','Intermediate DB failed','Latest transferred','Latest superseded','Latest failed'],d.summary,[27,13,16,17,19,19,18,18,18,15],
 'Created 29 September 2026 · New intermediate profile, not historical evidence · Actual isolated local import; identical source export.');
s.getRange('B5:J17').format.numberFormat='#,##0';s.getRange('A17').values=[['TOTAL']];s.getRange('B17:J17').formulas=[[...Array(9)].map((_,i)=>`=SUM(${letter(i+1)}5:${letter(i+1)}16)`)];s.getRange('A17:J17').format.fill='#DDEEF0';s.getRange('A17:J17').format.font.bold=true;
const notes=[['Actual result','7,980 successful + 549 validation rejections = 8,529 business source rows. No database failures.'],['Why rejected','3 converted leads, 161 quotations, and 385 dependent quotation lines. See Rejection causes and Rejected records.'],['Product difference','Intermediate keeps all 1,012 original product snapshots. Latest supersedes 861 and generates 1,159 replacements. Higher raw success does not mean better migration.'],['Readback','7,980 stored rows verified; 782 imported quotation totals matched source. Repeat import created zero new rows.'],['Error meaning','Rejections occur before SQL, so their messages are validation errors, not PostgreSQL errors. Original source rows with appended errors are in the CSV bundle.'],['Scope','Users separate: 15 existing memberships reused; 8 omitted. 405,657 unsupported export rows remain outside every version.']];
for(const [i,row] of notes.entries()){const n=i+20;s.getRange(`A${n}`).values=[[row[0]]];s.mergeCells(`B${n}:J${n}`);s.getRange(`B${n}`).values=[[row[1]]];s.getRange(`A${n}:J${n}`).format.wrapText=true;s.getRange(`A${n}:J${n}`).format.rowHeight=42;}
views[0]=['Version comparison','A1:J25'];
add('Rejected records',d.recordHeaders,d.rejected,[24,28,13,17,21,18,20,100],'All 549 source records rejected by intermediate validation. Exact message is appended in the final column; full original columns are in per-object CSVs.',78);
add('Rejection causes',['Object','Affected records','Exact validation error'],d.reasons,[28,20,120],'Counts group the full validation reason, including combined issues. Quotation-line parent failures inherit the rejected quotation.',70);
add('Field mapping',d.fieldHeaders,d.fields,[25,38,18,29,48,22,110],'Recognized objects only; mapped/used can mean derivation or validation. It does not promise unchanged value retention. See Field notes for omitted links.',80);
add('Field notes',['Object','Source ID','Fields','Technique / omission'],d.notes,[25,28,45,115],'Includes ordinary transformations and optional-field omissions. These notes are not additional record failures.',65);
add('Provenance',['Topic','Evidence / limitation'],d.provenance,[29,130],'Local sources: logs/commit/migration-report.json; comparison-data.json; snapshot manifest; previous original/latest audit package.',75);
w.recalculate();
await fs.mkdir(path.join(out,'previews'),{recursive:true});
const inspect=await w.inspect({kind:'table',range:'Version comparison!A17:J17',include:'values,formulas',tableMaxRows:1,tableMaxCols:10,maxChars:2500});
await fs.writeFile(path.join(out,'formula-inspection.ndjson'),inspect.ndjson??JSON.stringify(inspect));
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:2000});
await fs.writeFile(path.join(out,'formula-errors.ndjson'),errors.ndjson??JSON.stringify(errors));
for(const [sheetName,range] of views){const b=await w.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(path.join(out,'previews',sheetName+'.png'),new Uint8Array(await b.arrayBuffer()));console.log('Rendered '+sheetName);}
await(await SpreadsheetFile.exportXlsx(w)).save(path.join(out,'CRM-intermediate-ingestion.xlsx'));console.log('Workbook exported');
