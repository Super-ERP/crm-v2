---
description: Recent Q-App product changes, with links to the source changes and relevant guides.
icon: clock-rotate-left
---

# Product changelog

Read this page to understand changes to Q-App behavior. Dates below are when the changes merged into the main codebase. Availability in your workspace depends on your organization's deployed version; a merge date is not a deployment or release date.

For changes to the documentation itself, see [Guide updates](changelog.md).

## October 1, 2026 — Reporting-manager approvals

Quotation approvals now use the eligible manager in the account salesperson's reporting line. Stage requests use the requester's reporting line and can only be decided by the assigned eligible manager. Approval queues provide Incoming and My requests tabs with 25 requests per page.

**What to do:** administrators should check reporting-manager assignments and approval permissions. Review quotes on their quotation pages; review stage requests in Approvals.

[Approval routing guide](reference/permissions-and-approvals.md) · [Source change #241](https://github.com/Super-ERP/crm-v2/pull/241)

## October 1, 2026 — Clearer milestone confirmation

Payment milestones stay Planned until their linked funnel reaches Closed Won. Live Planned milestones then become Won; Invoiced milestones retain their status.

**What to do:** check the linked funnel outcome when a milestone is still Planned. Marking a quotation Accepted does not close the funnel automatically.

[Payment milestone guide](06-payment-milestones.md) · [Source change #238](https://github.com/Super-ERP/crm-v2/pull/238)

## October 1, 2026 — Vendor module controls

Fixed missing module controls in the vendor portal and consolidated people-management access.

**What to do:** administrators using the vendor portal should review the available module controls when configuring a client workspace.

[Source change #239](https://github.com/Super-ERP/crm-v2/pull/239)

## October 1, 2026 — Cleaner role editor

Removed the named permission-administrator banner from the role editor.

[Administration guide](09-admin-and-settings.md) · [Source change #240](https://github.com/Super-ERP/crm-v2/pull/240)

## Continue

* [Documentation overview](documentation.md)
* [Guide updates](changelog.md)
* [Troubleshooting](help-center/troubleshooting.md)
