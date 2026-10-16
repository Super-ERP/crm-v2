---
description: Know what each record or document allows, who decides, and which quotation version is approved.
icon: file-check
---

# Documents, actions, and approval

This reference covers the active Base modules and Advanced Roles. Check the exact record, quotation number, version, and status before taking an action. A role title, a PDF, and customer acceptance each answer a different question from internal approval.

## Which items need approval?

| Item | What you can do with the right permissions and record access | What is approved? |
| --- | --- | --- |
| Lead | Capture, qualify, edit, and convert to linked customer and sales records. | Conversion requires reporting-manager approval before linked records are created, unless the initiating member has **Approve lead conversions** and no superior. |
| Account and contact | Maintain customer details and ownership. | Saving these records has no separate manager-approval flow. |
| Opportunity and funnel | Maintain qualification, deal details, and follow-ups; request a stage change. | A configured stage gate can require approval of one specific stage transition. |
| Quotation | Prepare a Draft, submit it, record sending, record the customer decision, and create eligible revisions. | The eligible manager approves the specific quotation record before it can be sent. |
| Quotation PDF | Preview or export the quotation being viewed. | Exporting a PDF does not approve the quotation or record sending. Check the quotation's status separately. |
| Supporting attachment | Add or review supporting files where the record's interface and your permissions allow. | A file supports the record or request; uploading it does not create a separate file-approval decision. |
| Payment milestone | Configure an agreed schedule after customer acceptance at stage 4a or Won, then record invoicing. | There is no separate milestone-approval inbox. Statuses are Pending invoicing and Invoiced; closing Won does not change them. |
| Product | Maintain catalog entries used to prepare quotation lines. | Saving a catalog entry has no separate manager-approval flow. |

A saved record is not necessarily approved. A manager's quotation approval does not approve a stage request, and an approved stage request does not approve the quotation.

## Who can decide?

| Decision | Required capability | Routing and place to act |
| --- | --- | --- |
| Approve or reject lead conversion | **Approve lead conversions**, access to the lead and destination account, and current eligible-manager status | First active eligible manager in the requester's reporting line; act in **Sales → Approvals → Needs my review**, filtered to **Lead conversions** or the lead detail request card. |
| Approve or reject quotation approval | **Approve quotations**, access to the quotation, and current eligible-manager status | First active manager in the **submitter's** reporting line (legacy requests without submission audit data use the funnel owner) with that permission; act in **Sales → Approvals → Needs my review**, filtered to **Quotations** or on the Pending Approval quotation. |
| Approve or reject a stage request | **Approve stage advances**, assignment to that pending request, and current eligible-manager status | First active manager in the **requester's** reporting line with that permission; act in **Sales → Approvals → Needs my review**. |
| Record customer acceptance or rejection | **Accept quotations** and access to the quotation | Act on the **Sent** quotation after the customer responds. This records the customer's decision; it is not manager approval. |
| Record sending | **Send quotations** and access to the quotation | Act on an **Approved** quotation whose funnel remains open and whose validity date has not passed. |

Permissions from assigned roles count together. The nearest manager is skipped if inactive or missing the required approval permission, and the app checks higher managers in the same reporting line. If a superior is configured but none in the reporting line qualifies, submission is blocked. A member with the matching approval permission, an active reporting profile and no superior may proceed directly. A salesperson without that approval permission cannot bypass approval merely because no manager is configured. It does not fall back to an unrelated Owner or administrator.

No requester can approve or reject their own queued lead-conversion, quotation or stage request, including platform superadmins. Requester cancellation/recall remains available where authorized. Eligible top managers use direct conversion, Draft quotation approval or a direct stage move instead. Platform superadmins retain an operational override for direct actions and other users' requests; the organization's Owner role is not that override.

See [Routing examples](permissions-and-approvals.md#routing-examples) and [Quotation actions by status](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions#actions-by-status).

## Which version is approved?

Approval belongs to the quotation record you submitted, identified by its displayed quotation number and version. It is not a blanket approval for every quotation in the same funnel.

| Situation | What happens to approval? | Your next action |
| --- | --- | --- |
| A quotation is Pending Approval | Its content is read-only while the manager reviews it. | Confirm that the manager is reviewing the intended number and version. |
| A manager rejects approval | That same quotation returns to Draft; a reason is required. | Read the reason, edit, and resubmit. |
| An Approved quotation needs editing | Returning it to Draft clears its approval. | Edit and obtain approval again before sending. |
| A Sent or Accepted quotation needs new terms | An eligible revision creates a separate Draft with a new number/version and no approval. | Review the copied details and validity date, then submit that revision. The original retains its status. |
| The Account owner changes during approval | Pending quotation approval is cleared and the quotation returns to Draft. | The new owner resubmits through their eligible manager. |
| A new PDF is exported | Exporting does not transfer or create approval. | Check the PDF's quotation identity against the record you intend to send. |

**Example:** version 1 is Sent. You create version 2 to change pricing. Version 2 starts as Draft even though version 1 was approved. Submit version 2, obtain its approval, and record sending version 2. Customer acceptance of version 1 does not accept version 2. If version 1 is already Accepted, the current workflow blocks accepting version 2 while the earlier live acceptance remains; creating a revision does not resolve that restriction.

Quotation templates change the presentation, not the approval route. Setting a quotation as Primary is also separate from approval; a new revision starts non-primary. Check the funnel's chosen primary quotation when comparing values.

## Review the right thing

{% stepper %}
{% step %}

#### Identify the item and requested decision

Check whether you are reviewing a lead conversion, a quotation, a stage request, or a customer's response. Open the relevant record rather than relying on a downloaded file alone.

{% endstep %}
{% step %}

#### Check identity and current state

For a lead conversion, expand the saved conversion details and verify the contact, destination account, new company code/address, opportunity, funnel and expected close date. No linked records should be created while the request is pending. For a quotation, verify its number, version, customer, currency, status, line items, tax, total, terms, recipient, and validity date. For a stage request, verify the funnel, current stage, requested target, required information, and supporting attachments.

{% endstep %}
{% step %}

#### Confirm authority and decide

Use the appropriate approval action only when you are the eligible reviewer. Quotation and lead-conversion rejection require a reason. Stage decision notes are optional, but explain what must change when rejecting.

{% endstep %}
{% step %}

#### Check the result

Verify the updated record status. Lead conversion and its approval commit together; a changed lead must be cancelled and resubmitted rather than approving stale details. An obsolete stage request does not apply its old transition. Before sharing a quotation PDF, check the final exported number, version, currency, totals, and terms against the intended record.

{% endstep %}
{% endstepper %}

## Continue

* [Permissions and approval routing](permissions-and-approvals.md)
* [Quotations and revisions](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions)
* [Approvals inbox](https://jienweng.gitbook.io/q-app/docs/sales/08-approvals-inbox)
