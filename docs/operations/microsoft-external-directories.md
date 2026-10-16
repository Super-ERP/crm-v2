# Microsoft sign-in for approved external directories

QAR uses a separate Microsoft Entra directory. The November 2026 QAR/CC pilot can use users' existing work accounts after the following configuration and UAT. Code availability does not mean production authentication is activated. CC's domain/directory must be confirmed separately.

## How it works

The existing `microsoft-entra-id` provider, Quandatics credentials and existing account links remain unchanged. Each external directory uses its own single-tenant app registration and credentials; there is no fallback to the Quandatics app. Each approved external directory gets a provider named `microsoft-entra-<lowercase-directory-guid>`, with fixed directory-specific authorization/token endpoints. No `common`, `organizations` or personal-account authority is enabled.

When external directories are configured, the sign-in page asks for a work email and routes by its exact domain. This field selects a route; it does not grant access or replace Microsoft authentication. Callbacks validate signed ID tokens against the configured tenant's JWKS, issuer, client audience, expiry and tenant ID, bind userinfo to the token subject and check its returned email domain. External domains cannot use the primary provider. Account links still require an exact returned-email match; no aliases, ownership transfers or user merges are inferred.

Microsoft authentication and CRM authorisation remain separate. Exact-email CRM invitations, existing memberships, roles, reporting managers, entity scope, licence seats and module entitlements retain their existing controls. Domain auto-join is an existing separate entity setting; for the pilot, leave it disabled for external domains and use reviewed invitations. A directory mapping alone grants no entity membership.

## Required inputs and administrators

- Q-Armour's real **Directory (tenant) ID**, and confirmation that `q-armour.com` is its intended user email domain.
- Confirm CC's actual domain and whether it shares QAR's directory or has another directory.
- Q-Armour-owned Application (Client) ID, Client Secret **value** (not Secret ID), and expiry date, transferred through an approved secure channel. CC needs its own registration if it has a separate directory.
- Q-Armour/CC Microsoft administrator for app registration, consent, user/group assignment and Conditional Access/MFA review. Quandatics does not need to change its app to multi-tenant.
- Pilot user email list, intended CRM entities, roles, reporting managers, available seats and module access. Compare Microsoft-returned email/UPN to imported CRM users before inviting; aliases must be reconciled deliberately.
- Public CRM base URL and deployment operator access. Do not put client secrets, tokens or passwords into tickets or this guide.

## Microsoft configuration

1. Q-Armour's Microsoft administrator creates a Web app registration in **their own directory**, with **Accounts in this organizational directory only**. Provide its Tenant ID, Application (Client) ID and a Client Secret value/expiry through a secure channel.
2. In that Q-Armour registration, add the exact Web redirect URI:
   `https://<crm-host>/api/auth/oauth2/callback/microsoft-entra-<lowercase-Q-Armour-directory-guid>`.
   For the current CRM host, use `https://app.quandatics.com` in place of `https://<crm-host>`.
3. Retain Quandatics' app, credentials and original callback unchanged:
   `https://<crm-host>/api/auth/oauth2/callback/microsoft-entra-id`.
4. Q-Armour's administrator reviews/consents to the app and assigns the pilot users/groups if assignment is required. Login uses `openid profile email`; do not add directory-wide application permissions for this feature.
5. Review MFA/Conditional Access and test the actual invited users, not only the administrator. Consent alone does not add CRM memberships. Record a renewal owner/reminder before secret expiry.

If CC shares the QAR directory and app, include its verified domain in the same mapping. If it has another directory, create/configure that directory's own app and callback. No app needs to become multi-tenant for this approach.

## Deployment configuration

Keep the existing primary `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` unchanged. Add two single-line JSON values. Domain routing is separate from the server-only credential map:

```dotenv
MICROSOFT_EXTERNAL_DIRECTORIES=[{"tenantId":"22222222-2222-4222-8222-222222222222","domains":["q-armour.com"]}]
MICROSOFT_EXTERNAL_CREDENTIALS={"22222222-2222-4222-8222-222222222222":{"clientId":"33333333-3333-4333-8333-333333333333","clientSecret":"REPLACE_SECURELY"}}
```

Both GUIDs and the secret above are illustrative. Replace them with Q-Armour's real Tenant ID, Client ID and secret value. Treat MICROSOFT_EXTERNAL_CREDENTIALS as a secret: use protected environment/deployment files, never NEXT_PUBLIC variables, browser props, tickets or logs. Every mapped external directory requires its own credential entry; missing/unmapped entries or invalid credentials are rejected without printing values. JWT audience validation uses that directory's own Client ID. Multiple domains in one directory belong in the same `domains` array; different directories are separate entries. GUIDs and domains are normalized to lowercase. Wildcards, duplicate directories/domains, malformed JSON and empty domain arrays are rejected. Do not map an external domain to the primary directory.

`MICROSOFT_ALLOWED_DOMAINS` is an optional comma-separated **new-user creation** allow-list. If used, preserve all existing allowed domains and include each new permitted domain. It is not a replacement for directory validation and is not a returning-user revocation switch. Invitations do not bypass this allow-list. The directory and credential configuration passes through root/client Compose and protected client deploy/rollback records; verify effective runtime settings without printing secrets. Client bundle env files use literal KEY=value data, without outer shell quotes.

After deployment, invite pilot users by the exact email returned by Microsoft into the correct QAR/CC entity. A user authorised for both entities needs both memberships. Existing domain auto-join selects only the first matching entity and is unsuitable for deciding multi-entity membership.

## Verification before enabling the pilot

- Existing QM/QA primary-directory login still works for returning and pre-provisioned users.
- New, existing/pre-provisioned and returning QAR users authenticate through the external callback without creating duplicate CRM users.
- Wrong-directory tokens, wrong client audience, expired/invalid signatures, mismatched subjects and wrong-domain profiles fail closed.
- A same-domain user without the intended membership does not see another entity's records. Unlicensed invitation consumption does not bypass the seat limit.
- Review first entity selection, authorised entity switching, salesperson/manager visibility, approvals, logout and a new sign-in.
- Review aliases or renamed Microsoft addresses explicitly; do not transfer account ownership just to make login work.
- Run practical QAR/CC UAT for quotation templates, Bill To/contacts/addresses, stage requirements, approvals and project codes.
- Record redacted sign-in results and business acceptance in SUP-63. Resolve findings during the November–December pilot; agree the exact 2027 go-live date after UAT.

## Rollback and offboarding

Retain the previous deployment's directory/domain/credential settings securely. Rotated or revoked Microsoft secrets cannot be restored merely by restoring a deployment file; coordinate rollback with the Microsoft administrator. Stop new external login routes by removing both the directory mapping and its corresponding MICROSOFT_EXTERNAL_CREDENTIALS entry in the same deployment, plus the callback/assignment as appropriate. Leaving an unmatched mapping or credential entry fails startup validation; retain the primary provider and URI. **This does not invalidate existing CRM sessions.** If urgent access removal is required, revoke the affected CRM sessions and memberships through the appropriate administrator workflow and review Microsoft assignment/consent. Do not delete historical users, owners or account links as a login rollback.

Changing or removing a mapping is an identity change: test returning users and restore the corresponding callback, mapping and credential settings together when rolling forward again. Keep pilot records and configuration evidence for reconciliation. No database migration is required by this feature.
