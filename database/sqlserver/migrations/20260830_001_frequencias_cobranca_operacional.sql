SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
    THROW 50001, 'A tabela dbo.configuracoes nao existe no banco selecionado.', 1;

IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
    THROW 50002, 'A tabela dbo.indicadores nao existe no banco selecionado.', 1;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.configuracoes
    WHERE chave = N'frequenciasCobrancaOperacional'
)
BEGIN
    DECLARE @frequencias NVARCHAR(MAX);

    SELECT @frequencias = (
        SELECT
            TRY_CONVERT(INT, i.id) AS indicadorId,
            N'mensal' AS frequenciaCobrancaOperacional
        FROM dbo.indicadores AS i
        ORDER BY i.numero, i.id
        FOR JSON PATH
    );

    INSERT INTO dbo.configuracoes (chave, valor_json, updated_at)
    VALUES (
        N'frequenciasCobrancaOperacional',
        COALESCE(@frequencias, N'[]'),
        CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    );
END;

SELECT chave, valor_json
FROM dbo.configuracoes
WHERE chave = N'frequenciasCobrancaOperacional';
