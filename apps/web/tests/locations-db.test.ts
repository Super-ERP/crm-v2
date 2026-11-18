import { randomUUID } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { describe,expect,it } from "vitest"
import type { Tx } from "@/db"
import { locationOptions,validateLocationAddress } from "@/server/services/locations"
const url=process.env.TEST_DATABASE_ADMIN_URL
describe.skipIf(!url)('location catalogue hierarchy and legacy compatibility',()=>{
 it('scopes cities by geography and tenant, rejects arbitrary text and preserves unchanged legacy tuples',async()=>{
  const client=postgres(url!,{max:1});const namespace='locations_'+randomUUID().replaceAll('-','')
  try{
   await client.unsafe(`CREATE SCHEMA "${namespace}";SET search_path TO "${namespace}";CREATE TABLE location_catalogue(id text,kind text,country_code text,state_code text,name text,ascii_name text DEFAULT '',aliases text DEFAULT '',population bigint DEFAULT 0);CREATE TABLE location_localities(id uuid,tenant_id text,country_code text,state_code text,name text)`)
   await client`INSERT INTO location_catalogue(id,kind,country_code,state_code,name) VALUES ('MY','country','MY','','Malaysia'),('SG','country','SG','','Singapore'),('MY.14','state','MY','14','Kuala Lumpur'),('MY.12','state','MY','12','Selangor'),('gn:1','city','MY','14','Kuala Lumpur'),('gn:2','city','MY','12','Shah Alam'),('gn:3','city','SG','','Singapore')`
   await client`INSERT INTO location_localities VALUES (${randomUUID()},'tenant','MY','12','Verified Town'),(${randomUUID()},'other','MY','12','Private Town')`
   const tx=drizzle(client) as unknown as Tx
   expect((await locationOptions(tx,'tenant','country')).map(r=>r.name)).toEqual(['Malaysia','Singapore'])
   expect((await locationOptions(tx,'tenant','city','Malaysia','Selangor')).map(r=>r.name)).toEqual(['Shah Alam','Verified Town'])
   await client`INSERT INTO location_catalogue(id,kind,country_code,state_code,name,population) VALUES ('gn:4','city','MY','12','Alpha Town',1),('gn:5','city','MY','12','Zulu City',9999999)`
   expect((await locationOptions(tx,'tenant','city','Malaysia','Selangor')).map(r=>r.name)).toEqual(['Alpha Town','Shah Alam','Verified Town','Zulu City'])
   expect(await locationOptions(tx,'tenant','state','Atlantis')).toEqual([])
   expect(await locationOptions(tx,'tenant','city','Malaysia','Not a State')).toEqual([])
   await expect(validateLocationAddress(tx,'tenant',{country:'Malaysia',state:'Kuala Lumpur',city:'Custom Town'})).resolves.toBeUndefined()
   await expect(validateLocationAddress(tx,'tenant',{country:'Singapore',state:'Selangor'})).rejects.toThrow('State/Province')
   await expect(validateLocationAddress(tx,'tenant',{country:'Atlantis'})).rejects.toThrow('Country')
   await expect(validateLocationAddress(tx,'tenant',{country:'Singapore',city:'Singapore',locationCityId:'gn:3'})).resolves.toBeUndefined()
   await expect(validateLocationAddress(tx,'tenant',{country:'MY',state:'Selangor',city:'Verified Town'})).resolves.toBeUndefined()
   await expect(validateLocationAddress(tx,'tenant',{country:'MY',state:'Selangor',city:'Custom City / Town'})).resolves.toBeUndefined()
   const legacy={country:'Old Country',state:'Old State',city:'Old Town'}
   await expect(validateLocationAddress(tx,'tenant',legacy,legacy)).resolves.toBeUndefined()
   await expect(validateLocationAddress(tx,'tenant',{...legacy,city:'Another Town'},legacy)).resolves.toBeUndefined()
   await expect(validateLocationAddress(tx,'tenant',{country:'MY',city:'x'.repeat(121)})).rejects.toThrow('120 characters')
   expect(await locationOptions(tx,'tenant','city','Malaysia','','%')).toEqual([])
  }finally{await client.unsafe(`SET search_path TO public;DROP SCHEMA "${namespace}" CASCADE`);await client.end()}
 })
})
