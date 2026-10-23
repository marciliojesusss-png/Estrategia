/*
  Indicador 17 — Repasse Social

  Correção técnica restrita a:
  - meta_referencia legado de janeiro/2026 (ID 193), armazenado em notação
    científica sem conversão DECIMAL segura;
  - centavos da meta_referencia de junho/2026 (ID 198);
  - tipo_consolidacao do cadastro do indicador;
  - curva do indicador 17 na configuração genérica "metas".

  A periodicidade cadastral permanece inalterada. O acompanhamento é mensal e
  os fechamentos [3,6,9,12] continuam definidos pela regra funcional vigente.

  Esta migration não cria nem altera homologações, evidências, retificações,
  solicitações de reabertura, auditorias, status ou versões.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 51401, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'17';
    DECLARE @metaJaneiro DECIMAL(19, 2) = CAST(737118539.30 AS DECIMAL(19, 2));
    DECLARE @metaJunho DECIMAL(19, 2) = CAST(4545104157.26 AS DECIMAL(19, 2));
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @regras NVARCHAR(MAX);
    DECLARE @regra17 NVARCHAR(MAX);
    DECLARE @indiceMeta INT;
    DECLARE @mes INT;
    DECLARE @meta DECIMAL(19, 2);
    DECLARE @sqlAtualizarMeta NVARCHAR(MAX);
    DECLARE @linhasIndicador INT;
    DECLARE @linhasJaneiro INT;
    DECLARE @linhasJunho INT;
    DECLARE @linhasConfiguracao INT;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 51402, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND nome = N'Repasse Social'
          AND unidade_apuradora = N'SULOT'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND meta_anual = N'≥ R$ 10,4 bilhões'
          AND tipo_calculo = N'valor_financeiro_acumulado'
          AND ISNULL(tipo_consolidacao, N'') = N''
          AND ISNULL(periodicidade, N'') = N'Não especificada'
    )
        THROW 51403, 'Pré-condição inválida: identidade ou cadastro atual do indicador 17 diverge do diagnóstico.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'9' AND nome = N'Vendas com Meio de Pagamento PIX'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'16' AND nome = N'Apoio ao Desenvolvimento Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'19' AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
    )
        THROW 51404, 'Pré-condição inválida: os indicadores protegidos 09, 16 ou 19 divergem do estado autorizado.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (
            N'193',N'194',N'195',N'196',N'197',N'198',N'199',N'200',N'201',N'202',N'203',N'204'
          ) AND indicador_id = @indicadorId) <> 12
        THROW 51405, 'Pré-condição inválida: os lançamentos 193 a 204 do indicador 17 não estão íntegros.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'193' AND indicador_id = @indicadorId AND competencia = N'2026-01'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
          AND status = N'Homologado' AND versao_atual = 1
          AND meta_referencia = N'7.37119e+008'
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = CAST(769496203.10 AS DECIMAL(19, 2))
          AND TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) = CAST(1.043920 AS DECIMAL(38, 18))
          AND situacao = N'Atingido'
    )
        THROW 51406, 'Pré-condição inválida: janeiro/2026 diverge do diagnóstico aprovado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'198' AND indicador_id = @indicadorId AND competencia = N'2026-06'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
          AND status = N'Homologado' AND versao_atual = 1
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(4545104157.00 AS DECIMAL(19, 2))
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = CAST(4615037076.03 AS DECIMAL(19, 2))
          AND TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) = CAST(1.015390 AS DECIMAL(38, 18))
          AND situacao = N'Atingido'
    )
        THROW 51407, 'Pré-condição inválida: junho/2026 diverge do diagnóstico aprovado.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'193',N'194',N'195') AND status = N'Homologado') <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'193',N'194',N'195'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'193',N'194',N'195'))
        THROW 51408, 'Pré-condição inválida: a pendência histórica de JAN–MAR mudou desde o diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'196',N'197',N'198') AND status = N'Homologado') <> 3
       OR (SELECT COUNT(*) FROM dbo.homologacoes WHERE lancamento_id IN (N'196',N'197',N'198')) <> 3
       OR (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id IN (N'196',N'197',N'198')) <> 3
        THROW 51409, 'Pré-condição inválida: a governança real de ABR–JUN diverge do diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'199',N'200',N'201') AND status = N'Em preenchimento') <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'199',N'200',N'201'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'199',N'200',N'201'))
        THROW 51410, 'Pré-condição inválida: JUL–SET não permanecem no acompanhamento diagnosticado.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51411, 'Pré-condição inválida: configurações metas/regrasIndicadores ausentes ou duplicadas.', 1;

    SELECT @metasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'metas';
    SELECT @regras = valor_json FROM dbo.configuracoes WITH (HOLDLOCK) WHERE chave = N'regrasIndicadores';

    IF ISJSON(@metasAntes) <> 1 OR ISJSON(@regras) <> 1
        THROW 51412, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 12
        THROW 51413, 'Pré-condição inválida: a configuração genérica não possui exatamente 12 metas do indicador 17.', 1;

    SELECT @regra17 = value
    FROM OPENJSON(@regras)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF @regra17 IS NULL
       OR JSON_VALUE(@regra17, '$.tipoCalculo') <> N'valor_financeiro_acumulado'
       OR JSON_VALUE(@regra17, '$.tipoConsolidacao') <> N'ultima_posicao_acumulada'
       OR JSON_VALUE(@regra17, '$.parametrosCalculo.priorizarMetaCurvaConfigurada') <> N'true'
       OR JSON_QUERY(@regra17, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
        THROW 51414, 'Pré-condição inválida: regra funcional do indicador 17 diverge do estado soberano.', 1;

    DECLARE @curva TABLE (mes INT PRIMARY KEY, meta DECIMAL(19, 2) NOT NULL);
    INSERT INTO @curva (mes, meta) VALUES
        (1, CAST(737118539.30 AS DECIMAL(19, 2))),
        (2, CAST(1394613495.00 AS DECIMAL(19, 2))),
        (3, CAST(2142991572.00 AS DECIMAL(19, 2))),
        (4, CAST(2926098294.00 AS DECIMAL(19, 2))),
        (5, CAST(3688125380.00 AS DECIMAL(19, 2))),
        (6, CAST(4545104157.26 AS DECIMAL(19, 2))),
        (7, CAST(5335136942.72 AS DECIMAL(19, 2))),
        (8, CAST(6121095220.48 AS DECIMAL(19, 2))),
        (9, CAST(7165115749.39 AS DECIMAL(19, 2))),
        (10, CAST(7982318714.00 AS DECIMAL(19, 2))),
        (11, CAST(8738217864.00 AS DECIMAL(19, 2))),
        (12, CAST(10452751135.00 AS DECIMAL(19, 2)));

    IF EXISTS (
        SELECT 1
        FROM @curva c
        LEFT JOIN OPENJSON(JSON_QUERY(@regra17, '$.parametrosCalculo.metasAcumuladasPorCompetencia')) j
          ON j.[key] = CONCAT(N'2026-', RIGHT(N'0' + CONVERT(NVARCHAR(2), c.mes), 2))
        WHERE j.[key] IS NULL OR TRY_CONVERT(DECIMAL(19, 2), j.value) <> c.meta
    )
        THROW 51415, 'Pré-condição inválida: a curva soberana em regrasIndicadores não contém os valores exatos.', 1;

    IF (
        SELECT COUNT(*)
        FROM @curva c
        INNER JOIN OPENJSON(@metasAntes) j
          ON JSON_VALUE(j.value, '$.indicadorId') = @indicadorId
         AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
         AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.mes')) = c.mes
        WHERE TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(j.value, '$.metaMensal')) <> c.meta
    ) <> 4 OR EXISTS (
        SELECT 1
        FROM @curva c
        INNER JOIN OPENJSON(@metasAntes) j
          ON JSON_VALUE(j.value, '$.indicadorId') = @indicadorId
         AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
         AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.mes')) = c.mes
        WHERE TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(j.value, '$.metaMensal')) <> c.meta
          AND c.mes NOT IN (6, 7, 8, 9)
    )
        THROW 51416, 'Pré-condição inválida: divergências da configuração genérica não estão restritas a JUN–SET.', 1;

    SET @metasDepois = @metasAntes;
    DECLARE cursorCurva CURSOR LOCAL FAST_FORWARD FOR
        SELECT c.mes, c.meta
        FROM @curva c
        INNER JOIN OPENJSON(@metasAntes) j
          ON JSON_VALUE(j.value, '$.indicadorId') = @indicadorId
         AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
         AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.mes')) = c.mes
        WHERE TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(j.value, '$.metaMensal')) <> c.meta
        ORDER BY c.mes;
    OPEN cursorCurva;
    FETCH NEXT FROM cursorCurva INTO @mes, @meta;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @indiceMeta = NULL;
        SELECT @indiceMeta = TRY_CONVERT(INT, [key])
        FROM OPENJSON(@metasDepois)
        WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
          AND TRY_CONVERT(INT, JSON_VALUE(value, '$.ano')) = 2026
          AND TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) = @mes;

        IF @indiceMeta IS NULL
            THROW 51430, 'Pré-condição inválida: competência ausente na configuração genérica de metas.', 1;

        SET @sqlAtualizarMeta = CONCAT(
            N'SET @saida = JSON_MODIFY(@entrada, ''$[',
            CONVERT(NVARCHAR(10), @indiceMeta),
            N'].metaMensal'', @valor);'
        );
        EXEC sys.sp_executesql
            @sqlAtualizarMeta,
            N'@entrada NVARCHAR(MAX), @valor DECIMAL(19,2), @saida NVARCHAR(MAX) OUTPUT',
            @entrada = @metasDepois,
            @valor = @meta,
            @saida = @metasDepois OUTPUT;

        FETCH NEXT FROM cursorCurva INTO @mes, @meta;
    END;
    CLOSE cursorCurva;
    DEALLOCATE cursorCurva;

    UPDATE dbo.indicadores
    SET tipo_consolidacao = N'ultima_posicao_acumulada'
    WHERE id = @indicadorId
      AND ISNULL(tipo_consolidacao, N'') = N'';
    SET @linhasIndicador = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET meta_referencia = CONVERT(NVARCHAR(100), @metaJaneiro)
    WHERE id = N'193' AND indicador_id = @indicadorId
      AND meta_referencia = N'7.37119e+008';
    SET @linhasJaneiro = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET meta_referencia = CONVERT(NVARCHAR(100), @metaJunho)
    WHERE id = N'198' AND indicador_id = @indicadorId
      AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(4545104157.00 AS DECIMAL(19, 2));
    SET @linhasJunho = @@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json = @metasDepois
    WHERE chave = N'metas' AND valor_json = @metasAntes;
    SET @linhasConfiguracao = @@ROWCOUNT;

    IF @linhasIndicador <> 1 OR @linhasJaneiro <> 1 OR @linhasJunho <> 1 OR @linhasConfiguracao <> 1
        THROW 51417, 'Validação falhou: quantidade de linhas alteradas diferente do esperado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = @indicadorId AND tipo_consolidacao = N'ultima_posicao_acumulada'
          AND periodicidade = N'Não especificada'
    )
        THROW 51418, 'Validação falhou: consolidação ou periodicidade final inválida.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'193' AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaJaneiro
          AND status = N'Homologado' AND versao_atual = 1
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'198' AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @metaJunho
          AND status = N'Homologado' AND versao_atual = 1
    )
        THROW 51419, 'Validação falhou: metas finais de JAN/JUN inválidas.', 1;

    IF EXISTS (
        SELECT 1
        FROM OPENJSON(@metasDepois) j
        INNER JOIN @curva c
          ON TRY_CONVERT(INT, JSON_VALUE(j.value, '$.mes')) = c.mes
        WHERE JSON_VALUE(j.value, '$.indicadorId') = @indicadorId
          AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(j.value, '$.metaMensal')) <> c.meta
    ) OR (
        SELECT COUNT(*)
        FROM OPENJSON(@metasDepois)
        WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
          AND TRY_CONVERT(INT, JSON_VALUE(value, '$.ano')) = 2026
    ) <> 12
        THROW 51420, 'Validação falhou: configuração genérica de metas não corresponde à curva soberana.', 1;

    IF EXISTS (
        SELECT [key], JSON_MODIFY(value, '$.metaMensal', NULL)
        FROM OPENJSON(@metasAntes)
        WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
        EXCEPT
        SELECT [key], JSON_MODIFY(value, '$.metaMensal', NULL)
        FROM OPENJSON(@metasDepois)
        WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
    ) OR EXISTS (
        SELECT [key], JSON_MODIFY(value, '$.metaMensal', NULL)
        FROM OPENJSON(@metasDepois)
        WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
        EXCEPT
        SELECT [key], JSON_MODIFY(value, '$.metaMensal', NULL)
        FROM OPENJSON(@metasAntes)
        WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
    )
        THROW 51421, 'Validação falhou: outro atributo das metas do indicador 17 foi alterado.', 1;

    IF EXISTS (
        SELECT [key], value FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key], value FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key], value FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key], value FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId
    )
        THROW 51422, 'Validação falhou: meta de outro indicador foi alterada.', 1;

    IF EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
    ) OR EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
    )
        THROW 51423, 'Validação falhou: outro campo do indicador 17 foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id <> @indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id <> @indicadorId)
        THROW 51424, 'Validação falhou: outro indicador foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE id IN (N'193',N'198')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM #lancamentosAntes WHERE id IN (N'193',N'198')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM #lancamentosAntes WHERE id IN (N'193',N'198')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE id IN (N'193',N'198')
    )
        THROW 51425, 'Validação falhou: campo não autorizado de JAN/JUN foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'193',N'198') EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'193',N'198'))
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'193',N'198') EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'193',N'198'))
        THROW 51426, 'Validação falhou: outro lançamento foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave <> N'metas' EXCEPT SELECT * FROM #configuracoesAntes WHERE chave <> N'metas')
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave <> N'metas' EXCEPT SELECT * FROM dbo.configuracoes WHERE chave <> N'metas')
        THROW 51427, 'Validação falhou: outra configuração foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
       OR EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
        THROW 51428, 'Validação falhou: governança ou auditoria foi criada ou alterada.', 1;

    IF CONVERT(DECIMAL(10, 2), ROUND(
        CAST(2253033146.00 AS DECIMAL(38, 8)) / CAST(2142991572.00 AS DECIMAL(38, 8)) * 100, 2
    )) <> CAST(105.13 AS DECIMAL(10, 2))
       OR CONVERT(DECIMAL(10, 2), ROUND(
        CAST(4615037076.03 AS DECIMAL(38, 8)) / @metaJunho * 100, 2
    )) <> CAST(101.54 AS DECIMAL(10, 2))
       OR CONVERT(DECIMAL(10, 2), ROUND(
        CAST(7095683438.69 AS DECIMAL(38, 8)) / CAST(7165115749.39 AS DECIMAL(38, 8)) * 100, 2
    )) <> CAST(99.03 AS DECIMAL(10, 2))
        THROW 51429, 'Validação falhou: atingimentos oficiais não arredondam para os Informes.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @linhasIndicador AS indicadores_alterados,
        @linhasJaneiro + @linhasJunho AS lancamentos_alterados,
        @linhasConfiguracao AS configuracoes_alteradas,
        CAST(0 AS INT) AS homologacoes_alteradas,
        CAST(0 AS INT) AS evidencias_alteradas,
        CAST(0 AS INT) AS retificacoes_alteradas,
        CAST(0 AS INT) AS reaberturas_alteradas,
        CAST(0 AS INT) AS auditorias_alteradas;

    SELECT id, competencia, meta_referencia, status, versao_atual
    FROM dbo.lancamentos WHERE id IN (N'193',N'198') ORDER BY id;

    SELECT id,nome,tipo_calculo,tipo_consolidacao,periodicidade
    FROM dbo.indicadores WHERE id = @indicadorId;
END TRY
BEGIN CATCH
    IF CURSOR_STATUS('local', 'cursorCurva') >= -1
    BEGIN
        IF CURSOR_STATUS('local', 'cursorCurva') > -1 CLOSE cursorCurva;
        DEALLOCATE cursorCurva;
    END;
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
