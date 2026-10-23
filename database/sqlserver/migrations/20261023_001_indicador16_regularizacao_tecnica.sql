/*
  Indicador 16 — Apoio ao Desenvolvimento Socioambiental

  Regularização técnica restrita a:
  - consolidação por iniciativas acumuladas no cadastro;
  - curva mensal 0/1/1/2 e regra de fechamentos [3,6,9,12];
  - posição JUL–SET/2026 da única iniciativa Brasil Ladies Cup 2026.

  Não cria, altera ou remove homologações, evidências, auditorias,
  retificações ou solicitações de reabertura. JAN–JUN e o Indicador 19
  permanecem integralmente preservados.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 51601, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'16';
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regra16 NVARCHAR(MAX);
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @indiceRegra INT;
    DECLARE @sqlSubstituirRegra NVARCHAR(MAX);
    DECLARE @linhasIndicador INT;
    DECLARE @linhasLancamentos INT;
    DECLARE @linhasConfiguracoes INT = 0;
    DECLARE @dadosJulho NVARCHAR(MAX) = N'{"idIniciativaSocioambiental":"brasil-ladies-cup-2026","nomeIniciativaSocioambiental":"Patrocínio da edição 2026 da Brasil Ladies Cup","tipoIniciativaSocioambiental":"Patrocínio / desenvolvimento socioambiental","statusIniciativaSocioambiental":"Apoiada/realizada","dataApoioIniciativa":"","descricaoAndamentoSocioambiental":"Patrocínio da edição 2026 da Brasil Ladies Cup, realizado entre 09 e 12/07/2026, em Campinas/SP, pela Federação Internacional de Football Soccer Society — FIFOS, com investimento documental de R$ 190.000,00 oriundo da reserva especial do Fundo para Desenvolvimento das Loterias — FDL e aprovação conforme alçada competente citada no Informe DILOT/GERIN nº 0078/2026 / MN ZL026. O valor financeiro é apenas informação documental; o resultado deste indicador é 1 iniciativa apoiada.","evidenciaIniciativaSocioambiental":"Informe DILOT/GERIN nº 0078/2026 / MN ZL026.","observacaoArea":"O investimento de R$ 190.000,00 é documental neste indicador e permanece tratado financeiramente no Indicador 19."}';
    DECLARE @dadosAgosto NVARCHAR(MAX) = @dadosJulho;
    DECLARE @dadosSetembro NVARCHAR(MAX) = @dadosJulho;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 51602, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

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
          AND nome = N'Apoio ao Desenvolvimento Socioambiental'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND tipo_calculo = N'iniciativas_apoiadas'
          AND meta_anual = N'02 iniciativas apoiadas'
          AND ISNULL(tipo_consolidacao, N'') = N''
    )
        THROW 51603, 'Pré-condição inválida: identidade ou cadastro do indicador 16 diverge do diagnóstico.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'19' AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
    )
        THROW 51604, 'Pré-condição inválida: o Indicador 19 protegido diverge do estado diagnosticado.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND id IN
          (N'181',N'182',N'183',N'184',N'185',N'186',N'187',N'188',N'189',N'190',N'191',N'192')) <> 12
        THROW 51605, 'Pré-condição inválida: lançamentos 181 a 192 não estão íntegros.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'181',N'182',N'183') AND indicador_id = @indicadorId AND status = N'Homologado') <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'181',N'182',N'183'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'181',N'182',N'183'))
        THROW 51606, 'Pré-condição inválida: a pendência histórica de JAN–MAR mudou desde o diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'184',N'185',N'186') AND indicador_id = @indicadorId AND status = N'Em preenchimento') <> 3
       OR (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id IN (N'184',N'185',N'186')) <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'184',N'185',N'186'))
        THROW 51607, 'Pré-condição inválida: dados ou governança de ABR–JUN divergiram do diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'187',N'188',N'189') AND indicador_id = @indicadorId
          AND status = N'Não iniciado' AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND ISNULL(dados_entrada_json, N'[]') = N'[]'
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL) <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'187',N'188',N'189'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'187',N'188',N'189'))
        THROW 51608, 'Pré-condição inválida: JUL–SET não correspondem à posição vazia diagnosticada.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51609, 'Pré-condição inválida: configurações ausentes ou duplicadas.', 1;

    SELECT @metasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'metas';
    SELECT @regrasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'regrasIndicadores';

    IF ISJSON(@metasAntes) <> 1 OR ISJSON(@regrasAntes) <> 1
        THROW 51610, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 3
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasAntes)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND (TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) NOT IN (1,2,3)
                 OR TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(value, '$.metaMensal')) <> 0)
       )
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasAntes)
          WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.id')) BETWEEN 169 AND 177
       )
        THROW 51611, 'Pré-condição inválida: metas atuais do indicador 16 ou IDs reservados divergiram.', 1;

    SELECT @indiceRegra = TRY_CONVERT(INT, [key]), @regra16 = value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF @regra16 IS NULL
       OR JSON_VALUE(@regra16, '$.tipoCalculo') <> N'iniciativas_apoiadas'
       OR JSON_VALUE(@regra16, '$.tipoConsolidacao') <> N'iniciativas_acumuladas'
       OR JSON_VALUE(@regra16, '$.parametrosCalculo.statusQueConta') <> N'Apoiada/realizada'
       OR JSON_QUERY(@regra16, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
        THROW 51612, 'Pré-condição inválida: regra funcional do indicador 16 diverge do estado diagnosticado.', 1;

    SET @regra16 = JSON_MODIFY(@regra16, '$.parametrosCalculo.campoId', N'idIniciativaSocioambiental');
    SET @regra16 = JSON_MODIFY(@regra16, '$.parametrosCalculo.campoDescricao', N'descricaoAndamentoSocioambiental');
    SET @regra16 = JSON_MODIFY(@regra16, '$.parametrosCalculo.permitirPeriodoNaDescricaoSemDataPontual', CAST(1 AS BIT));
    SET @regra16 = JSON_MODIFY(@regra16, '$.parametrosCalculo.mesesFechamentoTrimestral', JSON_QUERY(N'[3,6,9,12]'));
    SET @regra16 = JSON_MODIFY(@regra16, 'append $.camposEntrada', JSON_QUERY(N'{"nome":"idIniciativaSocioambiental","rotulo":"Identificador lógico da iniciativa","tipo":"texto","obrigatorio":false}'));
    SET @sqlSubstituirRegra = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[',
        CONVERT(NVARCHAR(10), @indiceRegra),
        N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql
        @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada = @regrasAntes,
        @regra = @regra16,
        @saida = @regrasDepois OUTPUT;

    SET @metasDepois = @metasAntes;
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":169,"indicadorId":16,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":1,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":170,"indicadorId":16,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":1,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":171,"indicadorId":16,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":1,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":172,"indicadorId":16,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":1,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":173,"indicadorId":16,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":1,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":174,"indicadorId":16,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":1,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":175,"indicadorId":16,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":2,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":176,"indicadorId":16,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":2,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":177,"indicadorId":16,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":2,"fonte":"curva_trimestral_apoio_socioambiental_2026"}'));

    UPDATE dbo.indicadores
    SET tipo_consolidacao = N'iniciativas_acumuladas'
    WHERE id = @indicadorId AND ISNULL(tipo_consolidacao, N'') = N'';
    SET @linhasIndicador = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = CASE id WHEN N'187' THEN @dadosJulho WHEN N'188' THEN @dadosAgosto ELSE @dadosSetembro END,
        resultado_calculado = N'1',
        resultado_oficial = N'1',
        percentual_atingido = N'1',
        situacao = CASE WHEN id = N'189' THEN N'Atingido' ELSE N'Em acompanhamento' END,
        status = N'Em preenchimento',
        observacao_unidade = CASE WHEN id = N'189'
            THEN N'Fechamento do 3TRI/2026: uma iniciativa socioambiental apoiada/realizada no acumulado.'
            ELSE N'Acompanhamento da iniciativa socioambiental realizada no período do 3TRI/2026.' END,
        referencia_evidencia = N'Informe DILOT/GERIN nº 0078/2026 / MN ZL026.'
    WHERE indicador_id = @indicadorId AND id IN (N'187',N'188',N'189');
    SET @linhasLancamentos = @@ROWCOUNT;

    UPDATE dbo.configuracoes SET valor_json = @metasDepois WHERE chave = N'metas' AND valor_json = @metasAntes;
    SET @linhasConfiguracoes += @@ROWCOUNT;
    UPDATE dbo.configuracoes SET valor_json = @regrasDepois WHERE chave = N'regrasIndicadores' AND valor_json = @regrasAntes;
    SET @linhasConfiguracoes += @@ROWCOUNT;

    IF @linhasIndicador <> 1 OR @linhasLancamentos <> 3 OR @linhasConfiguracoes <> 2
        THROW 51613, 'Validação falhou: quantidade de linhas alteradas diferente de 1/3/2.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = @indicadorId AND tipo_consolidacao = N'iniciativas_acumuladas')
        THROW 51614, 'Validação falhou: consolidação final inválida.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'187',N'188',N'189') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 1
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 1
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 1
          AND JSON_VALUE(dados_entrada_json, '$.idIniciativaSocioambiental') = N'brasil-ladies-cup-2026'
          AND JSON_VALUE(dados_entrada_json, '$.dataApoioIniciativa') = N'') <> 3
       OR NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id = N'189' AND situacao = N'Atingido')
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'187',N'188') AND situacao = N'Em acompanhamento') <> 2
        THROW 51615, 'Validação falhou: posição JUL–SET inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 12
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasDepois)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) BETWEEN 4 AND 9
            AND TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(value, '$.metaMensal')) <> 1
       )
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasDepois)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) BETWEEN 10 AND 12
            AND TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(value, '$.metaMensal')) <> 2
       )
       OR JSON_QUERY(@regra16, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
        THROW 51616, 'Validação falhou: curva ou regra final inválida.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id <> @indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id <> @indicadorId)
       OR EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'187',N'188',N'189') EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'187',N'188',N'189'))
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'187',N'188',N'189') EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'187',N'188',N'189'))
        THROW 51617, 'Validação falhou: indicador ou lançamento fora do escopo foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,evidencia_id,usuario_responsavel,created_at,updated_at,versao_atual
        FROM dbo.lancamentos WHERE id IN (N'187',N'188',N'189')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,evidencia_id,usuario_responsavel,created_at,updated_at,versao_atual
        FROM #lancamentosAntes WHERE id IN (N'187',N'188',N'189')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,evidencia_id,usuario_responsavel,created_at,updated_at,versao_atual
        FROM #lancamentosAntes WHERE id IN (N'187',N'188',N'189')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,evidencia_id,usuario_responsavel,created_at,updated_at,versao_atual
        FROM dbo.lancamentos WHERE id IN (N'187',N'188',N'189')
    )
        THROW 51618, 'Validação falhou: campo protegido de JUL–SET foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores') EXCEPT SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores'))
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores') EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores'))
       OR EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
       OR EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
        THROW 51619, 'Validação falhou: configuração não relacionada ou governança foi alterada.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS transacao,
           @linhasIndicador AS indicadores_alterados,
           @linhasLancamentos AS lancamentos_alterados,
           @linhasConfiguracoes AS configuracoes_alteradas,
           0 AS registros_criados,
           0 AS registros_removidos;
    SELECT id, competencia, status, meta_referencia, resultado_calculado, resultado_oficial,
           percentual_atingido, situacao, versao_atual
    FROM dbo.lancamentos WHERE id IN (N'187',N'188',N'189') ORDER BY mes;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
