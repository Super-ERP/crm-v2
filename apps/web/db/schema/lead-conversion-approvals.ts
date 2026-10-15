import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { organization, member } from "./auth"
import { leads } from "./crm"
import { approvalStatus } from "./approvals"
import type { LeadConversionInput } from "@/lib/lead-conversion-approval"

export const leadConversionApprovalRequests = pgTable("lead_conversion_approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  requesterMemberId: text("requester_member_id").notNull().references(() => member.id, { onDelete: "cascade" }),
  approverMemberId: text("approver_member_id").references(() => member.id, { onDelete: "set null" }),
  inputSnapshot: jsonb("input_snapshot").notNull().$type<LeadConversionInput>(),
  leadSnapshot: jsonb("lead_snapshot").notNull().$type<Record<string, unknown>>(),
  status: approvalStatus("status").notNull().default("pending"),
  decisionNote: text("decision_note"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedByMemberId: text("decided_by_member_id").references(() => member.id, { onDelete: "set null" }),
}, t => [uniqueIndex("lead_conversion_one_pending").on(t.tenantId, t.leadId).where(sql`${t.status} = 'pending'`)])
