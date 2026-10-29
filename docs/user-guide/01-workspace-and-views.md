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
   * **Sales**: Opportunities, Funnel, Quotations, Products, Payment Milestones, Approvals and Project Codes, subject to permissions. Project Codes works without the optional Projects module.
   * **Admin**: Team & Roles, Settings.

---

## Multi-Tenancy and Organization Switching

The system is strictly multi-tenant. Every tenant's data (leads, opportunities, quotes, and settings) is completely isolated.

* **To switch organizations**: Click the organization dropdown at the top of the sidebar. Select the target organization from the list.
* **Organization administration**: The organization-management actions in the switcher are available to platform superadmins. Ask your administrator if you need a new organization.

---

## User Roles and Access Hierarchy

The seven default roles are **Owner, Admin, Developer, Manager, Senior Rep, Rep, and Viewer**. System roles are fixed templates; Advanced Roles lets administrators create custom roles and assign multiple roles to a member. Permissions combine across assigned roles. Role tiers do not grant approval authority.

Use the [role comparison and RBAC setup guide](https://jienweng.gitbook.io/q-app/docs/administration/roles-and-rbac) to compare capabilities and record scope. Viewer is read-only across the organization. Manager sees their own records and their reporting subtree; Senior Rep and Rep see only their own sales records by default. Reseller accounts and contacts are shared master data within the entity; their sales transactions retain ownership scope.

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

Click a filterable **column header** to open its sort-and-filter menu. The first condition uses that column. Choose an operator and value, then **Apply filters**. Active filter chips below the toolbar let you edit or remove applied rules.

Use **Add condition** for another rule and **Add group** for nested rules. **Match all (AND)** requires every condition in that group; **Match any (OR)** requires at least one. For example: `(Stage is 4A OR Closed Won) AND Expected close year is 2026`. A header opens the whole applied filter tree, so rules for other columns stay visible. **Clear filters** clears the draft tree; click **Apply filters** to apply that change. **Cancel** leaves applied filters unchanged.

For Payment Milestones, choose **Funnel → Stage**, use **any of**, and select the configured 4a and Closed Won stages. This is separate from milestone **Status** (Pending invoicing/Invoiced) and **Quotation → Status**. The list includes existing milestones only.

On Funnel, the **Expected close year** quick filter is also available for selecting calendar years. Board view keeps its own filter controls because it has no column headers.

{% endstep %}
{% step %}

#### Customizing Table Columns

Click **Columns** to show or hide fields, move them up or down, set their width, and pin them to the left or right. You can also resize a header by dragging its edge; focus the resize handle and use the arrow keys for keyboard resizing. Required identifying and action columns remain visible.

Existing default columns and saved layouts stay in place. Extra supported fields start hidden; search inside **Columns** to find and enable them. Hidden fields are also available in the filter field selector, so you can filter without adding another visible column.

Your layout is personal and saved for that list and organization. **Reset column layout** restores the default columns without clearing filters. Pinning is temporarily suspended on narrow screens while your desktop preference is retained.

The column-header filter editor supports nested AND/OR groups, calendar-year and relative-date conditions. Dates use the business timezone shown in the editor. Monetary comparisons require an explicit currency. Applied quick filters are included in the same filter tree.

Filters apply before pagination across the accessible result set. Use **Ascending**, **Descending** or **Clear sort** in a column header menu where offered. Tables support up to five sort fields; sortable headers without a menu also support Shift-click sorting.

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

### Table readability

Long cell values wrap within their own columns instead of overlapping neighbouring records. Names, descriptions, product codes and subcategories have wider defaults, while units, status and action columns stay compact. Existing explicitly saved widths take precedence; use **Columns → Reset column layout** to adopt the current defaults.

The Project Code detail Funnel tab starts with the funnel, stage, amount, expected close date and owner. Account, Opportunity and Relationship remain available under **Columns** and in column-header filters; related records also have their own tabs.


## Export a table

Click **Export** beside **Columns** to download a CSV of all matching rows with the current filters, sorting and visible columns. Apply draft filter changes first. Clear search and filters to export all accessible records.

Server lists load all matching pages, up to 100,000 records. Add filters for larger exports. If the record count changes, duplicate records are detected, or loading stops early, export fails visibly so you can retry. Export is not a database snapshot; avoid changing records while exporting. Panels whose source is truncated cannot export a complete result.

## Related records in table views

Existing columns and saved layouts stay in place. In **Columns**, search for a relationship such as **Milestones**, **Quotations**, **Account** or **Products**. Single related records offer their supported fields; collections offer a count, distinct values, earliest/latest dates and supported numeric totals. Money totals stay grouped by currency. These summaries include all accessible linked records; a filter that selects parent records does not implicitly narrow their summaries to the matching children.

To find accounts with a pending milestone due in 2026:

1. Open a column's filter menu and select **Milestones** as the filter field.
2. Choose **has a matching record**, then open **Milestones: matching conditions**.
3. Add **Status → any of → Pending invoicing** and **Due date → year → 2026**, using **Match all (AND)**.
4. Apply the inner conditions, then apply the parent filter.

All conditions inside the relationship must match the same milestone. **Has no matching record** also includes accounts with no accessible milestones. **All records match (at least one)** requires a nonempty accessible collection. Use **empty/not empty** to test whether any accessible linked records exist.

Parent rows remain one per record; bridge-table relationships count a target once even if several linking rows exist. Related filters run before server pagination and counting. Complete-client panels fetch authorized related summaries for their full source arrays. Related columns are included in Excel/CSV exports with the current view.

Only registered business relationships/fields are offered. Target permissions and module entitlements apply independently from access to the parent. Nested relationship conditions support two relationship steps within the existing five group levels, 50-condition and 32 KiB limits. Individual child-row reports should start from that child's table; a parent summary export does not flatten children into duplicate parent rows.
