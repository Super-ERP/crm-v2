---
description: Find the next step when a record is missing, a stage is blocked, or a quote cannot be edited.
icon: wrench
---

# Troubleshooting

Start with the problem that matches what you see. Keep the exact error message; it can identify the missing field or permission.

## Find your problem

* [A module, button, or record is missing](#a-module-button-or-record-is-missing)
* [An account or quotation address is missing](#an-account-or-quotation-address-is-missing)
* [A funnel stage change is blocked](#a-funnel-stage-change-is-blocked)
* [A quotation cannot be edited](#a-quotation-cannot-be-edited)
* [Account creation needs a currency](#account-creation-needs-a-currency)
* [A milestone cannot become Invoiced](#a-milestone-cannot-become-invoiced)
* [The quotation PDF looks wrong](#the-quotation-pdf-looks-wrong)

## A module, button, or record is missing

{% stepper %}
{% step %}

#### Check the active organization

Check the active organization in the sidebar.

{% endstep %}
{% step %}

#### Clear list filters

Clear search and filters, or switch back to an unfiltered list view.

{% endstep %}
{% step %}

#### Review access configuration

Ask your administrator to check your role permissions, reporting relationships, and enabled modules.

{% endstep %}
{% step %}

#### Identify the missing record

For a particular record, provide its name or identifier so your administrator can check ownership and access scope.

{% endstep %}
{% endstepper %}

**Expected result:** the record appears if you have access. If it still does not, your administrator can explain or correct the access configuration.

See [Workspace & personal views](https://jienweng.gitbook.io/q-app/getting-started/01-workspace-and-views) and [Administration & settings](../09-admin-and-settings.md).

### A Won Funnel or reseller deal is missing

Check the active entity, clear saved filters and search, and select the Won status/stage filter. Funnel search matches **Funnel names only**; typing a reseller or end-user account name will not find every related Funnel. Use the Account filter for the end user. A reseller is normally selected as Bill To on the quotation, while the Funnel stays under the end user.

Sales users see their own sales records; managers with team visibility can also see their reporting subtree. Seeing a shared reseller account does not reveal its other salespeople's deals. Give your administrator the exact Funnel/Opportunity/quotation number and expected salesperson to check ownership and entity. Salesforce Account and Quote owners can differ; a similar company name is not enough to identify a missing Won case.

Before transferring an Account, review the related-record impact: active child records change owner, pending stage requests are cancelled and pending quotations return to Draft. Correct ownership only after identifying the intended records.

### What to include when reporting a missing record

Include the active entity, module, exact record link or number, expected salesperson, current search/filters, and what you expected to see. For a reseller deal, provide both the end-user and reseller names. Support should compare the exact source and CRM records before changing ownership or recreating the deal.

## An account or quotation address is missing

* Open the quotation and check **Bill To**. For a reseller sale, inspect the reseller's account address, not only the end user's.
* Ask a user with account-edit access to complete the Billing Address. Shared reseller visibility alone does not grant permission to edit it. An optional Default end user is not required just to maintain a reseller address.
* Save an editable quotation Draft again, then inspect Preview. An issued quotation keeps its saved billing snapshot; use Recall/Return to Draft or an eligible revision according to its status.
* If the address is unknown, ask support to inspect the available Salesforce exports. Contract billing text and account history may contain recoverable values even when Account.csv has no billing-address columns. Conflicting or unverified text needs review; preserve manually entered addresses.

The current forms do not require a complete billing address before saving a quotation. A quote can therefore contain a blank address; review the business requirements and PDF before sharing it. There is no separate quotation-address input.

## A funnel stage change is blocked

{% stepper %}
{% step %}

#### Read stage requirements

Read the requirements shown in the stage-change dialog. Requirements are configured by your organization; do not assume every stage needs the same fields.

{% endstep %}
{% step %}

#### Save missing information

Complete the listed fields on the opportunity or funnel, save, and retry.

{% endstep %}
{% step %}

#### Check the approval request

If approval is required, check **Sales → Approvals → My requests**. The approver uses **Needs my review**.

{% endstep %}
{% step %}

#### Check for a closed deal

If the deal is Closed Won or Closed Lost, it cannot change stages. For a new sales pursuit, create a new opportunity rather than trying to reopen it.

{% endstep %}
{% endstepper %}

**Expected result:** an eligible change succeeds, or a pending request clearly identifies the next approver.

See [Stage movement](../04-opportunities-and-funnel.md#stage-advancement-and-rollback-rules) and [Approvals inbox](../08-approvals-inbox.md).

### PPVVC looks complete but the move is blocked

Check the exact missing field, not only the completion badge. Power Sponsor notes do not select **Power Sponsor Contact** or enter a positive **Power Sponsor Budget Limit**. Opportunity and funnel close-date fields are separate. Save the fields on the correct record and refresh before retrying. See the [stage matrix](../04-opportunities-and-funnel.md#fields-and-gates-by-stage).

### A KIV reopen request became obsolete

KIV reopening follows manager approval policy. The assigned eligible reviewer can approve a pending reopen; eligible top managers can reopen directly. A request becomes obsolete if its original transition is no longer current. See [KIV](../04-opportunities-and-funnel.md#kiv-keep-in-view).

### A stage advances without the expected PPVVC fields

Check whether the move came from the Kanban board, which skips certain qualification presets, or used the Won shortcut. Administrators should also inspect **Funnel Stages**: newly created organizations may have empty required-field lists. These are separate from approval flags.

## A quotation cannot be edited

Only a **Draft** quotation is editable. Choose the action that matches its current status:

| Status | Next step |
| --- | --- |
| Pending Approval | Wait for review, or use **Recall to Draft** with quotation-edit permission and record access. A rejection returns it to Draft with a reason. |
| Approved | Use **Return to Draft**, edit, and submit for approval again. |
| Sent, Accepted, Rejected, Expired, or Void | Use the revision action to create a separate Draft where permitted. |
| Draft, but actions are missing | Ask your administrator to check quotation update permissions and record access. |

**Expected result:** edits happen on an editable draft, with the original historical quotation preserved when a revision is created.

See [Managing revisions](../05-quotations-and-revisions.md#managing-revisions).

## Account creation needs a currency

{% stepper %}
{% step %}

#### Find the currency field

In the account form or lead conversion wizard, find **Currency**.

{% endstep %}
{% step %}

#### Choose a billing currency

Select the customer's billing currency before saving.

{% endstep %}
{% step %}

#### Ask about missing options

If the currency you need is unavailable, ask your administrator to review the configured options.

{% endstep %}
{% endstepper %}

**Expected result:** the account has a valid currency before you prepare related pricing.

See [Accounts & contacts](../03-accounts-and-contacts.md).

## A milestone cannot become Invoiced

{% stepper %}
{% step %}

#### Check the current status

Check the milestone's current status. Only **Pending invoicing → Invoiced** is an allowed manual status change.

{% endstep %}
{% step %}

#### Check the linked funnel

The quotation must be customer Accepted and the funnel at 4a or Closed Won. Moving below 4a, to Lost or On Hold blocks new invoicing. Closing Won does not change milestone status.

{% endstep %}
{% step %}

#### Check whether billing is already recorded

If it is already **Invoiced**, the status cannot be reverted.

{% endstep %}
{% step %}

#### Check permission and the action

Use **Mark invoiced** on the milestone detail or shared schedule. The action requires milestone-management permission and an eligible schedule. Ask your administrator to check these conditions if it is missing.

{% endstep %}
{% endstepper %}

{% hint style="warning" %}
Record the customer's actual commercial outcome. Do not close a deal as Won just to enable a milestone action.
{% endhint %}

**Expected result:** an authorized user records billing on an eligible Pending invoicing milestone. The milestone status does not issue an invoice or receipt.

See [Payment milestones](../06-payment-milestones.md).

## The quotation PDF looks wrong

{% stepper %}
{% step %}

#### Review the quotation preview

Open the quotation's **Preview** and review the template, recipient, items, totals, and terms.

{% endstep %}
{% step %}

#### Check the print preview

Open the print/PDF action and check the browser's print preview before saving.

{% endstep %}
{% step %}

#### Save and inspect the PDF

Choose **Save as PDF**. Check page breaks, clipped text, and all totals in the saved file.

{% endstep %}
{% step %}

#### Report remaining layout issues

If the issue remains, note the quotation number, selected template, browser, and the affected page when reporting it.

{% endstep %}
{% endstepper %}

**Expected result:** the saved PDF reflects the quotation preview and includes all pages you intend to share.

See [Printing a quotation](../05-quotations-and-revisions.md#exporting-client-pdfs).

## Still need help?

Send your administrator or support contact the module name, record identifier, exact error, and steps you took. If you include a screenshot, show the relevant area and remove unrelated customer or personal information.

* [Frequently asked questions](faqs.md)
* [Back to start](https://jienweng.gitbook.io/q-app)

## A lead-conversion request cannot be approved

* Check **Sales → Approvals → My requests**, filtered to **Lead conversions** and the lead detail request card.
* If the lead changed after submission, cancel the pending request and submit the current details again. The reviewer cannot approve the stale snapshot.
* Check that the requester remains active, has **Convert leads**, and can still access the lead and selected existing account. The reviewer needs **Approve lead conversions** and access to those records.
* A deleted, converted or disqualified lead cannot be converted through an old request. A new account code that has since been used must be corrected through a new submission.
* If the reporting line changes, lead-conversion and quotation review follows the current eligible manager. Stage requests also require their stored assigned reviewer, so cancel and resubmit a stale stage request.
* A manager with a superior still needs approval. If no superior is eligible, correct the reporting configuration; missing approval permission does not enable a direct action.
* Conversion and the decision are one transaction. A failed conversion leaves the request pending without partial linked records; resolve the error or cancel and resubmit.


## A Saved View no longer applies

A filter may refer to a field that was removed or is no longer available. The table keeps the current filters and asks you to update the view. Rebuild the unavailable condition, then choose **Views → Update with current settings**. Resetting the column layout changes columns only. If the layout cannot be saved, reading and filtering records remain available; check your write access before retrying.
