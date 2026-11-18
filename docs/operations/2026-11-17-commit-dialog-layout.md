# Commit-stage dialog refinement

Local only. The 4a setup uses a 1100px desktop dialog, capped at 90svh, with a scrolling body and persistent footer. Other stage dialogs retain the compact shared width. Project Code and Payment Milestones have distinct sections, shared controls and red required markers. The source Funnel name and quotation link provide context; the quotation link opens separately to preserve the current draft. The shared milestone editor and allocation summary use the quotation currency without conversion.

Submission validates code selection, row fields, quotation item allocations and net total on the client; the existing server gates remain authoritative. Finance-history plans retain date-only editing. Pending submissions prevent dismissal. Approval-required moves retain Request approval rather than claiming an immediate stage change.

Verification: desktop browser measured 1100px, no page overflow; at 390px viewport the dialog measured 358px with no page overflow and a visible footer. Missing-code submission showed an inline error without sending a stage request. TypeScript and scoped ESLint passed. Seven focused policy/allocation tests passed; six database tests were skipped because their test database environment was not supplied. No stage was advanced during browser verification.
