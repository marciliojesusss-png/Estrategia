/*
  Indicador 09 - Vendas com Meio de Pagamento PIX

  PREPARADA EM 2026-10-22. ESTE ARQUIVO NÃO FOI EXECUTADO NESTA ETAPA.

  Escopo futuro:
  - substituir a massa de teste de jan-mar pelas posições oficiais disponíveis;
  - carregar as posições acumuladas de jan-set sem somá-las novamente;
  - preservar separadamente cálculo técnico, resultado oficial e atingimento oficial;
  - configurar fechamentos trimestrais em mar/jun/set/dez;
  - arquivar em auditoria a fotografia da governança fictícia antes de retirar seu efeito;
  - não criar homologação nem evidência e deixar jan-set aguardando validação real.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'9';
    DECLARE @agora NVARCHAR(40) = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127);
    DECLARE @auditoriaArquivoId NVARCHAR(100) = N'auditoria-migracao-ind9-20261022-003';
    DECLARE @regraAntes NVARCHAR(MAX);
    DECLARE @regraDepois NVARCHAR(MAX);
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @novasMetas NVARCHAR(MAX);
    DECLARE @regraIndex INT;
    DECLARE @snapshotTeste NVARCHAR(MAX);
    DECLARE @linhasIndicador INT;
    DECLARE @linhasLancamentos INT;
    DECLARE @linhasRegras INT;
    DECLARE @linhasMetas INT;
    DECLARE @homologacoesRemovidas INT;
    DECLARE @evidenciasRemovidas INT;
    DECLARE @auditoriasCriadas INT;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
        THROW 51301, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND nome = N'Vendas com Meio de Pagamento PIX'
          AND unidade_apuradora = N'SULOT'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN'
          AND unidade_medida = N'percentual'
          AND tipo_calculo = N'razao_pix'
    )
        THROW 51302, 'Pré-condição inválida: identidade do indicador 09 diverge do diagnóstico.', 1;

    IF EXISTS (SELECT 1 FROM dbo.auditoria WHERE id = @auditoriaArquivoId)
        THROW 51303, 'Pré-condição inválida: a fotografia técnica desta correção já existe.', 1;

    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK)
        WHERE indicador_id = @indicadorId
          AND id IN (N'97',N'98',N'99',N'100',N'101',N'102',N'103',N'104',N'105',N'106',N'107',N'108')
          AND competencia = CONCAT(N'2026-', RIGHT(N'0' + CONVERT(NVARCHAR(2), mes), 2))
          AND ano = 2026
          AND mes BETWEEN 1 AND 12
          AND unidade_apuradora = N'SULOT'
          AND diretoria_responsavel = N'DICOT'
          AND versao_atual = 1
    ) <> 12 OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
        THROW 51304, 'Pré-condição inválida: os 12 lançamentos do indicador 09 não correspondem aos IDs 97 a 108.', 1;

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos
        WHERE id IN (N'97',N'98',N'99')
          AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND observacao_unidade = N'teste'
          AND usuario_responsavel = N'sulot@caixaloterias.local'
          AND JSON_VALUE(dados_entrada_json, '$.arrecadacaoPixMes') IS NOT NULL
          AND JSON_VALUE(dados_entrada_json, '$.arrecadacaoTotalCanaisEletronicosMes') IS NOT NULL
          AND evidencia_id = CONCAT(N'evidencia-', id)
    ) <> 3
        THROW 51305, 'Pré-condição inválida: jan-mar não correspondem à massa de teste diagnosticada.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id IN (N'97',N'98',N'99')
          AND (
            TRY_CONVERT(DECIMAL(10,6),meta_referencia)<>CAST(0.61 AS DECIMAL(10,6))
            OR TRY_CONVERT(DECIMAL(18,6),resultado_calculado)<>CASE id WHEN N'97' THEN 0.658286 WHEN N'98' THEN 0.678720 WHEN N'99' THEN 0.670155 END
            OR TRY_CONVERT(DECIMAL(18,6),resultado_oficial)<>CASE id WHEN N'97' THEN 0.658286 WHEN N'98' THEN 0.667614 WHEN N'99' THEN 0.668422 END
            OR TRY_CONVERT(DECIMAL(18,5),percentual_atingido)<>CASE id WHEN N'97' THEN 1.01275 WHEN N'98' THEN 1.04418 WHEN N'99' THEN 1.03101 END
          )
    )
        THROW 51306, 'Pré-condição inválida: valores derivados da massa de teste divergem do diagnóstico.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id IN (N'100',N'101',N'102',N'103',N'104',N'105',N'106',N'107',N'108')
          AND (
              indicador_id <> @indicadorId OR status <> N'Não iniciado' OR dados_entrada_json <> N'[]'
              OR resultado_calculado IS NOT NULL OR resultado_oficial IS NOT NULL
              OR percentual_atingido IS NOT NULL OR situacao IS NOT NULL OR evidencia_id IS NOT NULL
          )
    )
        THROW 51307, 'Pré-condição inválida: abr-dez já possuem conteúdo ou estado divergente.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id IN (N'100',N'101',N'102',N'103',N'104',N'105',N'106',N'107',N'108')
          AND TRY_CONVERT(DECIMAL(10,6),meta_referencia)<>CASE
            WHEN id IN (N'100',N'101',N'102') THEN 0.62
            WHEN id IN (N'103',N'104',N'105') THEN 0.63
            ELSE 0.65 END
    )
        THROW 51308, 'Pré-condição inválida: metas persistidas de abr-dez divergem do diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes WHERE lancamento_id IN (N'97',N'98',N'99')) <> 3
       OR EXISTS (
          SELECT 1 FROM dbo.homologacoes
          WHERE lancamento_id IN (N'97',N'98',N'99')
            AND (id NOT IN (N'7',N'8',N'9') OR acao <> N'registro')
       )
        THROW 51309, 'Pré-condição inválida: homologações fictícias divergem do diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id IN (N'97',N'98',N'99')) <> 3
       OR EXISTS (
          SELECT 1 FROM dbo.evidencias
          WHERE lancamento_id IN (N'97',N'98',N'99')
            AND (id <> CONCAT(N'evidencia-', lancamento_id) OR nome_arquivo <> N'referencia-textual'
              OR ISNULL(caminho_arquivo, N'') <> N'' OR descricao <> N'teste')
       )
        THROW 51310, 'Pré-condição inválida: evidências fictícias divergem do diagnóstico.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'97',N'98',N'99')
    ) OR EXISTS (
        SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'97',N'98',N'99')
    )
        THROW 51311, 'Pré-condição inválida: a massa de teste possui retificação ou reabertura não diagnosticada.', 1;

    IF (
        SELECT COUNT(*) FROM dbo.auditoria
        WHERE entidade = N'lancamentos' AND entidade_id IN (N'97',N'98',N'99')
          AND acao IN (N'envio_para_homologacao', N'homologacao_lancamento')
    ) <> 6
        THROW 51312, 'Pré-condição inválida: trilha histórica da massa de teste diverge das seis ações diagnosticadas.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
        THROW 51313, 'Pré-condição inválida: configurações de regras ou metas ausentes/duplicadas.', 1;

    SELECT @regrasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'regrasIndicadores';
    SELECT @metasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'metas';

    IF ISJSON(@regrasAntes) <> 1 OR ISJSON(@metasAntes) <> 1
        THROW 51314, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 1
        THROW 51315, 'Pré-condição inválida: regra do indicador 09 ausente ou ambígua.', 1;

    SELECT @regraIndex = TRY_CONVERT(INT, [key]), @regraAntes = value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;

    IF JSON_VALUE(@regraAntes, '$.tipoCalculo') <> N'razao_pix'
       OR JSON_VALUE(@regraAntes, '$.tipoConsolidacao') <> N'razao_acumulada_no_ano'
       OR JSON_VALUE(@regraAntes, '$.parametrosCalculo.campoNumerador') <> N'arrecadacaoPixMes'
       OR JSON_VALUE(@regraAntes, '$.parametrosCalculo.campoDenominador') <> N'arrecadacaoTotalCanaisEletronicosMes'
       OR JSON_QUERY(@regraAntes, '$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
        THROW 51316, 'Pré-condição inválida: modelagem vigente do PIX diverge do diagnóstico.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 3
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasAntes)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND (TRY_CONVERT(INT, [key]) NOT IN (69,70,71)
              OR TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) NOT IN (1,2,3)
              OR TRY_CONVERT(DECIMAL(10,6), JSON_VALUE(value, '$.metaMensal')) <> CAST(0.61 AS DECIMAL(10,6)))
       )
        THROW 51317, 'Pré-condição inválida: metas atuais do indicador 09 divergem das três competências diagnosticadas.', 1;

    SELECT @snapshotTeste = (
        SELECT
          N'MASSA DE TESTE — NÃO OFICIAL' AS classificacao,
          N'MASSA DE TESTE — NÃO OFICIAL' AS motivo,
          N'20261022_003_indicador09_modelagem_carga_oficial.sql' AS migration_corretiva,
          JSON_QUERY((SELECT * FROM #lancamentosAntes WHERE id IN (N'97',N'98',N'99') ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES)) AS lancamentos,
          JSON_QUERY((SELECT * FROM #homologacoesAntes WHERE lancamento_id IN (N'97',N'98',N'99') ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES)) AS homologacoes,
          JSON_QUERY((SELECT * FROM #evidenciasAntes WHERE lancamento_id IN (N'97',N'98',N'99') ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES)) AS evidencias,
          JSON_QUERY((SELECT * FROM #auditoriaAntes WHERE entidade = N'lancamentos' AND entidade_id IN (N'97',N'98',N'99') ORDER BY data_acao, id FOR JSON PATH, INCLUDE_NULL_VALUES)) AS auditoria_preservada
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    SET @regraDepois = N'{
      "indicadorId":9,"nome":"Vendas com Meio de Pagamento PIX","tipoCalculo":"razao_pix",
      "tipoConsolidacao":"ultima_posicao_acumulada","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":0.65,
      "parametrosCalculo":{
        "campoNumeradorAcumulado":"arrecadacaoPixAcumuladaCompetencia",
        "campoDenominadorAcumulado":"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia",
        "campoNumeradorMensalLegado":"arrecadacaoPixMes","campoDenominadorMensalLegado":"arrecadacaoTotalCanaisEletronicosMes",
        "campoResultadoOficial":"resultadoOficialPix","campoPercentualAtingidoOficial":"percentualAtingidoOficialPix",
        "modoEntrada":"posicao_acumulada_prioritaria","excluirInternetBankingCaixa":true,
        "observacaoMetodologica":"O denominador exclui Internet Banking CAIXA (IBC), pois o PIX não é aceito nesse canal.",
        "metasTrimestrais":{"1TRI/2026":0.61,"2TRI/2026":0.62,"3TRI/2026":0.63,"4TRI/2026":0.65},
        "metasOperacionaisPorCompetencia":{"2026-01":0.63,"2026-02":0.61,"2026-03":0.61,"2026-04":0.61,"2026-05":0.61,"2026-06":0.62,"2026-07":0.63,"2026-08":0.63,"2026-09":0.63,"2026-10":0.6342,"2026-11":0.6383,"2026-12":0.6543},
        "trajetoriaTecnicaAuxiliar":{"2026-07":0.6215,"2026-08":0.6255,"2026-09":0.6298},
        "mesesFechamentoTrimestral":[3,6,9,12],
        "apresentacoesOficiaisTrimestrais":{
          "1TRI/2026":{"metaOficialReportada":0.61,"resultadoOficialReportado":0.67,"percentualAtingidoOficialReportado":1.1009,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},
          "2TRI/2026":{"metaOficialReportada":0.62,"resultadoOficialReportado":0.6713,"percentualAtingidoOficialReportado":1.0914,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0056/2026"},
          "3TRI/2026":{"metaOficialReportada":0.63,"resultadoOficialReportado":0.6764,"percentualAtingidoOficialReportado":1.0737,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0078/2026"},
          "4TRI/2026":{"metaOficialReportada":0.65,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":"Sem dados","fonte":"Curva trimestral oficial 2026"}
        }
      },
      "camposEntrada":[
        {"nome":"arrecadacaoPixAcumuladaCompetencia","rotulo":"Arrecadação com PIX acumulada até a competência","tipo":"moeda","obrigatorio":false},
        {"nome":"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia","rotulo":"Arrecadação total acumulada nos canais eletrônicos (sem IBC)","tipo":"moeda","obrigatorio":false},
        {"nome":"resultadoOficialPix","rotulo":"Resultado oficial reportado","tipo":"percentual","obrigatorio":false},
        {"nome":"percentualAtingidoOficialPix","rotulo":"Atingimento oficial reportado","tipo":"percentual","obrigatorio":false}
      ],
      "campoResultadoPrincipal":"resultadoAcumulado","campoPercentualAtingido":"percentualAtingidoAnual",
      "exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"resultado_documental_do_informe_preservado"
    }';

    IF ISJSON(@regraDepois) <> 1
        THROW 51318, 'Validação interna falhou: nova regra não é JSON válido.', 1;

    DECLARE @sqlSubstituirRegra NVARCHAR(MAX) = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[', CONVERT(NVARCHAR(10), @regraIndex), N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada=@regrasAntes, @regra=@regraDepois, @saida=@regrasDepois OUTPUT;

    SET @novasMetas = N'[
      {"id":25,"indicadorId":9,"ano":2026,"mes":1,"nomeMes":"Janeiro","metaMensal":0.63,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":26,"indicadorId":9,"ano":2026,"mes":2,"nomeMes":"Fevereiro","metaMensal":0.61,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":27,"indicadorId":9,"ano":2026,"mes":3,"nomeMes":"Março","metaMensal":0.61,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":160,"indicadorId":9,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":0.61,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":161,"indicadorId":9,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":0.61,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":162,"indicadorId":9,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":0.62,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":163,"indicadorId":9,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":0.63,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":164,"indicadorId":9,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":0.63,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":165,"indicadorId":9,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":0.63,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":166,"indicadorId":9,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":0.6342,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":167,"indicadorId":9,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":0.6383,"fonte":"planilha_16_10_meta_operacional_mensal"},
      {"id":168,"indicadorId":9,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":0.6543,"fonte":"planilha_16_10_meta_operacional_mensal"}
    ]';

    DECLARE @partesMetas TABLE (ordem INT NOT NULL, json_item NVARCHAR(MAX) NOT NULL);
    INSERT INTO @partesMetas (ordem, json_item)
    SELECT CASE WHEN TRY_CONVERT(INT, [key]) < 69 THEN TRY_CONVERT(INT, [key]) * 100
                ELSE TRY_CONVERT(INT, [key]) * 100 + 50 END, value
    FROM OPENJSON(@metasAntes)
    WHERE JSON_VALUE(value, '$.indicadorId') <> @indicadorId;

    INSERT INTO @partesMetas (ordem, json_item)
    SELECT 6900 + TRY_CONVERT(INT, [key]), value FROM OPENJSON(@novasMetas);

    SELECT @metasDepois = N'[' + ISNULL(STUFF((
      SELECT N',' + p.json_item
      FROM @partesMetas p
      ORDER BY p.ordem
      FOR XML PATH(N''), TYPE
    ).value(N'.', N'nvarchar(max)'), 1, 1, N''), N'') + N']';

    IF ISJSON(@metasDepois) <> 1
        THROW 51319, 'Validação interna falhou: nova configuração de metas não é JSON válido.', 1;

    UPDATE dbo.configuracoes SET valor_json=@regrasDepois, updated_at=@agora WHERE chave=N'regrasIndicadores';
    SET @linhasRegras = @@ROWCOUNT;
    UPDATE dbo.configuracoes SET valor_json=@metasDepois, updated_at=@agora WHERE chave=N'metas';
    SET @linhasMetas = @@ROWCOUNT;
    IF @linhasRegras <> 1 OR @linhasMetas <> 1
        THROW 51320, 'Validação falhou: regras/metas não alteraram exatamente uma linha cada.', 1;

    UPDATE dbo.indicadores
    SET tipo_consolidacao=N'ultima_posicao_acumulada',
        observacao_acompanhamento=N'A base de arrecadação dos canais eletrônicos usada na apuração do PIX não considera Internet Banking CAIXA (IBC), pois o PIX não é aceito nesse canal.',
        updated_at=@agora
    WHERE id=@indicadorId;
    SET @linhasIndicador = @@ROWCOUNT;
    IF @linhasIndicador <> 1 THROW 51321, 'Validação falhou: cadastro do indicador 09 não alterou uma linha.', 1;

    DECLARE @carga TABLE (
      id NVARCHAR(100) PRIMARY KEY, meta DECIMAL(10,6), dados NVARCHAR(MAX) NULL,
      resultado_calculado DECIMAL(38,18) NULL, resultado_oficial DECIMAL(38,18) NULL,
      percentual_oficial DECIMAL(38,18) NULL, observacao NVARCHAR(MAX) NULL,
      referencia NVARCHAR(MAX) NULL, carregar BIT NOT NULL
    );

    INSERT INTO @carga VALUES
      (N'97',  0.63, N'{"arrecadacaoPixAcumuladaCompetencia":411428638.26,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":602431775.22,"resultadoOficialPix":0.6829,"fontePosicaoPix":"Planilha 16.10"}', 0.682946443370707, 0.6829, NULL, N'Posição acumulada oficial disponível; competência de acompanhamento, sem fechamento trimestral.', N'Planilha 16.10', 1),
      (N'98',  0.61, N'{"arrecadacaoPixAcumuladaCompetencia":767756452.21,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":1143106805.37,"resultadoOficialPix":0.6716,"fontePosicaoPix":"Planilha 16.10"}', 0.671640172732147, 0.6716, NULL, N'Posição acumulada oficial disponível; competência de acompanhamento, sem fechamento trimestral.', N'Planilha 16.10', 1),
      (N'99',  0.61, N'{"arrecadacaoPixAcumuladaCompetencia":1127026595.61,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":1686118105.09,"resultadoOficialPix":0.67,"percentualAtingidoOficialPix":1.1009,"fontePosicaoPix":"Informe DILOT/GERIN nº 0029/2026"}', 0.668414977698044, 0.67, 1.1009, N'Fechamento documental do 1TRI carregado; aguarda nova homologação e evidência real.', N'Informe DILOT/GERIN nº 0029/2026', 1),
      (N'100', 0.61, N'{"arrecadacaoPixAcumuladaCompetencia":1493930542.96,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":2239097450.22,"resultadoOficialPix":0.6672,"fontePosicaoPix":"Planilha 16.10"}', 0.667202109856012, 0.6672, NULL, N'Posição acumulada oficial disponível; competência de acompanhamento, sem fechamento trimestral.', N'Planilha 16.10', 1),
      (N'101', 0.61, N'{"arrecadacaoPixAcumuladaCompetencia":1879578537.20,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":2807652712.29,"resultadoOficialPix":0.6694,"fontePosicaoPix":"Planilha 16.10"}', 0.669448371934492, 0.6694, NULL, N'Posição acumulada oficial disponível; competência de acompanhamento, sem fechamento trimestral.', N'Planilha 16.10', 1),
      (N'102', 0.62, N'{"arrecadacaoPixAcumuladaCompetencia":2261919134.59,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":3369675084.95,"resultadoOficialPix":0.6713,"percentualAtingidoOficialPix":1.0914,"fontePosicaoPix":"Informe DILOT/GERIN nº 0056/2026"}', 0.671257340119355, 0.6713, 1.0914, N'Fechamento documental do 2TRI carregado; aguarda nova homologação e evidência real.', N'Informe DILOT/GERIN nº 0056/2026', 1),
      (N'103', 0.63, N'{"arrecadacaoPixAcumuladaCompetencia":2653634223.87,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":3943590603.88,"resultadoOficialPix":0.672898,"fontePosicaoPix":"Planilha 16.10"}', 0.672897998402561, 0.672898, NULL, N'Posição acumulada oficial disponível; competência de acompanhamento, sem fechamento trimestral.', N'Planilha 16.10', 1),
      (N'104', 0.63, N'{"arrecadacaoPixAcumuladaCompetencia":3076438388.87,"arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia":4555836512.10,"resultadoOficialPix":0.675274,"fontePosicaoPix":"Planilha 16.10"}', 0.675274097457006, 0.675274, NULL, N'Posição acumulada oficial disponível; competência de acompanhamento, sem fechamento trimestral.', N'Planilha 16.10', 1),
      (N'105', 0.63, N'{"arrecadacaoPixAcumuladaCompetenciaAproximada":3538000000,"resultadoOficialPix":0.6764,"percentualAtingidoOficialPix":1.0737,"fontePosicaoPix":"Informe DILOT/GERIN nº 0078/2026","lacunaComponenteFinanceiroPix":"Denominador exato de setembro não localizado; não derivar artificialmente."}', NULL, 0.6764, 1.0737, N'Fechamento documental do 3TRI carregado sem inventar o denominador exato; aguarda nova homologação e evidência real.', N'Informe DILOT/GERIN nº 0078/2026', 1),
      (N'106', 0.6342, NULL, NULL, NULL, NULL, NULL, NULL, 0),
      (N'107', 0.6383, NULL, NULL, NULL, NULL, NULL, NULL, 0),
      (N'108', 0.6543, NULL, NULL, NULL, NULL, NULL, NULL, 0);

    UPDATE l
    SET dados_entrada_json=CASE WHEN c.carregar=1 THEN c.dados ELSE l.dados_entrada_json END,
        resultado_calculado=CASE WHEN c.carregar=1 THEN CONVERT(NVARCHAR(100), c.resultado_calculado) ELSE l.resultado_calculado END,
        resultado_oficial=CASE WHEN c.carregar=1 THEN CONVERT(NVARCHAR(100), c.resultado_oficial) ELSE l.resultado_oficial END,
        meta_referencia=CONVERT(NVARCHAR(100), c.meta),
        percentual_atingido=CASE WHEN c.carregar=1 THEN CONVERT(NVARCHAR(100), c.percentual_oficial) ELSE l.percentual_atingido END,
        situacao=CASE WHEN c.carregar=1 THEN N'Em acompanhamento' ELSE l.situacao END,
        status=CASE WHEN c.carregar=1 THEN N'Em preenchimento' ELSE l.status END,
        observacao_unidade=CASE WHEN c.carregar=1 THEN c.observacao ELSE l.observacao_unidade END,
        referencia_evidencia=CASE WHEN c.carregar=1 THEN c.referencia ELSE l.referencia_evidencia END,
        evidencia_id=CASE WHEN c.carregar=1 THEN NULL ELSE l.evidencia_id END,
        usuario_responsavel=CASE WHEN c.carregar=1 THEN NULL ELSE l.usuario_responsavel END,
        updated_at=@agora
    FROM dbo.lancamentos l JOIN @carga c ON c.id=l.id
    WHERE l.indicador_id=@indicadorId;
    SET @linhasLancamentos = @@ROWCOUNT;
    IF @linhasLancamentos <> 12 THROW 51322, 'Validação falhou: a carga não alterou exatamente 12 lançamentos.', 1;

    INSERT INTO dbo.auditoria
      (id,entidade,entidade_id,acao,descricao,dados_anteriores_json,dados_novos_json,usuario,perfil_usuario,data_acao,created_at)
    VALUES
      (@auditoriaArquivoId,N'indicadores',@indicadorId,N'ARQUIVAMENTO_MASSA_TESTE_NAO_OFICIAL',
       N'Fotografia técnica criada antes de retirar o efeito oficial das homologações e evidências fictícias do Indicador 09.',
       @snapshotTeste,
       N'{"migration_corretiva":"20261022_003_indicador09_modelagem_carga_oficial.sql","motivo_arquivamento":"MASSA DE TESTE — NÃO OFICIAL","status":"dados_oficiais_carregados_sem_homologacao","homologacoes_criadas":0,"evidencias_criadas":0,"requer_nova_homologacao_e_evidencia_real":true}',
       N'migration:20261022_003',N'Sistema',@agora,@agora);
    SET @auditoriasCriadas = @@ROWCOUNT;

    DELETE FROM dbo.homologacoes WHERE lancamento_id IN (N'97',N'98',N'99');
    SET @homologacoesRemovidas = @@ROWCOUNT;
    DELETE FROM dbo.evidencias WHERE lancamento_id IN (N'97',N'98',N'99');
    SET @evidenciasRemovidas = @@ROWCOUNT;

    IF @auditoriasCriadas <> 1 OR @homologacoesRemovidas <> 3 OR @evidenciasRemovidas <> 3
        THROW 51323, 'Validação falhou: arquivamento técnico ou retirada da governança fictícia divergiu do esperado.', 1;

    IF NOT EXISTS (
      SELECT 1 FROM dbo.indicadores
      WHERE id=@indicadorId AND unidade_apuradora=N'SULOT' AND diretoria_responsavel=N'DICOT'
        AND plano=N'PN' AND tipo_calculo=N'razao_pix' AND tipo_consolidacao=N'ultima_posicao_acumulada'
        AND observacao_acompanhamento LIKE N'%Internet Banking CAIXA%'
    ) THROW 51324, 'Validação falhou: identidade ou metodologia final do indicador 09 incorreta.', 1;

    IF EXISTS (
      SELECT 1 FROM dbo.lancamentos l JOIN @carga c ON c.id=l.id
      WHERE l.indicador_id<>@indicadorId OR TRY_CONVERT(DECIMAL(10,6),l.meta_referencia)<>c.meta
        OR l.versao_atual<>1
        OR (c.carregar=1 AND (l.status<>N'Em preenchimento' OR l.situacao<>N'Em acompanhamento'
          OR l.evidencia_id IS NOT NULL OR l.usuario_responsavel IS NOT NULL OR ISJSON(l.dados_entrada_json)<>1))
    ) THROW 51325, 'Validação falhou: estado final dos lançamentos diverge da carga autorizável.', 1;

    IF EXISTS (
      SELECT 1 FROM dbo.lancamentos l JOIN @carga c ON c.id=l.id
      WHERE c.carregar=1 AND (
        ISNULL(TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial),-1)<>ISNULL(c.resultado_oficial,-1)
        OR ISNULL(TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado),-1)<>ISNULL(c.resultado_calculado,-1)
        OR ISNULL(TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido),-1)<>ISNULL(c.percentual_oficial,-1)
      )
    ) THROW 51326, 'Validação falhou: cálculo técnico, resultado ou atingimento oficial foram confundidos.', 1;

    IF JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'105'), '$.arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia') IS NOT NULL
       OR (SELECT resultado_calculado FROM dbo.lancamentos WHERE id=N'105') IS NOT NULL
        THROW 51327, 'Validação falhou: foi criado denominador ou resultado técnico artificial para setembro.', 1;

    IF EXISTS (
      SELECT a.id FROM #lancamentosAntes a JOIN dbo.lancamentos d ON d.id=a.id
      WHERE a.id IN (N'97',N'98',N'99',N'100',N'101',N'102',N'103',N'104',N'105',N'106',N'107',N'108')
        AND (a.created_at<>d.created_at OR a.versao_atual<>d.versao_atual OR a.competencia<>d.competencia
          OR a.ano<>d.ano OR a.mes<>d.mes OR a.trimestre<>d.trimestre OR a.unidade_apuradora<>d.unidade_apuradora
          OR a.diretoria_responsavel<>d.diretoria_responsavel OR a.plano<>d.plano OR a.pilar<>d.pilar)
    ) THROW 51328, 'Validação falhou: competência, versão, criação ou responsabilidade organizacional foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE indicador_id<>@indicadorId EXCEPT SELECT * FROM #lancamentosAntes WHERE indicador_id<>@indicadorId)
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE indicador_id<>@indicadorId EXCEPT SELECT * FROM dbo.lancamentos WHERE indicador_id<>@indicadorId)
        THROW 51329, 'Validação falhou: lançamento de outro indicador foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id<>@indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
        THROW 51330, 'Validação falhou: outro indicador foi alterado, inclusive 16, 17 ou 19.', 1;

    IF EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
        THROW 51331, 'Validação falhou: retificação ou solicitação de reabertura foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes WHERE lancamento_id NOT IN (N'97',N'98',N'99'))
       OR EXISTS (SELECT * FROM #homologacoesAntes WHERE lancamento_id NOT IN (N'97',N'98',N'99') EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'97',N'98',N'99'))
        THROW 51332, 'Validação falhou: homologação alheia ao teste foi alterada ou uma nova homologação foi criada.', 1;

    IF EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes WHERE lancamento_id NOT IN (N'97',N'98',N'99'))
       OR EXISTS (SELECT * FROM #evidenciasAntes WHERE lancamento_id NOT IN (N'97',N'98',N'99') EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'97',N'98',N'99'))
        THROW 51333, 'Validação falhou: evidência alheia ao teste foi alterada ou uma nova evidência foi criada.', 1;

    IF EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
       OR (SELECT COUNT(*) FROM dbo.auditoria)<>(SELECT COUNT(*)+1 FROM #auditoriaAntes)
       OR NOT EXISTS (SELECT 1 FROM dbo.auditoria WHERE id=@auditoriaArquivoId AND dados_anteriores_json=@snapshotTeste)
        THROW 51334, 'Validação falhou: auditoria histórica não foi preservada integralmente.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'regrasIndicadores',N'metas') EXCEPT SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'regrasIndicadores',N'metas'))
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'regrasIndicadores',N'metas') EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'regrasIndicadores',N'metas'))
        THROW 51335, 'Validação falhou: configuração fora do escopo foi alterada.', 1;

    IF EXISTS (
      SELECT value FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
      EXCEPT SELECT value FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
      SELECT value FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
      EXCEPT SELECT value FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
      SELECT value FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
      EXCEPT SELECT value FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
      SELECT value FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
      EXCEPT SELECT value FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) THROW 51336, 'Validação falhou: regra ou meta de outro indicador foi alterada.', 1;

    IF JSON_QUERY(@regraDepois,'$.parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
       OR TRY_CONVERT(DECIMAL(10,6),JSON_VALUE(@regraDepois,'$.parametrosCalculo.metasTrimestrais."1TRI/2026"'))<>0.61
       OR TRY_CONVERT(DECIMAL(10,6),JSON_VALUE(@regraDepois,'$.parametrosCalculo.metasTrimestrais."2TRI/2026"'))<>0.62
       OR TRY_CONVERT(DECIMAL(10,6),JSON_VALUE(@regraDepois,'$.parametrosCalculo.metasTrimestrais."3TRI/2026"'))<>0.63
       OR TRY_CONVERT(DECIMAL(10,6),JSON_VALUE(@regraDepois,'$.parametrosCalculo.metasTrimestrais."4TRI/2026"'))<>0.65
        THROW 51337, 'Validação falhou: curva oficial de fechamento trimestral incorreta.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS resultado_transacao, @linhasIndicador AS indicadores_alterados,
      @linhasLancamentos AS lancamentos_alterados, @linhasRegras+@linhasMetas AS configuracoes_alteradas,
      @homologacoesRemovidas AS homologacoes_teste_arquivadas_e_removidas,
      @evidenciasRemovidas AS evidencias_teste_arquivadas_e_removidas,
      @auditoriasCriadas AS fotografias_auditoria_criadas,
      CAST(0 AS INT) AS homologacoes_criadas, CAST(0 AS INT) AS evidencias_criadas;

    SELECT id,competencia,status,versao_atual,meta_referencia,resultado_calculado,resultado_oficial,
      percentual_atingido,situacao,evidencia_id,referencia_evidencia,dados_entrada_json
    FROM dbo.lancamentos WHERE indicador_id=@indicadorId ORDER BY mes;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
