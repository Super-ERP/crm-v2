# Frontend clarity fixes — local review

Implemented on `feat/frontend-clarity-audit-fixes`. Not pushed or deployed. See the [original audit](2026-11-17-frontend-interface-clarity-audit.md) for evidence and route inventory.

| Finding | Resolution |
| --- | --- |
| F01 | Funnel stage totals are grouped by currency across matching deals. |
| F02 | Deal value (excl. tax) identifies estimate, primary quotation or stored legacy source. |
| F03 | Parent totals explicitly describe child Funnel estimates and their scope. |
| F04 | End customer, parent Opportunity, pipeline and salesperson names are distinguished. |
| F05 | Related references link to accessible records; unavailable targets remain plain text. |
| F06 | Account owner is resolved independently from Opportunity owner. |
| F07 | Converted Leads show the actual converted Opportunity identity. |
| F08 | Contact related panels explain relationship membership. |
| F09 | Account creation actions require an explicit Funnel choice. |
| F10 | Column controls and exports use shared field meaning labels and descriptions. |
| F11 | Milestone list, detail and editing share the correct currency source. |
| F12 | Product amounts retain each product row’s currency. |
| F13 | CC/QAR quotation totals show header discount and net excluding tax. |
| F14 | Received totals use issued receipts, including partial receipts; balance deducts credits and receipts. |
| F15 | Finance creation displays currency; historical document totals are labelled as recorded, without inventing a tax basis or misleading net completion percentage. |
| F16 | New finance documents default billing party from quotation billing context and display end customer, Bill To and Attention. |
| F17 | Sales Order value is labelled current Project value excluding tax, rather than an approved historical snapshot. |
| F18 | Fallback quotation line labels identify tax-inclusive totals accurately. |
| F19 | Mark invoiced explains its planning status and does not claim an invoice was created. |
| F20 | Forecast estimates, probability weighting and intercompany allocation meanings are explicit. |
| F21 | Missing budgets and estimates display Not set; explicit zero remains zero. |
| F22 | Mobile record details expose app navigation. |
| F23 | Shared headers and table actions wrap at narrow widths. |
| F24 | Added control labels, sort semantics and accessible help controls. |
| F25 | Audit events show full local chronology and accessible core CRM record identities. |
| F26 | Record headings and URL-backed tabs preserve context; unavailable conditional tabs fall back safely. |
| F27 | Forecast stage axes use short codes with a full-label legend. |

Set primary: help is inside the shared outline, using an independent keyboard-focusable button. Clicking help does not invoke the primary action.

Additional dependency maintenance: Next.js patched to 16.4.5 for the specific security advisory identified during the audit.

## Verification

- PostgreSQL-backed full suite: 186 files, 1,236 tests passed after integrated changes.
- Final small accessibility fixes: focused regression tests passed; lint passed.
- Final production build passed, including type checking.
- Independent review completed; destination permission/scope checks and conditional URL tab findings corrected and re-reviewed.
- Built local demo checked through Tailscale with fictional data, including a partial receipt example (100 invoiced, 40 received, 60 balance), USD milestone, and Set primary help.
- Quotation pagination regression checks passed. New CC/QAR discount totals have component regression coverage.

## Limits preserved deliberately

Existing historical finance tax basis and approved Sales Order value snapshots cannot be reconstructed from absent data. The interface now describes the actual stored/current values. Unsupported historical audit record types retain plain-text IDs rather than false links. This is not a claim of a full screen-reader or WCAG certification. Existing permissions, saved-view field IDs and numbering are preserved. The preview uses a temporary signed-in entry to fictional local data, not production credentials.

## Terminology consistency

Canonical catalog terms now come from `lib/crm-terminology.ts`: Product name, Product category, Product subcategory and Unit of measure. The persisted `productCode` key is a category code; it is not an individual-product SKU. Product create/edit/detail/list/filter labels and category Settings navigation use the same terminology. Shared table field and relationship metadata use the same category/subcategory labels, including CSV field headings; IDs and saved views remain unchanged. Settings continues to distinguish Category code/name from Subcategory code/name. Account Code, Project Code and quotation SKU remain distinct identifiers. Billing schedule source references use Quotation item rather than product line/category.

The scope is catalog taxonomy and directly related sales/billing surfaces; this does not claim every customer-defined name or document template has been renamed.

Terminology verification: 23 focused tests passed, focused ESLint and production build passed. Rebuilt local browser confirmed Product name/category/subcategory/Unit of measure in the Products table, matching category/subcategory/unit labels on the Product detail, and Product categories in Settings with no old Product Codes navigation label. No runtime exceptions. No data changes, schema renames or push/deployment.
