# Q-App user guide

This repository guide points to the maintained task guides. It covers the current Base modules and Advanced Roles workflow. Available modules, record access and stage requirements depend on organization configuration.

## Workspace and personal views

Check the active organization before working. Search and filter controls vary by module; Funnel search matches the funnel name. Use **Views → Save current view** to save personal filters, sorting, columns and page size. Select a saved view to set it as default, rename, duplicate or delete it.

Read [Workspace and personal views](user-guide/01-workspace-and-views.md) and [Quick start by role](user-guide/quick-start.md).

## Leads and conversion

Create a lead with its contact name, company, valid email, optional phone, source and status. The creator receives ownership. Disqualification requires a typed reason; there is no dedicated restore-to-Contacted action. Converted status is set through conversion, not ordinary editing.

Conversion links or creates an Account, creates a Contact, and the current form creates an Opportunity and its first Funnel at 0e. Submit for reporting-manager approval; no linked records are created while pending. A member with conversion-approval permission, an active reporting profile and no superior can convert directly. Disqualified and already Converted leads cannot convert.

Read [Leads and conversion](gitbook-documentation/02-leads-management.md).

## Accounts and contacts

Accounts hold company details, billing address, currency and related records. A manually created account can generate its code when blank; a new account in lead conversion requires a 2–6 character alphanumeric code. Contacts belong to accounts; manual contact creation permits an optional email, while conversion requires one.

Reseller accounts and contacts are shared master data within the entity; this does not expose other salespeople's transactions. Keep the Funnel under the end user and choose the actual quotation **Bill To** and its **Attention** contact. Review the saved billing snapshot before sending.

Read [Accounts and contacts](gitbook-documentation/03-accounts-and-contacts.md).

## Opportunities and Funnel

An Opportunity holds shared qualification and budget context; its Funnels hold individual pursuit stages and quotation links. Standard stages are 0e Identified, 1d Qualified, 2c Proposal, 3b Negotiation, 4a Commit, Closed Won, Closed Lost and KIV.

Complete PPVVC and operational fields on the appropriate record. Forward moves check configured earlier-stage fields; Won and board workflows have qualification exceptions. Open-stage rollback skips forward field gates. KIV reopening uses manager approval policy. Won and Lost are terminal.

Read the [stage requirements and exceptions](gitbook-documentation/04-opportunities-and-funnel.md#fields-and-gates-by-stage) before moving a stage.

## Quotations and revisions

Draft quotations support catalog or custom lines, quantities, prices, currency-amount discounts, tax settings and terms. Review currency rather than assuming product prices are converted. Template selection comes from account/organization configuration.

Submit a Draft for approval, or approve directly when eligible under the shared manager policy. Approved quotations can be sent or returned to Draft; Pending Approval quotations can be recalled by an authorized editor. **Send** records sending and freezes the applicable tax rate; it does not email the customer. Customer acceptance is a separate action and does not close the Funnel.

Duplication creates a new non-primary Draft in the same Funnel. Eligible historical quotations can create linked Draft revisions. Each copy requires its own approval. Deletion retains issued numbering: deleted versions and running numbers are never recycled. Accepted quotations cannot be deleted.

Open **Preview → Download PDF**, or use **Print** and the browser's Save as PDF option. Check the final recipient, number, currency, tax, totals and terms before sharing.

Read [Quotations and revisions](gitbook-documentation/05-quotations-and-revisions.md).

## Payment milestones

Configure the schedule explicitly after customer acceptance and at Funnel stage 4a or Closed Won. Closing Won does not create a schedule or change milestone status. New milestones start **Pending invoicing**. After actual billing, use **Mark invoiced** with the required permission. This cannot be reversed and does not generate an invoice or record payment.

Read [Payment milestones](gitbook-documentation/06-payment-milestones.md).

## Approvals, roles and settings

**Sales → Approvals** has Incoming and My requests sections for lead conversion, quotations and Funnel stages. Matching approval permission and an eligible reporting relationship determine review authority. Managers with a superior still request approval; a missing manager alone does not create an exemption.

Seven default roles are Owner, Admin, Developer, Manager, Senior Rep, Rep and Viewer. System roles are fixed; custom roles can be configured and combined. Permissions add together. Account ownership is distinct from the Owner role.

Read [Approvals inbox](gitbook-documentation/08-approvals-inbox.md), [Roles and RBAC](gitbook-documentation/roles-and-rbac.md) and [Administration and settings](gitbook-documentation/09-admin-and-settings.md).

## Reference and help

* [Terminology](gitbook-reference/terminology.md)
* [Stages and statuses](gitbook-reference/stages-and-statuses.md)
* [Documents, actions and approval](gitbook-reference/documents-and-actions.md)
* [Permissions and approval routing](gitbook-reference/permissions-and-approvals.md)
* [Troubleshooting](gitbook-documentation/help-center/troubleshooting.md)

Projects, Sales Orders, Forecast and other optional modules depend on enabled capabilities. This Base guide does not prescribe their separate delivery, procurement or finance workflows.
