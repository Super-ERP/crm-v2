"use client"
import { ChevronDown, Plus, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ProductCategory } from "@/app/(app)/settings/constants"
import { TAXONOMY_GRID,TAXONOMY_SUMMARY,TaxonomyEntryFields,type TaxonomyEntry,type FieldErrors } from "./taxonomy-editor-fields"

export function ProductCategoryRow({category,prefix,editing,onChange,onArchive,onAddSubcategory,onRemoveCategory,draft,onDraftChange,expanded,peers,errors,onError}: {
  category:ProductCategory;prefix:string;editing:boolean;onChange:(patch:Partial<ProductCategory>)=>void;onRemoveCategory:()=>void;
  onArchive:(label:string,apply:()=>void)=>void;onAddSubcategory:()=>void;draft:TaxonomyEntry;onDraftChange:(value:TaxonomyEntry)=>void;expanded?:boolean;
  peers:string[];errors:FieldErrors;onError:(id:string,message?:string,fromFocus?:boolean)=>void
}) {
  return <details className="group rounded-lg border" open={expanded || undefined}>
    <summary className={TAXONOMY_SUMMARY}>
      <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0" aria-hidden="true"/>
      <span className="min-w-0 flex-1 break-words font-medium">{category.name || 'Unnamed category'}</span>
      <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{category.code}</span>
      <Badge variant="secondary" className="shrink-0">{category.subcategories.length} {category.subcategories.length===1?'subcategory':'subcategories'}</Badge>
    </summary>
    <div className="grid gap-4 border-t p-4">
      {editing ? <div className={TAXONOMY_GRID}>
        <TaxonomyEntryFields prefix={prefix} value={category} onChange={onChange} peers={peers} errors={errors} onError={onError}/>
        <Button type="button" variant="outline" onClick={()=>onArchive(category.name,onRemoveCategory)} className="sm:mt-6" data-category-archive><Archive className="size-4"/>Archive category</Button>
      </div> : <p className="text-xs text-muted-foreground">Category code: <span className="font-mono">{category.code}</span></p>}
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">Subcategories</h3>
        {category.subcategories.length ? <div className="divide-y rounded-md border">{category.subcategories.map((subcategory,index)=><div key={index} className={`${TAXONOMY_GRID} p-3`}>
          {editing ? <>
            <TaxonomyEntryFields prefix={`${prefix}-sub-${index}`} value={subcategory} subcategory peers={category.subcategories.filter((_,i)=>i!==index).map(item=>item.code)} errors={errors} onError={onError}
              onChange={next=>onChange({subcategories:category.subcategories.map((item,i)=>i===index?next:item)})}/>
            <Button type="button" variant="ghost" size="icon" className="sm:mt-6" aria-label={`Archive subcategory ${subcategory.name}`} onClick={()=>onArchive(subcategory.name,()=>onChange({subcategories:category.subcategories.filter((_,i)=>i!==index)}))}><Archive className="size-4"/></Button>
          </> : <><span className="font-mono text-xs text-muted-foreground">{subcategory.code}</span><span className="break-words">{subcategory.name}</span></>}
        </div>)}</div> : <p className="text-sm text-muted-foreground">No subcategories.</p>}
        {editing ? <form noValidate className={`${TAXONOMY_GRID} rounded-md bg-muted/30 p-3`} onSubmit={event=>{event.preventDefault();onAddSubcategory()}}>
          <TaxonomyEntryFields prefix={`${prefix}-new`} value={draft} subcategory peers={category.subcategories.map(item=>item.code)} errors={errors} onError={onError} onChange={onDraftChange}/>
          <Button type="submit" variant="outline" className="sm:mt-6"><Plus className="size-4"/>Add subcategory</Button>
        </form> : null}
      </div>
    </div>
  </details>
}
