/*
  Indicador 20 — Visibilidade dos Repasses Sociais das Loterias CAIXA

  Regularização técnica restrita a:
  - consolidação por ações realizadas acumuladas no cadastro;
  - situação de acompanhamento de ABR/MAI;
  - posição acumulada JUL–SET da ação "A Sorte em Números – 2025";
  - curva mensal 0/1/2 e fechamentos trimestrais [3,6,9,12].

  Não altera JAN–MAR, JUN, OUT–DEZ, governança, auditoria ou outros indicadores.
  IMPORTANTE: preparar e revisar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52001, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255) = N'20261023_003_indicador20_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100) = N'20';
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regra20Antes NVARCHAR(MAX);
    DECLARE @regra20Depois NVARCHAR(MAX);
    DECLARE @indiceRegra INT;
    DECLARE @sqlSubstituirRegra NVARCHAR(MAX);
    DECLARE @linhasIndicador INT = 0;
    DECLARE @linhasLancamentos INT = 0;
    DECLARE @linhasConfiguracoes INT = 0;
    DECLARE @dadosJulho NVARCHAR(MAX) = N'{"acaoPropostaVisibilidade":"relatorio_sorte_em_numeros_2025","statusAcaoVisibilidade":"Publicada/realizada","etapaAtualVisibilidade":"Relatório publicado","descricaoAndamentoVisibilidade":"Posição acumulada da publicação do relatório institucional “A Sorte em Números — 2025”, concluída em junho de 2026.","dataConclusaoVisibilidade":"2026-06-17"}';
    DECLARE @dadosAgosto NVARCHAR(MAX) = N'{"acaoPropostaVisibilidade":"relatorio_sorte_em_numeros_2025","statusAcaoVisibilidade":"Publicada/realizada","etapaAtualVisibilidade":"Relatório publicado","descricaoAndamentoVisibilidade":"Posição acumulada da publicação do relatório institucional “A Sorte em Números — 2025”, concluída em junho de 2026.","dataConclusaoVisibilidade":"2026-06-17"}';
    DECLARE @dadosSetembro NVARCHAR(MAX) = N'{"acaoPropostaVisibilidade":"relatorio_sorte_em_numeros_2025","statusAcaoVisibilidade":"Publicada/realizada","etapaAtualVisibilidade":"Relatório publicado","descricaoAndamentoVisibilidade":"Fechamento do 3TRI/2026 com a posição acumulada da publicação do relatório institucional “A Sorte em Números — 2025”, concluída em junho de 2026.","dataConclusaoVisibilidade":"2026-06-17"}';

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 52002, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

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
          AND numero = 20
          AND nome = N'Visibilidade dos Repasses Sociais das Loterias CAIXA'
          AND unidade_apuradora = N'SUCOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN'
          AND pilar = N'Sustentabilidade e Cidadania'
          AND unidade_medida = N'percentual'
          AND tipo_calculo = N'execucao_acoes_propostas'
          AND meta_anual = N'Implantar 100% das ações propostas'
          AND ISNULL(tipo_consolidacao, N'') = N''
    )
        THROW 52003, 'Pré-condição inválida: identidade ou cadastro do Indicador 20 diverge do diagnóstico.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'9' AND nome = N'Vendas com Meio de Pagamento PIX'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'16' AND nome = N'Apoio ao Desenvolvimento Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
          AND tipo_consolidacao = N'iniciativas_acumuladas'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'17' AND nome = N'Repasse Social'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
          AND tipo_consolidacao = N'ultima_posicao_acumulada'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'19' AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
          AND tipo_consolidacao = N'valor_acumulado'
    )
        THROW 52004, 'Pré-condição inválida: um indicador protegido (09, 16, 17 ou 19) divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND id IN
          (N'229',N'230',N'231',N'232',N'233',N'234',N'235',N'236',N'237',N'238',N'239',N'240')) <> 12
        THROW 52005, 'Pré-condição inválida: lançamentos 229 a 240 não estão íntegros.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'229',N'230',N'231') AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0
          AND percentual_atingido IS NULL
          AND situacao <> N'Abaixo da meta') <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'229',N'230',N'231'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'229',N'230',N'231'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade_id IN (N'229',N'230',N'231'))
        THROW 52006, 'Pré-condição inválida: HOMOLOGAÇÃO LEGADA SEM EVENTO TRANSACIONAL de JAN–MAR divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'232',N'233') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0
          AND situacao = N'Abaixo da meta'
          AND usuario_responsavel = N'UNIDADE-SUCOL'
          AND versao_atual = 1
          AND ISJSON(dados_entrada_json) = 1) <> 2
        THROW 52007, 'Pré-condição inválida: ABR/MAI divergiram da posição diagnosticada.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'234' AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.5
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.5
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 1
          AND situacao = N'Atingido'
          AND JSON_VALUE(dados_entrada_json, '$.acaoPropostaVisibilidade') = N'relatorio_sorte_em_numeros_2025'
          AND JSON_VALUE(dados_entrada_json, '$.statusAcaoVisibilidade') = N'Publicada/realizada'
          AND JSON_VALUE(dados_entrada_json, '$.dataConclusaoVisibilidade') = N'2026-06-17'
          AND usuario_responsavel = N'UNIDADE-SUCOL'
          AND versao_atual = 1
    ) OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id = N'234')
      OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id = N'234')
        THROW 52008, 'Pré-condição inválida: JUN não corresponde à posição técnica correta diagnosticada.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'235',N'236',N'237') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND ISNULL(dados_entrada_json, N'[]') = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL) <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'235',N'236',N'237'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'235',N'236',N'237'))
        THROW 52009, 'Pré-condição inválida: JUL–SET não correspondem à posição vazia diagnosticada.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'238',N'239',N'240') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 2
          AND ISNULL(dados_entrada_json, N'[]') = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL) <> 3
        THROW 52010, 'Pré-condição inválida: OUT–DEZ divergiram da posição futura vazia.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 52011, 'Pré-condição inválida: configurações ausentes ou duplicadas.', 1;

    SELECT @metasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'metas';
    SELECT @regrasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'regrasIndicadores';

    IF ISJSON(@metasAntes) <> 1 OR ISJSON(@regrasAntes) <> 1
        THROW 52012, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 3
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasAntes)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND (TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) NOT IN (1,2,3)
                 OR TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(value, '$.metaMensal')) <> 0)
       )
       OR EXISTS (SELECT 1 FROM OPENJSON(@metasAntes) WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.id')) BETWEEN 187 AND 195)
        THROW 52013, 'Pré-condição inválida: metas atuais do Indicador 20 ou IDs reservados divergiram.', 1;

    SELECT @indiceRegra = TRY_CONVERT(INT, [key]), @regra20Antes = value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF @regra20Antes IS NULL
       OR JSON_VALUE(@regra20Antes, '$.tipoCalculo') <> N'execucao_acoes_propostas'
       OR JSON_VALUE(@regra20Antes, '$.tipoConsolidacao') <> N'acoes_realizadas_acumuladas'
       OR TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(@regra20Antes, '$.metaAnualValor')) <> 1
       OR TRY_CONVERT(INT, JSON_VALUE(@regra20Antes, '$.parametrosCalculo.totalAcoesPropostas')) <> 2
       OR JSON_VALUE(@regra20Antes, '$.parametrosCalculo.statusQueConta') <> N'Publicada/realizada'
       OR JSON_QUERY(@regra20Antes, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
       OR TRY_CONVERT(INT, JSON_VALUE(@regra20Antes, '$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaAcoesRealizadasAcumuladas')) <> 0
       OR TRY_CONVERT(INT, JSON_VALUE(@regra20Antes, '$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaAcoesRealizadasAcumuladas')) <> 1
       OR TRY_CONVERT(INT, JSON_VALUE(@regra20Antes, '$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaAcoesRealizadasAcumuladas')) <> 1
       OR TRY_CONVERT(INT, JSON_VALUE(@regra20Antes, '$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaAcoesRealizadasAcumuladas')) <> 2
       OR (SELECT COUNT(*) FROM OPENJSON(@regra20Antes, '$.parametrosCalculo.acoesPropostasVisibilidade')) <> 2
       OR NOT EXISTS (
          SELECT 1 FROM OPENJSON(@regra20Antes, '$.parametrosCalculo.acoesPropostasVisibilidade')
          WHERE JSON_VALUE(value, '$.id') = N'relatorio_sorte_em_numeros_2025'
       )
       OR NOT EXISTS (
          SELECT 1 FROM OPENJSON(@regra20Antes, '$.parametrosCalculo.acoesPropostasVisibilidade')
          WHERE JSON_VALUE(value, '$.id') = N'campanha_repasses_sociais'
       )
        THROW 52014, 'Pré-condição inválida: regra funcional do Indicador 20 diverge do diagnóstico.', 1;

    SET @regra20Depois = JSON_MODIFY(
        @regra20Antes,
        '$.parametrosCalculo.mesesFechamentoTrimestral',
        JSON_QUERY(N'[3,6,9,12]')
    );
    SET @sqlSubstituirRegra = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[',
        CONVERT(NVARCHAR(10), @indiceRegra),
        N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql
        @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada = @regrasAntes,
        @regra = @regra20Depois,
        @saida = @regrasDepois OUTPUT;

    SET @metasDepois = @metasAntes;
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":187,"indicadorId":20,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":1,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":188,"indicadorId":20,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":1,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":189,"indicadorId":20,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":1,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":190,"indicadorId":20,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":1,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":191,"indicadorId":20,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":1,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":192,"indicadorId":20,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":1,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":193,"indicadorId":20,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":2,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":194,"indicadorId":20,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":2,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":195,"indicadorId":20,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":2,"fonte":"curva_trimestral_visibilidade_repasses_2026"}'));

    UPDATE dbo.indicadores
    SET tipo_consolidacao = N'acoes_realizadas_acumuladas'
    WHERE id = @indicadorId AND ISNULL(tipo_consolidacao, N'') = N'';
    SET @linhasIndicador = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET situacao = N'Em acompanhamento'
    WHERE indicador_id = @indicadorId
      AND id IN (N'232',N'233')
      AND situacao = N'Abaixo da meta';
    SET @linhasLancamentos = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = CASE id
            WHEN N'235' THEN @dadosJulho
            WHEN N'236' THEN @dadosAgosto
            ELSE @dadosSetembro
        END,
        resultado_calculado = N'0.5',
        resultado_oficial = N'0.5',
        percentual_atingido = N'1',
        situacao = CASE WHEN id = N'237' THEN N'Atingido' ELSE N'Em acompanhamento' END,
        status = N'Em preenchimento'
    WHERE indicador_id = @indicadorId AND id IN (N'235',N'236',N'237');
    SET @linhasLancamentos += @@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json = @metasDepois
    WHERE chave = N'metas' AND valor_json = @metasAntes;
    SET @linhasConfiguracoes += @@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json = @regrasDepois
    WHERE chave = N'regrasIndicadores' AND valor_json = @regrasAntes;
    SET @linhasConfiguracoes += @@ROWCOUNT;

    IF @linhasIndicador <> 1 OR @linhasLancamentos <> 5 OR @linhasConfiguracoes <> 2
        THROW 52015, 'Validação falhou: quantidades alteradas diferentes de indicadores=1, lançamentos=5, configurações=2.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = @indicadorId AND tipo_consolidacao = N'acoes_realizadas_acumuladas'
    )
        THROW 52016, 'Validação falhou: consolidação final inválida.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'232',N'233') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0
          AND situacao = N'Em acompanhamento') <> 2
        THROW 52017, 'Validação falhou: ABR/MAI não ficaram em acompanhamento.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'235',N'236',N'237') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.5
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.5
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 1
          AND JSON_VALUE(dados_entrada_json, '$.acaoPropostaVisibilidade') = N'relatorio_sorte_em_numeros_2025'
          AND JSON_VALUE(dados_entrada_json, '$.statusAcaoVisibilidade') = N'Publicada/realizada'
          AND JSON_VALUE(dados_entrada_json, '$.dataConclusaoVisibilidade') = N'2026-06-17') <> 3
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'235',N'236') AND situacao = N'Em acompanhamento') <> 2
       OR NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id = N'237' AND situacao = N'Atingido')
        THROW 52018, 'Validação falhou: posição JUL–SET inválida.', 1;

    IF (
        SELECT COUNT(DISTINCT JSON_VALUE(dados_entrada_json, '$.acaoPropostaVisibilidade'))
        FROM dbo.lancamentos
        WHERE id IN (N'234',N'235',N'236',N'237')
          AND JSON_VALUE(dados_entrada_json, '$.statusAcaoVisibilidade') = N'Publicada/realizada'
    ) <> 1
        THROW 52019, 'Validação falhou: JUN–SET não representam uma única ação deduplicada.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 12
       OR EXISTS (
          SELECT mes, meta
          FROM (VALUES (1,0),(2,0),(3,0),(4,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,2),(11,2),(12,2)) v(mes,meta)
          EXCEPT
          SELECT TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')),
                 TRY_CONVERT(INT, JSON_VALUE(value, '$.metaMensal'))
          FROM OPENJSON(@metasDepois)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
       )
       OR JSON_QUERY(@regra20Depois, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
        THROW 52020, 'Validação falhou: curva mensal ou meses de fechamento inválidos.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id <> @indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id <> @indicadorId)
        THROW 52021, 'Validação falhou: outro indicador foi alterado.', 1;

    IF EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
    ) OR EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
    )
        THROW 52022, 'Validação falhou: campo não autorizado do cadastro foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'232',N'233',N'235',N'236',N'237')
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'232',N'233',N'235',N'236',N'237')
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'232',N'233',N'235',N'236',N'237')
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'232',N'233',N'235',N'236',N'237')
    )
        THROW 52023, 'Validação falhou: lançamento fora de ABR/MAI/JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'232',N'233')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'232',N'233')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'232',N'233')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'232',N'233')
    )
        THROW 52024, 'Validação falhou: ABR/MAI tiveram campo diferente de situação alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'235',N'236',N'237')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'235',N'236',N'237')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'235',N'236',N'237')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'235',N'236',N'237')
    )
        THROW 52025, 'Validação falhou: campo protegido de JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
        EXCEPT
        SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
    ) OR EXISTS (
        SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
        EXCEPT
        SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    )
        THROW 52026, 'Validação falhou: configuração não relacionada foi alterada.', 1;

    IF EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regra20Depois) WHERE [key] <> N'parametrosCalculo'
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regra20Antes) WHERE [key] <> N'parametrosCalculo'
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regra20Antes) WHERE [key] <> N'parametrosCalculo'
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regra20Depois) WHERE [key] <> N'parametrosCalculo'
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regra20Depois, '$.parametrosCalculo') WHERE [key] <> N'mesesFechamentoTrimestral'
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regra20Antes, '$.parametrosCalculo') WHERE [key] <> N'mesesFechamentoTrimestral'
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regra20Antes, '$.parametrosCalculo') WHERE [key] <> N'mesesFechamentoTrimestral'
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regra20Depois, '$.parametrosCalculo') WHERE [key] <> N'mesesFechamentoTrimestral'
    )
        THROW 52027, 'Validação falhou: regrasIndicadores mudou além dos meses de fechamento.', 1;

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
        THROW 52028, 'Validação falhou: governança foi criada, removida ou alterada.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS transacao,
           @migration AS migration,
           @linhasIndicador AS indicadores_alterados,
           @linhasLancamentos AS lancamentos_alterados,
           @linhasConfiguracoes AS configuracoes_alteradas,
           0 AS registros_criados,
           0 AS registros_removidos;
    SELECT id, competencia, status, meta_referencia, resultado_calculado,
           resultado_oficial, percentual_atingido, situacao, versao_atual
    FROM dbo.lancamentos
    WHERE id IN (N'232',N'233',N'234',N'235',N'236',N'237')
    ORDER BY mes;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
