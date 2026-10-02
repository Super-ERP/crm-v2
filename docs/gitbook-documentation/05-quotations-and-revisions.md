---
description: Prepare an offer, get approval, and manage customer changes.
icon: file-lines
---

# Quotations and revisions

Prepare an offer, get approval, and manage customer changes.

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#quotation).

## On this page

* [Create a quote](#creating-a-quotation)
* [Check approval status](#the-quotation-lifecycle)
* [Actions by status](#actions-by-status)
* [Create a revision](#managing-revisions)
* [Print a PDF](#exporting-client-pdfs)

---

## What is a Quotation?

A **Quotation** is the formal commercial and legal proposal presented to the customer. It contains itemized pricing, tax breakdowns, delivery schedules, and payment terms.

---

## Creating a Quotation

{% stepper %}
{% step %}

#### Start a quotation

Open the target deal in **Sales → Funnel** and click **+ New Quotation** (or navigate to **Sales → Quotations** and click **+ New Quotation**).

{% endstep %}
{% step %}

#### Check linked records

The system automatically links the quote to the Opportunity, Account, and Account Currency.

{% endstep %}
{% endstepper %}

### Check defaults before sending

Review payment terms, delivery notes, the recipient contact, currency, and tax before submitting the quote. Defaults help you prepare a draft; do not assume that every default becomes immutable at creation.

{% hint style="info" %}
**Sending freezes the tax snapshot.** Draft labels can use the selected tax setting. When the quotation is sent, the applicable rate is captured so the sent quote no longer tracks later tax-setting changes.
{% endhint %}

---

## Adding Line Items and Product Pricing

{% stepper %}
{% step %}

#### Add a line item

In the **Line Items** section, click **+ Add Line Item**.

{% endstep %}
{% step %}

#### Choose a catalog product

**Select from Product Catalog**:

* Search for existing products by SKU or name. Selecting a product automatically populates its unit price, category, and tax eligibility.

{% endstep %}
{% step %}

#### Add custom items if needed

**Custom Line Items**:

* You can manually type custom service descriptions, deliverable milestones, or bespoke project scopes.

{% endstep %}
{% step %}

#### Review pricing

**Configure Pricing**:

* **Quantity**: Number of units/days/hours.
* **Unit Price**: Base price per unit in the account currency.
* **Discount (%)**: Optional percentage discount.
* **Tax Rate**: Applies tenant tax setting (e.g., 0% Exempt, 6%, 8% SST).

{% endstep %}
{% step %}

#### Check the totals

The system computes subtotal, total discount, tax amount, and final total in real time.

{% endstep %}
{% endstepper %}

---

## Document Templates

Select the template appropriate for your offering:

* **Standard Proposal & Quotation**: Full commercial proposal layout suitable for software licenses, professional consulting, and managed services.
* **Quandatics Academy Template**: Formatted specifically for training courses, workshops, certification programs, and educational services.

---

## The Quotation Lifecycle

```mermaid
flowchart TD
    D["Draft"] --> P["Pending approval"]
    P -->|"Approve"| A["Approved"]
    P -->|"Reject with reason"| D
    A -->|"Return to Draft"| D
    A -->|"Send"| S["Sent"]
    S --> C["Accepted"]
    S --> R["Rejected by customer"]
```

**Revision is a separate record:** an eligible historical quotation creates a new Draft copy. The original Sent or Accepted quote does not change back to Draft when you revise it.

### `Draft`
The sales rep drafts and edits line items, notes, and pricing.

### `Pending Approval`
A draft must be approved before it can be sent:

* Click **Submit for Approval**.
* The quote is locked against further edits and reviewed on the quotation by the first active manager in the account owner’s reporting line with **Approve quotations** permission. Only that eligible manager may approve or reject it. The **Approvals** module handles stage requests separately.
* If the account owner changes while approval is pending, the quotation returns to Draft with an explanation. The new owner must resubmit it.

### `Approved`
The eligible reporting manager approves the quote. A member with send permission can then record sending it. To change an Approved quotation, use **Return to Draft**, then edit and resubmit. Approval is required again. Sending records the action; it does not send an email notification.

### `Sent`
Once delivered to the customer via email or formal meeting, use **Send** to record sending.

### `Accepted` or `Rejected`

* **Accepted**: The customer accepts the proposal. *(Note: Customer acceptance records commercial agreement; it does not automatically move the Funnel stage).*
* **Rejected**: The customer rejected the proposal.

---

## Actions by status

Each action also requires record access and its permission. **Edit quotations** allows editing Drafts, submitting them, and returning Approved quotations to Draft. **Create quotations** allows creating eligible revisions. **Approve quotations** is limited to the current eligible reviewer. **Send quotations** and **Accept quotations** are separate permissions.

| Current status | Available lifecycle actions | Editing and revision |
| --- | --- | --- |
| Draft | Submit for Approval. | Edit this record; no revision action. |
| Pending Approval | Eligible reviewer approves or rejects with a reason. | Read-only; rejection returns this record to Draft. No revision action for a live record. |
| Approved | Send, or Return to Draft. | Read-only until returned to Draft. Returning clears approval; resubmit after editing. No revision action for a live record. |
| Sent | Record customer acceptance or rejection. | Read-only; create a separate Draft revision with Create quotations permission. |
| Accepted or customer Rejected | No further lifecycle decision on this record. | Read-only; an eligible revision starts a separate Draft. |
| Expired or Void | No manual lifecycle action offered by the current action menu. | Eligible historical states for a separate Draft revision. |

**Send checks:** the funnel must still be open and the quotation must not be past **Valid until**. If an Approved quotation has lapsed, return it to Draft, update its validity, and obtain approval again. **Send** records sending; deliver the document to the customer through your usual channel.

**Acceptance checks:** only a Sent quotation on an open funnel can be accepted, and its validity date must not have passed. Only one live quotation per funnel can be Accepted. Creating a revision of an Accepted quote does not replace that acceptance; the current workflow blocks accepting another quote while the earlier live quote remains Accepted. Ask your administrator or support contact to review the case rather than treating the revision as accepted.

**Other actions:** **Set Primary** is shown for non-primary Sent or Accepted quotations with Edit quotations permission. It selects the quotation used for linked funnel values; it does not approve it. Deletion requires **Delete quotations**, is subject to record/reference checks, and is blocked for Accepted quotations. Deletion is not a customer-rejection or approval-rejection decision.

**PDF checks:** Preview and exporting do not approve or send the quotation. Sending captures the tax rate and recomputes stored totals using the current tax configuration. Review the final PDF's tax and totals before sharing, especially if settings changed during review.

See [Documents, actions, and approval](https://jienweng.gitbook.io/q-app/reference/documents-and-actions) for version-specific examples.

## Managing Revisions

Customers often request scope adjustments or discount updates after a quote is sent.

**To create a revision:**

{% stepper %}
{% step %}

#### Open the source quotation

Open the existing sent or accepted quotation.

{% endstep %}
{% step %}

#### Create a revision

Use the revision action available on the quotation. Sent, Accepted, Rejected, Expired, and Void quotations are eligible historical states.

{% endstep %}
{% step %}

#### Review the new draft

The system executes the following:

* **Preserves Source**: The source quotation keeps its status and history; its content remains read-only.
* **Creates Revision**: A new linked draft copy is created. Use its displayed quotation number when referring to the revision.
* The new revision has no approver, approval date, sending date, or customer acceptance. It starts non-primary. Review copied items, terms, dates, and tax before submitting it through its own approval flow.

{% endstep %}
{% endstepper %}

---

{% hint style="warning" %}
**Approved or pending quote?** An approved quote can be returned to Draft, edited, and submitted for approval again. A pending quote must first be reviewed. The revision action is not available on live Pending Approval or Approved quotes.
{% endhint %}

## Exporting Client PDFs

Open **Preview** on the quotation:

* Generates a branded, publication-ready PDF proposal.
* Includes company branding, billing addresses, line items table, payment milestones, terms, and signature acceptance blocks.
* Open the quotation preview and use the print/PDF action. In the browser print dialog, choose **Save as PDF**, then check the saved file before sharing it.

## Continue

* [Payment milestones](06-payment-milestones.md)
* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](https://jienweng.gitbook.io/q-app)
