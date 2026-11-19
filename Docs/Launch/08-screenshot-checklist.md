# Screenshot checklist

Core image pack captured and visually reviewed in Chrome on November 19, 2026. Production captures show revision `1ec6b01`; the application-detail capture shows the updated local draft and must be refreshed after deployment before representing the live page. Images contain page content only, without browser tabs, account controls or local paths. They have not been retouched.

- [x] Capture the deployed homepage at desktop and narrow browser widths. The narrow capture is not a physical-phone test.
- [ ] Capture search results, category filtering and a no-results state.
- [x] Capture an application page showing its limitation and licensing sections; local Photo lab draft captured.
- [ ] Capture a photo before/after with a non-sensitive, rights-cleared sample.
- [ ] Capture PDF page organization and a verified downloaded result.
- [ ] Capture vector layers and an exported SVG.
- [x] Capture PhotoCraft after successful startup with a generated color-chart sample.
- [x] Use synthetic ledger records only; the balance-sheet capture identifies Synthetic Test Company.
- [x] Exclude personal names, local file paths and unrelated tabs from the delivered images.
- [x] Supply descriptive alt text and inspect the captured narrow homepage for text wrapping.
- [ ] Complete physical-phone checks and a full contrast review in both themes.

## Images and suggested alt text

Dimensions below are PNG pixels, not CSS viewport dimensions. Desktop captures use Chrome responsive emulation at 2x pixel density. Full-page captures are taller than the viewport.

| File | Size | Caption / suggested alt text |
| --- | --- | --- |
| [home-desktop.png](screenshots/home-desktop.png) | 2880 × 2000 | AICraft homepage with the browser-workspace headline and featured Photo, PDF and vector tools. |
| [home-narrow.png](screenshots/home-narrow.png) | 652 × 892 | AICraft homepage at a narrow browser width, with its headline, introduction and Explore Applications link. |
| [photocraft-sample.png](screenshots/photocraft-sample.png) | 2880 × 2000 | PhotoCraft open inside AICraft with a generated color chart and its editing and layer panels. |
| [pdf-sample.png](screenshots/pdf-sample.png) | 2880 × 3022 | PDF lab showing the bundled three-page sample and a generated two-page preview in page order 3, 1. |
| [vector-layers.png](screenshots/vector-layers.png) | 2880 × 3568 | Vector lab with two overlapping purple star layers and controls for the selected second layer. |
| [ledger-synthetic.png](screenshots/ledger-synthetic.png) | 2400 × 1260 | Ledger Reborn balance sheet for Synthetic Test Company, with a bank balance of 15,415.98 and matching asset and liability-plus-equity totals. |
| [photo-detail-local.png](screenshots/photo-detail-local.png) | 2400 × 3824 | Local draft of the Photo lab listing, including its workflow, limitations, privacy information and upstream licensing links. |

The PhotoCraft image shows an opened sample, not a before/after edit. The PDF image shows successful generation and its in-browser preview; downloading and reopening the result were not part of this capture. The vector image shows generated layers; a downloaded SVG was not verified during this capture. Ledger was viewed in the separate synthetic company without recording new entries or opening My Company. These images do not replace the earlier acceptance records.

## Social artwork

[Editable SVG](assets/aicraft-social.svg), 1200 × 630, and [PNG](assets/aicraft-social.png), 2400 × 1260, use AICraft's existing colors and original abstract photo, document and vector motifs. The PNG was rendered from the SVG in Chrome at 2x density. It is promotional artwork, not an application screenshot. No external images, fonts or upstream logos were added.

Suggested alt text: “AICraft: powerful software, free to use. Creative and productivity tools, right in your browser.”

Current landing pages still use text workflow previews. This pack has not been wired into catalog `PreviewImage` fields, page rendering or Open Graph metadata. Set `PreviewImage` only when the renderer supports the reviewed image, and publish social-image metadata with the corresponding public asset.
