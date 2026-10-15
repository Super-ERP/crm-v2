"use client"
import * as React from 'react'
import { ListFilter, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { validateFilterTree, RELATIVE_PERIODS } from '@/lib/table-controls/filter-tree'
import type { FilterCondition, FilterGroup, FilterNode, TableFieldDefinition } from '@/lib/table-controls/types'
const selectClass='h-8 max-w-full rounded-md border bg-background px-2 text-sm'
const words=(s:string)=>s.replaceAll('-',' ')
export function AdvancedFilterEditor({fields,value,onApply,timezone}:{fields:readonly TableFieldDefinition[];value:FilterGroup;onApply:(tree:FilterGroup)=>void;timezone:string}) {
 const [open,setOpen]=React.useState(false),[draft,setDraft]=React.useState(value),[error,setError]=React.useState('')
 const available=fields.filter(f=>f.operators.length)
 function update(id:string,change:(node:FilterNode)=>FilterNode){setDraft(current=>{
  const visit=(node:FilterNode):FilterNode=>node.id===id?change(node):node.kind==='group'?{...node,children:node.children.map(visit)}:node
  return visit(current) as FilterGroup
 })}
 function remove(id:string){const visit=(node:FilterNode):FilterNode=>node.kind==='group'?{...node,children:node.children.filter(child=>child.id!==id).map(visit)}:node;setDraft(current=>visit(current) as FilterGroup)}
 function newRule():FilterCondition{return {kind:'condition',id:crypto.randomUUID(),fieldId:available[0].id,operator:available[0].operators[0],value:''}}
 function operand(rule:FilterCondition,field:TableFieldDefinition){
  const set=(value:unknown)=>update(rule.id,node=>({...node,value} as FilterCondition))
  const op=rule.operator,v=rule.value
  if(op==='empty'||op==='not-empty')return null
  if(field.type==='boolean')return <select className={selectClass} aria-label={`${field.label} value`} value={String(v??'true')} onChange={e=>set(e.target.value==='true')}><option value="true">Yes</option><option value="false">No</option></select>
  if(op==='relative')return <select className={selectClass} aria-label="Relative date period" value={String(v||'')} onChange={e=>set(e.target.value)}><option value="">Choose period</option>{RELATIVE_PERIODS.map(period=><option key={period} value={period}>{words(period)}</option>)}</select>
  if(op==='any-of'||op==='none-of')return field.options?.length?<select className={selectClass+' min-h-20'} multiple aria-label={`${field.label} values`} value={Array.isArray(v)?v.map(String):typeof v==='string'?v.split(','):[]} onChange={e=>set(Array.from(e.target.selectedOptions,option=>option.value))}>{field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:<Input className="min-w-32 flex-1" aria-label={`${field.label} values separated by commas`} placeholder="Values, separated by commas" value={Array.isArray(v)?v.join(','):String(v??'')} onChange={e=>set(e.target.value)}/>
  if(field.type==='money'){
   const money=(v&&typeof v==='object'?v:{currency:'',amount:'',min:'',max:''}) as Record<string,unknown>
   return <div className="flex flex-wrap gap-2"><Input className="w-20" aria-label="Currency" placeholder="MYR" value={String(money.currency??'')} maxLength={3} onChange={e=>set({...money,currency:e.target.value.toUpperCase()})}/>{(op==='between'?['min','max']:['amount']).map(key=><Input key={key} className="w-28" inputMode="decimal" aria-label={`${field.label} ${key}`} placeholder={key} value={String(money[key]??'')} onChange={e=>set({...money,[key]:e.target.value})}/>)}</div>
  }
  if(op==='between')return <div className="flex flex-wrap items-center gap-2">{[0,1].map(index=><Input key={index} className="w-36" type={field.type==='date'?'date':'text'} aria-label={`${field.label} ${index?'to':'from'}`} value={Array.isArray(v)?String(v[index]??''):''} onChange={e=>{const range=Array.isArray(v)?[...v]:['',''];range[index]=e.target.value;set(range)}}/>)}</div>
  return <Input className="min-w-32 flex-1" type={field.type==='date'&&op!=='year'?'date':'text'} inputMode={field.type==='number'||op==='year'?'numeric':undefined} aria-label={`${field.label} value`} placeholder={op==='year'?'2026':'Value'} value={String(v??'')} onChange={e=>set(e.target.value)}/>
 }
 function renderGroup(group:FilterGroup,depth:number):React.ReactNode{return <div className="space-y-3 rounded-md border p-3" key={group.id}>
  <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Match</span><select className={selectClass} aria-label="Filter group logic" value={group.logic} onChange={e=>update(group.id,node=>({...node,logic:e.target.value as 'and'|'or'} as FilterGroup))}><option value="and">All (AND)</option><option value="or">Any (OR)</option></select><span className="text-sm text-muted-foreground">conditions</span>{depth>1?<Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Remove group" onClick={()=>remove(group.id)}><X/></Button>:null}</div>
  {group.children.map(node=>node.kind==='group'?renderGroup(node,depth+1):<div className="flex flex-wrap items-start gap-2" key={node.id}>
   <select className={selectClass} aria-label="Filter field" value={node.fieldId} onChange={e=>{const field=available.find(f=>f.id===e.target.value)!;update(node.id,()=>({...node,fieldId:field.id,operator:field.operators[0],value:field.type==='boolean'?true:''}))}}>{available.map(field=><option key={field.id} value={field.id}>{field.label}</option>)}</select>
   <select className={selectClass} aria-label="Filter operator" value={node.operator} onChange={e=>update(node.id,()=>({...node,operator:e.target.value as FilterCondition['operator'],value:''}))}>{available.find(f=>f.id===node.fieldId)?.operators.map(op=><option key={op} value={op}>{words(op)}</option>)}</select>
   {available.find(f=>f.id===node.fieldId)?operand(node,available.find(f=>f.id===node.fieldId)!):null}
   <Button variant="ghost" size="icon-sm" aria-label="Remove condition" onClick={()=>remove(node.id)}><X/></Button>
  </div>)}
  <div className="flex gap-2"><Button variant="outline" size="sm" disabled={!available.length} onClick={()=>update(group.id,node=>({...node,children:[...(node as FilterGroup).children,newRule()]} as FilterGroup))}><Plus/>Condition</Button><Button variant="ghost" size="sm" disabled={depth>=5} onClick={()=>update(group.id,node=>({...node,children:[...(node as FilterGroup).children,{kind:'group',id:crypto.randomUUID(),logic:'and',children:[newRule()]}]} as FilterGroup))}><Plus/>Group</Button></div>
 </div>}
 function apply(){try{
  const number=(v:unknown)=>typeof v==='string'&&!v.trim()?NaN:Number(v)
  const coerce=(node:FilterNode):FilterNode=>{
   if(node.kind==='group')return {...node,children:node.children.map(coerce)}
   const field=fields.find(f=>f.id===node.fieldId),op=node.operator
   let v=node.value
   if(op==='empty'||op==='not-empty')return {...node,value:undefined}
   if(op==='any-of'||op==='none-of')v=Array.isArray(v)?v:String(v??'').split(',').map(s=>s.trim()).filter(Boolean)
   else if(field?.type==='boolean'&&typeof v!=='boolean')v=true
   else if(field?.type==='number'||op==='year')v=Array.isArray(v)?v.map(number):number(v)
   else if(field?.type==='money'&&v&&typeof v==='object'){const m=v as Record<string,unknown>;v=op==='between'?{currency:m.currency,min:number(m.min),max:number(m.max)}:{currency:m.currency,amount:number(m.amount)}}
   return {...node,value:v}
  }
  onApply(validateFilterTree(coerce(draft),fields));setOpen(false)
 }catch(e){setError(e instanceof Error?e.message:'Check the filter values.')}}
 return <Dialog open={open} onOpenChange={next=>{if(next){setDraft(value);setError('')}setOpen(next)}}><DialogTrigger render={<Button variant="outline" size="sm"><ListFilter/>Advanced filters{value.children.length?` (${value.children.length})`:''}</Button>}/><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Advanced filters</DialogTitle><DialogDescription>Combine conditions with AND/OR groups. Dates use {timezone}. Filters apply across all matching records.</DialogDescription></DialogHeader>{renderGroup(draft,1)}{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}<DialogFooter><Button variant="ghost" onClick={()=>setDraft({...value,children:[]})}>Clear filters</Button><Button onClick={apply}>Apply filters</Button></DialogFooter></DialogContent></Dialog>
}
