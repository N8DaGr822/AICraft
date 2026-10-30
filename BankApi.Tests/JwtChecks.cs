using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

internal static class JwtChecks
{
    private static readonly SymmetricSecurityKey key = new(RandomNumberGenerator.GetBytes(32));

    internal static void Configure(IServiceCollection services) => services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
    {
        // JWT Verification: Exercise the real bearer handler with local signing metadata, never test credentials on Entra.
        var metadata = new OpenIdConnectConfiguration { Issuer = "https://issuer.example/" };
        metadata.SigningKeys.Add(key);
        options.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(metadata);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = metadata.Issuer, ValidAudience = "bank-api", ValidateIssuer = true,
            ValidateAudience = true, ValidateLifetime = true, RequireSignedTokens = true,
            ValidateIssuerSigningKey = true, ClockSkew = TimeSpan.Zero
        };
    });

    internal static async Task Run()
    {
        using var factory = new BankFactory(useJwt: true);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        await Check(Token(), HttpStatusCode.OK);
        await Check(Token(issuer: "https://untrusted.example/"), HttpStatusCode.Unauthorized);
        await Check(Token(audience: "another-api"), HttpStatusCode.Unauthorized);
        await Check(Token(expired: true), HttpStatusCode.Unauthorized);
        await Check(Token(signingKey: new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(32))), HttpStatusCode.Unauthorized);
        await Check(Token(clientId: "old-editor-client"), HttpStatusCode.Forbidden);
        await Check("not-a-token", HttpStatusCode.Unauthorized);
        Console.WriteLine("Real JWT handler checks passed: signature, issuer, audience, expiry and old-client rejection.");

        async Task Check(string token, HttpStatusCode expected)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var response = await client.GetAsync("/api/bank/connections");
            if (response.StatusCode != expected) throw new Exception($"JWT validation: expected {expected}, got {response.StatusCode}");
        }
    }

    private static string Token(string issuer = "https://issuer.example/", string audience = "bank-api", bool expired = false,
        SecurityKey? signingKey = null, string clientId = "bank-client") => new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer, audience, [new Claim("oid", "owner"), new Claim("scp", "access_as_user"), new Claim("azp", clientId)],
            DateTime.UtcNow.AddMinutes(-10), DateTime.UtcNow.AddMinutes(expired ? -1 : 5),
            new SigningCredentials(signingKey ?? key, SecurityAlgorithms.HmacSha256)));
}
