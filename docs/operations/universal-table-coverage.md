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
