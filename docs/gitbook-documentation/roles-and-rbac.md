---
description: Compare all seven default roles and configure custom permissions, member assignments, and reporting lines.
icon: users-gear
---

# Roles and RBAC

**RBAC** means role-based access control: permissions are grouped into roles, and members receive the permissions from their assigned roles. This guide compares the current default templates for the active **Base modules and Advanced Roles** rollout.

## Choose a default role

| Default role | Main purpose | Record scope |
| --- | --- | --- |
| **Owner** | Full workspace control, including team, custom roles, and settings. | All records in the active organization. |
| **Admin** | Workspace administration; its default permission set matches Owner. | All records in the active organization. |
| **Developer** | Exercise business features without managing members, roles, or organization settings. | All records in the active organization. |
| **Manager** | Manage sales work, review approvals, and maintain catalog and tax settings. | Own records and records in their reporting subtree. |
| **Senior Rep** | Prepare sales work and send approved quotations. | Own records and records in their reporting subtree. |
| **Rep** | Capture and qualify prospects, prepare quotations, and request gated stage changes. | Own records and records in their reporting subtree. |
| **Viewer** | Read business records without changing them. | All records in the active organization. |

**Owner and Admin have the same default permissions**, but the last Owner has additional removal protection. Neither is the platform superadmin. **Developer** has broad business access but no tenant-administration permissions. **Manager** does not receive Manage users or Manage roles just because of its name.

A reporting subtree includes direct and indirect reports. Module availability, record access, document status, and approval routing still apply to every action. The comparison below describes default grants, not a promise that every action is always available.

## Compare capabilities

Choose a tab to compare one area at a time. **Yes** means the default role grants that capability; **No** means it does not.

{% tabs %}
{% tab title="Customer records" %}

| Role | View records | Create, edit & convert leads | Delete customer/sales records |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Developer | Yes | Yes | Yes |
| Manager | Yes | Yes | Yes |
| Senior Rep | Yes | Yes | No |
| Rep | Yes | Yes | No |
| Viewer | Yes | No | No |

Create/edit includes leads, accounts, contacts, opportunities, and funnel details. Deletion remains subject to each record's business rules. Viewer sees all records, while Manager, Senior Rep, and Rep use their ownership/reporting scope.

{% endtab %}
{% tab title="Quotations" %}

| Role | Prepare drafts & revisions | Send approved quotes | Approve quotes & record customer decisions |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Developer | Yes | Yes | Yes |
| Manager | Yes | Yes | Yes |
| Senior Rep | Yes | Yes | No |
| Rep | Yes | No | No |
| Viewer | No | No | No |

All default roles can view quotations within their record scope. Approval still requires the eligible manager in the Account owner's reporting line; approval permission alone is not sufficient. Customer acceptance/rejection uses the separate **Accept quotations** permission. Owner, Admin, Developer, and Manager also have **Delete quotations**, subject to deletion restrictions.

{% endtab %}
{% tab title="Stages & planning" %}

| Role | Advance stages | Approve stage advances | Manage payment milestones |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Developer | Yes | Yes | Yes |
| Manager | Yes | Yes | Yes |
| Senior Rep | Yes | No | Yes |
| Rep | Yes | No | Yes |
| Viewer | No | No | No |

Users without stage-approval permission submit requests when the transition requires approval. Eligible assigned reviewers decide requests in Incoming. Users with stage-approval permission can enter gated stages directly after satisfying stage requirements. Milestone-management permission does not add a status control that is absent from the interface.

{% endtab %}
{% tab title="Catalog & administration" %}

| Role | Edit products & configure tax | Manage members & custom roles | Organization settings |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Developer | Yes | No | No |
| Manager | Yes | No | No |
| Senior Rep | No | No | No |
| Rep | No | No | No |
| Viewer | No | No | No |

All default roles can view products and tax settings. Maintaining pipeline configuration is granted to Owner, Admin, Developer, and Manager. Team membership uses **Manage users**; creating/editing custom roles and saving their permissions uses **Manage roles**. Opening the role-management pages also requires Manage users.

{% endtab %}
{% endtabs %}

## What can you change?

| Item | How changes work |
| --- | --- |
| Default roles marked **System** | Fixed templates. Their names and permission sets cannot be changed, and they cannot be deleted. |
| Custom roles | Create a named role, select its permissions, save, and assign it. A newly created role starts with no granted permissions. |
| Member roles | Assign one or more roles in Edit member. Remove a role to stop its grants contributing to that member's access. |
| Reporting manager | Set the member's Manager separately. This affects record scope and approval routing, not their granted permissions. |
| Tier/seniority | Legacy metadata; it does not grant permission or make someone an approver. The current editors configure role names, permissions, and reporting relationships. |

**Roles add permissions together; they do not deny permissions.** Adding Viewer to Rep does not make the member read-only. Adding a restricted custom role to Manager does not remove Manager's privileges. Because Viewer grants **View all records**, assigning Viewer alongside Rep also broadens the member's visible record scope. Review the whole role combination, not just the newest role.

To replace a default permission set, assign an appropriately configured custom role and remove the broader default role from that member. Changing a custom role affects everyone assigned to it. You can only grant/revoke permissions you hold yourself, cannot change your own member roles, and cannot edit your own primary role's permissions through the normal workflow. The app protects the last Owner from losing the Owner role.

## Set up RBAC

{% stepper %}
{% step %}

#### Define the work and record scope

List what the member needs to view, create, edit, delete, submit, approve, send, or accept. Decide whether access should stay within their owned records/reporting subtree or cover the organization. Choose a default role when it matches; otherwise create a custom role.

{% endstep %}
{% step %}

#### Create and configure a custom role when needed

As an Owner or Admin, open **Admin → Team & roles → Roles → Roles & permissions**. Use **New role**, enter a unique name, and click **Create**. Select the custom role and choose the required permission groups. Include View permissions for the records the member needs to open, then add the relevant action permissions. Click **Save changes**.

Only groups for enabled modules appear. Assigning a permission does not activate an unavailable module. System roles can be inspected but their permission set cannot be saved with changes.

{% endstep %}
{% step %}

#### Assign the role to the member

Open **Team & roles → Members**, open the member's action menu, and choose **Edit**. In **Roles**, check the intended role or roles and uncheck unwanted broader roles. Click **Save changes**. For a new member, use **Add member**, enter their email, and select the initial role; review additional role assignments after membership is available.

{% endstep %}
{% step %}

#### Set the reporting manager

In **Edit member**, choose the member's **Manager** and save. The manager must be active in the same organization; reporting cycles are rejected. Give the intended reviewer the relevant approval permission through their roles. Assigning a manager alone does not grant that person approval capability.

{% endstep %}
{% step %}

#### Check the effective access

Have the member open the relevant records and check the intended actions and scope. For quotation approval, verify the Account owner's reporting line. For stage approval, verify the requester's reporting line. Confirm both the eligible reviewer and the document/request status before deciding.

{% endstep %}
{% endstepper %}

## Example: custom quotation sender

Create a custom role named **Quotation sender** with the quotation View and Send permissions. Assign it alongside **Rep** to add sending without adding manager approval, customer acceptance, or deletion. The quotation must still be Approved, valid, and linked to an open funnel. This additive role is different from Senior Rep only if you customize its grant set; Senior Rep already includes sending by default.

For a read-only member, assign **Viewer alone** if organization-wide reading is intended. For restricted read-only access, create a custom role with the required View permissions and omit View all records; configure reporting relationships to match the intended scope.

## Approval setup checklist

* **Quotation reviewer:** active manager in the Account owner's reporting line with **Approve quotations** and quotation access.
* **Stage reviewer:** active manager in the requester's reporting line with **Approve stage advances**, assigned to the Pending request and still eligible at decision time.
* **Sender:** **Send quotations** plus access to the Approved quotation.
* **Customer decision recorder:** **Accept quotations** plus access to the Sent quotation and the acceptance requirements.
* **Role administrator:** **Manage users** to access the team/role pages and **Manage roles** to change custom roles.

See [Approval routing](https://jienweng.gitbook.io/q-app/reference/permissions-and-approvals) and [Documents, actions, and approval](https://jienweng.gitbook.io/q-app/reference/documents-and-actions) for the complete rules.

## Continue

* [Administration and settings](09-admin-and-settings.md)
* [Troubleshooting](help-center/troubleshooting.md)
