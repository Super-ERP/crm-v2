import "dotenv/config"
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createHash } from "node:crypto"
import postgres from "postgres"
import { parseCsv } from "./csv"
import { MAPPINGS, stageCode } from "./mapping"
import { migrationId, planMigration, references, TECHNIQUES, type Dataset, type PlannedRecord } from "./plan"
import { activeRecordOwnerIds } from "./active-record-owners"

type Column = { table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null; numeric_scale: number | null }
type Outcome = { object: string; sourceId: string; status: "inserted" | "existing" | "quarantined" | "failed" | "not_attempted" | "superseded"; reason: string; generated?: boolean; verified?: boolean }
type UserOutcome = { sourceId: string; status: string; memberId: string | null; technique: string }
type Inventory = { object: string; rows: number; headers: string[]; populated: Record<string,number>; sha256: string }
class Rollback extends Error {}

/** Compare database representations, not JS string-vs-number encodings. */
export function storedValueMatches(expected: unknown, actual: unknown, type: string): boolean {
  if(expected==null||actual==null)return expected==null&&actual==null
  if(["numeric","integer","bigint","smallint","double precision","real"].includes(type))return Number(expected)===Number(actual)
  if(type.startsWith("timestamp"))return new Date(String(expected)).getTime()===new Date(String(actual)).getTime()
  if(type==="date")return String(expected).slice(0,10)===(actual instanceof Date?actual.toISOString():String(actual)).slice(0,10)
  if(type==="jsonb"||type==="json")return JSON.stringify(expected)===JSON.stringify(actual)
  return String(expected)===String(actual)
}
export async function runImport(args=process.argv.slice(2)) {
  const flag=(name:string,fallback="")=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback
  const tenant=flag("tenant"),directory=resolve(flag("dir","./import-data")),out=resolve(flag("report-dir","./migration-report"))
  const commit=args.includes("--commit"),roleName=flag("user-role","Rep")
  if(!tenant)throw new Error("Missing --tenant=<existing organization id>")
  const url=process.env.DATABASE_ADMIN_URL??process.env.DATABASE_URL
  if(!url)throw new Error("DATABASE_ADMIN_URL is required; no implicit database fallback")
  if(out===directory||out.startsWith(directory+"/"))throw new Error("Report directory must be outside source data")
  const dataset:Dataset={},inventory:Inventory[]=[]
  const recognized=new Set([...MAPPINGS.map(m=>m.object),"User"])
  for(const file of readdirSync(directory).filter(f=>f.toLowerCase().endsWith(".csv")).sort()){
    const raw=readFileSync(join(directory,file),"utf8"),parsed=parseCsv(raw),name=file.slice(0,-4)
    const object=[...recognized].find(o=>o.toLowerCase()===name.toLowerCase())??name
    if(inventory.some(i=>i.object.toLowerCase()===object.toLowerCase()))throw new Error(`Duplicate object file: ${object}`)
    const populated:Record<string,number>={}
    for(const h of parsed.headers)populated[h]=parsed.rows.filter(r=>Boolean(r[h])).length
    inventory.push({object,rows:parsed.rows.length,headers:parsed.headers,populated,sha256:createHash("sha256").update(raw).digest("hex")})
    if(recognized.has(object)){
      const ids=new Set<string>()
      for(const row of parsed.rows){if(!row.Id||ids.has(row.Id))throw new Error(`Missing/duplicate source Id in ${object}: ${row.Id}`);ids.add(row.Id)}
      dataset[object]=parsed
    }
  }
  const overrideFile=flag("quote-funnel-map")
  const overrideRaw=overrideFile?readFileSync(resolve(overrideFile),"utf8"):null
  const quoteFunnelOverrides=overrideRaw?JSON.parse(overrideRaw) as NonNullable<Parameters<typeof planMigration>[1]["quoteFunnelOverrides"]>:{}
  mkdirSync(out,{recursive:true})
  const sql=postgres(url,{max:1,onnotice:()=>{}})
  const outcomes:Outcome[]=[],users:UserOutcome[]=[],ownerFallbacks:{sourceUser:string;memberId:string;uses:number}[]=[]
  let plan:ReturnType<typeof planMigration>|undefined,rolledBack=false,committed=false
  let columns:Column[]=[]
  const generated:{table:string;count:number;technique:string}[]=[]
  try {
    await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(hashtext(${'salesforce-import:'+tenant}))`
      const [settings]=await tx`select * from tenant_settings where organization_id=${tenant}`
      if(!settings)throw new Error("Target tenant must be created and seeded before import")
      const [pipeline]=await tx`select id from pipelines where tenant_id=${tenant} and is_default=true`
      if(!pipeline)throw new Error("Target tenant needs a default pipeline")
      const stages=await tx`select id,code from pipeline_stages where pipeline_id=${pipeline.id}`
      const [role]=await tx`select id,default_tier_level from roles where tenant_id=${tenant} and name=${roleName}`
      if(!role)throw new Error(`Unknown target role: ${roleName}`)
      const [fallback]=await tx`select m.id from member m join membership_profiles p on p.member_id=m.id where m.organization_id=${tenant} and p.status='active' order by p.created_at limit 1`
      const defaultOwner=flag("owner",fallback?.id??"")
      if(!defaultOwner)throw new Error("An active default owner is required")
      const validMembers=await tx`select id from member where organization_id=${tenant}`
      if(!validMembers.some(m=>m.id===defaultOwner))throw new Error("Default owner must belong to target tenant")
      const ownerMap=new Map<string,string>()
      const activeOwners=activeRecordOwnerIds(dataset)
      const userRows=[...(dataset.User?.rows??[])].sort((a,b)=>a.Id.localeCompare(b.Id))
      for(const r of userRows){
        if(!/^(true|1|yes)$/i.test(r.IsActive||"")||(r.UserType&&r.UserType!=="Standard")){
          users.push({sourceId:r.Id,status:"omitted",memberId:null,technique:"Inactive/non-Standard user: no login or role created; owned records use explicit map or default owner"});continue
        }
        if(!activeOwners.has(r.Id)){
          users.push({sourceId:r.Id,status:"omitted",memberId:null,technique:"No retained owned CRM records; no login or role created"});continue
        }
        const email=(r.Email||r.Username||"").trim().toLowerCase()
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){users.push({sourceId:r.Id,status:"omitted",memberId:null,technique:"Invalid or missing email; no fabricated email/login"});continue}
        const [existingUser]=await tx`select id from ${tx("user")} where lower(email)=${email}`
        const uid=existingUser?.id??migrationId("global-email","User",email)
        if(!existingUser)await tx`insert into ${tx("user")} ${tx({id:uid,name:[r.FirstName,r.LastName].filter(Boolean).join(" ")||email,email,email_verified:false,is_superadmin:false})}`
        const [existingMember]=await tx`select id from member where organization_id=${tenant} and user_id=${uid}`
        const mid=existingMember?.id??migrationId(tenant,"Member",email)
        if(!existingMember){
          await tx`insert into member ${tx({id:mid,organization_id:tenant,user_id:uid,role:"member",created_at:new Date()})}`
          await tx`insert into membership_profiles ${tx({id:migrationId(tenant,"Profile",email),tenant_id:tenant,member_id:mid,role_id:role.id,tier_level:role.default_tier_level,status:"active"})}`
          await tx`insert into member_roles ${tx({id:migrationId(tenant,"MemberRole",email),tenant_id:tenant,member_id:mid,role_id:role.id})}`
        }
        ownerMap.set(r.Id,mid)
        users.push({sourceId:r.Id,status:existingMember?"reused":"created",memberId:mid,technique:existingMember?"Match normalized email; reuse tenant membership, preserving existing permissions":`Create membership with explicit ${roleName} role; no password imported, email not marked verified`})
      }
      const mapFile=flag("owner-map")
      if(mapFile){const entries=JSON.parse(readFileSync(resolve(mapFile),"utf8")) as Record<string,string>
        const members=await tx`select id from member where organization_id=${tenant}`
        for(const [sf,mid] of Object.entries(entries)){if(!members.some(m=>m.id===mid))throw new Error(`Owner map target outside tenant: ${sf}`);ownerMap.set(sf,mid)}
      }
      const created=new Set(users.filter(u=>u.status==="created").map(u=>u.memberId))
      for(const mid of created){const managers=[...new Set(userRows.filter(r=>ownerMap.get(r.Id)===mid&&r.ManagerId).map(r=>ownerMap.get(r.ManagerId)).filter((x):x is string=>Boolean(x)&&x!==mid))]
        if(managers.length===1)await tx`update membership_profiles set manager_member_id=${managers[0]} where tenant_id=${tenant} and member_id=${mid!}`
      }
      const fallbackCounts=new Map<string,number>()
      columns=await tx<Column[]>`select table_name,column_name,data_type,is_nullable,column_default,numeric_scale from information_schema.columns where table_schema='public'`
      const numericScales:Record<string,Record<string,number>>={}
      for(const c of columns)if(c.data_type==="numeric"&&c.numeric_scale!=null)(numericScales[c.table_name]??={})[c.column_name]=c.numeric_scale
      plan=planMigration(dataset,{tenantId:tenant,entityCode:settings.entity_code,quoteFunnelOverrides,numericScales,taxonomy:settings.product_codes,ctx:{
        resolveOwner:sf=>{if(ownerMap.has(sf))return ownerMap.get(sf)!;fallbackCounts.set(sf,(fallbackCounts.get(sf)??0)+1);return defaultOwner},
        resolveStage:label=>{const code=stageCode(label);const stage=stages.find(s=>s.code===code);return stage?{pipelineId:pipeline.id,stageId:stage.id,code}:null},warn:()=>{},
      }})
      for(const [sourceUser,uses] of fallbackCounts)ownerFallbacks.push({sourceUser,memberId:defaultOwner,uses})
      const columnMaps=new Map(MAPPINGS.map(m=>[m.table,new Map(columns.filter(c=>c.table_name===m.table).map(c=>[c.column_name,c]))]))
      const cols=(table:string)=>columnMaps.get(table)!
      for(const record of plan.records)for(const field of Object.keys(record.values))if(!cols(record.table).has(field)){
        delete record.values[field];plan.notes.push({object:record.object,sourceId:record.sourceId,fields:field,technique:"Target field is unavailable; deliberately omitted"})
      }
      const currencies=[...new Set([...(settings.currencies as string[]??[]),...plan.records.map(r=>r.values.currency).filter((c):c is string=>typeof c==="string"&&/^[A-Z]{3}$/.test(c))])]
      const natureMap=new Map<string,unknown>((settings.product_types as {code:string}[]??[]).map(n=>[n.code,n]))
      for(const n of plan.natures)if(!natureMap.has(n.code))natureMap.set(n.code,n)
      await tx`update tenant_settings set currencies=${tx.json(currencies)},product_codes=${tx.json(plan.taxonomy)},product_types=${tx.json([...natureMap.values()] as postgres.JSONValue[])},quote_next_number=greatest(quote_next_number,${plan.nextQuoteNumber}) where organization_id=${tenant}`
      for(const rate of plan.rates)await tx`insert into tax_settings ${tx({id:migrationId(tenant,"TaxRate",String(rate)),tenant_id:tenant,name:`Imported tax ${rate}%`,rate_percent:rate,is_default:false,is_active:true})} on conflict(id) do nothing`
      generated.push({table:"tax_settings",count:plan.rates.length,technique:"One tax setting per actual source rate; settings default unchanged"})
      const deferred:{record:PlannedRecord;values:Record<string,unknown>}[]=[]
      for(const record of plan.records){
        if(record.status==="quarantined"||record.status==="superseded"){outcomes.push({object:record.object,sourceId:record.sourceId,status:record.status,reason:record.issues.join("; ")});continue}
        const mapping=MAPPINGS.find(m=>m.object===record.object)!
        const defer=new Set([...(mapping.deferCols??[]),...(record.object==="Quote"?["revision_of_id"]:[]),...(record.object==="Account"?["end_user_account_id"]:[])])
        const dv:Record<string,unknown>={},values:Record<string,unknown>={}
        for(const [field,value] of Object.entries(record.values))(defer.has(field)?dv:values)[field]=value
        deferred.push({record,values:dv})
        try {
          const inserted=await (async (sp: postgres.TransactionSql)=>{
            const encoded:postgres.Row={...values};for(const [field,value] of Object.entries(values))if(cols(record.table).get(field)?.data_type==="jsonb")encoded[field]=sp.json(value as postgres.JSONValue)
            const rows=await sp`insert into ${sp(record.table)} ${sp(encoded)} on conflict(id) do nothing returning id`
            return rows.count>0
          })(tx)
          outcomes.push({object:record.object,sourceId:record.sourceId,status:inserted?"inserted":"existing",generated:record.generated,reason:inserted?"":"Existing deterministic ID; values must match verification"})
        }catch(e){const err=e as {code?:string;constraint_name?:string;column_name?:string;message:string};outcomes.push({object:record.object,sourceId:record.sourceId,status:"failed",reason:[err.code,err.constraint_name,err.column_name,err.message].filter(Boolean).join(" | ")});throw new Rollback("Insert failed; rollback complete transaction")}
      }
      for(const {record,values} of deferred){
        if(!Object.keys(values).length||outcomes.some(o=>o.object===record.object&&o.sourceId===record.sourceId&&(o.status==="failed"||o.status==="existing")))continue
        try{await tx`update ${tx(record.table)} set ${tx(values as postgres.Row)} where id=${String(record.values.id)} and tenant_id=${tenant}`}
        catch(e){const o=outcomes.find(o=>o.object===record.object&&o.sourceId===record.sourceId)!;o.status="failed";o.reason=`Deferred relationship failed: ${(e as Error).message}`;throw new Rollback("Deferred update failed; rollback complete transaction")}
      }
      for(const mapping of MAPPINGS){
        const stored=await tx`select * from ${tx(mapping.table)} where tenant_id=${tenant}`
        const index=new Map(stored.map(r=>[r.id,r]))
        for(const record of plan.records.filter(r=>r.object===mapping.object&&r.status==="ready")){
          const result=outcomes.find(r=>r.object===record.object&&r.sourceId===record.sourceId)!
          if(result.status==="failed")continue
          const actual=index.get(record.values.id)
          const wrong=Object.entries(record.values).filter(([field,value])=>!actual||!storedValueMatches(value,actual[field],cols(record.table).get(field)?.data_type??"text")).map(([field])=>field)
          if(wrong.length){result.status="failed";result.reason=`Stored values differ: ${wrong.join(", ")}`}else result.verified=true
        }
      }
      if(outcomes.some(o=>o.status==="failed"))throw new Rollback("Unexpected database/verification failure: all changes rolled back")
      if(!commit)throw new Rollback("Dry run: actual SQL validated, all changes rolled back")
    })
    committed=true
  }catch(e){rolledBack=true;if(!(e instanceof Rollback))throw e}
  finally{await sql.end()}
  if(!plan)throw new Error("Planning did not complete")
  for(const record of plan.records)if(!outcomes.some(o=>o.object===record.object&&o.sourceId===record.sourceId))outcomes.push({object:record.object,sourceId:record.sourceId,generated:record.generated,status:record.status!=="ready"?record.status:"not_attempted",reason:record.status!=="ready"?record.issues.join("; "):"Transaction stopped at an earlier database error"})
  const successful=new Set(outcomes.filter(o=>o.verified&&(o.status==="inserted"||o.status==="existing")).map(o=>`${o.object}:${o.sourceId}`))
  for(const u of users)if(u.memberId)successful.add(`User:${u.sourceId}`)
  const fieldReport=inventory.flatMap(i=>i.headers.map(field=>{
    const map=MAPPINGS.find(m=>m.object===i.object),direct=map?.fields[field],special=TECHNIQUES[i.object]?.find(t=>t.fields.includes(field))
    const audit={CreatedDate:"created_at",LastModifiedDate:"updated_at"} as Record<string,string>
    const userFields=["Id","Email","Username","FirstName","LastName","IsActive","UserType","ManagerId"]
    const used=Boolean(map&&(field==="Id"||direct||special||map.consumes?.includes(field)||audit[field]||field==="IsDeleted"))||(i.object==="User"&&userFields.includes(field))
    const target=special?.targets.join(", ")??direct?.col??(map?audit[field]:undefined)??(field==="Id"&&map?"id":map?.consumes?.includes(field)?"Derived row defaults":i.object==="User"&&used?"user / member / membership_profiles":"")
    const affected=plan!.notes.filter(n=>n.object===i.object&&n.fields.split(";").map(s=>s.trim()).some(s=>s===field||s===target))
    const rows=dataset[i.object]?.rows??[]
    return {object:i.object,field,sourceRows:i.rows,populated:i.populated[field]??0,disposition:used?(special?"normalized / derived":"mapped / used"):(i.populated[field]?"omitted populated field":"omitted empty field"),target,
      verifiedRecordRows:used?rows.filter(r=>r[field]&&successful.has(`${i.object}:${r.Id}`)).length:0,
      fieldExceptionRows:new Set(affected.map(n=>n.sourceId)).size,
      technique:special?.technique??(map&&audit[field]?"Preserve historical UTC timestamp":direct?.xform?.reference?`Stable tenant-scoped ID to ${direct.xform.reference}; required parents quarantine, optional missing links are reported`:used?"Mapping registry / row defaults; see per-record changes and exceptions":"No supported migration mapping. Deliberately omitted per migration scope; original export retained."),
      note:affected.length?"See field exceptions; record success does not mean this optional field was retained":""}
  }))
  const summary=MAPPINGS.map(m=>{const os=outcomes.filter(o=>o.object===m.object&&!o.generated);return {object:m.object,sourceRows:dataset[m.object]?.rows.length??0,inserted:os.filter(o=>o.status==="inserted").length,existing:os.filter(o=>o.status==="existing").length,superseded:os.filter(o=>o.status==="superseded").length,quarantined:os.filter(o=>o.status==="quarantined").length,failed:os.filter(o=>o.status==="failed").length,notAttempted:os.filter(o=>o.status==="not_attempted").length}})
  const moduleDir=dirname(fileURLToPath(import.meta.url))
  const codeHashes=Object.fromEntries(["mapping.ts","plan.ts","runner.ts","csv.ts","../../server/services/quotation-math.ts","../../server/services/quote-sync-projection.ts","../../lib/validation-quotation.ts","../../lib/opportunity-code.ts","../../lib/quote-number.ts"].map(file=>[file,createHash("sha256").update(readFileSync(join(moduleDir,file))).digest("hex")]))
  const report={version:3,quoteFunnelOverrides,overrideSha256:overrideRaw?createHash("sha256").update(overrideRaw).digest("hex"):null,tenant,mode:commit?"commit":"dry-run",committed,rolledBack,generatedAt:new Date().toISOString(),codeHashes,summary,users,ownerFallbacks,generated,
    generatedRecords:outcomes.filter(o=>o.generated),outcomes,fields:fieldReport,exceptions:plan.notes,changes:plan.changes,inventory,techniques:TECHNIQUES,
    relationships:plan.records.filter(r=>r.status==="ready").flatMap(r=>Object.entries(references[r.object]??{}).filter(([column])=>r.values[column]).map(([column,target])=>({object:r.object,sourceId:r.sourceId,generated:r.generated??false,column,target,targetId:r.values[column],verified:successful.has(`${r.object}:${r.sourceId}`)})))}
  writeFileSync(join(out,"migration-report.json"),JSON.stringify(report,null,2))
  console.log(JSON.stringify({mode:report.mode,committed,rolledBack,summary,users:users.reduce((a,u)=>({...a,[u.status]:(a[u.status]??0)+1}),{} as Record<string,number>),fieldExceptions:plan.notes.length,report:join(out,"migration-report.json")},null,2))
  return outcomes.some(o=>o.status==="failed")?1:outcomes.some(o=>o.status==="quarantined")?2:0
}
