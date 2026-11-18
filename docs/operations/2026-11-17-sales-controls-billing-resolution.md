# Sales controls and billing schedule — local review

Implemented alongside the earlier frontend clarity fixes on `feat/frontend-clarity-audit-fixes`. No commit, push, PR or production deployment in this iteration.

| Requested item | Implemented behavior |
| --- | --- |
| Account Code control | Dedicated server capability for Sales Admin/Admin/Owner; Superadmin override. Sales cannot allocate/edit codes. Manual allocation is mandatory; normalized tenant-scoped database uniqueness prevents duplicate active codes. |
| Mandatory Project Nature | Configured nature required for new Opportunity/Funnel creation and conversion creating a Funnel. Explicit changes are validated; existing populated nature cannot be cleared. Unchanged legacy missing values are preserved until completion is required. |
| Lead conversion approval | Independent Sales Admin pool, with active effective permissions, record access and no self approval. SSM registration normalization/duplicate detection occurs at submission and approval; reviewer confirms checks and assigns code. No external SSM registry lookup is claimed. |
| Quote → milestones | Counted Billing schedule tab on quotation; click each row to open its milestone. URL supports `?tab=milestones`. |
| Milestone → quote/Funnel | Scoped source links retain quotation and Funnel context; prepared schedules are visible before4a without granting invoice actions. |
| Quoted amount excluding tax | Explicit net/excluding-tax labels; schedule ceiling uses subtotal minus discount. |
| Multiple Funnels per code | Explicit reuse of an accessible existing code. Directory groups linked records without widening access. |
| Editable project code | Funnel Edit mode exposes a pencil beside Project code: generate, reuse or manually enter a code. Reassignment affects this Funnel, not sibling records or existing document snapshots. |
| 4a entry choice | Server requires Generate new or Select existing before forward advancement to4a/later open stages/Won. Kanban uses the same dialog. Approval execution rechecks mandatory requirements. |
| Per-row month/year | Required positive whole-cent amount and explicit expected invoice month/year for each billing row. Available in milestone columns, filters and CSV exports. |
| Split billing rows | One quotation product line can link to several rows. Individual uninvoiced rows split without changing the total, other rows or source. |
| Preserve financial history | Invoiced/financially linked rows cannot have their financial values replaced. Date-only forecast corrections preserve IDs, amounts, status and null/older historical quote sources. |
| Stable product provenance | Draft quotation saves update stable line IDs. Removing a billed source requires reassignment first. Shared Funnel→quote locks serialize quotation/schedule edits and preserve the net ceiling. |
| Forecast workbook | **Pending verification:** supplied SharePoint URL could not be opened through available tools/browser. Upload the workbook to verify exact columns/formulas; no claim of template parity or workbook integration is made. |

## Verification

- Full PostgreSQL-enforced suite: **194 files, 1,260 tests passed**.
- Subsequent prepared-schedule relationship parity and visible-editor label changes: seven targeted tests passed, including real PostgreSQL query coverage.
- Final production build/type checking and lint passed.
- Independent reviewer’s findings closed: explicit schedule insert allowlist, legacy date repair, stable source IDs, consistent locking and code-less intercompany account creation removed.
- Built Tailscale demo checked with actual signed-in browser: quotation’s three-row schedule, Sales Admin incoming request, and4a setup dialog. No client exceptions in sampled flows.

## Demo walkthrough

1. Open the temporary signed-in entry supplied in chat (fictional data only).
2. **Approvals → Lead conversions**: Alex Example — account review demo, requested by Sam Salesperson. Approve opens required manual code and SSM/independent-review confirmations.
3. **Quotations → Q10001-1 → Billing schedule**: US$30,000 November2026 and US$48,000 December2026 linked to one product line; US$17,000 January2027 linked to the second.
4. **Funnel → Wayne Analytics Platform → Advance stage →4a**: choose new/existing code and inspect dated schedule. Under Funnel Edit, project code can be reassigned.

## Migration/release notes

0105 adds the code-management capability, Sales Admin grants and normalized code uniqueness. Run this read-only preflight before release; resolve conflicts manually rather than rewriting identifiers:

```sql
SELECT tenant_id, upper(btrim(code)) AS normalized_code, count(*)
FROM accounts
WHERE deleted_at IS NULL AND nullif(btrim(code), '') IS NOT NULL
GROUP BY 1, 2 HAVING count(*) > 1;
```

0106 adds nullable quotation line provenance to milestones. Existing historical records are not backfilled with guessed sources or dates. Legacy pending conversions lacking the newly required SSM/nature details must be cancelled and resubmitted. Internal intercompany reseller setup now asks Sales Admin to create a coded account before reuse.

## Follow-up: primary quotation save and milestone presentation

Reproduced the user’s failure after accepting Q10001-1: acceptance set its unique Primary flag but left the Funnel’s primary pointer on the previous quotation. The schedule correctly refused to use a different primary, while the quotation badge claimed it was primary. Acceptance now updates the flag, pointer, quoted net and synced products atomically with Funnel→quotation locking; it still does not advance stage, create a Project or automatically create a schedule. Migration0107 reconciles active primary-flag/pointer drift and quoted net, preserving estimates, stage and billing history. Applied only to the local demo in this iteration.

The quotation tab is now named **Payment milestones** and opens a readable table rather than duplicate links plus a permanently exposed editor. It shows product source, invoice period, original-currency amount and status, with net/scheduled/unallocated totals. **Edit milestones** opens a separate editing state with Save/Cancel and inline validation; read-only users retain the table. Cancelling discards draft changes.

Follow-up verification: failing acceptance regression reproduced before fix, then 83 targeted tests passed across6 files, including real PostgreSQL pointer reconciliation/repeat-save coverage and table presentation/access tests. Final production build/typecheck and focused lint passed. Built demo save checked again after rebuilding. No production push.

## Project Code assignment and shared amendment

- Removed payment-planning help, including its popover and help button.
- A Funnel's Edit mode exposes **Change this Funnel’s Project Code**: generate, link an accessible existing code, or enter a different unused code. Selecting the same existing code on several Funnels groups them without changing ownership.
- Shared-code detail and the Funnel code editor separately expose **Rename shared Project Code** to users with opportunity-update and manage-all-records access. The action previews affected active Funnels and parent Opportunities before confirmation. It updates primary/cross-deal Funnel references and parent code references atomically; existing documents are not rewritten.
- Shared rename rejects existing destination identifiers rather than silently merging groups. It checks an impact version under transactional locks, audits the rename, respects tenant scope and fails safely if linked records changed or are busy. Individual assignment remains available within existing ownership permissions.
- Project Code mode/selection now uses shared Select controls with the app's standard field heights.

Verification: 24 focused tests passed, including PostgreSQL shared-rename tests for permissions, stale preview, collision refusal, two-Funnel changes, cross-tenant isolation and unchanged quotation identifiers/status. Focused ESLint and production build passed. Rebuilt synthetic demo shows code `26-QM-DEMO-L-001` with two 4a Funnels; rename preview reports two Funnels, individual editor uses shared controls, and planning help is absent. No browser exceptions. Demo data only; no production mutation or push.

## Quotation-item-first milestone creation

- Create milestones prepares one unsaved draft per positive-value quotation item. Title/source and net amount start from that item; invoice month/year must be explicitly entered.
- Quotation-level discounts are allocated proportionally across items with integer arithmetic and deterministic largest-remainder cents. No tax or currency conversion is added.
- Split keeps the original row ID and source link, creates a new instalment with the same item, and preserves their combined amount. Users can edit title, amounts, source item within the quotation, and invoice month/year before saving. Financial-history schedules retain their date-only protection.
- Server save/readiness validation reconciles each item's instalments to its allocated net, in addition to the existing quotation-wide total. A balanced overall total cannot hide amounts moved between source items. Legacy quotations with no captured item detail retain their existing compatibility path; new item-backed plans require item links.
- Funnel payment-plan editing links to the quotation workspace. Source-free manual creation/full-plan splitting for item-backed quotations is rejected, and direct single-row amount changes point to the full quotation plan. Individual source-preserving split, status and ordering remain available.

Verification: 26 focused tests across six files passed, including schema-backed save/readiness checks, exact-cent discount/remainder tests and per-item reconciliation; the core-adapter DB test also passed. TypeScript, focused ESLint and production build passed. Synthetic Q10002-1 created two drafts (78000/17000 USD), split the first into 39000/39000, rejected missing invoice periods, then successfully saved all three source-linked rows after periods were entered. No production data changes or push.

## Streamlined Project Code linking and immediate visibility

- Funnel Project code now has an explicit **Link code**/**Change** action in read mode. The assignment dialog opens directly on **Link existing**, with one shared searchable Combobox. **Generate new** and **Enter code** are separate tabs with matching panels. Unchanged assignments cannot be resubmitted.
- The shared Combobox gained an optional remote-search callback; existing callers retain their local-search behavior. Code search respects Funnel and parent ownership, including when filtering by a parent identifier.
- Assigned codes now appear immediately throughout open stages and remain visible after rollback to an earlier open stage. The requirement to assign a code before 4a/Won still applies. Lost, KIV, deleted/void and mismatched-pipeline stages remain excluded from active code visibility.
- Opportunity detail shows distinct accessible child Funnel codes as links. Opportunity list, filters and CSV metadata resolve the same visible parent fallback as Funnel/detail readers, rather than displaying an empty list for a legacy parent-only code.
- Linking preserves exact legacy code spelling/punctuation; shared renaming accepts existing legacy identifiers while validating the replacement code normally.

Verification: 41 focused policy/directory/PostgreSQL assignment tests and 16 API-reader tests passed (57 total); focused ESLint and production build passed. Synthetic browser linked `26-QM-DEMO-L-001` directly to Wayne Analytics Platform at 3b through one search input, verified immediate display on Funnel and parent Opportunity, followed its central link, and confirmed the Opportunity list also displays it. No browser exceptions. Local-only demo refreshed; no push or production writes.

## Lead conversion required markers and end-to-end check

- Shared Label supports the same red, aria-hidden asterisk as FormLabel. Conversion's Project Nature/SSM and existing Account/Country/Opportunity/Funnel required labels use this consistently; relevant custom pickers expose aria-required. Removed all remaining `(required)` label wording in approval dialogs and the Funnel Project Nature field.
- Removed the requested Sales Admin account-review explanation under SSM; shortened conversion confirmation text while preserving the fact that submission requires review.
- Browser testing found and fixed an actual adapter omission: convertLeadAction collected but did not forward projectNatureCode to the conversion service. A new action regression failed before the fix and passed after it.
- Synthetic browser: Sam submitted Conversion QA — Alex Demo with Project Nature L; independent Demo Admin assigned QA1117, confirmed SSM/independent-company checks and approved. Database confirmed converted status, linked Account/Contact/Opportunity/Funnel, original sales ownership, SSM and Project Nature L. A separate Conversion practice — Casey Demo lead remains unconverted for user testing.

Verification: 26 conversion tests across six files passed, focused ESLint and production build passed. Browser confirmed red markers on all six required conversion labels, no `(required)` text or removed helper, successful submission/review/conversion, and working separate sales/reviewer demo entry links. Local preview uses the application's development sign-in policy for seeded fictional users; production SSO/password controls are unchanged. The local proxy forwards WebSocket upgrades so the development interface hydrates correctly. No push or production changes.

### Inline conversion duplicate checks
- New-account conversion checks SSM after a 400 ms typing pause; duplicate or failed checks block submission.
- Approval checks the submitted SSM and proposed Account Code against active tenant accounts, with inline status text and approval blocked until clear.
- Checks return collision flags only, authorize access to the source Lead and restrict Account Code lookups to reviewers. Late responses are ignored when inputs change or the component closes.
- Final approval retains authoritative transaction-time duplicate validation and unique Account Code constraint.
- Verification: TypeScript and focused ESLint passed; six tests in three files passed, including PostgreSQL approval rollback. Changes remain local; no push.

### Automatic review results replace manual confirmations
- Removed SSM-check and independent-account checkboxes. The server continues to validate SSM and Account Code during approval; client confirmation flags are no longer required.
- Inline company-name screening compares significant words (80% overlap), ignoring punctuation and common legal suffixes. Similar names are review warnings, not proof of duplicate registration. Results expose no protected account names.
- Both conversion and approval show name-screening status alongside SSM results. Duplicate SSM/code and failed checks continue to block the relevant action.
- TypeScript, focused lint and 13 focused tests passed; SQL name matching checked against the synthetic preview database. Not pushed.

### Company-name location variants
- Replaced one-sided name overlap with symmetric significant-word matching. A shared core such as “Meridian Manufacturing” now flags “Meridian Manufacturing Malaysia” in either direction.
- Requires at least two shared words, except identical single-word names after legal-suffix normalization. One generic shared word does not trigger a warning.
- PostgreSQL regression covers both directions, legal suffixes, common-word false positives and empty significant names; four focused tests passed.
- Synthetic Lead 20000000-0000-4000-8000-000000000013 prepared for user testing; no conversion performed.

### Project Code identifier changes restricted to administrators

- Dedicated project_code.rename permission is granted to Owner/Admin, excluded from Developer defaults and not granted to Sales Admin. Superadmin retains access.
- Shared preview/rename also requires tenant administration and broad-record scope; manual code assignment requires the same admin capability. UI hides shared rename and manual entry for non-admins.
- Existing-code linking and system-generated allocation remain within existing sales ownership permissions. Invalid assignment modes fail closed.
- PostgreSQL regression denies a Sales Admin-style broad-record context for preview, rename and manual entry; normal rename/audit/collision tests still pass.

### Lead conversion layout streamlined

- Project Nature now belongs to Opportunity & Funnel, first beside Expected Close Date rather than detached above Account.
- Account selection identifies the new company directly; removed repeated company/contact explanations and the extra nested card border.
- Type, SSM and Office Phone align at their top edges. CRM registration/name results are compact icon/text badges beneath the whole row, with an accounts review link opening separately to preserve the draft.
- Address retains Country/State dropdowns, custom City/Town and Postcode beside City. Required-field guidance starts neutral; confirmation includes the selected Project Nature.
- Nine focused layout/action/approval tests, TypeScript and focused ESLint passed. Live browser measured identical 329px tops for all three identity controls, confirmed Project Nature's section/order and no mobile overflow. No conversion submitted; nothing pushed.
