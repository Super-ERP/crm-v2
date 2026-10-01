---
description: Manage team access and organization defaults, and review forecasts and audit history.
icon: gear
---

# Administration and settings

Manage team access and organization defaults, and review forecasts and audit history.

**New to these terms?** Read the [terminology reference](reference/terminology.md#role-permission-and-enabled-module).

## On this page

* [Invite team members](#inviting-team-members)
* [Configure settings](#tenant-settings)
* [Review forecasts](#revenue-forecast)
* [Review audit history](#system-audit-log)

---

## Team and roles

User administration requires **Manage users**, granted to Owner and Admin by default. Configure each salesperson’s reporting manager here for approval routing. The standard role names below are examples; your organization can customize permissions.

### Inviting Team Members

{% stepper %}
{% step %}

#### Open Team and roles

Navigate to **Admin → Team & roles** in the sidebar.

{% endstep %}
{% step %}

#### Start an invitation

Click **+ Invite Member**.

{% endstep %}
{% step %}

#### Set membership and reporting details

Enter:

* **Full Name & Email Address**.
* **Role**:
  * **Owner (Tier 100)**: Full administrative power.
  * **Manager (Tier 60)**: Department manager with approval authority.
  * **Sales Rep (Tier 20)**: Individual contributor managing deals and quotes.
  * **Viewer (Tier 10)**: Read-only access.
* **Reporting Manager**: Assign their direct supervisor for approval routing and pipeline visibility.

{% endstep %}
{% step %}

#### Send the invitation

Click **Send Invitation**.

{% endstep %}
{% endstepper %}

---

## Revenue forecast

The **Forecast** dashboard provides real-time visibility into your sales pipeline.

* **Weighted Pipeline Calculation**:
  **Weighted value = deal value × stage win probability.**
* **Breakdowns**:
  * View projected revenue by fiscal quarter or month.
  * Filter by sales team, individual rep, or product category.
  * Compare pipeline stage distribution (`0e` through `4a`) against quarterly sales targets.

---

## System audit log

Use the audit log to review recorded changes and actions. Available events and detail depend on the action and your access.

* Navigate to **Insights → Audit** to search activity history:
  * **Who**: The user who performed the operation.
  * **What**: The entity modified (e.g., `Quotation QDT-2026-0042`, `Opportunity Acme Corp`).
  * **Action**: `Created`, `Updated`, `Deleted`, `Stage Advanced`, `Approved`.
  * **Diff**: Explicit old value vs. new value comparison.
  * **Timestamp**: Exact UTC and local timestamp.

---

## Tenant settings

Users with **Manage tenant settings** permission (Owner and Admin by default) configure organization defaults under **Admin → Settings**:

### General Settings (`/settings/general`)

* **Organization Name**: Official legal entity name.
* **Base Currency**: Default financial currency for the tenant.
* **Fiscal Year Start**: Calendar alignment for quarterly forecasting.

### Taxonomy Settings (`/settings/taxonomy`)

* **Product Categories**: Define classification tags for the product catalog.
* **Lead Sources**: Customize sources (e.g., *Google Ads, Tech Expo, Partner Referral*).
* **Lost Reasons**: Standardize why deals are lost (e.g., *Price High, Missing Feature, Competitor*).

### Document Settings (`/settings/documents`)

* **Default Payment Terms**: e.g., *"30 Days from invoice date"*.
* **Delivery**: Default delivery text copied into new quotations. Existing quotations retain their snapshots.
* Tax-inclusive pricing is configured in General; tax rates are maintained in the quotation tax configuration.

## Continue

* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](README.md)
