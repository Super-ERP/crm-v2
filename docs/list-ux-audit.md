# CRM list and board audit

The CRM uses the shadcn `base-maia` component configuration, with custom `DataTable`, form, and funnel-board behavior built on top. Shared controls now wrap on narrow screens; full-page lists offer 25/50/100 rows; small detail tables retain their configured size. The combobox constrains long selections, and large relation menus render only the first 100 matching choices while the user searches.

Every top-level list below now returns an initial 25-row page and performs search, filtering, sorting, and counting on the server. The backend normalizes client-controlled page sizes and filter/sort keys. Its count query uses the same visibility and filter conditions as its row query. Filter choices come from the full visible set or a fixed workflow vocabulary, not just the current page.

| List | Previous initial fetch | Current behavior |
| --- | ---: | --- |
| Quotations | 500 | 25-row server page |
| Accounts | 1,000 | 25-row server page; parent name resolved by join |
| Contacts | 1,000 | 25-row server page |
| Leads | 1,000 | 25-row server page |
| Opportunities | Up to 1,000,000 | 25-row server page |
| Funnel list | Up to 1,000,000 | 25-row server page |
| Funnel board | Up to 1,000,000 | Selectable pipeline; first 25 cards per stage; later batches loaded per stage; server counts and value totals |
| Products | 1,000 | 25-row server page |
| Projects | 1,000 | 25-row server page |
| Sales orders | 1,000 | 25-row server page |
| Billing and purchasing | 1,000 per direction | 25-row server page per direction |
| Payment milestones | 500 | 25-row server page |
| Inbound intercompany | Unbounded | 25-row server page |
| Audit | 500 | 25-row server page |

Form pickers and filter-choice lookups remain separate from list rows. Some still load all lightweight account/contact choices or up to 500 finance-source choices. They need a separate searchable-lookup migration if those payloads become a measured bottleneck. Detail-page tables intentionally remain local to their parent record.

This audit establishes code behavior, not a claim that the entire UI is bug-free. Type checks, linting, and unit tests cover the query contract. The current workspace lacks a working local CRM database/browser session, so visual interaction testing and live SQL execution remain release checks before production deployment.
