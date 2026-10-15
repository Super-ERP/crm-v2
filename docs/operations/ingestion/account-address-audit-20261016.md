# Account address re-audit — 16 October 2026

The live audit found 350 active accounts across entities, 305 with completely blank billing addresses. The Salesforce-imported entity contained 324 active accounts, of which 293 were blank. These counts describe CRM state, not proof that Salesforce itself had blank addresses.

## Original-source coverage

- All three available Account.csv copies omit BillingStreet, BillingCity, BillingState, BillingPostalCode and BillingCountry. The importer already maps these fields when present.
- Company__c.csv omits Address__c. Contact.csv and Quote.csv also omit their address columns.
- Scanning CSV schemas and field-history exports found 46 billing-address events covering 15 source accounts, all in AccountHistory.csv.
- Attachment.csv, Document.csv and ContentVersion.csv contain no usable records. DatacloudAddress.csv contains an export-job failure, not account addresses. LoginGeo addresses describe login locations and cannot establish customer billing addresses.

## Additional recovery

The first repeat dry run found 0 ready, 8 preserved and 7 review cases. On closer comparison, Quandatics Omnitech's same-timestamp street values differ only by a newline versus a space. The recovery helper now compares collapsed whitespace while retaining an exact, deterministically chosen source value. It does not collapse punctuation, change case, remove spaces, or choose an order for substantively different values.

One guarded restoration was applied to Quandatics Omnitech. The transaction required the previously blank address and exact snapshot timestamp to match and recorded an account.address_restored audit event with original source hashes/history IDs. Readback verified the expected address and that every other account address remained unchanged. Combined with the previous restoration, nine account addresses have been recovered.

Afterward the imported entity has 292 completely blank addresses and 32 accounts with at least some address data. A complete source-ID-matched missing-account CSV and private before/after evidence are retained outside Git. Nonempty/manual addresses were preserved.

Five genuine same-timestamp street conflicts remain: Universiti Teknologi MARA, Opensoft, PR1MA, TARC Education Foundation and Mesiniaga. Isianpadu has only a country value. Bridgenet/IGS lack address history; TM/MOHR lack an authoritative address in the available export. These are not treated as safe restoration candidates.

## Required source to complete restoration

Obtain an authoritative Account export with Id, Name, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry and LastModifiedDate. Include all source accounts, not only recently modified/history-tracked accounts. If shipping addresses are required, export them separately and retain their meaning; do not substitute them as billing addresses automatically.

Match by Salesforce Account ID, prepare a blank-only guarded recovery report, review conflicts and apply transactionally with audit. Never rerun the full business import merely to fill addresses or overwrite manually entered CRM values. Existing issued quotation billing snapshots are historical documents and are not automatically rewritten by account-address restoration.
