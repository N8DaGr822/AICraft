# Implementation report — October 30, 2026

## Assessment
The existing project uses .NET 10 Blazor WebAssembly, three Rust WASM labs, a Python/Pyodide ledger and ten pinned upstream editors. GitHub Actions deploys it to GitHub Pages. The checkout was clean before editing. The published site could not be read through the web tool; assessment used source and local previews.

The root previously opened Photo lab. Registered routes relied on a fallback returning HTTP 404. The catalog had basic launcher metadata but no discovery content. No equivalent landing-page pattern existed. This change extends the existing catalog and Python deployment tooling without changing editor processing or introducing a framework.

## Changes and rationale
| File | Change and purpose |
| --- | --- |
| AITest/Apps/catalog.json (new) | Shared descriptions, categories, features, limits, licenses, access, sources and dates. Registration dates come from October 29 repository history. |
| AITest/Apps/AppCatalog.cs | Loads embedded JSON while preserving runtime fields used by navigation and Craft pages. |
| AITest/AITest.csproj | Embeds the catalog to avoid a network fetch. |
| AITest/Pages/Apps.razor | Root and directory UI: branding, featured/recent cards, populated categories, search, sorting and filtering. |
| AITest/Pages/Home.razor | Changes only the photo route to /photo; editor logic is unchanged. |
| AITest/Layout/MainLayout.razor | Current-route skip link and informational footer; links to static pages force full navigation. |
| AITest/wwwroot/css/discovery.css (new) | Scoped responsive layout, focus indicators and system light/dark theme. |
| AITest/wwwroot/js/discovery.js (new) | Small deferred directory filter/sort enhancement and accessible results messages. |
| AITest/wwwroot/index.html | Includes discovery styling in Blazor. |
| scripts/generate-discovery.py (new) | Generates homepage, directory, 14 landing pages, four informational pages, sitemap, robots file and physical editor shells. |
| scripts/prepare-pages.py | Invokes generation after base-path preparation; unknown-route fallback is noindex. |
| scripts/test-discovery.py (new) | Tests all catalog entries, metadata, sitemap targets and editor isolation at project and root base paths. |
| scripts/test-craft-bundles.py | Reads version pins from JSON, preserving existing archive checks. |
| .github/workflows/pages.yml | Runs discovery tests before generating Pages output. |
| README.md | Documents routing, catalog maintenance, preview and deployment. |
| Docs/Launch/01–10 (new) | Ten requested product/submission drafts, screenshot and launch checklists, proposed schedule. |

Static pages load no Blazor or editor engines. Catalog links remain usable without JavaScript. Application pages have unique titles/descriptions, canonical URLs, Open Graph, Twitter summary cards and SoftwareApplication structured data without invented ratings. Text workflow previews are explicitly labeled; editor screenshots and social artwork remain to be supplied. No platform-wide open-source or blanket privacy claim is made.

## Phase verification
Assessment identified fourteen applications and preserved their runtime ownership. Discovery passed Debug compilation. Landing-page tests cover all entries and both hosting bases. Release publication completed, and the published photo editor reached Ready in the browser. Launch materials were written locally; no submissions, publishing, pushes or scheduling occurred.

Passed: final Debug build with zero warnings/errors; Release publish before final copy/date/skip-link refinements; final generator tests; four bundle tests; photo geometry; vector scene; photo WASM; vector WASM; ledger Pyodide. Final C# and catalog refinements passed another Debug build. Fresh CI Release validation is required before deployment.

Browser checks covered dark-theme layout at the preview pane width, comparable-product search, no-results feedback, category selection, landing-page refresh, published photo startup, Blazor directory navigation and navigation back to a static page. Generated landing-page local targets, including installed notices, had no missing files. This is not a full browser, keyboard or physical-phone audit.

The existing PDF WASM test failed: `TypeError: source.merge is not a function`. Rust source already defines merge, but the ignored local generated module is stale. The local wasm-bindgen executable/build output needed to refresh it was unavailable. No PDF processing code changed. CI rebuilds this module before testing; confirm that clean run passes.

## Prioritized remaining work
1. Run clean CI, verify PDF merge tests, and exercise all fourteen deployed launch/export workflows.
2. Resolve CADCraft graphics startup or retain its experimental warning. Validate Firefox, Safari and physical phones as well as Chromium.
3. Choose an AICraft repository license if open-source distribution is intended. Upstream licenses do not license the host.
4. Audit upstream network/storage behavior and review operator-specific Privacy/Terms details.
5. Capture real screenshots and social artwork. PreviewImage remains reserved, null metadata.
6. Measure real-device loading, especially large editor bundles, and validate structured data externally. No numeric speedup or search ranking is claimed.
7. Review current posting rules and drafts before making any launch submissions.

## GitHub Pages deployment
Select GitHub Actions under Settings > Pages. After reviewing changes, push/merge to main. Existing CI builds engines, tests, publishes Blazor, prepares pages, installs verified bundles and deploys. Keep /AICraft/ as the base unless the repository path changes. Update ORIGIN in the generator when moving domains. Run preparation once against fresh publish output.

Public routes: /AICraft/, /AICraft/apps/, /AICraft/applications/<slug>/. Photo is now /AICraft/photo/; other app routes are retained. Sitemap: /AICraft/sitemap.xml. A project-level robots.txt is not the domain-root robots file crawlers consult; arrange root rules through the user-site repository if needed. Submit the sitemap using a verified webmaster account.

The ordinary dotnet development server provides the Blazor directory; preview prepared publish output for the static landing pages. Promotional materials and prioritized launch checks are in this directory. Nothing has been deployed by this change.
