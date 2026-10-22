/*
  Indicador 19 - Incentivo Socioambiental
  - configura mar/jun/set/dez como fechamentos trimestrais;
  - carrega exclusivamente julho, agosto e setembro/2026;
  - preserva o resultado financeiro e o percentual de atingimento em campos distintos;
  - não cria homologação, retificação ou evidência física;
  - preserva integralmente janeiro a junho e o indicador 16.

  IMPORTANTE: preparar e revisar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'19';
    DECLARE @julhoId NVARCHAR(100) = N'223';
    DECLARE @agostoId NVARCHAR(100) = N'224';
    DECLARE @setembroId NVARCHAR(100) = N'225';
    DECLARE @realizadoFinanceiro DECIMAL(19, 2) = CAST(190000.00 AS DECIMAL(19, 2));
    DECLARE @metaFinanceira DECIMAL(19, 2) = CAST(1305400.00 AS DECIMAL(19, 2));
    DECLARE @lucroLiquidoReferencia DECIMAL(19, 2) = CAST(1305400000.00 AS DECIMAL(19, 2));
    DECLARE @resultadoPercentual DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), @realizadoFinanceiro / @lucroLiquidoReferencia);
    DECLARE @atingimento DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), @realizadoFinanceiro / @metaFinanceira);
    DECLARE @referencia NVARCHAR(MAX) = N'Informe DILOT/GERIN nº 0078/2026 e NT GENOL 0011/2026.';
    DECLARE @dadosJulho NVARCHAR(MAX);
    DECLARE @dadosAgosto NVARCHAR(MAX);
    DECLARE @dadosSetembro NVARCHAR(MAX);
    DECLARE @configuracaoAntes NVARCHAR(MAX);
    DECLARE @configuracaoDepois NVARCHAR(MAX);
    DECLARE @regraAntes NVARCHAR(MAX);
    DECLARE @regraDepois NVARCHAR(MAX);
    DECLARE @regraIndex INT;
    DECLARE @linhasConfiguracao INT;
    DECLARE @linhasLancamentos INT;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
        THROW 51101, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN'
          AND tipo_calculo = N'investimento_socioambiental'
    )
        THROW 51102, 'Pré-condição inválida: identidade do indicador 19 diverge do escopo autorizado.', 1;

    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK)
        WHERE id IN (N'217', N'218', N'219', N'220', N'221', N'222')
          AND indicador_id = @indicadorId
    ) <> 6
        THROW 51103, 'Pré-condição inválida: janeiro a junho do indicador 19 não estão íntegros.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id IN (N'217', N'218', N'219')
          AND (
              indicador_id <> @indicadorId
              OR status <> N'Homologado'
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), meta_referencia), -1) <> CAST(0 AS DECIMAL(19, 2))
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), resultado_calculado), -1) <> CAST(0 AS DECIMAL(19, 2))
          )
    )
        THROW 51104, 'Pré-condição inválida: posição homologada do 1TRI diverge do diagnóstico.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id IN (N'220', N'221', N'222')
          AND (
              indicador_id <> @indicadorId
              OR status <> N'Homologado'
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), meta_referencia), -1) <> CAST(652700 AS DECIMAL(19, 2))
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), resultado_calculado), -1) <> CAST(0 AS DECIMAL(19, 2))
              OR ISNULL(TRY_CONVERT(DECIMAL(38, 18), percentual_atingido), -1) <> CAST(0 AS DECIMAL(38, 18))
          )
    )
        THROW 51105, 'Pré-condição inválida: posição homologada do 2TRI diverge do diagnóstico.', 1;

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK)
        WHERE id IN (@julhoId, @agostoId, @setembroId)
          AND indicador_id = @indicadorId
          AND competencia IN (N'2026-07', N'2026-08', N'2026-09')
          AND status = N'Não iniciado'
          AND versao_atual = 1
          AND dados_entrada_json = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaFinanceira
          AND percentual_atingido IS NULL
          AND situacao IS NULL
          AND evidencia_id IS NULL
    ) <> 3
        THROW 51106, 'Pré-condição inválida: IDs 223 a 225 já possuem conteúdo ou estado divergente.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (@julhoId, @agostoId, @setembroId)
    ) OR EXISTS (
        SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (@julhoId, @agostoId, @setembroId)
    ) OR EXISTS (
        SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (@julhoId, @agostoId, @setembroId)
    )
        THROW 51107, 'Pré-condição inválida: o 3TRI já possui homologação, retificação ou evidência física.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51108, 'Pré-condição inválida: configuração regrasIndicadores ausente ou duplicada.', 1;

    SELECT @configuracaoAntes = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'regrasIndicadores';

    IF ISJSON(@configuracaoAntes) <> 1
        THROW 51109, 'Pré-condição inválida: regrasIndicadores não contém JSON válido.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@configuracaoAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 1
        THROW 51110, 'Pré-condição inválida: regra do indicador 19 ausente ou ambígua.', 1;

    SELECT
        @regraIndex = TRY_CONVERT(INT, [key]),
        @regraAntes = value
    FROM OPENJSON(@configuracaoAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF ISNULL(JSON_VALUE(@regraAntes, '$.tipoCalculo'), N'') <> N'investimento_socioambiental'
       OR ISNULL(JSON_VALUE(@regraAntes, '$.tipoConsolidacao'), N'') <> N'valor_acumulado'
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.lucroLiquidoReferencia')), -1) <> @lucroLiquidoReferencia
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 6), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaPercentualLucro')), -1) <> CAST(0 AS DECIMAL(19, 6))
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaValorAcumulado')), -1) <> CAST(0 AS DECIMAL(19, 2))
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 6), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaPercentualLucro')), -1) <> CAST(0.0005 AS DECIMAL(19, 6))
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaValorAcumulado')), -1) <> CAST(652700 AS DECIMAL(19, 2))
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 6), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaPercentualLucro')), -1) <> CAST(0.001 AS DECIMAL(19, 6))
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaValorAcumulado')), -1) <> @metaFinanceira
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 6), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaPercentualLucro')), -1) <> CAST(0.0033 AS DECIMAL(19, 6))
       OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraAntes, '$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado')), -1) <> CAST(4307900 AS DECIMAL(19, 2))
       OR JSON_QUERY(@regraAntes, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
        THROW 51111, 'Pré-condição inválida: regra ou curva vigente do indicador 19 diverge do diagnóstico.', 1;

    SET @regraDepois = JSON_MODIFY(
        @regraAntes,
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
        THROW 51112, 'Validação falhou: configuração não alterou exatamente uma linha.', 1;

    SELECT @dadosJulho = (
        SELECT
            N'Brasil Ladies Cup 2026' AS nomeProjetoIncentivoSocioambiental,
            N'Patrocínio socioambiental' AS tipoIncentivoSocioambiental,
            N'Investimento realizado' AS statusProjetoIncentivoSocioambiental,
            CAST(190000.00 AS DECIMAL(19, 2)) AS valorInvestidoMes,
            @realizadoFinanceiro AS valorInvestidoAcumuladoCompetencia,
            N'' AS dataInvestimentoSocioambiental,
            N'2026-07-31' AS dataBaseApuracao,
            N'Investimento de R$ 190.000,00 no Brasil Ladies Cup 2026, realizado de 09 a 12/07/2026 em Campinas/SP, com recursos do FDL e aprovação pela alçada competente.' AS descricaoAndamentoIncentivoSocioambiental,
            @referencia AS evidenciaIncentivoSocioambiental,
            N'Posição acumulada de julho/2026: R$ 190.000,00.' AS observacaoArea
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @dadosAgosto = (
        SELECT
            N'Brasil Ladies Cup 2026' AS nomeProjetoIncentivoSocioambiental,
            N'Patrocínio socioambiental' AS tipoIncentivoSocioambiental,
            N'Investimento realizado' AS statusProjetoIncentivoSocioambiental,
            CAST(0.00 AS DECIMAL(19, 2)) AS valorInvestidoMes,
            @realizadoFinanceiro AS valorInvestidoAcumuladoCompetencia,
            N'' AS dataInvestimentoSocioambiental,
            N'2026-08-31' AS dataBaseApuracao,
            N'Posição acumulada do investimento realizado no Brasil Ladies Cup 2026, evento de 09 a 12/07/2026 em Campinas/SP, com recursos do FDL e aprovação pela alçada competente.' AS descricaoAndamentoIncentivoSocioambiental,
            @referencia AS evidenciaIncentivoSocioambiental,
            N'Sem novo investimento em agosto; posição acumulada mantida em R$ 190.000,00.' AS observacaoArea
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @dadosSetembro = (
        SELECT
            N'Brasil Ladies Cup 2026' AS nomeProjetoIncentivoSocioambiental,
            N'Patrocínio socioambiental' AS tipoIncentivoSocioambiental,
            N'Investimento realizado' AS statusProjetoIncentivoSocioambiental,
            CAST(0.00 AS DECIMAL(19, 2)) AS valorInvestidoMes,
            @realizadoFinanceiro AS valorInvestidoAcumuladoCompetencia,
            N'' AS dataInvestimentoSocioambiental,
            N'2026-09-30' AS dataBaseApuracao,
            N'Fechamento do 3TRI/2026 com posição acumulada do investimento no Brasil Ladies Cup 2026, evento de 09 a 12/07/2026 em Campinas/SP, com recursos do FDL e aprovação pela alçada competente.' AS descricaoAndamentoIncentivoSocioambiental,
            @referencia AS evidenciaIncentivoSocioambiental,
            N'Posição oficial do 3TRI/2026: R$ 190.000,00 acumulados.' AS observacaoArea
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.lancamentos
    SET dados_entrada_json = CASE id
            WHEN @julhoId THEN @dadosJulho
            WHEN @agostoId THEN @dadosAgosto
            WHEN @setembroId THEN @dadosSetembro
        END,
        resultado_calculado = CONVERT(NVARCHAR(100), @realizadoFinanceiro),
        resultado_oficial = CONVERT(NVARCHAR(100), @realizadoFinanceiro),
        meta_referencia = CONVERT(NVARCHAR(100), @metaFinanceira),
        percentual_atingido = CONVERT(NVARCHAR(100), @atingimento),
        situacao = N'Abaixo da meta',
        status = N'Em preenchimento',
        observacao_unidade = CASE id
            WHEN @julhoId THEN N'Posição acumulada de julho/2026: R$ 190.000,00.'
            WHEN @agostoId THEN N'Sem novo investimento em agosto; posição acumulada mantida em R$ 190.000,00.'
            WHEN @setembroId THEN N'Posição oficial do 3TRI/2026: R$ 190.000,00 acumulados.'
        END,
        referencia_evidencia = @referencia,
        evidencia_id = NULL,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE id IN (@julhoId, @agostoId, @setembroId);

    SET @linhasLancamentos = @@ROWCOUNT;
    IF @linhasLancamentos <> 3
        THROW 51113, 'Validação falhou: carga não alterou exatamente três lançamentos.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id IN (@julhoId, @agostoId, @setembroId)
          AND (
              indicador_id <> @indicadorId
              OR status <> N'Em preenchimento'
              OR versao_atual <> 1
              OR evidencia_id IS NOT NULL
              OR ISJSON(dados_entrada_json) <> 1
              OR ISNULL(JSON_VALUE(dados_entrada_json, '$.nomeProjetoIncentivoSocioambiental'), N'') <> N'Brasil Ladies Cup 2026'
              OR ISNULL(JSON_VALUE(dados_entrada_json, '$.statusProjetoIncentivoSocioambiental'), N'') <> N'Investimento realizado'
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.valorInvestidoAcumuladoCompetencia')), -1) <> @realizadoFinanceiro
              OR ISNULL(JSON_VALUE(dados_entrada_json, '$.dataInvestimentoSocioambiental'), N'') <> N''
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), resultado_calculado), -1) <> @realizadoFinanceiro
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), resultado_oficial), -1) <> @realizadoFinanceiro
              OR ISNULL(TRY_CONVERT(DECIMAL(19, 2), meta_referencia), -1) <> @metaFinanceira
              OR TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) IS NULL
              OR ABS(TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) - @atingimento) > CAST(0.000000000000001 AS DECIMAL(38, 18))
              OR situacao <> N'Abaixo da meta'
          )
    )
        THROW 51114, 'Validação falhou: campos finais do 3TRI divergem do autorizado.', 1;

    IF TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@dadosJulho, '$.valorInvestidoMes')) <> CAST(190000 AS DECIMAL(19, 2))
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@dadosAgosto, '$.valorInvestidoMes')) <> CAST(0 AS DECIMAL(19, 2))
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@dadosSetembro, '$.valorInvestidoMes')) <> CAST(0 AS DECIMAL(19, 2))
        THROW 51115, 'Validação falhou: distribuição mensal deveria ser 190 mil, zero e zero.', 1;

    IF (
        SELECT SUM(TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.valorInvestidoMes')))
        FROM dbo.lancamentos
        WHERE id IN (@julhoId, @agostoId, @setembroId)
    ) <> @realizadoFinanceiro
        THROW 51116, 'Validação falhou: investimento do 3TRI foi triplicado ou diverge de R$ 190 mil.', 1;

    IF CONVERT(DECIMAL(10, 5), ROUND(@resultadoPercentual * 100, 5)) <> CAST(0.01455 AS DECIMAL(10, 5))
       OR CONVERT(DECIMAL(10, 2), ROUND(@atingimento * 100, 2)) <> CAST(14.55 AS DECIMAL(10, 2))
        THROW 51117, 'Validação falhou: resultado percentual ou atingimento não conferem.', 1;

    IF JSON_QUERY(@regraDepois, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
       OR TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(@regraDepois, '$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado')) <> CAST(4307900 AS DECIMAL(19, 2))
        THROW 51118, 'Validação falhou: fechamentos ou curva documental foram alterados incorretamente.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (@julhoId, @agostoId, @setembroId)
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (@julhoId, @agostoId, @setembroId)
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (@julhoId, @agostoId, @setembroId)
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (@julhoId, @agostoId, @setembroId)
    )
        THROW 51119, 'Validação falhou: outro lançamento foi alterado, inclusive Jan-Jun.', 1;

    IF EXISTS (
        SELECT [key], value FROM OPENJSON(@configuracaoDepois) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key], value FROM OPENJSON(@configuracaoAntes) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key], value FROM OPENJSON(@configuracaoAntes) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key], value FROM OPENJSON(@configuracaoDepois) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
    )
        THROW 51120, 'Validação falhou: regra de outro indicador foi alterada.', 1;

    IF EXISTS (
        SELECT [key], value FROM OPENJSON(@regraDepois)
        WHERE [key] <> N'parametrosCalculo'
        EXCEPT
        SELECT [key], value FROM OPENJSON(@regraAntes)
        WHERE [key] <> N'parametrosCalculo'
    ) OR EXISTS (
        SELECT [key], value FROM OPENJSON(@regraAntes)
        WHERE [key] <> N'parametrosCalculo'
        EXCEPT
        SELECT [key], value FROM OPENJSON(@regraDepois)
        WHERE [key] <> N'parametrosCalculo'
    )
        THROW 51121, 'Validação falhou: propriedade não autorizada da regra do indicador 19 foi alterada.', 1;

    IF EXISTS (
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraDepois, '$.parametrosCalculo'))
        WHERE [key] <> N'mesesFechamentoTrimestral'
        EXCEPT
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraAntes, '$.parametrosCalculo'))
        WHERE [key] <> N'mesesFechamentoTrimestral'
    ) OR EXISTS (
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraAntes, '$.parametrosCalculo'))
        WHERE [key] <> N'mesesFechamentoTrimestral'
        EXCEPT
        SELECT [key], value FROM OPENJSON(JSON_QUERY(@regraDepois, '$.parametrosCalculo'))
        WHERE [key] <> N'mesesFechamentoTrimestral'
    )
        THROW 51122, 'Validação falhou: outra configuração do indicador 19 foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores' EXCEPT SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores')
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores' EXCEPT SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores')
        THROW 51123, 'Validação falhou: outra configuração foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
        THROW 51124, 'Validação falhou: homologação criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
        THROW 51125, 'Validação falhou: retificação criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
        THROW 51126, 'Validação falhou: evidência física criada ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores EXCEPT SELECT * FROM #indicadoresAntes)
       OR EXISTS (SELECT * FROM #indicadoresAntes EXCEPT SELECT * FROM dbo.indicadores)
        THROW 51127, 'Validação falhou: cadastro de indicador foi alterado, inclusive o indicador 16.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @linhasConfiguracao AS configuracoes_alteradas,
        @linhasLancamentos AS lancamentos_alterados,
        CAST(0 AS INT) AS homologacoes_criadas,
        CAST(0 AS INT) AS retificacoes_criadas,
        CAST(0 AS INT) AS evidencias_fisicas_criadas,
        @resultadoPercentual AS resultado_percentual_fracao,
        CONVERT(DECIMAL(10, 5), ROUND(@resultadoPercentual * 100, 5)) AS resultado_percentual_exibicao,
        @atingimento AS atingimento_fracao,
        CONVERT(DECIMAL(10, 2), ROUND(@atingimento * 100, 2)) AS atingimento_exibicao;

    SELECT
        id,
        competencia,
        status,
        versao_atual,
        JSON_VALUE(dados_entrada_json, '$.valorInvestidoMes') AS valor_investido_mes,
        JSON_VALUE(dados_entrada_json, '$.valorInvestidoAcumuladoCompetencia') AS valor_investido_acumulado,
        JSON_VALUE(dados_entrada_json, '$.dataBaseApuracao') AS data_base,
        resultado_calculado,
        resultado_oficial,
        meta_referencia,
        percentual_atingido,
        situacao,
        evidencia_id
    FROM dbo.lancamentos
    WHERE id IN (@julhoId, @agostoId, @setembroId)
    ORDER BY mes;

    SELECT JSON_QUERY(@regraDepois, '$.parametrosCalculo.mesesFechamentoTrimestral') AS meses_fechamento;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
