# 8. Approvals

## Two different decisions

Quotation approval authorizes a proposal before it is sent. Funnel-stage approval authorizes entry into an approval-gated sales stage. Customer acceptance is a separate commercial decision and never closes the funnel automatically.

## Who approves?

Configure each salesperson’s reporting manager in **Team**. The app walks that reporting line and selects the first active manager with the required permission:

- Quotations: **Approve quotations** (`quotation.approve`). The reporting line starts from the account salesperson who owns the quotation’s funnel.
- Funnel-stage requests: **Approve stage advances** (`stage.advance.approve`). The reporting line starts from the person requesting the advance.

Permissions from all assigned roles count. Legacy primary-role grants are used only when no multi-role assignments exist. Role names and seniority tiers do not determine approval eligibility.

Only the eligible reporting manager can approve or reject a quotation. Only the assigned manager who is still eligible can decide a stage request. Other Owner, Admin or Manager members do not gain permission to decide somebody else’s request just by holding the approval capability. Platform superadmins retain an operational override.

If no eligible manager exists, submission explains what must be configured instead of routing to an unrelated approver. Stage approvers can still advance stages directly using their stage-approval capability. An ordinary requester cannot approve their own stage request; a salesperson is never their own quotation approver.

## Funnel-stage inbox (`/approvals`)

- **Incoming** shows pending stage requests assigned to you.
- **My requests** shows the stage requests you submitted, including their decisions.
- The selected tab loads 25 requests per page. Use **Previous** and **Next** for more.
- Review the funnel, requested stage, reason, requester and date. Attachments load only when opened. Approve or Reject opens a confirmation dialog with an optional decision note.
- Approval moves the funnel only if its current stage and entry requirements still allow it. Obsolete requests are closed with an explanation rather than silently forcing a move.
- The requester can cancel a pending request. After a reporting-manager change, cancel and resubmit a stale assigned request so it reaches the current manager.

## Quotation approval

Open the quotation itself; quotations do not appear in the stage inbox.

1. Complete and save the **Draft** quotation.
2. Choose **Submit for approval**. Every quotation needs approval before sending; there is no discount-threshold exemption.
3. The eligible reporting manager opens the quotation and approves it or rejects it with a mandatory explanation.
4. Approval changes the status to **Approved**. Rejection returns it to **Draft** for corrections.
5. A member with send permission marks the approved quotation **Sent** after delivering it to the customer.
6. A member with acceptance permission records **Accepted** or customer **Rejected**.

Sent quotations remain historical documents; create a revision for new terms. Acceptance does not move the funnel, create a project or mark planned milestones Won. Move the funnel to **Closed Won** separately when the deal is won.

## Audit records

Submission, approval, rejection and cancellation record audit events. Quotations store the approver and approval time; stage requests store the requester, assigned approver, decision and time. Do not assume email notifications are sent by these actions.
