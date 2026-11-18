"use server"
import { sql } from "drizzle-orm"
import { runInTenant } from "@/db"
import { requireContext } from "@/lib/server-context"
import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { runAction } from "@/lib/action-result"
import { writeAudit } from "@/server/audit"
import { locationOptions, locationCountry, locationState } from "@/server/services/locations"

export async function searchLocations(kind: 'country' | 'state' | 'city', country = '', state = '', search = '') {
  if (!['country','state','city'].includes(kind)) throw new Error('Invalid location type')
  const ctx = await requireContext()
  return runInTenant(ctx.tenantId, tx => locationOptions(tx,ctx.tenantId,kind,country,state,search))
}
export async function addVerifiedLocality(countryName: string, stateName: string, name: string, source: string) {
  return runAction(() => withTenant(PERMISSIONS.TENANT_SETTINGS, async (tx,ctx) => {
    const country = await locationCountry(tx,countryName)
    const state = stateName && country ? await locationState(tx,country.countryCode,stateName) : undefined
    if (!country || (stateName && !state)) throw new Error('Select a valid Country and State/Province.')
    if (!name.trim() || name.length>120 || !source.trim() || source.length>500) throw new Error('Enter a locality name and verification source (maximum 500 characters).')
    const duplicate=await tx.execute(sql`SELECT id FROM location_catalogue WHERE kind='city' AND country_code=${country.countryCode} AND state_code=${state?.stateCode ?? ''} AND lower(btrim(name))=lower(${name.trim()}) LIMIT 1`)
    if(duplicate.length)throw new Error('That locality already exists in GeoNames.')
    const [created] = await tx.execute<{ id: string }>(sql`INSERT INTO location_localities(tenant_id,country_code,state_code,name,verified_source) VALUES (${ctx.tenantId},${country.countryCode},${state?.stateCode ?? ''},${name.trim()},${source.trim()}) ON CONFLICT DO NOTHING RETURNING id`)
    if (!created) throw new Error('That locality already exists.')
    await writeAudit(tx,ctx,{action:'settings.locality_added',entityType:'location',entityId:created.id,after:{country:countryName,state:stateName,name:name.trim(),source:source.trim()}})
    return created
  }))
}
