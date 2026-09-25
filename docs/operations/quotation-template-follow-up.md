# Quandatics Malaysia quotation template — deferred work

Status: requirements and reference inspected only; no template implementation, company-profile changes, or PDF-service changes applied. This is a separate workstream from the saved Salesforce ingestion baseline, at the user's request on 25 September 2026.

## Reference and expected result

Reference: workspace file `QM_quotation.pdf`. Reproduce its layout in a dedicated selectable Quandatics Malaysia CRM template, populated from live quotations and Company Profile settings. Existing QAR, Citrus Cloud and default templates should remain available. This is template configuration/rendering, not a second business-data import.

The sample has two US Letter pages (612 × 792 points), Times typography, the Quandatics logo on the left, company and SST registration details on the right, a centered QUOTATION heading, recipient/contact details and quotation metadata. The six columns are Item, Description, Quantity, UOM, Unit Price, and Sub-total. It includes net/tax/gross totals, numbered notes, an order-reference instruction, a computer-generated/no-signature statement, and a repeating company-contact/confidentiality footer.

## Later implementation

1. Add a separate `qm` template and register it for selection in organization/account settings and live preview/PDF export.
2. Bind the company name, logo, address, registration, phone, email and website to settings. Add an explicit SST registration setting, which the current profile lacks. Use the provided reference to configure the local company profile; do not invent bank details.
3. Bind recipient, attention contact, reference/date, currency, delivery, payment term, expiry, descriptions, quantity/UOM, pricing, discounts, tax, totals and notes to existing CRM data and shared financial logic.
4. Ensure the local PDF renderer can reach the local app through configuration while retaining the production default. Keep this runtime work outside the ingestion mapping.
5. Test selection and rendering, then render and visually compare every page against the supplied PDF. Validate Letter sizing, long descriptions, pagination, repeated footer and complete notes. Use a fixture with the reference's exact values for visual comparison; do not overwrite historical imported values to force a match.
6. Verify an authenticated actual CRM quotation export separately. Record any reference/source-data differences explicitly rather than silently changing ingestion rules.

## Handoff evidence

Reference extraction, both page renders and extracted logo are in workspace `tmp/pdfs/qm-reference/`. The sample quotation uses reference Q100103-03 (TIME_DEVOPS GITLAB), source Quote ID `0Q0Mg000007E2p7KAC`; its sample total is MYR137,700.00 including 8% SST. Reference expiry and source CSV expiry require comparison during the template task.

Relevant implementation areas: `apps/web/lib/quotation-pdf-template.ts`, template registry/migrations, `apps/web/app/(app)/quotations/[id]/preview/`, quotation document action, live quotation form, Company Profile settings/schema, `apps/web/app/globals.css`, and `apps/web/app/api/quotations/[id]/pdf/route.ts`.

Keep future template changes in their own commit/branch and verification report. No production deployment is included in this handoff.
