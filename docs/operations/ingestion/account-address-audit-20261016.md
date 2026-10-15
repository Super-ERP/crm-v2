# Account address re-audit — 16 October 2026

**Correction:** the initial schema/history-only conclusion below was incomplete. The later full-content scan found account-linked billing addresses in `Contract.Bill_To__c` and unstructured candidates in Task descriptions. Read the follow-up section before treating any earlier missing-data count as final.

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

## Full CSV-content scan: additional original addresses found

A content scan of all 1,114 CSV files (414,209 rows, no parse errors) found address-like text outside standard address columns. `Contract.csv` contains 144 nonempty `Bill_To__c` values linked by `AccountId`, covering 70 distinct accounts. Task descriptions have 916 address-like candidate cells, while Event locations/descriptions and a few template/knowledge fields also contain address-like text. These text matches are candidates, not all customer billing addresses: email signatures can belong to Quandatics or third parties, and event locations may be venues.

The guarded planner now uses an unambiguous account-linked Contract Bill To address only when address history made no decision for that account. It ignores deleted contracts, preserves exact source text in line1, requires street/building detail, and quarantines differing values. A cleared/ambiguous history decision is not silently overridden. All existing nonempty CRM addresses remain unchanged. Contract source hashes and record IDs are included in recovery audit metadata. The normal importer uses the same fallback.

The first contract-inclusive dry run identified 55 currently blank accounts ready for restoration, 14 already populated accounts to preserve, and 11 review cases. This includes Bridgenet, IGS Protech and TM Technologies Services. Generic TM must not be conflated with a different TM subsidiary. Short/city-only contract text and conflicting history remain review cases. Additional unstructured task candidates are kept outside Git for review; they are not automatically treated as billing addresses.

Earlier statements that only nine addresses could be recovered from the dataset, and the earlier lists treating all other accounts as having no address data, are superseded by this discovery.

### Verified production result

Applied 55 contract-based restorations with the existing exact-value/timestamp guards and audit entries. Readback confirmed exactly those 55 addresses matched the original contract text, with every other account address unchanged. Repeat dry run: 0 ready, 69 preserved, 11 review. QM now has 87 accounts with address data and 237 completely blank, out of 324 active accounts. QA remains 5 with address data, 0 blank. Including the nine history recoveries, 64 addresses have been restored in total. The corrected source lists identify 69 accounts with verified recoverable addresses; remaining unstructured candidates must not be called definitely missing until reviewed. Full web tests: 910 passed,86 skipped.
