---
description: Find modules, switch organizations, and save a useful list view.
icon: compass
---

# Workspace and personal views

Find modules, switch organizations, and save a useful list view.

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#organization-workspace-and-tenant).

## On this page

* [Navigation](#navigation-and-workspace-layout)
* [Dashboard](#dashboard)
* [Switch organizations](#multi-tenancy-and-organization-switching)
* [Save a view](#managing-list-views-and-personal-saved-views)

---

## Dashboard

The dashboard shows follow-ups, approvals, open funnels, and sales charts. Members with **View all records**, or managers with reports, can switch the funnel summary between **My work** and **Team**. Team charts include only records in the member's visible reporting line unless they have View all records. Other members see only their own records. The activity chart follows the same access scope.

Use **Currency** beside the welcome message to choose from the currencies supported by your organization. The open-funnel value and monetary charts never add different currencies together or apply an assumed exchange rate. The configured default currency is selected when supported; otherwise the first supported currency is shown. Currencies without matching records show zero totals. A primary quotation supplies the currency for quote-derived funnel values and synced product lines. Funnel estimates use the funnel's own currency.

The follow-up card shows the next ten due items while its count reflects all due items. Administrators can adjust the follow-up and stale-funnel windows under **Settings → General → Behavior**.

---

## Navigation and Workspace Layout

When you log in to the CRM, you are presented with the main application workspace:

* **Top Header**:
   * **Active Organization**: Displays the current organization you are working within.
   * **User Profile**: Access your account details, switch themes, or sign out.
* **Left Sidebar**:
   The sidebar groups all business modules logically:
   * **CRM**: Leads, Accounts, Contacts.
   * **Sales**: Opportunities, Funnel, Quotations, Products, Payment Milestones, Approvals.
   * **Admin**: Team & Roles, Settings.

---

## Multi-Tenancy and Organization Switching

The system is strictly multi-tenant. Every tenant's data (leads, opportunities, quotes, and settings) is completely isolated.

* **To switch organizations**: Click the organization dropdown at the top of the sidebar. Select the target organization from the list.
* **Organization administration**: The organization-management actions in the switcher are available to platform superadmins. Ask your administrator if you need a new organization.

---

## User Roles and Access Hierarchy

The seven default roles are **Owner, Admin, Developer, Manager, Senior Rep, Rep, and Viewer**. System roles are fixed templates; Advanced Roles lets administrators create custom roles and assign multiple roles to a member. Permissions combine across assigned roles. Role tiers do not grant approval authority.

Use the [role comparison and RBAC setup guide](https://jienweng.gitbook.io/q-app/docs/administration/roles-and-rbac) to compare capabilities and record scope. Viewer is read-only across the organization; Manager, Senior Rep, and Rep normally use their own/reporting-subtree scope.

---

## Managing List Views and Personal Saved Views

Major record lists provide controls for finding records and adjusting your view. Record tables share advanced filters and column controls; document editors and approval cards keep their own controls.

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

Type keywords into the search box. Searchable fields vary by module. Funnel search matches only the funnel name; use Account, Opportunity and Account owner filters for related records. Search inside a relation picker narrows its options.

{% endstep %}
{% step %}

#### Applying Structured Filters

Click the **Filter** button to open the filter builder:

* Add one or multiple filter conditions (e.g., `Status equals Qualified`, `Owner equals Me`).
* Filters can be cleared individually or reset all at once.

{% endstep %}
{% step %}

#### Customizing Table Columns

Click **Columns** to show or hide fields, move them up or down, set their width, and pin them to the left or right. You can also resize a header by dragging its edge; focus the resize handle and use the arrow keys for keyboard resizing. Required identifying and action columns remain visible.

Your layout is personal and saved for that list and organization. **Reset column layout** restores the default columns without clearing filters. Pinning is temporarily suspended on narrow screens while your desktop preference is retained.

Use **Advanced filters** to combine conditions with nested **All (AND)** and **Any (OR)** groups. Choose the field and operator, enter values, then **Apply filters**. Closing the editor keeps the applied filters unchanged. Quick filters are included when you open the advanced editor. Date controls include calendar year and relative periods, using the business timezone shown in the editor. Monetary comparisons require an explicit currency.

Filters apply before pagination across the accessible result set. Hold **Shift** while clicking sortable headers to combine up to five sort fields.

{% endstep %}
{% step %}

#### Changing Page Size

Use the page-size selector at the bottom of the table to switch between **25**, **50**, or **100** rows per page.

{% endstep %}
{% step %}

#### Saving Personal Views

Once you have configured your ideal filters, sorting, and column preferences, you can save your setup:

* Click the **Views** dropdown on the toolbar.
* Select **Save current view** and give your view a memorable name (e.g., *"My High Priority Deals"*).
* **Update with current settings** replaces the selected view’s filters, sorts, column order, widths, pinning, visibility and page size.
* **Set as default**: Select a saved view, then use this action in Views to load it by default for that module.
* Select a saved view to **Rename**, **Duplicate**, or **Delete** it from Views.

{% hint style="info" %}
Explicit URL settings take precedence over the default view and personal layout. If a saved filter refers to a removed field, the view needs updating before it can be applied. Large filter trees should be saved as a view rather than shared as a long URL.

**Privacy of Saved Views**: Saved views are strictly personal to your account. Creating, modifying, or deleting a saved view will never impact your team members' lists.
{% endhint %}

{% endstep %}
{% endstepper %}

## Continue

* [Leads & conversion](https://jienweng.gitbook.io/q-app/docs/customer-records/02-leads-management)
* [Troubleshooting](https://jienweng.gitbook.io/q-app/docs/help/troubleshooting)
* [Back to start](README.md)
