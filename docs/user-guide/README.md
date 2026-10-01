---
description: Learn Q-App, follow a task guide, look up a term, or check what has changed.
icon: house
---

# Welcome to Q-App

Q-App brings customer records, sales pursuits, quotations, and delivery handovers into one workspace. This is your starting point for learning the app and finding answers while you work.

## Choose your next step

<table data-view="cards"><thead><tr><th>Guide</th><th>Description</th><th data-hidden data-card-target data-type="content-ref">Link</th></tr></thead><tbody><tr><td><strong>Get started</strong></td><td>Follow a short checklist for sales, approvers, delivery, or administration.</td><td><a href="quick-start.md">Quick start by role</a></td></tr><tr><td><strong>Read the documentation</strong></td><td>Find a task guide for each module, with steps and workflow explanations.</td><td><a href="documentation.md">Documentation overview</a></td></tr><tr><td><strong>Look up a term</strong></td><td>Understand accounts, opportunities, PPVVC, quotations, and billing terms.</td><td><a href="reference/terminology.md">Terminology</a></td></tr><tr><td><strong>See what changed</strong></td><td>Read product changes and documentation updates.</td><td><a href="product-changelog.md">Product changelog</a></td></tr></tbody></table>

## First time here?

{% stepper %}
{% step %}

#### Find your workspace

Sign in and check the active organization. Read [Workspace and personal views](01-workspace-and-views.md) to find the modules and list controls.

{% endstep %}
{% step %}

#### Choose your workflow

Open [Quick start by role](quick-start.md) and follow the checklist closest to your daily work.

{% endstep %}
{% step %}

#### Learn as you work

Use the [Documentation overview](documentation.md) for detailed tasks and [Terminology](reference/terminology.md) for unfamiliar words. The [Stages and statuses](reference/stages-and-statuses.md) reference explains what each label means.

{% endstep %}
{% endstepper %}

{% hint style="info" %}
**Cannot find a button or module?** Check your active organization. Your permissions and enabled modules determine what appears. See [Permissions and approval routing](reference/permissions-and-approvals.md) or ask your administrator.
{% endhint %}

## How the workflow fits together

This is an overview of the usual workflow. Approval requirements and available stages depend on your organization's configuration.

```mermaid
flowchart TD
    L["Capture and qualify a lead"] --> A["Link or create an account and contact"]
    A --> F["Track the opportunity and funnel deal"]
    F --> Q["Prepare and approve a quotation"]
    Q --> W["Close the funnel deal as Won"]
    W --> M["Track payment milestones"]
    W --> P["Coordinate delivery and sales orders"]
```

**In words:** qualify the prospect, confirm the customer records, work the deal, prepare an approved quote, and record the outcome. On Closed Won, live planned payment milestones become **Won**. Billing is recorded separately by updating eligible milestones to **Invoiced**.

<details>
<summary>View a static copy of the workflow</summary>

<figure><img src="assets/sales-workflow.png" alt="A lead becomes an account and contact, then a funnel deal and approved quotation. Closing Won leads to payment milestone tracking and delivery coordination."><figcaption><p>The same workflow as the diagram above, available as an image.</p></figcaption></figure>

</details>

## Need help?

Open [Troubleshooting](help-center/troubleshooting.md) for a blocked action or [Frequently asked questions](help-center/faqs.md) for a short answer. Check [Product changelog](product-changelog.md) for application changes and [Guide updates](changelog.md) for documentation changes.
