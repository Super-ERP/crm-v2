---
description: Capture prospects, qualify them, and convert the right leads.
icon: user-plus
---

# Leads and conversion

Capture prospects, qualify them, and convert the right leads.

**New to these terms?** Read the [terminology reference](https://jienweng.gitbook.io/q-app/reference/terminology#lead).

## On this page

* [Create a lead](#creating-a-lead)
* [Understand statuses](#lead-statuses)
* [Convert a lead](#converting-a-lead)

---

## What is a Lead?

A **Lead** represents an unverified inbound expression of interest (e.g., from a web form, event booth, partner referral, or cold outreach). It serves as a staging area to qualify prospects without cluttering your core accounts and active sales pipeline.

---

## Creating a Lead

{% stepper %}
{% step %}

#### Open Leads

Navigate to **CRM → Leads** in the left sidebar.

{% endstep %}
{% step %}

#### Start a new lead

Click the **+ New Lead** button in the top right corner.

{% endstep %}
{% step %}

#### Enter prospect details

Fill in the lead information:

* **Name**: The prospect’s contact name.
* **Company Name**: The prospective organization name.
* **Email**: Required valid address; it becomes the contact email during conversion.
* **Phone**: Optional contact number.
* **Lead Source**: Where the lead originated (e.g., *Website, Referral, Event, Cold Outreach*).
* **Status**: Review the initial status. Ownership is assigned to the creating member; it is not an owner selector in this form.

Add follow-up context through the lead’s activity controls after creation. The current create form does not include Estimated Value or Notes fields.

{% endstep %}
{% step %}

#### Create the lead

Click **Create Lead**.

{% endstep %}
{% endstepper %}

---

## The Lead Lifecycle

```mermaid
flowchart TD
    N["New"] --> C["Contacted"]
    C --> Q["Qualified"]
    Q --> V["Converted"]
    C --> D["Disqualified"]
```

**Read the diagram:** a lead moves through outreach and qualification before conversion. A lead can also be disqualified when it is not worth pursuing. The detail page does not provide a Restore to Contacted action.

### Lead Statuses

* **`New`**: Newly received lead awaiting initial review.
* **`Contacted`**: Outreach has commenced (email sent, call made, meeting scheduled).
* **`Qualified`**: The prospect has verified need, budget, and authority.
* **`Disqualified`**: The prospect is not a fit for your services.

### Handling Disqualification
When marking a lead as **Disqualified**:

{% stepper %}
{% step %}

#### Enter a disqualification reason

Use **Disqualify** and type a non-empty **Reason**, such as “No budget for this year.” The current dialog uses a text input, not a structured reason dropdown.

{% endstep %}
{% step %}

#### Record context

Confirm the disqualification. The typed reason is saved with the lead and recorded in its activity history.

{% endstep %}
{% step %}

#### Understand the available follow-up actions

The lead detail page locks status controls for Disqualified and Converted records. There is no dedicated disqualification restore action. **Undo** in the Leads list’s deletion toast only reverses deletion, requires Delete leads permission and record access, and preserves the prior status. It does not restore a Disqualified lead to Contacted.

**Current inconsistency:** the list’s **Edit** form still offers the full status selector, while detail-page status controls are locked. Do not use that selector to imitate conversion: setting Converted there does not run the linked-record conversion workflow. Ask your administrator or support contact to review a disqualified lead that needs renewed follow-up.

{% endstep %}
{% endstepper %}

---

## Converting a lead

1. Open the Lead and choose **Convert**. Check the contact email, choose an existing Account or enter the new company's details, and select Project Nature when creating a Funnel.
2. For a new company, enter its SSM registration number. The CRM compares registered numbers and warns about similar company names. Review a suggested match before requesting another Account.
3. Submit the request. An eligible independent Sales Admin reviewer opens **Approvals**, checks the company identity and assigns a unique Account Code for a new Account. A requester cannot approve their own request.
4. After approval, follow the converted Lead’s links to its Account, Contact and requested sales records. Submitting a request alone does not create them.

## Continue

* [Accounts & contacts](03-accounts-and-contacts.md)
* [Troubleshooting](help-center/troubleshooting.md)
* [Back to start](https://jienweng.gitbook.io/q-app)
