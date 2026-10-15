import type { FilterContext, FilterCondition } from "./types"
const dayAfter=(date:string,days=1)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function calendarToday(context: FilterContext) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:context.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(context.now)
  const get=(type:string)=>p.find(x=>x.type===type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
/** Half-open calendar range; identical boundary semantics for date and timestamp fields. */
export function filterDateRange(condition: FilterCondition, context: FilterContext): [string|null,string|null] {
  const v=condition.value, op=condition.operator
  if(op==='year') return [`${String(v).padStart(4,'0')}-01-01`,Number(v)===9999?null:`${String(Number(v)+1).padStart(4,'0')}-01-01`]
  if(op==='relative') {
    const today=calendarToday(context), year=Number(today.slice(0,4)), month=today.slice(0,7)+'-01'
    const nextMonth=new Date(month+'T00:00:00Z');nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1)
    if(v==='today')return[today,dayAfter(today)]
    if(v==='this-year')return[`${year}-01-01`,`${year+1}-01-01`]
    if(v==='last-year')return[`${year-1}-01-01`,`${year}-01-01`]
    if(v==='this-month')return[month,nextMonth.toISOString().slice(0,10)]
    if(v==='last-month'){const d=new Date(month+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);return[d.toISOString().slice(0,10),month]}
    return[dayAfter(today,-29),dayAfter(today)]
  }
  if(op==='between'){const a=v as string[];return[a[0],dayAfter(a[1])]}
  if(op==='before')return[null,String(v)]
  if(op==='after')return[dayAfter(String(v)),null]
  return[String(v),dayAfter(String(v))]
}
