import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import {describe,it,expect} from 'vitest'
import { importLocationCatalogue } from '@/db/import-location-catalogue'
const url=process.env.TEST_DATABASE_ADMIN_URL
describe.skipIf(!url)('offline GeoNames migrator',()=>{
 it('imports the pinned snapshot and skips a second import',async()=>{
  const client=postgres(url!,{max:1});const namespace='geo_import_'+randomUUID().replaceAll('-','')
  try{
   await client.unsafe(`CREATE SCHEMA "${namespace}";SET search_path TO "${namespace}";CREATE TABLE location_catalogue (LIKE public.location_catalogue INCLUDING ALL);CREATE TABLE location_catalogue_imports (LIKE public.location_catalogue_imports INCLUDING ALL)`)
   await importLocationCatalogue(client)
   const [count]=await client`SELECT count(*)::int AS total FROM location_catalogue`
   expect(count.total).toBeGreaterThan(200000)
   expect(await client`SELECT id FROM location_catalogue WHERE id IN ('AN','CS')`).toHaveLength(0)
   const [before]=await client`SELECT imported_at FROM location_catalogue_imports`
   await importLocationCatalogue(client)
   const [after]=await client`SELECT imported_at FROM location_catalogue_imports`
   expect(after.imported_at).toEqual(before.imported_at)
  }finally{await client.unsafe(`SET search_path TO public;DROP SCHEMA "${namespace}" CASCADE`);await client.end()}
 },60000)
})
