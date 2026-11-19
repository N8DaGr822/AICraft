# Connected bank feed deployment

The Ledger Bank section links to a separate Blazor frontend on the API hostname, which connects through Microsoft Entra sign-in and Plaid Link. This ASP.NET Core API runs in Azure App Service and stores imported feed data in Azure SQL. The existing local SQLite ledger stays on the device; importing bank data does not create journals, pay invoices, or move money. Sync is manual, not a scheduled or real-time feed.

CommunityAmerica Credit Union, USA is the intended institution. The October 30, 2026 record confirms production credentials and Transactions support for institution `ins_110000` (membership before August 3, 2026). The owner also confirmed production Microsoft sign-in, CommunityAmerica linking and transaction retrieval that day. This is historical verification; the deployed services were not reverified during the November 11 documentation review. Enter bank credentials only in the provider/bank authorization flow.

## Azure resources and identity

These setup instructions apply to a new deployment. The recorded existing environment is described below; testing the import workflow does not require reprovisioning it.

1. Create a dedicated Azure SQL database and an ASP.NET Core .NET 10 App Service with HTTPS Only enabled. Use the latest patched .NET 10 runtime. Enable the App Service system-assigned managed identity. Configure SQL networking to permit the App Service (prefer VNet integration/private endpoint).
2. Run `schema.sql` once as a database administrator. Create a contained SQL user for the managed identity and grant SELECT/INSERT/UPDATE/DELETE on `dbo.BankConnections` and `dbo.BankTransactions`; runtime schema-owner rights are not needed. Configure `ConnectionStrings__Bank` as `Server=tcp:<server>.database.windows.net,1433;Database=<database>;Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False;Connect Timeout=60;`.
3. Create a single-tenant Entra API application registration. Expose delegated scope `api://<api-client-id>/access_as_user`; set the API application's `api.requestedAccessTokenVersion` to `2`. Configure `Authentication__Authority=https://login.microsoftonline.com/<tenant-id>/v2.0` and `Authentication__Audience=<api-client-id>`.
4. Create a single-tenant SPA registration. Add the delegated API permission above and grant the necessary consent. Register only `https://<app-service>.azurewebsites.net/bank-auth.html` as a **Single-page application** redirect URI. Use a separate registration for local testing; never enable the editor origin on the live bank registration. There is no SPA client secret.
5. Set `Authentication__AllowedObjectIds__0` to your user object ID in that tenant. Set `Authentication__AllowedClientIds__0` and `BankClient__ClientId` to the isolated bank SPA client ID. Empty user or client allowlists deny access. Additional users need separate numbered entries; each can see only their own records. Personal Microsoft accounts require a guest identity in the configured tenant.

## Server configuration

Use App Service configuration/environment variables. Keep secrets in Azure Key Vault, referenced from App Service settings. Grant the App Service identity access to the referenced secrets.

| Setting | Value |
| --- | --- |
| `ConnectionStrings__Bank` | Managed-identity SQL connection string above |
| `Authentication__Authority` | Tenant-specific v2 issuer URL |
| `Authentication__Audience` | API application client ID |
| `Authentication__AllowedObjectIds__0` | Authorized tenant user object ID |
| `Authentication__AllowedClientIds__0` | Isolated bank SPA client ID; reject old editor-site tokens |
| `BankClient__ClientId` | Same isolated SPA client ID |
| `AllowedOrigins` | Empty; the bank frontend and API share an origin |
| `Bank__EncryptionKey` | Key Vault reference to a base64-encoded cryptographically random 32-byte key |
| `Plaid__Environment` | `sandbox` initially; `production` only after approval |
| `Plaid__ClientId` | Plaid client ID |
| `Plaid__Secret` | Key Vault reference to the environment's Plaid secret |
| `Plaid__RedirectUri` | `https://<app-service>.azurewebsites.net/`, registered with Plaid for OAuth |

Generate the encryption key securely and retain it in Key Vault. Losing or replacing it makes stored bank tokens unreadable; rotation requires re-encryption or disconnect/reconnect. Never commit it. Azure SQL stores encrypted access tokens, but account metadata and transaction data are ordinary SQL rows protected by database access controls and Azure encryption. Configure SQL backup retention to suit financial-data requirements; disconnect deletes live rows, not historical Azure backups. Disable request/response-body capture in monitoring, and never log Authorization headers or Plaid request payloads.

## Frontend configuration

Publish BankClient alongside the API. The API serves public settings at /bank-config.json from its server configuration; no settings or sign-in adapter are shipped on the editor origin. Microsoft session tokens remain in session storage on the bank origin. The API checks the JWT issuer, audience, expiry, delegated scope, owner allowlist, and authorized client (azp).

MSAL 3.28.1 is bundled locally from the official @azure/msal-browser npm package with its MIT license. The shipped minified file has SHA-256 81fc17a81c9c822131db9bf3a3cb64ff35a5096b8e6b059ef18b2439ceaf058f. Plaid Link still loads from Plaid's official CDN as required by its web integration. Never place SQL passwords, Plaid secrets, encryption keys, or bank access tokens in browser configuration.

OAuth returns to the bank origin root. Sign in again if necessary and select **Connect bank / resume authorization**. Sign out clears this application's cached sign-in data, not the global Microsoft SSO session. Third-party editors cannot frame the banking site, read its storage, or call its API with their old client tokens.

## Build, test and deploy

From the repository root:

```powershell
dotnet run --project BankApi.Tests/BankApi.Tests.csproj
dotnet publish BankClient/BankClient.csproj -c Release -o publish/bank-client
dotnet publish BankApi/BankApi.csproj -c Release -o publish/bank-api
New-Item -ItemType Directory -Force publish/bank-api/wwwroot | Out-Null
Copy-Item publish/bank-client/wwwroot/* publish/bank-api/wwwroot -Recurse -Force
Compress-Archive -Path publish/bank-api/* -DestinationPath publish/bank-api.zip -Force
az webapp deploy --resource-group <resource-group> --name <app-service> --src-path publish/bank-api.zip --type zip
```

App Service authentication must allow requests through to ASP.NET Core JWT validation (do not substitute an Easy Auth login redirect for API bearer-token validation). The API still requires valid issuer, audience, delegated scope, allowlisted user and client. Leave CORS origins empty for same-origin hosting. Disable FTP and basic publishing credentials, keep HTTPS Only and TLS 1.2 or newer, and disable remote debugging. `/health` only checks that the process started, not SQL/Plaid availability.

The Pages workflow publishes only the static frontend. The separate Bank API workflow builds/tests and uploads an artifact; it does not provision Azure or deploy secrets.

### Initial Azure development environment

Provisioning started on October 30, 2026 in the personal BodyBalance subscription. The following configuration was recorded then and has not been rechecked against Azure:

| Resource | Configuration |
| --- | --- |
| API host | `aicraft-bank-api`, resource group `AICraft`, Linux .NET 10, West US 2 |
| App Service plan | `ASP-AICraft-9984`, Free F1 |
| API URL | `https://aicraft-bank-api-gwbweufeehdwg5hz.westus2-01.azurewebsites.net` |
| SQL database | `aicraft-bank` on existing server `body-balance`, resource group `BodyBalance` |
| SQL free offer | 32 GB, serverless; overage billing disabled, pause when the free allowance is exhausted |

The production Plaid credential and institution coverage check succeeded, and the Sandbox feed was removed. The secure bank client was registered separately from the old Pages client. The owner confirmed live sign-in and transaction retrieval on October 30, 2026; that confirmation does not establish completion of the recovery, concurrency or local import acceptance checks below.

Security controls include a 16 KB request-body limit, a per-owner 60-request/minute limit (in-process, not a distributed denial-of-service defense), bounded transaction paging, no-store responses, anti-framing headers, and a restrictive CSP with a hash for Blazor's generated import map. Keep the client and API artifacts together: the CSP hash is calculated at startup, so restart after updating the frontend.

Deployment limitations recorded October 30, 2026: secrets were in encrypted App Service settings, not Key Vault; the shared SQL server permitted Azure services and had public firewall rules used by BodyBalance. Do not remove those shared rules without verifying BodyBalance connectivity. Private networking may require paid tiers. SQL backups retain deleted data until retention expires. Free-tier cold starts/suspension remain possible. The configured SQL connection timeout is 60 seconds to allow serverless resume.

The GitHub Pages editors still share local browser storage with one another. Moving banking isolates live bank sessions but does not isolate local tax returns or bookkeeping from other editors. A separate origin for sensitive local tools remains recommended. Pinned upstream artifacts and dependency scans do not constitute a complete audit of all third-party source or compiled code.

## Acceptance before real use

These are engineering acceptance checks, separate from the owner import checklist below. Run provider mutation/disconnect scenarios in a separate Sandbox test deployment, not against the existing live connection. The historical sign-in confirmation does not mark these checks complete.

1. In Sandbox, connect a test bank, sync, select an account, and verify amount signs/currencies and pending status. Initial history may take time. Repeated sync must not duplicate transaction IDs.
2. Verify additions, modifications, removals, disconnect, reauthorization and OAuth return. A failed page restarts from the original cursor; no partial page set is saved. Recovery and reauthorization still need browser/provider evidence.
3. With Azure SQL, run simultaneous syncs and verify one complete update or a conflict/retry response. Unit tests use EF's in-memory provider and do not prove SQL rowversion/concurrency behavior.
4. Verify a second tenant user cannot read, sync, reconnect, or delete the first user's connection; unauthenticated callers receive 401 and missing scope/unapproved users receive 403.
5. For a new production deployment, confirm institution coverage and complete provider onboarding. The existing environment has recorded Sandbox SQL integration and owner-confirmed production sign-in/retrieval; current live behavior and the complete bank-to-ledger workflow remain to be verified.

Provider references: [Plaid Transactions](https://plaid.com/docs/transactions/add-to-app/), [sync semantics](https://plaid.com/docs/transactions/sync-migration/), [institution coverage](https://plaid.com/docs/institutions/), [Microsoft SPA authentication](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-overview).

## Bank export into local bookkeeping

The secure bank screen exports selected posted USD depository transactions (at most 100 per page) as a versioned JSON file with integer-cent amounts. It contains financial records but no sign-in or provider access tokens. Import it through Ledger Reborn > Banking > Bank Transactions, selecting the matching local bank account. Import stages rows without posting journals. Match existing entries or deliberately classify new entries; post transfers once, then match the other side. Opening balances and statement reconciliation remain separate tasks.

Stable source account/transaction IDs in the JSON export prevent repeat imports and reject mapping an existing transaction to another local account. Changed versions of already-imported transactions are rejected for review; provider changes or removals do not automatically correct or reverse local entries. Credit-card account exports are excluded; payments from checking can be classified against a local credit-card liability account. Save exported files privately.

The full Ledger interface also accepts CSV. It expects `date` (`YYYY-MM-DD`), `amount` (at most two decimal places) or integer `amount_cents`, and supports `description` or `memo` plus optional `external_id`. CSV amounts are positive for money in and negative for money out. The secure-feed JSON uses Plaid's opposite direction, which the importer converts. There is no configurable column mapping or verified compatibility with arbitrary bank-download formats. JSON cross-account duplicate protection should not be assumed for ordinary CSV.

### Local verification recorded November 11, 2026

These checks passed against source revision `1f4cf82` before this documentation cleanup:

```text
node --experimental-vm-modules scripts/test-bank-feed.mjs
node scripts/test-ledger-pyodide.mjs
dotnet run --project BankApi.Tests/BankApi.Tests.csproj -c Release --no-restore
```

The checks cover mocked bank authentication/export, import signs/staging/duplicates/rollback, classification and transfer matching, SQLite reopening, full-interface transport and reports, sync behavior, authorization and JWT validation. They use synthetic records, mocked provider calls and an in-memory SQL substitute. They do not verify browser DOM interactions, IndexedDB recovery, Azure SQL concurrency or current deployed services. The complete browser export/import workflow remains pending.

### Local verification recorded November 18, 2026

The working tree based on `1f4cf82` now retains the selected bank after **Add to Ledger** and **Match**. Both browser adapters reject direct classification to receivables (`1100`), inventory (`1200`) and payables (`2000`), including numeric account identifiers. Those accounts are excluded from the full interface's classification choices. Use **Receive Payments** or **Pay Bills**, then match the resulting bank journal line; use the inventory workflows for stock.

Passed locally:

```text
dotnet build AITest/AITest.csproj -c Release --no-restore
node scripts/test-ledger-bank-ui.mjs
node scripts/test-ledger-pyodide.mjs
node --experimental-vm-modules scripts/test-bank-feed.mjs
dotnet run --project BankApi.Tests/BankApi.Tests.csproj -c Release --no-restore
```

The Release build had zero warnings/errors. The new UI regression runs the shipped bank-page callbacks with a small simulated DOM; it is not a browser test. Real Pyodide tests cover forbidden string/numeric account requests in both companies, unchanged state after rejection, malformed requests, supported classifications, invoice/bill payment allocation and transfer matching without duplicate journals. The upstream engine and server remain unchanged. Subsequent local Chrome acceptance is recorded below; storage-failure recovery, Azure SQL concurrency and current deployed bank services remain unverified. Refresh the page before browser testing so its worker reloads the changed adapters.

Independent QA passed the Ledger regressions and an additional synthetic fixture scenario: staging and repeat import, cross-account replay rejection, three additional journals, checking balance 13,750 cents and savings balance 5,000 cents, transfer matching without reposting, SQLite snapshot reopening, separate reconciliation and unchanged My Company data. No defects were found in that automated/code scope. SQLite snapshot reopening does not verify browser IndexedDB persistence or recovery.

### Chrome browser acceptance recorded November 19, 2026

Evidence: the owner reported PASS for all nine local browser checks; the agent did not independently rerun them through browser automation. Environment: Chrome (version not supplied), `http://127.0.0.1:5192/ledger-reborn/2026.10.12-preview.1/index.html`, Synthetic Test Company, local working tree based on `1f4cf82`. Accounts: `1001 — QA Checking` and `1002 — QA Saving` (the actual display name is singular). Inputs: synthetic `checking.json` and `savings.json` in `.tools/ledger-bank-qa-20261118/`.

| Check | Owner-reported actual result | Status |
| --- | --- | --- |
| Staging | Both QA accounts remained at $0.00 after the checking import. | PASS |
| Classification choices | Receivables, inventory and payables were absent from the classification dropdown. | PASS |
| Checking classification and account retention | All three checking rows became classified; account 1001 remained selected after each post. | PASS |
| Savings matching and account retention | The +$50 savings row matched the existing transfer; account 1002 remained selected, with no second $50 posting. | PASS |
| Balances | Checking ended at $137.50 and savings at $50.00. | PASS |
| Repeat and cross-account import | Repeat imports added no rows; importing checking.json into savings was rejected with the expected different-local-bank-account error. | PASS |
| Browser persistence | After closing and reopening at the same local URL, rows, statuses and balances remained; repeat imports still added no rows. | PASS |
| Reconciliation | Both November 18 statements showed $0.00 difference before submission; balances remained unchanged afterward. | PASS |
| Company isolation | QA accounts and transactions were absent from My Company; the owner made no changes there. | PASS |

The local synthetic acceptance checks for these fixes are complete. Live bank export, deployed-service behavior, other browsers and storage-failure recovery were not exercised by these nine checks. The separate browser payment-allocation result is recorded below; automated regressions remain separate evidence.

### Chrome payment acceptance recorded November 19, 2026

Evidence: the owner reported PASS on the Ledger preview in Chrome, using Synthetic Test Company; the agent did not independently rerun this browser scenario. The browser version, exact preview URL, bank account identifier, transaction dates and description text were not supplied in this report.

| Check | Owner-reported actual result | Status |
| --- | --- | --- |
| Receive Payments | Recorded +$11.17 against invoice #7. | PASS |
| Pay Bills | Recorded -$12.19 against bill #9. | PASS |
| Import and matching | Verified both synthetic bank rows' signs, amounts, dates and descriptions; matched them to existing entries #34 and #35. | PASS |
| Repeat import | Exactly two matched rows remained after re-importing. | PASS |
| No duplicate posting | The bank balance was $15,415.98 after recording the payments and stayed unchanged after matching and re-importing. | PASS |
| Company isolation | No money moved, and the owner made no changes to My Company. | PASS |

This completes the separate synthetic browser payment check. It does not verify live secure-feed export or release readiness; see the [local release verification](../Docs/Launch/09-launch-checklist.md#local-release-verification--november-19-2026).

### Manual test checklist

For synthetic import, classification, matching and transfer exercises, open `/ledger` and choose **Synthetic Test Company** in the Company selector. Use synthetic files only; the repository includes a [sample CSV](../AITest/wwwroot/python/fixtures/bank.csv). Some sample rows may already be present in the demo. For your own bank workflow, choose **My Company**, download its SQLite backup first, and verify the selected local account before importing. Browser backup restoration is not implemented; restoration requires the desktop edition. Wait for each save to finish before navigating away, and keep only one Ledger view open.

Checked items below reflect the November 19 local synthetic Chrome and payment results above, supported by the automated regressions. Live secure-feed export and comparison remain open. Reopen testing covered classified/matched rows, not a browser storage failure.

- [ ] **Export:** On the secure bank page, sign in, use **Sync transactions**, select the intended account, select a few posted USD rows, and choose **Export selected for bookkeeping**. Expect one JSON file for that account and selection; pending, non-USD and credit-card rows cannot be selected. The limit is 100 rows on the current page.
- [x] **Destination and staging (synthetic):** In the intended company, open **Banking > Bank Transactions**, select the matching local bank account and import the file. Expect review rows in that account with no new journal entries or balance changes.
- [ ] **Amount direction:** Compare a money-in and a money-out row. The secure feed shows positive outflows and negative inflows; local Ledger should show the opposite signs with identical absolute amounts, dates and descriptions.
- [x] **Repeat import (synthetic):** Import the same file into the same account again. Expect no additional rows or journal entries. With a synthetic JSON export, try an already-imported transaction against a different local bank account and expect rejection.
- [x] **Classify once (synthetic):** Use **Add to Ledger** for a new review row with an appropriate counter-account. Expect one balanced journal and the corresponding balance change; the row must no longer be available for another posting.
- [x] **Match (synthetic):** Match a review row to an existing journal line for that bank account and amount. Expect a matched status with no additional journal or balance change.
- [x] **Invoice/bill payment allocation (synthetic):** Record payments using Receive Payments and Pay Bills, then import and match the bank rows to those existing entries. Matching and re-importing must leave the bank balance unchanged and must not duplicate the rows or postings.
- [x] **Transfer (synthetic):** Classify one side against the other bank account, then match the other side to that existing entry. Expect one transfer journal, not two postings.
- [x] **Persistence (posted/matched synthetic rows):** After saves finish, close and reopen Ledger in the same browser and origin. Expect posted/matched rows, statuses and balances to remain. Reimport the same file and expect duplicate protection to remain effective.
- [x] **Reconciliation (synthetic):** Use **Banking > Reconcile** with a known synthetic statement and appropriate opening balance. Expect reconciliation to remain a separate action; importing transaction history must not create an opening balance or mark a statement reconciled.
- [x] **Company isolation:** Confirm synthetic exercises did not change My Company. Keep actual bank records out of Synthetic Test Company.

The November 18 source fixes, automated regressions and November 19 owner-reported Chrome checks address the two earlier follow-ups: **Add to Ledger** and **Match** retain a nondefault bank account and show updated row status, and receivables/payables/inventory are absent from classification choices. The separate synthetic browser check also passed for invoice/bill payment allocation followed by matching and re-importing without reposting. A direct classification is not an allocated invoice/bill payment.

Record each result as **PASS**, **FAIL** or **NOT RUN**, with the test date, browser/version, company/account, scenario, expected result and actual result. Use synthetic or redacted row references when reporting failures; keep exported financial records and credentials out of shared notes. Leave unverified items unchecked.
