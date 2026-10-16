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

* **Industries**: Maintain account industry choices.
* **Project Natures**: Maintain project-nature codes and names.
* **Product Codes**: Maintain categories and dependent subcategories.
* **Funnel Stages**: Configure stage labels, probabilities, requirements and approval flags.

The current Settings navigation has no Lead Sources or Lost Reasons editor.

### Document Settings (`/settings/documents`)

* **Default Payment Terms**: e.g., *"30 Days from invoice date"*.
* **Delivery**: Default delivery text copied into new quotations. Existing quotations retain their snapshots.
* Tax-inclusive pricing is configured in General; tax rates are maintained under **Settings → Billing → Tax**, with separate tax permissions. **Billing → Numbering** contains document-number configuration.

### Funnel stages and custom fields

With **Manage tenant settings**, open **Settings → Taxonomy → Funnel Stages**. Review each stage's required fields and approval flag. Custom funnel fields can use text, number, date, checkbox, or dropdown inputs; configure their definitions before selecting them as stage requirements.

A required checkbox must be checked; budget presets require positive amounts. Required fields are evaluated on forward moves against stages earlier than the target. See [Fields and gates by stage](04-opportunities-and-funnel.md#fields-and-gates-by-stage) before changing the configuration.

**New-organization check:** the organization-creation path seeds stage names and approval flags but currently leaves required-field lists empty. The standard database seed adds field lists separately. Do not assume a newly created organization has the matrix's gates enabled; inspect and save the intended requirements here. Won's own field list is currently not enforced on entry, and KIV reopening follows the manager approval policy described in the same guide.

## Microsoft accounts from another directory

A different email suffix does not require a different CRM account system. For QAR/CC users in a separate Microsoft directory, the deployment operator must explicitly configure that directory and its email domains, and the Microsoft administrator must configure the app and consent before users can sign in. This is deployment configuration, not a tenant Settings control.

When multiple directories are configured, enter your invited **work email** on the sign-in page, then choose **Continue with Microsoft**. CRM opens the configured organisation's Microsoft sign-in. If Microsoft sign-in fails, ask the administrator to check the directory, domain, app consent/assignment and exact invited email; do not create a duplicate CRM user or transfer account ownership as a workaround.

Signing in does not grant entity access by itself. Invite each user to the appropriate QAR/CC entity with the intended role and reporting manager, and confirm licence capacity. A user working in both entities needs membership in both. For the pilot, use exact-email invitations rather than domain auto-join.

The November 2026 QAR/CC rollout and two-month test period remain subject to configuration and UAT; full implementation in 2027 needs a separate go-live decision. Documentation of this feature does not confirm production activation.

## Continue

* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](https://jienweng.gitbook.io/q-app)
