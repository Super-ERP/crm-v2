# CRM code audit — 20 October 2026

Baseline: `f44f633` on main, fast-forwarded from `4a64c68` (five commits). Initial audit baseline; cleanup progress is recorded below.

## Microsoft login

Yong Quan reports that Quandatics, QAR and CC share a Microsoft tenant and the existing client secret remains valid. This is customer confirmation, not a live directory verification. Daltos is not confirmed as part of this setup.

Register `https://app.quandatics.com/api/auth/oauth2/callback/microsoft-entra-id` in the existing app registration under Authentication → Add a platform → **Web**. The server handles OAuth through Better Auth with a client secret (`apps/web/lib/auth.ts`); this is not a browser-only token exchange. The callback already exists in code via `app/api/auth/[...all]/route.ts`.

Reference: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url

Before accepting rollout: confirm deployed BETTER_AUTH_URL, MICROSOFT_TENANT_ID and client ID match that app; check MICROSOFT_ALLOWED_DOMAINS includes the required domains if configured; invite one QAR and one CC user into their intended CRM entities (or configure domain auto-join), then test sign-in, entity access and sales visibility. Sharing a Microsoft directory does not itself grant CRM membership. No new tenant/provider code is indicated by this update. Azure and deployed environment settings were not inspected.

## Confirmed cleanup findings

All cleanup findings below are low severity maintenance issues; no production failure is established from them.

1. **Unused edit buttons:** `apps/web/app/(app)/accounts/[id]/account-edit-button.tsx:12` and `apps/web/app/(app)/leads/[id]/lead-edit-button.tsx:22` have no consumers. Current detail pages use detail-body editing instead. Remove these obsolete wrappers in a cleanup change.
2. **Unused change-history path:** `apps/web/components/activity/change-history.tsx:7` and `apps/web/app/(app)/_shared/change-actions.ts:5` have no consumers. The latter wraps the still-used activity service; remove these wrappers without deleting the shared activity implementation.
3. **Unused UI island:** `components/ui/calendar.tsx`, `drawer.tsx`, and `toggle-group.tsx` have no consumers; `toggle.tsx` is referenced only by the unused toggle-group. Paths are under `apps/web/`. Remove together if these are not intentionally retained scaffolding. `react-day-picker` and `vaul` are used only by the orphan calendar/drawer wrappers.
4. **Unused drag dependencies:** `@dnd-kit/modifiers`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` occur only in the web dependency manifest (apart from lockfile records). `@dnd-kit/core` remains in use; keep it.
5. **Unreachable milestone editor:** `apps/web/app/(app)/settings/billing/numbering/numbering-client.tsx:381` declares `MilestoneTemplateCard` but never renders it. It contains obsolete project-auto-seeding copy and a save action used only by this hidden editor. The comment explicitly says it was retained intentionally. Remove the unreachable component only after deciding whether that editor will return; preserve saved data and independently used template logic.
6. **Unused locals/imports:** strict unused-symbol checking identifies five unnecessary React imports (file-dropzone, stage-path-view, column-controls, text-size-toggle, theme-toggle) and `packages/control-protocol/src/command.ts:15`'s unused `CommandKindSchema`. These can be removed separately from the live command schemas.
7. **Unused adapter:** `apps/web/app/(app)/_shared/project-code-actions.ts:60` exports `listRelatedProjectCodeTablePage` without a consumer. Remove the wrapper or deliberately connect the intended consumer; retain `listRelatedProjectCodes`, which is live.

## Do not delete based on scanner output

- `public/prefs-init.js`: loaded by URL from `app/layout.tsx`.
- `tests/fixtures/qa-qm-pagination.tsx`: launched by `scripts/quotation-pagination/check.py`.
- `tests/server-only-stub.ts`: test infrastructure.
- `server/services/finance.ts`: intentional empty placeholder read by `tests/payment-milestone-lifecycle.test.ts`; removal requires updating that test.
- Database imports, backfills and seed scripts: operational entry points, not necessarily application imports.
- `esbuild`: invoked by the migrator build script outside the web directory.
- `ForecastClient` and `entitlementPollDelayMs`: called inside their own modules. An unused **export** is not an unused implementation.
- Migration files and database columns were not classified as dead merely because application imports are absent.

## Verification and limits

A web-only Knip 6.42.0 scan completed with findings (exit 1). The initial whole-workspace scan emitted partial results but failed while loading the control-plane Vitest config: `ENOENT: no such file or directory, scandir './migrations'`. This is a scanner working-directory/config issue, not proof the control-plane test suite is broken. Its findings are not treated as confirmed.

At the initial audit, normal web typecheck and 26 focused tests passed. The initial stricter `tsc --noEmit --noUnusedLocals --noUnusedParameters` check fails on the seven findings described above. The initial audit did not include live Microsoft login, a full build, a full test suite, a database reachability audit or production traffic analysis. Follow-up verification is recorded below. Dynamic/external consumers need checking before deleting exported server actions. The appendix is triage input, not a deletion list.

## Follow-up checklist — 20 October 2026

### Implemented in cleanup branch (not deployed)

- [x] Remove eight orphan component/action files: account/lead edit buttons, change-history wrappers, calendar, drawer, toggle-group and toggle.
- [x] Remove five unused direct dependencies and update pnpm lockfile. Keep @dnd-kit/core and its required transitive dependencies.
- [x] Remove five unused React imports and the unused CommandKindSchema local.
- [x] Remove the unused related-project-code table adapter; preserve the live related-record query.
- [x] Preserve operational scripts, URL-loaded preferences, quotation pagination fixtures, test stubs and the finance regression-test placeholder.
- [ ] Decide whether the deliberately hidden MilestoneTemplateCard should return. It was retained; its saved data and action were not changed.
- [ ] Triage remaining scanner export/type candidates individually; exported does not imply unused implementation.

### Production incident resolved; permanent fix still needed

- [x] Confirm superadmin email remains laijienweng@gmail.com, credential exists, and platform-master configuration matches. Reset password, synchronize protected deployment password and verify a real production superadmin session. Secrets are not stored in this repository.
- [x] Restore deployment communication by restarting only crm-v2-agent-1. Agent accepted revision 101, reported deployment_heartbeat_succeeded at 2026-10-20T04:01:25.605Z, and cleared lastErrorCode. Accepted lease expires 2026-10-20T23:14:57.619Z; serviceEnabled is true. This is timestamped recovery evidence, not a guarantee of future renewal.
- [ ] Fix the agent's permanent in-memory repairRequired latch after an identity_rejected response. Proposed design: continue low-frequency authenticated probes with bounded backoff; preserve the existing identity and signed-lease validation; resume normal heartbeat/polling once credentials are accepted. Never re-register automatically or extend a lease locally. Cover rejected → re-enabled → recovered and continued rejection in regression tests before release.
- [ ] Check control-plane audit history around 17 October to establish the original rejection trigger. A disabled deployment can cause rejection, but that trigger has not been verified for this incident.
- [ ] Use the configured operator origin https://jienweng.dpdns.org for Cloudflare Access operator sign-in. The raw workers.dev service URL requires a valid Access assertion for operator endpoints and is not the recommended operator entry point.

### Customer rollout remaining

- [ ] Din adds the exact Microsoft redirect under the existing app registration's Web platform.
- [ ] Confirm QAR/CC email domains and CRM membership/role assignments; sharing a Microsoft tenant alone does not grant entity access.
- [ ] Run one QAR and one CC pilot login, verify entity switching, own-record visibility and approvals.
- [ ] Keep Daltos out of this shared-tenant assumption until its directory is confirmed.

Recommended order: release the agent recovery fix first because it affects licence renewal; deliver this cleanup separately; then complete QAR/CC pilot login and record-visibility acceptance. Repair the reset-master command separately so it explicitly targets the credential provider, validates the superadmin, and handles session revocation and deployment-password synchronization.

## Cleanup verification

- Normal web typecheck: passed.
- Web ESLint: passed.
- Production Next.js build: passed.
- Shared control-protocol tests: 59 passed across five files.
- Strict unused-symbol check: only the deliberately retained MilestoneTemplateCard remains (TS6133); this optional stricter check is not clean.
- Independent code review: no actionable findings; external/dynamic consumers and live incident evidence were outside reviewer scope.
- Full web suite: 906 passed, 86 skipped; 115 files passed and 23 skipped. Skipped suites were not validated by this run.

## Initial web scan appendix: historical candidates requiring triage

- `apps/web/db/seed-currencies.ts` — files: apps/web/db/seed-currencies.ts
- `apps/web/public/prefs-init.js` — files: apps/web/public/prefs-init.js
- `apps/web/tests/server-only-stub.ts` — files: apps/web/tests/server-only-stub.ts
- `apps/web/db/import/backfill-quotation-billing.ts` — files: apps/web/db/import/backfill-quotation-billing.ts
- `apps/web/db/import/backfill-salesforce-project-codes.ts` — files: apps/web/db/import/backfill-salesforce-project-codes.ts
- `apps/web/db/import/prepare-account-address-recovery.ts` — files: apps/web/db/import/prepare-account-address-recovery.ts
- `apps/web/components/activity/change-history.tsx` — files: apps/web/components/activity/change-history.tsx
- `apps/web/components/ui/calendar.tsx` — files: apps/web/components/ui/calendar.tsx
- `apps/web/components/ui/drawer.tsx` — files: apps/web/components/ui/drawer.tsx
- `apps/web/components/ui/toggle-group.tsx` — files: apps/web/components/ui/toggle-group.tsx
- `apps/web/components/ui/toggle.tsx` — files: apps/web/components/ui/toggle.tsx
- `apps/web/server/services/finance.ts` — files: apps/web/server/services/finance.ts
- `apps/web/app/(app)/_shared/change-actions.ts` — files: apps/web/app/(app)/_shared/change-actions.ts
- `apps/web/tests/fixtures/qa-qm-pagination.tsx` — files: apps/web/tests/fixtures/qa-qm-pagination.tsx
- `apps/web/app/(app)/accounts/[id]/account-edit-button.tsx` — files: apps/web/app/(app)/accounts/[id]/account-edit-button.tsx
- `apps/web/app/(app)/leads/[id]/lead-edit-button.tsx` — files: apps/web/app/(app)/leads/[id]/lead-edit-button.tsx
- `apps/web/package.json` — dependencies: @dnd-kit/modifiers, @dnd-kit/sortable, @dnd-kit/utilities, react-day-picker, vaul; devDependencies: esbuild
- `apps/web/lib/permissions.ts` — exports: ALL_PERMISSION_GROUPS, PERMISSION_LABELS
- `apps/web/app/(app)/settings/constants.ts` — exports: STAGE_KIND_DESCRIPTION, QUOTE_DEFAULT_NOTES_MAX, normalizeProductCode, validateProductCode, validateProductSubcategoryCode; types: ProductSubcategory, ProductCode
- `apps/web/db/import/runner.ts` — exports: storedValueMatches
- `apps/web/db/index.ts` — exports: schema; types: Schema, AppDB
- `apps/web/lib/modules.ts` — exports: COMPILED_MODULE_MAP, MODULE_IDS, MODULES, createDisabledModuleMap, createModuleMap, filterPermissionGroups, isDependencyClosed, validateModuleComposition; types: ModuleId, ModuleMap, ModuleMeta
- `apps/web/components/ui/button.tsx` — exports: buttonVariants
- `apps/web/lib/action-error.ts` — exports: ACTION_ERROR_CODES
- `apps/web/lib/quotation-transitions.ts` — exports: isQuotationEditable
- `apps/web/lib/access-scope.ts` — exports: attachableOwner
- `apps/web/app/(app)/settings/subscription/actions.ts` — exports: getSubscriptionEntitlementData
- `apps/web/lib/write-access.ts` — exports: LICENSE_READ_ONLY_MESSAGE
- `apps/web/lib/approval-queue.ts` — exports: APPROVAL_KINDS
- `apps/web/lib/deployment-seats.ts` — exports: reconcile
- `apps/web/lib/deployment-status.ts` — exports: readDeploymentStatusRollup
- `apps/web/lib/table-controls/evaluate.ts` — exports: tableScalar
- `apps/web/lib/table-controls/registry.ts` — exports: FIELD_OPERATORS
- `apps/web/lib/internal-deployment-api.ts` — exports: INTERNAL_RESPONSE_HEADERS
- `apps/web/app/(app)/team/actions.ts` — exports: listPermissionAdmins, getRolePermissions; types: PermissionAdmin
- `apps/web/app/(app)/settings/actions.ts` — exports: updateIntercompanyPartners, listTenantMembers; types: TenantMemberView
- `apps/web/app/(app)/billing/actions.ts` — exports: isFinanceEnabled
- `apps/web/lib/opportunity-code.ts` — exports: OPPORTUNITY_PAD_WIDTH, PPVVC_FIELDS; types: PpvvcField
- `apps/web/components/phone-input.tsx` — exports: PhoneInputInner
- `apps/web/app/(app)/funnel/actions.ts` — exports: deleteOpportunity
- `apps/web/lib/ppvvc.ts` — exports: isPpvvcComplete
- `apps/web/db/import/mapping.ts` — exports: asText, asDate, asNum, asInt, asBool, asCurrency, intOr, numOr, ref, owner; types: Xform, FieldMap
- `apps/web/app/(app)/_shared/project-code-actions.ts` — exports: listRelatedProjectCodeTablePage; types: RelatedProjectCodeRow
- `apps/web/lib/table-controls/state.ts` — exports: legacyFiltersToTree, readLegacyTableState
- `apps/web/lib/quotation-pdf-template.ts` — exports: QUOTATION_PDF_TEMPLATE_OPTIONS, isQuotationPdfTemplateCode, isBuiltinQuotationPdfTemplateCode; types: QuotationPdfTemplateSpec
- `apps/web/lib/quotation-template-api.ts` — exports: upsertTemplateCodeOnAccount; types: QuotationTemplateRenderMode
- `apps/web/lib/saved-views.ts` — exports: savedViewListKeySchema; types: SavedViewFilters
- `apps/web/lib/so-milestones.ts` — exports: slugify
- `apps/web/lib/stage-gate.ts` — exports: REQUIRABLE_FIELDS, PPVVC_PRESET_KEYS
- `apps/web/app/(app)/funnel/stage-transitions.ts` — exports: stagePathAction
- `apps/web/lib/subscription-billing.ts` — exports: addCalendarMonths; types: CollectionFrequency, CollectionMilestone, MonthlyBillingPeriod
- `apps/web/lib/subscription-licensing.ts` — exports: getActiveLicenseState, canActivateAdditionalMembers, getLicenseStateWithTenantContext, formatLicenseWindowLabel
- `apps/web/components/ui/table.tsx` — exports: TableCaption
- `apps/web/lib/table-controls/filter-tree.ts` — exports: isCalendarDate
- `apps/web/components/ui/sidebar.tsx` — exports: SidebarGroupAction, SidebarInput, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail, SidebarSeparator, useSidebar
- `apps/web/lib/auth-client.ts` — exports: signIn, signOut, signUp, useSession, useActiveOrganization
- `apps/web/components/ui/badge.tsx` — exports: badgeVariants
- `apps/web/app/(app)/forecast/forecast-client.tsx` — exports: ForecastClient
- `apps/web/server/services/operator-alerts.ts` — exports: purgeResolvedAlerts
- `apps/web/components/ui/select.tsx` — exports: SelectGroup, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator
- `apps/web/lib/quotation-template-registry.ts` — exports: listActiveQuotationTemplateOptions; types: QuotationTemplateRenderMode, QuotationTemplateOption
- `apps/web/components/ui/dropdown-menu.tsx` — exports: DropdownMenuPortal, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent
- `apps/web/lib/table-controls/date-range.ts` — exports: calendarToday
- `apps/web/components/ui/alert-dialog.tsx` — exports: AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal
- `apps/web/app/documentation/doc-kit.tsx` — exports: Ol
- `apps/web/components/ui/form.tsx` — exports: useFormField
- `apps/web/lib/input-validation.ts` — exports: isValidEmailInput, isValidPhoneInput, isValidUrlInput, isValidMoneyInput, isValidDateInput, isValidCustomFieldValue, isValidYearInput
- `apps/web/components/ui/sheet.tsx` — exports: SheetTrigger, SheetClose, SheetFooter
- `apps/web/components/ui/avatar.tsx` — exports: AvatarImage, AvatarGroup, AvatarGroupCount, AvatarBadge
- `apps/web/components/ui/dialog.tsx` — exports: DialogOverlay, DialogPortal
- `apps/web/components/ui/command.tsx` — exports: CommandShortcut
- `apps/web/components/ui/breadcrumb.tsx` — exports: BreadcrumbEllipsis
- `apps/web/components/ui/tabs.tsx` — exports: tabsListVariants
- `apps/web/components/ui/chart.tsx` — exports: ChartStyle
- `apps/web/lib/status-meta.ts` — exports: STAGE_SOURCE_LABELS
- `apps/web/components/ui/popover.tsx` — exports: PopoverHeader
- `apps/web/components/ui/input-group.tsx` — exports: InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea
- `apps/web/lib/funnel-stages.ts` — types: StageKindValue
- `apps/web/lib/auth.ts` — types: Session
- `apps/web/server/services/quotation-math.ts` — types: LineComputed
- `apps/web/lib/api-readers.ts` — types: AccountRow, AccountFunnelItem, PersonRow, PersonOpportunity, PersonProject, ContactRef, PartyInput, QuotationRow, QuotationLineRow
- `apps/web/server/services/changes/types.ts` — types: FormatCtx
- `apps/web/lib/data-table-filters.ts` — types: DataTableFilterOption
- `apps/web/app/(app)/quotations/actions.ts` — types: QuotationLineRow
- `apps/web/components/data-table.tsx` — types: DataTableFacet
- `apps/web/lib/table-controls/types.ts` — types: ValidatedTableQuery
- `apps/web/components/milestones-panel.tsx` — types: MilestoneStatus
- `apps/web/app/(app)/projects/actions.ts` — types: ProjectStatus, ProjectCodeNature, ProjectNatureOption, MilestoneRow, MilestoneStatus
- `apps/web/app/(app)/settings/_nav.ts` — types: SettingsNavItem
- `apps/web/app/(app)/opportunities/actions.ts` — types: ContactRef
- `apps/web/db/import/plan.ts` — types: MigrationNote
- `apps/web/db/import/project-code-backfill-plan.ts` — types: ProjectCodes
- `apps/web/lib/quotation-template-renderer.ts` — types: QuotationTemplateLineContext
- `apps/web/server/services/table-controls/compile.ts` — types: SqlTableField
- `apps/web/app/(app)/dashboard/actions.ts` — types: PendingApproval, StaleDeal, OverdueInvoice, GettingStarted
- `apps/web/app/(app)/leads/actions.ts` — types: ConvertNewAccountInput
- `apps/web/lib/storage.ts` — types: StoredObject
- `apps/web/app/(app)/accounts/[id]/account-detail-body.tsx` — types: AccountEditKey
- `apps/web/components/stage-progress.tsx` — types: ProgressState
- `apps/web/app/(app)/leads/[id]/lead-detail-body.tsx` — types: LeadConverted, LeadEditKey
- `apps/web/app/(app)/persons/[id]/person-detail-body.tsx` — types: PersonEditKey
- `apps/web/app/(app)/projects/[id]/project-detail-body.tsx` — types: ProjectEditKey
- `apps/web/lib/phone-validation.ts` — types: PhoneCountryCode
- `apps/web/app/(app)/_shared/search-actions.ts` — types: SearchHitType
- `apps/web/components/stage-path-view.tsx` — types: PathStepTone
- `apps/web/app/documentation/schema-data.ts` — types: SchemaColumn
