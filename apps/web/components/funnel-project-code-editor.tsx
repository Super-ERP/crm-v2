'use client'
import { usePermissions } from './command-palette'
import { PERMISSIONS } from '@/lib/permissions'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog'
import { ProjectCodePicker } from './project-code-picker'
import { ProjectCodeLink } from './project-code-link'
import type { ProjectCodeChoice } from '@/lib/commit-stage'
import { changeFunnelProjectCode } from '@/app/(app)/funnel/commit-setup-actions'
import { SharedProjectCodeRename } from './shared-project-code-rename'
import { showActionError } from '@/lib/show-action-error'
export function FunnelProjectCodeEditor({funnelId,code}:{funnelId:string;code?:string|null}) {
 const permissions=usePermissions()
 const canRename=permissions.has(PERMISSIONS.PROJECT_CODE_RENAME)&&permissions.has(PERMISSIONS.TENANT_SETTINGS)
 const [open,setOpen]=React.useState(false);const [choice,setChoice]=React.useState<ProjectCodeChoice|null>(null);const [pending,start]=React.useTransition();const router=useRouter()
 return <><span className="inline-flex items-center gap-1"><ProjectCodeLink code={code}/><Button type="button" variant="ghost" size="sm" aria-label="Edit project code" onClick={()=>{setChoice({mode:'existing',code:code??''});setOpen(true)}}><PencilIcon className="size-3"/>{code ? "Change" : "Link code"}</Button></span>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Change this Funnel’s Project Code</DialogTitle><DialogDescription>Assign a code to this Funnel. Several Funnels can use the same code; existing documents keep their recorded identifiers.</DialogDescription></DialogHeader><ProjectCodePicker value={choice} onChange={setChoice} currentCode={code} allowManual={canRename}/>{code ? <div className="border-t pt-3"><SharedProjectCodeRename code={code} onRenamed={()=>setOpen(false)}/></div> : null}<DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={pending||!choice||(choice.mode!=='new'&&(!choice.code.trim()||choice.code.trim()===code))} onClick={()=>start(async()=>{if(!choice)return;const result=await changeFunnelProjectCode(funnelId,choice);if(!result.ok){showActionError(result);return}toast.success('Project code updated');setOpen(false);router.refresh()})}>Save project code</Button></DialogFooter></DialogContent></Dialog></>
}
