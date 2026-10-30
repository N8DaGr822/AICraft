using System.Text.Json;

namespace BankApi;

public sealed class PlaidException(string code) : Exception(code)
{
    public string Code { get; } = code;
}

public sealed class PlaidClient(HttpClient http, IConfiguration configuration)
{
    public async Task<JsonElement> Call(string path, Dictionary<string, object?> body, CancellationToken ct)
    {
        body["client_id"] = configuration["Plaid:ClientId"];
        body["secret"] = configuration["Plaid:Secret"];
        using var response = await http.PostAsJsonAsync(path, body, ct);
        using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        if (!response.IsSuccessStatusCode)
            throw new PlaidException(json.RootElement.TryGetProperty("error_code", out var code) ? code.GetString()! : "PROVIDER_ERROR");
        return json.RootElement.Clone();
    }
}
