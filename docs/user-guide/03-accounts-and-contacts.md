# 3. Accounts & Contacts

This chapter covers managing customer organizations (Accounts) and their associated personnel (Contacts).

---

## 1. Accounts (`/accounts`)

An **Account** represents an enterprise customer, client, partner, or reseller. It serves as the parent container for all commercial interactions, including contacts, active opportunities, quotations, and projects.

### Creating an Account
Accounts are usually created automatically during **Lead Conversion**, but can also be created manually:
1. Navigate to **CRM → Accounts** in the sidebar.
2. Click **+ New Account**.
3. Fill in the organization details:
   * **Company Name**: Official registered company name.
   * **Account Code**: Unique short business identifier (e.g., `ACME-01`).
   * **Account Type**: Select **Client** or **Reseller**.
   * **Currency**: Select the standard ISO Currency (e.g., `MYR`, `USD`, `SGD`, `EUR`).
   * **Phone & Website**: Primary office contact channels.
   * **Billing Address**: Street address, city, state/province, postal code, and country.
4. Click **Save Account**.

> [!IMPORTANT]
> **Currency Configuration**: Every Account must have an assigned ISO currency. All downstream Opportunities, Funnel deals, and Quotations created under this Account will inherit this currency to prevent multi-currency calculation errors.

### The Account Overview
Opening any Account presents a comprehensive 360-degree customer view:
* **Summary Cards**: Displays key metrics including total lifetime value, open deal count, and active quotations.
* **Contacts**: All stakeholders associated with this organization.
* **Opportunities & Funnels**: Historical and currently active sales pursuits.
* **Quotations**: All generated commercial proposals and revision histories.
* **Activity Stream**: An audit log showing recent updates, stage advances, and notes.

---

## 2. Contacts / Persons (`/persons`)

A **Contact** represents an individual stakeholder employed by an Account (e.g., procurement officer, project manager, technical lead, or executive sponsor).

### Creating a Contact
1. Navigate to **CRM → Contacts** (or click **+ Add Contact** from within an Account's detail view).
2. Enter the stakeholder's information:
   * **First Name & Last Name**
   * **Job Title**: (e.g., *Head of IT, Procurement Director, CFO*)
   * **Email Address**: Direct business email.
   * **Phone Number**: Direct office or mobile line.
   * **Account**: The parent company this contact belongs to.
   * **Primary Contact**: Toggle on if this individual is the primary point of contact for proposals and invoice attention.
3. Click **Save Contact**.

### Using Contacts in Sales Workflows
When generating quotations or advancing sales stages:
* The primary contact's details are automatically copied into the quotation's **Attention** field.
* Contacts can be assigned as the **Power Sponsor** during opportunity qualification.
