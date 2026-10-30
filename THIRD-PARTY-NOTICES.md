# Third-party notices

Original AICraft host and integration code is copyright (c) 2026 Nathen Lentz, licensed under MIT (see LICENSE). This grant does not relicense third-party code, fonts, trademarks or other assets. Their existing licenses and notices remain applicable.

This application uses unmodified PhotoCraft Rust crates from https://github.com/storytold/photocraft at c645d5fcc92c4bdd0d925084450699d05a184850.

The photo bridge depends on photocraft-color and photocraft-cms. Their MIT and Apache-2.0 license texts and upstream NOTICE are distributed in AITest/wwwroot/licenses/. These dependencies are used under the MIT license; the Apache license is also retained for reference. Other transitive Rust dependencies are documented in Cargo.lock; their notices are generated into the deployed licenses directory by the build workflow.

Bootstrap is copyright The Bootstrap Authors, licensed MIT; its stylesheet retains the upstream license header.

PdfCraft is used at revision c735fb7da55264e7cd84eed0688ec0cec5e628d4 from https://github.com/storytold/pdfcraft. The pdfcraft-cos, pdfcraft-organize, pdfcraft-content, pdfcraft-filters, and pdfcraft-crypt crates are used under the MIT license; the upstream license texts and NOTICE are distributed in AITest/wwwroot/licenses/PdfCraft-*.txt. The patched Hayro syntax and JBIG2 crates retain their own license files in the generated dependency notices. The PDF module has its own rust-pdf/Cargo.lock.

VectorCraft geometry is used unmodified at revision 98830e5dda1d89f94acfa56bd4eaa728a11a856d from https://github.com/storytold/vectorcraft under the MIT license. Upstream license texts and NOTICE are distributed in AITest/wwwroot/licenses/VectorCraft-*.txt. The vector module has its own rust-vector/Cargo.lock.

Ledger Reborn's unmodified ledger.py is vendored from https://github.com/lxistired/ledger-reborn at d7f6b8a1f4ad6c4ae8b10100d1c93cf15940c21d under MIT; see AITest/wwwroot/licenses/LedgerReborn-LICENSE.txt. ledger_bridge.py is this application's integration adapter. Pyodide 314.0.7 is loaded from its official jsDelivr distribution, with its bundled Python and third-party license notices: https://cdn.jsdelivr.net/pyodide/v314.0.7/full/ .

The ten additional Craft editors are official, checksum-pinned Storytold WebAssembly release bundles. Versions and hashes are recorded in scripts/craft-releases.json. Each deployed craft/<app>/<version>/ directory preserves the uncompressed assets and license material from its upstream web archive, including LICENSE-MIT, LICENSE-APACHE, NOTICE, HOSTING.md, and any bundled third-party notices. AICraft provides the Blazor host and does not claim authorship or endorsement of the upstream editors. Upstream WASM payloads, generated JavaScript and integrity metadata are preserved. AICraft modifies EffectCraft’s index.html bootstrap to prefer WebGL and supplies noworkers/nosw flags; that change is identified in the file.


CADCraft 0.14.0 includes the MPL-2.0 acadrust DWG library. The retained upstream NOTICE identifies source at https://github.com/hakanaktt/acadrust and crates.io. CADCraft branding has separate terms; no upstream logo rights are granted by AICraft’s MIT license.

See AITest/wwwroot/licenses/AICraft-THIRD-PARTY-SOURCES.txt for version-specific source and brand references. The release lockfiles also identify MPL-2.0 Symphonia dependencies in the media-related applications; source-package checks are recorded in Docs/Launch/license-inventory.json. Lockfile presence alone does not prove a package is compiled into a particular web release.

LightCraft’s NOTICE distinguishes Apache-only segmentation code, optional separately downloaded model weights, GeoNames data, fonts and branding from its MIT/Apache application code. Those separate terms are not replaced by AICraft’s MIT license.
