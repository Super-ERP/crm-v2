# 1. Workspace & Personal Views

This chapter covers logging in, navigating the interface, switching organization workspaces, and personalizing data lists with saved views.

---

## Navigation & Workspace Layout

When you log in to the CRM, you are presented with the main application workspace:

1. **Top Header**:
   * **Active Organization**: Displays the current organization you are working within.
   * **Breadcrumb Navigation**: Shows your location within the application (e.g., `Leads > John Doe > Convert`).
   * **User Profile**: Access your account details, switch themes, or sign out.
2. **Left Sidebar**:
   The sidebar groups all business modules logically:
   * **CRM**: Leads, Accounts, Contacts.
   * **Sales**: Opportunities, Funnel, Quotations, Products, Payment Milestones, Projects, Sales Orders, Approvals.
   * **Insights**: Forecast, Audit.
   * **Admin**: Team & Roles, Settings.

---

## Multi-Tenancy & Organization Switching

The system is strictly multi-tenant. Every tenant's data (leads, opportunities, quotes, and settings) is completely isolated.

* **To switch organizations**: Click the organization dropdown at the top of the sidebar. Select the target organization from the list.
* **To create or manage organizations**: Users with the **Owner** role can open **Manage Organizations** from the switcher dropdown.

---

## User Roles & Access Hierarchy

Access is governed by a 4-tier role hierarchy:

| Role | Tier Level | Capabilities |
| :--- | :--- | :--- |
| **Owner** | Tier 100 | Full access to all data, financial records, tenant configuration, system settings, user management, and billing. |
| **Manager** | Tier 60 | Department-level oversight, pipeline reviews across direct reports, approval authority on quotes and stage gates. |
| **Sales Rep** | Tier 20 | Daily commercial operations: create and edit assigned leads, accounts, contacts, opportunities, and quotations. |
| **Viewer** | Tier 10 | Read-only access across assigned records. Cannot create, edit, or delete data. |

---

## Managing List Views & Personal Saved Views

Every major data table (Leads, Accounts, Contacts, Opportunities, Funnel, Quotations, Milestones) features a unified controls toolbar designed for high-density productivity.

```
[ Search records... ]  [ Filter (3) ]  [ Columns ]  [ Sort: Updated ↓ ]  [ Views: Active Deals ▾ ]
```

### 1. Searching Records
Type keywords into the search box. The search instantly filters records across primary identifiers (e.g., names, company names, codes, emails).

### 2. Applying Structured Filters
Click the **Filter** button to open the filter builder:
* Add one or multiple filter conditions (e.g., `Status equals Qualified`, `Owner equals Me`).
* Filters can be cleared individually or reset all at once.

### 3. Customizing Table Columns
Click the **Columns** dropdown:
* Check or uncheck columns to show or hide fields.
* Adjust column visibility to focus on the information relevant to your workflow.

### 4. Changing Page Size
Use the page-size selector at the bottom of the table to switch between **25**, **50**, or **100** rows per page.

### 5. Saving Personal Views
Once you have configured your ideal filters, sorting, and column preferences, you can save your setup:
* Click the **Views** dropdown on the toolbar.
* Select **Save view as...** and give your view a memorable name (e.g., *"My High Priority Deals"*).
* **Set as Default**: Check the default option if you want this view to load every time you open the module.
* **Manage Views**: You can rename, duplicate, or delete your custom views at any time.

> [!NOTE]
> **Privacy of Saved Views**: Saved views are strictly personal to your account. Creating, modifying, or deleting a saved view will never impact your team members' lists.
