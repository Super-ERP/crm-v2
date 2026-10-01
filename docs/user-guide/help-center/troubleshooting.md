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

1. Check the active organization in the sidebar.
2. Clear search and filters, or switch back to an unfiltered list view.
3. Ask your administrator to check your role permissions, reporting relationships, and enabled modules.
4. For a particular record, provide its name or identifier so your administrator can check ownership and access scope.

**Expected result:** the record appears if you have access. If it still does not, your administrator can explain or correct the access configuration.

See [Workspace & personal views](../01-workspace-and-views.md) and [Administration & settings](../09-admin-and-settings.md).

## A funnel stage change is blocked

1. Read the requirements shown in the stage-change dialog. Requirements are configured by your organization; do not assume every stage needs the same fields.
2. Complete the listed fields on the opportunity or funnel, save, and retry.
3. If approval is required, check **Sales → Approvals → My requests**. The approver uses **Incoming**.
4. If the deal is Closed Won or Closed Lost, it cannot change stages. For a new sales pursuit, create a new opportunity rather than trying to reopen it.

**Expected result:** an eligible change succeeds, or a pending request clearly identifies the next approver.

See [Stage movement](../04-opportunities-and-funnel.md#stage-advancement-and-rollback-rules) and [Stage approvals](../08-approvals-inbox.md).

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

1. In the account form or lead conversion wizard, find **Currency**.
2. Select the customer's billing currency before saving.
3. If the currency you need is unavailable, ask your administrator to review the configured options.

**Expected result:** the account has a valid currency before you prepare related pricing.

See [Accounts & contacts](../03-accounts-and-contacts.md).

## A milestone cannot become Invoiced

1. Check the milestone's current status. Only **Won → Invoiced** is an allowed manual status change.
2. If it is **Planned**, check the linked funnel. Planned milestones become Won when that funnel reaches Closed Won.
3. If it is already **Invoiced**, the status cannot be reverted.
4. The current repository screens show status badges without a status-editing control. If your deployed version also has no action, contact your administrator or support team; this is not necessarily a permission issue.

{% hint style="warning" %}
Record the customer's actual commercial outcome. Do not close a deal as Won just to enable a milestone action.
{% endhint %}

**Expected result:** an authorized user records billing on an eligible Won milestone. The milestone status does not issue an invoice or receipt.

See [Payment milestones](../06-payment-milestones.md).

## The quotation PDF looks wrong

1. Open the quotation's **Preview** and review the template, recipient, items, totals, and terms.
2. Open the print/PDF action and check the browser's print preview before saving.
3. Choose **Save as PDF**. Check page breaks, clipped text, and all totals in the saved file.
4. If the issue remains, note the quotation number, selected template, browser, and the affected page when reporting it.

**Expected result:** the saved PDF reflects the quotation preview and includes all pages you intend to share.

See [Printing a quotation](../05-quotations-and-revisions.md#exporting-client-pdfs).

## Still need help?

Send your administrator or support contact the module name, record identifier, exact error, and steps you took. If you include a screenshot, show the relevant area and remove unrelated customer or personal information.

* [Frequently asked questions](faqs.md)
* [Back to start](../README.md)
