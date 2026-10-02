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

User administration requires **Manage users**, granted to Owner and Admin by default. Configure each salesperson’s reporting manager here for approval routing. Default System roles are fixed templates. Create custom roles to change the permission mix. See [Roles and RBAC](roles-and-rbac.md) for all seven defaults and setup instructions.

### Inviting Team Members

{% stepper %}
{% step %}

#### Open Team and roles

Navigate to **Admin → Team & roles** in the sidebar.

{% endstep %}
{% step %}

#### Add a member

Click **Add member**.

{% endstep %}
{% step %}

#### Choose the initial role

Enter the member's email address and choose their initial role. Compare the available defaults in [Roles and RBAC](roles-and-rbac.md) before assigning access.

{% endstep %}
{% step %}

#### Review roles and reporting details

Click **Add member**. Once membership is available, use **Edit member** to review Roles and set Manager, then save. Multiple roles add permissions together.

{% endstep %}
{% endstepper %}

---

## Advanced Roles and permissions

Advanced Roles is enabled for this rollout. **Manage users** permits access to team and role pages; **Manage roles** is required to create custom roles and save their permissions. Owner and Admin have both by default. System roles cannot be renamed, deleted, or have their permission set changed.

Follow [Roles and RBAC](roles-and-rbac.md#set-up-rbac) to create a custom role, choose permissions, assign it to a member, configure their Manager, and verify access. This is the place to use a different permission mix instead of editing a default template.

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

### Funnel stages and custom fields

With **Manage tenant settings**, open **Settings → Taxonomy → Funnel Stages**. Review each stage's required fields and approval flag. Custom funnel fields can use text, number, date, checkbox, or dropdown inputs; configure their definitions before selecting them as stage requirements.

A required checkbox must be checked; budget presets require positive amounts. Required fields are evaluated on forward moves against stages earlier than the target. See [Fields and gates by stage](04-opportunities-and-funnel.md#fields-and-gates-by-stage) before changing the configuration.

**New-organization check:** the organization-creation path seeds stage names and approval flags but currently leaves required-field lists empty. The standard database seed adds field lists separately. Do not assume a newly created organization has the matrix's gates enabled; inspect and save the intended requirements here. Won's own field list is currently not enforced on entry, and KIV reopening has a queued-review limitation described in the same guide.

## Continue

* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](https://jienweng.gitbook.io/q-app)
