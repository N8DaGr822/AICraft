# Launch checklist and prioritized follow-up

Documentation reviewed November 11, 2026. Open items below are pending verification, not a list of newly reproduced defects. The [October 30 implementation report](implementation-report.md) is historical; this review did not rerun full-app CI or verify the deployed site. Bank/Ledger local test results and owner testing steps are recorded in the [bank guide](../../BankApi/README.md#local-verification-recorded-november-11-2026).

November 19 update: selected-bank retention and classification restrictions are fixed locally with passing automated regressions, independent QA and a clean Release build. The owner reported PASS for all nine synthetic Chrome acceptance checks, including posting, matching, duplicate protection, browser reopening, reconciliation and company isolation. Live bank export and deployed-service verification remain open. See the [Chrome acceptance record](../../BankApi/README.md#chrome-browser-acceptance-recorded-november-19-2026).

The owner also reported PASS for the separate [synthetic browser payment check](../../BankApi/README.md#chrome-payment-acceptance-recorded-november-19-2026): invoice #7 received $11.17, bill #9 was paid $12.19, and both imported rows matched existing entries without changing the $15,415.98 post-payment bank balance. Re-importing retained exactly two matched rows; My Company was unchanged.

## Before public promotion
- [ ] Review all app descriptions and execute the described workflow in the deployed version.
- [ ] Resolve CADCraft startup or clearly retain its experimental status.
- [x] Choose and add the license locally: MIT, copyright 2026 Nathen Lentz, approved by the owner.
- [ ] Publish the reviewed license and notices with the release.
- [ ] Resolve the open items in licensing-risk-review.md (ownership, brand treatment, dependency scope and privacy).
- [ ] Review Privacy and Terms disclosures for the actual operator and deployed upstream network behavior.
- [ ] Run CI, confirm deployment, and test direct landing/editor routes and refresh.
- [ ] Verify all deployed license/NOTICE links and feedback links.
- [ ] Test export/import using representative non-sensitive files.
- [x] Complete local synthetic Ledger browser acceptance: nine checks passed in Chrome, reported by the owner on November 19; see the [acceptance record](../../BankApi/README.md#chrome-browser-acceptance-recorded-november-19-2026).
- [x] Complete the separate synthetic browser invoice/bill payment check: allocation, matching and repeat import passed in Chrome, reported by the owner on November 19.
- [ ] Complete the remaining live bank-export and deployed-service checks in the [Ledger bank-import browser checklist](../../BankApi/README.md#manual-test-checklist). Synthetic Chrome results do not verify the production bank-to-ledger workflow.
- [ ] Test Chrome, Edge, Firefox and Safari; check keyboard access and physical phones.
- [ ] Capture real screenshots; verify small-screen layout and contrast in both themes.
- [ ] Validate structured data with a search-engine validator and submit the sitemap through a verified webmaster account.
- [ ] Recheck submission rules on each promotional platform.

## Local release verification — November 19, 2026

The agent could access the checkout and reviewed the pending diff; no blocking defect was found in the Ledger changes reviewed. The existing uncommitted `.github/workflows/pages.yml` change already runs `node scripts/test-ledger-bank-ui.mjs`; the script is still untracked and must be included with that workflow change in a future commit. The committed workflow lacks this step. Pushes to `main` trigger the Pages build and automatic deployment after a successful build; pull-request runs do not deploy.

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

Rust source exposes `merge`, but a fresh PDF WASM build and regenerated bindings have not been verified. The required `wasm-bindgen` executable is also unavailable locally. Full CI, deployment and current deployed-service checks were not run. Release readiness remains open; no changes were committed, pushed or deployed during this verification.

## Next
- [ ] Record genuine DateAdded values for future apps; the initial catalog registration dates were recovered from repository history.
- [ ] Measure transferred bytes and real-device load times, especially LightCraft.
- [ ] Audit upstream storage/network behavior and document per-app findings.
- [ ] Add reviewed screenshots and social preview artwork.
- [ ] Add privacy-conscious usage measurement only after an explicit design decision; do not show popularity without data.

No submissions, external accounts or scheduled posts are created by this work.

## Licensing review evidence — October 30, 2026
Technical review completed in licensing-risk-review.md; supporting hashes and source checks are in license-inventory.json. Ten pinned release archives and 33 distinct acadrust/Symphonia source packages matched their recorded checksums. This is not legal clearance; promotional release remains pending the unresolved review items.
