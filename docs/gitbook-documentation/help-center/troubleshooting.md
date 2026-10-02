---
description: Find the next step when a record is missing, a stage is blocked, or a quote cannot be edited.
icon: wrench
---

# Troubleshooting

Start with the problem that matches what you see. Keep the exact error message; it can identify the missing field or permission.

## Find your problem

* [A module, button, or record is missing](#a-module-button-or-record-is-missing)
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

If approval is required, check **Sales → Approvals → My requests**. The approver uses **Incoming**.

{% endstep %}
{% step %}

#### Check for a closed deal

If the deal is Closed Won or Closed Lost, it cannot change stages. For a new sales pursuit, create a new opportunity rather than trying to reopen it.

{% endstep %}
{% endstepper %}

**Expected result:** an eligible change succeeds, or a pending request clearly identifies the next approver.

See [Stage movement](../04-opportunities-and-funnel.md#stage-advancement-and-rollback-rules) and [Stage approvals](../08-approvals-inbox.md).

### PPVVC looks complete but the move is blocked

Check the exact missing field, not only the completion badge. Power Sponsor notes do not select **Power Sponsor Contact** or enter a positive **Power Sponsor Budget Limit**. Opportunity and funnel close-date fields are separate. Save the fields on the correct record and refresh before retrying. See the [stage matrix](../04-opportunities-and-funnel.md#fields-and-gates-by-stage).

### A KIV reopen request became obsolete

The current approval handler can close KIV-to-open requests as obsolete because it treats reopening as rollback. Ask an authorized stage approver to review and reopen directly. See [KIV](../04-opportunities-and-funnel.md#kiv-keep-in-view).

### A stage advances without the expected PPVVC fields

Check whether the move came from the Kanban board, which skips certain qualification presets, or used the Won shortcut. Administrators should also inspect **Funnel Stages**: newly created organizations may have empty required-field lists. These are separate from approval flags.

## A quotation cannot be edited

Only a **Draft** quotation is editable. Choose the action that matches its current status:

| Status | Next step |
| --- | --- |
| Pending Approval | Wait for the review. A rejection returns it to Draft with a reason. |
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

Check the milestone's current status. Only **Won → Invoiced** is an allowed manual status change.

{% endstep %}
{% step %}

#### Check the linked funnel

If it is **Planned**, check the linked funnel. Planned milestones become Won when that funnel reaches Closed Won.

{% endstep %}
{% step %}

#### Check whether billing is already recorded

If it is already **Invoiced**, the status cannot be reverted.

{% endstep %}
{% step %}

#### Check the interface limitation

The current repository screens show status badges without a status-editing control. If your deployed version also has no action, contact your administrator or support team; this is not necessarily a permission issue.

{% endstep %}
{% endstepper %}

{% hint style="warning" %}
Record the customer's actual commercial outcome. Do not close a deal as Won just to enable a milestone action.
{% endhint %}

**Expected result:** an authorized user records billing on an eligible Won milestone. The milestone status does not issue an invoice or receipt.

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
