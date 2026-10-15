---
description: Maintain the companies and people involved in your deals.
icon: address-book
---

# Accounts and contacts

Maintain the companies and people involved in your deals.

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#account).

## On this page

* [Create an account](#creating-an-account)
* [Create a contact](#creating-a-contact)

---

## Accounts

An **Account** represents an enterprise customer, client, partner, or reseller. It serves as the parent container for all commercial interactions, including contacts, active opportunities, and quotations.

### Creating an Account
Accounts are usually created automatically during **Lead Conversion**, but can also be created manually:

{% stepper %}
{% step %}

#### Open Accounts

Navigate to **CRM → Accounts** in the sidebar.

{% endstep %}
{% step %}

#### Start a new account

Click **+ New Account**.

{% endstep %}
{% step %}

#### Enter company details

Fill in the organization details:

* **Company Name**: Official registered company name.
* **Account Code**: Optional identifier, unique within the organization: 2–6 letters or digits (e.g., `ACME01`). Leaving it blank generates a code from the name.
* **Account Type**: Select **Client** or **Reseller**.
* **Currency**: Select the standard ISO Currency (e.g., `MYR`, `USD`, `SGD`, `EUR`).
* **Phone & Website**: Primary office contact channels.
* **Billing Address**: Street address, city, state/province, postal code, and country.

{% endstep %}
{% step %}

#### Save the account

Click **Create account**.

{% endstep %}
{% endstepper %}

{% hint style="warning" %}
**Currency Configuration**: Every Account must have an assigned ISO currency. This supplies a default for related sales records. Review the currency on each Funnel and quotation: quotations can use another supported currency, and selecting Bill To does not convert prices.
{% endhint %}

### The Account Overview
Opening any Account presents a comprehensive 360-degree customer view:

* **Related-record counts**: Contacts, Opportunities, Funnels, Quotations and Child accounts; Projects appears when enabled.
* **Contacts**: All stakeholders associated with this organization.
* **Opportunities & Funnels**: Historical and currently active sales pursuits.
* **Quotations**: All generated commercial proposals and revision histories.
* **Activity Stream**: An audit log showing recent updates, stage advances, and notes.

### Shared resellers and billing relationships

Reseller accounts and their contacts are shared within the entity so account managers can select them when preparing quotations. Viewing a reseller does not grant permission to change its account data or view other salespeople's Funnels, Opportunities, Projects or Quotations.

A reseller can serve several end users, and an end user can receive quotations through several resellers. Select the actual **Bill To** account on each quotation. The account's **Default end user (optional)** field is a legacy convenience; it does not restrict the quotation's billing relationships. You can create a reseller without filling this field.

Keep the Funnel under the end user and retain the responsible salesperson's ownership. See [quotation billing](05-quotations-and-revisions.md#bill-to-when-quoting-through-a-reseller).

### Changing the account owner

Edit **Account owner** on the account detail page to transfer responsibility. Active contacts, Opportunities, and Funnels under the account receive the new owner in the same transaction. Quotations and payment milestones inherit access through their Funnel.

Pending stage requests are cancelled, and pending quotations return to Draft with a resubmission explanation. The new account owner can submit them again so approval reaches their eligible reporting manager. Completed approval decisions remain historical records.

---

## Contacts

A **Contact** represents an individual stakeholder employed by an Account (e.g., procurement officer, project manager, technical lead, or executive sponsor).

### Creating a Contact

{% stepper %}
{% step %}

#### Open Contacts

Navigate to **CRM → Contacts** (or click **+ Add Contact** from within an Account's detail view).

{% endstep %}
{% step %}

#### Enter stakeholder details

Enter the stakeholder's information:

* **First Name** (required) and **Last Name** (optional)
* **Job Title**: (e.g., *Head of IT, Procurement Director, CFO*)
* **Email Address**: Optional on the manual contact form; required for lead conversion.
* **Phone Number**: Direct office or mobile line.
* **Account**: The parent company this contact belongs to.
* **Primary Contact**: Toggle on if this individual is the primary point of contact for proposals and invoice attention.

{% endstep %}
{% step %}

#### Save the contact

Click **Create contact**.

{% endstep %}
{% endstepper %}

### Using Contacts in Sales Workflows
When generating quotations or advancing sales stages:

* The primary contact's details are automatically copied into the quotation's **Attention** field.
* Contacts can be assigned as the **Power Sponsor** during opportunity qualification.

## Continue

* [Opportunities & sales funnel](04-opportunities-and-funnel.md)
* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](https://jienweng.gitbook.io/q-app)
