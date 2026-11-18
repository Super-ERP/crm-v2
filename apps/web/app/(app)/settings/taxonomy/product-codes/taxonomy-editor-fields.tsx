"use client"
import { CircleAlert } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateProductCode,validateProductSubcategoryCode,PRODUCT_CODE_MAX,PRODUCT_SUBCATEGORY_CODE_MAX } from "@/app/(app)/settings/constants"

export const TAXONOMY_GRID="grid items-start gap-3 sm:grid-cols-[12rem_1fr_auto]"
export const TAXONOMY_SUMMARY="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
export type TaxonomyEntry={code:string;name:string}
export type FieldErrors=Record<string,string>
export function entryErrors(prefix:string,value:TaxonomyEntry,subcategory:boolean,peers:string[]):FieldErrors {
  const errors:FieldErrors={}
  const code=value.code.trim().toUpperCase()
  const issue=(subcategory?validateProductSubcategoryCode:validateProductCode)(code)
  if(issue)errors[`${prefix}-code`]=issue
  else if(peers.some(peer=>peer.trim().toUpperCase()===code))errors[`${prefix}-code`]='This code already exists.'
  if(!value.name.trim())errors[`${prefix}-name`]='Name is required.'
  return errors
}
export function TaxonomyEntryFields({prefix,value,onChange,subcategory=false,peers=[],errors,onError,disabled=false}: {
  prefix:string;value:TaxonomyEntry;onChange:(next:TaxonomyEntry)=>void;subcategory?:boolean;peers?:string[];errors:FieldErrors;onError:(id:string,message?:string,fromFocus?:boolean)=>void;disabled?:boolean
}) {
  const noun=subcategory?'Subcategory':'Category'
  return <>{(['code','name'] as const).map(field=>{
    const id=`${prefix}-${field}`,error=errors[id],hint=field==='code'?`${id}-hint`:undefined
    return <div className="grid min-w-0 gap-2" key={field}>
      <Label required className="leading-4" htmlFor={id}>{noun} {field}</Label>
      <Input id={id} disabled={disabled} required aria-required="true" aria-invalid={!!error} aria-describedby={[hint,error?`${id}-error`:undefined].filter(Boolean).join(' ')||undefined}
        value={value[field]} maxLength={field==='code'?(subcategory?PRODUCT_SUBCATEGORY_CODE_MAX:PRODUCT_CODE_MAX):undefined} className={field==='code'?'font-mono':undefined}
        onChange={event=>{onError(id);onChange({...value,[field]:field==='code'?event.target.value.toUpperCase():event.target.value})}}
        onFocus={()=>onError(id,undefined,true)} onBlur={()=>onError(id,entryErrors(prefix,value,subcategory,peers)[id])}/>
      {hint?<p id={hint} className="text-xs text-muted-foreground">A–Z, 0–9, hyphen or underscore.</p>:null}
      {error?<p id={`${id}-error`} className="flex items-start gap-1 text-xs text-destructive" role="alert"><CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true"/>{error}</p>:null}
    </div>
  })}</>
}
