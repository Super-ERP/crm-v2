# Quandatics Academy quotation template

The QA quotation uses the same document component, US Letter page size, table,
totals, notes, footer, and print pagination as the QM quotation. Only the
selected template code, logo, and tenant company profile differ. No quotation
amounts or customer records are rewritten.

## Sources

- Academy logo supplied as `/home/jienweng/Downloads/logo.png` (SHA-256
  `012eac7c5f5893f8d10aeebc464e3cb5487bb6a8471de2628b613b06a4c774ce`).
  The unmodified PNG is copied to `apps/web/public/qa-academy-logo.png`.
- Company detail image supplied as `/tmp/codex-clipboard-1krUqF.png` (SHA-256
  `a19fb7b846099f9de42df84ecb582023e872e30dfd07a28d21b43888e213df36`).
- Both originals are preserved in the sibling output folder
  `../outputs/qa-quotation-template-20260930/source/`; QM production evidence
  is in `../outputs/qm-production-ingestion-20260930/`.

## QA company profile

| Setting | Value |
| --- | --- |
| Tenant | Quandatics Academy (`b6181021-167f-46bc-882c-d92f4fd81572`) |
| Template | `qa` |
| Legal name | Quandatics Academy Sdn Bhd |
| Registration | 201701022646 (1236812-W) |
| Address | A-08-01 & 02, Ekocheras, No. 693, Jalan Cheras Batu 5, 56000 Kuala Lumpur. |
| Phone | +60 3 8681 9808 |
| Email | training@quandatics.com |

The supplied image does not give a website or SST registration number. Leave
those settings empty rather than copying QM's values. The email and phone appear
in the shared footer, while the legal name, registration, and address appear in
the shared header.

## Implementation and verification

1. Select `qa` for the existing QA tenant in Company Profile. QA entity-code
   fallback also resolves to `qa` if the setting is absent.
2. The preview route passes `qa` to `QmQuotationDocument`; that component
   changes only the image source and accessible logo label. The print CSS targets
   both `qm` and `qa` selectors and preserves the same pagination rules.
3. Keep the source images, the pre-change tenant profile, the applied profile,
   deployment details, and a QA PDF render in the sibling output folder.
4. Verify the QA profile and logo readback after deployment. Render the existing
   QA quotation `Q10001-1` and check its company header, footer, tax label, and
   page breaks. Run the quotation template tests, TypeScript check, and ESLint.
