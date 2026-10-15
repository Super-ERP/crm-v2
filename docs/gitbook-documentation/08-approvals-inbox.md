---
description: Review quotation and funnel-stage requests routed to you and track your submissions.
icon: stamp
---

# Approvals inbox

Use **Sales → Approvals** to review quotation and funnel-stage requests. Both **Incoming** and **My requests** contain separate, labelled sections for the two workflows.

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#stage-gate).

## On this page

* [Find your requests](#find-your-requests)
* [Review and decide](#review-and-decide)
* [Follow up after a decision](#follow-up-after-a-decision)

{% hint style="info" %}
**Who can use this page?** People with stage-change, stage-approval, quotation-update, or quotation-approval permissions can participate. Quotation cards also require quotation-view permission and record access. Requests route to the first active manager in the requester’s reporting line with stage-approval permission. Only the assigned manager who remains eligible can decide the request; requesters cannot approve their own request. Permissions from all assigned roles count. Platform superadmins retain an operational override.
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

Each section has its own **Previous** and **Next** controls, with 25 records per page. **Review quotations** opens the full quotation list.

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

## KIV reopen requests

KIV-to-open moves use approval policy, but the current queued decision path treats the rollback as obsolete instead of applying it. An authorized stage approver can review and reopen directly. See [KIV reopening](04-opportunities-and-funnel.md#kiv-keep-in-view). A successful request submission does not mean reopening has happened.

## Quotation approvals

Every quotation requires approval before sending. **Incoming → Quotation approvals** lists pending quotations routed to you as the currently eligible manager and within your record access. Quotation routing follows reporting-line and approval-permission changes, matching the checks performed when deciding. Cards show quotation number, funnel, end-user customer, Bill To, total, requester and submission date. Use **View quotation** to review the full details, then **Approve** or **Reject** here or on the quotation itself. Rejection requires a reason and returns the quotation to Draft.

The eligible approver is the first active manager in the funnel owner's reporting line with **Approve quotations** permission. The existing quotation actions recheck permissions, record access, current manager eligibility and status when deciding. These actions record audit events but do not send email notifications.

**My requests → Quotation approvals** shows the latest submission for each quotation you submitted, using the actual submission audit actor rather than the account owner. Cards show the current quotation status and rejection reason where present. Pending quotations can be **Recalled to Draft** by eligible requesters. Recalled, rejected and approved quotations leave Incoming. This section is not a complete history of every resubmission. Legacy pending quotations without submission audit data can appear in Incoming with an unknown requester/date; they are not attributed to a guessed requester.

See [Quotation lifecycle](05-quotations-and-revisions.md#the-quotation-lifecycle).

## Related document rules

See [Documents, actions, and approval](https://jienweng.gitbook.io/q-app/reference/documents-and-actions) for the difference between stage approval, quotation approval, customer acceptance, and supporting attachments.

## Continue

* [Opportunities & sales funnel](04-opportunities-and-funnel.md)
* [Quotations & revisions](05-quotations-and-revisions.md)
* [Troubleshooting](help-center/troubleshooting.md)
