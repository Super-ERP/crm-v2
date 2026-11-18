<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `apps/web/node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Structured address locations

For every new or modified Country, State/Province or City/Town input, use `LocationField`/`LocationFields` from `apps/web/components/location-fields.tsx`. Country and State/Province use the shared PostgreSQL GeoNames catalogue, A–Z ordering and server validation via `validateLocationAddress`; City/Town accepts custom text (up to 120 characters), with no catalogue requirement. Preserve unchanged legacy Country/State values. Street and Postcode remain text. See `docs/operations/2026-11-17-location-catalogue.md` for source maintenance and legacy rules.
