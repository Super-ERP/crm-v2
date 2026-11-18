'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { searchAssignableProjectCodes } from '@/app/(app)/funnel/commit-setup-actions'
import type { ProjectCodeChoice } from '@/lib/commit-stage'

export function ProjectCodePicker({ value, onChange, currentCode, allowManual = false, validationError }: { value: ProjectCodeChoice | null; onChange: (value: ProjectCodeChoice) => void; currentCode?: string | null; allowManual?: boolean; validationError?: string }) {
 const id=React.useId(),[search,setSearch]=React.useState(''),[codes,setCodes]=React.useState<string[]>([]),[error,setError]=React.useState(''),[loading,setLoading]=React.useState(false)
 React.useEffect(()=>{let live=true;const timer=setTimeout(()=>{setLoading(true);searchAssignableProjectCodes(search).then(rows=>{if(live){setCodes(rows);setError('')}}).catch(()=>{if(live)setError('Could not load Project Codes. Try searching again.')}).finally(()=>{if(live)setLoading(false)})},200);return()=>{live=false;clearTimeout(timer)}},[search])
 const mode=value?.mode??'existing'
 return <div className="grid gap-3">
  {currentCode?<p className="text-sm text-muted-foreground">Current: <span className="font-mono text-foreground">{currentCode}</span></p>:null}
  <Tabs value={mode} onValueChange={next=>onChange(next==='new'?{mode:'new'}:{mode:next==='manual'?'manual':'existing',code:currentCode??''})}><TabsList aria-label="Project Code assignment"><TabsTrigger value="existing">Select existing</TabsTrigger><TabsTrigger value="new">Generate new</TabsTrigger>{allowManual?<TabsTrigger value="manual">Enter code</TabsTrigger>:null}</TabsList>
  <TabsContent value="existing" className="grid gap-2"><Label htmlFor={`${id}-code`}>Project Code</Label><Combobox id={`${id}-code`} aria-required aria-invalid={!!validationError} aria-describedby={validationError?`${id}-error`:undefined} value={value?.mode==='existing'?value.code:''} onChange={code=>onChange({mode:'existing',code})} options={[...new Set([...(currentCode?[currentCode]:[]),...codes])].map(code=>({value:code,label:code}))} onSearchChange={setSearch} placeholder="Find a Project Code to link…" searchPlaceholder="Search Project Codes…" emptyMessage={loading?'Searching…':'No matching Project Codes.'}/>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}</TabsContent>
  <TabsContent value="new"><p className="text-sm text-muted-foreground">A new code will be generated when you save.</p></TabsContent>
  <TabsContent value="manual" className="grid gap-2"><Label htmlFor={`${id}-manual`}>New Project Code</Label><Input id={`${id}-manual`} aria-invalid={!!validationError} aria-describedby={validationError?`${id}-error`:undefined} maxLength={80} value={value?.mode==='manual'?value.code:''} onChange={e=>onChange({mode:'manual',code:e.target.value})}/></TabsContent>
  </Tabs>
  {validationError?<p id={`${id}-error`} role="alert" className="text-sm text-destructive">{validationError}</p>:null}
 </div>
}
