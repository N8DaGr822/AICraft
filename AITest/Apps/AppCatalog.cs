namespace AITest.Apps;

// App Registration: Launcher and navigation share metadata; each page owns its runtime lifetime.
public static class AppCatalog
{
    public sealed record Entry(string Name, string Route, string Runtime, string Description, string Icon);
    public static IReadOnlyList<Entry> All { get; } = Array.AsReadOnly(new[]
    {
        new Entry("Photo lab", "", "Rust · WebAssembly", "Adjust color and export a PNG with PhotoCraft.", "bi-house-door-fill-nav-menu"),
        new Entry("PDF lab", "pdf", "Rust · WebAssembly", "Extract, reorder, and rotate pages with PdfCraft.", "bi-plus-square-fill-nav-menu"),
        new Entry("Vector lab", "vector", "Rust · WebAssembly", "Generate shapes and export SVG with VectorCraft.", "bi-list-nested-nav-menu"),
        new Entry("Ledger Reborn", "ledger", "Python · Pyodide", "Try invoices, payments, and reports with a browser-local ledger.", "bi-list-nested-nav-menu")
    });
}
