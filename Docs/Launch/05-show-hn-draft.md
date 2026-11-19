# Show HN draft
Title: Show HN: AICraft – free browser tools with explicit features and limitations
URL: https://n8dagr822.github.io/AICraft/

I built AICraft as a directory and host for focused browser labs and upstream creative editors. The host is Blazor WebAssembly and the discovery pages are generated static HTML. Photo lab hosts the full PhotoCraft browser editor; the separate basic photo, PDF and vector integrations use Rust WASM workers. Ledger Reborn uses Python through Pyodide for local bookkeeping, with manual imports from a separate Microsoft/Plaid bank feed. Tax Reborn runs independently in offline mode for experimental tax year 2025 preparation, without electronic filing.

The interesting engineering tradeoff is keeping discovery lightweight while loading an editor only when it is opened. Each listing describes what is implemented, which upstream project it uses and where it falls short. There is no claim of desktop parity or affiliation with the products used for comparison.

Known limits include large first loads for some editors, browser-specific graphics support, and unverified CADCraft startup. Feedback on actual import/export workflows and error handling would be especially useful.

Verify current Show HN requirements before submitting. Link to the functioning product, not just this draft.
