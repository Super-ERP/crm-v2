# Quandatics Malaysia quotation template

Status: **implemented and applied in the local review CRM** on 25 September 2026. Production has not been changed.

## What is available locally

- A selectable built-in `Quandatics Malaysia` (`qm`) template, defaulted for the local review tenant. Existing default, QAR and Citrus Cloud choices remain.
- A US Letter, Times-style quotation layout with the supplied logo, legal name, address, company registration and SST registration, recipient/contact block, quote metadata, six-column item table, borderless totals, numbered notes, order-reference instructions, generated-document notice and footer on both pages. The first-page order-reference instruction is regular weight, and the company contact line is centered in the footer.
- Company Profile fields for legal name, SST registration and quotation template, alongside the existing address, registration, contact and logo settings.
- Live quotation data for line descriptions, quantity, UOM, unit price, pre-tax subtotal, tax, gross total, notes, date, delivery, payment term and validity date. Header discounts appear as a separate adjustment when present.
- A configurable `QUOTATION_PREVIEW_BASE_URL` for local PDF rendering. Production keeps its existing default URL unless configured otherwise.

Migration `0091_quandatics_quotation_template.sql` adds company legal/SST fields and activates the built-in template for existing tenants. The local review organization is configured from `QM_quotation.pdf`; bank details were left blank because the reference gives none.

## Local visual review

The latest authenticated export is `output/pdf/Quandatics-Malaysia-local-preview.pdf`. On 27 September 2026, it was re-rendered from the local CRM and compared with `QM_quotation.pdf` at the same 120 dpi. Both render as two 612 × 792 point Letter pages. The logo, header divider, title placement, metadata columns, table column boundaries and row fills, table rules, borderless totals, note indentation and wrapping, footer text alignment, and page break now visually match the supplied template. The second-page footer rule was removed to match the source; the first-page footer rule remains. The final PDF was inspected after that correction.

The template reproduces the original layout, but this live CRM quotation has different stored values from the PDF sample: it shows reference `Q10103-3` and recipient `TT DOTCOM SDN BHD`, while the sample shows `Q100103-03` and `TIME DOTCOM BERHAD`. The live account has no address or attention contact, and its validity date is 03/09/2026 instead of 02/09/2027. Those are data differences, not template differences; absent optional recipient fields render blank. The line items and totals match the sample, including MYR127,500 subtotal, MYR10,200 SST and MYR137,700 total.

For longer imported quotations, print pagination keeps each item row and the totals together independently. Totals therefore stay directly after the items whenever they fit; the notes move to the next page when needed. A note section prefers to stay together, but may split between notes if it is longer than a page. The footer uses a fixed print position on every page. The 29 September local render of `Q10101-1` (`dee37059-25c9-5344-ad48-9b4cc5843ca0`) takes two pages: its item table and totals end page one; all four notes and the sign-off follow on page two. The shorter reference quotation still takes two pages with totals and all notes on page one and sign-off on page two. Hash-prefixed imported description labels, such as `# of Regions`, are escaped before Markdown rendering so they print at normal text size. The order-reference instructions render as plain text without literal Markdown asterisks or bold styling.

This uses the imported source quotation `0Q0Mg000007E2p7KAC`. The live CRM data has reference `Q10103-3` and recipient `TT DOTCOM SDN BHD`, while the PDF sample has `Q100103-03` and `TIME DOTCOM BERHAD`. The live CRM record also has no recipient address or attention contact and its validity date is 03/09/2026 instead of the sample's 02/09/2027. Those values remain as stored in the CRM; the template leaves absent optional values blank.

Open `/settings/general` on the local CRM to see Company Profile and template selection. Open `/quotation-preview/b40e23f0-8749-5383-bcc3-ef26d687c34b` for the live preview. PDF export uses the configured local Gotenberg service. Reference renders and the extracted logo are under `../tmp/pdfs/qm-reference/` and `tmp/pdfs/2026-09-27-reference-120/`; the latest authenticated render is under `tmp/pdfs/2026-09-27-verified/`.

This template work is separate from Salesforce ingestion. It changes document presentation and the sender profile fields only; it does not rewrite imported account relationships, quote references, product mappings or historical quote amounts.
