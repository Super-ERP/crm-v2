# 2. Leads & Conversion

This chapter details how to capture inbound leads, qualify prospects, handle disqualifications, and convert qualified leads into accounts, contacts, and opportunities.

---

## What is a Lead?

A **Lead** represents an unverified inbound expression of interest (e.g., from a web form, event booth, partner referral, or cold outreach). It serves as a staging area to qualify prospects without cluttering your core accounts and active sales pipeline.

---

## Creating a Lead

1. Navigate to **CRM → Leads** in the left sidebar.
2. Click the **+ New Lead** button in the top right corner.
3. Fill in the lead information:
   * **Contact Name**: First Name and Last Name.
   * **Company Name**: The prospective organization name.
   * **Email & Phone**: Primary communication channels.
   * **Lead Source**: Where the lead originated (e.g., *Website, Referral, Event, Cold Outreach*).
   * **Estimated Value**: Anticipated initial deal size.
   * **Owner**: The sales representative assigned to nurture the lead (defaults to you).
   * **Notes**: Any initial context or background details.
4. Click **Create Lead**.

---

## The Lead Lifecycle

```mermaid
stateDiagram-v2
    [*] --> New: Lead Created
    New --> Contacted: First Outreach
    Contacted --> Qualified: Fit Confirmed
    New --> Disqualified: Not a Fit
    Contacted --> Disqualified: Not a Fit
    Qualified --> Converted: Lead Conversion
    Disqualified --> Contacted: Restore & Re-engage
```

### Lead Statuses

* **`New`**: Newly received lead awaiting initial review.
* **`Contacted`**: Outreach has commenced (email sent, call made, meeting scheduled).
* **`Qualified`**: The prospect has verified need, budget, and authority.
* **`Disqualified`**: The prospect is not a fit for your services.

### Handling Disqualification
When marking a lead as **Disqualified**:
1. You must select a structured **Disqualification Reason** (e.g., *No Budget, Out of Scope, Competitor Chosen, Unresponsive*).
2. Enter explanatory notes to help your team analyze lost lead patterns.
3. **Restoring a Disqualified Lead**: If a disqualified prospect contacts you again months later, you can click **Restore to Contacted** on the lead detail view to re-enter the active qualification cycle.

---

## Converting a Lead (`/leads/[id]/convert`)

Once a lead has been qualified and is ready for a commercial proposal, convert it using the **Conversion Wizard**.

```
[ Lead: John Doe (Acme Corp) ]
         │
         ▼ (Convert Action)
 ┌───────┴──────────────────────────────┐
 │                                      │
 ▼                                      ▼
[ Account: Acme Corp ]          [ Contact: John Doe ]
 │
 ▼
[ Opportunity: Acme Corp Opportunity ]
 │
 ▼
[ Funnel Deal: Stage 0E ]
```

### Step-by-Step Conversion Flow:
1. Open the Lead detail page.
2. Click the **Convert Lead** button in the top action bar.
3. You will be redirected to the full-page conversion wizard:
   * **Account Section**:
     * **Link Existing Account**: The wizard scans your database for matching company names. If a match is found, you can link to the existing Account.
     * **Create New Account**: If no match exists, select `Create New Account`. Specify the Account Type (*Client* or *Reseller*), Account Code, and Address.
   * **Contact Section**:
     * Automatically creates a new Contact record pre-filled with the lead's name, email, and phone number, associated with the Account.
   * **Opportunity & Funnel Section**:
     * **Opportunity Name**: Defaults to `[Company Name] opportunity` (customizable).
     * **Expected Close Date**: Set the estimated closing target date.
     * The deal is automatically seeded into the sales funnel at the initial stage **`0E` (Exploration)**.
4. Click **Confirm Conversion**.

> [!IMPORTANT]
> **One-Way Irreversible Action**: Conversion is an atomic, permanent database transaction. Once converted, the lead status changes to `Converted`, and the lead record permanently links to the generated Account, Contact, and Opportunity. Converted leads cannot be converted again.
