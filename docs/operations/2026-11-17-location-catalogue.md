# Shared address catalogue

**Current behaviour:** Country and State/Province are catalogue-backed A–Z dropdowns. City/Town is custom text (maximum 120 characters), with no City lookup or catalogue validation. This user amendment supersedes the original City selector and verified-locality workflow described below. Existing legacy Country/State can remain unchanged while City text is edited.

Country, State/Province and City/Town are searchable database selections on Account creation/edit, Account detail editing, Lead conversion and default Country settings. Street and Postcode remain text. Country changes clear State/City; State changes clear City. Selecting a City without State fills its known State. Singapore supports City without State. Phone-country controls already use ISO-backed calling-code data.

## Source and maintenance

GeoNames, https://www.geonames.org/, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source files countryInfo.txt, admin1CodesASCII.txt and cities500.zip. Exact hashes and pinned compressed snapshot checksum are in apps/web/db/reference/geonames-manifest.json. The source's dissolved AN/CS countries are excluded. Dataset is an address locality directory, not a postal-address verification service; small settlements may be missing.

Rebuild deliberately using a new cache directory (existing cached files are reused):

```sh
python3 scripts/locations/import-geonames.py --cache /tmp/geonames-YYYY-MM-DD --output /tmp/geonames.sql --reference-output apps/web/db/reference
```

Review changes and test Malaysia/Singapore plus supported customer countries before release. The migrator packages the pinned snapshot, imports transactionally after schema migrations and before publishing the applied version, checks its SHA256, and skips an unchanged snapshot. No external download occurs at deployment or runtime. Custom localities are not overwritten. GeoNames reference records removed from a newer snapshot are removed from new choices; customer address snapshots remain untouched.

## Missing places and legacy addresses

Settings → Taxonomy → Industries contains the location catalogue card. A user with Tenant Settings permission may select Country/State and add a verified missing City/Town with its source/reference. These additions are tenant scoped and audited. Countries and States are no longer editable free-text tenant picklists. Old updateCountries clients receive a clear error.

Existing address tuples are not automatically rewritten or guessed. An unchanged legacy tuple can remain when editing unrelated fields/street/postcode. Any changed location tuple is checked on the server, including City ID where supplied; invalid hierarchy is rejected. Quotation/PDF address snapshots remain human-readable. Historical import/recovery routines preserve source history and do not silently invent catalogue mappings.

## Verification

PostgreSQL tests cover country/state/city hierarchy, custom-locality tenant isolation, literal wildcard searches, invalid selections, unchanged legacy tuples, and full offline import + idempotency. Browser check: Malaysia → Selangor → Shah Alam; Country change to Singapore clears State/City; no browser exceptions. TypeScript, focused ESLint, production build and migrator build passed. Final full-suite result recorded in the completion report.

### Picker ordering

Country, State/Province and City/Town options, including search results, sort by case-insensitive name ascending with name/ID tie-breaks. Population does not affect picker order. A PostgreSQL regression verifies Alpha Town precedes a much more populous Zulu City.

### System-wide field audit

All current structured address input surfaces use LocationField/LocationFields: Account creation (including shared/quick-create callers), Account detail editing, Lead conversion and default Country settings. Verified-locality administration uses the same Country/State controls. Phone calling-country selectors remain ISO-backed phone controls. Quotation/PDF addresses are read-only snapshots. The organization letterhead Address is an unstructured postal-address block, not a separate Country/State/City input. Future structured fields must use the shared components and server validation, as recorded in root AGENTS.md.

### City/Town text amendment verified

Shared LocationField now renders an Input for City/Town, clears its obsolete City ID on editing and performs no City lookup. Account and conversion server validation accepts custom City text up to 120 characters. Country/State hierarchy validation and A–Z pickers remain. Removed the now-unnecessary verified-City addition form from Settings. Three focused PostgreSQL/render tests, TypeScript and focused lint passed; live preview HTML confirmed Country/State buttons and City input.
