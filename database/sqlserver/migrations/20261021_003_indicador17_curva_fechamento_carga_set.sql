/*
  Indicador 17 — Repasse Social
  - reconcilia os centavos oficiais da curva de junho a setembro/2026;
  - define março, junho, setembro e dezembro como fechamentos trimestrais;
  - carrega somente setembro/2026, sem homologação e sem evidência física;
  - preserva integralmente os lançamentos de janeiro a agosto.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'17';
    DECLARE @lancamentoId NVARCHAR(100) = N'201';
    DECLARE @resultado DECIMAL(19, 2) = CAST(7095683438.69 AS DECIMAL(19, 2));
    DECLARE @metaJunho DECIMAL(19, 2) = CAST(4545104157.26 AS DECIMAL(19, 2));
    DECLARE @metaJulho DECIMAL(19, 2) = CAST(5335136942.72 AS DECIMAL(19, 2));
    DECLARE @metaAgosto DECIMAL(19, 2) = CAST(6121095220.48 AS DECIMAL(19, 2));
    DECLARE @metaSetembro DECIMAL(19, 2) = CAST(7165115749.39 AS DECIMAL(19, 2));
    DECLARE @atingimento DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), @resultado / @metaSetembro);
    DECLARE @referencia NVARCHAR(MAX) = N'Informe oficial de acompanhamento do 3TRI/2026';
    DECLARE @observacao NVARCHAR(MAX) = N'Posição acumulada oficial do 3TRI/2026: R$ 7.095.683.438,69.';
    DECLARE @dados NVARCHAR(MAX);
    DECLARE @configuracaoAntes NVARCHAR(MAX);
    DECLARE @configuracaoDepois NVARCHAR(MAX);
    DECLARE @regraAntes NVARCHAR(MAX);
    DECLARE @regraDepois NVARCHAR(MAX);
    DECLARE @regraIndex INT;
    DECLARE @linhasConfiguracao INT;
    DECLARE @linhasLancamento INT;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
        THROW 51001, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = N'dbo'
          AND TABLE_NAME = N'lancamentos'
          AND COLUMN_NAME IN (N'resultado_calculado', N'resultado_oficial', N'meta_referencia', N'percentual_atingido')
          AND DATA_TYPE NOT IN (N'nvarchar', N'varchar')
    ) OR (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = N'dbo'
          AND TABLE_NAME = N'lancamentos'
          AND COLUMN_NAME IN (N'resultado_calculado', N'resultado_oficial', N'meta_referencia', N'percentual_atingido')
    ) <> 4
        THROW 51002, 'Pré-condição inválida: campos derivados não possuem armazenamento textual compatível.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND nome = N'Repasse Social'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND tipo_calculo = N'valor_financeiro_acumulado'
    )
        THROW 51003, 'Pré-condição inválida: identidade ou escopo vigente do indicador 17 diverge do autorizado.', 1;

    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #indicador19Antes FROM dbo.indicadores WHERE id = N'19';

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK)
        WHERE id IN (N'193', N'194', N'195', N'196', N'197', N'198', N'199', N'200', N'201')
    ) <> 9
        THROW 51004, 'Pré-condição inválida: lançamentos 193 a 201 não estão íntegros.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND indicador_id = @indicadorId
          AND competencia = N'2026-09'
          AND ano = 2026
          AND mes = 9
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND status = N'Não iniciado'
          AND versao_atual = 1
          AND dados_entrada_json = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(7165115749.00 AS DECIMAL(19, 2))
          AND percentual_atingido IS NULL
          AND situacao IS NULL
          AND evidencia_id IS NULL
          AND ISNULL(observacao_unidade, N'') = N''
          AND ISNULL(referencia_evidencia, N'') = N''
    )
        THROW 51005, 'Pré-condição inválida: lançamento 201 já possui conteúdo ou estado divergente.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos WHERE id = N'199' AND indicador_id = @indicadorId
          AND competencia = N'2026-07' AND status = N'Não iniciado' AND versao_atual = 1
          AND dados_entrada_json = N'[]' AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao IS NULL AND evidencia_id IS NULL
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos WHERE id = N'200' AND indicador_id = @indicadorId
          AND competencia = N'2026-08' AND status = N'Não iniciado' AND versao_atual = 1
          AND dados_entrada_json = N'[]' AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao IS NULL AND evidencia_id IS NULL
    )
        THROW 51006, 'Pré-condição inválida: julho ou agosto possui realizado ou estado divergente.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id = @lancamentoId)
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id = @lancamentoId)
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id = @lancamentoId)
        THROW 51007, 'Pré-condição inválida: setembro já possui homologação, retificação ou evidência.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51008, 'Pré-condição inválida: configuração regrasIndicadores ausente ou duplicada.', 1;

    SELECT @configuracaoAntes = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'regrasIndicadores';

    IF ISJSON(@configuracaoAntes) <> 1
        THROW 51009, 'Pré-condição inválida: regrasIndicadores não contém JSON válido.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@configuracaoAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 1
        THROW 51010, 'Pré-condição inválida: regra do indicador 17 ausente ou ambígua.', 1;

    SELECT
        @regraIndex = TRY_CONVERT(INT, [key]),
        @regraAntes = value
    FROM OPENJSON(@configuracaoAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF JSON_VALUE(@regraAntes, '$.tipoCalculo') <> N'valor_financeiro_acumulado'
       OR JSON_VALUE(@regraAntes, '$.tipoConsolidacao') <> N'ultima_posicao_acumulada'
       OR JSON_VALUE(@regraAntes, '$.parametrosCalculo.valorAcumuladoCampo') <> N'repasseSocialAcumuladoCompetencia'
       OR JSON_VALUE(@regraAntes, '$.parametrosCalculo.metaTipo') <> N'curva_acumulada_por_competencia'
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-06"')) <> CAST(4545104157.00 AS DECIMAL(19, 2))
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-07"')) <> CAST(5335136943.00 AS DECIMAL(19, 2))
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-08"')) <> CAST(6121095220.00 AS DECIMAL(19, 2))
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-09"')) <> CAST(7165115749.00 AS DECIMAL(19, 2))
       OR JSON_QUERY(@regraAntes, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
        THROW 51011, 'Pré-condição inválida: regra ou curva atual do indicador 17 diverge do diagnóstico aprovado.', 1;

    SET @regraDepois = JSON_MODIFY(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-06"', @metaJunho);
    SET @regraDepois = JSON_MODIFY(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-07"', @metaJulho);
    SET @regraDepois = JSON_MODIFY(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-08"', @metaAgosto);
    SET @regraDepois = JSON_MODIFY(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-09"', @metaSetembro);
    SET @regraDepois = JSON_MODIFY(@regraDepois, '$.parametrosCalculo.priorizarMetaCurvaConfigurada', CAST(1 AS BIT));
    SET @regraDepois = JSON_MODIFY(
        @regraDepois,
        '$.parametrosCalculo.mesesFechamentoTrimestral',
        JSON_QUERY(N'[3,6,9,12]')
    );

    DECLARE @sqlSubstituirRegra NVARCHAR(MAX) = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[',
        CONVERT(NVARCHAR(10), @regraIndex),
        N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql
        @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada = @configuracaoAntes,
        @regra = @regraDepois,
        @saida = @configuracaoDepois OUTPUT;

    UPDATE dbo.configuracoes
    SET valor_json = @configuracaoDepois,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE chave = N'regrasIndicadores';

    SET @linhasConfiguracao = @@ROWCOUNT;
    IF @linhasConfiguracao <> 1
        THROW 51012, 'Validação falhou: configuração não alterou exatamente uma linha.', 1;

    SELECT @dados = (
        SELECT
            @resultado AS repasseSocialAcumuladoCompetencia,
            N'2026-09-30' AS dataBaseApuracao
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dados,
        resultado_calculado = CONVERT(NVARCHAR(100), @resultado),
        resultado_oficial = CONVERT(NVARCHAR(100), @resultado),
        meta_referencia = CONVERT(NVARCHAR(100), @metaSetembro),
        percentual_atingido = CONVERT(NVARCHAR(100), @atingimento),
        situacao = N'Abaixo da meta',
        status = N'Em preenchimento',
        observacao_unidade = @observacao,
        referencia_evidencia = @referencia,
        evidencia_id = NULL,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE id = @lancamentoId;

    SET @linhasLancamento = @@ROWCOUNT;
    IF @linhasLancamento <> 1
        THROW 51013, 'Validação falhou: carga não alterou exatamente o lançamento 201.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND indicador_id = @indicadorId
          AND competencia = N'2026-09'
          AND status = N'Em preenchimento'
          AND versao_atual = 1
          AND evidencia_id IS NULL
          AND ISJSON(dados_entrada_json) = 1
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = @resultado
          AND JSON_VALUE(dados_entrada_json, '$.dataBaseApuracao') = N'2026-09-30'
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_calculado) = @resultado
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_oficial) = @resultado
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaSetembro
          AND TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) = @atingimento
          AND situacao = N'Abaixo da meta'
          AND observacao_unidade = @observacao
          AND referencia_evidencia = @referencia
    )
        THROW 51014, 'Validação falhou: campos finais de setembro divergem do autorizado.', 1;

    IF CONVERT(DECIMAL(10, 2), ROUND(@atingimento * 100, 2)) <> CAST(99.03 AS DECIMAL(10, 2))
        THROW 51015, 'Validação falhou: atingimento de setembro não arredonda para 99,03%.', 1;

    IF TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-06"')) <> @metaJunho
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-07"')) <> @metaJulho
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-08"')) <> @metaAgosto
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-09"')) <> @metaSetembro
       OR JSON_VALUE(@regraDepois, '$.parametrosCalculo.priorizarMetaCurvaConfigurada') <> N'true'
       OR JSON_QUERY(@regraDepois, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
        THROW 51016, 'Validação falhou: curva ou fechamentos trimestrais não foram configurados corretamente.', 1;

    IF EXISTS (
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia'))
        WHERE [key] NOT IN (N'2026-06', N'2026-07', N'2026-08', N'2026-09')
        EXCEPT
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia'))
        WHERE [key] NOT IN (N'2026-06', N'2026-07', N'2026-08', N'2026-09')
    ) OR EXISTS (
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia'))
        WHERE [key] NOT IN (N'2026-06', N'2026-07', N'2026-08', N'2026-09')
        EXCEPT
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia'))
        WHERE [key] NOT IN (N'2026-06', N'2026-07', N'2026-08', N'2026-09')
    )
        THROW 51017, 'Validação falhou: outra competência da curva foi alterada.', 1;

    IF EXISTS (
        SELECT [key], value FROM OPENJSON(@configuracaoDepois) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key], value FROM OPENJSON(@configuracaoAntes) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key], value FROM OPENJSON(@configuracaoAntes) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key], value FROM OPENJSON(@configuracaoDepois) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
    )
        THROW 51018, 'Validação falhou: regra de outro indicador foi alterada.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId
    )
        THROW 51019, 'Validação falhou: outro lançamento foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores'
        EXCEPT
        SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores'
    ) OR EXISTS (
        SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores'
        EXCEPT
        SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores'
    )
        THROW 51020, 'Validação falhou: outra configuração foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
        THROW 51021, 'Validação falhou: homologação criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
        THROW 51022, 'Validação falhou: retificação criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
        THROW 51023, 'Validação falhou: evidência criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id = N'19' EXCEPT SELECT * FROM #indicador19Antes)
       OR EXISTS (SELECT * FROM #indicador19Antes EXCEPT SELECT * FROM dbo.indicadores WHERE id = N'19')
        THROW 51024, 'Validação falhou: indicador 19 foi alterado.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @linhasConfiguracao AS configuracoes_alteradas,
        @linhasLancamento AS lancamentos_alterados,
        CAST(0 AS INT) AS homologacoes_criadas,
        CAST(0 AS INT) AS retificacoes_criadas,
        CAST(0 AS INT) AS evidencias_criadas;

    SELECT
        c.[key] AS competencia,
        a.value AS valor_antes,
        c.value AS valor_depois
    FROM OPENJSON(JSON_QUERY(@regraDepois, '$.parametrosCalculo.metasAcumuladasPorCompetencia')) AS c
    INNER JOIN OPENJSON(JSON_QUERY(@regraAntes, '$.parametrosCalculo.metasAcumuladasPorCompetencia')) AS a
        ON a.[key] = c.[key]
    WHERE c.[key] IN (N'2026-06', N'2026-07', N'2026-08', N'2026-09')
    ORDER BY c.[key];

    SELECT
        JSON_QUERY(@regraDepois, '$.parametrosCalculo.mesesFechamentoTrimestral') AS meses_fechamento,
        JSON_VALUE(@regraDepois, '$.parametrosCalculo.priorizarMetaCurvaConfigurada') AS curva_oficial_prioritaria;

    SELECT
        id,
        competencia,
        status,
        versao_atual,
        dados_entrada_json,
        resultado_calculado,
        resultado_oficial,
        meta_referencia,
        percentual_atingido,
        situacao,
        observacao_unidade,
        referencia_evidencia,
        evidencia_id
    FROM dbo.lancamentos
    WHERE id IN (N'199', N'200', N'201')
    ORDER BY id;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
