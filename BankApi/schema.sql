-- Run once in the dedicated Azure SQL database using a schema-owner account.
CREATE TABLE dbo.BankConnections (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    UserId nvarchar(64) NOT NULL,
    ItemId nvarchar(200) COLLATE Latin1_General_100_BIN2 NOT NULL,
    ProtectedToken nvarchar(max) NOT NULL,
    [Cursor] nvarchar(max) NOT NULL,
    AccountsJson nvarchar(max) NOT NULL,
    LastSynced datetimeoffset NULL,
    Version rowversion NOT NULL
);
CREATE UNIQUE INDEX IX_BankConnections_ItemId ON dbo.BankConnections(ItemId);
CREATE TABLE dbo.BankTransactions (
    ConnectionId uniqueidentifier NOT NULL,
    Id nvarchar(200) COLLATE Latin1_General_100_BIN2 NOT NULL,
    AccountId nvarchar(200) COLLATE Latin1_General_100_BIN2 NOT NULL,
    Date date NOT NULL,
    Name nvarchar(max) NOT NULL,
    Amount decimal(19,4) NOT NULL,
    Currency nvarchar(max) NULL,
    Pending bit NOT NULL,
    CONSTRAINT PK_BankTransactions PRIMARY KEY(ConnectionId, Id),
    CONSTRAINT FK_BankTransactions_Connections FOREIGN KEY(ConnectionId) REFERENCES dbo.BankConnections(Id) ON DELETE CASCADE
);
