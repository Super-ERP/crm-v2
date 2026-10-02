---
description: Understand the labels on funnel deals, quotations, and payment milestones.
icon: traffic-light
---

# Stages and statuses

A funnel stage, quotation status, and payment milestone status describe different records. Updating one does not necessarily update the others.

## Funnel stages

These are the standard stage labels. Your organization can customize labels and probabilities; check the stage-change dialog for current requirements.

| Stage | Meaning | What to remember |
| --- | --- | --- |
| `0e` — Identified | A sales pursuit has been identified. | Record the customer need and qualification context. |
| `1d` — Qualified | The pursuit is being qualified. | Complete the information required for your next stage. |
| `2c` — Proposal | Work is progressing toward a proposal. | Keep scope and commercial assumptions current. |
| `3b` — Negotiation | The proposal is being negotiated. | Review the quote and buyer's decision process. |
| `4a` — Commit | The pursuit is near commitment. | The deal is still open until its outcome is recorded. |
| Closed Won | The deal is won. | Terminal: stage changes are no longer allowed. Live Planned milestones become Won. |
| Closed Lost | The deal is lost. | Terminal: stage changes are no longer allowed. Record close remarks. |
| KIV — Keep In View | The pursuit is parked for later follow-up. | Record the reason. Reopening follows approval policy; the current request-path limitation is documented in the KIV guide. |

For the field-by-stage matrix, Won exceptions, and KIV limitation, read [Fields and gates by stage](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#fields-and-gates-by-stage).

Open-stage rollback skips forward-entry gates. Forward changes can require fields and approval. Follow [Stage movement](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#stage-advancement-and-rollback-rules) for the workflow.

## Quotation statuses

| Status | Meaning | Editing or next action |
| --- | --- | --- |
| Draft | The proposal is being prepared. | Edit and submit for approval. |
| Pending Approval | It is awaiting the eligible reporting manager's decision. | Read-only. Rejection with a reason returns it to Draft. |
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
| Planned | A billing event is being planned before the deal is won. | Closing the linked funnel Won updates live Planned milestones to Won. |
| Won | A billing event belongs to a won deal. | An authorized update can record Won → Invoiced after billing. |
| Invoiced | Billing has been recorded for this milestone. | Forward-only; it cannot return to Won or Planned. |

A milestone created for an already won funnel starts as Won. Invoiced milestones keep their status. The current guide documents a status-control limitation; see [Managing milestones](https://jienweng.gitbook.io/q-app/docs/sales/06-payment-milestones#managing-milestones).

## Decisions that are separate

* **Quotation approval** authorizes sending the proposal.
* **Customer acceptance** records the customer's response to the quotation.
* **Closed Won** records the outcome of the funnel deal.
* **Invoiced** records milestone billing status after billing; it does not issue an invoice or record payment received.

## Continue

* [Terminology](terminology.md)
* [Permissions and approval routing](permissions-and-approvals.md)
* [Troubleshooting](https://jienweng.gitbook.io/q-app/docs/help/troubleshooting)
