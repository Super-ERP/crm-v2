---
description: Review stage requests routed to you and track the requests you have submitted.
icon: stamp
---

# Stage approvals

Use **Sales → Approvals** to review requests to change a funnel stage. Quotation approval is handled on the quotation itself; see [Quotation approvals](05-quotations-and-revisions.md#the-quotation-lifecycle).

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#stage-gate).

## On this page

* [Find your requests](#find-your-requests)
* [Review and decide](#review-and-decide)
* [Follow up after a decision](#follow-up-after-a-decision)

{% hint style="info" %}
**Who can use this page?** People with stage-change or stage-approval permissions can participate. Requests route to the first active manager in the requester’s reporting line with stage-approval permission. Only the assigned manager who remains eligible can decide the request; requesters cannot approve their own request. Permissions from all assigned roles count. Platform superadmins retain an operational override.
{% endhint %}

## Find your requests

{% stepper %}
{% step %}

#### Open Approvals

Open **Sales → Approvals**.

{% endstep %}
{% step %}

#### Review Incoming

Choose **Incoming** for pending requests routed to you.

{% endstep %}
{% step %}

#### Track My requests

Choose **My requests** to track requests you submitted.

{% endstep %}
{% step %}

#### Navigate requests

Use **Previous** and **Next** to navigate the selected tab’s 25-request pages. Use **Review quotations** to open the separate quotation list.

{% endstep %}
{% endstepper %}

An empty Incoming tab means no pending requests are currently routed to you; it does not show every request in the organization.

## Review and decide

{% stepper %}
{% step %}

#### Check the stage request

Find the request and check the funnel name, requester, current stage, and requested target stage. Approval authorizes that exact transition, not a quotation or a supporting file.

{% endstep %}
{% step %}

#### Review supporting context

Review the supporting context. Expand **Attachments** when supporting files are available.

{% endstep %}
{% step %}

#### Choose a decision

Choose **Approve** or **Reject**.

{% endstep %}
{% step %}

#### Add a decision note

Add a decision note. The stage-approval dialog makes this optional, but a clear reason helps the requester follow up.

{% endstep %}
{% step %}

#### Confirm and read the result

Confirm the decision and read the result message.

{% endstep %}
{% endstepper %}

```mermaid
flowchart TD
    R["Stage request submitted"] --> P["Pending with routed approver"]
    P --> A["Approve"]
    P --> J["Reject"]
    A --> V["Check the result and current funnel stage"]
    J --> F["Requester reviews feedback"]
```

**Read the diagram:** approval processes the requested stage change. Rejection leaves the requester to review the feedback and correct or reconsider the request. The app rechecks the current stage and required information before applying approval. If the original transition is no longer current, the request becomes obsolete and the stage does not move.

## Follow up after a decision

* **Approved:** open the funnel and verify the resulting stage. Read any message about an obsolete request before assuming the stage changed.
* **Rejected:** review the decision note, resolve the issue, and submit a new request if needed.
* **No longer needed:** requesters can cancel their pending request where the action is available.
* **Reporting manager changed:** cancel and resubmit a stale pending request so it routes to the current eligible manager.
* **Account owner changed:** the pending request is cancelled automatically; the new owner can submit a new request.
* **No eligible manager:** ask your administrator to configure the reporting line and approval permissions. Submission does not route to an unrelated approver.

## Quotation approvals

Every quotation requires approval before sending. The eligible approver is the first active manager in the account owner’s reporting line with **Approve quotations** permission. Only that manager can approve or reject; a rejection requires a reason. These actions record audit events but do not send email notifications.

See [Quotation lifecycle](05-quotations-and-revisions.md#the-quotation-lifecycle).

## Related document rules

See [Documents, actions, and approval](https://jienweng.gitbook.io/q-app/reference/documents-and-actions) for the difference between stage approval, quotation approval, customer acceptance, and supporting attachments.

## Continue

* [Opportunities & sales funnel](04-opportunities-and-funnel.md)
* [Quotations & revisions](05-quotations-and-revisions.md)
* [Troubleshooting](help-center/troubleshooting.md)
