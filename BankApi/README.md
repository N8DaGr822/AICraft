# Connected bank feed deployment

The Ledger Bank section links to a separate Blazor frontend on the API hostname, which connects through Microsoft Entra sign-in and Plaid Link. This ASP.NET Core API runs in Azure App Service and stores imported feed data in Azure SQL. The existing local SQLite ledger stays on the device; importing bank data does not create journals, pay invoices, or move money. Sync is manual, not a scheduled or real-time feed.

CommunityAmerica Credit Union, USA is the intended institution. Production credentials were validated and Transactions support was confirmed for institution `ins_110000` (membership before August 3, 2026). Live user authorization and transaction sync still require end-to-end verification. Enter bank credentials only in the provider/bank authorization flow.

## Azure resources and identity

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

Provisioning started on October 30, 2026 in the personal BodyBalance subscription:

| Resource | Configuration |
| --- | --- |
| API host | `aicraft-bank-api`, resource group `AICraft`, Linux .NET 10, West US 2 |
| App Service plan | `ASP-AICraft-9984`, Free F1 |
| API URL | `https://aicraft-bank-api-gwbweufeehdwg5hz.westus2-01.azurewebsites.net` |
| SQL database | `aicraft-bank` on existing server `body-balance`, resource group `BodyBalance` |
| SQL free offer | 32 GB, serverless; overage billing disabled, pause when the free allowance is exhausted |

The production Plaid credential and institution coverage check succeeded, and the Sandbox feed was removed. The secure bank client is registered separately from the old Pages client. Live bank sign-in and transaction retrieval have not yet been verified.

Security controls include a 16 KB request-body limit, a per-owner 60-request/minute limit (in-process, not a distributed denial-of-service defense), bounded transaction paging, no-store responses, anti-framing headers, and a restrictive CSP with a hash for Blazor's generated import map. Keep the client and API artifacts together: the CSP hash is calculated at startup, so restart after updating the frontend.

Remaining deployment limitations: secrets currently live in encrypted App Service settings, not Key Vault; the existing shared SQL server permits Azure services and has public firewall rules used by BodyBalance. Do not remove those shared rules without verifying BodyBalance connectivity. Private networking may require paid tiers. SQL backups retain deleted data until retention expires. Free-tier cold starts/suspension remain possible. The SQL connection timeout is 60 seconds to allow serverless resume.

The GitHub Pages editors still share local browser storage with one another. Moving banking isolates live bank sessions but does not isolate local tax returns or bookkeeping from other editors. A separate origin for sensitive local tools remains recommended. Pinned upstream artifacts and dependency scans do not constitute a complete audit of all third-party source or compiled code.

## Acceptance before real use

1. In Sandbox, connect a test bank, sync, select an account, and verify amount signs/currencies and pending status. Initial history may take time. Repeated sync must not duplicate transaction IDs.
2. Verify additions, modifications, removals, disconnect, reauthorization and OAuth return. A failed page restarts from the original cursor; no partial page set is saved.
3. With Azure SQL, run simultaneous syncs and verify one complete update or a conflict/retry response. Unit tests use EF's in-memory provider and do not prove SQL rowversion/concurrency behavior.
4. Verify a second tenant user cannot read, sync, reconnect, or delete the first user's connection; unauthenticated callers receive 401 and missing scope/unapproved users receive 403.
5. Confirm actual CommunityAmerica coverage and complete production onboarding before changing to production. Azure SQL integration has been tested with Sandbox data. Live bank sign-in and production OAuth have not been tested.

Provider references: [Plaid Transactions](https://plaid.com/docs/transactions/add-to-app/), [sync semantics](https://plaid.com/docs/transactions/sync-migration/), [institution coverage](https://plaid.com/docs/institutions/), [Microsoft SPA authentication](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-overview).
