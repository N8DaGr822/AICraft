using System.Security.Claims;
using System.Text.Json;
using BankApi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<BankDb>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("Bank")));
builder.Services.AddSingleton<TokenCipher>();
builder.Services.AddHttpClient<PlaidClient>(client =>
{
    var environment = builder.Configuration["Plaid:Environment"] ?? "sandbox";
    client.BaseAddress = new Uri(environment switch
    {
        "sandbox" => "https://sandbox.plaid.com/",
        "production" => "https://production.plaid.com/",
        _ => throw new InvalidOperationException("Plaid environment must be sandbox or production.")
    });
    client.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.Authority = builder.Configuration["Authentication:Authority"];
    options.Audience = builder.Configuration["Authentication:Audience"];
    options.MapInboundClaims = false;
});
builder.Services.AddAuthorization(options => options.AddPolicy("BankOwner", policy =>
    policy.RequireAuthenticatedUser().RequireAssertion(context =>
    {
        var allowed = builder.Configuration.GetSection("Authentication:AllowedObjectIds").Get<string[]>() ?? [];
        var owner = context.User.FindFirstValue("oid");
        return !string.IsNullOrWhiteSpace(owner) && allowed.Contains(owner, StringComparer.OrdinalIgnoreCase)
            && (context.User.FindFirstValue("scp") ?? "").Split(' ').Contains("access_as_user");
    })));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [])
        .WithMethods("GET", "POST", "DELETE").WithHeaders("Authorization", "Content-Type")));

var app = builder.Build();
// Secret Validation: Fail startup rather than accepting bank connections without encryption.
_ = app.Services.GetRequiredService<TokenCipher>();
app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    try { await next(context); }
    catch (PlaidException ex)
    {
        context.Response.StatusCode = StatusCodes.Status502BadGateway;
        await context.Response.WriteAsJsonAsync(new { error = ex.Code == "ITEM_LOGIN_REQUIRED" ? "Bank authorization expired. Select Reconnect." : $"Bank provider returned {ex.Code}. Please retry or check provider setup." });
    }
    catch (DbUpdateException)
    {
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { error = "The saved connection changed or could not be saved. Reload before retrying." });
    }
    catch (Exception ex) when (ex is not OperationCanceledException)
    {
        // Privacy: Never return/log provider payloads or token-bearing exception details.
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { error = "Bank request failed. Check API configuration and service availability." });
    }
});
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "running" }));
var bank = app.MapGroup("/api/bank").RequireAuthorization("BankOwner");

bank.MapPost("/link-token", async (LinkRequest request, ClaimsPrincipal user, BankDb db, PlaidClient plaid, TokenCipher cipher, CancellationToken ct) =>
{
    var body = new Dictionary<string, object?>
    {
        ["user"] = new { client_user_id = Owner(user) }, ["client_name"] = "AICraft Ledger",
        ["country_codes"] = new[] { "US" }, ["language"] = "en"
    };
    if (request.ConnectionId is Guid id)
    {
        var owner = Owner(user);
        var connection = await db.Connections.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
        if (connection is null) return Results.NotFound();
        body["access_token"] = cipher.Unprotect(connection.ProtectedToken, connection.UserId);
    }
    else body["products"] = new[] { "transactions" };
    var redirect = builder.Configuration["Plaid:RedirectUri"];
    if (!string.IsNullOrWhiteSpace(redirect)) body["redirect_uri"] = redirect;
    var result = await plaid.Call("link/token/create", body, ct);
    return Results.Ok(new { linkToken = result.GetProperty("link_token").GetString() });
});

bank.MapPost("/exchange", async (ExchangeRequest request, ClaimsPrincipal user, BankDb db, PlaidClient plaid, TokenCipher cipher, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.PublicToken) || request.PublicToken.Length > 1000) return Results.BadRequest();
    var result = await plaid.Call("item/public_token/exchange", new() { ["public_token"] = request.PublicToken }, ct);
    var itemId = result.GetProperty("item_id").GetString()!;
    var token = result.GetProperty("access_token").GetString()!;
    var connection = new BankConnection { UserId = Owner(user), ItemId = itemId, ProtectedToken = cipher.Protect(token, Owner(user)) };
    db.Connections.Add(connection);
    try { await db.SaveChangesAsync(ct); }
    catch
    {
        // Connection Recovery: Revoke a newly exchanged Item if durable storage fails.
        await plaid.Call("item/remove", new() { ["access_token"] = token }, CancellationToken.None);
        throw;
    }
    return Results.Ok(new { connection.Id });
});

bank.MapGet("/connections", async (ClaimsPrincipal user, BankDb db, CancellationToken ct) =>
{
    var owner = Owner(user);
    var rows = await db.Connections.AsNoTracking().Where(x => x.UserId == owner).ToListAsync(ct);
    return Results.Ok(rows.Select(x => new { x.Id, x.LastSynced, accounts = JsonSerializer.Deserialize<JsonElement>(x.AccountsJson) }));
});

bank.MapPost("/connections/{id:guid}/sync", async (Guid id, ClaimsPrincipal user, BankDb db, PlaidClient plaid, TokenCipher cipher, CancellationToken ct) =>
{
    var owner = Owner(user);
    var connection = await db.Connections.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
    if (connection is null) return Results.NotFound();
    await BankSync.Run(connection, db, plaid, cipher, ct);
    return Results.Ok(new { connection.LastSynced });
});

bank.MapGet("/connections/{id:guid}/transactions", async (Guid id, string? accountId, int? offset, ClaimsPrincipal user, BankDb db, CancellationToken ct) =>
{
    var owner = Owner(user);
    if (!await db.Connections.AnyAsync(x => x.Id == id && x.UserId == owner, ct)) return Results.NotFound();
    if (offset is < 0) return Results.BadRequest();
    var query = db.Transactions.AsNoTracking().Where(x => x.ConnectionId == id);
    if (!string.IsNullOrEmpty(accountId)) query = query.Where(x => x.AccountId == accountId);
    var rows = await query.OrderByDescending(x => x.Date).ThenBy(x => x.Id).Skip(offset ?? 0).Take(101).ToListAsync(ct);
    return Results.Ok(new { rows = rows.Take(100), hasMore = rows.Count > 100 });
});

bank.MapDelete("/connections/{id:guid}", async (Guid id, ClaimsPrincipal user, BankDb db, PlaidClient plaid, TokenCipher cipher, CancellationToken ct) =>
{
    var owner = Owner(user);
    var connection = await db.Connections.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
    if (connection is null) return Results.NotFound();
    try { await plaid.Call("item/remove", new() { ["access_token"] = cipher.Unprotect(connection.ProtectedToken, connection.UserId) }, ct); }
    catch (PlaidException ex) when (ex.Code == "ITEM_NOT_FOUND" || ex.Code == "INVALID_ACCESS_TOKEN") { }
    db.Connections.Remove(connection);
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});
app.Run();

static string Owner(ClaimsPrincipal user) => user.FindFirstValue("oid")!;
public sealed record LinkRequest(Guid? ConnectionId);
public sealed record ExchangeRequest(string PublicToken);
public partial class Program { }
