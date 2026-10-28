# Universal table rollout coverage

Each concrete list key has a separate personal layout. Server lists apply validated filters and counts in PostgreSQL before pagination. Complete client lists filter their existing authorized dataset before local pagination. SQL identifiers come from explicit adapter maps.

| List key | Mode | Authorized reader |
| --- | --- | --- |
| `account-contacts` | complete-client | `accountsGet + listAccountOpportunities/listAccountProjects/listAccountQuotations` |
| `account-opportunities` | complete-client | `accountsGet + listAccountOpportunities/listAccountProjects/listAccountQuotations` |
| `account-pipelines` | complete-client | `accountsGet + listAccountOpportunities/listAccountProjects/listAccountQuotations` |
| `account-projects` | complete-client | `accountsGet + listAccountOpportunities/listAccountProjects/listAccountQuotations` |
| `account-quotations` | complete-client | `accountsGet + listAccountOpportunities/listAccountProjects/listAccountQuotations` |
| `account-children` | complete-client | `accountsGet + listAccountOpportunities/listAccountProjects/listAccountQuotations` |
| `accounts` | server | `accountsList` |
| `audit` | server | `listAuditPage` |
| `finance-sale` | server | `listFinanceDocPage(sale)` |
| `finance-purchase` | server | `listFinanceDocPage(purchase)` |
| `forecast` | complete-client | `getForecast` |
| `funnel-contract` | complete-client | `getOpportunity + scoped cost/contract readers` |
| `funnel-costs` | complete-client | `getOpportunity + scoped cost/contract readers` |
| `funnel-quotes` | complete-client | `getOpportunity + scoped cost/contract readers` |
| `funnel-products` | complete-client | `getOpportunity + scoped cost/contract readers` |
| `funnel-projects` | complete-client | `getOpportunity + scoped cost/contract readers` |
| `funnel` | server | `funnelsList / listFunnelStagePage` |
| `intercompany-inbound` | server | `listInboundIntercompanyDealPage` |
| `leads` | server | `leadsList` |
| `opp-funnels` | complete-client | `opportunitiesGet` |
| `opp-quotations` | complete-client | `opportunitiesGet` |
| `opp-products` | complete-client | `opportunitiesGet` |
| `opportunities` | server | `opportunitiesList` |
| `payment-milestones` | server | `listPaymentMilestonePage` |
| `person-pipelines` | complete-client | `personsGet` |
| `person-projects` | complete-client | `personsGet` |
| `persons` | server | `personsList` |
| `product-usage` | server | `listProductUsagePage` |
| `product-deals` | complete-client | `listProductDeals` |
| `products` | server | `listProductPage` |
| `project-codes` | server | `listProjectCodes` |
| `project-code-funnels` | server | `getProjectCode` |
| `code-opportunities` | server | `listProjectCodeRelatedRecords` |
| `code-quotations` | server | `listProjectCodeRelatedRecords` |
| `code-accounts` | server | `listProjectCodeRelatedRecords` |
| `code-contacts` | server | `listProjectCodeRelatedRecords` |
| `code-projects` | server | `listProjectCodeRelatedRecords` |
| `projects` | server | `listProjectPage` |
| `quotations` | server | `quotationsList` |
| `so-milestones` | complete-client | `getSalesOrder + scoped milestone/doc readers` |
| `so-finance-docs` | complete-client | `getSalesOrder + scoped milestone/doc readers` |
| `sales-orders` | server | `listSalesOrderPage` |
| `settings-api-keys` | complete-client | `existing settings readers (complete authorized datasets)` |
| `settings-tax-rates` | complete-client | `existing settings readers (complete authorized datasets)` |
| `settings-funnel-stages` | complete-client | `existing settings readers (complete authorized datasets)` |
| `team-members` | complete-client | `listTeamMembers` |

## Surfaces outside table controls

- Account/contact Project Codes is a compact list inside the existing right-hand related tabs, following the user’s requested layout. Its search and paging use the scoped related-code reader.
- Approval inboxes are existing card workflows, rather than shared record tables. Their type, routing, manager, owner and pending-status predicates remain in their approval readers; table controls do not modify those predicates.
- Printed quotation/PDF layouts and editable quotation line-entry grids keep their document/editor behavior.
- Row-number and action-only columns do not expose data filter operators.

## Verification limits

Automated tests cover registry inventory, filter validation, literal wildcard escaping, JS/SQL parity, saved-view ownership, personal preference ownership, full-result core pagination, operational SQL paths and code relationships beyond the first funnel page. Browser interaction requires a preview connection to the development environment; see the PR validation record for the actual checks performed.


## Configurable fields and export (2026-10-28)

The shared DataTable resolves capabilities from the existing adapter catalogue. Actual columns supplied by each panel remain the default; approved additions in `lib/table-controls/fields.ts` start hidden. Existing cell renderers, ordering, widths and personal views are retained. Root SQL adapters use `server/services/table-controls/dataset-fields.ts` for optional field filtering, sorting and projection. Enrichment only queries IDs already returned by the authorized loader, with tenant correlation. Complete-client panels use their full authorized DTO arrays; no server-page sampling supplies filter options.

Approved root additions include lifecycle dates, currencies and selected business details; quotations/projects/milestones expose supported funnel relationships. Milestones distinguish milestone status, funnel stage/status, quotation status, customer, salesperson and delivery project. Entity stage choices come from configured pipeline stages. Related panels expose only approved fields already present in their DTO. Action cells remain outside filters/export; array relationship classifications are not sortable. Deprecated legacy invoice-capture columns are deliberately not exposed as live CRM fields.

All registered panels use the same current-view export chooser, available through Columns, Views and Apply & export in filters. Excel (.xlsx) and CSV follow visible business fields, sorting and filters; server panels reuse their authorized loader for all pages. Numeric money values have separate currency columns. The 100,000-row limit, total-count changes, duplicate stable identities and incomplete pages fail visibly. This detects common concurrent changes but does not provide transactional snapshot consistency. Capped sources cannot claim a full export. Adding a genuinely new field or relationship still requires metadata and adapter registration; normal views over supported fields require no code.
