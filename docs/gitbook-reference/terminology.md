---
description: Plain-language definitions of the customer, sales, billing, and workspace terms used in Q-App.
icon: spell-check
---

# Terminology

Use this reference when a field or guide uses an unfamiliar term. Examples describe a fictional customer, Acme, and do not represent real records.

## General terms

### CRM / customer relationship management

The customer-management part of the workspace: leads, accounts, contacts, and sales relationships.

### Record

One saved item in a module, such as an account, lead, quotation, or milestone. A record identifier or code helps you refer to the exact item when asking for help.

## Customer records

### Lead

An inquiry or prospect that you are still qualifying. For example, someone from Acme asks about an implementation. A lead helps you record that interest before it becomes an active sales pursuit.

### Lead conversion

The action that, after reporting-manager approval or an eligible top manager's direct confirmation, links or creates an account and creates a contact. The current conversion form also requests an opportunity and funnel deal. Pending approval creates no linked records. The converted lead retains links to those records and cannot be converted again. See [Lead conversion](https://jienweng.gitbook.io/q-app/docs/customer-records/02-leads-management#converting-a-lead).

### Account

The company or organization you work with, such as Acme. It holds customer context and links to contacts and commercial records. The account currency supplies a default for related commercial work; review the currency on each sales record.

### End user, reseller, and Bill To

The **end user** is the customer using the solution; keep the Opportunity and Funnel under that account. A **reseller** sells the goods or services onward. **Bill To** is the account receiving and paying a particular quotation. For a reseller sale, choose the reseller as Bill To and select its contact as Attention. Different quotations in one Funnel can bill different resellers.

### Contact and person

An individual stakeholder associated with an account, such as Acme's procurement manager. The sidebar calls these records **Contacts**; some identifiers and routes use **person**. See [Accounts and contacts](https://jienweng.gitbook.io/q-app/docs/customer-records/03-accounts-and-contacts).

## Sales pursuits

### Opportunity

The record describing a customer need, qualification context, and target budget. For example, “Acme implementation” describes the overall sales opportunity.

### Funnel deal

The particular sales pursuit you track through stages, with quotations and an expected close date. Keep the distinction clear: the opportunity provides context, while the funnel deal carries the stage and commercial progress. See [Opportunities and sales funnel](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel).

### Pipeline and funnel

The configured stages used to track sales pursuits. The **Funnel** module shows deals within that process. Stage names, probabilities, and required fields can depend on your organization.

### Project code and Cross-deal reference

A code grouping connected sales records in **Sales → Project Codes**, available without the Projects module for accessible Funnels at 4A or Closed Won. The original Salesforce Project code is the main display value when present. A different Salesforce Cross-deal reference remains separate; identical values are not repeated in the normal display. The CRM-generated code is a separate identifier and supplies a fallback when the original code is absent. A code does not itself create a delivery Project.

### Contract

In this rollout, the Funnel’s standard Closed Won stage has a free-text **Contract** field for outcome information. There is no visible central Contract directory or multi-year Contract tab. Supporting files belong in Documents where permitted.

### Stage gate

A check before a stage change. It can require saved information or a manager's approval. Completing a field and obtaining approval are separate requirements. See [Stages and statuses](stages-and-statuses.md).

### PPVVC

A qualification framework used to describe the buyer and buying process:

| Term | Meaning | Example question |
| --- | --- | --- |
| **Power Sponsor** | The person with influence or authority who supports the proposal. | Who can sponsor the purchase? |
| **Pain** | The business problem the customer needs to solve. | What is slowing the team down? |
| **Vision** | The agreed solution or desired outcome. | What should the new process look like? |
| **Value** | The measurable benefit of the solution. | How much time or cost will it save? |
| **Control** | Your understanding of the decision and procurement process. | Who decides, and what happens next? |

See [PPVVC qualification](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#the-ppvvc-qualification-framework).

### KIV and Keep In View

A parked deal that needs follow-up later. KIV is not Closed Lost. Reopening follows the stage approval policy. A queued approval applies only while its original transition remains current. See [KIV reopening](https://jienweng.gitbook.io/q-app/docs/sales/04-opportunities-and-funnel#kiv-keep-in-view). See [Funnel stages](stages-and-statuses.md#funnel-stages).

### Weighted pipeline

A planning value calculated as **deal value × stage win probability**. For example, 100,000 at a 50% probability contributes 50,000 to weighted pipeline. It is a forecast measure, not invoiced revenue or cash received.

### ROI / return on investment

The benefit of an investment compared with its cost. In qualification, record the customer's expected benefit and the assumptions behind it.

## Quotations and billing

### Quotation

The proposal containing the customer-facing scope, items, prices, tax, and terms. Approval authorizes sending the proposal; customer acceptance records the customer's decision. See [Quotations and revisions](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions).

### Line item

An individual product or service entry in a quotation, with its quantity and price. For example, consulting days and software licenses may be separate line items.

### Revision

A separate draft created from an eligible historical quotation. The original remains part of the history. Returning an Approved quote to Draft is a different action from creating a revision.

### Snapshot

A saved copy of information used by a record, such as quotation terms or the tax rate captured when sending. A snapshot preserves that record's context when the source information changes. Review draft defaults before sending.

### SLA / service-level agreement

Agreed service commitments, such as response times or availability targets. Include the appropriate service terms when preparing the proposal.

### Currency and ISO currency code

The currency used for an amount. **MYR**, **USD**, and **SGD** are examples of three-letter currency codes. Check the currency as well as the numeric amount when reviewing pricing.

### Tax inclusive and tax exclusive

**Tax inclusive** pricing includes tax within the stated price. **Tax exclusive** pricing adds tax to the price. **SST** means Sales and Service Tax; the applicable label and rate come from your organization's configuration. See [Quotation pricing](https://jienweng.gitbook.io/q-app/docs/sales/05-quotations-and-revisions#adding-line-items-and-product-pricing).

### Payment milestone

A planned billing event, such as a deposit or delivery payment. Its status is **Pending invoicing** or **Invoiced**. Explicit setup requires customer acceptance of the quotation and a funnel at stage 4a or Closed Won. It is a planning record and does not issue an invoice or receipt. See [Payment milestones](https://jienweng.gitbook.io/q-app/docs/sales/06-payment-milestones).

## Commercial terms

### UAT and user acceptance testing

Testing by the customer or users to confirm that the delivered solution meets agreed requirements. UAT sign-off may be a contractual trigger for a billing milestone; it does not automatically change that milestone's status.

## Workspace and access

### Organization, workspace, and tenant

The active organization whose records and settings you are working with. **Tenant** is the technical term for that organization boundary. Check the active organization when a record appears to be missing.

### Owner, salesperson, and reporting manager

The **Account owner** is the organization member responsible for an account and its related sales records. A **salesperson** does sales work and may be the Account owner, but the two terms are not interchangeable. A **reporting manager** is configured in the team hierarchy and is used for visibility and approval routing. The **Owner role** is an access role; it does not make its holder the owner of every account. An **Opportunity Owner Contact** is a customer-side contact, distinct from the Account owner.

### Role, permission, and enabled module

A **role** groups access capabilities. A **permission** allows a particular action. An **enabled module** determines whether a feature is available in the organization. Having a role name does not guarantee that a module or action is available.

### Saved view

Your personal set of list filters, sorting, page size and column layout, including visibility, order, widths and pinning. It changes how you view a list without changing the underlying records or colleagues' views.

## Continue

* [Stages and statuses](stages-and-statuses.md)
* [Permissions and approval routing](permissions-and-approvals.md)
* [Documentation overview](https://jienweng.gitbook.io/q-app/docs)
