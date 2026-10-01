---
description: A short daily checklist for sales, approvers, delivery teams, and administrators.
icon: bolt
---

# Quick start by role

Choose the checklist closest to your work. Role names can be customized, so use the actions available in your workspace as your guide.

## Before you start

{% stepper %}
{% step %}

#### Check your organization

Sign in and check the active organization in the sidebar.

{% endstep %}
{% step %}

#### Open the right module

Open the relevant module. If it is missing, ask your administrator to check your permissions and enabled modules.

{% endstep %}
{% step %}

#### Clear old filters

Clear old filters if you cannot find a record you expect to see.

{% endstep %}
{% endstepper %}

{% tabs %}
{% tab title="Sales" %}

### Work a prospect through to a proposal

{% stepper %}
{% step %}

#### Review leads

Open **CRM → Leads** and review your assigned prospects. Update their details after outreach.

{% endstep %}
{% step %}

#### Convert qualified prospects

For a qualified prospect, review the account and contact information before converting. Follow [Lead conversion](https://jienweng.gitbook.io/q-app/docs/customer-records/02-leads-management#converting-a-lead).

{% endstep %}
{% step %}

#### Record qualification

Open **Sales → Opportunities** to maintain the customer need and PPVVC qualification: Power Sponsor, Pain, Vision, Value, and Control.

{% endstep %}
{% step %}

#### Update the funnel stage

Open **Sales → Funnel** to update the deal's stage. Complete the requirements shown by the stage-change dialog. See [Stage movement](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#stage-advancement-and-rollback-rules).

{% endstep %}
{% step %}

#### Prepare and approve the quote

Create a quotation, check items, currency, tax, and terms, then submit it for approval. After approval, use **Send** to record sending it. See [Quotations](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions).

{% endstep %}
{% endstepper %}

**You are done when:** the customer records are linked correctly, the funnel stage reflects the work completed, and the quote has the appropriate status.

{% hint style="info" %}
**Customer needs a change?** A sent quote can be revised into a separate draft. An approved quote must be returned to Draft before editing and approved again before sending. A pending quote needs a review decision first.
{% endhint %}

{% endtab %}
{% tab title="Approvers" %}

### Review requests and pipeline progress

{% stepper %}
{% step %}

#### Open Incoming requests

Open **Sales → Approvals → Incoming** for stage requests routed to you.

{% endstep %}
{% step %}

#### Review a stage request

Check the requested stage, supporting context, and attachments. Approve or reject using the review dialog.

{% endstep %}
{% step %}

#### Review quotation approvals

Review quotation approval separately on the quotation itself. Check the proposed pricing and terms before deciding.

{% endstep %}
{% step %}

#### Review the pipeline

Review **Sales → Funnel** for deals that need follow-up. If enabled for your role, use **Insights → Forecast** for pipeline planning.

{% endstep %}
{% endstepper %}

**You are done when:** requests have a clear decision and the requester knows what to change or do next.

Continue with [Stage approvals](https://jienweng.gitbook.io/q-app/docs/sales/08-approvals-inbox) or [Quotation approvals](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions#the-quotation-lifecycle).

{% endtab %}
{% tab title="Delivery" %}

### Check a commercial handover

{% stepper %}
{% step %}

#### Review the agreed scope

Review the funnel and its quotation to understand the agreed scope. Project-code allocation at `4a` supports planning; it is not proof that the deal is won.

{% endstep %}
{% step %}

#### Check delivery records

If enabled, open **Sales → Projects** to review delivery records and **Sales → Sales Orders** to check customer order details.

{% endstep %}
{% step %}

#### Compare the customer order

Compare the customer PO or contract with the quotation. Resolve discrepancies before proceeding with delivery.

{% endstep %}
{% step %}

#### Coordinate billing

Coordinate billing with the responsible team. After billing has occurred, coordinate recording **Won → Invoiced** with an authorized user. See the current status-control limitation in the payment milestone guide.

{% endstep %}
{% endstepper %}

**You are done when:** scope, customer order details, and delivery ownership are clear.

Continue with [Projects & sales orders](https://jienweng.gitbook.io/q-app/docs/delivery-and-administration/07-projects-and-sales-orders) and [Payment milestones](https://jienweng.gitbook.io/q-app/docs/sales/06-payment-milestones).

{% endtab %}
{% tab title="Administrators" %}

### Keep the workspace ready for the team

{% stepper %}
{% step %}

#### Review membership and reporting lines

Open **Admin → Team & roles** to review membership, role permissions, and reporting relationships.

{% endstep %}
{% step %}

#### Check organization defaults

Open **Admin → Settings** to check organization, taxonomy, and document defaults.

{% endstep %}
{% step %}

#### Resolve access issues

Review a user's permissions and active organization when they report a missing module or record.

{% endstep %}
{% step %}

#### Review recorded changes

If enabled, use **Insights → Audit** to investigate changes to records.

{% endstep %}
{% endstepper %}

**You are done when:** team members have the access they need and organization defaults match your working process.

Continue with [Administration & settings](https://jienweng.gitbook.io/q-app/docs/delivery-and-administration/09-admin-and-settings).

{% endtab %}
{% endtabs %}

## Stuck on an action?

Open [Troubleshooting](https://jienweng.gitbook.io/q-app/docs/help/troubleshooting). For an access issue, include the module name, the record identifier, and the error message when contacting your administrator.
