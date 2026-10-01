---
description: Get up and running quickly with role-specific "Day in the Life" workflows.
icon: bolt
---

# Quick Start by Role

Select your role below to view your daily workflow, essential actions, and recommended best practices in Q-App.

{% tabs %}
{% tab title="Sales Representative" icon="briefcase" %}
### Daily Workflow for Sales Reps (Tier 20)

As a sales representative, your primary objective is capturing interest, qualifying deals with PPVVC rigor, and issuing accurate, approved quotations.

{% stepper %}
{% step %}
#### Review Assigned Leads
* Open **CRM → Leads** and set your view to *"My Open Leads"*.
* Reach out to new prospects and update their status from `New` -> `Contacted`.
* If a prospect is disqualified, select a structured reason (*No Budget, Out of Scope*).
{% endstep %}

{% step %}
#### Convert Qualified Prospects
* When a prospect confirms need and budget, click **Convert Lead** on the lead detail view.
* The wizard automatically links or creates the **Account**, primary **Contact**, and an **Opportunity** seeded at stage **`0e` (Identified)**.
{% endstep %}

{% step %}
#### Complete PPVVC & Advance Pipeline
* Open **Sales → Funnel** and select your deal.
* Fill out the **PPVVC** panel (*Power Sponsor, Pain, Vision, Value, Control*).
* Advance the deal stage as discovery progresses (`0e` -> `1d` -> `2c` -> `3b`).
{% endstep %}

{% step %}
#### Generate & Submit Quotation
* Click **+ New Quotation** from the deal.
* Add line items from the product catalog, check the SST tax rate, and review payment terms.
* If a special discount is needed, click **Submit for Approval** to route it to your manager.
* Once approved, mark the quote as **Sent** and download the PDF for your client.
{% endstep %}
{% endstepper %}

{% hint style="tip" %}
**Customer requested changes?** Don't overwrite an existing quote! Click **Revise** on the quote header. The system locks the original for compliance and creates a new linked Draft revision.
{% endhint %}
{% endtab %}

{% tab title="Sales Manager" icon="user-tie" %}
### Daily Workflow for Sales Managers (Tier 60)

As a sales manager, your role focuses on pipeline governance, quota forecasting, and unblocking commercial proposals.

{% stepper %}
{% step %}
#### Clear the Approvals Hub
* Start your day at **Sales → Approvals**.
* Inspect pending quotation discount requests and stage advancement gates.
* Review deal margin impact and sales rep justification notes.
* Click **Approve** or **Reject** (with mandatory feedback notes).
{% endstep %}

{% step %}
#### Review Pipeline & Stage Gates
* Open **Sales → Funnel** and switch views between the list table and the interactive stage board.
* Identify stalled deals and check PPVVC completion on opportunities in stages `2c` and `3b`.
* Note that entering stage **`4a`** reserves the official Delivery Project Code.
{% endstep %}

{% step %}
#### Track Revenue Forecasts
* Navigate to **Insights → Forecast**.
* Analyze the weighted pipeline calculation ($\text{Value} \times \text{Stage Probability}$) across your team against quarterly targets.
{% endstep %}
{% endstepper %}
{% endtab %}

{% tab title="Delivery Project Manager" icon="list-check" %}
### Daily Workflow for Delivery Leads & PMs

Delivery managers connect won sales commitments into operational implementation.

{% stepper %}
{% step %}
#### Monitor Stage 4a Commitments
* When an Opportunity reaches stage **`4a`**, the system automatically generates an allocated **Project Code** (e.g., `PRJ-2026-0042`).
* Navigate to **Sales → Projects** to review incoming project handovers and review the commercial quotation scope.
{% endstep %}

{% step %}
#### Verify Customer Sales Orders
* Open **Sales → Sales Orders**.
* Verify that the customer's signed Purchase Order (PO) amount, deliverables, and PO date match the approved quotation.
* Confirm and approve the Sales Order to authorize internal resource allocation.
{% endstep %}

{% step %}
#### Track Delivery Payment Milestones
* As project milestones are reached (e.g., *Phase 1 UAT Complete*), coordinate with the commercial team to mark milestones in **Sales → Payment Milestones** as **`Invoiced`**.
{% endstep %}
{% endstepper %}
{% endtab %}

{% tab title="System Administrator" icon="gear" %}
### Daily Workflow for Administrators (Tier 100)

System owners manage user access, organizational settings, and compliance audit logs.

{% stepper %}
{% step %}
#### Onboard Team Members
* Open **Admin → Team & roles**.
* Click **+ Invite Member** to grant access and assign roles (**Owner**, **Manager**, **Sales Rep**, **Viewer**).
* Assign direct reporting managers to establish approval routing hierarchies.
{% endstep %}

{% step %}
#### Maintain Organizational Settings
* Under **Admin → Settings**:
  * **General**: Ensure the correct base ISO currency is configured.
  * **Taxonomy**: Update product categories, lead sources, and lost deal reasons.
  * **Documents**: Update standard quotation payment terms and default SST tax percentages.
{% endstep %}

{% step %}
#### Monitor System Audit Trails
* Navigate to **Insights → Audit** to inspect user login history, permission adjustments, and critical record diffs for data integrity.
{% endstep %}
{% endstepper %}
{% endtab %}
{% endtabs %}
