# Launch checklist and prioritized follow-up

Updated November 19, 2026. Open items below are pending verification, not a list of newly reproduced defects. The [October 30 implementation report](implementation-report.md) is historical. Current deployment evidence and the subsequent local content/asset review are recorded separately below. Bank/Ledger local test results and owner testing steps are recorded in the [bank guide](../../BankApi/README.md#local-verification-recorded-november-11-2026).

November 19 update: selected-bank retention and classification restrictions shipped in `1ec6b01` with passing automated regressions, independent QA and a clean Release build. The owner reported PASS for all nine synthetic Chrome acceptance checks, including posting, matching, duplicate protection, browser reopening, reconciliation and company isolation. The owner subsequently reported PASS for the live bank export/import/re-import check on that deployment. See the [Chrome acceptance record](../../BankApi/README.md#chrome-browser-acceptance-recorded-november-19-2026) and deployed acceptance below.

The owner also reported PASS for the separate [synthetic browser payment check](../../BankApi/README.md#chrome-payment-acceptance-recorded-november-19-2026): invoice #7 received $11.17, bill #9 was paid $12.19, and both imported rows matched existing entries without changing the $15,415.98 post-payment bank balance. Re-importing retained exactly two matched rows; My Company was unchanged.

## Before public promotion

- [x] Review the 15 catalog entries and correct descriptions, access and data-handling disclosures against the repository implementation.
- [ ] Execute the remaining described workflows in the deployed editors; this content pass did not test every editor.
- [x] Retain CADCraft's experimental status and unverified graphics-startup limitation.
- [x] Choose and add the license locally: MIT, copyright 2026 Nathen Lentz, approved by the owner.
- [ ] Publish the revised disclosures and notices from this local content pass; the existing deployed license and notices are reachable.
- [ ] Resolve the open items in licensing-risk-review.md (ownership, brand treatment, dependency scope and privacy).
- [ ] Review Privacy and Terms disclosures for the actual operator and deployed upstream network behavior.
- [x] Confirm CI and production deployment for revision 1ec6b01; see the deployed acceptance record below.
- [ ] Complete direct-route and refresh smoke checks for the remaining deployed editors; Chrome coverage below is limited.
- [x] Verify the 15 catalog license/NOTICE URLs, AICraft license, public source index, Tax corresponding-source URL, four policy pages, and GitHub feedback/notices links: all 24 returned HTTP 200 on November 19.
- [ ] Complete deployed PDF append and export in Chrome and test other editor export/import flows using representative non-sensitive files.
- [x] Complete local synthetic Ledger browser acceptance: nine checks passed in Chrome, reported by the owner on November 19; see the [acceptance record](../../BankApi/README.md#chrome-browser-acceptance-recorded-november-19-2026).
- [x] Complete the separate synthetic browser invoice/bill payment check: allocation, matching and repeat import passed in Chrome, reported by the owner on November 19.
- [x] Complete live bank export, import and re-import checks on this deployment using the [Ledger bank-import browser checklist](../../BankApi/README.md#manual-test-checklist). PASS reported by the owner; see the deployed acceptance record below.
- [ ] Test Chrome, Edge, Firefox and Safari; check keyboard access and physical phones.
- [x] Capture the core screenshot pack and social artwork; captions and limits are in the [screenshot checklist](08-screenshot-checklist.md).
- [ ] Complete physical-phone layout and both-theme contrast checks; a narrow Chrome capture is available.
- [ ] Validate structured data with a search-engine validator and submit the sitemap through a verified webmaster account.
- [ ] Recheck submission rules on each promotional platform.

## Local release verification — November 19, 2026

Before publication, the local diff review found no blocking defect in the Ledger changes. The bank UI regression and corresponding workflow change were subsequently included in the deployed revision below. Pushes to `main` trigger the Pages build and automatic deployment after a successful build; pull-request runs do not deploy.

| Check run against the working tree based on `1f4cf82` | Result |
| --- | --- |
| `node scripts/test-ledger-bank-ui.mjs` | PASS; simulated DOM regression, not browser automation. |
| `node scripts/test-ledger-pyodide.mjs` | PASS; import, classification restrictions, payment allocation, matching, reports and company isolation. |
| `node --experimental-vm-modules scripts/test-bank-feed.mjs` | PASS; mocked bank browser adapter. |
| `dotnet run --project BankApi.Tests/BankApi.Tests.csproj -c Release --no-restore` | PASS; sync/encryption, authorization and real JWT-handler checks. Azure SQL concurrency remains unverified. |
| `dotnet build AITest/AITest.csproj -c Release --no-restore` | PASS; zero warnings/errors. |
| `node scripts/test-pdf-wasm.mjs` | FAIL; existing generated module still reports `TypeError: source.merge is not a function`. |
| `cargo +1.95.0 build --locked --offline --manifest-path rust-pdf/Cargo.toml --release --target wasm32-unknown-unknown` | BLOCKED; build failed because the Windows MSVC linker `link.exe` is missing. Used the repository-local Rust 1.95.0 toolchain/cache. |
| `git diff --check` | PASS. |

In that local check, Rust source exposed `merge`, but fresh PDF WASM bindings could not be regenerated. The required `wasm-bindgen` executable was unavailable locally. The deployment below verifies the fresh CI build without changing the status of the stale local artifact.

## Deployed acceptance - November 19, 2026

GitHub Pages production deployment [44576900529](https://github.com/N8DaGr822/AICraft/actions/runs/44576900529) passed for commit [1ec6b01](https://github.com/N8DaGr822/AICraft/commit/1ec6b01cb5fcabfe2180de75b10dacf20787e52e). The workflow compiled fresh PDF WASM and passed synthetic extraction, merge and output verification, plus the bank adapter, new Ledger bank UI regression, and Pyodide tests.

| Check | Observed result |
| --- | --- |
| Public homepage | PASS in Chrome: the catalog rendered with 15 items. |
| Ledger launcher and wrapper | PASS for navigation: homepage card to application details to the deployed `/ledger/` shell. The embedded editor reported the expected second-tab lock because the standalone editor was already open; wrapper editor startup was not independently verified. |
| Ledger standalone and refresh | PASS in Chrome: the versioned standalone URL opened directly. The synthetic company opened and its home screen returned after refresh. |
| Ledger SQLite backup | PASS: a fresh company backup was downloaded and verified locally; restore was not tested. |
| PDF Lab route and sample | PASS in Chrome: direct navigation and refresh loaded the lab, and the bundled sample opened with three pages. |
| PDF page generation in Chrome | PASS during screenshot capture: selected pages `3, 1` from the bundled three-page sample and generated a two-page output preview in that order. Downloading/reopening and append were not checked during this capture. The earlier append attempt stopped at the Windows file picker; synthetic CI merge/export tests passed separately. |
| Live bank export/import and duplicate protection | PASS reported by the owner on this deployment after following the live checklist: export posted transactions, stage them in the intended ledger account, verify the signs, amounts, dates and descriptions, then re-import the same file without adding rows or changing the ledger balance. Not independently verified by the assistant. |

## Local content and asset review - November 19, 2026

The About, Contact, Privacy and Terms pages now explain the directory's role, upstream attribution, local storage and backups, and the separate optional bank service. Catalog copy and launch drafts distinguish the full PhotoCraft editor from the basic worker lab and distinguish local Ledger/Tax data from connected-bank data. The source index includes the local upstream notice paths and Ledger/Pyodide references. At the time of this review, these changes had not yet been committed or deployed.

| Check | Result |
| --- | --- |
| Release build | PASS: `dotnet build AITest/AITest.csproj -c Release --no-restore`, zero warnings/errors. |
| Discovery and bundle regressions | PASS: 3 discovery tests and 5 bundle tests, running the original Python test files through the existing Pyodide runtime. Native Python was unavailable on this Windows machine. |
| Independent content QA | PASS after correcting the MSAL hosting disclosure: the bank site bundles the Microsoft sign-in library; Ledger's Pyodide runtime still loads from jsDelivr. |
| Catalog compatibility | PASS: all 15 entries retain their identity, routes, versions, dates and license/source URL fields. |
| Page layout | PASS for the reviewed local Privacy page at desktop width, About at 390 CSS pixels, and Photo lab detail page. This is not a complete browser/accessibility audit. |
| Images | Seven real page captures and SVG/PNG social artwork visually reviewed; captions identify the local draft and the exact workflows shown. SVG structure and text contrast checks passed. |
| Whitespace | `git diff --check` passed. |

The factual disclosure pass does not complete the ownership/brand review or the upstream runtime network audit. Platform submission rules, search-engine validation and the broader device matrix remain separate follow-up work. No catalog image rendering or social metadata integration was added.

## Next

- [ ] Record genuine DateAdded values for future apps; the initial catalog registration dates were recovered from repository history.
- [ ] Measure transferred bytes and real-device load times, especially LightCraft.
- [ ] Audit upstream storage/network behavior and document per-app findings.
- [x] Add reviewed screenshots and social preview artwork to the launch pack.
- [ ] Add privacy-conscious usage measurement only after an explicit design decision; do not show popularity without data.

No submissions, external accounts or scheduled posts are created by this work.

## Licensing review evidence — October 30, 2026
Technical review completed in licensing-risk-review.md; supporting hashes and source checks are in license-inventory.json. Ten pinned release archives and 33 distinct acadrust/Symphonia source packages matched their recorded checksums. This is not legal clearance; promotional release remains pending the unresolved review items.
