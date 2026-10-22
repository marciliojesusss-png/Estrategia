/*
  Indicador 17 - Repasse Social
  - carrega exclusivamente julho e agosto/2026 como posicoes acumuladas;
  - mantem ambos Em preenchimento, sem homologacao ou evidencia fisica;
  - preserva setembro/2026, a configuracao da curva e todos os demais registros.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'17';
    DECLARE @julhoId NVARCHAR(100) = N'199';
    DECLARE @agostoId NVARCHAR(100) = N'200';
    DECLARE @junho DECIMAL(19, 2) = CAST(4615037076.03 AS DECIMAL(19, 2));
    DECLARE @julho DECIMAL(19, 2) = CAST(5374023216.12 AS DECIMAL(19, 2));
    DECLARE @agosto DECIMAL(19, 2) = CAST(6147750537.47 AS DECIMAL(19, 2));
    DECLARE @setembro DECIMAL(19, 2) = CAST(7095683438.69 AS DECIMAL(19, 2));
    DECLARE @metaJulho DECIMAL(19, 2) = CAST(5335136942.72 AS DECIMAL(19, 2));
    DECLARE @metaAgosto DECIMAL(19, 2) = CAST(6121095220.48 AS DECIMAL(19, 2));
    DECLARE @metaSetembro DECIMAL(19, 2) = CAST(7165115749.39 AS DECIMAL(19, 2));
    DECLARE @atingimentoJulho DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), @julho / @metaJulho);
    DECLARE @atingimentoAgosto DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), @agosto / @metaAgosto);
    DECLARE @observacaoJulho NVARCHAR(MAX) = N'Posição acumulada oficial de julho/2026: R$ 5.374.023.216,12.';
    DECLARE @observacaoAgosto NVARCHAR(MAX) = N'Posição acumulada oficial de agosto/2026: R$ 6.147.750.537,47.';
    DECLARE @referenciaJulho NVARCHAR(MAX) = N'Planilha 16.10 — campos estruturados de julho/2026.';
    DECLARE @referenciaAgosto NVARCHAR(MAX) = N'Planilha 16.10 — campos estruturados de agosto/2026.';
    DECLARE @dadosJulho NVARCHAR(MAX);
    DECLARE @dadosAgosto NVARCHAR(MAX);
    DECLARE @regrasIndicadores NVARCHAR(MAX);
    DECLARE @regraIndicador17 NVARCHAR(MAX);
    DECLARE @linhasLancamento INT;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
        THROW 51101, 'Pre-condicao invalida: estrutura obrigatoria ausente.', 1;

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
        THROW 51102, 'Pre-condicao invalida: campos derivados nao possuem armazenamento textual compativel.', 1;

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
        THROW 51103, 'Pre-condicao invalida: identidade ou escopo vigente do indicador 17 diverge do autorizado.', 1;

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
        THROW 51104, 'Pre-condicao invalida: lancamentos 193 a 201 nao estao integros.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = N'198'
          AND indicador_id = @indicadorId
          AND competencia = N'2026-06'
          AND ano = 2026
          AND mes = 6
          AND status = N'Homologado'
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = @junho
    )
        THROW 51105, 'Pre-condicao invalida: posicao homologada de junho diverge da base da conciliacao.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @julhoId
          AND indicador_id = @indicadorId
          AND competencia = N'2026-07'
          AND ano = 2026
          AND mes = 7
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND status = N'Não iniciado'
          AND versao_atual = 1
          AND dados_entrada_json = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(5335136943.00 AS DECIMAL(19, 2))
          AND percentual_atingido IS NULL
          AND situacao IS NULL
          AND evidencia_id IS NULL
          AND ISNULL(observacao_unidade, N'') = N''
          AND ISNULL(referencia_evidencia, N'') = N''
    )
        THROW 51106, 'Pre-condicao invalida: lancamento 199 ja possui conteudo ou estado divergente.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @agostoId
          AND indicador_id = @indicadorId
          AND competencia = N'2026-08'
          AND ano = 2026
          AND mes = 8
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND status = N'Não iniciado'
          AND versao_atual = 1
          AND dados_entrada_json = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(6121095220.00 AS DECIMAL(19, 2))
          AND percentual_atingido IS NULL
          AND situacao IS NULL
          AND evidencia_id IS NULL
          AND ISNULL(observacao_unidade, N'') = N''
          AND ISNULL(referencia_evidencia, N'') = N''
    )
        THROW 51107, 'Pre-condicao invalida: lancamento 200 ja possui conteudo ou estado divergente.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (@julhoId, @agostoId))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (@julhoId, @agostoId))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (@julhoId, @agostoId))
        THROW 51108, 'Pre-condicao invalida: julho ou agosto ja possui homologacao, retificacao ou evidencia.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = N'201'
          AND indicador_id = @indicadorId
          AND competencia = N'2026-09'
          AND status = N'Em preenchimento'
          AND versao_atual = 1
          AND evidencia_id IS NULL
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = @setembro
          AND JSON_VALUE(dados_entrada_json, '$.dataBaseApuracao') = N'2026-09-30'
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_calculado) = @setembro
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_oficial) = @setembro
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaSetembro
          AND situacao = N'Abaixo da meta'
    )
        THROW 51109, 'Pre-condicao invalida: setembro nao corresponde a carga anteriormente confirmada.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51110, 'Pre-condicao invalida: configuracao regrasIndicadores ausente ou duplicada.', 1;

    SELECT @regrasIndicadores = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'regrasIndicadores';

    IF ISJSON(@regrasIndicadores) <> 1
        THROW 51111, 'Pre-condicao invalida: regrasIndicadores nao contem JSON valido.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@regrasIndicadores) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 1
        THROW 51112, 'Pre-condicao invalida: regra do indicador 17 ausente ou ambigua.', 1;

    SELECT @regraIndicador17 = value
    FROM OPENJSON(@regrasIndicadores)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF JSON_VALUE(@regraIndicador17, '$.tipoCalculo') <> N'valor_financeiro_acumulado'
       OR JSON_VALUE(@regraIndicador17, '$.tipoConsolidacao') <> N'ultima_posicao_acumulada'
       OR JSON_VALUE(@regraIndicador17, '$.parametrosCalculo.valorAcumuladoCampo') <> N'repasseSocialAcumuladoCompetencia'
       OR JSON_VALUE(@regraIndicador17, '$.parametrosCalculo.metaTipo') <> N'curva_acumulada_por_competencia'
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraIndicador17, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-07"')) <> @metaJulho
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraIndicador17, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-08"')) <> @metaAgosto
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraIndicador17, '$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-09"')) <> @metaSetembro
       OR JSON_VALUE(@regraIndicador17, '$.parametrosCalculo.priorizarMetaCurvaConfigurada') <> N'true'
       OR JSON_QUERY(@regraIndicador17, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
        THROW 51113, 'Pre-condicao invalida: curva ou fechamentos do indicador 17 divergem da configuracao autorizada.', 1;

    SELECT @dadosJulho = (
        SELECT
            @julho AS repasseSocialAcumuladoCompetencia,
            N'2026-07-31' AS dataBaseApuracao
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @dadosAgosto = (
        SELECT
            @agosto AS repasseSocialAcumuladoCompetencia,
            N'2026-08-31' AS dataBaseApuracao
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.lancamentos
    SET dados_entrada_json = CASE id WHEN @julhoId THEN @dadosJulho ELSE @dadosAgosto END,
        resultado_calculado = CONVERT(NVARCHAR(100), CASE id WHEN @julhoId THEN @julho ELSE @agosto END),
        resultado_oficial = CONVERT(NVARCHAR(100), CASE id WHEN @julhoId THEN @julho ELSE @agosto END),
        meta_referencia = CONVERT(NVARCHAR(100), CASE id WHEN @julhoId THEN @metaJulho ELSE @metaAgosto END),
        percentual_atingido = CONVERT(NVARCHAR(100), CASE id WHEN @julhoId THEN @atingimentoJulho ELSE @atingimentoAgosto END),
        situacao = N'Atingido',
        status = N'Em preenchimento',
        observacao_unidade = CASE id WHEN @julhoId THEN @observacaoJulho ELSE @observacaoAgosto END,
        referencia_evidencia = CASE id WHEN @julhoId THEN @referenciaJulho ELSE @referenciaAgosto END,
        evidencia_id = NULL,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE id IN (@julhoId, @agostoId);

    SET @linhasLancamento = @@ROWCOUNT;
    IF @linhasLancamento <> 2
        THROW 51114, 'Validacao falhou: carga nao alterou exatamente os lancamentos 199 e 200.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @julhoId
          AND indicador_id = @indicadorId
          AND competencia = N'2026-07'
          AND status = N'Em preenchimento'
          AND versao_atual = 1
          AND evidencia_id IS NULL
          AND ISJSON(dados_entrada_json) = 1
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = @julho
          AND JSON_VALUE(dados_entrada_json, '$.dataBaseApuracao') = N'2026-07-31'
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_calculado) = @julho
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_oficial) = @julho
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaJulho
          AND TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) = @atingimentoJulho
          AND situacao = N'Atingido'
          AND observacao_unidade = @observacaoJulho
          AND referencia_evidencia = @referenciaJulho
    )
        THROW 51115, 'Validacao falhou: campos finais de julho divergem do autorizado.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @agostoId
          AND indicador_id = @indicadorId
          AND competencia = N'2026-08'
          AND status = N'Em preenchimento'
          AND versao_atual = 1
          AND evidencia_id IS NULL
          AND ISJSON(dados_entrada_json) = 1
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = @agosto
          AND JSON_VALUE(dados_entrada_json, '$.dataBaseApuracao') = N'2026-08-31'
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_calculado) = @agosto
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_oficial) = @agosto
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaAgosto
          AND TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) = @atingimentoAgosto
          AND situacao = N'Atingido'
          AND observacao_unidade = @observacaoAgosto
          AND referencia_evidencia = @referenciaAgosto
    )
        THROW 51116, 'Validacao falhou: campos finais de agosto divergem do autorizado.', 1;

    IF CONVERT(DECIMAL(10, 2), ROUND(@atingimentoJulho * 100, 2)) <> CAST(100.73 AS DECIMAL(10, 2))
       OR CONVERT(DECIMAL(10, 2), ROUND(@atingimentoAgosto * 100, 2)) <> CAST(100.44 AS DECIMAL(10, 2))
        THROW 51117, 'Validacao falhou: percentuais de julho ou agosto divergem de 100,73% e 100,44%.', 1;

    IF @julho - @junho <> CAST(758986140.09 AS DECIMAL(19, 2))
       OR @agosto - @julho <> CAST(773727321.35 AS DECIMAL(19, 2))
       OR @setembro - @agosto <> CAST(947932901.22 AS DECIMAL(19, 2))
        THROW 51118, 'Validacao falhou: conciliacao mensal das posicoes acumuladas diverge da fonte.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (@julhoId, @agostoId)
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (@julhoId, @agostoId)
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (@julhoId, @agostoId)
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (@julhoId, @agostoId)
    )
        THROW 51119, 'Validacao falhou: outro lancamento foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes EXCEPT SELECT * FROM #configuracoesAntes)
       OR EXISTS (SELECT * FROM #configuracoesAntes EXCEPT SELECT * FROM dbo.configuracoes)
        THROW 51120, 'Validacao falhou: alguma configuracao foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
        THROW 51121, 'Validacao falhou: homologacao criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
        THROW 51122, 'Validacao falhou: retificacao criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
        THROW 51123, 'Validacao falhou: evidencia criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id = N'19' EXCEPT SELECT * FROM #indicador19Antes)
       OR EXISTS (SELECT * FROM #indicador19Antes EXCEPT SELECT * FROM dbo.indicadores WHERE id = N'19')
        THROW 51124, 'Validacao falhou: indicador 19 foi alterado.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (@julhoId, @agostoId))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (@julhoId, @agostoId))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (@julhoId, @agostoId))
        THROW 51125, 'Validacao falhou: a carga criou registro de governanca ou evidencia fisica.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @linhasLancamento AS lancamentos_alterados,
        CAST(0 AS INT) AS configuracoes_alteradas,
        CAST(0 AS INT) AS homologacoes_criadas,
        CAST(0 AS INT) AS retificacoes_criadas,
        CAST(0 AS INT) AS evidencias_criadas;

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
        CONVERT(DECIMAL(10, 2), ROUND(TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) * 100, 2)) AS percentual_exibicao,
        situacao,
        observacao_unidade,
        referencia_evidencia,
        evidencia_id
    FROM dbo.lancamentos
    WHERE id IN (N'198', N'199', N'200', N'201')
    ORDER BY id;

    SELECT
        @julho - @junho AS diferenca_junho_julho,
        @agosto - @julho AS diferenca_julho_agosto,
        @setembro - @agosto AS diferenca_agosto_setembro,
        JSON_QUERY(@regraIndicador17, '$.parametrosCalculo.mesesFechamentoTrimestral') AS meses_fechamento_preservados;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
