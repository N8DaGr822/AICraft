# AICraft licensing and launch-risk review

Reviewed October 30, 2026. This is a technical evidence review, not a legal opinion, infringement clearance, or prediction of a lawsuit outcome. Recommendation: continue technical preparation, but do not describe the project as legally cleared for promotion.

## Scope and evidence

Inspected the original host license, custom integration source and Cargo manifests, third-party notices, application catalog, landing-page generator, promotional drafts, ten pinned upstream release archives, and versioned upstream brand terms and Cargo.lock files. All ten cached archives match the release manifest SHA-256 pins. All ten required NOTICE/MIT/Apache license sets are present in those archives. The installer preserves archive contents apart from compression sidecars and the documented EffectCraft bootstrap modification.

`license-inventory.json` records release identity, archive and notice hashes, bundled notice paths, versioned source/brand URLs, and lockfile-based source checks. Downloaded 33 distinct acadrust/Symphonia source packages and verified them against upstream lockfile checksums. This confirms the checked source is available and matches those lockfiles, not that every lockfile package is present in a specific compiled WASM artifact. Some Symphonia 0.5.5 packages omit standalone license text while declaring MPL-2.0 in Cargo.toml; the versioned repository supplies the text, now included in AICraft's public licenses directory.

The four custom integrations retain source revisions and notices in THIRD-PARTY-NOTICES.md. The dependency-license collector fails when a Rust dependency has no discoverable license text, but that is a packaging check, not a full compatibility analysis. Its output covers the custom Rust builds, not the complete dependency graphs of the ten prebuilt editors or the .NET runtime.

## Findings and disposition

| Priority | Finding | Evidence and action |
| --- | --- | --- |
| High — unresolved | Trademark clearance and upstream brand scope | ArtCraft brand terms are separate from code licenses and restrict promotion and modified distributions. Version-specific terms were retrieved for all ten applications. No separate logo/brand filenames were found in their release ZIPs, but embedded WASM assets were not exhaustively inspected. EffectCraft has a bootstrap patch; whether any embedded marks require removal or permission needs resolution before marketing that modified build. Do not use upstream logos as AICraft's own identity or in promotional artwork without reviewing permission. |
| High — unresolved | Ownership and authority to license original code | MIT was added with the user's approval and requested copyright name. This does not verify employment agreements, contributions, copied snippets, or assignment of rights. Confirm the original code and assets can be licensed by Nathen Lentz. No adverse ownership claim was discovered or inferred. |
| High — unresolved | Complete prebuilt binary provenance | Hash matches establish that cached archives match the pinned download records. They do not prove upstream contributors owned every element or that releases were reproducibly built. Obtain/retain upstream build provenance or perform source builds and a full dependency/asset review if stronger assurance is required. |
| Medium — improved | MPL source references were too general | CADCraft NOTICE identifies acadrust, and DeckCraft NOTICE identifies Symphonia. Other media-app lockfiles also contain Symphonia families. Added exact version source references, checksum evidence and an MPL text copy. acadrust 0.6.6 is identified in CADCraft's release lockfile. Verify actual binary inclusion and completeness of required notices before representing the full dependency audit as complete. |
| Medium — fixed in local copy | Inaccurate claim that upstream code is never rewritten | Corrected THIRD-PARTY-NOTICES.md to explicitly identify the EffectCraft index.html WebGL patch and runtime flags while distinguishing unchanged WASM/JS payloads and notices. The patch already has an explanatory HTML comment. |
| Medium — fixed disclosure, functionality still unverified | LightCraft is not uniformly covered by an MIT option | Its NOTICE identifies Apache-only segmentation code, optional SAM model weights under separate non-OSI terms, optional RawNIND GPL-3.0 weights, GeoNames attribution terms, fonts and branding. Updated the catalog to expose these distinctions and possible optional downloads. Did not download models or accept their terms. Whether those optional features are enabled in the pinned browser build remains unverified. |
| Medium — unresolved | Privacy completeness | Custom JS inspection found the expected jsDelivr Pyodide import and local file/sample fetches, with no upload endpoint found in that inspected code. This is not a runtime network audit of all prebuilt applications, optional features or WASM. Public disclosures explicitly limit their claims; do not advertise platform-wide offline/private processing without further tests. |
| Medium — unresolved | Name and marketing review | AICraft has not received a comprehensive trademark clearance search. Comparative names are qualified by workflow limits and non-affiliation statements; those statements alone do not resolve possible claims. Existing PowerPCraft display naming differs from DeckCraft upstream identity and warrants review. No names were changed without approval. |
| Medium — unresolved | Operator-specific terms and business exposure | The current Terms/Privacy pages are factual baseline disclosures, not tailored contracts. Jurisdiction, operator identity, intended markets, user-data workflows, media codec patents and any business/entity or insurance questions require fact-specific professional advice. No conclusion about patent obligations or personal liability is made here. |

## Changes made

- Retained the user-approved MIT license for original code and its browser-accessible copy; upstream notices remain separate.
- Corrected EffectCraft modification disclosure.
- Added LightCraft mixed-license and optional-download disclosures and DeckCraft's Symphonia notice reference.
- Added a public third-party sources/terms index and links from static pages and the Blazor footer.
- Added the versioned Symphonia MPL-2.0 text and a machine-readable review inventory.
- Updated the launch checklist to distinguish local licensing work from publication and unresolved review items.

These changes improve accuracy and access to evidence. They do not change editor processing or relicense upstream components. They remain local until reviewed and deployed.

## Before promotion

1. Confirm ownership of original contributions and authority to apply MIT.
2. Resolve brand treatment for modified EffectCraft and any embedded marks; retain written permission if relying on it. Do not automatically publish upstream logos or branded screenshots as advertising.
3. Complete AICraft/name clearance and a full dependency/asset review, including media-related obligations where applicable. An attorney should interpret findings against the actual business and jurisdictions.
4. Finish per-editor network/export tests and make Privacy/Terms match verified operation.
5. Publish the license/notices with the reviewed build, verify deployed links, and only then approve promotional submissions. No submission or deployment is authorized by this report itself.

## Primary references consulted

- MIT terms: https://opensource.org/license/mit
- Apache-2.0 redistribution, trademark and disclaimer provisions: https://www.apache.org/licenses/LICENSE-2.0
- Mozilla's MPL distribution/source guidance: https://www.mozilla.org/en-US/MPL/2.0/FAQ/
- CADCraft v0.14.0 brand terms: https://github.com/storytold/cadcraft/blob/v0.14.0/docs/brand/LICENSE-brand.txt
- EffectCraft v0.18.0 brand terms: https://github.com/storytold/effectcraft/blob/v0.18.0/docs/brand/LICENSE-brand.txt
- Symphonia v0.5.5 source/license: https://github.com/pdeljanov/Symphonia/tree/v0.5.5
- USPTO comprehensive clearance guidance: https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks

Upstream notices and assertions are evidence of declared terms, not independent proof of ownership. This review does not replace a legal review, establish attorney-client privilege, or guarantee any particular litigation result.
