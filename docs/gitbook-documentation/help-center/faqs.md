---
description: Short answers about conversion, permissions, stages, quotation revisions, and billing milestones.
icon: circle-question
---

# Frequently asked questions

For step-by-step help with a blocked action, open [Troubleshooting](troubleshooting.md).

## On this page

* [Leads and customer records](#leads-and-customer-records)
* [Sales stages](#sales-stages)
* [Quotations and approvals](#quotations-and-approvals)
* [Payment milestones](#payment-milestones)
* [Reseller quotations and addresses](#reseller-quotations-and-addresses)
* [Approval and quotation follow-up](#approval-and-quotation-follow-up)
* [Contracts, Project codes and list controls](#contracts-project-codes-and-list-controls)

## Leads and customer records

<details>
<summary>What does converting a lead create?</summary>

After reporting-manager approval, the conversion form links or creates the account, creates a new contact, and creates the opportunity and first funnel. A member with **Approve lead conversions** and no superior can perform the conversion directly. Pending requests create none of these records. The server also supports conversion without a sales pursuit, but the current form requests one. Review the information before confirming. The converted lead links to the resulting records and cannot be converted again.

See [Lead conversion](../02-leads-management.md#converting-a-lead).

</details>

<details>
<summary>Why does an account need a currency?</summary>

The account currency supplies a default for related commercial records. Check it before preparing quotations; changing an account is not a substitute for reviewing existing quote amounts.

See [Accounts & contacts](../03-accounts-and-contacts.md).

</details>

<details>
<summary>Why can I see a record that a colleague cannot see?</summary>

Visibility depends on permissions, record ownership, reporting relationships, and the active organization. Module availability can also depend on enabled modules. Role names alone do not describe every access rule.

See [Missing records](troubleshooting.md#a-module-button-or-record-is-missing).

</details>

## Sales stages

<details>
<summary>What does PPVVC mean?</summary>

**Power Sponsor, Pain, Vision, Value, and Control.** These fields capture the buyer, business problem, agreed solution, value, and buying process.

See [PPVVC qualification](../04-opportunities-and-funnel.md#the-ppvvc-qualification-framework).

</details>

<details>
<summary>Can I move a deal backward or reopen it?</summary>

An open deal can move to an earlier open stage. A parked/KIV deal uses the reopen approval policy. The assigned eligible reviewer can approve the reopen; a member with stage-approval permission and no superior can reopen directly. Managers with a superior require approval. See [KIV](../04-opportunities-and-funnel.md#kiv-keep-in-view). Closed Won and Closed Lost are terminal and cannot change stage.

See [Stage movement](../04-opportunities-and-funnel.md#stage-advancement-and-rollback-rules).

</details>


<details>
<summary>How do I track or correct a lead-conversion request?</summary>

Open **Sales → Approvals → My requests**, filtered to **Lead conversions**. While pending, the lead remains unconverted. You may cancel your own request, correct the lead or conversion details, and submit again. A rejected request includes the required reason and creates no linked records. Changing the lead after submission makes approval fail until the request is cancelled and resubmitted.

</details>

## Quotations and approvals

<details>
<summary>Can I send a draft quotation?</summary>

A quotation must be approved before it can be sent. Submit the draft for reporting-manager approval, or use **Approve quotation** if you have approval permission and no superior. Use **Send** after approval, with the required permissions.

See [Quotation lifecycle](../05-quotations-and-revisions.md#the-quotation-lifecycle).

</details>

<details>
<summary>How do I change a quote that is already approved or sent?</summary>

An Approved quote can be returned to Draft and must be approved again before sending. A Sent quote can create a separate draft revision; the original is preserved. Live Pending Approval and Approved quotes are not eligible for the historical revision action.

See [Managing revisions](../05-quotations-and-revisions.md#managing-revisions).

</details>

<details>
<summary>Where do I approve a quotation?</summary>

The eligible reporting manager reviews quotation approval on the quotation itself. This is the first active eligible manager in the submitter’s reporting line with quotation approval permission. **Sales → Approvals** includes quotation, funnel-stage and lead-conversion requests in both **Needs my review** and **My requests**. Managers select a request and approve or reject it in the review panel; eligible requesters can recall pending quotations.

See [Quotations](../05-quotations-and-revisions.md) and [Approvals inbox](../08-approvals-inbox.md).

</details>

<details>
<summary>Does accepting a quotation close the funnel as Won?</summary>

Accepting the quotation records customer acceptance. It does not automatically change the funnel stage. Record the funnel's outcome separately, following its stage requirements.

See [Opportunities & sales funnel](../04-opportunities-and-funnel.md).

</details>

## Payment milestones

<details>
<summary>When does a payment milestone become available?</summary>

Configure milestones explicitly after the quotation is customer Accepted and the funnel is at 4a or Closed Won. New milestones start Pending invoicing; **Mark invoiced** records billing. Closing the funnel Won does not change milestone status or create a schedule.

See [Milestone statuses](../06-payment-milestones.md#milestone-statuses).

</details>

<details>
<summary>Does marking a milestone Invoiced generate an invoice?</summary>

No. Use **Mark invoiced** after billing on an eligible **Pending invoicing** milestone. These planning records do not create or update invoices or receipts.

See [Payment milestones](../06-payment-milestones.md).

</details>

## Reseller quotations and addresses

<details>
<summary>Should I create the Funnel under the reseller or the end user?</summary>

Keep the Opportunity and Funnel under the **end user**. On each quotation, select the paying reseller in **Bill To** and an **Attention** contact from that reseller. For example, keep a Uniti Office → MCMC pursuit under MCMC and bill Uniti Office. This is the existing end-user practice; choosing Bill To does not move the Funnel or transfer its owner.

For five resellers on the same pursuit, prepare five quotations under the same Funnel, each with its own Bill To. Use **Duplicate quotation** to start another Draft in that Funnel, then review the billing company, contact, dates, items and terms.

See [Bill To when quoting through a reseller](../05-quotations-and-revisions.md#bill-to-when-quoting-through-a-reseller).

</details>

<details>
<summary>Why can I only select contacts from one company?</summary>

Attention choices belong to the selected **Bill To** company. Select the reseller first to load its contacts. Changing Bill To clears the old selection; check the contact before saving. Shared reseller accounts and contacts are available within the active entity, while the related sales records still follow ownership/team access.

</details>

<details>
<summary>Where does the quotation address come from, and can I quote without it?</summary>

The quotation saves billing information from its selected Bill To account. There is no separate quotation-address field. The form permits saving without a complete address, so Preview can contain a blank address. Complete the account address before sharing a quotation when your business process requires it.

Updating the account alone does not rewrite an issued quotation. Save an editable Draft again and inspect Preview; use Recall to Draft, Return to Draft or an eligible revision according to the quotation status.

</details>

<details>
<summary>Does a blank CRM address mean Salesforce had no address?</summary>

No. The available Account export lacks standard billing-address columns, but account history and contract billing text can contain addresses. Support can review verified source values, report conflicts and preserve manually entered addresses. Some remaining source text needs review and some addresses may be unavailable. A company name or an email signature alone does not establish the correct billing address.

See [Missing address troubleshooting](troubleshooting.md#an-account-or-quotation-address-is-missing).

</details>

<details>
<summary>Why can't I find a Won deal under a reseller, such as Uniti/MCMC?</summary>

The Funnel should be under the end user, while the reseller appears as Bill To on the quotation. Check the active entity, clear filters and search the **Funnel name**; use Account filters for the end user. Sales users see only their own sales records, and managers with team access also see their reporting subtree. A shared reseller account does not share its sales transactions.

If the deal is still missing, give support its exact Funnel, Opportunity or quotation number and expected owner. Salesforce Account ownership and quotation ownership can differ. Support must identify the source and current record before correcting ownership; changing an Account owner also changes related records and pending approvals.

</details>

## Approval and quotation follow-up

<details>
<summary>Can another manager approve on behalf of the usual reviewer?</summary>

There is no proxy-approval action. The current eligible reviewer decides using their own account. Sharing a PDF for advice does not transfer authority. Ask an administrator to review reporting lines and permissions when the expected reviewer is unavailable.

A manager with the matching approval permission and no manager above them can perform their own action directly; a manager with a superior submits for approval. A colleague submitting a quotation uses that colleague's reporting line. See [Approval routing](https://jienweng.gitbook.io/q-app/reference/permissions-and-approvals).

</details>

<details>
<summary>Can I recall a pending quotation and edit it?</summary>

With quotation-edit permission and record access, use **Recall to Draft**, edit, and submit again. It retains its existing quotation number. An Approved quotation uses **Return to Draft** and needs approval again after edits. A Sent quotation needs an eligible separate revision.

</details>

<details>
<summary>Can I import a QM quotation into QA?</summary>

Cross-entity quotation import is not currently available. **Duplicate quotation** creates a new Draft in the same Funnel only. Create the quotation in the destination entity and Funnel until an import workflow is released.

</details>

<details>
<summary>Will deleting a quotation free its number for reuse?</summary>

No. Issued numbers remain reserved, including deleted Drafts. The next quotation in that Funnel uses the next version after the highest version ever issued. Recall and Return to Draft keep the existing number. Accepted quotations cannot be deleted; other deletions still require permission and pass reference checks.

See [Numbering examples](../05-quotations-and-revisions.md#delete-quotations-and-preserve-numbering).

</details>

## Contracts, Project codes and list controls

<details>
<summary>Is there a Contract list?</summary>

There is no central Contract directory or visible multi-year Contract tab in this rollout. **Contract** is a free-text field in the Funnel's standard Closed Won stage configuration. Select that stage on the stage path to inspect its configured fields; this does not change the Funnel's stage. Use Documents for supporting files when permitted.

See [Contract information](../04-opportunities-and-funnel.md#contract-information).

</details>

<details>
<summary>Can I find Project codes without enabling Projects?</summary>

Yes. **Sales → Project Codes** and global search provide a linked code directory without the Projects module. Codes appear only for accessible Funnels at 4A or Closed Won. Earlier-stage values can remain stored but hidden. Enabling Projects alone creates no delivery Project records.

One main **Project code** is shown, using the original source code when available. A **Cross-deal reference** appears only when it differs. The CRM-generated identifier remains separate and supplies a fallback where the original code is absent. See [Project codes](../04-opportunities-and-funnel.md#project-codes-across-sales-records).

</details>

<details>
<summary>How do I filter by expected close year or combine AND/OR rules?</summary>

Use **Expected close year** on Funnel to select calendar years, or click the Expected close date header and choose a year condition. Column-header menus let you add conditions and nested groups using **Match all (AND)** and **Match any (OR)**. Apply filters, then use the active chips to edit or remove them. Funnel search matches names only. Records without an expected close date are excluded while a year is selected.

</details>

<details>
<summary>Are table columns and filters saved for everyone?</summary>

No. Personal layouts and named Views belong to your member account and organization. Views save filters, sorting, page size, column visibility, order, widths and pinning. Selecting a view never expands the records you are authorized to read. Table layouts do not change quotation PDFs or editable quotation line grids. See [Workspace and personal views](https://jienweng.gitbook.io/q-app/getting-started/01-workspace-and-views).

</details>

## Continue

* [Troubleshooting](troubleshooting.md)
* [Quick start by role](https://jienweng.gitbook.io/q-app/getting-started/quick-start)
* [Back to start](https://jienweng.gitbook.io/q-app)
