using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using BankApi;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

internal static class AuthorizationChecks
{
    public static async Task Run()
    {
        using var factory = new BankFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var id = Guid.NewGuid();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BankDb>();
            db.Connections.Add(new BankConnection { Id = id, UserId = "owner", ItemId = "synthetic", ProtectedToken = "must-not-be-returned" });
            await db.SaveChangesAsync();
        }
        await Expect(HttpStatusCode.Unauthorized, "/api/bank/connections");
        client.DefaultRequestHeaders.Add("Test-User", "owner");
        await Expect(HttpStatusCode.Forbidden, "/api/bank/connections");
        client.DefaultRequestHeaders.Add("Test-Scope", "access_as_user");
        await Expect(HttpStatusCode.OK, "/api/bank/connections");
        var listing = await client.GetStringAsync("/api/bank/connections");
        if (listing.Contains("must-not-be-returned") || listing.Contains("protectedToken")) throw new Exception("Token leaked in API response");
        client.DefaultRequestHeaders.Remove("Test-User"); client.DefaultRequestHeaders.Add("Test-User", "other");
        await Expect(HttpStatusCode.NotFound, $"/api/bank/connections/{id}/transactions");
        using var sync = await client.PostAsync($"/api/bank/connections/{id}/sync", null);
        using var reconnect = await client.PostAsJsonAsync("/api/bank/link-token", new { connectionId = id });
        using var disconnect = await client.DeleteAsync($"/api/bank/connections/{id}");
        if (new[] { sync, reconnect, disconnect }.Any(x => x.StatusCode != HttpStatusCode.NotFound)) throw new Exception("Cross-owner mutation was not rejected");
        if ((await client.GetAsync("/api/bank/connections")).StatusCode != HttpStatusCode.OK || await client.GetStringAsync("/api/bank/connections") != "[]") throw new Exception("Owner isolation failed");
        client.DefaultRequestHeaders.Remove("Test-User"); client.DefaultRequestHeaders.Add("Test-User", "outsider");
        await Expect(HttpStatusCode.Forbidden, "/api/bank/connections");
        Console.WriteLine("API authorization, owner isolation and token non-disclosure checks passed.");
        async Task Expect(HttpStatusCode status, string path)
        {
            using var response = await client.GetAsync(path);
            if (response.StatusCode != status) throw new Exception($"{path}: expected {status}, got {response.StatusCode}");
        }
    }
}

internal sealed class BankFactory : WebApplicationFactory<global::Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseContentRoot(Path.GetFullPath("BankApi"));
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Bank:EncryptionKey"] = Convert.ToBase64String(new byte[32]),
            ["Authentication:AllowedObjectIds:0"] = "owner", ["Authentication:AllowedObjectIds:1"] = "other"
        }));
        builder.ConfigureServices(services =>
        {
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            services.RemoveAll<DbContextOptions<BankDb>>();
            services.RemoveAll<IDbContextOptionsConfiguration<BankDb>>();
            services.AddDbContext<BankDb>(options => options.UseInMemoryDatabase("authorization-test"));
            services.AddAuthentication(options => { options.DefaultAuthenticateScheme = "Test"; options.DefaultChallengeScheme = "Test"; })
                .AddScheme<AuthenticationSchemeOptions, TestAuthentication>("Test", _ => { });
        });
    }
}
internal sealed class TestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Test-User", out var user)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity(new[] { new Claim("oid", user.ToString()), new Claim("scp", Request.Headers["Test-Scope"].ToString()) }, "Test");
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), "Test")));
    }
}
