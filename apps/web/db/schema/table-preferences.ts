import { jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { member, organization } from './auth'
export const tablePreferences = pgTable('table_preferences', {
 id:uuid('id').primaryKey().defaultRandom(),
 organizationId:text('organization_id').notNull().references(()=>organization.id,{onDelete:'cascade'}),
 memberId:text('member_id').notNull().references(()=>member.id,{onDelete:'cascade'}),
 listKey:text('list_key').notNull(),
 layout:jsonb('layout').notNull(),
 updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
}, table=>[unique('table_preferences_owner_list_uq').on(table.organizationId,table.memberId,table.listKey)])
