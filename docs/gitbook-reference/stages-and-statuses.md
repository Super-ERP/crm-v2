---
description: Understand the labels on funnel deals, quotations, and payment milestones.
icon: traffic-light
---

# Stages and statuses

A funnel stage, quotation status, and payment milestone status describe different records. Updating one does not necessarily update the others.

## Lead-conversion request statuses

A pending conversion request does not set the lead to Converted. The request has its own status:

| Request status | What happens to the lead and linked records |
| --- | --- |
| Pending | The saved conversion awaits review. The lead remains unconverted; no linked records are created. |
| Approved | Conversion and approval commit together; the lead becomes Converted and links to its resulting records. |
| Rejected | The required rejection reason is saved. No linked records are created; correct and submit a new request. |
| Cancelled | The requester withdrew the request. No linked records are created; a new submission is allowed. |

An eligible top manager's direct conversion does not create a pending request. A changed lead or failed conversion leaves a queued request pending until corrected through cancellation/resubmission or successfully approved. See [Lead conversion](https://jienweng.gitbook.io/q-app/docs/customer-records/02-leads-management#approval-before-conversion).

## Funnel stages

These are the standard stage labels. Your organization can customize labels and probabilities; check the stage-change dialog for current requirements.

| Stage | Meaning | What to remember |
| --- | --- | --- |
| `0e` — Identified | A sales pursuit has been identified. | Record the customer need and qualification context. |
| `1d` — Qualified | The pursuit is being qualified. | Complete the information required for your next stage. |
| `2c` — Proposal | Work is progressing toward a proposal. | Keep scope and commercial assumptions current. |
| `3b` — Negotiation | The proposal is being negotiated. | Review the quote and buyer's decision process. |
| `4a` — Commit | The pursuit is near commitment. | The deal is still open until its outcome is recorded. |
| Closed Won | The deal is won. | Terminal: stage changes are no longer allowed. Milestones are configured explicitly after customer acceptance at 4a or Won; recording Won does not create or change their status. |
| Closed Lost | The deal is lost. | Terminal: stage changes are no longer allowed. Record close remarks. |
| KIV — Keep In View | The pursuit is parked for later follow-up. | Record the reason. Reopening follows manager approval policy; a queued approval applies only while the original transition is current. |

For the field-by-stage matrix, Won exceptions, and KIV reopening, read [Fields and gates by stage](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#fields-and-gates-by-stage).

Open-stage rollback skips forward-entry gates. Forward changes can require fields and approval. Follow [Stage movement](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#stage-advancement-and-rollback-rules) for the workflow.

## Quotation statuses

| Status | Meaning | Editing or next action |
| --- | --- | --- |
| Draft | The proposal is being prepared. | Edit and submit for approval, or approve directly with the matching permission and no superior. |
| Pending Approval | It is awaiting the eligible reporting manager's decision. | Read-only. Rejection with a reason or an authorized Recall to Draft returns it to Draft. |
| Approved | It has approval to be sent. | Send with permission, or return to Draft and obtain approval again after edits. |
| Sent | Sending to the customer has been recorded. | Record customer acceptance/rejection, or create a separate revision where permitted. |
| Accepted | Customer acceptance has been recorded. | Acceptance does not close the funnel as Won. |
| Rejected | The customer rejected the sent quotation. | Distinct from an approval rejection, which returns a quote to Draft. |
| Expired | The quotation is treated as lapsed. | Review validity and create a revision where permitted. |
| Void | The quotation is recorded as void. | Retain the history and use an eligible revision for new terms where permitted. |

Not every historical status has a manual action in the current interface. Read the available controls rather than assuming every row in this table is a selectable status.

See [Quotations and revisions](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions).

## Payment milestone statuses

| Status | Meaning | How it changes |
| --- | --- | --- |
| Pending invoicing | An agreed milestone awaiting invoicing. | Created explicitly after quotation acceptance at stage 4a or Closed Won. An authorized user can mark it Invoiced. |
| Invoiced | Billing has been recorded for this milestone. | Forward-only; it cannot return to Pending invoicing. |

Closing Won does not create a schedule or change milestone status. Moving below 4a, to Lost or On Hold hides the active schedule and blocks new invoicing. Historical invoiced milestones remain accessible under the usual record scope. See [Managing milestones](https://jienweng.gitbook.io/q-app/docs/sales/06-payment-milestones#managing-milestones).

## Decisions that are separate

* **Lead-conversion approval** authorizes creating the saved account/contact and requested sales pursuit; pending approval creates no linked records.
* **Quotation approval** authorizes sending the proposal.
* **Customer acceptance** records the customer's response to the quotation.
* **Closed Won** records the outcome of the funnel deal.
* **Invoiced** records milestone billing status after billing; it does not issue an invoice or record payment received.

## Continue

* [Terminology](terminology.md)
* [Permissions and approval routing](permissions-and-approvals.md)
* [Troubleshooting](https://jienweng.gitbook.io/q-app/docs/help/troubleshooting)
