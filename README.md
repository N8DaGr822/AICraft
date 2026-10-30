# AICraft

A directory of free browser-based creative tools with a Blazor WebAssembly editor host and static discovery pages. Hosted on GitHub Pages at https://N8DaGr822.github.io/AICraft/ after deployment.

## First workflow

Choose a JPEG, PNG, or WebP; adjust exposure, saturation, hue, or grayscale; compare the original working copy with the edited output; download a PNG. Files remain in the browser. Each Apply processes the original working copy, so adjustments do not accumulate. Reset restores the original pixels.

For mobile memory limits, input files are limited to 20 MB and working copies to four megapixels / 2560 pixels per side. PNG exports use those working dimensions and do not preserve EXIF, original ICC profiles, or other source metadata. This is an 8-bit browser-decoded sRGB experiment, not the full PhotoCraft editor. Very large compressed images can still exceed a mobile browser's decode memory. The PDF lab provides page extraction and rotation; the vector lab creates and exports SVG shapes.

## Integration

`Home.razor` owns the controls and component lifetime. `photo-editor.js` owns file decoding, canvases, downloads, and one module worker. `photo-worker.js` calls the Rust WebAssembly module. Pixel buffers stay in JavaScript/Rust rather than crossing the .NET boundary. The Rust wrapper uses PhotoCraft's actual sRGB, HSB, and grayscale conversions, with our own operation sequencing and validation.

PhotoCraft is pinned to commit `c645d5fcc92c4bdd0d925084450699d05a184850`; Cargo.lock pins transitive dependencies. No upstream sources are modified.

## Build locally

Prerequisites: .NET 10 SDK, Rust 1.95.0, wasm32-unknown-unknown target, Node.js 22+ and Python 3. On Windows, Rust's MSVC host also requires Visual Studio C++ Build Tools (for dependency build scripts).

```sh
rustup toolchain install 1.95.0 --profile minimal --target wasm32-unknown-unknown
cargo +1.95.0 install wasm-bindgen-cli --version 0.2.104 --locked
cargo +1.95.0 test --locked --manifest-path rust/Cargo.toml
cargo +1.95.0 build --locked --manifest-path rust/Cargo.toml --release --target wasm32-unknown-unknown
wasm-bindgen rust/target/wasm32-unknown-unknown/release/aicraft_photo.wasm --target web --out-dir AITest/wwwroot/wasm --out-name aicraft_photo
node scripts/test-wasm.mjs
dotnet run --project AITest/AITest.csproj
```

The generated wasm directory must exist before `dotnet publish`. It is intentionally ignored in source control. No JavaScript fallback substitutes for a missing Rust module.

## GitHub Pages

In repository Settings > Pages, select **GitHub Actions** as the source. Push to `main` to build, test, and deploy. The workflow publishes under `/AICraft/`; update that base path if the repository name changes. The build generates physical `index.html` files for all registered editor routes and static discovery pages, so direct navigation and refresh return HTTP 200. The fallback `404.html` remains for unknown routes.

## Attribution

PhotoCraft and its photocraft-color / photocraft-cms crates are copyright ArtCraft Team and contributors, licensed MIT OR Apache-2.0. See `THIRD-PARTY-NOTICES.md` and the license copies in `AITest/wwwroot/licenses/`. Bootstrap retains its MIT license header in the distributed stylesheet.

## PDF lab

The `/pdf` page uses PdfCraft's real COS parser and page organization library, pinned to `c735fb7da55264e7cd84eed0688ec0cec5e628d4`. Its WebAssembly module loads only when the PDF lab opens. Select a PDF or use the bundled three-page sample, inspect page dimensions and rotations, then extract a range or ordered list (for example `3, 1-2`) with optional rotation. Download or open the new PDF using the browser's own viewer.

Files stay in the browser. Limits are 15 MB input, 200 pages, 20,000 objects, 30 MB output, and a 30-second worker deadline. These are practical lab limits, not a total parser-memory guarantee. Encrypted PDFs and signature fields are refused. Extraction copies selected pages, but accessibility tagging and some document-level features do not carry over; review exports before use. It is not a redaction tool. Restart PDF lab frees the document and allows retry after a worker failure. Leaving the page frees its worker and download URLs.

The PDF worker follows the photo worker's component-owned pattern without adding a shared abstraction. The photo processing module remains independent. The sidebar's starter Counter link now opens PDF lab; the Counter component remains in the source.

Build the PDF module before running/publishing Blazor:

```sh
cargo +1.95.0 test --locked --manifest-path rust-pdf/Cargo.toml
cargo +1.95.0 build --locked --manifest-path rust-pdf/Cargo.toml --release --target wasm32-unknown-unknown
wasm-bindgen rust-pdf/target/wasm32-unknown-unknown/release/aicraft_pdf.wasm --target web --out-dir AITest/wwwroot/wasm-pdf --out-name aicraft_pdf
node scripts/test-pdf-wasm.mjs
```

The PDF tests exercise page order, content retention, omitted-page removal, rotation, source preservation, and invalid inputs. The workflow retains the exported test PDF as an artifact for independent inspection. The sample fixture can be regenerated with `python scripts/create-pdf-fixture.py`.

## Vector lab

The `/vector` page uses VectorCraft's actual geometry generators and transforms, pinned to `98830e5dda1d89f94acfa56bd4eaa728a11a856d`. Create rectangles, rounded rectangles, ellipses, polygons, or stars; adjust dimensions, rotation, fill, and stroke; then download a transparent SVG. The bridge serializes the generated paths into SVG. It does not use the full VectorCraft editor or support SVG import/node editing.

Dimensions are 10–1000 SVG units, polygons/stars support 3–32 points, and export bounds include rotated geometry and stroke padding. Polygons and stars stretch to fit the requested dimensions. Settings changes invalidate the previous download until Generate SVG is selected. The module loads on navigation, runs in a worker with a 30-second deadline, and releases the worker and object URLs when leaving the page. The starter Weather navigation link now opens this lab; its component is retained.

```sh
cargo +1.95.0 test --locked --manifest-path rust-vector/Cargo.toml
cargo +1.95.0 build --locked --manifest-path rust-vector/Cargo.toml --release --target wasm32-unknown-unknown
wasm-bindgen rust-vector/target/wasm32-unknown-unknown/release/aicraft_vector.wasm --target web --out-dir AITest/wwwroot/wasm-vector --out-name aicraft_vector
node scripts/test-vector-wasm.mjs
```

Build all three modules before publishing. Run `python scripts/collect-licenses.py` to bundle dependency licenses. Native and compiled WASM tests cover shape families, rotation, bounds, and validation.


## App launcher and Ledger Reborn

`/apps/` lists the registered tools. `AITest/Apps/catalog.json` supplies discovery, launcher and sidebar metadata through `AppCatalog.cs`. The photo editor is now `/photo`; the root is the discovery homepage. Each Razor page owns its worker and runtime lifetime. New Rust tools register their page here and add their pinned crate build/test steps to the existing Pages workflow. Registration does not automatically port an upstream desktop application.

`/ledger` integrates the unmodified Ledger Reborn engine at `d7f6b8a1f4ad6c4ae8b10100d1c93cf15940c21d` through Pyodide `314.0.7`. The runtime loads from jsDelivr only when Open ledger is selected; Python sources ship with this site. No ledger data is uploaded. This first workflow creates customers and service invoices, records partial payments, shows current invoice balances and date-specific trial balance / year-to-date accrual profit, and exports SQLite backups. It does not port the upstream desktop UI, tax, payroll, inventory workflows, or backup restoration.

Ledger amounts cross the bridge as integer cents. An allowlisted Python adapter calls the engine; it cannot execute arbitrary Python supplied by the UI. A module worker serializes requests. A Web Lock allows one active ledger tab per origin. Committed SQLite snapshots are stored in IndexedDB before success is acknowledged. A failed storage write closes the worker; reopen to restore the last saved snapshot. A timeout may happen after a save, so check entries before retrying. Navigation terminates the worker and releases the lock. Browser storage can be evicted or cleared; download backups. Data is device/browser-specific and is not synchronized. Use synthetic data for this experimental integration.

The Pyodide test exercises a $100 invoice / $40 payment / $60 remaining balance, balanced journals, invalid payments, integer-cent validation, and SQLite reopening:

```sh
npm install --prefix .tools/pyodide pyodide@314.0.7 --no-audit --no-fund
node scripts/test-ledger-pyodide.mjs
```

## Remaining Craft browser apps

The launcher now registers WordCraft, GridCraft, DeckCraft, SoundCraft, FilmCraft, LightCraft, EffectCraft, DesignCraft, CADCraft, and FigCraft. `/craft/{app}` provides a short workflow guide, an automatically opened editor with a compact title, and an optional standalone editor. These are the official upstream WASM interfaces hosted inside Blazor, not reimplementations or claims of desktop parity. The sidebar stays available while editing. DeckCraft is displayed as PowerPCraft; its upstream release identity is unchanged.

`python scripts/install-craft-apps.py` installs the pinned releases into the ignored `AITest/wwwroot/craft` directory for development. CI installs into `publish/wwwroot/craft` after Blazor publishing, avoiding .NET repackaging of upstream bundles. `scripts/craft-releases.json` records version, download size, and SHA-256 from GitHub release asset metadata. Each download must match before extraction. The installer rejects traversal and symlinks, bounds unpacked size, and requires WASM plus upstream license/hosting notices. Bundles are about 450 MB total unpacked and stay out of Git. Only the app you launch downloads to your browser.

Versioned asset directories preserve relative paths, integrity metadata, worker/service-worker scope, and license files. Optional .br/.gz sidecars are omitted so the host controls HTTP compression; uncompressed assets remain unchanged. Updating an app requires changing its manifest pin and catalog version together; CI checks this. The common host replaces the iframe when its route changes, releasing the previous editor. No arbitrary URL can be embedded through the route.

Save/export within each app before leaving it; persistence is upstream-specific and browser-local. Embedded apps share this site's origin and are not a security boundary. No collaboration backend is deployed. DesignCraft startup was confirmed by the user. CADCraft graphics remain environment-dependent. EffectCraft uses a scoped WebGL bootstrap patch, with background workers and service-worker registration disabled; its demo renders in Chrome. The separate version-webgl directory prevents older service-worker caches from intercepting the patched entry point. The verified upstream WASM and license files are unchanged; this mode may reduce performance and GPU effects support. GPU, codec, clipboard, microphone, and storage support depend on the browser; camera/microphone permission is never granted automatically. Mobile layouts are supported by the host, but the upstream editors can need landscape/full-page space and have not been verified on physical phones. First load can be large, especially LightCraft. Full desktop feature parity is outside the scope of these labs.

Run `python scripts/test-craft-bundles.py` to check tamper rejection, archive traversal rejection, license retention, and catalog/version consistency.


## Expanded labs

Photo adds percentage-based cropping, horizontal/vertical flips, and quarter-turn rotations. Apply always starts from the original working copy: color adjustment, crop, flip, then clockwise rotation. Export dimensions follow the crop/rotation. Geometry runs in the existing worker; no extra image library is required.

PDF now displays the working document and exported result in an inline browser viewer, with a separate-tab link for browsers without embedded PDF support. Append document merges all pages through PdfCraft, keeping the combined working copy within 15 MB and 200 pages. Page selection/rotation applies when exporting; merging does not edit existing text or provide redaction.

Vector supports up to 50 editable shape layers with independent positions, geometry, fill, and stroke. Last layer draws on top; export bounds include all layers. Settings stay in the current component only; download before navigating away. Existing shapes remain visible while edits are pending.

Ledger has Overview, Invoices & payments, Bank, Accounts, and Reports sections. Bank and account registers use the original engine account-listing/general-ledger reports, respecting the selected report date. Invoice balances remain current. Backup controls live in Reports. There is no live bank connection or added posting behavior.

Additional checks: `node scripts/test-photo-geometry.mjs`, `node scripts/test-vector-scene.mjs`, plus the expanded PDF WASM and Ledger Pyodide tests.


## Discovery and launch preparation

`AITest/Apps/catalog.json` is the shared catalog. Preserve the existing route/version fields when updating entries; the bundle consistency test compares version pins with `scripts/craft-releases.json`. Add genuine DateAdded dates for new entries. Existing registration dates were recovered from the October 29, 2026 catalog commits; unknown dates may remain null; no popularity or ratings are fabricated.

`python scripts/prepare-pages.py publish/wwwroot /AICraft/` adjusts the base URL and runs `generate-discovery.py`. It creates the homepage, `/apps/`, fourteen `/applications/<slug>/` pages, about/contact/privacy/terms pages, sitemap, robots file and physical Blazor editor entry points. Run this once against fresh `dotnet publish` output, before installing the pinned Craft bundles as in CI. Discovery pages load no Blazor or editor engines. Their search/filter/sort enhancement is small vanilla JavaScript; all catalog links remain available without JavaScript. Development `dotnet run` provides the Blazor directory; use prepared publish output to preview the static pages.

Canonical URLs currently use `https://n8dagr822.github.io` plus the deployment base path. Change `ORIGIN` in the generator when moving hosts. On a GitHub project site, `/AICraft/robots.txt` is not the origin-level robots file used by crawlers: publish the desired rules at the user-site root if you control it. The sitemap itself is valid at `/AICraft/sitemap.xml`; submit that URL using a verified webmaster account. Editor shells are noindex; public landing pages carry canonical, description, Open Graph, Twitter summary and structured data. Social image artwork is not yet supplied.

Deployment: select GitHub Actions under repository Settings > Pages, review the changes, then push/merge to main. The existing workflow builds engines, runs tests, publishes Blazor, generates discovery pages, installs verified editor bundles and deploys. No deployment was triggered during this local implementation. Before promotion, test the deployed homepage, each landing page, editor launch and refresh, and upstream NOTICE URLs.

See `Docs/Launch/` for submission drafts, screenshot tasks, launch checklist and a proposed announcement schedule. Licensing, CAD startup, upstream privacy auditing and cross-browser/mobile validation remain launch review items. No platform-wide open-source claim is made.
