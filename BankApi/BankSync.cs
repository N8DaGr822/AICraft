using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace BankApi;

public static class BankSync
{
    public static async Task Run(BankConnection connection, BankDb db, PlaidClient plaid, TokenCipher cipher, CancellationToken ct)
    {
        var token = cipher.Unprotect(connection.ProtectedToken, connection.UserId);
        var originalCursor = connection.Cursor;
        var changes = new Dictionary<string, JsonElement?>();
        string cursor = originalCursor;
        for (var attempt = 0; ; attempt++)
        {
            changes.Clear();
            cursor = originalCursor;
            try
            {
                for (var page = 0; ; page++)
                {
                    if (page >= 200) throw new PlaidException("SYNC_LIMIT_REACHED");
                    var result = await plaid.Call("transactions/sync", new() { ["access_token"] = token, ["cursor"] = cursor, ["count"] = 500 }, ct);
                    foreach (var kind in new[] { "added", "modified" })
                        foreach (var row in result.GetProperty(kind).EnumerateArray())
                            changes[row.GetProperty("transaction_id").GetString()!] = row.Clone();
                    foreach (var row in result.GetProperty("removed").EnumerateArray())
                        changes[row.GetProperty("transaction_id").GetString()!] = null;
                    cursor = result.GetProperty("next_cursor").GetString()!;
                    if (!result.GetProperty("has_more").GetBoolean()) break;
                }
                break;
            }
            catch (PlaidException ex) when (ex.Code == "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" && attempt < 2) { }
        }
        var accounts = await plaid.Call("accounts/get", new() { ["access_token"] = token }, ct);
        // Sync Atomicity: Commit all pages and their cursor together; rowversion rejects competing syncs.
        var existing = await db.Transactions.Where(x => x.ConnectionId == connection.Id).ToDictionaryAsync(x => x.Id, ct);
        foreach (var (id, change) in changes)
        {
            existing.TryGetValue(id, out var entry);
            if (change is null)
            {
                if (entry is not null) db.Transactions.Remove(entry);
                continue;
            }
            var row = change.Value;
            if (entry is null)
            {
                entry = new BankTransaction { Id = id, ConnectionId = connection.Id };
                db.Transactions.Add(entry);
            }
            entry.AccountId = row.GetProperty("account_id").GetString()!;
            entry.Date = DateOnly.ParseExact(row.GetProperty("date").GetString()!, "yyyy-MM-dd");
            entry.Name = row.GetProperty("name").GetString() ?? "";
            entry.Amount = row.GetProperty("amount").GetDecimal();
            entry.Currency = row.GetProperty("iso_currency_code").GetString();
            entry.Pending = row.GetProperty("pending").GetBoolean();
        }
        connection.AccountsJson = accounts.GetProperty("accounts").GetRawText();
        connection.Cursor = cursor;
        connection.LastSynced = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}
