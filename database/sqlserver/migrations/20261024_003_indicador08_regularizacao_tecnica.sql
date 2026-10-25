/*
  Indicador 08 — Vendas Provenientes de Canais Digitais

  Esta migration somente pode ser executada depois que JAN/FEV/MAR (IDs 85–87)
  tiverem sido corrigidos pelo fluxo normal da aplicação. Esses três lançamentos
  são protegidos e nunca recebem DML neste arquivo.

  Escopo persistente:
  - dbo.indicadores: ID 8, somente tipo_consolidacao;
  - dbo.lancamentos: IDs 88–96;
  - dbo.configuracoes: metas e regrasIndicadores.

  Não há DML em homologacoes, evidencias, auditoria, retificacoes ou
  solicitacoes_reabertura. Preparar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52801, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'8';
    DECLARE @linhasIndicador INT = 0;
    DECLARE @linhasLancamentos INT = 0;
    DECLARE @linhasConfiguracoes INT = 0;
    DECLARE @janMarAntes NVARCHAR(MAX);
    DECLARE @governancaAntes NVARCHAR(MAX);
    DECLARE @janMarDepois NVARCHAR(MAX);
    DECLARE @governancaDepois NVARCHAR(MAX);
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regraFinal NVARCHAR(MAX) = N'{
      "indicadorId":8,
      "nome":"Vendas Provenientes de Canais Digitais",
      "tipoCalculo":"razao_canais_digitais",
      "tipoConsolidacao":"razao_acumulada_no_periodo",
      "metaRecorrente":false,
      "unidadeMedida":"percentual",
      "metaAnualValor":0.2911,
      "parametrosCalculo":{
        "campoNumerador":"arrecadacaoCanaisEletronicosMes",
        "campoDenominador":"arrecadacaoTotalProdutosLoteriasMes",
        "campoResultadoAcumuladoDocumental":"resultadoAcumuladoDocumentalCanaisDigitais",
        "campoPercentualAtingidoOficial":"percentualAtingidoOficialCanaisDigitais",
        "percentualReferencia2025":0.2305,
        "acrescimoMetaPontosPercentuais":0.05,
        "metaTipo":"curva_por_competencia",
        "metasPorCompetencia":{"2026-01":0.2770,"2026-02":0.2829,"2026-03":0.2805,"2026-04":0.2803,"2026-05":0.2798,"2026-06":0.2798,"2026-07":0.2815,"2026-08":0.2827,"2026-09":0.2837,"2026-10":0.2859,"2026-11":0.2878,"2026-12":0.2911},
        "mesesFechamentoTrimestral":[3,6,9,12],
        "apresentacoesOficiaisTrimestrais":{
          "1TRI/2026":{"metaOficialReportada":0.2805,"resultadoOficialReportado":0.2967,"percentualAtingidoOficialReportado":1.058,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},
          "2TRI/2026":{"metaOficialReportada":0.2798,"resultadoOficialReportado":0.2902,"percentualAtingidoOficialReportado":1.0372,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0056/2026"},
          "3TRI/2026":{"metaOficialReportada":0.2837,"resultadoOficialReportado":0.2917,"percentualAtingidoOficialReportado":1.0282,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0078/2026"},
          "4TRI/2026":{"metaOficialReportada":0.2911,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":"Sem dados","fonte":"16.10(3).xlsx"}
        }
      },
      "camposEntrada":[
        {"nome":"arrecadacaoCanaisEletronicosMes","rotulo":"Arrecadação total nos canais eletrônicos no mês","tipo":"moeda","obrigatorio":false},
        {"nome":"arrecadacaoTotalProdutosLoteriasMes","rotulo":"Arrecadação total dos produtos de loterias no mês","tipo":"moeda","obrigatorio":false},
        {"nome":"resultadoAcumuladoDocumentalCanaisDigitais","rotulo":"Resultado acumulado documental","tipo":"percentual","escalaPercentual":"decimal","obrigatorio":false},
        {"nome":"percentualAtingidoOficialCanaisDigitais","rotulo":"Atingimento oficial documental","tipo":"percentual","escalaPercentual":"decimal","obrigatorio":false},
        {"nome":"tipoPosicaoCanaisDigitais","rotulo":"Natureza da posição","tipo":"texto","obrigatorio":false},
        {"nome":"fonteResultadoCanaisDigitais","rotulo":"Fonte documental","tipo":"texto","obrigatorio":false}
      ],
      "campoResultadoPrincipal":"resultadoAcumulado",
      "campoPercentualAtingido":"percentualAtingidoAnual",
      "exigeJustificativa":false,
      "exigeEvidencia":true,
      "resultadoOficial":"razao_acumulada_homologada_no_periodo"
    }';

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
        THROW 52802, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores WITH (UPDLOCK,HOLDLOCK)
        WHERE id=@indicadorId AND numero=8
          AND nome=N'Vendas Provenientes de Canais Digitais'
          AND plano=N'PN' AND pilar=N'Eficiência e Rentabilidade'
          AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
          AND periodicidade=N'Não especificada' AND unidade_medida=N'percentual'
          AND tipo_calculo=N'razao_canais_digitais' AND tipo_consolidacao IS NULL
    ) THROW 52803, 'Pré-condição inválida: cadastro do Indicador 08 divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND TRY_CONVERT(INT,id) BETWEEN 85 AND 96)<>12
       OR EXISTS (
          SELECT 1 FROM dbo.lancamentos
          WHERE indicador_id=@indicadorId
            AND (ano<>2026 OR mes<1 OR mes>12 OR TRY_CONVERT(INT,id)<>84+mes)
       ) THROW 52804, 'Pré-condição inválida: lançamentos 85–96 não estão íntegros.', 1;

    /* JAN–MAR devem ter sido retificados de forma autêntica pela aplicação. */
    DECLARE @janMar TABLE (
      id NVARCHAR(100) PRIMARY KEY,
      mes INT NOT NULL,
      meta DECIMAL(10,4) NOT NULL,
      totalMes DECIMAL(19,2) NOT NULL,
      canaisMes DECIMAL(19,2) NOT NULL
    );
    INSERT INTO @janMar VALUES
      (N'85',1,0.2770,2030288935.15,624392611.64),
      (N'86',2,0.2829,1954616641.35,580582876.90),
      (N'87',3,0.2805,1982006914.05,565188124.10);

    /*
      Os componentes e a meta permanecem estritos. Os campos derivados seguem a
      precisao canonica persistida pela aplicacao: resultados com 6 casas e
      atingimento com 5 casas. As razoes sao reconstruidas somente com DECIMAL.
    */
    IF (SELECT COUNT(*)
        FROM @janMar a
        INNER JOIN dbo.lancamentos l ON l.id=a.id AND l.indicador_id=@indicadorId
        CROSS APPLY (
          SELECT SUM(b.totalMes) AS totalAcumulado,
                 SUM(b.canaisMes) AS canaisAcumulados
          FROM @janMar b
          WHERE b.mes<=a.mes
        ) soma
        CROSS APPLY (
          SELECT
            CONVERT(DECIMAL(38,18),
              CONVERT(DECIMAL(28,6),a.canaisMes)
              / NULLIF(CONVERT(DECIMAL(28,6),a.totalMes),0)
            ) AS mensalExato,
            CONVERT(DECIMAL(38,18),
              CONVERT(DECIMAL(28,6),soma.canaisAcumulados)
              / NULLIF(CONVERT(DECIMAL(28,6),soma.totalAcumulado),0)
            ) AS acumuladoExato
        ) calculo
        WHERE l.status=N'Retificado' AND l.versao_atual=2 AND l.evidencia_id IS NULL
          AND TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=a.meta
          AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoTotalProdutosLoteriasMes'))=a.totalMes
          AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoCanaisEletronicosMes'))=a.canaisMes
          AND TRY_CONVERT(DECIMAL(38,6),l.resultado_calculado)
              =CONVERT(DECIMAL(38,6),ROUND(calculo.mensalExato,6))
          AND TRY_CONVERT(DECIMAL(38,6),l.resultado_oficial)
              =CONVERT(DECIMAL(38,6),ROUND(calculo.acumuladoExato,6))
          AND TRY_CONVERT(DECIMAL(38,5),l.percentual_atingido)
              =CONVERT(DECIMAL(38,5),ROUND(
                calculo.acumuladoExato/NULLIF(CONVERT(DECIMAL(28,6),a.meta),0),5
              ))
          AND l.situacao=N'Atingido')<>3
        THROW 52805, 'ABORTADO: JAN/FEV/MAR ainda não foram corrigidos e retificados pelo fluxo autêntico da aplicação.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes WHERE lancamento_id IN (N'85',N'86',N'87'))<>6
       OR (SELECT COUNT(*) FROM dbo.homologacoes WHERE id IN
          (N'1',N'2',N'3',N'homologacao-6add10acee4839.40234122',N'homologacao-6add10badf6ba2.75524290',N'homologacao-6add10cf7a0b61.74073465'))<>6
       OR (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id IN (N'85',N'86',N'87'))<>3
       OR (SELECT COUNT(*) FROM dbo.evidencias WHERE id IN (N'evidencia-85',N'evidencia-86',N'evidencia-87') AND versao_lancamento=1)<>3
       OR (SELECT COUNT(*) FROM dbo.retificacoes WHERE lancamento_id IN (N'85',N'86',N'87') AND versao_anterior=1 AND versao_nova=2)<>3
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'85',N'86',N'87'))
       OR (SELECT COUNT(DISTINCT entidade_id) FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id IN (N'85',N'86',N'87') AND acao=N'lancamento_reaberto')<>3
       OR (SELECT COUNT(DISTINCT entidade_id) FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id IN (N'85',N'86',N'87') AND acao=N'lancamento_alterado')<>3
        THROW 52806, 'Pré-condição inválida: governança autêntica de JAN–MAR não está completa.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'88',N'89',N'90',N'91',N'92',N'93',N'94',N'95',N'96')
          AND indicador_id=@indicadorId AND status=N'Não iniciado' AND versao_atual=1
          AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=0.2805
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao IS NULL
          AND evidencia_id IS NULL AND usuario_responsavel IS NULL
          AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}'))<>9
        THROW 52807, 'Pré-condição inválida: IDs 88–96 não permanecem vazios e sem governança.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'88',N'89',N'90',N'91',N'92',N'93',N'94',N'95',N'96'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'88',N'89',N'90',N'91',N'92',N'93',N'94',N'95',N'96'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id IN (N'88',N'89',N'90',N'91',N'92',N'93',N'94',N'95',N'96'))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'88',N'89',N'90',N'91',N'92',N'93',N'94',N'95',N'96'))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'88',N'89',N'90',N'91',N'92',N'93',N'94',N'95',N'96'))
        THROW 52808, 'Pré-condição inválida: IDs 88–96 possuem governança e não podem ser carregados automaticamente.', 1;

    SET @janMarAntes=(SELECT * FROM dbo.lancamentos WHERE id IN (N'85',N'86',N'87') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES);
    SET @governancaAntes=(SELECT
      JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
      JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
      JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
      JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
      JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);

    SELECT @metasAntes=valor_json FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'metas';
    SELECT @regrasAntes=valor_json FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores';
    IF ISJSON(@metasAntes)<>1 OR ISJSON(@regrasAntes)<>1
        THROW 52809, 'Pré-condição inválida: configurações metas/regrasIndicadores não são JSON válido.', 1;
    IF JSON_VALUE(@metasAntes,'$[66].indicadorId')<>N'8'
       OR JSON_VALUE(@metasAntes,'$[66].mes')<>N'1'
       OR JSON_VALUE(@metasAntes,'$[67].indicadorId')<>N'8'
       OR JSON_VALUE(@metasAntes,'$[67].mes')<>N'2'
       OR JSON_VALUE(@metasAntes,'$[68].indicadorId')<>N'8'
       OR JSON_VALUE(@metasAntes,'$[68].mes')<>N'3'
       OR (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE TRY_CONVERT(INT,JSON_VALUE(value,'$.indicadorId'))=8)<>3
        THROW 52810, 'Pré-condição inválida: configuração metas do Indicador 08 não possui somente JAN–MAR.', 1;
    IF JSON_VALUE(@regrasAntes,'$[7].indicadorId')<>N'8'
       OR JSON_VALUE(@regrasAntes,'$[7].tipoCalculo')<>N'razao_canais_digitais'
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,JSON_VALUE(value,'$.indicadorId'))=8)<>1
        THROW 52811, 'Pré-condição inválida: regra única do Indicador 08 não localizada.', 1;

    UPDATE dbo.indicadores SET tipo_consolidacao=N'razao_acumulada_no_periodo'
    WHERE id=@indicadorId AND tipo_consolidacao IS NULL;
    SET @linhasIndicador=@@ROWCOUNT;

    DECLARE @alvos TABLE (
      id NVARCHAR(100) PRIMARY KEY,
      meta DECIMAL(10,4) NOT NULL,
      resultadoCalculado DECIMAL(38,18) NULL,
      resultadoOficial DECIMAL(38,18) NULL,
      percentual DECIMAL(38,18) NULL,
      situacao NVARCHAR(100) NULL,
      statusNovo NVARCHAR(100) NOT NULL,
      dados NVARCHAR(MAX) NOT NULL
    );
    INSERT INTO @alvos VALUES
      (N'88',0.2803,0.286875051003701300,0.294172333859355650,1.049491023401197600,N'Atingido',N'Em preenchimento',N'{"arrecadacaoCanaisEletronicosMes":584304495.10,"arrecadacaoTotalProdutosLoteriasMes":2036790906.20,"resultadoAcumuladoDocumentalCanaisDigitais":0.29417233385936,"tipoPosicaoCanaisDigitais":"acompanhamento","fonteResultadoCanaisDigitais":"16.10(3).xlsx"}'),
      (N'89',0.2798,0.284990580968402300,0.292242761489600540,1.044470198318801200,N'Atingido',N'Em preenchimento',N'{"arrecadacaoCanaisEletronicosMes":606895557.45,"arrecadacaoTotalProdutosLoteriasMes":2129528475.60,"resultadoAcumuladoDocumentalCanaisDigitais":0.29224276148960,"tipoPosicaoCanaisDigitais":"acompanhamento","fonteResultadoCanaisDigitais":"16.10(3).xlsx"}'),
      (N'90',0.2798,0.280139282859167950,0.290198975678025100,1.037200000000000000,N'Atingido',N'Em preenchimento',N'{"arrecadacaoCanaisEletronicosMes":576730146.88,"arrecadacaoTotalProdutosLoteriasMes":2058726434.20,"resultadoAcumuladoDocumentalCanaisDigitais":0.29019897567803,"percentualAtingidoOficialCanaisDigitais":1.0372,"tipoPosicaoCanaisDigitais":"fechamento_trimestral","fonteResultadoCanaisDigitais":"Informe DILOT/GERIN nº 0056/2026"}'),
      (N'91',0.2815,0.292136372186562960,0.290467909641084300,1.031857583094438000,N'Atingido',N'Em preenchimento',N'{"arrecadacaoCanaisEletronicosMes":574100983.07,"arrecadacaoTotalProdutosLoteriasMes":1965181462.25,"resultadoAcumuladoDocumentalCanaisDigitais":0.29046790964108,"tipoPosicaoCanaisDigitais":"acompanhamento","fonteResultadoCanaisDigitais":"16.10(3).xlsx"}'),
      (N'92',0.2827,0.298110568805824040,0.291432037069773800,1.030887998124420800,N'Atingido',N'Em preenchimento',N'{"arrecadacaoCanaisEletronicosMes":609265150.11,"arrecadacaoTotalProdutosLoteriasMes":2043755619.10,"resultadoAcumuladoDocumentalCanaisDigitais":0.29143203706977,"tipoPosicaoCanaisDigitais":"acompanhamento","fonteResultadoCanaisDigitais":"16.10(3).xlsx"}'),
      (N'93',0.2837,NULL,0.291700000000000000,1.028200000000000000,N'Atingido',N'Em preenchimento',N'{"resultadoAcumuladoDocumentalCanaisDigitais":0.2917,"percentualAtingidoOficialCanaisDigitais":1.0282,"tipoPosicaoCanaisDigitais":"fechamento_trimestral","fonteResultadoCanaisDigitais":"16.10(3).xlsx; Informe DILOT/GERIN nº 0078/2026"}'),
      (N'94',0.2859,NULL,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'95',0.2878,NULL,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'96',0.2911,NULL,NULL,NULL,NULL,N'Não iniciado',N'[]');

    UPDATE l SET
      meta_referencia=CONVERT(NVARCHAR(100),a.meta),
      dados_entrada_json=a.dados,
      resultado_calculado=CASE WHEN a.resultadoCalculado IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoCalculado) END,
      resultado_oficial=CASE WHEN a.resultadoOficial IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoOficial) END,
      percentual_atingido=CASE WHEN a.percentual IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.percentual) END,
      situacao=a.situacao,
      status=a.statusNovo
    FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
    WHERE l.indicador_id=@indicadorId;
    SET @linhasLancamentos=@@ROWCOUNT;

    SET @metasDepois=@metasAntes;
    /* SQL Server 2016 exige paths literais. Os índices são protegidos acima. */
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[66].metaMensal',CAST(0.2770 AS DECIMAL(10,4)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[66].fonte',N'16.10(3).xlsx');
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[67].metaMensal',CAST(0.2829 AS DECIMAL(10,4)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[67].fonte',N'16.10(3).xlsx');
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[68].metaMensal',CAST(0.2805 AS DECIMAL(10,4)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[68].fonte',N'Informe DILOT/GERIN nº 0029/2026');
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":205,"indicadorId":8,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":0.2803,"fonte":"16.10(3).xlsx"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":206,"indicadorId":8,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":0.2798,"fonte":"16.10(3).xlsx"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":207,"indicadorId":8,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":0.2798,"fonte":"Informe DILOT/GERIN nº 0056/2026"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":208,"indicadorId":8,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":0.2815,"fonte":"16.10(3).xlsx"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":209,"indicadorId":8,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":0.2827,"fonte":"16.10(3).xlsx"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":210,"indicadorId":8,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":0.2837,"fonte":"Informe DILOT/GERIN nº 0078/2026"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":211,"indicadorId":8,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":0.2859,"fonte":"16.10(3).xlsx"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":212,"indicadorId":8,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":0.2878,"fonte":"16.10(3).xlsx"}'));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(N'{"id":213,"indicadorId":8,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":0.2911,"fonte":"16.10(3).xlsx"}'));
    SET @regrasDepois=JSON_MODIFY(@regrasAntes,'$[7]',JSON_QUERY(@regraFinal));

    UPDATE dbo.configuracoes SET valor_json=@metasDepois WHERE chave=N'metas' AND valor_json=@metasAntes;
    SET @linhasConfiguracoes=@@ROWCOUNT;
    UPDATE dbo.configuracoes SET valor_json=@regrasDepois WHERE chave=N'regrasIndicadores' AND valor_json=@regrasAntes;
    SET @linhasConfiguracoes+=@@ROWCOUNT;

    IF @linhasIndicador<>1 OR @linhasLancamentos<>9 OR @linhasConfiguracoes<>2
        THROW 52812, 'Quantidade inesperada de linhas alteradas; rollback obrigatório.', 1;

    DECLARE @cadastroFinalCorreto BIT = CASE WHEN EXISTS (
      SELECT 1 FROM dbo.indicadores
      WHERE id=@indicadorId AND tipo_consolidacao=N'razao_acumulada_no_periodo'
    ) THEN 1 ELSE 0 END;
    DECLARE @quantidadeLancamentosFinais INT = (
      SELECT COUNT(*)
      FROM @alvos a
      INNER JOIN dbo.lancamentos l ON l.id=a.id AND l.indicador_id=@indicadorId
      WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=a.meta
        AND ((a.resultadoCalculado IS NULL AND l.resultado_calculado IS NULL) OR ABS(TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)-a.resultadoCalculado)<0.000000000001)
        AND ((a.resultadoOficial IS NULL AND l.resultado_oficial IS NULL) OR ABS(TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)-a.resultadoOficial)<0.000000000001)
        AND ((a.percentual IS NULL AND l.percentual_atingido IS NULL) OR ABS(TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)-a.percentual)<0.000000000001)
        AND ISNULL(l.situacao,N'')=ISNULL(a.situacao,N'')
        AND l.status=a.statusNovo
        AND l.dados_entrada_json=a.dados
    );
    IF @cadastroFinalCorreto<>1 OR @quantidadeLancamentosFinais<>9
        THROW 52813, 'Pós-condição inválida: cadastro ou lançamentos não atingiram o estado final.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE TRY_CONVERT(INT,JSON_VALUE(value,'$.indicadorId'))=8)<>12
       OR JSON_VALUE(@regrasDepois,'$[7].tipoConsolidacao')<>N'razao_acumulada_no_periodo'
       OR JSON_QUERY(@regrasDepois,'$[7].parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
        THROW 52814, 'Pós-condição inválida: configurações finais divergiram.', 1;

    SET @janMarDepois=(SELECT * FROM dbo.lancamentos WHERE id IN (N'85',N'86',N'87') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES);
    SET @governancaDepois=(SELECT
      JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
      JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
      JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
      JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
      JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    IF @janMarAntes<>@janMarDepois OR @governancaAntes<>@governancaDepois
        THROW 52815, 'Proteção violada: JAN–MAR ou governança foram alterados.', 1;

    COMMIT TRANSACTION;
    SELECT N'COMMIT' AS transacao,
           @linhasIndicador AS linhas_indicadores,
           @linhasLancamentos AS linhas_lancamentos,
           @linhasConfiguracoes AS linhas_configuracoes,
           0 AS registros_criados,
           0 AS registros_removidos;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
