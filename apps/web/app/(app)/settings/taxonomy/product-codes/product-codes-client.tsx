"use client"
import * as React from "react"
import { Plus,Search,ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { CRM_TERMS } from "@/lib/crm-terminology"
import { showActionError } from "@/lib/show-action-error"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from "@/components/ui/alert-dialog"
import { updateProductCodes,type TenantSettingsView } from "@/app/(app)/settings/actions"
import type { ProductCategory } from "@/app/(app)/settings/constants"
import { ProductCategoryRow } from "./product-category-row"
import { TAXONOMY_GRID,TAXONOMY_SUMMARY,TaxonomyEntryFields,entryErrors,type TaxonomyEntry,type FieldErrors } from "./taxonomy-editor-fields"

type CategoryRow=ProductCategory & {uiKey:number}
const emptyDraft:TaxonomyEntry={code:'',name:''}
const dataOnly=(rows:CategoryRow[])=>rows.map(({uiKey:_key,...category})=>category)
export function ProductCodesCard({productCodes}:{productCodes:ProductCategory[]}) {
  const sequence=React.useRef(productCodes.length)
  const validationFocus=React.useRef<string|null>(null)
  const [items,setItems]=React.useState<CategoryRow[]>(()=>productCodes.map((category,uiKey)=>({...category,uiKey})))
  const [baseline,setBaseline]=React.useState(productCodes)
  const [editing,setEditing]=React.useState(false),[search,setSearch]=React.useState('')
  const [activeKey,setActiveKey]=React.useState<number|null>(null)
  const [newCategory,setNewCategory]=React.useState<TaxonomyEntry>(emptyDraft)
  const [drafts,setDrafts]=React.useState<Record<number,TaxonomyEntry>>({})
  const [errors,setErrors]=React.useState<FieldErrors>({})
  const [confirmation,setConfirmation]=React.useState<{title:string;description:string;action:string;apply:()=>void}|null>(null)
  const [pending,startTransition]=React.useTransition()
  const dirty=JSON.stringify(dataOnly(items))!==JSON.stringify(baseline)
  const hasDraft=!!(newCategory.code.trim()||newCategory.name.trim()||Object.values(drafts).some(draft=>draft.code.trim()||draft.name.trim()))
  const matches=items.filter(category=>category.uiKey===activeKey||[category.code,category.name,...category.subcategories.flatMap(item=>[item.code,item.name])].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  function fieldError(id:string,message?:string,fromFocus=false){if(validationFocus.current===id){validationFocus.current=null;if(fromFocus && !message)return}setErrors(previous=>{const next={...previous};if(message)next[id]=message;else delete next[id];return next})}
  function focusInvalid(found:FieldErrors){
    validationFocus.current=Object.keys(found)[0]
    setErrors(previous=>({...previous,...found}));setSearch('')
    requestAnimationFrame(()=>{const input=document.getElementById(Object.keys(found)[0]);let ancestor=input?.parentElement;while(ancestor){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement}input?.focus();input?.scrollIntoView({block:'center',behavior:'smooth'})})
  }
  function patch(key:number,values:Partial<ProductCategory>){if(values.subcategories && values.subcategories.length!==items.find(item=>item.uiKey===key)?.subcategories.length)setErrors(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>!id.startsWith(`category-${key}-sub-`))));setItems(previous=>previous.map(item=>item.uiKey===key?{...item,...values}:item))}
  function reset(){setItems(baseline.map(category=>({...category,uiKey:sequence.current++})));setNewCategory(emptyDraft);setDrafts({});setErrors({});setEditing(false);setActiveKey(null);setSearch('')}
  function archive(label:string,apply:()=>void){setConfirmation({title:`Archive ${label}?`,description:'This change takes effect when you save. Categories used by products cannot be archived.',action:'Archive',apply})}
  function addCategory(event:React.FormEvent){
    event.preventDefault();const found=entryErrors('new-category',newCategory,false,items.map(item=>item.code))
    if(Object.keys(found).length){focusInvalid(found);return}
    setItems(previous=>[...previous,{code:newCategory.code.trim().toUpperCase(),name:newCategory.name.trim(),subcategories:[],uiKey:sequence.current++}]);setNewCategory(emptyDraft);setErrors(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>!id.startsWith('new-category-'))));setSearch('')
  }
  function addSubcategory(category:CategoryRow){
    const prefix=`category-${category.uiKey}-new`,draft=drafts[category.uiKey]??emptyDraft
    const found=entryErrors(prefix,draft,true,category.subcategories.map(item=>item.code))
    if(Object.keys(found).length){focusInvalid(found);return}
    patch(category.uiKey,{subcategories:[...category.subcategories,{code:draft.code.trim().toUpperCase(),name:draft.name.trim()}]});setDrafts(previous=>({...previous,[category.uiKey]:emptyDraft}))
  }
  function save(){
    let found:FieldErrors={}
    for(const category of items){const prefix=`category-${category.uiKey}`;found={...found,...entryErrors(prefix,category,false,items.filter(item=>item.uiKey!==category.uiKey).map(item=>item.code))};category.subcategories.forEach((item,index)=>{found={...found,...entryErrors(`${prefix}-sub-${index}`,item,true,category.subcategories.filter((_,i)=>i!==index).map(peer=>peer.code))}})}
    if(Object.keys(found).length){focusInvalid(found);return}
    startTransition(async()=>{
      const result=await updateProductCodes(dataOnly(items))
      if(!result.ok){showActionError(result);return}
      setBaseline(result.data);setItems(result.data.map(category=>({...category,uiKey:sequence.current++})));setErrors({});setEditing(false);setActiveKey(null);setSearch('');toast.success('Product categories saved')
    })
  }
  return <Card aria-busy={pending}>
    <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><CardTitle><h2>{CRM_TERMS.productCategories}</h2></CardTitle><CardDescription>Manage categories and their subcategories.</CardDescription></div>
      <div className="flex items-center gap-2">{editing?<><Button variant="outline" disabled={pending} onClick={()=>{if(dirty||hasDraft)setConfirmation({title:'Discard changes?',description:'Your unsaved category changes will be discarded.',action:'Discard changes',apply:reset});else reset()}}>Cancel</Button><Button disabled={pending||!dirty||hasDraft} onClick={save}>{pending?'Saving…':'Save changes'}</Button></>:<Button variant="outline" onClick={()=>setEditing(true)}>Edit</Button>}</div></div>
    </CardHeader>
    <CardContent className="grid gap-4">
      <div className="relative max-w-sm"><Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" aria-hidden="true"/><Input aria-label="Search product categories" placeholder="Search categories or subcategories…" className="pl-9" value={search} onFocus={()=>setActiveKey(null)} onChange={event=>setSearch(event.target.value)} disabled={pending}/></div>
      {editing?<details className="group rounded-lg border"><summary className={TAXONOMY_SUMMARY}><ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0" aria-hidden="true"/>Add category</summary><form noValidate onSubmit={addCategory} className={`${TAXONOMY_GRID} border-t p-4`}>
        <TaxonomyEntryFields prefix="new-category" value={newCategory} onChange={setNewCategory} peers={items.map(item=>item.code)} errors={errors} onError={fieldError} disabled={pending}/>
        <Button type="submit" variant="outline" disabled={pending} className="sm:mt-6"><Plus className="size-4"/>Add category</Button>
      </form></details>:null}
      <fieldset disabled={pending} className="grid min-w-0 gap-2">{matches.map(category=><div key={category.uiKey} onFocusCapture={()=>setActiveKey(category.uiKey)}>
        <ProductCategoryRow prefix={`category-${category.uiKey}`} category={category} editing={editing} expanded={!!search.trim()} onChange={values=>patch(category.uiKey,values)} onArchive={archive} peers={items.filter(item=>item.uiKey!==category.uiKey).map(item=>item.code)} errors={errors} onError={fieldError}
          onRemoveCategory={()=>{setItems(previous=>previous.filter(item=>item.uiKey!==category.uiKey));setDrafts(previous=>{const next={...previous};delete next[category.uiKey];return next});setErrors({});setActiveKey(null)}}
          draft={drafts[category.uiKey]??emptyDraft} onDraftChange={value=>setDrafts(previous=>({...previous,[category.uiKey]:value}))} onAddSubcategory={()=>addSubcategory(category)}/>
      </div>)}</fieldset>
      {!matches.length?<p role="status" className="py-6 text-center text-sm text-muted-foreground">{items.length?'No matching categories.':'No product categories yet. Select Edit to add one.'}</p>:null}
      {editing?<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground"><span role="status">{hasDraft?'Add or clear the draft before saving.':dirty?'Unsaved changes':'No changes'}</span><span>Codes identify products; rename display names to keep existing links.</span></div>:null}
    </CardContent>
    <AlertDialog open={!!confirmation} onOpenChange={open=>{if(!open)setConfirmation(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={()=>{confirmation?.apply();setConfirmation(null)}}>{confirmation?.action}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Card>
}
export function ProductCodesClient({settings}:{settings:TenantSettingsView}){return <div className="grid gap-4"><ProductCodesCard productCodes={settings.productCodes}/></div>}
