# AICraft

A mobile-friendly Blazor WebAssembly photo lab for trying Storytold Rust functionality in reusable Razor UI. Hosted on GitHub Pages at https://N8DaGr822.github.io/AICraft/ after deployment.

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

In repository Settings > Pages, select **GitHub Actions** as the source. Push to `main` to build, test, and deploy. The workflow publishes under `/AICraft/`; update that base path if the repository name changes. The generated 404.html permits client-side routes to load on direct navigation, though GitHub returns HTTP 404 for those URLs.

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

