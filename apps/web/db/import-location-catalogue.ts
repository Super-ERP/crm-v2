import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { readFile } from "node:fs/promises"
import { createGunzip } from "node:zlib"
import { createInterface } from "node:readline"
import path from "node:path"
import type postgres from "postgres"

/** Offline pinned snapshot; deployed with the migrator, never fetched by the app. */
export async function importLocationCatalogue(client: postgres.Sql) {
  const root=path.join(process.cwd(),'db/reference')
  const manifest=JSON.parse(await readFile(path.join(root,'geonames-manifest.json'),'utf8'))
  const [previous]=await client`SELECT manifest->>'snapshotSha256' AS checksum FROM location_catalogue_imports WHERE source='GeoNames'`
  if(previous?.checksum===manifest.snapshotSha256 && manifest.snapshotSha256)return
  const snapshot=await readFile(path.join(root,'geonames.tsv.gz'))
  if(createHash('sha256').update(snapshot).digest('hex')!==manifest.snapshotSha256)throw new Error('GeoNames snapshot checksum mismatch')
  const fields=['id','kind','country_code','state_code','name','ascii_name','aliases','population']
  const unescape=(s:string)=>s.replace(/\\([\\tnr])/g,(_,c:string)=>c==='t'?'\t':c==='n'?'\n':c==='r'?'\r':'\\')
  await client.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtextextended('crm:location-catalogue',0))`
    await tx`CREATE TEMP TABLE incoming_locations (LIKE location_catalogue INCLUDING DEFAULTS) ON COMMIT DROP`
    const lines=createInterface({input:createReadStream(path.join(root,'geonames.tsv.gz')).pipe(createGunzip()),crlfDelay:Infinity})
    let batch:Record<string,string>[]=[]
    const flush=async()=>{if(batch.length){await tx`INSERT INTO incoming_locations ${tx(batch,fields)}`;batch=[]}}
    for await(const line of lines){const cells=line.split('\t').map(unescape);batch.push(Object.fromEntries(fields.map((field,i)=>[field,cells[i]])));if(batch.length===1000)await flush()}
    await flush()
    await tx`DELETE FROM location_catalogue WHERE source='GeoNames' AND id NOT IN (SELECT id FROM incoming_locations)`
    await tx`INSERT INTO location_catalogue SELECT * FROM incoming_locations ON CONFLICT(id) DO UPDATE SET name=excluded.name,ascii_name=excluded.ascii_name,aliases=excluded.aliases,country_code=excluded.country_code,state_code=excluded.state_code,population=excluded.population,updated_at=now()`
    await tx`INSERT INTO location_catalogue_imports(source,manifest) VALUES ('GeoNames',${JSON.stringify(manifest)}::text::jsonb) ON CONFLICT(source) DO UPDATE SET manifest=excluded.manifest,imported_at=now()`
  })
}
