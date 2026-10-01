---
description: Step-by-step diagnostic guide for resolving common errors and workflow blockers.
icon: wrench
---

# Troubleshooting & Common Errors

If you encounter an error message or workflow restriction in Q-App, refer to the diagnostic steps below.

---

## 1. Stage Advancement Denied

### Symptom
When attempting to advance an opportunity stage (e.g., from `2c` to `3b`), the system displays an error:
> *"Stage advance denied: requirements not met"*

### Root Cause
Forward stage movement enforces strict stage-gate validation checks. Common blockers include:
* **Missing Quotation**: Stage `3b` requires at least one active quotation attached to the opportunity.
* **Incomplete PPVVC**: Key qualification criteria (such as *Power Sponsor* or *Value*) are blank.
* **Manager Sign-off Required**: High-deal-value thresholds may require an approved stage-gate request in **Sales → Approvals**.

### Resolution Steps
{% stepper %}
{% step %}
**Check PPVVC Fields**
Open the opportunity and verify that all five PPVVC pillars have meaningful entries.
{% endstep %}

{% step %}
**Verify Quotation Status**
Ensure a valid draft or approved quotation is linked to the deal before advancing to proposal stages.
{% endstep %}

{% step %}
**Check Approvals Hub**
If the deal requires management sign-off, verify whether an approval request is pending under **Sales → Approvals**.
{% endstep %}
{% endstepper %}

---

## 2. Quotation is Locked and Cannot be Edited

### Symptom
Form inputs and line item price fields on a quotation are disabled (grayed out), preventing edits.

### Root Cause
Quotations are locked against direct edits in the following states:
* **`Pending Approval`**: Currently in review with management.
* **`Approved`**: Manager has signed off on pricing; changes would invalidate the approval.
* **`Sent`**: Already delivered to the customer.

### How to Resolve
{% hint style="info" %}
**Use the Revisions Workflow**: Do not attempt to bypass locked quotes. Click **Revise** in the header. The system creates a new draft revision (`-Rev1`) where you can adjust items and resubmit, keeping the original intact for legal audit.
{% endhint %}

---

## 3. Account Creation Blocked: Missing Currency

### Symptom
When saving a new Account or converting a lead, the form rejects submission with:
> *"Account currency is required"*

### Root Cause
Every Account must have an assigned ISO currency (e.g., `MYR`, `USD`, `SGD`) to guarantee that all future deals and quotes calculate financial values correctly.

### How to Resolve
1. In the Account creation dialog or conversion wizard, scroll to the **Currency** dropdown.
2. Select your client's designated billing currency.
3. If the desired currency is missing from the dropdown, contact your **Owner** administrator to add the currency under **Admin → Settings → General**.

---

## 4. Cannot See Teammates' Deals or Records

### Symptom
You can only see your own leads or deals, while your colleagues' records do not appear in list views.

### Root Cause
This is intentional system behavior based on your **Role Tier**:
* **Sales Reps (Tier 20)**: Access is scoped to records you own or are directly assigned to.
* **Managers (Tier 60)**: Can view records owned by themselves and their direct reporting team members.
* **Owners (Tier 100)**: Can view all organizational records across all departments.

### How to Resolve
* If you need access to a specific account or deal, ask the record owner or your manager to add you as a collaborator or reassign ownership.
* If your role was configured incorrectly, an administrator can adjust your tier under **Admin → Team & roles**.

---

## 5. Milestone Cannot be Marked "Invoiced"

### Symptom
The action button to update a payment milestone status to `Invoiced` is disabled.

### Root Cause
A milestone can only transition to **`Invoiced`** if its current status is **`Won`**. If the parent opportunity is still in an open pipeline stage (`0e` through `4a`), the milestone remains in `Planned` status and cannot be marked invoiced.

### How to Resolve
1. Check the parent Opportunity status.
2. Complete commercial negotiations and mark the deal as **Closed Won**.
3. All milestones will automatically shift to **`Won`**, enabling the **Mark as Invoiced** action.

---

## 6. PDF Proposal Not Rendering Correctly

### Symptom
Clicking **Preview / PDF** on a quotation fails to load or displays broken layout blocks.

### Diagnostic Steps
1. Verify that all line items have valid numeric values for **Quantity** and **Unit Price**.
2. Ensure the customer's billing address and primary contact are populated on the parent Account.
3. Check your browser's popup blocker if the PDF download window does not open automatically.
