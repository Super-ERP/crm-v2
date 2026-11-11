import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { organization,member } from './auth'
import { approvalStatus } from './approvals'
import type { VoidEntityType,VoidImpact } from '@/lib/record-void'
export const recordVoidRequests=pgTable('record_void_requests',{
 id:uuid('id').primaryKey().defaultRandom(),
 tenantId:text('tenant_id').notNull().references(()=>organization.id,{onDelete:'cascade'}),
 entityType:text('entity_type').notNull().$type<VoidEntityType>(),
 entityId:uuid('entity_id').notNull(),
 requesterMemberId:text('requester_member_id').notNull().references(()=>member.id),
 reason:text('reason').notNull(),
 impact:jsonb('impact').notNull().$type<VoidImpact>(),
 status:approvalStatus('status').notNull().default('pending'),
 decisionNote:text('decision_note'),
 decidedByMemberId:text('decided_by_member_id').references(()=>member.id),
 requestedAt:timestamp('requested_at',{withTimezone:true}).notNull().defaultNow(),
 decidedAt:timestamp('decided_at',{withTimezone:true}),
},t=>[uniqueIndex('record_void_one_pending').on(t.tenantId,t.entityType,t.entityId).where(sql`${t.status}='pending'`),index('record_void_target_history').on(t.tenantId,t.entityType,t.entityId,t.status),index('record_void_requester').on(t.tenantId,t.requesterMemberId,t.requestedAt)])
