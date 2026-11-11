# Account Details editing

Reuse AccountForm in an embedded presentation within a Details tab, preserving the established fields, country/state controls, validation and account update service. Add the existing owner capability to the embedded form. Keep calculated/system fields read-only.

- Extract presentation inside AccountForm so modal creation remains available and embedded editing uses the same controls and submit handler.
- Add Details read/edit modes to AccountDetailBody. Save refreshes server data, Cancel discards, related-tab changes warn when dirty. Preserve permissions and show server errors without closing.
- Add a reusable unsaved-change guard for reload/close and link navigation. Block navigation while saving and preserve dirty fields on failure.
- Review desktop/mobile layout, accessible field labels, focus, pending/disabled states and explicit actions. Run focused account tests, typecheck, lint and a production build; browser-check the flow on disposable data.
