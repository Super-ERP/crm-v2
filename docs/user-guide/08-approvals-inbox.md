# 8. Approvals Hub

This chapter covers governance workflows and the centralized Approvals dashboard used by managers and team leaders.

---

## Overview

The **Approvals Hub** (`/approvals`) is a unified inbox designed for **Managers (Tier 60)** and **Owners (Tier 100)** to review, approve, or reject business exceptions before they reach customers or advance in the pipeline.

```
┌────────────────────────────────────────────────────────┐
│ Pending Approvals Queue                                │
├────────────────────────────────────────────────────────┤
│ • Quotation QDT-2026-0042 (18% Discount Request)       │
│ • Stage Advance: Acme Corp (Stage 3b -> 4a Commit) │
└────────────────────────────────────────────────────────┘
```

---

## What Triggers an Approval Request?

1. **Quotation Approvals**:
   * Line item or total quotation discounts exceeding standard sales delegation limits.
   * Custom payment terms or non-standard contractual conditions.
2. **Stage-Gate Advancements**:
   * Advancing high-value opportunities into final stages (e.g., entering `4a Commit` or marking `Closed Won`).

---

## Navigating the Approvals Inbox

1. Navigate to **Sales → Approvals** in the sidebar.
2. Review the list of requests organized under two primary tabs:
   * **Pending**: Requests awaiting your decision.
   * **History**: An audit trail of previously approved or rejected requests.

### Reviewing a Request
Click on any request to open the review panel:
* **Context**: View the Account, Opportunity name, Sales Rep, and request timestamp.
* **Financial Details**: Original price, discounted total, margin impact, and requested terms.
* **Justification Notes**: Business rationale submitted by the sales representative.

---

## Approving or Rejecting Requests

Inside the review dialog:
* **To Approve**:
  * Click **Approve**.
  * Add optional notes (e.g., *"Approved per Q4 executive alignment"*).
  * The quote status immediately updates to **`Approved`**, and the sales rep is notified.
* **To Reject**:
  * Click **Reject**.
  * **Mandatory Review Note**: You must enter explanatory feedback explaining why the request was declined (e.g., *"Discount exceeds margin target; cap at 12%"*).
  * The quote returns to **`Draft`** status so the sales rep can adjust the terms and resubmit.
