using System.Security.Cryptography;
using System.Text;

namespace BankApi;

public sealed class TokenCipher
{
    private readonly byte[] key;
    public TokenCipher(IConfiguration configuration)
    {
        key = Convert.FromBase64String(configuration["Bank:EncryptionKey"] ?? "");
        if (key.Length != 32) throw new InvalidOperationException("Configure Bank:EncryptionKey with a base64-encoded 32-byte key from Azure Key Vault.");
    }

    public string Protect(string token, string owner)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plain = Encoding.UTF8.GetBytes(token);
        var encrypted = new byte[plain.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(key, 16);
        aes.Encrypt(nonce, plain, encrypted, tag, Encoding.UTF8.GetBytes(owner));
        return Convert.ToBase64String([.. nonce, .. tag, .. encrypted]);
    }

    public string Unprotect(string value, string owner)
    {
        var bytes = Convert.FromBase64String(value);
        var plain = new byte[bytes.Length - 28];
        using var aes = new AesGcm(key, 16);
        aes.Decrypt(bytes.AsSpan(0, 12), bytes.AsSpan(28), bytes.AsSpan(12, 16), plain, Encoding.UTF8.GetBytes(owner));
        return Encoding.UTF8.GetString(plain);
    }
}
