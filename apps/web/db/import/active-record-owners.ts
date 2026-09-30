import type { Dataset } from "./plan"

// These source objects produce CRM records whose owner is meaningful to users.
// Products, companies and child lines follow their parent records instead.
const OWNED_OBJECTS = [
  "Account", "Contact", "Lead", "Opportunity_ID__c", "Opportunity",
  "Quote", "Contract", "Payment_Milestone__c",
] as const

export function activeRecordOwnerIds(dataset: Dataset): Set<string> {
  const owners = new Set<string>()
  for (const object of OWNED_OBJECTS) {
    for (const row of dataset[object]?.rows ?? []) {
      if (/^(true|1|yes)$/i.test(row.IsDeleted ?? "")) continue
      if (row.OwnerId) owners.add(row.OwnerId)
    }
  }
  return owners
}
