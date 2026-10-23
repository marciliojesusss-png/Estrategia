/*
  Indicador 10 — Share da Plataforma de Jogos

  Regularização técnica restrita à modelagem da evolução do MVP em 2026:
  - cadastro com unidade percentual e última posição trimestral;
  - regra funcional e curva de referência trimestral;
  - acompanhamento qualitativo JUL/AGO;
  - fechamento SET em 67% / 38% / 56,72%;
  - referência de 100% para OUT–DEZ, sem criar realizado futuro.

  Não altera JAN–JUN, governança, auditoria ou outros indicadores.
  O valor 11.11 não integra esta migration e não é resultado oficial do Indicador 10.
  IMPORTANTE: preparar e revisar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52101, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255) = N'20261023_004_indicador10_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100) = N'10';
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regra10Antes NVARCHAR(MAX);
    DECLARE @regra10Depois NVARCHAR(MAX);
    DECLARE @indiceRegra INT;
    DECLARE @sqlSubstituirRegra NVARCHAR(MAX);
    DECLARE @linhasIndicador INT = 0;
    DECLARE @linhasLancamentos INT = 0;
    DECLARE @linhasConfiguracoes INT = 0;
    DECLARE @dadosJulAgo NVARCHAR(MAX) = N'{"marcoAtualPlataformaJogos":"Desenvolvimento do MVP em acompanhamento","statusProjetoPlataformaJogos":"Piloto/MVP em desenvolvimento","descricaoAndamentoPlataformaJogos":"Acompanhamento qualitativo do desenvolvimento do MVP no 3TRI/2026; sem percentual oficial para a competência e sem interpolação entre 10% e 38%."}';
    DECLARE @dadosSetembro NVARCHAR(MAX) = N'{"marcoAtualPlataformaJogos":"Evolução acumulada do MVP no 3TRI","statusProjetoPlataformaJogos":"Piloto/MVP em desenvolvimento","percentualEvolucaoPlataformaJogos":0.38,"descricaoAndamentoPlataformaJogos":"Fechamento do 3TRI/2026: evolução acumulada do desenvolvimento do MVP, com aproximadamente 264 histórias de usuário e funcionalidades concluídas/evoluídas. A evolução técnica aproximada de 37,9% é apresentada oficialmente como 38%.","referenciaDocumentalPlataformaJogos":"Informe DILOT/GERIN nº 0078/2026"}';

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 52102, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

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
          AND numero = 10
          AND nome = N'Share da Plataforma de Jogos'
          AND unidade_apuradora = N'SUCOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PEI'
          AND pilar = N'Tecnologia e Inovação'
          AND tipo_calculo = N'projeto_marco_entrega'
          AND unidade_medida = N'marco'
          AND ISNULL(tipo_consolidacao, N'') = N''
          AND meta_anual = N'Piloto ou MVP da Plataforma de Jogos'
    )
        THROW 52103, 'Pré-condição inválida: identidade ou cadastro do Indicador 10 diverge do diagnóstico.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'9' AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'16' AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'17' AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'19' AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'20' AND unidade_apuradora = N'SUCOL' AND diretoria_responsavel = N'DICOT')
        THROW 52104, 'Pré-condição inválida: indicador protegido (09, 16, 17, 19 ou 20) divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND id IN
          (N'109',N'110',N'111',N'112',N'113',N'114',N'115',N'116',N'117',N'118',N'119',N'120')) <> 12
        THROW 52105, 'Pré-condição inválida: lançamentos 109 a 120 não estão íntegros.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'109',N'110',N'111') AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND meta_referencia IS NULL
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL
          AND situacao = N'Em andamento') <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'109',N'110',N'111'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'109',N'110',N'111'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade_id IN (N'109',N'110',N'111'))
        THROW 52106, 'Pré-condição inválida: HOMOLOGAÇÃO LEGADA SEM EVENTO TRANSACIONAL de JAN–MAR divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'112',N'113') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND ABS(TRY_CONVERT(DECIMAL(19,10), meta_referencia) - CONVERT(DECIMAL(19,10), 1.0 / 3.0)) < 0.000001
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL
          AND situacao = N'Em acompanhamento'
          AND ISJSON(dados_entrada_json) = 1) <> 2
        THROW 52107, 'Pré-condição inválida: ABR/MAI divergiram do acompanhamento qualitativo diagnosticado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'114' AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND ABS(TRY_CONVERT(DECIMAL(19,10), meta_referencia) - CONVERT(DECIMAL(19,10), 1.0 / 3.0)) < 0.000001
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.1
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.1
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0.3
          AND situacao = N'Abaixo da meta'
          AND JSON_VALUE(dados_entrada_json, '$.marcoAtualPlataformaJogos') = N'Registro de Aposta finalizado em ambiente de desenvolvimento'
    )
        THROW 52108, 'Pré-condição inválida: JUN não corresponde ao fechamento técnico 33,33% / 10% / 30%.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'115',N'116',N'117',N'118',N'119',N'120') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND meta_referencia IS NULL
          AND ISNULL(dados_entrada_json, N'[]') = N'[]'
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL
          AND situacao IS NULL) <> 6
        THROW 52109, 'Pré-condição inválida: JUL–DEZ divergiram da posição vazia diagnosticada.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'112',N'113',N'114',N'115',N'116',N'117',N'118',N'119',N'120'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'112',N'113',N'114',N'115',N'116',N'117',N'118',N'119',N'120'))
        THROW 52110, 'Pré-condição inválida: existem eventos de governança não diagnosticados no Indicador 10.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 52111, 'Pré-condição inválida: configurações ausentes ou duplicadas.', 1;

    SELECT @metasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'metas';
    SELECT @regrasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'regrasIndicadores';

    IF ISJSON(@metasAntes) <> 1 OR ISJSON(@regrasAntes) <> 1
        THROW 52112, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 3
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasAntes)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND (TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) NOT IN (1,2,3)
                 OR JSON_VALUE(value, '$.metaMensal') IS NOT NULL)
       )
       OR EXISTS (SELECT 1 FROM OPENJSON(@metasAntes) WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.id')) BETWEEN 196 AND 204)
        THROW 52113, 'Pré-condição inválida: metas atuais do Indicador 10 ou IDs reservados divergiram.', 1;

    SELECT @indiceRegra = TRY_CONVERT(INT, [key]), @regra10Antes = value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF @regra10Antes IS NULL
       OR JSON_VALUE(@regra10Antes, '$.tipoCalculo') <> N'projeto_marco_entrega'
       OR JSON_VALUE(@regra10Antes, '$.tipoConsolidacao') <> N'ultima_posicao_trimestral'
       OR JSON_VALUE(@regra10Antes, '$.unidadeMedida') <> N'marco'
       OR JSON_VALUE(@regra10Antes, '$.parametrosCalculo.metaTipo') <> N'marco_anual'
       OR JSON_QUERY(@regra10Antes, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
        THROW 52114, 'Pré-condição inválida: regra SQL vigente do Indicador 10 diverge do diagnóstico.', 1;

    SET @regra10Depois = N'{"indicadorId":10,"nome":"Share da Plataforma de Jogos","tipoCalculo":"projeto_marco_entrega","tipoConsolidacao":"ultima_posicao_trimestral","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":null,"parametrosCalculo":{"campoMarco":"marcoAtualPlataformaJogos","campoStatus":"statusProjetoPlataformaJogos","campoPercentual":"percentualEvolucaoPlataformaJogos","metaTipo":"meta_oficial_trimestral_projeto","metasTrimestraisOficiais":{"1TRI/2026":null,"2TRI/2026":0.3333333333333333,"3TRI/2026":0.67,"4TRI/2026":1},"mesesFechamentoTrimestral":[3,6,9,12],"apresentacoesOficiaisTrimestrais":{"2TRI/2026":{"metaOficialReportada":0.3333333333333333,"resultadoOficialReportado":0.1,"percentualAtingidoOficialReportado":0.3,"situacaoOficial":"Abaixo da meta"},"3TRI/2026":{"metaOficialReportada":0.67,"resultadoOficialReportado":0.38,"percentualAtingidoOficialReportado":0.5672,"situacaoOficial":"Abaixo da meta","nota":"Resultado oficial do Informe 0078/2026: evolução acumulada do MVP de 38%."}},"marcosTrimestraisOficiais":{"4TRI/2026":"Piloto/MVP da Plataforma de Jogos"},"sentidoMeta":"quanto_maior_melhor","metaAnualMarco":"Piloto/MVP da Plataforma de Jogos","marcoConcluido":"Piloto/MVP concluído","statusConcluido":"Piloto/MVP concluído"},"camposEntrada":[{"nome":"statusProjetoPlataformaJogos","rotulo":"Status do projeto","tipo":"selecao","obrigatorio":true},{"nome":"marcoAtualPlataformaJogos","rotulo":"Marco/etapa atual do projeto","tipo":"selecao","obrigatorio":true},{"nome":"percentualEvolucaoPlataformaJogos","rotulo":"Percentual oficial de evolução do projeto","tipo":"percentual","entradaPtBr":true,"obrigatorio":false},{"nome":"descricaoAndamentoPlataformaJogos","rotulo":"Descrição do andamento","tipo":"texto","obrigatorio":false},{"nome":"evidenciaPlataformaJogos","rotulo":"Referência documental","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"resultadoMensal","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"ultima_posicao_trimestral"}';
    IF ISJSON(@regra10Depois) <> 1
        THROW 52115, 'Falha interna: regra final do Indicador 10 não é JSON válido.', 1;

    SET @sqlSubstituirRegra = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[', CONVERT(NVARCHAR(10), @indiceRegra), N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql
        @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada = @regrasAntes,
        @regra = @regra10Depois,
        @saida = @regrasDepois OUTPUT;

    SET @metasDepois = @metasAntes;
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":196,"indicadorId":10,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":0.3333333333333333,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":197,"indicadorId":10,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":0.3333333333333333,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":198,"indicadorId":10,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":0.3333333333333333,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":199,"indicadorId":10,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":0.67,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":200,"indicadorId":10,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":0.67,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":201,"indicadorId":10,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":0.67,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":202,"indicadorId":10,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":1,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":203,"indicadorId":10,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":1,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":204,"indicadorId":10,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":1,"fonte":"curva_trimestral_evolucao_mvp_2026"}'));

    UPDATE dbo.indicadores
    SET tipo_consolidacao = N'ultima_posicao_trimestral',
        unidade_medida = N'percentual'
    WHERE id = @indicadorId
      AND unidade_medida = N'marco'
      AND ISNULL(tipo_consolidacao, N'') = N'';
    SET @linhasIndicador = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dadosJulAgo,
        meta_referencia = N'0.67',
        status = N'Em preenchimento',
        situacao = N'Em acompanhamento'
    WHERE indicador_id = @indicadorId AND id IN (N'115',N'116');
    SET @linhasLancamentos = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dadosSetembro,
        meta_referencia = N'0.67',
        resultado_calculado = N'0.38',
        resultado_oficial = N'0.38',
        percentual_atingido = N'0.5672',
        status = N'Em preenchimento',
        situacao = N'Abaixo da meta'
    WHERE indicador_id = @indicadorId AND id = N'117';
    SET @linhasLancamentos += @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET meta_referencia = N'1'
    WHERE indicador_id = @indicadorId AND id IN (N'118',N'119',N'120');
    SET @linhasLancamentos += @@ROWCOUNT;

    UPDATE dbo.configuracoes SET valor_json = @metasDepois
    WHERE chave = N'metas' AND valor_json = @metasAntes;
    SET @linhasConfiguracoes += @@ROWCOUNT;

    UPDATE dbo.configuracoes SET valor_json = @regrasDepois
    WHERE chave = N'regrasIndicadores' AND valor_json = @regrasAntes;
    SET @linhasConfiguracoes += @@ROWCOUNT;

    IF @linhasIndicador <> 1 OR @linhasLancamentos <> 6 OR @linhasConfiguracoes <> 2
        THROW 52116, 'Validação falhou: quantidades diferentes de indicadores=1, lançamentos=6, configurações=2.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = @indicadorId
          AND unidade_medida = N'percentual'
          AND tipo_consolidacao = N'ultima_posicao_trimestral'
          AND tipo_calculo = N'projeto_marco_entrega'
    )
        THROW 52117, 'Validação falhou: cadastro final inválido.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'115',N'116') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.67
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL
          AND situacao = N'Em acompanhamento'
          AND JSON_VALUE(dados_entrada_json, '$.percentualEvolucaoPlataformaJogos') IS NULL) <> 2
        THROW 52118, 'Validação falhou: JUL/AGO não ficaram como acompanhamento qualitativo sem percentual inventado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'117' AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.67
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.38
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.38
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0.5672
          AND situacao = N'Abaixo da meta'
          AND TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(dados_entrada_json, '$.percentualEvolucaoPlataformaJogos')) = 0.38
          AND JSON_VALUE(dados_entrada_json, '$.referenciaDocumentalPlataformaJogos') = N'Informe DILOT/GERIN nº 0078/2026'
    )
        THROW 52119, 'Validação falhou: SET não corresponde ao fechamento oficial 67% / 38% / 56,72%.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'118',N'119',N'120') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL
          AND situacao IS NULL AND ISNULL(dados_entrada_json, N'[]') = N'[]') <> 3
        THROW 52120, 'Validação falhou: OUT–DEZ receberam resultado futuro ou referência inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 12
       OR EXISTS (
          SELECT mes, meta FROM (VALUES
            (1,CAST(NULL AS DECIMAL(19,10))),(2,NULL),(3,NULL),
            (4,CONVERT(DECIMAL(19,10),0.3333333333333333)),(5,CONVERT(DECIMAL(19,10),0.3333333333333333)),(6,CONVERT(DECIMAL(19,10),0.3333333333333333)),
            (7,CONVERT(DECIMAL(19,10),0.67)),(8,CONVERT(DECIMAL(19,10),0.67)),(9,CONVERT(DECIMAL(19,10),0.67)),
            (10,CONVERT(DECIMAL(19,10),1)),(11,CONVERT(DECIMAL(19,10),1)),(12,CONVERT(DECIMAL(19,10),1))
          ) v(mes,meta)
          EXCEPT
          SELECT TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')), TRY_CONVERT(DECIMAL(19,10),JSON_VALUE(value,'$.metaMensal'))
          FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId') = @indicadorId
       )
       OR JSON_QUERY(@regra10Depois, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
       OR TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(@regra10Depois, '$.parametrosCalculo.metasTrimestraisOficiais."3TRI/2026"')) <> 0.67
       OR TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(@regra10Depois, '$.parametrosCalculo.metasTrimestraisOficiais."4TRI/2026"')) <> 1
       OR JSON_VALUE(@regra10Depois, '$.parametrosCalculo.marcosTrimestraisOficiais."4TRI/2026"') <> N'Piloto/MVP da Plataforma de Jogos'
        THROW 52121, 'Validação falhou: curva trimestral, fechamentos ou marco final inválidos.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id <> @indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id <> @indicadorId)
        THROW 52122, 'Validação falhou: outro indicador foi alterado.', 1;

    IF EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
    ) OR EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
    )
        THROW 52123, 'Validação falhou: campo não autorizado do cadastro foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'115',N'116',N'117',N'118',N'119',N'120')
        EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'115',N'116',N'117',N'118',N'119',N'120')
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'115',N'116',N'117',N'118',N'119',N'120')
        EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'115',N'116',N'117',N'118',N'119',N'120')
    )
        THROW 52124, 'Validação falhou: lançamento fora de JUL–DEZ foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'115',N'116',N'117')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'115',N'116',N'117')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'115',N'116',N'117')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'115',N'116',N'117')
    )
        THROW 52125, 'Validação falhou: campo protegido de JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'118',N'119',N'120')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'118',N'119',N'120')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'118',N'119',N'120')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'118',N'119',N'120')
    )
        THROW 52126, 'Validação falhou: OUT–DEZ tiveram alteração além da meta de referência.', 1;

    IF EXISTS (
        SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
        EXCEPT SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
    ) OR EXISTS (
        SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
        EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores')
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    )
        THROW 52127, 'Validação falhou: configuração não relacionada foi alterada.', 1;

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
        THROW 52128, 'Validação falhou: governança foi criada, removida ou alterada.', 1;

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
    WHERE indicador_id = @indicadorId
    ORDER BY mes;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
