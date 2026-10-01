---
description: Manage team access, custom roles, and organization defaults.
icon: gear
---

# Administration and settings

Manage team access, custom roles, and organization defaults.

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#role-permission-and-enabled-module).

## On this page

* [Invite team members](#inviting-team-members)
* [Manage custom roles](#advanced-roles-and-permissions)
* [Configure settings](#tenant-settings)

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

## Advanced Roles and permissions

Advanced Roles is enabled for this rollout. Users with **Manage users** can manage custom roles and their permissions.

{% stepper %}
{% step %}

#### Open a role's permissions

Open **Admin → Team & roles**, choose **Roles**, and click **Permissions** on the role you want to review.

{% endstep %}
{% step %}

#### Choose the required permissions

Review the permission groups and select the actions the role needs. Only permission groups for enabled modules appear. To create a custom role, use **New role**, enter its details, and click **Create** before configuring its permissions.

{% endstep %}
{% step %}

#### Save and check access

Click **Save changes**. Assign the appropriate role to the team member and check their reporting manager separately; role permissions and reporting relationships both affect access and approval routing.

{% endstep %}
{% endstepper %}

---

## Tenant settings

Users with **Manage tenant settings** permission (Owner and Admin by default) configure organization defaults under **Admin → Settings**:

### General Settings (`/settings/general`)

* **Organization Name**: Official legal entity name.
* **Base Currency**: Default financial currency for the tenant.
* **Fiscal Year Start**: The organization’s fiscal-year calendar.

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
* [Back to start](https://jienweng.gitbook.io/q-app)
