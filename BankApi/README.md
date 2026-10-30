# Connected bank feed deployment

The Blazor Bank section connects through Microsoft Entra sign-in and Plaid Link. This ASP.NET Core API runs in Azure App Service and stores imported feed data in Azure SQL. The existing local SQLite ledger stays on the device; importing bank data does not create journals, pay invoices, or move money. Sync is manual, not a scheduled or real-time feed.

CommunityAmerica Credit Union, USA is the intended institution. Its live Transactions availability has **not** been confirmed. Search for CommunityAmerica in Plaid's production institution coverage explorer/dashboard before purchasing access. Sandbox testing does not verify real-bank coverage. Plaid credentials and production approval are required for a real connection. Do not put bank usernames/passwords in this app.

## Azure resources and identity

1. Create a dedicated Azure SQL database and an ASP.NET Core .NET 10 App Service with HTTPS Only enabled. Use the latest patched .NET 10 runtime. Enable the App Service system-assigned managed identity. Configure SQL networking to permit the App Service (prefer VNet integration/private endpoint).
2. Run `schema.sql` once as a database administrator. Create a contained SQL user for the managed identity and grant SELECT/INSERT/UPDATE/DELETE on `dbo.BankConnections` and `dbo.BankTransactions`; runtime schema-owner rights are not needed. Configure `ConnectionStrings__Bank` as `Server=tcp:<server>.database.windows.net,1433;Database=<database>;Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False;Connect Timeout=60;`.
3. Create a single-tenant Entra API application registration. Expose delegated scope `api://<api-client-id>/access_as_user`; set the API application's `api.requestedAccessTokenVersion` to `2`. Configure `Authentication__Authority=https://login.microsoftonline.com/<tenant-id>/v2.0` and `Authentication__Audience=<api-client-id>`.
4. Create a single-tenant SPA registration. Add the delegated API permission above and grant the necessary consent. Register `https://n8dagr822.github.io/AICraft/bank-auth.html` as a **Single-page application** redirect URI. For local testing also register `http://localhost:5187/bank-auth.html`. There is no SPA client secret.
5. Set `Authentication__AllowedObjectIds__0` to your user object ID in that tenant. An empty allowlist denies access. Additional users need separate numbered entries; each can see only their own records. Personal Microsoft accounts require a guest identity in the configured tenant.

## Server configuration

Use App Service configuration/environment variables. Keep secrets in Azure Key Vault, referenced from App Service settings. Grant the App Service identity access to the referenced secrets.

| Setting | Value |
| --- | --- |
| `ConnectionStrings__Bank` | Managed-identity SQL connection string above |
| `Authentication__Authority` | Tenant-specific v2 issuer URL |
| `Authentication__Audience` | API application client ID |
| `Authentication__AllowedObjectIds__0` | Authorized tenant user object ID |
| `AllowedOrigins__0` | `https://n8dagr822.github.io` (origin only; preserve actual origin casing) |
| `Bank__EncryptionKey` | Key Vault reference to a base64-encoded cryptographically random 32-byte key |
| `Plaid__Environment` | `sandbox` initially; `production` only after approval |
| `Plaid__ClientId` | Plaid client ID |
| `Plaid__Secret` | Key Vault reference to the environment's Plaid secret |
| `Plaid__RedirectUri` | `https://n8dagr822.github.io/AICraft/ledger/`, registered with Plaid for OAuth |

Generate the encryption key securely and retain it in Key Vault. Losing or replacing it makes stored bank tokens unreadable; rotation requires re-encryption or disconnect/reconnect. Never commit it. Azure SQL stores encrypted access tokens, but account metadata and transaction data are ordinary SQL rows protected by database access controls and Azure encryption. Configure SQL backup retention to suit financial-data requirements; disconnect deletes live rows, not historical Azure backups. Disable request/response-body capture in monitoring, and never log Authorization headers or Plaid request payloads.

## Frontend configuration

Update `AITest/wwwroot/bank-config.json` with public values, then publish the frontend:

```json
{
  "apiUrl": "https://<app-service>.azurewebsites.net/",
  "clientId": "<spa-client-id>",
  "authority": "https://login.microsoftonline.com/<tenant-id>",
  "scope": "api://<api-client-id>/access_as_user"
}
```

The Microsoft browser authentication module is pinned to MSAL 3.28.1 and loaded from jsDelivr when configured. Plaid Link loads from Plaid only when connecting. Entra session tokens use session storage. Do not place any SQL password, Plaid secret, encryption key, or bank access token in frontend configuration. Embedded upstream editors share this origin; use a dedicated frontend origin for financial use if untrusted editors will be hosted alongside it.

OAuth bank redirects return to Ledger. Open **Bank**, sign in again if necessary, and select **Connect bank / resume authorization** to finish the pending Link session. Reconnect starts Plaid update mode for an expired connection. Sign out clears this application's cached sign-in data, not the global Microsoft SSO session.

## Build, test and deploy

From the repository root:

```powershell
dotnet run --project BankApi.Tests/BankApi.Tests.csproj
dotnet publish BankApi/BankApi.csproj -c Release -o publish/bank-api
Compress-Archive -Path publish/bank-api/* -DestinationPath publish/bank-api.zip -Force
az webapp deploy --resource-group <resource-group> --name <app-service> --src-path publish/bank-api.zip --type zip
```

App Service authentication must allow requests through to ASP.NET Core JWT validation (do not substitute an Easy Auth login redirect for API bearer-token validation). The API still requires valid issuer, audience, delegated scope and allowlisted user. Configure CORS in the API; avoid adding conflicting App Service CORS rules. `/health` only checks that the process started, not SQL/Plaid availability.

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

The API package is deployed and `/health` returns HTTP 200. Anonymous bank requests return HTTP 401, and the configured local frontend passes CORS preflight. The SQL schema and managed identity's SELECT/INSERT/UPDATE/DELETE permissions on the two bank tables were applied successfully. Microsoft sign-in and the authenticated connections query succeeded in the local browser. The API allowlist contains only the owner's tenant object ID. The initial SQL connection timed out at the default 15-second limit; the deployment now uses a 60-second connection timeout to allow more time for serverless resume. The local browser completed Sandbox OAuth linking, token exchange, SQL persistence, and transaction sync. Checking displayed 18 USD test transactions, including positive outflows and negative inflows; a second sync retained 18 rows without duplicates or UI errors.

The local frontend configuration now contains the public API/SPA registration values; it has not been published to GitHub Pages. The Sandbox secret is saved in App Service settings, and its credentials were validated against Plaid's Sandbox institutions endpoint. Plaid Link loaded successfully and the user completed the test-bank authorization for checking and savings. This development deployment stores its generated encryption key in App Service settings; migrate secrets to Key Vault before real financial use. The Sandbox OAuth redirect is empty until a redirect is registered with Plaid. Free-tier suspension and cold starts are expected during development. Do not enable paid overages without reviewing costs.

## Acceptance before real use

1. In Sandbox, connect a test bank, sync, select an account, and verify amount signs/currencies and pending status. Initial history may take time. Repeated sync must not duplicate transaction IDs.
2. Verify additions, modifications, removals, disconnect, reauthorization and OAuth return. A failed page restarts from the original cursor; no partial page set is saved.
3. With Azure SQL, run simultaneous syncs and verify one complete update or a conflict/retry response. Unit tests use EF's in-memory provider and do not prove SQL rowversion/concurrency behavior.
4. Verify a second tenant user cannot read, sync, reconnect, or delete the first user's connection; unauthenticated callers receive 401 and missing scope/unapproved users receive 403.
5. Confirm actual CommunityAmerica coverage and complete production onboarding before changing to production. Azure SQL integration has been tested with Sandbox data. Live bank sign-in and production OAuth have not been tested.

Provider references: [Plaid Transactions](https://plaid.com/docs/transactions/add-to-app/), [sync semantics](https://plaid.com/docs/transactions/sync-migration/), [institution coverage](https://plaid.com/docs/institutions/), [Microsoft SPA authentication](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-overview).
