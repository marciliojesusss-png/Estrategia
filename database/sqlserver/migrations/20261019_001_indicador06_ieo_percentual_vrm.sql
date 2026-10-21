SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
  Indicador 6 — IEO Recorrente

  Corrige exclusivamente o percentual atingido de Jan-Mar/2026 para:
    1 - ((Realizado - Meta) / (1 - Meta))

  VRM = 1 (100%). A migration não altera schema, Meta, Realizado, status,
  homologações, evidências ou dados de Iniciativas Estratégicas.
*/

IF DB_NAME() <> N'Estrategia'
    THROW 50001, 'Execute esta migration somente no banco Estrategia.', 1;

IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
    THROW 50002, 'As tabelas obrigatorias do modulo de indicadores nao existem.', 1;

IF OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
    THROW 50003, 'A tabela dbo.configuracoes nao existe.', 1;

DECLARE @indicador_id NVARCHAR(100);
DECLARE @indicadores_encontrados INT;

SELECT
    @indicador_id = MAX(CONVERT(NVARCHAR(100), i.id)),
    @indicadores_encontrados = COUNT(*)
FROM dbo.indicadores AS i
WHERE CONVERT(NVARCHAR(100), i.id) = N'6'
  AND i.numero = 6
  AND i.nome = N'IEO Recorrente (Índice de Eficiência Operacional Recorrente)';

IF @indicadores_encontrados <> 1 OR @indicador_id IS NULL
    THROW 50004, 'O IEO Recorrente nao foi localizado de forma univoca por ID, numero e nome.', 1;

DECLARE @correcoes TABLE (
    competencia NVARCHAR(7) NOT NULL PRIMARY KEY,
    mes INT NOT NULL,
    meta DECIMAL(19,12) NOT NULL,
    realizado DECIMAL(19,12) NOT NULL,
    percentual_novo DECIMAL(19,12) NOT NULL,
    detalhes NVARCHAR(MAX) NOT NULL
);

INSERT INTO @correcoes (competencia, mes, meta, realizado, percentual_novo, detalhes)
VALUES
(
    N'2026-01', 1, CAST(0.1449 AS DECIMAL(19,12)), CAST(0.0642 AS DECIMAL(19,12)),
    CAST(1 - ((CAST(0.0642 AS DECIMAL(19,12)) - CAST(0.1449 AS DECIMAL(19,12))) / (CAST(1 AS DECIMAL(19,12)) - CAST(0.1449 AS DECIMAL(19,12)))) AS DECIMAL(19,12)),
    N'Metodologia do percentual atingido:' + NCHAR(13) + NCHAR(10) +
    N'Como o IEO Recorrente é um indicador em que valores menores representam maior eficiência, o percentual de atingimento é calculado pela fórmula:' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'% Atingido = 1 - ((Realizado - Meta) / (VRM - Meta))' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'considerando VRM = 100%.' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'Realizado igual à meta corresponde a 100% de atingimento.' + NCHAR(13) + NCHAR(10) +
    N'Realizado abaixo da meta resulta em atingimento superior a 100%.' + NCHAR(13) + NCHAR(10) +
    N'Realizado acima da meta resulta em atingimento inferior a 100%.' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'Cálculo da competência:' + NCHAR(13) + NCHAR(10) +
    N'Meta: 14,49%' + NCHAR(13) + NCHAR(10) +
    N'Realizado: 6,42%' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'% Atingido =' + NCHAR(13) + NCHAR(10) +
    N'1 - ((6,42% - 14,49%) / (100,00% - 14,49%))' + NCHAR(13) + NCHAR(10) +
    N'= 109,44%'
),
(
    N'2026-02', 2, CAST(0.1445 AS DECIMAL(19,12)), CAST(0.11 AS DECIMAL(19,12)),
    CAST(1 - ((CAST(0.11 AS DECIMAL(19,12)) - CAST(0.1445 AS DECIMAL(19,12))) / (CAST(1 AS DECIMAL(19,12)) - CAST(0.1445 AS DECIMAL(19,12)))) AS DECIMAL(19,12)),
    N'Metodologia do percentual atingido:' + NCHAR(13) + NCHAR(10) +
    N'Como o IEO Recorrente é um indicador em que valores menores representam maior eficiência, o percentual de atingimento é calculado pela fórmula:' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'% Atingido = 1 - ((Realizado - Meta) / (VRM - Meta))' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'considerando VRM = 100%.' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'Realizado igual à meta corresponde a 100% de atingimento.' + NCHAR(13) + NCHAR(10) +
    N'Realizado abaixo da meta resulta em atingimento superior a 100%.' + NCHAR(13) + NCHAR(10) +
    N'Realizado acima da meta resulta em atingimento inferior a 100%.' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'Cálculo da competência:' + NCHAR(13) + NCHAR(10) +
    N'Meta: 14,45%' + NCHAR(13) + NCHAR(10) +
    N'Realizado: 11,00%' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'% Atingido =' + NCHAR(13) + NCHAR(10) +
    N'1 - ((11,00% - 14,45%) / (100,00% - 14,45%))' + NCHAR(13) + NCHAR(10) +
    N'= 104,03%'
),
(
    N'2026-03', 3, CAST(0.1441 AS DECIMAL(19,12)), CAST(0.108 AS DECIMAL(19,12)),
    CAST(1 - ((CAST(0.108 AS DECIMAL(19,12)) - CAST(0.1441 AS DECIMAL(19,12))) / (CAST(1 AS DECIMAL(19,12)) - CAST(0.1441 AS DECIMAL(19,12)))) AS DECIMAL(19,12)),
    N'Metodologia do percentual atingido:' + NCHAR(13) + NCHAR(10) +
    N'Como o IEO Recorrente é um indicador em que valores menores representam maior eficiência, o percentual de atingimento é calculado pela fórmula:' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'% Atingido = 1 - ((Realizado - Meta) / (VRM - Meta))' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'considerando VRM = 100%.' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'Realizado igual à meta corresponde a 100% de atingimento.' + NCHAR(13) + NCHAR(10) +
    N'Realizado abaixo da meta resulta em atingimento superior a 100%.' + NCHAR(13) + NCHAR(10) +
    N'Realizado acima da meta resulta em atingimento inferior a 100%.' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'Cálculo da competência:' + NCHAR(13) + NCHAR(10) +
    N'Meta: 14,41%' + NCHAR(13) + NCHAR(10) +
    N'Realizado: 10,80%' + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) +
    N'% Atingido =' + NCHAR(13) + NCHAR(10) +
    N'1 - ((10,80% - 14,41%) / (100,00% - 14,41%))' + NCHAR(13) + NCHAR(10) +
    N'= 104,22%'
);

/* Prévia obrigatória antes do UPDATE. */
SELECT
    l.id,
    l.competencia,
    TRY_CONVERT(DECIMAL(19,12), l.meta_referencia) AS meta,
    TRY_CONVERT(DECIMAL(19,12), l.resultado_calculado) AS realizado,
    TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido) AS atingido_atual,
    c.percentual_novo AS atingido_novo,
    l.status
FROM dbo.lancamentos AS l
JOIN @correcoes AS c ON c.competencia = l.competencia
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
ORDER BY l.competencia;

IF (
    SELECT COUNT(*)
    FROM dbo.lancamentos AS l
    JOIN @correcoes AS c ON c.competencia = l.competencia
    WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
      AND TRY_CONVERT(DECIMAL(19,12), l.meta_referencia) = c.meta
      AND TRY_CONVERT(DECIMAL(19,12), l.resultado_calculado) = c.realizado
) <> 3
    THROW 50005, 'Meta ou Realizado de Jan-Mar/2026 divergem do baseline esperado. Nenhuma alteracao foi executada.', 1;

DECLARE @total_indicadores_antes BIGINT = (SELECT COUNT_BIG(*) FROM dbo.indicadores);
DECLARE @total_lancamentos_antes BIGINT = (SELECT COUNT_BIG(*) FROM dbo.lancamentos);
DECLARE @total_iniciativas_antes BIGINT = (SELECT COUNT_BIG(*) FROM dbo.iniciativas_estrategicas);
DECLARE @total_iniciativas_homologacoes_antes BIGINT = (SELECT COUNT_BIG(*) FROM dbo.iniciativas_homologacoes);
DECLARE @total_iniciativas_evidencias_antes BIGINT = (SELECT COUNT_BIG(*) FROM dbo.iniciativas_evidencias);

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE l
    SET l.percentual_atingido = CONVERT(NVARCHAR(100), c.percentual_novo)
    FROM dbo.lancamentos AS l
    JOIN @correcoes AS c ON c.competencia = l.competencia
    WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
      AND (
          TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido) IS NULL
          OR TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido) <> c.percentual_novo
      );

    DECLARE @metas NVARCHAR(MAX);
    SELECT @metas = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'metas';

    IF @metas IS NULL OR ISJSON(@metas) <> 1
        THROW 50006, 'A configuracao JSON de metas nao existe ou e invalida.', 1;

    IF (
        SELECT COUNT(*)
        FROM OPENJSON(@metas) AS j
        WHERE JSON_VALUE(j.[value], '$.indicadorId') = @indicador_id
          AND TRY_CONVERT(INT, JSON_VALUE(j.[value], '$.ano')) = 2026
          AND TRY_CONVERT(INT, JSON_VALUE(j.[value], '$.mes')) IN (1, 2, 3)
    ) <> 3
        THROW 50007, 'As metas mensais do IEO para Jan-Mar/2026 nao foram localizadas de forma univoca.', 1;

    DECLARE @metas_novas NVARCHAR(MAX) = N'[';
    DECLARE @primeiro BIT = 1;
    DECLARE @item NVARCHAR(MAX);
    DECLARE @item_novo NVARCHAR(MAX);
    DECLARE @detalhes_existentes NVARCHAR(MAX);
    DECLARE @detalhes_negocio NVARCHAR(MAX);
    DECLARE @detalhes_metodologia NVARCHAR(MAX);
    DECLARE @posicao_metodologia INT;
    DECLARE @mes_item INT;
    DECLARE @indicador_item NVARCHAR(100);
    DECLARE @ano_item INT;

    DECLARE metas_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT j.[value]
        FROM OPENJSON(@metas) AS j
        ORDER BY TRY_CONVERT(INT, j.[key]);

    OPEN metas_cursor;
    FETCH NEXT FROM metas_cursor INTO @item;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @item_novo = @item;
        SET @indicador_item = JSON_VALUE(@item, '$.indicadorId');
        SET @ano_item = TRY_CONVERT(INT, JSON_VALUE(@item, '$.ano'));
        SET @mes_item = TRY_CONVERT(INT, JSON_VALUE(@item, '$.mes'));

        IF @indicador_item = @indicador_id AND @ano_item = 2026 AND @mes_item IN (1, 2, 3)
        BEGIN
            SELECT @detalhes_metodologia = c.detalhes FROM @correcoes AS c WHERE c.mes = @mes_item;
            SET @detalhes_existentes = JSON_VALUE(@item, '$.detalhesMetaMensal');
            SET @posicao_metodologia = CHARINDEX(N'Metodologia do percentual atingido:', ISNULL(@detalhes_existentes, N''));
            SET @detalhes_negocio = LTRIM(RTRIM(CASE
                WHEN @posicao_metodologia > 0 THEN LEFT(@detalhes_existentes, @posicao_metodologia - 1)
                ELSE ISNULL(@detalhes_existentes, N'')
            END));
            SET @item_novo = JSON_MODIFY(
                @item,
                '$.detalhesMetaMensal',
                CASE WHEN @detalhes_negocio = N'' THEN @detalhes_metodologia
                     ELSE @detalhes_negocio + NCHAR(13) + NCHAR(10) + NCHAR(13) + NCHAR(10) + @detalhes_metodologia END
            );
        END;

        SET @metas_novas = @metas_novas + CASE WHEN @primeiro = 1 THEN N'' ELSE N',' END + @item_novo;
        SET @primeiro = 0;
        FETCH NEXT FROM metas_cursor INTO @item;
    END;
    CLOSE metas_cursor;
    DEALLOCATE metas_cursor;
    SET @metas_novas = @metas_novas + N']';

    IF ISJSON(@metas_novas) <> 1
        THROW 50008, 'A composicao dos Detalhes da Meta Mensal produziu JSON invalido.', 1;

    UPDATE dbo.configuracoes
    SET valor_json = @metas_novas,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE chave = N'metas'
      AND valor_json <> @metas_novas;

    IF (SELECT COUNT_BIG(*) FROM dbo.indicadores) <> @total_indicadores_antes
        THROW 50009, 'A quantidade de indicadores foi alterada inesperadamente.', 1;
    IF (SELECT COUNT_BIG(*) FROM dbo.lancamentos) <> @total_lancamentos_antes
        THROW 50010, 'A quantidade de lancamentos foi alterada inesperadamente.', 1;
    IF (SELECT COUNT_BIG(*) FROM dbo.iniciativas_estrategicas) <> @total_iniciativas_antes
        THROW 50011, 'Iniciativas Estrategicas foram alteradas inesperadamente.', 1;
    IF (SELECT COUNT_BIG(*) FROM dbo.iniciativas_homologacoes) <> @total_iniciativas_homologacoes_antes
        THROW 50012, 'Homologacoes de iniciativas foram alteradas inesperadamente.', 1;
    IF (SELECT COUNT_BIG(*) FROM dbo.iniciativas_evidencias) <> @total_iniciativas_evidencias_antes
        THROW 50013, 'Evidencias de iniciativas foram alteradas inesperadamente.', 1;

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos AS l
        JOIN @correcoes AS c ON c.competencia = l.competencia
        WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
          AND TRY_CONVERT(DECIMAL(19,12), l.meta_referencia) = c.meta
          AND TRY_CONVERT(DECIMAL(19,12), l.resultado_calculado) = c.realizado
          AND TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido) = c.percentual_novo
    ) <> 3
        THROW 50014, 'A validacao posterior dos percentuais do IEO falhou.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

/* Resultado posterior e contagens de segurança. */
SELECT
    l.id,
    l.competencia,
    TRY_CONVERT(DECIMAL(19,12), l.meta_referencia) AS meta_preservada,
    TRY_CONVERT(DECIMAL(19,12), l.resultado_calculado) AS realizado_preservado,
    TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido) AS atingido_corrigido,
    l.status
FROM dbo.lancamentos AS l
JOIN @correcoes AS c ON c.competencia = l.competencia
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
ORDER BY l.competencia;

SELECT
    @total_indicadores_antes AS indicadores_antes,
    (SELECT COUNT_BIG(*) FROM dbo.indicadores) AS indicadores_depois,
    @total_lancamentos_antes AS lancamentos_antes,
    (SELECT COUNT_BIG(*) FROM dbo.lancamentos) AS lancamentos_depois,
    @total_iniciativas_antes AS iniciativas_antes,
    (SELECT COUNT_BIG(*) FROM dbo.iniciativas_estrategicas) AS iniciativas_depois,
    @total_iniciativas_homologacoes_antes AS iniciativas_homologacoes_antes,
    (SELECT COUNT_BIG(*) FROM dbo.iniciativas_homologacoes) AS iniciativas_homologacoes_depois,
    @total_iniciativas_evidencias_antes AS iniciativas_evidencias_antes,
    (SELECT COUNT_BIG(*) FROM dbo.iniciativas_evidencias) AS iniciativas_evidencias_depois;

SELECT
    JSON_VALUE(j.[value], '$.mes') AS mes,
    JSON_VALUE(j.[value], '$.metaMensal') AS meta_mensal_preservada,
    JSON_VALUE(j.[value], '$.detalhesMetaMensal') AS detalhes_meta_mensal
FROM dbo.configuracoes AS c
CROSS APPLY OPENJSON(c.valor_json) AS j
WHERE c.chave = N'metas'
  AND JSON_VALUE(j.[value], '$.indicadorId') = @indicador_id
  AND TRY_CONVERT(INT, JSON_VALUE(j.[value], '$.ano')) = 2026
  AND TRY_CONVERT(INT, JSON_VALUE(j.[value], '$.mes')) IN (1, 2, 3)
ORDER BY TRY_CONVERT(INT, JSON_VALUE(j.[value], '$.mes'));

