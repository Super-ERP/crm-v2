# Sales controls and billing schedule integration

User authorized implementation and local demo; no push or deployment. Confirmed Sales Admin/Admin/Superadmin control Account Code. Each billing schedule row requires expected invoice month and year; a quote product line can have multiple billing rows.

Extend existing services rather than a parallel workflow. Account code is manual, required and unique; enforce dedicated capability on server and hide edit controls for sales. Lead conversion routes to the Sales Admin review pool (not reporting managers), with SSM registration number duplicate checks, manual code assignment and explicit review confirmations. Approval rechecks current data under transaction locks. Project Nature is required on new/changed Funnels and Lead conversion that creates a Funnel. Preserve legacy records, but require completion before 4a.

Project codes already group Funnels by shared identifiers. Make assignment and controlled edits explicit without changing historical codes automatically. A 4a advance (including skips into Won) must use explicit new/existing code choice and complete billing schedule invoice month/year. Enforce through stage service and approval execution, not UI alone. Preserve existing quoted amount excluding tax. Quote/milestone/Funnel links must honor permissions. Billing schedule rows support splitting without changing total, cannot rewrite invoiced or financially linked history, and retain originating quotation/product line.

Workbook supplied by SharePoint is inaccessible through connected tools/browser at discovery. Do not claim workbook reconciliation until contents supplied. Implement independently specified requirements and document that validation pending.

No arbitrary ID links, permission widening, guessed tax basis, default dates, automated SSM registry verification or production mutations. SSM check means duplicate detection against CRM accounts plus explicit Sales Admin review, not checking an external registry.
