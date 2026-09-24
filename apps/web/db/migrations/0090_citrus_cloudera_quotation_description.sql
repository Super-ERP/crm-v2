-- Restore the title and service details omitted from the imported Citrus Cloud
-- quotation Q40d-0040dCQ-01. The CRM draft uses quote number Q10002-1.
-- Exact IDs and prior values keep this correction scoped to the verified line.
UPDATE quotation_line_items AS line
SET description = $description$# Professional Services

Configure existing Cloudera nodes from self sign to authorised SSL cert (Total 12 nodes)

*Estimate: 2-3 man-days (weekend/after business hour services)*

- Production (12 nodes)
- SSL certs to be provided by customer

**End User: AEON Credit (M) Sdn Bhd**$description$,
    uom = 'unit',
    updated_at = now()
FROM quotations AS quote
WHERE line.quotation_id = quote.id
  AND line.id = '1128f9e0-b449-49ec-b3a8-b4c71f53e5cb'
  AND quote.id = 'f56aa5cc-51f3-482a-b89b-f31a4262413f'
  AND quote.quote_number = 'Q10002-1'
  AND quote.status = 'draft'
  AND quote.currency = 'MYR'
  AND line.description = 'Configure existing Cloudera nodes from self sign to authorised SSL cert (Total 12 nodes)'
  AND line.quantity = 1
  AND line.unit_price = 9000;
