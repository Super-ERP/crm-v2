# Universal table rollout coverage

Record-list source inventory. Each concrete key has independent personal preferences. Adapter and browser completion are tracked during implementation.

| Source | List keys | Fields | Status |
| --- | --- | --- | --- |
| `apps/web/app/(app)/_shared/project-code-panel.tsx` | `account-project-codes`, `person-project-codes` | 5 | Pending adapter audit |
| `apps/web/app/(app)/accounts/[id]/account-contacts.tsx` | `account-contacts` | 6 | Pending adapter audit |
| `apps/web/app/(app)/accounts/[id]/account-detail-body.tsx` | `account-opportunities`, `account-pipelines`, `account-projects`, `account-quotations`, `account-children` | 11 | Pending adapter audit |
| `apps/web/app/(app)/accounts/accounts-table.tsx` | `accounts` | 9 | Pending adapter audit |
| `apps/web/app/(app)/audit/audit-table.tsx` | `audit` | 6 | Pending adapter audit |
| `apps/web/app/(app)/billing/finance-docs-table.tsx` | `finance-sale`, `finance-purchase` | 9 | Pending adapter audit |
| `apps/web/app/(app)/forecast/forecast-client.tsx` | `forecast` | 7 | Pending adapter audit |
| `apps/web/app/(app)/funnel/[id]/contract-panel.tsx` | `funnel-contract` | 5 | Pending adapter audit |
| `apps/web/app/(app)/funnel/[id]/costs-panel.tsx` | `funnel-costs` | 7 | Pending adapter audit |
| `apps/web/app/(app)/funnel/[id]/funnel-detail-body.tsx` | `funnel-quotes`, `funnel-products`, `funnel-projects` | 8 | Pending adapter audit |
| `apps/web/app/(app)/funnel/funnels-table.tsx` | `funnel` | 10 | Pending adapter audit |
| `apps/web/app/(app)/intercompany/intercompany-table.tsx` | `intercompany-inbound` | 9 | Pending adapter audit |
| `apps/web/app/(app)/leads/leads-table.tsx` | `leads` | 13 | Pending adapter audit |
| `apps/web/app/(app)/opportunities/[id]/opportunity-detail-body.tsx` | `opp-funnels`, `opp-quotations`, `opp-products` | 13 | Pending adapter audit |
| `apps/web/app/(app)/opportunities/opportunities-table.tsx` | `opportunities` | 7 | Pending adapter audit |
| `apps/web/app/(app)/payment-milestones/payment-milestones-table.tsx` | `payment-milestones` | 5 | Pending adapter audit |
| `apps/web/app/(app)/persons/[id]/person-detail-body.tsx` | `person-pipelines`, `person-projects` | 5 | Pending adapter audit |
| `apps/web/app/(app)/persons/persons-table.tsx` | `persons` | 8 | Pending adapter audit |
| `apps/web/app/(app)/products/product-detail-body.tsx` | `product-usage`, `product-deals` | 7 | Pending adapter audit |
| `apps/web/app/(app)/products/products-table.tsx` | `products` | 8 | Pending adapter audit |
| `apps/web/app/(app)/project-codes/project-codes-table.tsx` | `project-codes` | 3 | Pending adapter audit |
| `apps/web/app/(app)/project-codes/view/project-code-detail-body.tsx` | `project-code-funnels`, `code-opportunities`, `code-quotations`, `code-accounts`, `code-contacts`, `code-projects` | 14 | Pending adapter audit |
| `apps/web/app/(app)/projects/projects-table.tsx` | `projects` | 6 | Pending adapter audit |
| `apps/web/app/(app)/quotations/quotations-table.tsx` | `quotations` | 14 | Pending adapter audit |
| `apps/web/app/(app)/sales-orders/[id]/sales-order-detail-body.tsx` | `so-milestones`, `so-finance-docs` | 6 | Pending adapter audit |
| `apps/web/app/(app)/sales-orders/sales-orders-table.tsx` | `sales-orders` | 7 | Pending adapter audit |
| `apps/web/app/(app)/settings/access/access-client.tsx` | `settings-api-keys` | 7 | Pending adapter audit |
| `apps/web/app/(app)/settings/billing/tax/tax-client.tsx` | `settings-tax-rates` | 5 | Pending adapter audit |
| `apps/web/app/(app)/settings/taxonomy/funnel-stages/funnel-stages-client.tsx` | `settings-funnel-stages` | 7 | Pending adapter audit |
| `apps/web/app/(app)/team/team-client.tsx` | `team-members` | 5 | Pending adapter audit |

Document/editor exemptions: quotation PDF/print renderers and editable quotation line-entry grids. Approval inboxes are card workflows, to be audited separately before rollout completion.
