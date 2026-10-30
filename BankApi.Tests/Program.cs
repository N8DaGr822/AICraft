using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BankApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

internal static class TestRunner
{
    public static async Task Main()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Bank:EncryptionKey"] = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)),
            ["Plaid:ClientId"] = "test",
            ["Plaid:Secret"] = "test"
        }).Build();
        var cipher = new TokenCipher(configuration);
        var encrypted = cipher.Protect("synthetic-token", "owner");
        Check(cipher.Unprotect(encrypted, "owner") == "synthetic-token", "Token round trip");
        try { cipher.Unprotect(encrypted, "other-owner"); throw new Exception("Owner binding failed"); }
        catch (CryptographicException) { }
        var tampered = Convert.FromBase64String(encrypted); tampered[^1] ^= 1;
        try { cipher.Unprotect(Convert.ToBase64String(tampered), "owner"); throw new Exception("Tamper detection failed"); }
        catch (CryptographicException) { }

        var options = new DbContextOptionsBuilder<BankDb>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new BankDb(options);
        var connection = new BankConnection { UserId = "owner", ItemId = "item", ProtectedToken = encrypted };
        db.Connections.Add(connection); await db.SaveChangesAsync();
        var handler = new FakePlaid();
        var client = new PlaidClient(new HttpClient(handler) { BaseAddress = new Uri("https://example.invalid/") }, configuration);

        handler.Replies.Enqueue(Page("first", true, [Row("one", 10m)]));
        handler.Replies.Enqueue(Page("second", false, [Row("two", -20m)]));
        handler.Replies.Enqueue(new { accounts = new[] { new { account_id = "account", name = "Test checking", mask = "1234" } } });
        await BankSync.Run(connection, db, client, cipher, default);
        Check(await db.Transactions.CountAsync() == 2 && connection.Cursor == "second", "All pages committed");
        Check((await db.Transactions.SingleAsync(x => x.Id == "two")).Amount == -20m, "Inflow sign preserved");

        handler.Replies.Enqueue(new { added = new[] { Row("one", 10m) }, modified = new[] { Row("two", -25m) }, removed = Array.Empty<object>(), next_cursor = "third", has_more = false });
        handler.Replies.Enqueue(new { accounts = Array.Empty<object>() });
        await BankSync.Run(connection, db, client, cipher, default);
        Check(await db.Transactions.CountAsync() == 2 && (await db.Transactions.SingleAsync(x => x.Id == "two")).Amount == -25m, "Repeated IDs upsert, modifications applied");

        handler.Replies.Enqueue(Page("discard", true, [Row("discarded", 99m)]));
        handler.Replies.Enqueue(new ProviderError("TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"));
        handler.Replies.Enqueue(new { added = Array.Empty<object>(), modified = Array.Empty<object>(), removed = new[] { new { transaction_id = "one" } }, next_cursor = "final", has_more = false });
        handler.Replies.Enqueue(new { accounts = Array.Empty<object>() });
        await BankSync.Run(connection, db, client, cipher, default);
        Check(await db.Transactions.CountAsync() == 1 && connection.Cursor == "final", "Retry discards abandoned pages and applies removals");
        Check(handler.Cursors.TakeLast(3).SequenceEqual(new[] { "third", "discard", "third" }), "Pagination retry uses original cursor");

        handler.Replies.Enqueue(Page("uncommitted", true, [Row("failed", 1m)]));
        handler.Replies.Enqueue(new ProviderError("ITEM_LOGIN_REQUIRED"));
        try { await BankSync.Run(connection, db, client, cipher, default); throw new Exception("Expected provider error"); }
        catch (PlaidException ex) when (ex.Code == "ITEM_LOGIN_REQUIRED") { }
        db.ChangeTracker.Clear();
        Check((await db.Connections.SingleAsync()).Cursor == "final" && !await db.Transactions.AnyAsync(x => x.Id == "failed"), "Failed sync leaves saved cursor and transactions intact");
        Console.WriteLine("Bank sync and token encryption checks passed. SQL rowversion behavior requires Azure SQL integration verification.");
        await AuthorizationChecks.Run();
    }

    static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    static object Row(string id, decimal amount) => new { transaction_id = id, account_id = "account", date = "2026-10-30", name = "Synthetic", amount, iso_currency_code = "USD", pending = false };
    static object Page(string cursor, bool more, object[] added) => new { added, modified = Array.Empty<object>(), removed = Array.Empty<object>(), next_cursor = cursor, has_more = more };
}
sealed record ProviderError(string Code);
sealed class FakePlaid : HttpMessageHandler
{
    public Queue<object> Replies { get; } = new();
    public List<string> Cursors { get; } = [];
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct));
        if (body.RootElement.TryGetProperty("cursor", out var cursor)) Cursors.Add(cursor.GetString()!);
        var value = Replies.Dequeue();
        return new HttpResponseMessage(value is ProviderError ? HttpStatusCode.BadRequest : HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(value is ProviderError error ? new { error_code = error.Code } : value), Encoding.UTF8, "application/json")
        };
    }
}
