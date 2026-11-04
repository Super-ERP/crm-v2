# Attention contacts from customer or Bill To

Approved behavior: one Attention dropdown accepts active contacts belonging to either the funnel customer or the selected Bill To account. Company names appear in dropdown labels. The PDF continues to use Bill To company/address and the selected person's details. Existing tenant, quotation ownership, Bill To selection and frozen-document restrictions remain.

1. Extend the shared Attention membership validator with an optional funnel customer. Reject unrelated and unassigned contacts. Test both permitted accounts and rejection.
2. Update quotation form metadata to query both accounts and include company names; update create, edit and duplicate dropdown labels.
3. Apply the same membership rule to create/update, document fallback, revision/duplicate recovery and billing snapshots. Preserve customer contacts when valid for the destination; clear incompatible historical links as before. Snapshot company and contact independently.
4. Add action and copy regressions for PSMB billing/customer Attention, unrelated contacts and PDF contact/account separation. Update user guide. Run focused tests, typecheck and lint; open a PR with the final scope and evidence.
