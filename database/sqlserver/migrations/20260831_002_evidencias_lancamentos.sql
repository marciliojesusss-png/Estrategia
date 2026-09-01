SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 50001, 'Migration permitida somente no banco Estrategia.', 1;

IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
    THROW 50002, 'Tabela dbo.lancamentos nao encontrada.', 1;

IF COL_LENGTH(N'dbo.lancamentos', N'referencia_evidencia') IS NULL
BEGIN
    ALTER TABLE dbo.lancamentos
        ADD referencia_evidencia NVARCHAR(MAX) NULL;
END;
