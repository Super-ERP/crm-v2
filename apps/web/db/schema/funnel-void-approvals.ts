import { pgTable, uuid, text, timestamp, uniqueIndex, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { organization, member } from "./auth"
import { funnels } from "./pipeline"
import { approvalStatus } from "./approvals"

export const funnelVoidRequests = pgTable("funnel_void_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  funnelId: uuid("funnel_id").notNull().references(() => funnels.id),
  retainedFunnelId: uuid("retained_funnel_id").notNull().references(() => funnels.id),
  requesterMemberId: text("requester_member_id").notNull().references(() => member.id),
  ownerMemberId: text("owner_member_id").notNull(),
  reason: text("reason").notNull(),
  status: approvalStatus("status").notNull().default("pending"),
  decisionNote: text("decision_note"),
  decidedByMemberId: text("decided_by_member_id").references(() => member.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
}, t => [check("funnel_void_distinct", sql`${t.funnelId} <> ${t.retainedFunnelId}`), uniqueIndex("funnel_void_one_pending").on(t.tenantId, t.funnelId).where(sql`${t.status} = 'pending'`)])
