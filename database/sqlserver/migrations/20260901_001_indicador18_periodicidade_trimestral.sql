SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 50001, 'Execute esta migration somente no banco Estrategia.', 1;

IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
    THROW 50002, 'A tabela dbo.indicadores nao existe.', 1;

IF OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
    THROW 50003, 'A tabela dbo.configuracoes nao existe.', 1;

DECLARE @indicador_id NVARCHAR(100);
DECLARE @quantidade INT;

SELECT
    @indicador_id = MAX(i.id),
    @quantidade = COUNT(*)
FROM dbo.indicadores AS i
WHERE i.numero = 18
  AND i.nome = N'Princípios de Jogo Responsável (WLA)';

IF @quantidade <> 1 OR @indicador_id IS NULL
    THROW 50004, 'O indicador 18 nao foi localizado de forma univoca.', 1;

BEGIN TRANSACTION;

UPDATE dbo.indicadores
SET periodicidade = N'Trimestral',
    updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
WHERE id = @indicador_id
  AND ISNULL(periodicidade, N'') <> N'Trimestral';

DECLARE @frequencias NVARCHAR(MAX);
SELECT @frequencias = valor_json
FROM dbo.configuracoes
WHERE chave = N'frequenciasCobrancaOperacional';

IF @frequencias IS NULL OR ISJSON(@frequencias) <> 1
BEGIN
    SELECT @frequencias = (
        SELECT
            TRY_CONVERT(INT, i.id) AS indicadorId,
            CASE WHEN i.id = @indicador_id THEN N'trimestral' ELSE N'mensal' END AS frequenciaCobrancaOperacional
        FROM dbo.indicadores AS i
        ORDER BY i.numero, i.id
        FOR JSON PATH
    );

    IF EXISTS (SELECT 1 FROM dbo.configuracoes WHERE chave = N'frequenciasCobrancaOperacional')
        UPDATE dbo.configuracoes
        SET valor_json = COALESCE(@frequencias, N'[]'),
            updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
        WHERE chave = N'frequenciasCobrancaOperacional';
    ELSE
        INSERT INTO dbo.configuracoes (chave, valor_json, updated_at)
        VALUES (N'frequenciasCobrancaOperacional', COALESCE(@frequencias, N'[]'), CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127));
END
ELSE
BEGIN
    DECLARE @indice INT;
    DECLARE @frequencia_atual NVARCHAR(20);
    DECLARE @configuracao_alterada BIT = 0;
    SELECT TOP (1) @indice = TRY_CONVERT(INT, j.[key])
    FROM OPENJSON(@frequencias) AS j
    WHERE JSON_VALUE(j.[value], '$.indicadorId') = @indicador_id;

    IF @indice IS NULL
    BEGIN
        SET @frequencias = JSON_MODIFY(
            @frequencias,
            'append $',
            JSON_QUERY(N'{"indicadorId":' + QUOTENAME(@indicador_id, '"') + N',"frequenciaCobrancaOperacional":"trimestral"}')
        );
        SET @configuracao_alterada = 1;
    END
    ELSE
    BEGIN
        SET @frequencia_atual = JSON_VALUE(
            @frequencias,
            N'$[' + CONVERT(NVARCHAR(10), @indice) + N'].frequenciaCobrancaOperacional'
        );

        IF ISNULL(@frequencia_atual, N'') <> N'trimestral'
        BEGIN
        SET @frequencias = JSON_MODIFY(
            @frequencias,
            N'$[' + CONVERT(NVARCHAR(10), @indice) + N'].frequenciaCobrancaOperacional',
            N'trimestral'
        );
            SET @configuracao_alterada = 1;
        END;
    END;

    IF @configuracao_alterada = 1
        UPDATE dbo.configuracoes
        SET valor_json = @frequencias,
            updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
        WHERE chave = N'frequenciasCobrancaOperacional';
END;

COMMIT TRANSACTION;

SELECT i.id, i.numero, i.nome, i.periodicidade
FROM dbo.indicadores AS i
WHERE i.id = @indicador_id;

SELECT j.indicadorId, j.frequenciaCobrancaOperacional
FROM dbo.configuracoes AS c
CROSS APPLY OPENJSON(c.valor_json)
WITH (
    indicadorId NVARCHAR(100) '$.indicadorId',
    frequenciaCobrancaOperacional NVARCHAR(20) '$.frequenciaCobrancaOperacional'
) AS j
WHERE c.chave = N'frequenciasCobrancaOperacional'
  AND j.indicadorId = @indicador_id;
