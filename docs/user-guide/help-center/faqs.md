---
description: Answers to the most common operational and interface questions in Q-App.
icon: circle-question
---

# Frequently Asked Questions (FAQ)

Find quick answers to common questions about using Q-App across leads, sales funnels, quotations, and system settings.

---

## Leads & Lead Conversion

<details>
<summary>Can I undo a lead conversion?</summary>

**No.** Lead conversion is an atomic, permanent database transaction. When you convert a lead, the system creates or links an Account, a Contact, and an Opportunity seeded at stage `0E`. To preserve audit history and prevent duplicated records, converted leads cannot be converted again or un-converted.

</details>

<details>
<summary>How do I restore a disqualified lead?</summary>

If a previously disqualified prospect re-engages with your team:
1. Open **CRM → Leads** and filter your view to show `Disqualified` leads.
2. Click on the lead to open their detail view.
3. In the top action bar, click **Restore to Contacted**.
4. The lead status reverts to `Contacted`, and you can resume the qualification process.

</details>

<details>
<summary>Why is the "Convert Lead" button not clickable?</summary>

The **Convert Lead** action requires:
1. Your user account must hold the `lead.convert` permission (held by Sales Rep, Manager, and Owner tiers).
2. The lead must not already be in `Converted` status.
3. If the button is disabled, check with your administrator to ensure your role tier has conversion permissions enabled.

</details>

---

## Accounts & Currencies

<details>
<summary>Why must every Account have an assigned currency?</summary>

All downstream commercial records (Opportunities, Funnel deals, and Quotations) inherit their financial currency directly from the parent Account. Setting an explicit ISO currency (e.g., `MYR`, `USD`, `SGD`) ensures that line items, taxes, and revenue forecasts are calculated consistently without multi-currency rounding errors.

</details>

<details>
<summary>Can I change an Account's currency after creating opportunities?</summary>

{% hint style="warning" %}
**Caution**: Changing an Account's currency after active deals or quotations have been created will not automatically recalculate existing quotation figures. Ensure the correct currency is established before generating formal quotations.
{% endhint %}

</details>

---

## Sales Pipeline & PPVVC

<details>
<summary>What does the opportunity code "QDTOPP-2026-0042" stand for?</summary>

Every opportunity receives a standardized system identifier:
$$\text{ORGCODEOPP-YYYY-NNNN}$$
* `ORGCODE`: Your organization's code prefix (configured in Settings).
* `OPP`: Denotes an Opportunity record.
* `YYYY`: Year of creation (e.g., 2026).
* `NNNN`: Unique sequential sequence number.

</details>

<details>
<summary>Can I move an opportunity backward in the sales funnel?</summary>

**Yes.** You can roll back an opportunity to any prior non-terminal stage (e.g., from `3E` back to `2E`) without restrictions if project requirements change. However, moving **forward** re-evaluates required stage gates and data validations.

</details>

<details>
<summary>When is a Delivery Project Code allocated?</summary>

The system automatically reserves and allocates the official **Delivery Project Code** the first time an opportunity enters stage **`4A` (Commitment)**. This allows delivery teams to prepare project plans before the final contract signature.

</details>

<details>
<summary>Can I reopen a deal that was marked Closed Won or Closed Lost?</summary>

`Closed Won` and `Closed Lost` are **terminal stages**. Once a deal enters a terminal stage, its stage cannot be moved forward or backward, and associated payment milestones are locked. If a customer wishes to purchase additional services, create a new Opportunity under that Account.

</details>

---

## Quotations, Tax & Approvals

<details>
<summary>How do I create a new revision of a quotation?</summary>

When a client requests modifications to an approved or sent quote:
1. Open the existing quotation.
2. Click the **Revise** button in the top action bar.
3. The original quote is preserved in history as an immutable record.
4. A new draft quotation is created with an incremented revision identifier (e.g., `-Rev1`), which you can edit and submit for approval.

</details>

<details>
<summary>How do tax calculations work on line items?</summary>

Tax rates (e.g., *8% SST*) are governed by your organization's **Tax Settings**. Depending on your configuration, pricing can be set as **Tax Inclusive** (tax is calculated within the stated unit price) or **Tax Exclusive** (tax is added on top of the subtotal).

</details>

<details>
<summary>What happens if a quotation approval is rejected by my manager?</summary>

If a manager rejects an approval request, they must provide an explanatory rejection note. The quotation returns to **`Draft`** status, allowing the sales representative to adjust discounts or terms and resubmit.

</details>

---

## Payment Milestones

<details>
<summary>When do Payment Milestones automatically become "Won"?</summary>

The moment an Opportunity is moved to **Closed Won**, all active payment milestones associated with that deal automatically update their status from `Planned` to **`Won`**.

</details>

<details>
<summary>How do I mark a milestone as billed?</summary>

Navigate to **Sales → Payment Milestones**, open the milestone, and update its status from **`Won`** to **`Invoiced`**. Milestones serve as commercial planning records and are intentionally decoupled from automated ERP invoice generation.

</details>
