import 'server-only'
import { tableExists } from '@/lib/table-controls/registry'
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions'
import type { ServerContext } from '@/lib/server-context'
import { requireEntitledModule } from '@/lib/modules.server'
import type { ModuleId } from '@/lib/module-registry'
const rules:Record<string,{permission:PermissionKey;module?:ModuleId}>={
 leads:{permission:PERMISSIONS.LEAD_VIEW},accounts:{permission:PERMISSIONS.ACCOUNT_VIEW},persons:{permission:PERMISSIONS.PERSON_VIEW},opportunities:{permission:PERMISSIONS.OPPORTUNITY_VIEW},funnel:{permission:PERMISSIONS.OPPORTUNITY_VIEW},quotations:{permission:PERMISSIONS.QUOTATION_VIEW},products:{permission:PERMISSIONS.PRODUCT_VIEW},
 projects:{permission:PERMISSIONS.PROJECT_VIEW,module:'projects'},'payment-milestones':{permission:PERMISSIONS.PAYMENT_MILESTONE_VIEW},'sales-orders':{permission:PERMISSIONS.SALES_ORDER_VIEW,module:'salesOrders'},'finance-sale':{permission:PERMISSIONS.FINANCE_VIEW,module:'finance'},'finance-purchase':{permission:PERMISSIONS.FINANCE_VIEW,module:'finance'},'intercompany-inbound':{permission:PERMISSIONS.INTERCOMPANY_VIEW,module:'finance'},forecast:{permission:PERMISSIONS.FORECAST_VIEW,module:'forecast'},audit:{permission:PERMISSIONS.AUDIT_VIEW,module:'audit'},'team-members':{permission:PERMISSIONS.TENANT_MANAGE_USERS},'settings-api-keys':{permission:PERMISSIONS.TENANT_SETTINGS},'settings-tax-rates':{permission:PERMISSIONS.TAX_VIEW},'settings-funnel-stages':{permission:PERMISSIONS.TENANT_SETTINGS},
 'project-codes':{permission:PERMISSIONS.OPPORTUNITY_VIEW},'project-code-funnels':{permission:PERMISSIONS.OPPORTUNITY_VIEW},
}
export function tableAccessRule(listKey:string) {
 if(!tableExists(listKey))throw new Error('Unknown table')
 if(rules[listKey])return rules[listKey]
 if(listKey.startsWith('account-'))return rules.accounts
 if(listKey.startsWith('person-'))return rules.persons
 if(listKey.startsWith('opp-')||listKey.startsWith('funnel-'))return rules.funnel
 if(listKey.startsWith('product-'))return rules.products
 if(listKey.startsWith('so-'))return rules['sales-orders']
 if(listKey.startsWith('code-'))return rules['project-codes']
 throw new Error('Table controls are unavailable for this list.')
}
export async function requireTableAccess(ctx:ServerContext,listKey:string) {
 const rule=tableAccessRule(listKey)
 if(!ctx.can(rule.permission))throw new Error(`FORBIDDEN: ${rule.permission}`)
 if(rule.module)await requireEntitledModule(rule.module)
}
