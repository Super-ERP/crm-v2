# Shared location catalogue

User approved GeoNames + PostgreSQL + existing Combobox for all CRM address capture. Local review only; no push.

Use global read-only reference countries, administrative divisions and populated places, imported from pinned downloaded GeoNames files with attribution and provenance. Country/state/place identifiers are stable GeoNames/ISO identifiers; existing address name snapshots remain compatible with PDF and historical documents. Search cities on the server. State is optional where absent. Street and postcode stay text. No external API at runtime.

One shared LocationFields component and server lookup/validation serve Account create/update, Account detail editing and Lead conversion. Existing unmatched location tuples may remain unchanged when unrelated fields are saved; changed tuples must match the catalogue. No guessing ambiguous legacy places or clearing stored addresses on load. Country and State changes explicitly clear dependent selections.

Alternatives: npm location library (licence/data maintenance mismatch), live external API (runtime availability/rate dependency); approved local GeoNames approach avoids both. Use cities500 populated-place extract initially, with country/admin coverage and verified tenant localities for missing towns. This is not a complete postal address verifier.

Settings country/state free-text taxonomy is replaced with reference catalogue information and a controlled admin missing-locality workflow. General default Country uses catalogue selection. Phone country selectors already use standardized ISO lists and remain supported.

## User amendment: City/Town custom text

City/Town is a free-text field throughout the CRM. Country and State/Province remain searchable catalogue-backed A–Z dropdowns. City editing clears old catalogue City IDs, accepts custom names (up to 120 characters) and requires no city-catalogue match or administrator addition. Existing legacy Country/State may remain unchanged while City text is edited. This supersedes the City selector/validation parts above.
