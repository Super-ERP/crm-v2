import type { TableFieldDefinition, TableFieldType } from './types'
import { LEAD_STATUS_OPTIONS, MILESTONE_STATUS_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/lib/status-meta'
import { QUOTATION_STATUSES } from '@/lib/quotation-transitions'

export type OptionalTableField = Pick<TableFieldDefinition, 'id' | 'label' | 'type'> & { dateOnly?: boolean }
const field = (id: string, label: string, type: TableFieldType = 'text', dateOnly = false): OptionalTableField => ({ id, label, type, dateOnly })
const dates = [field('createdAt', 'Created date', 'date'), field('updatedAt', 'Updated date', 'date')]
const currency = field('currency', 'Currency', 'text')
const owner = field('salespersonName', 'Salesperson', 'relation')
const funnel = [field('funnelStageName', 'Funnel → Stage', 'enum'), field('funnelStatus', 'Funnel → Status', 'enum')]
/** Approved additions only. Existing panel columns and their IDs remain authoritative. */
export const OPTIONAL_TABLE_FIELDS: Record<string, readonly OptionalTableField[]> = {
  leads: [field('stage', 'Stage', 'enum'), field('country', 'Country'), field('convertedAt', 'Converted date', 'date'), ...dates],
  accounts: [field('website', 'Website'), field('phone', 'Phone'), field('registrationNumber', 'Registration number'), field('isCustomer', 'Is customer', 'boolean'), field('budgetingDate', 'Budgeting date', 'date', true), ...dates],
  persons: [field('country', 'Country'), ...dates],
  opportunities: [owner, currency, ...dates],
  funnel: [owner, field('stageName', 'Funnel stage', 'enum'), currency, ...dates],
  quotations: [owner, ...funnel, field('quoteDate', 'Quotation date', 'date', true), currency, ...dates],
  products: [currency, ...dates],
  projects: [owner, ...funnel, field('quoteNumber', 'Quotation number'), field('startDate', 'Start date', 'date', true), currency, ...dates],
  'payment-milestones': [field('description', 'Description'), field('dueDate', 'Payment due date', 'date', true), ...funnel, field('quotationStatus', 'Quotation → Status', 'enum'), field('customerName', 'Funnel → Customer', 'relation'), owner, field('projectName', 'Delivery project', 'relation'), currency, ...dates],
  'sales-orders': [field('projectCode', 'Project code'), field('funnelName', 'Funnel', 'relation'), ...funnel, field('quoteNumber', 'Quotation number'), field('reviewedByName', 'Reviewed by', 'relation'), field('reviewedAt', 'Reviewed date', 'date'), field('documentKind', 'Document kind'), field('paymentTerm', 'Payment terms'), ...dates],
  'finance-sale': [field('dueDate', 'Due date', 'date', true), currency, ...dates],
  'finance-purchase': [field('dueDate', 'Due date', 'date', true), currency, ...dates],
  'account-contacts': [field('country','Country'), ...dates],
  'account-opportunities': [currency],
  'account-pipelines': [field('status','Funnel status','enum'),field('stageCode','Stage code','enum'),currency],
  'account-quotations': [currency],
  'person-pipelines': [field('status','Funnel status','enum'),currency],
  'opp-funnels': [field('status','Funnel status','enum'),currency],
  'opp-quotations': [currency],
  'opp-products': [currency],
  'funnel-quotes': [currency],
  'funnel-projects': [field('status','Project status','enum')],
  'funnel-contract': [field('notes','Notes'),currency,...dates],
  'funnel-costs': [field('poNumber','PO number'),field('contractYear','Contract year','number'),field('notes','Notes'),currency,...dates],
  'so-finance-docs': [field('dueDate','Due date','date',true),field('docDate','Document date','date',true),currency],
  'team-members': [field('email','Email'),field('status','Membership status','enum')],
  'settings-api-keys': [field('revokedAt','Revoked date','date')],
}
export const choices = (values: readonly string[]) => values.map(value => ({ value, label: value.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()) }))
const funnelStatuses = choices(['open', 'won', 'lost', 'on_hold'])
const quotationStatuses = choices(QUOTATION_STATUSES)
/** Dataset semantics, never a global guess about what a column named status means. */
export function tableFieldOptions(listKey: string, fieldId: string): TableFieldDefinition['options'] {
  if (fieldId === 'funnelStatus') return funnelStatuses
  if (fieldId === 'quotationStatus') return quotationStatuses
  if (fieldId !== 'status') return undefined
  if (['leads'].includes(listKey)) return LEAD_STATUS_OPTIONS
  if (['funnel','account-pipelines','person-pipelines','opp-funnels'].includes(listKey)) return funnelStatuses
  if (['quotations','account-quotations','opp-quotations','funnel-quotes','code-quotations','product-usage'].includes(listKey)) return quotationStatuses
  if (['projects','account-projects','person-projects','funnel-projects','code-projects'].includes(listKey)) return PROJECT_STATUS_OPTIONS
  if (['payment-milestones','so-milestones'].includes(listKey)) return MILESTONE_STATUS_OPTIONS
  if (listKey === 'team-members') return choices(['active','invited','disabled'])
  if (listKey === 'sales-orders') return choices(['submitted','approved','rejected','void'])
  if (['finance-sale','finance-purchase','so-finance-docs'].includes(listKey)) return choices(['draft','issued','settled','cancelled'])
  return undefined
}
