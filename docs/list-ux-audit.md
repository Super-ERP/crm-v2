# CRM list and board audit

The shared `DataTable` now has responsive controls, a searchable relation filter that avoids rendering thousands of menu items, and consistent 25/50/100 choices for full-page lists. Detail tables retain their smaller configured size. The shared combobox truncates selected labels and exposes the full label on hover. The funnel board has horizontal navigation and progressively displays cards within each stage.

The data-fetching behavior still needs a separate migration for every list reader. Changing the browser's page size alone does not reduce the initial query. The quotation list is the first completed example: it filters, sorts, counts, and returns one 25/50/100-row page on the server; filter choices cover the full visible set.

| List | Current initial fetch | Work still required |
| --- | ---: | --- |
| Accounts | 1,000 | Server search, filter, sort, page; independent parent-account options |
| Persons | 1,000 | Server search, filter, sort, page |
| Leads | 1,000 | Server search, filter, sort, page |
| Opportunities | Up to 1,000,000 | Server search, filter, sort, page |
| Funnel | Up to 1,000,000 | Server list paging; separate board-stage loading and filter counts |
| Products | 1,000 | Server search, filter, sort, page |
| Projects | 1,000 | Server search, filter, sort, page |
| Sales orders | 1,000 | Server search, filter, sort, page |
| Finance documents | 1,000 | Server search, filter, sort, page |
| Payment milestones | 1,000 shown; 500 in one reader | Confirm source of displayed rows, then server paging |
| Intercompany | 1,000 shown | Confirm source cap, then server paging |
| Audit | 500 | Server search, filter, sort, page |

For each migration, the list query and its count must share the same tenant, visibility, search, and filter conditions. Filter choices must come from the full visible set, not the current page. Keep detail-page tables local because their rows are scoped to one record and deliberately use smaller page sizes. Do not present a client-side page number as if it represents the full dataset when the source query is capped.
