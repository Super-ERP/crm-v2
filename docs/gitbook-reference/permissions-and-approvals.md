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

Sales roles see only records they own. Managers also see records owned by their reporting team through **View own and reporting team records**. Approval permission alone does not grant team visibility. Explicit view-all grants still apply.

The **Owner** role is different from ownership of an account or funnel. See [Terminology](terminology.md#owner-salesperson-and-reporting-manager).

## Shared manager approval policy

Quotation approval, gated funnel-stage changes and lead conversion use the same rule:

* A member with the matching approval permission and **no manager configured above them** can proceed directly.
* A manager who has a manager above them must request approval from the first active, eligible manager in that reporting line.
* A salesperson without approval permission still requires approval. Having no reporting manager does not grant an exemption.
* A configured superior who lacks permission or is inactive is skipped in favour of an eligible higher manager. If none qualifies, the request is blocked until the reporting line or permissions are corrected.
* Missing or inactive reporting profiles do not qualify for direct action. Platform superadmins retain their operational override.

Approving a subordinate's request does not create another approval request for the reviewer. The policy governs the person initiating the business action.

## Review requests

Use **Sales → Approvals → Needs my review** for quotation, funnel-stage and lead-conversion requests routed to you. **My requests** tracks your submissions. Both tabs use one queue and a selected-request review panel. Requests default to oldest first; use the type filter to focus on Quotations, Lead conversions or Funnel stages. One pagination control covers the combined queue.

Quotation routing follows the actual submitter's reporting line, with the funnel owner as the fallback for legacy requests without submission audit data. Stage and lead-conversion requests follow the requester's reporting line. Decisions recheck eligibility, permissions and status. Quotation and lead-conversion inboxes and actions also enforce record ownership/team scope; stage requests are listed by their assigned approver and decisions additionally verify that the stored assignment remains current. A queued request cannot be self-approved or self-rejected; eligible top managers use the direct action instead.

Quotation rejection requires a reason and returns the quote to Draft. Lead-conversion rejection leaves the lead unconverted, allowing correction and a new submission. Lead conversion creates no account, contact, opportunity or funnel until the conversion is approved or an eligible top manager confirms the direct conversion.

## Can someone approve on behalf of another manager?

There is no proxy or delegated-approval action. The eligible reviewer decides using their own account, and the audit records that person. Sharing a PDF for advice does not transfer approval authority. If the intended reviewer is unavailable, ask an administrator to review the reporting line and permissions. Do not share logins.

Quotation requests follow the member who submits them. If a colleague with access submits a quotation, it follows that colleague's reporting line. Approving a subordinate's request does not require another approval for the reviewer.

## Routing examples

Suppose Sam reports to Maya, and Maya reports to Lee. All three have active reporting profiles; Maya and Lee have the required approval permission.

* Sam's request goes to Maya.
* Maya's own request goes to Lee, even though Maya can approve Sam's requests.
* If Lee has no manager above them, Lee can proceed directly.
* If Maya's manager lacks approval permission and there is no eligible higher manager, Maya's action is blocked. It does not silently become a direct action.

## Check the version before approval

Approval applies to the submitted quotation number/version. A separate revision starts Draft and must be approved separately. Returning an Approved quote to Draft clears its approval. Read [Documents, actions, and approval](documents-and-actions.md#which-version-is-approved) before deciding from a PDF or historical quotation.

## What if the manager changes?

Quotation and lead-conversion decisions follow the requester's current eligible manager, even if the reporting line or approval permissions changed after submission. Stage requests require both the stored assigned approver and current manager eligibility; cancel and resubmit a stale stage request to route it again. If a pending requester becomes an eligible top manager, recall the quotation or cancel the lead-conversion request before taking the direct action. A direct stage move cancels older pending stage requests.

Changing the Account owner cancels pending stage requests and returns pending quotations to Draft. The new owner resubmits them to route each request to the current eligible manager. If no eligible manager exists, submission asks for the reporting line and approval permission to be configured instead of routing to an unrelated approver.

Ask your administrator to check **Team and roles**. Managing team membership requires **Manage users**; changing organization defaults requires **Manage tenant settings**. Owner and Admin receive these permissions by default, and custom roles can provide different grants. Default System roles remain fixed.

## Configure member roles

Use [Roles and RBAC](https://jienweng.gitbook.io/q-app/docs/administration/roles-and-rbac) for the default-role comparison and configuration steps. Multiple roles add permissions; a restrictive role does not subtract another role’s grants.

## A missing action

Use [Missing modules or records](https://jienweng.gitbook.io/q-app/docs/help/troubleshooting#a-module-button-or-record-is-missing) to check your active organization, filters, permissions, and module availability.

## Continue

* [Administration and settings](https://jienweng.gitbook.io/q-app/docs/administration/09-admin-and-settings)
* [Terminology](terminology.md)
* [Documentation overview](https://jienweng.gitbook.io/q-app/docs)
