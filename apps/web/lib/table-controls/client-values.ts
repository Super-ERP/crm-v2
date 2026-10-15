/** Explicit computed column values used by complete client-side record lists. */
export function computedTableValue(row:Record<string,unknown>,id:string):unknown {
 if(id==='stage')return row.stageName
 if(id==='default')return row.isDefault
 if(id==='active')return row.isActive
 if(id==='approval')return row.requiresApprovalToEnter
 if(id==='forecast')return row.includeInForecast
 if(id==='primary')return row.isPrimary??row.primary
 if(id==='converted')return Boolean(row.convertedAccountId||row.convertedPersonId)
 if(id==='roles')return row.roleNames??row.roles
 if(id==='lastActive')return row.lastLoginAt??row.lastActive
 if(id==='manager')return row.managerName??row.manager
 if(id==='relationship')return [row.primary?'primary':null,row.crossDeal?'cross-deal':null,row.crm?'crm':null].filter(Boolean)
 return row[id]
}
