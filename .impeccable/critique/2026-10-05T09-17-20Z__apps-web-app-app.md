---
target: CRM user journey UX audit
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/jienweng/projects/crm-v2/apps/web/app/(app)"
timestamp: 2026-10-05T09-17-20Z
slug: apps-web-app-app
---
# CRM User-Journey UX Review

**Target:** `apps/web/app/(app)` · **Mode:** Operate

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Dashboard summarizes follow-ups and approvals; action feedback is generally present. |
| 2 | Match System / Real World | 3/4 | Sales concepts map to real workflows, though Opportunity and Funnel may be unfamiliar to new users. |
| 3 | User Control and Freedom | 2/4 | Lead conversion is irreversible; billing status actions apply immediately. |
| 4 | Consistency and Standards | 3/4 | Shared form, page, and status patterns help users move between modules. |
| 5 | Error Prevention | 2/4 | Lead conversion and billing actions lack a final review step. |
| 6 | Recognition Rather Than Recall | 3/4 | Conversion lists requirements; quotation totals update as users edit. |
| 7 | Flexibility and Efficiency | 2/4 | Quotation line items require individual field-by-field entry; no bulk path is evident. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Task-oriented overall, though quotation creation presents many decisions together. |
| 9 | Error Recovery | 3/4 | Shared error handling exists, but a missing lead email makes users leave conversion to fix it. |
| 10 | Help and Documentation | 1/4 | Inline guidance exists, but contextual help for unfamiliar terms and consequential actions is limited. |
| **Total** | | **25/40** | **Acceptable; improve consequential transitions and reduce quotation-entry friction.** |

## Design Specificity Verdict

The CRM uses familiar, coherent patterns for working through leads, quotes, and billing. Product-specific details—converting a lead into linked account, contact, opportunity, and funnel records, and showing quotation approval states—ground it in a real sales workflow. The weaker moments are transitions with financial or permanent consequences: they need the same deliberate guidance already provided for quotation approval.

The detector scan of `apps/web/app/(app)` returned `[]`: zero primary findings and zero advisories. No false positives were found. This scan does not cover the workflow risks identified by source review.

Preview inspection could not complete: T3 navigation and snapshots repeatedly failed and evaluation returned an empty Chrome error document. Local `/leads` redirected to `/sign-in`. There is no reliable screenshot or overlay evidence for this run.

## Overall Impression

The main business paths are understandable, but the riskiest transitions receive less protection than the quotation approval path. The largest opportunity is to make irreversible and financial actions reviewable, while lowering the effort to create and resume a quotation.

## Journey Walkthrough

- **Dashboard → setup:** Funnel-stage and currency/tax setup tasks both send users to `/settings`, which redirects to General. The user must locate the relevant settings section manually.
- **Lead → opportunity:** The dedicated conversion page explains the created records and account relationship. But an irreversible, multi-record action executes without a final review. If email is missing, the user has to leave conversion, edit the lead, then return.
- **Opportunity → quotation:** The quotation form asks for commercial metadata, terms, and line items in one long pass. A user interrupted before creating a draft risks losing substantial work; entering line items is also repetitive.
- **Quotation → approval:** This is the strongest consequential-action pattern observed: submission explains that editing will lock while approval is pending.
- **Billing:** Cancel and Mark settled change financial-document status immediately, with no confirmation or review checkpoint visible in detail or table actions.
- **Settings/team:** Setup tasks have weak deep links; users land at a general settings page rather than the section named in the task.

## What's Working

- Lead conversion is a dedicated flow with breadcrumbs, sensible defaults, and an explanation of the resulting account/contact/opportunity/funnel records.
- Quotation submission communicates a meaningful consequence before locking edits.
- Dashboard sections separate follow-ups, pipeline, and approvals into useful operational groupings.

## Priority Issues

1. **[P1] Billing cancel and settle actions apply immediately.** A misclick can change a financial document without a review step. Add confirmation naming the document and explaining the effect, for both detail and table-row actions. Suggested command: `$impeccable harden`. References: `apps/web/app/(app)/billing/[id]/doc-detail-body.tsx:200`, `apps/web/app/(app)/billing/finance-docs-table.tsx:393`.
2. **[P1] Lead conversion creates several records with one click and no final review.** The irreversible action can create or link an account, contact, opportunity, and funnel. Show a compact review of the selected/new account and record names, then require explicit confirmation. Suggested command: `$impeccable harden`. Reference: `apps/web/app/(app)/leads/[id]/convert/convert-form.tsx:387`.
3. **[P2] Quotation creation has a high up-front decision load.** Users fill commercial details and line items before an early draft/resume point is apparent. Make the minimum path clear, defer optional terms, and provide a safe save/resume point early. Suggested command: `$impeccable distill`. References: `apps/web/app/(app)/quotations/quotation-create-form.tsx:351`, `:511`, `:610`.
4. **[P2] Missing lead email blocks conversion without a direct correction path.** Let users edit the email inline or open lead editing and return directly to the conversion step. Suggested command: `$impeccable clarify`. Reference: `apps/web/app/(app)/leads/[id]/convert/convert-form.tsx:139`.
5. **[P2] Dashboard setup tasks link to the wrong destination.** Review your funnel stages and Set your currency & SST tax both lead to General settings. Deep-link each to its destination and preserve setup context on return. Suggested command: `$impeccable clarify`. References: `apps/web/app/(app)/dashboard/page.tsx:153`, `apps/web/app/(app)/settings/page.tsx:3`.

## Persona Red Flags

- **First-timer:** Opportunity and Funnel appear as separate required names, and a missing email blocks conversion without a direct edit path.
- **Power user:** Quotation line items require repeated field entry; a bulk-entry path is not evident.
- **Stress tester:** Billing state changes lack a visible checkpoint or recovery cue.

## Minor Observations

- The new-account conversion path requires a company code and country while much of the address is optional; clarify why those fields are needed there.
- The quotation line-item table scrolls horizontally, which may make editing difficult on narrow screens.
- Dismissing the dashboard setup checklist persists in local storage, potentially hiding it even when setup remains incomplete.

## Questions to Consider

Would it be possible to use the quotation approval flow’s review-and-consequence pattern for lead conversion and billing, while keeping routine work quick?
