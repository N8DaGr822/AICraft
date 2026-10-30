using System.Text.Json;

namespace AITest.Apps;

// App Registration: Discovery, navigation and static landing pages share one catalog.
public static class AppCatalog
{
    public sealed record Entry(string Name, string Route, string Runtime, string Description, string Icon, string? Version, string? Workflow,
        string Id, string Slug, string Category, string ComparableSoftware, string[] Features, string Limitations,
        string License, string LicenseUrl, string SourceUrl, string Access, bool Featured, DateOnly? DateAdded, string? PreviewImage, string DataHandling);

    public static IReadOnlyList<Entry> All { get; } = Load();

    private static IReadOnlyList<Entry> Load()
    {
        using var stream = typeof(AppCatalog).Assembly.GetManifestResourceStream("AITest.Apps.catalog.json")
            ?? throw new InvalidOperationException("Application catalog is missing.");
        return Array.AsReadOnly(JsonSerializer.Deserialize<Entry[]>(stream)
            ?? throw new InvalidOperationException("Application catalog is empty."));
    }
}
