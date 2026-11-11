# Void records and linked-record rules

**Void** is a reviewed correction across CRM modules. It preserves historical values, numbers, links and evidence. It does not mark a sale Lost, execute a bank refund, cancel an external tax invoice or silently change another entity's books.

1. Open **Void a record**, or select **Void** beside the record.
2. Review the impact and linked-record blockers, enter a reason and submit.
3. Track the request in **Approvals → My requests**.
4. Sales Admin reviews **Needs my review → Record voids**. Resolve downstream records first and use **Refresh impact**. Approve only when the preview has no blockers; reject with a note otherwise.

Requests can be submitted with blockers so the reviewer can coordinate correction. Approval always recomputes the impact, requester/reviewer access and source ownership. A changed preview must be refreshed; an ownership change requires rejection and resubmission. No self-review or direct Delete/Cancel bypass is available.

| Record | Resolve first | Approval effect |
|---|---|---|
| Lead | Active records created by conversion | Archive source; cancel pending conversion request |
| Account | Active child accounts, contacts, Opportunities, funnels, projects, contracts and Bill To quotations | Archive shared master without cancelling other records implicitly |
| Contact | Active quotation/opportunity/funnel references; primary designation | Archive contact; preserve history |
| Product | Active quotation and funnel-product references | Archive catalogue entry; retain historical line snapshots |
| Opportunity | Live child funnels | Archive pursuit after its children are resolved |
| Funnel, any stage | Live quotations, projects, milestones, contracts, years, costs; intercompany reconciliation | Archive, cancel pending stage requests, recalculate parent currency totals |
| Quotation, including Accepted | Live projects and milestones | Void/archive; repair primary quote, quoted value and derived products |
| Project, including already Cancelled | Live Sales Orders, milestones and finance documents; intercompany reconciliation | Archive delivery record; retain original value and source links |
| Payment milestone | Live linked finance documents; financial reconciliation for invoice history | Archive schedule and release active allocation; preserve invoice snapshot |
| Sales Order | Every live finance document, including drafts | Terminal Void, preserving official SO number and supporting files |
| Finance document, all kinds | Every live child document; intercompany reconciliation | Cancel/reverse the posting, preserving number, amount, proof and audit |
| Contract | Live years on its funnel | Archive signed/imported contract, preserving terms |
| Contract year | Financial review if invoiced | Archive year; exclude it from active contract totals |
| Purchase cost | Financial review if it has a purchase-order reference | Archive cost; exclude it from active cost/margin totals |

Receipt/payment reversal recomputes the remaining live payments in the same transaction. A previously Settled parent reopens as Issued if those payments no longer cover it. Finance changes do not automatically toggle payment milestones or project completion.

Posted financial records and invoice-history schedules require **Approve posted financial reversals** in addition to **Review record void requests (Sales Admin)**, record access and applicable module permissions. Sales Order review requires Sales Order approval; finance-document review requires Finance manage. Owner/Admin receive the new capabilities on migration. Custom Sales Admin roles receive general review; financial reversal must be intentionally granted. An eligible reviewer other than the requester must exist before submission.

Intercompany documents and relationships remain blocked until both entities reconcile them. Legacy auto-mirror origin links are insufficient to infer a safe cross-entity reversal. This flow never guesses a partner's financial intent.

Voided records are read-only and cannot be used as new parents. Request snapshots, decisions and audit remain accessible through Approvals and Audit; financial/SO history continues showing terminal statuses. There is no ordinary restore/Undo for an approved Void. Configuration, roles, users, tenants, tax settings and reference picklists retain their administration workflows; they are not business transactions to void.
