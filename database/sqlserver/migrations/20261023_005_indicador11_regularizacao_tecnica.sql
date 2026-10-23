/*
  Indicador 11 — Ampliar a Capacidade de Desenvolvimento de Soluções de TIC

  Regularização restrita a:
  - nome e consolidação do cadastro;
  - acompanhamento JUL/AGO e fechamento SET do evento OS 25173021;
  - meses de fechamento trimestral na regra.

  Não altera JAN–JUN, OUT–DEZ, metas, governança ou outros indicadores.
  IMPORTANTE: preparar e revisar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52201, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255) = N'20261023_005_indicador11_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100) = N'11';
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regra11Antes NVARCHAR(MAX);
    DECLARE @regra11Depois NVARCHAR(MAX);
    DECLARE @indiceRegra INT;
    DECLARE @sqlSubstituirRegra NVARCHAR(MAX);
    DECLARE @linhasIndicador INT = 0;
    DECLARE @linhasLancamentos INT = 0;
    DECLARE @linhasConfiguracoes INT = 0;
    DECLARE @atingimento3Tri NVARCHAR(100) = N'1.176470588235294118';
    DECLARE @observacaoJun NVARCHAR(MAX) = N'Ao longo do 2TRI/2026 foram consolidados os insumos da RFI, realizadas rodadas de reuniões com fornecedores e estudos dos modelos de contratação, com apoio do Gartner. A RFP prevista para o período não foi realizada, permanecendo o indicador no marco correspondente à RFI, com realizado de 35% frente à meta de 70%. Em junho também foi demandada a contratação de 23 profissionais da fábrica de software Spassu para ampliação da capacidade de desenvolvimento da Nova Plataforma de Loterias, com expectativa de efetivação no 3TRI.';
    DECLARE @dadosJul NVARCHAR(MAX) = N'{"eventoCapacidadeTicId":"os-25173021-spassu-2026","marcoAlcancadoTIC":"OS 25173021 em andamento","descricaoAndamentoTIC":"Acompanhamento qualitativo da OS nº 25173021, aberta em 10/06/2026 e ainda em andamento durante julho; sem percentual intermediário oficial."}';
    DECLARE @dadosAgo NVARCHAR(MAX) = N'{"eventoCapacidadeTicId":"os-25173021-spassu-2026","marcoAlcancadoTIC":"Contratação adicional concluída - OS 25173021","percentualRealizadoTIC":1,"numeroOrdemServicoTIC":"25173021","dataAberturaOrdemServicoTIC":"2026-06-10","dataConclusaoOrdemServicoTIC":"2026-08-14","quantidadeProfissionaisAdicionaisTIC":18,"fabricaSoftwareTIC":"Spassu","descricaoAndamentoTIC":"Conclusão em 14/08/2026 da OS nº 25173021, aberta em 10/06/2026, com contratação adicional de 18 profissionais de tecnologia da Fábrica de Software Spassu para ampliar a capacidade de desenvolvimento da Nova Plataforma/SIPLX. Objetivo anual atingido integralmente."}';
    DECLARE @dadosSet NVARCHAR(MAX) = N'{"eventoCapacidadeTicId":"os-25173021-spassu-2026","marcoAlcancadoTIC":"Contratação adicional concluída - OS 25173021","percentualRealizadoTIC":1,"numeroOrdemServicoTIC":"25173021","dataAberturaOrdemServicoTIC":"2026-06-10","dataConclusaoOrdemServicoTIC":"2026-08-14","quantidadeProfissionaisAdicionaisTIC":18,"fabricaSoftwareTIC":"Spassu","descricaoAndamentoTIC":"Fechamento do 3TRI/2026 consolidando a posição acumulada do mesmo evento concluído em 14/08/2026; não representa nova contratação."}';

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 52202, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

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
          AND numero = 11
          AND nome = N'Ampliar Capacidade de Desenvolvimento de Soluções de TIC'
          AND unidade_apuradora = N'SUCOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN'
          AND pilar = N'Tecnologia e Inovação'
          AND periodicidade = N'Não especificada'
          AND tipo_calculo = N'marco_projeto_percentual'
          AND tipo_consolidacao IS NULL
          AND unidade_medida = N'percentual'
          AND meta_anual = N'Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026.'
    )
        THROW 52203, 'Pré-condição inválida: cadastro do Indicador 11 divergiu do diagnóstico.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'9' AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'10' AND unidade_apuradora = N'SUCOL' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'16' AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'17' AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'19' AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id = N'20' AND unidade_apuradora = N'SUCOL' AND diretoria_responsavel = N'DICOT')
        THROW 52204, 'Pré-condição inválida: indicador protegido divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND id IN
          (N'121',N'122',N'123',N'124',N'125',N'126',N'127',N'128',N'129',N'130',N'131',N'132')) <> 12
        THROW 52205, 'Pré-condição inválida: lançamentos 121 a 132 não estão íntegros.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'121',N'122') AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.35
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0
          AND situacao = N'Abaixo da meta'
          AND JSON_VALUE(dados_entrada_json, '$.marcoAlcancadoTIC') = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(dados_entrada_json, '$.percentualRealizadoTIC')) = 0
          AND usuario_responsavel IS NULL
          AND versao_atual = 1) <> 2
        THROW 52206, 'Pré-condição inválida: JAN/FEV legados divergiram.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'123' AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.35
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.35
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.35
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 1
          AND situacao = N'Atingido'
          AND JSON_VALUE(dados_entrada_json, '$.marcoAlcancadoTIC') = N'Consulta Pública de Informações - RFI realizada'
          AND TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(dados_entrada_json, '$.percentualRealizadoTIC')) = 0.35
          AND usuario_responsavel IS NULL
          AND versao_atual = 1
    )
        THROW 52207, 'Pré-condição inválida: MAR legado divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'124',N'125') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.70
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL
          AND situacao IS NULL AND dados_entrada_json = N'[]'
          AND usuario_responsavel IS NULL AND versao_atual = 1) <> 2
        THROW 52208, 'Pré-condição inválida: ABR/MAI divergiram.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'126' AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.70
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.35
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.35
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0.50
          AND situacao = N'Abaixo da meta'
          AND JSON_VALUE(dados_entrada_json, '$.marcoAlcancadoTIC') = N'Consulta Pública de Informações - RFI realizada'
          AND TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(dados_entrada_json, '$.percentualRealizadoTIC')) = 0.35
          AND observacao_unidade = @observacaoJun
          AND usuario_responsavel = N'UNIDADE-SUCOL'
          AND versao_atual = 1
    )
        THROW 52209, 'Pré-condição inválida: JUN divergiu da posição histórica diagnosticada.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'127',N'128',N'129') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.85
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL
          AND situacao IS NULL AND dados_entrada_json = N'[]'
          AND usuario_responsavel IS NULL AND versao_atual = 1) <> 3
        THROW 52210, 'Pré-condição inválida: JUL–SET divergiram da posição vazia diagnosticada.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'130',N'131',N'132') AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 1
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL
          AND situacao IS NULL AND dados_entrada_json = N'[]'
          AND usuario_responsavel IS NULL AND versao_atual = 1) <> 3
        THROW 52211, 'Pré-condição inválida: OUT–DEZ divergiram.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id = @indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id = @indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id = @indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id = @indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE indicador_id = @indicadorId OR lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id = @indicadorId))
        THROW 52212, 'Pré-condição inválida: governança do Indicador 11 mudou desde o diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 52213, 'Pré-condição inválida: configurações ausentes ou duplicadas.', 1;

    IF (
        SELECT COUNT(*) FROM dbo.configuracoes CROSS APPLY OPENJSON(valor_json)
        WHERE chave = N'metas' AND JSON_VALUE(value, '$.indicadorId') = @indicadorId
    ) <> 12
       OR EXISTS (
          SELECT mes, meta FROM (VALUES
            (1,CONVERT(DECIMAL(19,10),0.35)),(2,CONVERT(DECIMAL(19,10),0.35)),(3,CONVERT(DECIMAL(19,10),0.35)),
            (4,CONVERT(DECIMAL(19,10),0.70)),(5,CONVERT(DECIMAL(19,10),0.70)),(6,CONVERT(DECIMAL(19,10),0.70)),
            (7,CONVERT(DECIMAL(19,10),0.85)),(8,CONVERT(DECIMAL(19,10),0.85)),(9,CONVERT(DECIMAL(19,10),0.85)),
            (10,CONVERT(DECIMAL(19,10),1)),(11,CONVERT(DECIMAL(19,10),1)),(12,CONVERT(DECIMAL(19,10),1))
          ) v(mes,meta)
          EXCEPT
          SELECT TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')), TRY_CONVERT(DECIMAL(19,10),JSON_VALUE(value,'$.metaMensal'))
          FROM dbo.configuracoes CROSS APPLY OPENJSON(valor_json)
          WHERE chave = N'metas' AND JSON_VALUE(value,'$.indicadorId') = @indicadorId
       )
        THROW 52214, 'Pré-condição inválida: curva de metas do Indicador 11 divergiu.', 1;

    SELECT @regrasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'regrasIndicadores';
    IF ISJSON(@regrasAntes) <> 1
        THROW 52215, 'Pré-condição inválida: regrasIndicadores não contém JSON válido.', 1;

    SELECT @indiceRegra = TRY_CONVERT(INT, [key]), @regra11Antes = value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF @regra11Antes IS NULL
       OR JSON_VALUE(@regra11Antes, '$.nome') <> N'Ampliar Capacidade de Desenvolvimento de Soluções de TIC'
       OR JSON_VALUE(@regra11Antes, '$.tipoCalculo') <> N'marco_projeto_percentual'
       OR JSON_VALUE(@regra11Antes, '$.tipoConsolidacao') <> N'ultima_posicao_trimestral'
       OR JSON_VALUE(@regra11Antes, '$.unidadeMedida') <> N'percentual'
       OR JSON_VALUE(@regra11Antes, '$.parametrosCalculo.metaTipo') <> N'curva_trimestral_percentual'
       OR JSON_VALUE(@regra11Antes, '$.parametrosCalculo.sentidoMeta') <> N'quanto_maior_melhor'
       OR JSON_QUERY(@regra11Antes, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regra11Antes, '$.parametrosCalculo.curvaTrimestralPercentual."1TRI/2026".metaPercentual')) <> 0.35
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regra11Antes, '$.parametrosCalculo.curvaTrimestralPercentual."2TRI/2026".metaPercentual')) <> 0.70
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regra11Antes, '$.parametrosCalculo.curvaTrimestralPercentual."3TRI/2026".metaPercentual')) <> 0.85
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regra11Antes, '$.parametrosCalculo.curvaTrimestralPercentual."4TRI/2026".metaPercentual')) <> 1
        THROW 52216, 'Pré-condição inválida: regra vigente do Indicador 11 divergiu.', 1;

    SET @regra11Depois = JSON_MODIFY(@regra11Antes, '$.parametrosCalculo.mesesFechamentoTrimestral', JSON_QUERY(N'[3,6,9,12]'));
    SET @sqlSubstituirRegra = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[', CONVERT(NVARCHAR(10), @indiceRegra), N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql
        @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada = @regrasAntes,
        @regra = @regra11Depois,
        @saida = @regrasDepois OUTPUT;

    UPDATE dbo.indicadores
    SET nome = N'Ampliar a Capacidade de Desenvolvimento de Soluções de TIC',
        tipo_consolidacao = N'ultima_posicao_trimestral'
    WHERE id = @indicadorId
      AND nome = N'Ampliar Capacidade de Desenvolvimento de Soluções de TIC'
      AND tipo_consolidacao IS NULL;
    SET @linhasIndicador = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dadosJul,
        status = N'Em preenchimento',
        situacao = N'Em acompanhamento'
    WHERE id = N'127' AND indicador_id = @indicadorId;
    SET @linhasLancamentos = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dadosAgo,
        resultado_calculado = N'1',
        resultado_oficial = N'1',
        percentual_atingido = @atingimento3Tri,
        status = N'Em preenchimento',
        situacao = N'Em acompanhamento'
    WHERE id = N'128' AND indicador_id = @indicadorId;
    SET @linhasLancamentos += @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dadosSet,
        resultado_calculado = N'1',
        resultado_oficial = N'1',
        percentual_atingido = @atingimento3Tri,
        status = N'Em preenchimento',
        situacao = N'Atingido'
    WHERE id = N'129' AND indicador_id = @indicadorId;
    SET @linhasLancamentos += @@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json = @regrasDepois
    WHERE chave = N'regrasIndicadores' AND valor_json = @regrasAntes;
    SET @linhasConfiguracoes = @@ROWCOUNT;

    IF @linhasIndicador <> 1 OR @linhasLancamentos <> 3 OR @linhasConfiguracoes <> 1
        THROW 52217, 'Validação falhou: quantidades diferentes de indicadores=1, lançamentos=3, configurações=1.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = @indicadorId
          AND nome = N'Ampliar a Capacidade de Desenvolvimento de Soluções de TIC'
          AND tipo_consolidacao = N'ultima_posicao_trimestral'
          AND unidade_apuradora = N'SUCOL' AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN' AND pilar = N'Tecnologia e Inovação'
          AND periodicidade = N'Não especificada'
          AND tipo_calculo = N'marco_projeto_percentual'
          AND unidade_medida = N'percentual'
    )
        THROW 52218, 'Validação falhou: cadastro final inválido.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'127' AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia) = 0.85
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL
          AND situacao = N'Em acompanhamento'
          AND JSON_VALUE(dados_entrada_json,'$.eventoCapacidadeTicId') = N'os-25173021-spassu-2026'
          AND JSON_VALUE(dados_entrada_json,'$.percentualRealizadoTIC') IS NULL
    )
        THROW 52219, 'Validação falhou: JUL recebeu percentual ou estado inválido.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'128',N'129') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia) = 0.85
          AND TRY_CONVERT(DECIMAL(19,6),resultado_calculado) = 1
          AND TRY_CONVERT(DECIMAL(19,6),resultado_oficial) = 1
          AND ABS(TRY_CONVERT(DECIMAL(38,18),percentual_atingido) - TRY_CONVERT(DECIMAL(38,18),@atingimento3Tri)) < 0.000000000000000001
          AND JSON_VALUE(dados_entrada_json,'$.eventoCapacidadeTicId') = N'os-25173021-spassu-2026'
          AND JSON_VALUE(dados_entrada_json,'$.numeroOrdemServicoTIC') = N'25173021'
          AND JSON_VALUE(dados_entrada_json,'$.dataAberturaOrdemServicoTIC') = N'2026-06-10'
          AND JSON_VALUE(dados_entrada_json,'$.dataConclusaoOrdemServicoTIC') = N'2026-08-14'
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.quantidadeProfissionaisAdicionaisTIC')) = 18
          AND JSON_VALUE(dados_entrada_json,'$.fabricaSoftwareTIC') = N'Spassu') <> 2
        THROW 52220, 'Validação falhou: AGO/SET não preservam o mesmo evento ou o atingimento esperado.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'128' AND situacao=N'Em acompanhamento')
       OR NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'129' AND situacao=N'Atingido')
       OR JSON_QUERY(@regra11Depois,'$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
        THROW 52221, 'Validação falhou: situações intermediária/final ou fechamentos inválidos.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id <> @indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id <> @indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id <> @indicadorId)
        THROW 52222, 'Validação falhou: outro indicador foi alterado.', 1;

    IF EXISTS (
        SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
    ) OR EXISTS (
        SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id = @indicadorId
        EXCEPT
        SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id = @indicadorId
    )
        THROW 52223, 'Validação falhou: campo cadastral não autorizado foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'127',N'128',N'129')
        EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'127',N'128',N'129')
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'127',N'128',N'129')
        EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'127',N'128',N'129')
    )
        THROW 52224, 'Validação falhou: lançamento fora de JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'127',N'128',N'129')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'127',N'128',N'129')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'127',N'128',N'129')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               meta_referencia,observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,
               usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'127',N'128',N'129')
    )
        THROW 52225, 'Validação falhou: campo protegido de JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores'
        EXCEPT SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores'
    ) OR EXISTS (
        SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores'
        EXCEPT SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores'
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId') <> @indicadorId
    )
        THROW 52226, 'Validação falhou: configuração não relacionada foi alterada.', 1;

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
        THROW 52227, 'Validação falhou: governança foi criada, removida ou alterada.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS transacao,
           @migration AS migration,
           @linhasIndicador AS indicadores_alterados,
           @linhasLancamentos AS lancamentos_alterados,
           @linhasConfiguracoes AS configuracoes_alteradas,
           0 AS registros_criados,
           0 AS registros_removidos;
    SELECT id,competencia,status,meta_referencia,resultado_calculado,resultado_oficial,
           percentual_atingido,situacao,versao_atual
    FROM dbo.lancamentos
    WHERE indicador_id = @indicadorId
    ORDER BY mes;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
