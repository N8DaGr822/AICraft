using Microsoft.EntityFrameworkCore;

namespace BankApi;

public sealed class BankDb(DbContextOptions<BankDb> options) : DbContext(options)
{
    public DbSet<BankConnection> Connections => Set<BankConnection>();
    public DbSet<BankTransaction> Transactions => Set<BankTransaction>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<BankConnection>().ToTable("BankConnections");
        model.Entity<BankConnection>().Property(x => x.UserId).HasMaxLength(64);
        // Provider Identity: Plaid identifiers are case-sensitive, unlike default SQL text comparisons.
        model.Entity<BankConnection>().Property(x => x.ItemId).HasMaxLength(200).UseCollation("Latin1_General_100_BIN2");
        model.Entity<BankConnection>().HasIndex(x => x.ItemId).IsUnique();
        model.Entity<BankConnection>().Property(x => x.Version).IsRowVersion();
        model.Entity<BankTransaction>().ToTable("BankTransactions");
        model.Entity<BankTransaction>().HasKey(x => new { x.ConnectionId, x.Id });
        model.Entity<BankTransaction>().Property(x => x.Id).HasMaxLength(200).UseCollation("Latin1_General_100_BIN2");
        model.Entity<BankTransaction>().Property(x => x.AccountId).HasMaxLength(200).UseCollation("Latin1_General_100_BIN2");
        model.Entity<BankTransaction>().Property(x => x.Amount).HasPrecision(19, 4);
        model.Entity<BankTransaction>().HasOne<BankConnection>().WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class BankConnection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string ItemId { get; set; } = "";
    public string ProtectedToken { get; set; } = "";
    public string Cursor { get; set; } = "";
    public string AccountsJson { get; set; } = "[]";
    public DateTimeOffset? LastSynced { get; set; }
    public byte[] Version { get; set; } = [];
}

public sealed class BankTransaction
{
    public Guid ConnectionId { get; set; }
    public string Id { get; set; } = "";
    public string AccountId { get; set; } = "";
    public DateOnly Date { get; set; }
    public string Name { get; set; } = "";
    // Bank Amounts: Plaid positive amounts are outflows; preserve their sign and currency.
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public bool Pending { get; set; }
}
