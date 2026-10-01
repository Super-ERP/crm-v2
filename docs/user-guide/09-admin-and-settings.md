# 9. Administration & Settings

This chapter covers user management, RBAC tiers, forecasting, audit trails, and tenant settings configuration.

---

## 1. Team & Roles (`/team`)

User administration is managed by users with the **Owner** or **Manager** role.

### Inviting Team Members
1. Navigate to **Admin → Team & roles** in the sidebar.
2. Click **+ Invite Member**.
3. Enter:
   * **Full Name & Email Address**.
   * **Role**:
     * **Owner (Tier 100)**: Full administrative power.
     * **Manager (Tier 60)**: Department manager with approval authority.
     * **Sales Rep (Tier 20)**: Individual contributor managing deals and quotes.
     * **Viewer (Tier 10)**: Read-only access.
   * **Reporting Manager**: Assign their direct supervisor for approval routing and pipeline visibility.
4. Click **Send Invitation**.

---

## 2. Revenue Forecast (`/forecast`)

The **Forecast** dashboard provides real-time visibility into your sales pipeline.

* **Weighted Pipeline Calculation**:
  $$\text{Weighted Value} = \text{Deal Value} \times \text{Stage Win Probability}$$
* **Breakdowns**:
  * View projected revenue by fiscal quarter or month.
  * Filter by sales team, individual rep, or product category.
  * Compare pipeline stage distribution (`0e` through `4a`) against quarterly sales targets.

---

## 3. System Audit Log (`/audit`)

Super-ERP maintains an immutable, compliance-ready record of all platform activities.

* Navigate to **Insights → Audit** to search activity history:
  * **Who**: The user who performed the operation.
  * **What**: The entity modified (e.g., `Quotation QDT-2026-0042`, `Opportunity Acme Corp`).
  * **Action**: `Created`, `Updated`, `Deleted`, `Stage Advanced`, `Approved`.
  * **Diff**: Explicit old value vs. new value comparison.
  * **Timestamp**: Exact UTC and local timestamp.

---

## 4. Tenant Settings (`/settings`)

Users with the **Owner** role configure organizational defaults under **Admin → Settings**:

### General Settings (`/settings/general`)
* **Organization Name**: Official legal entity name.
* **Base Currency**: Default financial currency for the tenant.
* **Fiscal Year Start**: Calendar alignment for quarterly forecasting.

### Taxonomy Settings (`/settings/taxonomy`)
* **Product Categories**: Define classification tags for the product catalog.
* **Lead Sources**: Customize sources (e.g., *Google Ads, Tech Expo, Partner Referral*).
* **Lost Reasons**: Standardize why deals are lost (e.g., *Price High, Missing Feature, Competitor*).

### Document Settings (`/settings/documents`)
* **Default Payment Terms**: e.g., *"30 Days from invoice date"*.
* **Delivery Notes**: Standard warranty and delivery clauses printed on quote footers.
* **Tax Configurations**: Set default tax rates (e.g., *8% Service Tax / SST*) and toggle tax-inclusive vs. tax-exclusive line item pricing.
