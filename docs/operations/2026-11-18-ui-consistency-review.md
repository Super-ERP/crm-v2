# UI consistency review — 18 November 2026

Review only; no application changes. Scope: Funnel milestone panel, 4a setup, quotation payment plan, milestone detail and account detail. Local fictional Admin data. Browser checked 1440px and 390px layouts. No records saved or stages advanced.

## Verified findings

| ID | Severity | Location and evidence | Concrete fix | Verification |
|---|---|---|---|---|
| UI-01 | Medium | Funnel milestone tab at stage 3b has no Edit payment plan; canManage is gated by milestoneEligible, while quotation planning permits pre-4a editing. Browser confirmed absent action. | Separate plan-edit permission from lifecycle eligibility; retain invoicing gates. | Authorized pre-4a user can navigate to plan; cannot mark invoiced prematurely. |
| UI-02 | Medium | 4a shows Current: 26-QM-DEMO-L-001 and Select existing, but combobox remains blank because projectCodeChoice starts null. Browser confirmed both. | Prefill the current authorized code as an explicit existing choice; allow switching to Generate new. | Opening with an assigned code shows it selected; opening without one requires a choice. |
| UI-03 | Low | Funnel summary says lowercase net funnel value while quotation/4a use Quotation net. The displayed ceiling comes from the primary quote in this example. | Use Quotation net where that is the source; use Funnel estimate only for the estimate fallback. | Check both quoted and unquoted funnels. |
| UI-04 | Low | Code review: equivalent editing actions say Edit payment plan on Funnel but Edit milestones on quotation; titles vary Payment milestones/Payment Milestones; 4a still mentions billing schedule in validation. | Standardize visible section names to Payment Milestones and plan actions to Edit payment plan / Save payment plan. | Compare read/edit/dialog states and error text. |
| UI-05 | Medium | Code review: 4a dialog has field errors but does not focus the invalid control; quotation plan already focuses the first aria-invalid control. | Match quotation validation focus; associate code error with picker controls. | Keyboard-only invalid submission announces error and focuses the first invalid input. |

## Checks without findings

Funnel, quotation, milestone and account pages loaded without the error boundary. No page-level horizontal overflow at 1440px/390px. Shared Funnel milestone DataTable showed Views, Columns, Export and pagination. All four demo milestones retained their source quote links and native USD amounts. The 4a dialog rendered at 1100px desktop width with separated sections and retained Request approval for approval-gated transitions.

## Unverified

Fresh Sales/Sales Admin role walkthroughs; screen-reader announcement behavior; full keyboard menu interactions; CSV downloaded values after combined filters; Project page parity; exhaustive small-screen edit-state geometry; production deployment. Quotation tab switching automation was inconclusive in this round, so no live claim is made about its editor layout. This is a focused consistency review, not an exhaustive application accessibility audit.

## Resolution

UI-01–UI-05 implemented locally on 18 November. Plan navigation has its own permission flag, independent from invoicing eligibility. Assigned Project Codes prefill only when no choice has been made, preserving user selection during loading. Funnel summaries distinguish Quotation net from Funnel estimate. Quotation plan actions use Create/Edit/Save payment plan and the Payment Milestones section name. The 4a picker exposes aria-invalid/describedby and errors focus the first invalid field or validation summary.

Verification: 19 focused tests passed; TypeScript and scoped ESLint passed. Browser confirmed pre-4a Edit payment plan, selected current code and matching Quotation net labels. Invalid year submission focused the invoice-period control with aria-invalid=true; no stage request was submitted. No production changes or push. Full Sales-role/screen-reader testing remains unverified.
