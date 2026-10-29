# Third-party notices

This application uses unmodified PhotoCraft Rust crates from https://github.com/storytold/photocraft at c645d5fcc92c4bdd0d925084450699d05a184850.

The photo bridge depends on photocraft-color and photocraft-cms. Their MIT and Apache-2.0 license texts and upstream NOTICE are distributed in AITest/wwwroot/licenses/. These dependencies are used under the MIT license; the Apache license is also retained for reference. Other transitive Rust dependencies are documented in Cargo.lock; their notices are generated into the deployed licenses directory by the build workflow.

Bootstrap is copyright The Bootstrap Authors, licensed MIT; its stylesheet retains the upstream license header.

PdfCraft is used at revision c735fb7da55264e7cd84eed0688ec0cec5e628d4 from https://github.com/storytold/pdfcraft. The pdfcraft-cos, pdfcraft-organize, pdfcraft-content, pdfcraft-filters, and pdfcraft-crypt crates are used under the MIT license; the upstream license texts and NOTICE are distributed in AITest/wwwroot/licenses/PdfCraft-*.txt. The patched Hayro syntax and JBIG2 crates retain their own license files in the generated dependency notices. The PDF module has its own rust-pdf/Cargo.lock.
