import { z } from "zod"

export const VOID_ENTITY_TYPES = ['lead','account','person','product','opportunity','funnel','quotation','project','payment_milestone','sales_order','finance_doc','contract','contract_year','deal_cost'] as const
export type VoidEntityType = typeof VOID_ENTITY_TYPES[number]
export const voidTargetSchema=z.object({type:z.enum(VOID_ENTITY_TYPES),id:z.string().uuid()}).strict()
export type VoidTarget=z.infer<typeof voidTargetSchema>
export type VoidRecord=VoidTarget & {label:string;href:string|null;ownerMemberId:string|null;status:string|null;updatedAt:string|null;currency?:string|null;amount?:string|null}
export type VoidBlocker={code:string;message:string}
export type VoidImpact={target:VoidRecord;blockers:VoidBlocker[];effects:string[];requiredPermissions?:string[];fingerprint:string}
export const recordVoidRequestSchema=z.object({target:voidTargetSchema,reason:z.string().trim().min(1,'Enter a reason').max(1000),fingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).strict()
export const VOID_ENTITY_LABELS:Record<VoidEntityType,string>={lead:'Lead',account:'Account',person:'Contact',product:'Product',opportunity:'Opportunity',funnel:'Funnel',quotation:'Quotation',project:'Project',payment_milestone:'Payment milestone',sales_order:'Sales Order',finance_doc:'Finance document',contract:'Contract',contract_year:'Contract year',deal_cost:'Purchase cost'}
