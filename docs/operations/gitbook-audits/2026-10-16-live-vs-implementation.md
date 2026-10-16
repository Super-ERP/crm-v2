# GitBook implementation and usability audit — 2026-10-16

## Audit result

The published GitBook is materially behind the documentation in `origin/main` and does not accurately describe several current CRM workflows. The highest-risk pages are the welcome page, Accounts & contacts, Quotations & revisions, Payment milestones, Stage approvals, Roles & RBAC, and Frequently asked questions. A user following the published pages may try to create a milestone too early, expect it to change status automatically, look in the wrong place for quotation approval, or expect a sales representative to see a teammate's records.

The audited repository source was `origin/main` at `994d65bc7fc85ae200563edb563335c9801482de` (2026-10-15, table header filters and compact sales-stage badges). The public pages were opened directly at `https://jienweng.gitbook.io/q-app` on 2026-10-16. Their rendered text showed “Last updated 13–14 days ago.” The source files in the repository contain newer guidance, but that guidance is not what the public pages currently show. The address-recovery follow-up in PR #271 is also still separate from `origin/main` at this audit point.

This document is an internal audit record. Source-document corrections below have been applied on the audit follow-up branch. Public GitBook publication remains unverified; its administration page requires sign-in in the available browser. No claim is made that every organization has identical settings.

## Checklist: publication blockers

- [ ] **Republish the current GitBook source.** Confirm the GitBook sync/build publishes the current `origin/main` docs and check the rendered pages below after publication. This is the first fix because several individual errors are fixed in the repository source but remain visible on the website.
- [ ] **Welcome page — payment milestone lifecycle.** The published page says that on Closed Won, live Planned milestones become Won. Current behavior creates no milestone automatically, does not change status on Won, and uses only Pending invoicing → Invoiced. Update the page to say that users create a schedule explicitly after an Accepted quotation and a funnel at 4A or Closed Won.
- [ ] **Payment Milestones — creation and statuses.** The published page says milestones can be configured during quotation preparation or directly on any Funnel; its automatic-milestones section describes the former lifecycle. Current behavior requires an Accepted quotation and a funnel at 4A or Closed Won. Schedule creation is explicit. Replace Planned/Won user guidance with Pending invoicing/Invoiced, state that Won does not change the status, and remove the warning that Invoiced action may not exist in the deployed version.
- [ ] **Approvals — one queue.** The published “Stage approvals” page says quotation approval is handled on the quotation itself, describes Incoming/My requests and tells users to open a separate quotation list. Current UI has **Sales → Approvals → Needs my review / My requests**, one queue and review panel for quotation, lead-conversion and funnel-stage requests. Update the title, navigation, tab names, ordering, statuses, and actions together.
- [ ] **Roles & RBAC — Sales record scope.** The published page says Senior Rep and Rep see their own records and their reporting subtree. Current behavior gives team visibility only through the `View own and reporting team records` permission; the default Senior Rep and Rep roles are own-record scoped. Update the role table and explanations. Keep the manager reporting-subtree behavior and explain that shared reseller master data does not expose sales transactions.
- [ ] **Roles & RBAC — quotation approval route.** The published setup checklist tells admins to verify the Account owner's reporting line. Current quotation routing uses the actual submitter's reporting line; only legacy submissions without submission audit data fall back to the Funnel owner. Stage and lead-conversion routing use the requester. Update this distinction.
- [ ] **Accounts & contacts — reseller workflow.** The public page does not explain shared reseller accounts, the end-user Funnel practice, Bill To selection, or that the contact picker follows the selected Bill To company. Add the workflow and one concrete example: keep the Funnel under MCMC, choose Uniti Office as Bill To, then choose a Uniti contact.
- [ ] **Quotations — Bill To and same-funnel duplication.** The published quotation page does not include the Bill To workflow or the current duplicate action. Add the current rule: choose the paying company and one of that company's contacts; duplication creates a new Draft in the same Funnel only. Cross-entity import is not available and was deferred for later work.
- [ ] **Frequently asked questions — align milestone question.** The published FAQ asks when a milestone becomes Won. Replace it with “When can I create a payment schedule?” and answer with the explicit eligibility and status rules. Add short answers for quoting through a reseller, a missing account address, approval location, and a missing sales record.
- [x] **Workspace and personal views — current filter entry point.** The repository source still instructs users to click a Filter/Advanced filters toolbar button. Table filtering now starts from a column header; the table toolbar no longer has the old Advanced filters button. Update the guide to explain header filters, nested AND/OR groups, active filter chips, year filtering for Expected close date, and saved views/column layouts.
- [x] **Documentation navigation — approval label.** `docs/gitbook-documentation/SUMMARY.md` still calls the approvals guide “Stage approvals.” Rename it to “Approvals inbox” so the navigation describes all three request types.
- [ ] **Project Codes — publish the current guide.** The repository source explains the searchable Project Codes directory, clickable code detail, ownership scope, and 4A/Won eligibility. The public Account and Funnel pages do not expose this newer guide content. Publish it and include a short Q&A that the Projects module is not required to search CRM project codes.
- [x] **Mark the October 2 internal stage audit as historical.** `docs/gitbook-stage-audit.md` says KIV queued reopen requests are never applied and presents the listed implementation findings as still open. Current `server/services/stage.ts` applies an eligible KIV-to-open approval when the original transition remains current, and the newer public-source guide documents that behavior. Preserve the old audit as dated history, but add a superseding note or current-status table so its obsolete findings are not read as current defects.

## Checklist: gaps in the current repository documentation

The following source corrections are included in this follow-up. They become public only after the GitBook source is synced and published.

- [x] **Explain the exact address flow.** State that a quotation PDF uses the saved billing snapshot for its selected Bill To account. There is no independent quotation address field. Updating the account does not silently rewrite an already-issued quotation; review the Draft or use the supported return/revision flow.
- [x] **Explain missing-address handling without overclaiming.** A blank address in CRM does not prove Salesforce had no address: the available Salesforce export stores reliable billing text in more than the Account row, including Contract Bill_To__c and AccountHistory. The 2026-10-16 recovery audit restored 64 accounts from verified history/contract evidence; 237 QM accounts still had blank addresses in the then-current snapshot. Some source candidates remain unverified. Do not state that all remaining blanks are unrecoverable or that every CRM blank was blank in Salesforce.
- [x] **Describe the two different “Contract” concepts.** The Won-stage **Contract** field is a free-text outcome field. The multi-year Contract tab/list is currently hidden (`SHOW_CONTRACT = false`). The guide's instruction to “record Contract” can make users expect a searchable contract list that they cannot open. Say where the free-text field appears and that no contract directory is currently available.
- [x] **Add the “missing Won record” decision path.** Explain that a missing Funnel/quotation can result from the wrong active entity, list filters, the current owner scope, or an ownership mismatch between imported Salesforce Account and Quote data. Funnel search matches the Funnel name only. Tell sales users to clear filters and ask an administrator to check the exact Funnel/Opportunity/quotation ID and owner; do not advise casually transferring the Account because owner changes cascade to related records and can reset pending approvals.
- [x] **Clarify approval on behalf of someone.** The system has no documented proxy/delegation workflow. A request routes to the eligible manager defined by reporting line and approval permission; the approver acts as themselves. An eligible top manager can perform their own action directly. A colleague submitting under their own account routes according to that colleague's reporting line. Explicitly tell users not to share credentials or treat an informal “I will approve for you” as system delegation.
- [x] **Add the deferred cross-entity quotation import answer.** State that a QM quotation cannot currently be imported into QA as a new QA quotation; users must create it there manually until the import feature is planned and released. Do not imply that the current same-Funnel duplicate action copies across entities.
- [x] **Clarify reseller visibility versus deal visibility.** All account managers in the entity can select shared reseller account/contact master data, while sales transactions remain owner-scoped. Managers with the team-record permission see their reporting subtree. A shared reseller record is not a shared Funnel.
- [x] **Explain the account/contact default for reseller quotes.** Changing Bill To resets the Attention contact selection. Choose a contact belonging to the selected Bill To company; for Uniti-through-MCMC, use a Uniti contact, not an MCMC contact.
- [x] **Clarify project-code labels in one place.** The original Salesforce Project code and Cross-deal project code are separate source fields; the CRM-generated code is a separate identifier. The Cross-deal column is useful only when populated/different. Codes are shown in the central directory only for accessible 4A/Won Funnels; earlier-stage values may remain stored but hidden.
- [x] **Document the current Expected close date filter interaction.** The year quick filter selects calendar years and combines with other filters. Users can also open a column-header filter. Funnel text search is name-only; it does not search Account, Opportunity, owner or other columns.
- [x] **Replace claims that status badges or sidebar entries are universal.** UI access depends on active organization, module entitlement, permissions, record scope, record status, and current stage. Prefer “if you have permission and the feature is enabled” where a control is conditional.

## Implementation cross-check

| Topic | Current implementation checked | Audit verdict |
| --- | --- | --- |
| Reseller quotation | Funnel remains with end user; Bill To account/contact and billing snapshot are stored on each quotation. | Correctly described by newer quotation source; absent on live GitBook. Improve contact-picker explanation. |
| Reseller master access | Reseller account/contact master data is shared in-entity; Funnel/Opportunity/Quotation reads remain owner/team scoped. | Newer account/roles source is substantially correct; live roles page is stale. |
| Account addresses | Account address is used to build quotation billing snapshot; source recovery can use verified Salesforce history and Contract Bill_To__c. | Public guide lacks recovery context and snapshot implications. |
| Sales visibility | Sales roles see their own records; team visibility follows the explicit team-record permission and reporting subtree. | Newer source correct; live Rep/Senior Rep scope is wrong. |
| Approval routing | Lead conversion, stage changes and quote approvals use reporting-manager routing; matching-permission top managers with no superior may act directly. Quotes route by submitter, with a legacy Funnel-owner fallback. | Newer reference is substantially correct; live page is stale. Add “no proxy approval” explanation. |
| Approval inbox | One queue/review panel includes quote, lead conversion and funnel-stage requests; oldest first. | Newer guide describes it; live GitBook still documents old stage-only tabs. |
| Quote recall | Authorized editor can recall Pending Approval to Draft, edit, and resubmit with the same quote number. | Newer guide correct; not present on live page. |
| Quote duplication | Duplicate action creates a new Draft within the same Funnel only. | Newer guide correct; live page omits it. Cross-entity import remains deferred. |
| Quote numbering | Deleted issued numbers remain reserved; the next version advances. | Newer guide correct; live page omits the current rules. |
| Expected close year | Funnel List and Board can filter by Expected close calendar year; no-date funnels drop out while selected. | Newer Funnel guide correct. Add current header-filter entry point and keep name-only search clear. |
| Payment milestones | Explicit creation after Accepted quotation and stage 4A/Won; no automatic schedule or status transition; statuses Pending invoicing/Invoiced. | Newer guide correct; public site materially wrong. |
| Project codes | Central searchable page works without Projects module; source identifiers retained separately; active display requires 4A/Won and record access. | Newer guide correct; live page not current. |
| Funnel Contract field | Won-stage free text field exists, but contract-year tab/list is hard-disabled in the current detail UI. | Missing user-facing distinction; add it. |
| Advanced filters and columns | Nested AND/OR, per-user columns and saved views are available; latest table UI uses column-header filters. | Workspace source documents old toolbar labels; update. |
| Historical audit notes | `docs/gitbook-stage-audit.md` is dated 2026-10-02 and still describes KIV reopen approval as broken. | Internal record needs a superseding status note; current stage service applies valid, current reopen requests. |

## User-facing Q&A for team records

### How should I quote through a reseller?

Keep the Opportunity and Funnel under the end user, following the existing practice. Create the quotation from that Funnel, choose the reseller in **Bill To**, then choose an **Attention** contact from that reseller. For a Uniti Office → MCMC deal, the Funnel belongs under MCMC, while Uniti Office receives the quotation and pays Quandatics. Several reseller quotations can sit under the same end-user Funnel; each quotation stores its own Bill To details.

### Why can’t I find the reseller’s contact in the quotation?

The contact list follows the selected Bill To company. Select the reseller as Bill To first, then choose one of its contacts. Changing Bill To clears the previous Attention selection so the quote cannot silently retain a contact from the wrong company.

### Where does the address on a quotation come from?

The quote uses the address saved on its Bill To account and stores that billing information with the quotation. There is no separate quotation-address field. Check the account address before preparing the quote. If the address is blank, the PDF may also be blank; ask an administrator to check the available Salesforce source evidence. A corrected account address should be reviewed on a new or editable Draft; an issued quote keeps its saved snapshot.

### Why are some CRM account addresses blank?

The imported Account CSV did not contain standard billing-address columns, but other Salesforce exports can hold billing text. Verified history and contract billing data were used to restore 64 accounts in the 2026-10-16 audit. The then-current QM snapshot still had 237 accounts with blank address fields. Those blanks need source-by-source review; they do not prove Salesforce had no address, and not every unstructured mention is safe to import as a billing address.

### Why can’t I see a Won Funnel such as Uniti/MCMC?

First check the active organization, clear the Funnel filters, and search the Funnel name. Funnel search does not search account or contact names. Sales users can see only their own sales records; managers can also see records in their reporting subtree when team visibility is assigned. A reseller account being shared does not make its Funnels shared. If it is still missing, give an administrator the exact Funnel, Opportunity or quotation number so they can check its owner and entity. Salesforce Account ownership and quotation ownership can differ, so do not assume the account owner identifies the Funnel owner.

### Can someone approve a quotation for me?

The app routes a submitted quotation to the eligible manager in the submitter's reporting line. The assigned reviewer opens the approval request and decides it using their own account. There is no proxy or credential-sharing workflow. A manager who has quotation-approval permission and no manager above them may approve their own Draft directly; a manager with a superior submits for approval. For legacy pending quotes without a recorded submitter, routing may use the Funnel owner.

### Where do managers approve quotations?

Open **Sales → Approvals → Needs my review**, then select the quotation request and review it in the panel. Managers can also review an eligible quotation from its own page. **My requests** is for tracking requests the member submitted; it is not the incoming approval queue.

### Can I duplicate a quotation into QA from QM?

No. Duplicate quotation is limited to the same Funnel and starts a new Draft. Cross-entity quotation import was deferred and is not currently available. Until that feature is implemented, create the QA quotation in QA and select the appropriate QA Funnel.

### When does a payment milestone appear?

Only after a customer has Accepted a quotation and the Funnel is at 4A or Closed Won. A user creates the schedule explicitly; neither entering 4A nor winning the deal creates it. New milestones start **Pending invoicing**. An authorized user changes that status to **Invoiced** after billing. Won does not change milestone status.

### Where can I see Contract information?

The Won-stage **Contract** field is a free-text note on the Funnel. The separate multi-year Contract tab/list is currently hidden, so there is no central Contract directory to browse. Do not confuse the Contract field with a Project code or with the optional Projects module.

### Where do I find a Project code?

Open **Sales → Project Codes** or use global search. The page is available without enabling the Projects module. Codes are visible only for accessible Funnels at 4A or Closed Won. Earlier-stage Salesforce values may remain stored but are hidden until the Funnel becomes eligible. The imported Project code, optional Cross-deal code, and CRM-generated code are distinct identifiers.

### How do I filter a Funnel by expected close year?

Use the **Expected close year** filter and select a calendar year. It works with the other Funnel filters and removes records with no expected close date until the year filter is cleared. You can also open a filter from a column header. Search matches Funnel names only.

## Follow-up and ownership

- [ ] Republish the updated source docs and run a human review of all affected public pages.
- [x] Correct the source-document gaps above and add the team Q&A.
- [ ] Verify the merged documentation is the published content in all four GitBook sections.
- [ ] Ask a business owner to confirm the intended support wording for the Uniti/MCMC missing-Won case after an administrator checks the exact record and owner.
- [ ] Confirm the public account-address wording with the completed PR #271 source recovery and the latest production counts before publishing any changing count. Prefer keeping the 64/237 figures in an internal dated record rather than permanent user instructions.
- [ ] Record a short reseller-quotation walkthrough for the team after the published guide is corrected.

## Verification and publication status

The follow-up corrects the maintained source pages, navigation, quick start, references and FAQ. It also removes the duplicated Approvals/filter appendix from the Funnel guide and keeps Continue links at the end of relevant pages. Public instructions omit changing account-level recovery counts; dated recovery figures remain internal. The original Uniti/MCMC data case remains a separate record-identification task and is not marked resolved by these documentation changes.

GitBook administration opened to **Sign in to GitBook** in the available browser. There is no authenticated publication session here. After merge, an authorized GitBook administrator should confirm that the site syncs `Super-ERP/crm-v2`, branch `main`, and that all four content areas in `gitbook-docs.yaml` are mapped. The root `.gitbook.yaml` maps only the standalone Getting Started source; verify the actual integration before changing either configuration. Then publish/sync and verify the public page text and navigation against the checklist.

## Pages inspected

- [Q-App welcome page](https://jienweng.gitbook.io/q-app)
- [Accounts & contacts](https://jienweng.gitbook.io/q-app/docs/customer-records/03-accounts-and-contacts)
- [Opportunities & sales funnel](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel)
- [Quotations & revisions](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions)
- [Payment milestones](https://jienweng.gitbook.io/q-app/docs/sales/06-payment-milestones)
- [Stage approvals](https://jienweng.gitbook.io/q-app/docs/sales/08-approvals-inbox)
- [Roles & RBAC](https://jienweng.gitbook.io/q-app/docs/administration/roles-and-rbac)
- [Frequently asked questions](https://jienweng.gitbook.io/q-app/docs/help/faqs)
- [Workspace & personal views](https://jienweng.gitbook.io/q-app/getting-started/01-workspace-and-views)


## Second review — October 16

Rechecked PR #272 after its first quality check passed. Additional source corrections:

- [x] Remove the non-existent quotation-page milestone editor from the procedure; use the eligible Funnel tab and exact Add milestone control. Explain that it creates a zero-amount row immediately and each field saves inline.
- [x] Correct the overview diagram: customer acceptance plus 4A/Won permits explicit schedule creation; recording the Funnel outcome is separate.
- [x] Make the unified approval-review procedure cover quotation and lead conversion as well as stage requests.
- [x] Distinguish approved outcomes, dynamic quotation/lead reviewer routing, stored stage assignment, and account-owner changes.
- [x] Add glossary entries for end user/reseller/Bill To, Project codes/Cross-deal references and Contract; expand Saved view to include the complete layout.
- [x] Add a concrete missing-record support checklist to improve handover and avoid speculative ownership changes.

The public Approvals page was opened again and still showed the old Stage approvals title. Publication remains a separate outstanding step. This second review does not certify every tenant’s configuration or claim that the unidentified Uniti/MCMC record has been resolved.

Validation: 26 mapped Markdown pages and 233 link references checked for local paths and resolvable source anchors, balanced GitBook blocks/details/code fences, and one H1. `git diff --check` passed. Application behavior was read from source; no customer records or settings were changed.


### Remaining business-policy questions

The guide describes these current implementation limits explicitly; documentation cannot define a different result without a product change:

- Replacing an Accepted quotation: a revision can be prepared, but cannot be accepted while another non-deleted quotation remains Accepted. A supersession/cancellation policy is needed.
- Tax changes after approval: sending captures the current tax configuration and recomputes totals. Decide whether changed totals should invalidate approval or whether approval freezes the reviewed tax/totals.
- Stage completeness: Board and detail workflows use different qualification shortcuts; Won's own outcome fields are not enforced on entry. A consistent gate policy remains a product decision.

Final wording clarification: defined “live quotation” as non-deleted, “eligible top manager” by active membership/approval permission/reporting configuration, and milestone net value as the Accepted quotation’s value after discounts excluding tax.
