---
description: Short answers about conversion, permissions, stages, quotation revisions, and billing milestones.
icon: circle-question
---

# Frequently asked questions

For step-by-step help with a blocked action, open [Troubleshooting](troubleshooting.md).

## Leads and customer records

<details>
<summary>What does converting a lead create?</summary>

The conversion flow links or creates the account, creates the contact, and creates the sales pursuit. Review the information before confirming. The converted lead links to the resulting records and cannot be converted again.

See [Lead conversion](../02-leads-management.md#converting-a-lead).

</details>

<details>
<summary>Why does an account need a currency?</summary>

The account currency establishes the currency used for related commercial records. Check it before preparing quotations; changing an account is not a substitute for reviewing existing quote amounts.

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

An open deal can move to an earlier open stage. A parked/KIV deal uses the reopen approval policy. The current queued-review path can mark this request obsolete; an authorized stage approver can reopen directly. See [KIV](../04-opportunities-and-funnel.md#kiv-keep-in-view). Closed Won and Closed Lost are terminal and cannot change stage.

See [Stage movement](../04-opportunities-and-funnel.md#stage-advancement-and-rollback-rules).

</details>


## Quotations and approvals

<details>
<summary>Can I send a draft quotation?</summary>

A quotation must be approved before it can be sent. Submit the draft for approval and use **Send** after approval, with the required permissions.

See [Quotation lifecycle](../05-quotations-and-revisions.md#the-quotation-lifecycle).

</details>

<details>
<summary>How do I change a quote that is already approved or sent?</summary>

An Approved quote can be returned to Draft and must be approved again before sending. A Sent quote can create a separate draft revision; the original is preserved. Live Pending Approval and Approved quotes are not eligible for the historical revision action.

See [Managing revisions](../05-quotations-and-revisions.md#managing-revisions).

</details>

<details>
<summary>Where do I approve a quotation?</summary>

The eligible reporting manager reviews quotation approval on the quotation itself. This is the first active manager in the account owner’s reporting line with quotation approval permission. **Sales → Approvals** handles funnel stage requests, with **Incoming** and **My requests** tabs.

See [Quotations](../05-quotations-and-revisions.md) and [Stage approvals](../08-approvals-inbox.md).

</details>

<details>
<summary>Does accepting a quotation close the funnel as Won?</summary>

Accepting the quotation records customer acceptance. It does not automatically change the funnel stage. Record the funnel's outcome separately, following its stage requirements.

See [Opportunities & sales funnel](../04-opportunities-and-funnel.md).

</details>

## Payment milestones

<details>
<summary>When does a payment milestone become Won?</summary>

Live Planned milestones become Won when their linked funnel closes Won. A milestone created for an already won funnel starts as Won. Invoiced milestones retain their status.

See [Milestone statuses](../06-payment-milestones.md#milestone-statuses).

</details>

<details>
<summary>Does marking a milestone Invoiced generate an invoice?</summary>

No. The supported manual transition is **Won → Invoiced** after billing. The current repository screens do not expose a status-editing control; contact your administrator if your deployed version also has no action. Payment milestones are planning records; they do not create or update invoices or receipts.

See [Payment milestones](../06-payment-milestones.md).

</details>

## Continue

* [Troubleshooting](troubleshooting.md)
* [Quick start by role](https://jienweng.gitbook.io/q-app/getting-started/quick-start)
* [Back to start](https://jienweng.gitbook.io/q-app)
