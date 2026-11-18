import { sql } from "drizzle-orm"
import type { Tx } from "@/db"

export type LocationAddress = { country?: string | null; state?: string | null; city?: string | null; locationCityId?: string | null }
export type LocationOption = { id: string; name: string; label: string; countryCode: string; stateCode: string; stateName?: string }
export async function locationCountry(tx: Tx, name: string) {
  const [row] = await tx.execute<{ countryCode: string; name: string }>(sql`SELECT country_code AS "countryCode", name FROM location_catalogue WHERE kind='country' AND (lower(name)=lower(${name}) OR country_code=upper(${name})) LIMIT 1`)
  return row
}
export async function locationState(tx: Tx, country: string, name: string) {
  const [row] = await tx.execute<{ stateCode: string; name: string }>(sql`SELECT state_code AS "stateCode", name FROM location_catalogue WHERE kind='state' AND country_code=${country} AND (lower(name)=lower(${name}) OR id=${name}) LIMIT 1`)
  return row
}

export async function locationOptions(tx: Tx, tenantId: string, kind: 'country' | 'state' | 'city', countryName = '', stateName = '', search = ''): Promise<LocationOption[]> {
  const country = kind === 'country' ? undefined : await locationCountry(tx, countryName)
  if (kind !== 'country' && !country) return []
  const state = stateName && country ? await locationState(tx, country.countryCode, stateName) : undefined
  if (stateName && !state) return []
  const query = search.trim().slice(0, 100).toLowerCase().replace(/[\\%_]/g, '\\$&')
  return Array.from(await tx.execute<LocationOption>(sql`
    SELECT id,name,CASE WHEN kind='city' AND state_code<>'' THEN name||' · '||coalesce((SELECT name FROM location_catalogue st WHERE st.id=p.country_code||'.'||p.state_code),p.state_code) ELSE name END AS label,
      country_code AS "countryCode",state_code AS "stateCode", coalesce((SELECT name FROM location_catalogue st WHERE st.id=p.country_code||'.'||p.state_code),'') AS "stateName"
    FROM (
      SELECT id,kind,country_code,state_code,name,ascii_name,aliases,population FROM location_catalogue
      UNION ALL SELECT 'local:'||id::text,'city',country_code,state_code,name,name,'',0 FROM location_localities WHERE tenant_id=${tenantId}
    ) p WHERE kind=${kind} AND ${kind === 'country' ? sql`true` : sql`country_code=${country?.countryCode}`}
      AND ${state ? sql`state_code=${state.stateCode}` : sql`true`}
      AND (${query}='' OR lower(name) LIKE ${'%'+query+'%'} OR lower(ascii_name) LIKE ${'%'+query+'%'} OR lower(aliases) LIKE ${'%'+query+'%'})
    ORDER BY lower(name),name,id LIMIT ${kind === 'city' ? 60 : 500}
  `))
}

/** Country/State remain catalogue-backed; City/Town is optional custom text. */
export async function validateLocationAddress(tx: Tx, _tenantId: string, address?: LocationAddress | null, before?: LocationAddress | null) {
  if (address?.city !== before?.city && (address?.city?.length ?? 0) > 120) throw new Error('City/Town must be 120 characters or fewer.')
  const tuple = (a?: LocationAddress | null) => JSON.stringify([a?.country || '',a?.state || ''])
  if (before && tuple(address) === tuple(before)) return
  if (!address?.country && !address?.state) return
  const country = await locationCountry(tx, address?.country ?? '')
  if (!country) throw new Error('Select a Country from the location catalogue.')
  const state = address?.state ? await locationState(tx, country.countryCode, address.state) : undefined
  if (address?.state && !state) throw new Error('Select a State/Province belonging to the selected Country.')
}
