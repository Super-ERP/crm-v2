---
description: Find modules, switch organizations, and save a useful list view.
icon: compass
---

# Workspace and personal views

Find modules, switch organizations, and save a useful list view.

**New to these terms?** Read the [terminology reference](reference/terminology.md#organization-workspace-and-tenant).

## On this page

* [Navigation](#navigation-and-workspace-layout)
* [Dashboard](#dashboard)
* [Switch organizations](#multi-tenancy-and-organization-switching)
* [Save a view](#managing-list-views-and-personal-saved-views)

---

## Dashboard

The dashboard shows follow-ups, approvals, open funnels, and sales charts. Members with **View all records**, or managers with reports, can switch the funnel summary between **My work** and **Team**. Team charts include only records in the member's visible reporting line unless they have View all records. Other members see only their own records. The activity chart follows the same access scope.

When records use several currencies, use **Display currency** to inspect each currency separately. The open-funnel value and monetary charts never add different currencies together or apply an assumed exchange rate. The configured default currency is selected when it has data; otherwise the first available currency is shown. A primary quotation supplies the currency for quote-derived funnel values and synced product lines. Funnel estimates use the funnel's own currency.

The follow-up card shows the next ten due items while its count reflects all due items. Administrators can adjust the follow-up and stale-funnel windows under **Settings → General → Behavior**.

---

## Navigation and Workspace Layout

When you log in to the CRM, you are presented with the main application workspace:

* **Top Header**:
   * **Active Organization**: Displays the current organization you are working within.
   * **Breadcrumb Navigation**: Shows your location within the application (e.g., `Leads > John Doe > Convert`).
   * **User Profile**: Access your account details, switch themes, or sign out.
* **Left Sidebar**:
   The sidebar groups all business modules logically:
   * **CRM**: Leads, Accounts, Contacts.
   * **Sales**: Opportunities, Funnel, Quotations, Products, Payment Milestones, Projects, Sales Orders, Approvals.
   * **Insights**: Forecast, Audit.
   * **Admin**: Team & Roles, Settings.

---

## Multi-Tenancy and Organization Switching

The system is strictly multi-tenant. Every tenant's data (leads, opportunities, quotes, and settings) is completely isolated.

* **To switch organizations**: Click the organization dropdown at the top of the sidebar. Select the target organization from the list.
* **Organization administration**: The organization-management actions in the switcher are available to platform superadmins. Ask your administrator if you need a new organization.

---

## User Roles and Access Hierarchy

The standard roles are shown below. Permissions can be customized; your role name or tier alone does not guarantee access to a module.

| Role | Tier Level | Capabilities |
| :--- | :--- | :--- |
| **Owner** | Tier 100 | Full access to all data, financial records, tenant configuration, system settings, user management, and billing. |
| **Manager** | Tier 60 | Department-level oversight, pipeline reviews across direct reports, approval authority on quotes and stage gates. |
| **Sales Rep** | Tier 20 | Daily commercial operations: create and edit assigned leads, accounts, contacts, opportunities, and quotations. |
| **Viewer** | Tier 10 | Read-only access across assigned records. Cannot create, edit, or delete data. |

---

## Managing List Views and Personal Saved Views

Major record lists provide controls for finding records and adjusting your view. Available controls vary by module.

| Control | Use it to |
| --- | --- |
| Search | Find records by name, code, or another searchable field. |
| Filters | Narrow the list to the records you need. |
| Columns | Choose which fields are visible. |
| Sort | Change the order of results. |
| Views | Save or restore your personal list setup. |

{% stepper %}
{% step %}

#### Searching Records

Type keywords into the search box. The search instantly filters records across primary identifiers (e.g., names, company names, codes, emails).

{% endstep %}
{% step %}

#### Applying Structured Filters

Click the **Filter** button to open the filter builder:

* Add one or multiple filter conditions (e.g., `Status equals Qualified`, `Owner equals Me`).
* Filters can be cleared individually or reset all at once.

{% endstep %}
{% step %}

#### Customizing Table Columns

Click the **Columns** dropdown:

* Check or uncheck columns to show or hide fields.
* Adjust column visibility to focus on the information relevant to your workflow.

{% endstep %}
{% step %}

#### Changing Page Size

Use the page-size selector at the bottom of the table to switch between **25**, **50**, or **100** rows per page.

{% endstep %}
{% step %}

#### Saving Personal Views

Once you have configured your ideal filters, sorting, and column preferences, you can save your setup:

* Click the **Views** dropdown on the toolbar.
* Select **Save view as...** and give your view a memorable name (e.g., *"My High Priority Deals"*).
* **Set as Default**: Check the default option if you want this view to load every time you open the module.
* **Manage Views**: You can rename, duplicate, or delete your custom views at any time.

{% hint style="info" %}
**Privacy of Saved Views**: Saved views are strictly personal to your account. Creating, modifying, or deleting a saved view will never impact your team members' lists.
{% endhint %}

{% endstep %}
{% endstepper %}

## Continue

* [Leads & conversion](02-leads-management.md)
* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](README.md)
