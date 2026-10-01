---
description: Learn why actions are available, which records you can see, and who reviews an approval.
icon: shield-check
---

# Permissions and approval routing

Access depends on your active organization, assigned permissions, record scope, and enabled modules. Role names and seniority tiers alone do not determine approval eligibility.

## What controls access?

| Control | What it affects |
| --- | --- |
| Active organization | The workspace whose records and settings you are using. |
| Assigned roles and permissions | Which modules and actions you are allowed to use. Permissions from assigned roles count together. |
| Record ownership and reporting relationships | Which records you can see or manage when access is scoped. |
| Enabled modules | Whether a feature is available for the organization. |

The **Owner** role is different from ownership of an account or funnel. See [Terminology](terminology.md#owner-salesperson-and-reporting-manager).

## Who approves a quotation?

The app starts from the **account salesperson's reporting line** and finds the first active manager with **Approve quotations** permission. Only that eligible manager can approve or reject the quotation, subject to the platform superadmin's operational override. A salesperson cannot approve their own quotation.

Every quote needs approval before sending. Review happens on the quotation page, not in the stage-request inbox. Rejection requires a reason and returns the quote to Draft. See [Quotation lifecycle](../05-quotations-and-revisions.md#the-quotation-lifecycle).

## Who approves a stage request?

The app starts from the **requester's reporting line** and finds the first active manager with **Approve stage advances** permission. Only the assigned manager who remains eligible can decide the request, subject to the platform superadmin's operational override. A requester cannot approve their own request.

Stage approvers can enter gated stages directly using their stage-approval capability. Other users follow the request process when a stage requires approval. See [Stage approvals](../08-approvals-inbox.md).

## What if the manager changes?

A stale pending stage request should be cancelled and resubmitted so it reaches the current eligible manager. If no eligible manager exists, submission asks for the reporting line and approval permission to be configured instead of routing to an unrelated approver.

Ask your administrator to check **Team and roles**. Managing team membership requires **Manage users**; changing organization defaults requires **Manage tenant settings**. Owner and Admin receive these permissions by default, but the organization can customize role grants.

## A missing action

Use [Missing modules or records](../help-center/troubleshooting.md#a-module-button-or-record-is-missing) to check your active organization, filters, permissions, and module availability.

## Continue

* [Administration and settings](../09-admin-and-settings.md)
* [Terminology](terminology.md)
* [Documentation overview](../documentation.md)
