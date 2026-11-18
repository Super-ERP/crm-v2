"use client"
import * as React from "react"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { searchLocations } from "@/app/(app)/locations/actions"
import type { LocationAddress, LocationOption } from "@/server/services/locations"

type LocationFieldProps = {
  kind: 'country' | 'state' | 'city'; value: LocationAddress; onChange: (next: LocationAddress) => void; id?: string; required?: boolean; disabled?: boolean; invalid?: boolean; describedBy?: string
}
export function LocationField(props: LocationFieldProps) {
  if (props.kind === 'city') return <Input id={props.id} value={props.value.city ?? ''} maxLength={120} required={props.required} disabled={props.disabled} aria-invalid={props.invalid} aria-describedby={props.describedBy}
    autoComplete="address-level2" onChange={event=>props.onChange({...props.value,city:event.target.value,locationCityId:null})}/>
  return <CatalogueLocationField {...props}/>
}
function CatalogueLocationField({ kind, value, onChange, id, required = false, disabled = false, invalid = false, describedBy }: LocationFieldProps) {
  const [query,setQuery] = React.useState('')
  const [retry,setRetry] = React.useState(0)
  const country = kind==='country' ? '' : value.country ?? ''
  const state = kind==='city' ? value.state ?? '' : ''
  const key = JSON.stringify([kind,country,state,query,retry])
  const [result,setResult] = React.useState<{key:string; rows:LocationOption[]; error?:boolean} | null>(null)
  React.useEffect(() => {
    let current=true
    const timer=setTimeout(() => {
      searchLocations(kind,country,state,query).then(rows=>{if(current)setResult({key,rows})}).catch(()=>{if(current)setResult({key,rows:[],error:true})})
    },query ? 250 : 0)
    return ()=>{current=false;clearTimeout(timer)}
  },[kind,country,state,query,key])
  const rows=result?.key===key ? result.rows : []
  const loading=result?.key!==key
  const error=result?.key===key && result.error
  const current=value[kind] ?? ''
  const selected=rows.find(row => kind==='city' && value.locationCityId ? row.id===value.locationCityId : row.name===current || row.id===current)
  const options=rows.map(row=>({value:row.id,label:row.label}))
  if(!required)options.unshift({value:"__clear__",label:kind==='country'?'No Country selected':kind==='state'?'No State/Province selected':'No City/Town selected'})
  // Preserve historical values while fetching or when absent from the catalogue.
  if(current && !selected) options.unshift({value:'__current__',label:current})
  return <div className="min-w-0 space-y-1">
    <Combobox id={id} aria-required={required} aria-invalid={!!error || invalid} aria-describedby={describedBy} value={selected?.id ?? (current ? '__current__' : '')} options={options} filterLocally={false}
      onSearchChange={setQuery} disabled={disabled || (kind!=='country' && !value.country)}
      placeholder={kind==='country' ? 'Select Country' : kind==='state' ? 'Select State/Province' : 'Select City/Town'}
      searchPlaceholder={`Search ${kind==='city' ? 'cities/towns' : kind==='state' ? 'states/provinces' : 'countries'}…`}
      statusMessage={loading ? "Loading…" : error ? "Unable to load locations." : !rows.length ? (kind==='state' ? "No State/Province available." : "No matching location. Ask an administrator to verify missing places.") : undefined}
      emptyMessage={loading ? 'Loading…' : error ? 'Unable to load locations.' : kind==='state' ? 'No State/Province available.' : 'No matching location. Ask an administrator to verify missing places.'}
      onChange={next=>{
        if(next==='__clear__'){onChange(kind==='country'?{...value,country:'',state:'',city:'',locationCityId:null}:kind==='state'?{...value,state:'',city:'',locationCityId:null}:{...value,city:'',locationCityId:null});return}
        const row=rows.find(item=>item.id===next)
        if(!row)return
        if(kind==='country')onChange({...value,country:row.name,state:'',city:'',locationCityId:null})
        else if(kind==='state')onChange({...value,state:row.name,city:'',locationCityId:null})
        else onChange({...value,city:row.name,state:row.stateName || value.state || '',locationCityId:row.id})
      }} />
    {error ? <div role="status" className="flex items-center gap-2 text-xs text-destructive">Unable to load locations.<Button type="button" size="sm" variant="ghost" onClick={()=>setRetry(n=>n+1)}>Retry</Button></div> : null}
  </div>
}
export function LocationFields({ value,onChange,idPrefix,countryRequired=false,disabled=false,countryError,children }: {
  value:LocationAddress;onChange:(next:LocationAddress)=>void;idPrefix:string;countryRequired?:boolean;disabled?:boolean;countryError?:string;children?:React.ReactNode
}) {
  return <div className="grid gap-4 sm:grid-cols-2">{(['country','state','city'] as const).map(kind=><div className="grid min-w-0 gap-2" key={kind}>
    <Label htmlFor={`${idPrefix}-${kind}`} required={kind==='country' && countryRequired}>{kind==='country'?'Country':kind==='state'?'State/Province':'City/Town'}</Label>
    <LocationField kind={kind} value={value} onChange={onChange} id={`${idPrefix}-${kind}`} required={kind==='country' && countryRequired} disabled={disabled} invalid={kind==='country' && !!countryError} describedBy={kind==='country' && countryError ? `${idPrefix}-country-error` : undefined}/>
    {kind==='country' && countryError ? <p id={`${idPrefix}-country-error`} role="alert" className="text-sm text-destructive">{countryError}</p> : null}
  </div>)}{children}</div>
}
