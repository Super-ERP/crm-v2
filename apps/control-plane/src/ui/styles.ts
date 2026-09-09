export const OPERATOR_STYLES = `
.operator-shell {
  --operator-space-1: 0.25rem;
  --operator-space-2: 0.5rem;
  --operator-space-3: 0.75rem;
  --operator-space-4: 1rem;
  --operator-space-6: 1.5rem;
  --operator-space-8: 2rem;
  --operator-space-12: 3rem;
  --operator-colour-canvas: #f6f8fb;
  --operator-colour-surface: #ffffff;
  --operator-colour-ink: #172033;
  --operator-colour-muted: #5d6b82;
  --operator-colour-line: #ccd5e1;
  --operator-colour-accent: #155eef;
  --operator-colour-accent-strong: #004eeb;
  --operator-colour-positive: #067647;
  --operator-colour-warning: #b54708;
  --operator-colour-danger: #b42318;
  --operator-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --operator-border: 1px solid var(--operator-colour-line);
  --operator-radius: 0.625rem;
  --operator-content-width: 72rem;
  color: var(--operator-colour-ink);
  background: var(--operator-colour-canvas);
  font-family: var(--operator-font);
  line-height: 1.5;
  min-block-size: 100vh;
}

.operator-shell *, .operator-shell *::before, .operator-shell *::after { box-sizing: border-box; }
.operator-shell :is(h1, h2, h3, p, ol, ul, dl) { margin-block: 0; }
.operator-shell a { color: var(--operator-colour-accent); text-underline-offset: 0.16em; }
.operator-shell a:hover { color: var(--operator-colour-accent-strong); }
.operator-shell :is(button, input:not([type="checkbox"]):not([type="radio"]), select, textarea) { min-block-size: 2.75rem; }
.operator-shell :is(a, button, input, select, textarea):focus-visible { outline: 0.1875rem solid var(--operator-colour-accent); outline-offset: 0.1875rem; }
.operator-shell button { border: 0; border-radius: var(--operator-radius); background: var(--operator-colour-accent); color: #fff; cursor: pointer; font: inherit; font-weight: 700; padding-inline: var(--operator-space-4); }
.operator-shell .button-primary { background: var(--operator-colour-accent); color: #fff; }
.operator-shell .button-primary:hover { background: var(--operator-colour-accent-strong); }
.operator-shell .button-secondary { background: var(--operator-colour-surface); border: var(--operator-border); color: var(--operator-colour-ink); }
.operator-shell .button-secondary:hover { background: #eef2f7; }
.operator-shell .button-danger { background: var(--operator-colour-danger); color: #fff; }
.operator-shell .button-danger:hover { background: #912018; }
.operator-shell .button-ghost { background: transparent; color: var(--operator-colour-accent); }
.operator-shell .button-ghost:hover { background: #e8efff; }
.operator-shell input, .operator-shell select, .operator-shell textarea { border: var(--operator-border); border-radius: 0.375rem; color: inherit; font: inherit; padding: var(--operator-space-2) var(--operator-space-3); width: 100%; }
.operator-shell textarea { min-block-size: 6rem; }
.operator-shell :is(input[type="checkbox"], input[type="radio"]) { block-size: 1.25rem; inline-size: 1.25rem; margin: 0; width: auto; }
.operator-shell label:has(:is(input[type="checkbox"], input[type="radio"])) { align-items: center; display: inline-flex; gap: var(--operator-space-2); min-block-size: 2.75rem; padding-inline: var(--operator-space-2); }
.operator-shell-header { border-block-end: var(--operator-border); background: var(--operator-colour-surface); }
.operator-shell-bar, .operator-content { inline-size: min(100% - 2rem, var(--operator-content-width)); margin-inline: auto; }
.operator-shell-bar { align-items: center; display: flex; flex-wrap: wrap; gap: var(--operator-space-3) var(--operator-space-6); justify-content: space-between; padding-block: var(--operator-space-3); }
.operator-brand { color: var(--operator-colour-ink); font-weight: 800; text-decoration: none; }
.operator-navigation ul, .operator-breadcrumbs ol { align-items: center; display: flex; flex-wrap: wrap; gap: var(--operator-space-2); list-style: none; padding: 0; }
.operator-shell :is(.operator-brand, .operator-navigation a, .operator-breadcrumbs a, nav[aria-label$="pagination"] a, .button-link) { align-items: center; display: inline-flex; min-block-size: 2.75rem; padding-inline: var(--operator-space-2); }
.operator-navigation a { border-radius: 0.375rem; text-decoration: none; }
.operator-navigation [aria-current="page"] { background: #e8efff; color: #00359e; font-weight: 700; }
.operator-identity { color: var(--operator-colour-muted); font-size: 0.875rem; }
.operator-breadcrumbs { border-block-end: var(--operator-border); background: var(--operator-colour-surface); color: var(--operator-colour-muted); font-size: 0.875rem; }
.operator-breadcrumbs ol { inline-size: min(100% - 2rem, var(--operator-content-width)); margin-inline: auto; padding-block: var(--operator-space-2); }
.operator-breadcrumbs li + li::before { content: "/"; margin-inline-end: var(--operator-space-2); }
.operator-content { padding-block: var(--operator-space-8); }
.operator-shell .skip-link { background: var(--operator-colour-ink); color: #fff !important; inset-block-start: var(--operator-space-2); inset-inline-start: var(--operator-space-2); padding: var(--operator-space-3) var(--operator-space-4); position: fixed; transform: translateY(-150%); z-index: 2; }
.operator-shell .skip-link:focus { transform: translateY(0); }
.page-header { border-block-end: var(--operator-border); display: grid; gap: var(--operator-space-2); margin-block-end: var(--operator-space-8); padding-block-end: var(--operator-space-6); }
.page-header-content { align-items: end; display: flex; flex-wrap: wrap; gap: var(--operator-space-4); justify-content: space-between; }
.page-header h1, .card h2, .empty-state h2, .notice h2 { font-size: clamp(1.25rem, 2vw, 2rem); line-height: 1.2; }
.page-header-eyebrow { color: var(--operator-colour-accent); font-size: 0.875rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.page-header-description, .field-hint { color: var(--operator-colour-muted); }
.page-header-actions { display: flex; flex-wrap: wrap; gap: var(--operator-space-2); }
.status-badge { border-radius: 999px; display: inline-flex; font-size: 0.8125rem; font-weight: 800; line-height: 1.25; padding: var(--operator-space-1) var(--operator-space-2); }
.status-badge-neutral { background: #e9edf3; color: #344054; }
.status-badge-success { background: #dcfae6; color: var(--operator-colour-positive); }
.status-badge-warning { background: #fef0c7; color: var(--operator-colour-warning); }
.status-badge-error { background: #fee4e2; color: var(--operator-colour-danger); }
.progress-steps ol { display: flex; flex-wrap: wrap; gap: var(--operator-space-2); list-style: none; padding: 0; }
.progress-step { align-items: center; display: flex; font-size: 0.875rem; gap: var(--operator-space-2); }
.progress-step::before { align-items: center; background: #e9edf3; border-radius: 999px; color: var(--operator-colour-muted); content: counter(list-item); display: inline-flex; font-size: 0.75rem; font-weight: 800; justify-content: center; min-block-size: 1.5rem; min-inline-size: 1.5rem; }
.progress-step-complete::before { background: #dcfae6; color: var(--operator-colour-positive); content: "✓"; }
.progress-step-current { color: var(--operator-colour-accent); font-weight: 800; }
.progress-step-current::before { background: var(--operator-colour-accent); color: #fff; }
.progress-step-blocked { color: var(--operator-colour-danger); font-weight: 800; }
.progress-step-blocked::before { background: #fee4e2; color: var(--operator-colour-danger); content: "!"; }
.field { display: grid; gap: var(--operator-space-2); }
.field label { font-weight: 700; }
.operator-shell .checkbox-field { align-items: flex-start; display: flex; gap: var(--operator-space-2); min-block-size: 2.75rem; padding-inline: 0; font-weight: 500; }
.operator-shell .checkbox-field input { margin-block-start: 0.25rem; }
.repair-steps { display: grid; gap: var(--operator-space-2); margin: 0; padding-inline-start: var(--operator-space-6); }
.field-error { color: var(--operator-colour-danger); font-size: 0.875rem; }
.card, .empty-state, .notice { border: var(--operator-border); border-radius: var(--operator-radius); background: var(--operator-colour-surface); padding: var(--operator-space-6); }
.card { display: grid; gap: var(--operator-space-4); }
.card-content, .card-footer { display: grid; gap: var(--operator-space-4); }
.card-footer { border-block-start: var(--operator-border); padding-block-start: var(--operator-space-4); }
.empty-state { align-items: start; display: grid; gap: var(--operator-space-3); justify-items: start; text-align: left; }
.button-link { background: var(--operator-colour-accent); border-radius: var(--operator-radius); color: #fff !important; font-weight: 700; padding-inline: var(--operator-space-4); text-decoration: none; }
.notice { border-inline-start-width: 0.375rem; display: grid; gap: var(--operator-space-2); }
.notice-info { border-inline-start-color: var(--operator-colour-accent); }
.notice-success { border-inline-start-color: var(--operator-colour-positive); }
.notice-warning { border-inline-start-color: var(--operator-colour-warning); }
.notice-error { border-inline-start-color: var(--operator-colour-danger); }
.data-list { border-block-start: var(--operator-border); }
.data-list-row { display: grid; gap: var(--operator-space-2); grid-template-columns: minmax(10rem, 1fr) minmax(0, 2fr); border-block-end: var(--operator-border); padding-block: var(--operator-space-3); }
.data-list dt { color: var(--operator-colour-muted); font-weight: 700; }
.summary-cards { display: grid; gap: var(--operator-space-4); grid-template-columns: repeat(3, minmax(0, 1fr)); margin-block-end: var(--operator-space-8); }
.summary-value { font-size: 2.25rem; font-variant-numeric: tabular-nums; font-weight: 800; line-height: 1; }
.dashboard-section, .workspace-section { display: grid; gap: var(--operator-space-4); margin-block-start: var(--operator-space-8); }
.dashboard-section > h2, .workspace-section > h2 { font-size: 1.25rem; line-height: 1.2; }
.section-heading-row { align-items: end; display: flex; flex-wrap: wrap; gap: var(--operator-space-3); justify-content: space-between; }
.section-heading-row h2 { font-size: 1.25rem; line-height: 1.2; }
.issue-count { color: var(--operator-colour-muted); font-size: 0.875rem; }
.text-action { font-weight: 700; white-space: nowrap; }
.attention-list { border-block-start: var(--operator-border); }
.attention-item { align-items: start; border-block-end: var(--operator-border); display: grid; gap: var(--operator-space-3); grid-template-columns: auto minmax(0, 1fr); padding-block: var(--operator-space-4); }
.attention-item h3 { font-size: 1rem; }
.attention-item p, .section-description { color: var(--operator-colour-muted); }
.form-section { margin-block-end: var(--operator-space-8); }
.form-grid { display: grid; gap: var(--operator-space-4); grid-template-columns: repeat(2, minmax(0, 1fr)); }
.form-grid > :last-child { align-self: end; }
.module-fieldset { border: var(--operator-border); border-radius: 0.375rem; display: grid; gap: var(--operator-space-2); grid-column: 1 / -1; margin: 0; padding: var(--operator-space-4); }
.module-fieldset legend { font-weight: 700; padding-inline: var(--operator-space-1); }
.table-wrap { border: var(--operator-border); border-radius: var(--operator-radius); overflow-x: auto; }
.data-table { border-collapse: collapse; inline-size: 100%; min-inline-size: 34rem; text-align: left; }
.data-table :is(th, td) { border-block-end: var(--operator-border); padding: var(--operator-space-3) var(--operator-space-4); vertical-align: middle; }
.data-table th { font-weight: 700; }
.data-table thead th { background: #eef2f7; color: var(--operator-colour-muted); font-size: 0.8125rem; letter-spacing: 0.02em; text-transform: uppercase; }
.data-table tbody tr:last-child :is(th, td) { border-block-end: 0; }
.table-actions form { margin: 0; }
.table-actions button { min-block-size: 2.25rem; padding-inline: var(--operator-space-2); }
.secondary-section { border-block-start: var(--operator-border); padding-block-start: var(--operator-space-8); }
.contract-workspace { align-items: start; display: grid; gap: var(--operator-space-8); grid-template-columns: 12rem minmax(0, 1fr); }
.contract-main { min-inline-size: 0; }
.context-sidebar { position: sticky; inset-block-start: var(--operator-space-4); }
.context-sidebar-label { color: var(--operator-colour-muted); font-size: 0.8125rem; font-weight: 800; letter-spacing: 0.06em; margin-block-end: var(--operator-space-2); text-transform: uppercase; }
.context-sidebar nav { border-inline-start: var(--operator-border); display: grid; gap: var(--operator-space-1); }
.context-sidebar a { padding: var(--operator-space-2) var(--operator-space-3); text-decoration: none; }
.context-sidebar a:hover { background: #eef2f7; }
.collapsible-panel { border: var(--operator-border); border-radius: var(--operator-radius); background: var(--operator-colour-surface); }
.collapsible-panel summary { cursor: pointer; font-size: 1.25rem; font-weight: 800; padding: var(--operator-space-4) var(--operator-space-6); }
.collapsible-panel summary::marker { color: var(--operator-colour-accent); }
.collapsible-panel-content { border-block-start: var(--operator-border); display: grid; gap: var(--operator-space-4); padding: var(--operator-space-6); }
.inline-actions { align-items: center; display: flex; flex-wrap: wrap; gap: var(--operator-space-4); margin-block-end: var(--operator-space-3); }
.command-actions { display: flex; flex-wrap: wrap; gap: var(--operator-space-3); }
.command-actions form { margin: 0; }
.sr-only { block-size: 1px; clip: rect(0 0 0 0); clip-path: inset(50%); inline-size: 1px; overflow: hidden; position: absolute; white-space: nowrap; }

@media (max-width: 42rem) {
  .operator-shell-bar { align-items: flex-start; flex-direction: column; }
  .operator-navigation ul { inline-size: 100%; }
  .operator-navigation li { flex: 1; }
  .operator-navigation a { justify-content: center; }
  .operator-content { padding-block: var(--operator-space-6); }
  .data-list-row { grid-template-columns: 1fr; }
  .summary-cards, .form-grid { grid-template-columns: 1fr; }
  .module-fieldset { grid-column: auto; }
  .contract-workspace { grid-template-columns: 1fr; gap: var(--operator-space-4); }
  .context-sidebar { position: static; }
  .context-sidebar nav { border-inline-start: 0; border-block-end: var(--operator-border); display: flex; overflow-x: auto; }
  .context-sidebar a { white-space: nowrap; }
}

/* Everyday service controls stay visually separate from the legacy tools. */
.service-workspace { max-inline-size: 48rem; margin-inline: auto; padding-block: 1rem 3rem; }
.service-page-header { margin-block-end: 2rem; }
.service-page-header > p { color: var(--operator-colour-muted); font-size: .8rem; font-weight: 600; letter-spacing: .04em; margin-block-end: .5rem; }
.service-page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 650; letter-spacing: -.045em; line-height: 1.15; margin-block-end: .65rem; }
.service-page-header > span { color: var(--operator-colour-muted); font-size: .95rem; }
.service-panel { background: #fff; border: 1px solid #dce2e9; border-radius: 1rem; overflow: hidden; margin-block: 1.5rem; box-shadow: 0 4px 18px #17203305; }
.service-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.5rem 1.75rem; border-block-end: 1px solid #edf0f4; }
.service-identity { display: flex; align-items: center; gap: .85rem; min-inline-size: 0; }
.service-mark { display: grid; place-items: center; inline-size: 2.75rem; block-size: 2.75rem; flex-shrink: 0; border: 1px solid #dce5f2; border-radius: .75rem; background: #f1f5fc; color: #315280; font-size: 1.1rem; font-weight: 700; }
.service-panel .service-identity h2 { font-size: 1rem; font-weight: 650; letter-spacing: -.015em; overflow-wrap: anywhere; }
.service-identity p { color: var(--operator-colour-muted); font-size: .8rem; margin-block-start: .2rem; }
.service-panel form { margin: 0; }
.service-control-row { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-inline: 1.75rem; padding-block: 1.65rem; }
.service-control-row + .service-control-row { border-block-start: 1px solid #edf0f4; }
.service-control-row h3, .service-field-label { font-size: .95rem; font-weight: 650; }
.service-control-row p { color: var(--operator-colour-muted); font-size: .85rem; margin-block-start: .35rem; }
.service-toggle { display: flex; flex-shrink: 0; border: 1px solid #dce2e9; border-radius: .65rem; padding: .2rem; margin: 0; background: #f3f5f8; }
.operator-shell .service-toggle label { display: block; position: relative; min-block-size: 0; padding: 0; cursor: pointer; }
.service-toggle input { position: absolute; opacity: 0; }
.service-toggle span { display: grid; place-items: center; min-inline-size: 3.25rem; min-block-size: 2.5rem; border-radius: .45rem; font-size: .875rem; font-weight: 650; color: #667085; transition: background 150ms, color 150ms; }
.service-toggle input:checked + span { background: #fff; color: #155eef; box-shadow: 0 1px 4px #17203318; }
.service-toggle input[value="off"]:checked + span { color: #9f3333; }
.service-toggle input:focus-visible + span { outline: 2px solid #155eef; outline-offset: 2px; }
.service-toggle label:hover span { color: #172033; }
.operator-shell .service-seat-input { inline-size: 7rem; flex-shrink: 0; min-block-size: 3rem; background: #fff; border-color: #cbd4e0; border-radius: .65rem; text-align: center; font-size: 1.35rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.service-panel-footer { padding: 1.1rem 1.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: #fafbfd; border-block: 1px solid #edf0f4; }
.service-panel-footer p { max-inline-size: 19rem; font-size: .8rem; color: var(--operator-colour-muted); line-height: 1.5; }
.service-panel-footer button { white-space: nowrap; border-radius: .55rem; padding-inline: 1.25rem; font-size: .875rem; }
.service-observations { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 1.5rem 1.75rem; }
.service-observations > div { display: grid; gap: .4rem; }
.service-stat-label { color: var(--operator-colour-muted); font-size: .75rem; }
.service-observations strong { font-size: .875rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.service-observations small { color: var(--operator-colour-muted); font-size: .75rem; }
.service-more { border-block-start: 1px solid #edf0f4; padding: 1rem 1.75rem; font-size: .8rem; color: var(--operator-colour-muted); }
.service-more summary { cursor: pointer; padding-block: .4rem; width: fit-content; }
.service-more p { margin-block: .75rem; max-inline-size: 35rem; line-height: 1.6; }
.service-more a { display: inline-block; padding-block: .5rem; }
.service-account-options { border: 0; padding-inline: 0; }
.service-help { margin: 0 1.75rem 1rem; color: #8a4b0f; font-size: .875rem; }
@media (max-width: 36rem) {
  .service-workspace { padding-block-start: 0; }
  .service-panel-header, .service-panel-footer, .service-observations, .service-more { padding-inline: 1rem; }
  .service-control-row { margin-inline: 1rem; gap: 1rem; }
  .service-panel-footer { align-items: stretch; flex-direction: column; }
  .service-panel-footer p { max-inline-size: none; }
  .service-observations { gap: 1rem; }
  .service-panel-header { flex-wrap: wrap; }
}
`
