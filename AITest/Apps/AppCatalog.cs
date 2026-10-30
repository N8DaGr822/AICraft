namespace AITest.Apps;

// App Registration: Launcher and navigation share metadata; each page owns its runtime lifetime.
public static class AppCatalog
{
    public sealed record Entry(string Name, string Route, string Runtime, string Description, string Icon, string? Version = null, string? Workflow = null);
    public static IReadOnlyList<Entry> All { get; } = Array.AsReadOnly(new[]
    {
        new Entry("Photo lab", "", "Rust · WebAssembly", "Adjust color, crop, rotate, flip, and export a PNG with PhotoCraft.", "bi-house-door-fill-nav-menu"),
        new Entry("PDF lab", "pdf", "Rust · WebAssembly", "Preview, merge, extract, reorder, and rotate pages with PdfCraft.", "bi-plus-square-fill-nav-menu"),
        new Entry("Vector lab", "vector", "Rust · WebAssembly", "Arrange editable shape layers and export SVG with VectorCraft.", "bi-list-nested-nav-menu"),
        new Entry("Ledger Reborn", "ledger", "Python · Pyodide", "Try invoices, payments, and reports with a browser-local ledger.", "bi-list-nested-nav-menu"),
        new Entry("WordCraft", "craft/wordcraft", "Rust · Official web app", "Write and format documents, then export your work.", "bi-list-nested-nav-menu", "0.12.0", "Create a document, type a short paragraph, apply formatting, then save a document."),
        new Entry("GridCraft", "craft/gridcraft", "Rust · Official web app", "Edit spreadsheets, calculate formulas, and work with data.", "bi-list-nested-nav-menu", "0.13.0", "Enter values in A1 and A2, enter =SUM(A1:A2) in A3, then save the workbook."),
        new Entry("PowerPCraft", "craft/deckcraft", "Rust · Official web app", "Build presentations with slides, text, and shapes.", "bi-list-nested-nav-menu", "0.12.0", "Create a deck, add a title and a second slide, then save the presentation."),
        new Entry("SoundCraft", "craft/soundcraft", "Rust · Official web app", "Arrange and edit audio in a browser workstation.", "bi-list-nested-nav-menu", "0.14.0", "Import a small audio file, play and trim a clip, then save the project or export audio."),
        new Entry("FilmCraft", "craft/filmcraft", "Rust · Official web app", "Edit video with a timeline, color tools, and sound.", "bi-list-nested-nav-menu", "0.14.0", "Explore the demo timeline or import a small clip, make a cut, then save the project."),
        new Entry("LightCraft", "craft/lightcraft", "Rust · Official web app", "Organize photos and develop images non-destructively.", "bi-list-nested-nav-menu", "0.15.0", "Open a demo photo or import a small image, adjust exposure, then export it."),
        new Entry("EffectCraft", "craft/effectcraft", "Rust · WebGL compatibility", "Compositions and effects using the browser compatibility renderer.", "bi-list-nested-nav-menu", "0.18.0", "Open the demo composition, change a layer property, and save the project."),
        new Entry("DesignCraft", "craft/designcraft", "Rust · Official web app", "Page layout with text and graphics.", "bi-list-nested-nav-menu", "0.14.0", "Create a page, add a text frame and a shape, then save the document."),
        new Entry("CADCraft", "craft/cadcraft", "Rust · Experimental", "Drawings with geometry and dimensions. Graphics startup remains unverified; see the lab notice.", "bi-list-nested-nav-menu", "0.14.0", "Draw a line and a circle, adjust the view, then save the drawing."),
        new Entry("FigCraft", "craft/figcraft", "Rust · Official web app", "Design interfaces with frames, components, and prototypes.", "bi-list-nested-nav-menu", "0.12.1", "Create a frame, add a rectangle and text, then save your design.")
    });
}
