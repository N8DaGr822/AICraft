# Third-party notices

This application uses unmodified PhotoCraft Rust crates from https://github.com/storytold/photocraft at c645d5fcc92c4bdd0d925084450699d05a184850.

The photo bridge depends on photocraft-color and photocraft-cms. Their MIT and Apache-2.0 license texts and upstream NOTICE are distributed in AITest/wwwroot/licenses/. These dependencies are used under the MIT license; the Apache license is also retained for reference. Other transitive Rust dependencies are documented in Cargo.lock; their notices are generated into the deployed licenses directory by the build workflow.

Bootstrap is copyright The Bootstrap Authors, licensed MIT; its stylesheet retains the upstream license header.

PdfCraft is used at revision c735fb7da55264e7cd84eed0688ec0cec5e628d4 from https://github.com/storytold/pdfcraft. The pdfcraft-cos, pdfcraft-organize, pdfcraft-content, pdfcraft-filters, and pdfcraft-crypt crates are used under the MIT license; the upstream license texts and NOTICE are distributed in AITest/wwwroot/licenses/PdfCraft-*.txt. The patched Hayro syntax and JBIG2 crates retain their own license files in the generated dependency notices. The PDF module has its own rust-pdf/Cargo.lock.

VectorCraft geometry is used unmodified at revision 98830e5dda1d89f94acfa56bd4eaa728a11a856d from https://github.com/storytold/vectorcraft under the MIT license. Upstream license texts and NOTICE are distributed in AITest/wwwroot/licenses/VectorCraft-*.txt. The vector module has its own rust-vector/Cargo.lock.

Ledger Reborn's unmodified ledger.py is vendored from https://github.com/lxistired/ledger-reborn at d7f6b8a1f4ad6c4ae8b10100d1c93cf15940c21d under MIT; see AITest/wwwroot/licenses/LedgerReborn-LICENSE.txt. ledger_bridge.py is this application's integration adapter. Pyodide 314.0.7 is loaded from its official jsDelivr distribution, with its bundled Python and third-party license notices: https://cdn.jsdelivr.net/pyodide/v314.0.7/full/ .
