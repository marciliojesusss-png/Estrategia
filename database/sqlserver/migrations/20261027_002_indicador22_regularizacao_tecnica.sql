/*
  Indicador 22 — Arrecadação Gerada com o Ecossistema

  PREPARADA, NÃO EXECUTADA.
  Escopo persistente exclusivo:
  - dbo.indicadores: cadastro do ID 22;
  - dbo.lancamentos: IDs 253–264;
  - dbo.configuracoes: chaves metas e regrasIndicadores.

  O resultado principal usa exclusivamente ARR ECO LOTEX / ARR TOTAL.
  Marketplace é auxiliar e nunca participa do cálculo oficial.
  Compatibilidade: SQL Server 2016, compatibility level 130 e TSql130Parser.
  Precisão: componentes DECIMAL(20,2); razões/metas DECIMAL(38,18).
  Nenhuma tabela de governança recebe DML.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME()<>N'Estrategia'
  THROW 53301,'Execute esta migration somente no banco Estrategia.',1;

IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME())<>130
  THROW 53302,'Compatibilidade inválida: o banco Estrategia deve estar no nível 130.',1;

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @migration NVARCHAR(255)=N'20261027_002_indicador22_regularizacao_tecnica.sql';
  DECLARE @indicadorId NVARCHAR(100)=N'22';
  DECLARE @indiceRegra NVARCHAR(10)=N'21';
  DECLARE @hashRegraInicialEsperado VARCHAR(64)=N'D179130031FE1DA504969D61B480BCD399EAD6AC0EA7EC47DA90B61211C6D253';
  DECLARE @indicadorInicial BIT=0,@indicadorFinal BIT=0;
  DECLARE @lancamentosInicial BIT=0,@lancamentosFinal BIT=0;
  DECLARE @metasInicial BIT=0,@metasFinal BIT=0;
  DECLARE @regraInicialEstado BIT=0,@regraFinalEstado BIT=0;
  DECLARE @estadoInicialIntegral BIT=0,@estadoFinalIntegral BIT=0;
  DECLARE @linhasIndicadores INT=0,@linhasLancamentos INT=0,@linhasConfiguracoes INT=0;
  DECLARE @metasAntes NVARCHAR(MAX),@metasDepois NVARCHAR(MAX),@metasNovo NVARCHAR(MAX);
  DECLARE @regrasAntes NVARCHAR(MAX),@regrasDepois NVARCHAR(MAX),@regrasNovo NVARCHAR(MAX);
  DECLARE @regraAntes NVARCHAR(MAX),@regraFinal NVARCHAR(MAX);
  DECLARE @hashRegraAntes VARCHAR(64),@hashRegraFinal VARCHAR(64);
  DECLARE @governancaAntes NVARCHAR(MAX),@governancaDepois NVARCHAR(MAX);
  DECLARE @hashGovernancaAntes VARBINARY(32),@hashGovernancaDepois VARBINARY(32);
  DECLARE @protegidoAntes NVARCHAR(MAX),@protegidoDepois NVARCHAR(MAX);
  DECLARE @hashProtegidoAntes VARBINARY(32),@hashProtegidoDepois VARBINARY(32);

  IF OBJECT_ID(N'dbo.indicadores',N'U') IS NULL
     OR OBJECT_ID(N'dbo.lancamentos',N'U') IS NULL
     OR OBJECT_ID(N'dbo.configuracoes',N'U') IS NULL
     OR OBJECT_ID(N'dbo.homologacoes',N'U') IS NULL
     OR OBJECT_ID(N'dbo.evidencias',N'U') IS NULL
     OR OBJECT_ID(N'dbo.auditoria',N'U') IS NULL
     OR OBJECT_ID(N'dbo.retificacoes',N'U') IS NULL
     OR OBJECT_ID(N'dbo.solicitacoes_reabertura',N'U') IS NULL
    THROW 53303,'Pré-condição inválida: estrutura obrigatória ausente.',1;

  IF COL_LENGTH(N'dbo.indicadores',N'tipo_calculo') IS NULL
     OR COL_LENGTH(N'dbo.indicadores',N'tipo_consolidacao') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'dados_entrada_json') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'resultado_calculado') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'resultado_oficial') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'meta_referencia') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'percentual_atingido') IS NULL
     OR COL_LENGTH(N'dbo.configuracoes',N'valor_json') IS NULL
    THROW 53304,'Pré-condição inválida: coluna obrigatória ausente.',1;

  IF (SELECT COUNT(*) FROM dbo.indicadores WITH(UPDLOCK,HOLDLOCK) WHERE id=@indicadorId)<>1
    THROW 53305,'Pré-condição inválida: cadastro único do Indicador 22 não encontrado.',1;

  IF NOT EXISTS(
    SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND numero=22
      AND nome=N'Arrecadação Gerada com o Ecossistema' AND plano=N'PEI'
      AND pilar=N'Atuação em Ecossistema' AND unidade_apuradora=N'SUCOL'
      AND diretoria_responsavel=N'DICOT' AND unidade_medida=N'percentual' AND ativo=1
  ) THROW 53306,'Pré-condição inválida: identidade organizacional do Indicador 22 divergiu.',1;

  SET @indicadorInicial=CASE WHEN EXISTS(
    SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId
      AND periodicidade=N'Não especificada'
      AND tipo_calculo=N'crescimento_comparado_base_2025'
      AND tipo_consolidacao IS NULL
      AND meta_anual=N'Resultado 2026 ≥ 110% da base 2025'
      AND formula_referencia=N'Arrecadação do ecossistema em 2026 / Arrecadação do ecossistema em 2025, sempre em período equivalente'
  ) THEN 1 ELSE 0 END;

  SET @indicadorFinal=CASE WHEN EXISTS(
    SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId
      AND periodicidade=N'Mensal'
      AND tipo_calculo=N'participacao_ecossistema_lotex'
      AND tipo_consolidacao=N'ultima_posicao_acumulada'
      AND meta_anual=N'JAN–JUL/2026: ≥10% sobre a referência de 2025; AGO–DEZ/2026: ≥1% sobre a referência de 2025'
      AND formula_referencia=N'(ARR ECO LOTEX / ARR TOTAL) × 100'
  ) THEN 1 ELSE 0 END;
  IF @indicadorInicial=0 AND @indicadorFinal=0
    THROW 53307,'Pré-condição inválida: cadastro não está no estado inicial nem no final reconhecido.',1;

  DECLARE @alvos TABLE(
    id NVARCHAR(100) PRIMARY KEY,mes INT NOT NULL,metaInicial DECIMAL(10,4) NOT NULL,
    total25 DECIMAL(20,2) NOT NULL,lotex25 DECIMAL(20,2) NOT NULL,mkp25 DECIMAL(20,2) NOT NULL,
    total26 DECIMAL(20,2) NULL,lotex26 DECIMAL(20,2) NULL,mkp26 DECIMAL(20,2) NULL,
    referencia25 DECIMAL(38,18) NOT NULL,fator DECIMAL(4,2) NOT NULL,
    metaFinal DECIMAL(38,18) NOT NULL,resultadoTecnico DECIMAL(38,18) NULL,
    resultadoFinal DECIMAL(38,18) NULL,atingimentoFinal DECIMAL(38,18) NULL,
    situacaoFinal NVARCHAR(100) NULL,statusFinal NVARCHAR(100) NOT NULL,dadosFinal NVARCHAR(MAX) NOT NULL
  );

  INSERT INTO @alvos VALUES
  (N'253',1,0.0376,1683348694.70,18372000.00,44669058.91,2030288935.15,13719322.25,77531427.39,
   0.010913959809897965,1.10,0.012005355790887762,0.006757325035112010,0.006757325035112010,0.562859206575195179,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":1683348694.70,"arrEcoLotex2025":18372000.00,"arrEcoMarketplace2025":44669058.91,"arrTotal2026":2030288935.15,"arrEcoLotex2026":13719322.25,"arrEcoMarketplace2026":77531427.39,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'254',2,0.0376,3825271538.60,41002000.00,102809429.06,3984905576.50,26620128.00,143041561.04,
   0.010718716197335942,1.10,0.011790587817069536,0.006680240595156295,0.006680240595156295,0.566574007912068622,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":3825271538.60,"arrEcoLotex2025":41002000.00,"arrEcoMarketplace2025":102809429.06,"arrTotal2026":3984905576.50,"arrEcoLotex2026":26620128.00,"arrEcoMarketplace2026":143041561.04,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'255',3,0.0376,5504494123.70,49752400.00,138489885.56,5966912490.55,39819048.75,202465482.39,
   0.009038505425192012,1.10,0.009942355967711213,0.006673308652181973,0.006700000000000000,0.671200000000000000,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":5504494123.70,"arrEcoLotex2025":49752400.00,"arrEcoMarketplace2025":138489885.56,"arrTotal2026":5966912490.55,"arrEcoLotex2026":39819048.75,"arrEcoMarketplace2026":202465482.39,"resultadoDocumentalEcossistema":0.0067,"metaDocumentalEcossistema":0.0099,"percentualAtingidoOficialEcossistema":0.6712,"tipoPosicaoEcossistema":"fechamento_trimestral","fonteResultadoEcossistema":"Informe DILOT/GERIN nº 0029/2026"}'),
  (N'256',4,0.0360,7311446900.40,64680800.00,181863299.30,8003703396.75,51968448.25,270736084.49,
   0.008846511625005633,1.10,0.009731162787506196,0.006493050238606095,0.006493050238606095,0.667242998641693491,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":7311446900.40,"arrEcoLotex2025":64680800.00,"arrEcoMarketplace2025":181863299.30,"arrTotal2026":8003703396.75,"arrEcoLotex2026":51968448.25,"arrEcoMarketplace2026":270736084.49,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'257',5,0.0360,9239173439.20,77936800.00,221211168.37,10133231872.35,63966773.50,348500290.44,
   0.008435473206870373,1.10,0.009279020527557411,0.006312573748020379,0.006312573748020379,0.680306044077918113,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":9239173439.20,"arrEcoLotex2025":77936800.00,"arrEcoMarketplace2025":221211168.37,"arrTotal2026":10133231872.35,"arrEcoLotex2026":63966773.50,"arrEcoMarketplace2026":348500290.44,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'258',6,0.0360,11569679632.60,89935200.00,288625494.59,12191958306.55,74144913.25,439830252.32,
   0.007773352664544721,1.10,0.008550687930999193,0.006081460532076002,0.006100000000000000,0.711200000000000000,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":11569679632.60,"arrEcoLotex2025":89935200.00,"arrEcoMarketplace2025":288625494.59,"arrTotal2026":12191958306.55,"arrEcoLotex2026":74144913.25,"arrEcoMarketplace2026":439830252.32,"resultadoDocumentalEcossistema":0.0061,"metaDocumentalEcossistema":0.0086,"percentualAtingidoOficialEcossistema":0.7112,"tipoPosicaoEcossistema":"fechamento_trimestral","fonteResultadoEcossistema":"Informe DILOT/GERIN nº 0056/2026"}'),
  (N'259',7,0.0365,13555540052.00,105266400.00,334933864.05,14157139768.80,87677530.50,512915099.64,
   0.007765562979873227,1.10,0.008542119277860550,0.006193166976653491,0.006193166976653491,0.725015277263211567,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":13555540052.00,"arrEcoLotex2025":105266400.00,"arrEcoMarketplace2025":334933864.05,"arrTotal2026":14157139768.80,"arrEcoLotex2026":87677530.50,"arrEcoMarketplace2026":512915099.64,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'260',8,0.0365,15436581916.40,119416800.00,376653655.87,16122321231.05,101554152.00,595072496.25,
   0.007735961279946970,1.01,0.007813320892746440,0.006298978326050018,0.006298978326050018,0.806184516483602521,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":15436581916.40,"arrEcoLotex2025":119416800.00,"arrEcoMarketplace2025":376653655.87,"arrTotal2026":16122321231.05,"arrEcoLotex2026":101554152.00,"arrEcoMarketplace2026":595072496.25,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'261',9,0.0365,17998386148.80,133276716.00,463811538.74,NULL,NULL,NULL,
   0.007404925913809551,1.01,0.007478975172947646,NULL,0.006000000000000000,0.800000000000000000,
   N'Abaixo da meta',N'Em preenchimento',N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":17998386148.80,"arrEcoLotex2025":133276716.00,"arrEcoMarketplace2025":463811538.74,"resultadoDocumentalEcossistema":0.006,"metaDocumentalEcossistema":0.0075,"percentualAtingidoOficialEcossistema":0.8,"tipoPosicaoEcossistema":"fechamento_trimestral","fonteResultadoEcossistema":"Informe DILOT/GERIN nº 0078/2026"}'),
  (N'262',10,0.0380,20122961323.00,148573820.75,523039091.53,NULL,NULL,NULL,
   0.007383298032789247,1.01,0.007457131013117139,NULL,NULL,NULL,NULL,N'Não iniciado',
   N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":20122961323.00,"arrEcoLotex2025":148573820.75,"arrEcoMarketplace2025":523039091.53,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'263',11,0.0380,21913607953.15,162745531.00,571706233.81,NULL,NULL,NULL,
   0.007426688081120203,1.01,0.007500954961931405,NULL,NULL,NULL,NULL,N'Não iniciado',
   N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":21913607953.15,"arrEcoLotex2025":162745531.00,"arrEcoMarketplace2025":571706233.81,"tipoPosicaoEcossistema":"acompanhamento"}'),
  (N'264',12,0.0380,26612476457.00,173831435.50,746339639.03,NULL,NULL,NULL,
   0.006531952626839293,1.01,0.006597272153107686,NULL,NULL,NULL,NULL,N'Não iniciado',
   N'{"cenarioApuracaoEcossistema":"lotex","marketplaceAplicaAoCalculo":false,"arrTotal2025":26612476457.00,"arrEcoLotex2025":173831435.50,"arrEcoMarketplace2025":746339639.03,"tipoPosicaoEcossistema":"fechamento_trimestral"}');

  IF (SELECT COUNT(*) FROM dbo.lancamentos WITH(UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId)<>12
     OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN(SELECT id FROM @alvos) AND indicador_id=@indicadorId)<>12
     OR EXISTS(SELECT 1 FROM dbo.lancamentos WHERE indicador_id=@indicadorId
       AND (ano<>2026 OR mes<1 OR mes>12 OR TRY_CONVERT(INT,id)<>252+mes
         OR competencia<>CONCAT(N'2026-',RIGHT(CONCAT(N'0',mes),2))
         OR trimestre<>CONCAT(((mes-1)/3)+1,N'TRI/2026')))
    THROW 53308,'Pré-condição inválida: IDs 253–264 ou competências JAN–DEZ divergiram.',1;

  IF (SELECT COUNT(*) FROM dbo.lancamentos l JOIN @alvos a ON a.id=l.id
      WHERE l.plano=N'PEI' AND l.pilar=N'Atuação em Ecossistema'
        AND l.unidade_apuradora=N'SUCOL' AND l.diretoria_responsavel=N'DICOT'
        AND l.versao_atual=1 AND l.evidencia_id IS NULL
        AND COALESCE(l.referencia_evidencia,N'')=N'' AND COALESCE(l.observacao_unidade,N'')=N''
        AND l.usuario_responsavel IS NULL)<>12
    THROW 53309,'Pré-condição inválida: campos estruturais/protegidos dos lançamentos divergiram.',1;

  SET @lancamentosInicial=CASE WHEN (SELECT COUNT(*) FROM dbo.lancamentos l JOIN @alvos a ON a.id=l.id
    WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=a.metaInicial
      AND l.status=N'Não iniciado' AND l.resultado_calculado IS NULL AND l.resultado_oficial IS NULL
      AND l.percentual_atingido IS NULL AND l.situacao IS NULL
      AND l.dados_entrada_json=N'{"cenarioApuracaoEcossistema":"lotex_marketplace"}')=12 THEN 1 ELSE 0 END;

  SET @lancamentosFinal=CASE WHEN (SELECT COUNT(*) FROM dbo.lancamentos l JOIN @alvos a ON a.id=l.id
    WHERE TRY_CONVERT(DECIMAL(38,18),l.meta_referencia)=a.metaFinal
      AND ((a.resultadoTecnico IS NULL AND l.resultado_calculado IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoTecnico)
      AND ((a.resultadoFinal IS NULL AND l.resultado_oficial IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoFinal)
      AND ((a.atingimentoFinal IS NULL AND l.percentual_atingido IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoFinal)
      AND ((a.situacaoFinal IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacaoFinal)
      AND l.status=a.statusFinal AND l.dados_entrada_json=a.dadosFinal)=12 THEN 1 ELSE 0 END;
  IF @lancamentosInicial=0 AND @lancamentosFinal=0
    THROW 53310,'Pré-condição inválida: lançamentos estão em estado parcial ou desconhecido.',1;

  /* Snapshot integral de governança; PASS obrigatório = zero no escopo. */
  IF EXISTS(SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN(SELECT id FROM @alvos))
     OR EXISTS(SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN(SELECT id FROM @alvos))
     OR EXISTS(SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN(SELECT id FROM @alvos))
     OR EXISTS(SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN(SELECT id FROM @alvos))
     OR EXISTS(SELECT 1 FROM dbo.auditoria WHERE (entidade=N'lancamentos' AND entidade_id IN(SELECT id FROM @alvos))
       OR (entidade=N'indicadores' AND entidade_id=@indicadorId))
    THROW 53311,'Pré-condição inválida: o Indicador 22 possui governança; esperado zero.',1;

  SET @governancaAntes=(SELECT
    JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
    JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
    JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
    JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
    JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashGovernancaAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@governancaAntes));

  IF (SELECT COUNT(*) FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'metas')<>1
     OR (SELECT COUNT(*) FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores')<>1
    THROW 53312,'Pré-condição inválida: configurações metas/regrasIndicadores ausentes ou duplicadas.',1;
  SELECT @metasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
  SELECT @regrasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
  IF ISJSON(@metasAntes)<>1 OR ISJSON(@regrasAntes)<>1
    THROW 53313,'Pré-condição inválida: configuração JSON inválida.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@regrasAntes))<>23
     OR JSON_VALUE(@regrasAntes,'$[21].indicadorId')<>@indicadorId
     OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
    THROW 53314,'Pré-condição inválida: regra única do Indicador 22 não está no índice literal $[21].',1;
  SELECT @regraAntes=value FROM OPENJSON(@regrasAntes) WHERE [key]=@indiceRegra;
  SET @hashRegraAntes=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@regraAntes)),2);

  SET @regraFinal=N'{"indicadorId":22,"nome":"Arrecadação Gerada com o Ecossistema","tipoCalculo":"participacao_ecossistema_lotex","tipoConsolidacao":"ultima_posicao_acumulada","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":null,"parametrosCalculo":{"campoArrTotal2025":"arrTotal2025","campoArrLotex2025":"arrEcoLotex2025","campoArrMarketplace2025":"arrEcoMarketplace2025","campoArrTotal2026":"arrTotal2026","campoArrLotex2026":"arrEcoLotex2026","campoArrMarketplace2026":"arrEcoMarketplace2026","campoResultadoDocumental":"resultadoDocumentalEcossistema","campoPercentualAtingidoOficial":"percentualAtingidoOficialEcossistema","campoMetaDocumental":"metaDocumentalEcossistema","campoTipoPosicao":"tipoPosicaoEcossistema","campoFonteResultado":"fonteResultadoEcossistema","metaTipo":"referencia_lotex_2025_por_vigencia","sentidoMeta":"quanto_maior_melhor","cenarioOficial":"lotex","cenarioOficialResumoExecutivo":"lotex","marketplaceAplicaAoCalculo":false,"acompanhamentoMensal":true,"permiteAcompanhamentoMensal":true,"mesesFechamentoTrimestral":[3,6,9,12],"vigenciasMeta":[{"inicio":"2026-01","fim":"2026-07","fator":1.10,"descricao":"≥ 10% em relação ao exercício de 2025"},{"inicio":"2026-08","fim":"2026-12","fator":1.01,"descricao":"≥ 1% em relação ao exercício de 2025"}],"apresentacoesOficiaisTrimestrais":{"1TRI":{"metaOficialReportada":0.0099,"resultadoOficialReportado":0.0067,"percentualAtingidoOficialReportado":0.6712,"situacaoOficial":"Abaixo da meta","fonte":"Informe DILOT/GERIN nº 0029/2026"},"2TRI":{"metaOficialReportada":0.0086,"resultadoOficialReportado":0.0061,"percentualAtingidoOficialReportado":0.7112,"situacaoOficial":"Abaixo da meta","fonte":"Informe DILOT/GERIN nº 0056/2026"},"3TRI":{"metaOficialReportada":0.0075,"resultadoOficialReportado":0.006,"percentualAtingidoOficialReportado":0.8,"situacaoOficial":"Abaixo da meta","fonte":"Informe DILOT/GERIN nº 0078/2026"},"4TRI":{"metaOficialReportada":0.0066,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":null,"fonte":null}},"historicoRevisao":{"aplicaAoCalculo":false,"fonte":"Informe DILOT/GERIN nº 0078/2026","metasRetrospectivas":{"1TRI":0.0091,"2TRI":0.0079}},"cenariosHistoricos":[{"value":"lotex_marketplace","label":"Lotex + Marketplace","aplicaAoCalculo":false}]},"camposEntrada":[{"nome":"arrTotal2025","rotulo":"ARR Total 2025","tipo":"moeda","obrigatorio":true,"somenteLeitura":true},{"nome":"arrEcoLotex2025","rotulo":"ARR Eco Lotex 2025","tipo":"moeda","obrigatorio":true,"somenteLeitura":true},{"nome":"arrEcoMarketplace2025","rotulo":"ARR Eco Marketplace 2025 — auxiliar","tipo":"moeda","obrigatorio":false,"somenteLeitura":true,"aplicaAoCalculo":false},{"nome":"referenciaLotex2025","rotulo":"Referência Lotex 2025","tipo":"percentual","obrigatorio":false,"somenteLeitura":true,"escalaPercentual":"decimal"},{"nome":"fatorMetaVigente","rotulo":"Fator estratégico vigente","tipo":"percentual","obrigatorio":false,"somenteLeitura":true,"escalaPercentual":"decimal"},{"nome":"metaParticipacao2026","rotulo":"Meta técnica de participação 2026","tipo":"percentual","obrigatorio":false,"somenteLeitura":true,"escalaPercentual":"decimal"},{"nome":"arrTotal2026","rotulo":"ARR Total 2026","tipo":"moeda","obrigatorio":false},{"nome":"arrEcoLotex2026","rotulo":"ARR Eco Lotex 2026","tipo":"moeda","obrigatorio":false},{"nome":"arrEcoMarketplace2026","rotulo":"ARR Eco Marketplace 2026 — auxiliar","tipo":"moeda","obrigatorio":false,"aplicaAoCalculo":false},{"nome":"resultadoDocumentalEcossistema","rotulo":"Resultado Lotex documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"metaDocumentalEcossistema","rotulo":"Meta documental do fechamento","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"percentualAtingidoOficialEcossistema","rotulo":"Atingimento oficial documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"tipoPosicaoEcossistema","rotulo":"Natureza da posição","tipo":"selecao","obrigatorio":false,"opcoes":[{"value":"acompanhamento","label":"Acompanhamento mensal"},{"value":"fechamento_trimestral","label":"Fechamento trimestral"}]},{"nome":"fonteResultadoEcossistema","rotulo":"Fonte documental","tipo":"texto","obrigatorio":false},{"nome":"fonteEvidenciaEcossistema","rotulo":"Referência da evidência","tipo":"texto","obrigatorio":false},{"nome":"observacaoArea","rotulo":"Observação da área","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"resultadoCalculado","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"ultima_posicao_homologada","exigirHomologacaoTransacionalVersaoAtual":true}';
  IF ISJSON(@regraFinal)<>1 THROW 53315,'Erro interno: regra final não é JSON válido.',1;
  SET @hashRegraFinal=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@regraFinal)),2);
  SET @regraInicialEstado=CASE WHEN @hashRegraAntes=@hashRegraInicialEsperado THEN 1 ELSE 0 END;
  SET @regraFinalEstado=CASE WHEN @regraAntes=@regraFinal AND @hashRegraAntes=@hashRegraFinal THEN 1 ELSE 0 END;
  IF @regraInicialEstado=0 AND @regraFinalEstado=0
    THROW 53316,'Pré-condição inválida: hash da regra do Indicador 22 divergiu do estado inicial/final.',1;

  IF EXISTS(SELECT JSON_VALUE(value,'$.id') FROM OPENJSON(@metasAntes) GROUP BY JSON_VALUE(value,'$.id') HAVING COUNT(*)<>1)
     OR EXISTS(SELECT JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
       FROM OPENJSON(@metasAntes) GROUP BY JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes') HAVING COUNT(*)<>1)
    THROW 53317,'Pré-condição inválida: metas possuem ID ou competência duplicada.',1;

  DECLARE @metasEsperadas TABLE(indice INT PRIMARY KEY,id NVARCHAR(100),mes INT,nomeMes NVARCHAR(30),metaFinal DECIMAL(38,18),fonteFinal NVARCHAR(255));
  INSERT INTO @metasEsperadas VALUES
   (141,N'64',1,N'Janeiro',0.012005355790887762,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (142,N'65',2,N'Fevereiro',0.011790587817069536,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (143,N'66',3,N'Março',0.009942355967711213,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (222,N'241',4,N'Abril',0.009731162787506196,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (223,N'242',5,N'Maio',0.009279020527557411,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (224,N'243',6,N'Junho',0.008550687930999193,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (225,N'244',7,N'Julho',0.008542119277860550,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (226,N'245',8,N'Agosto',0.007813320892746440,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (227,N'246',9,N'Setembro',0.007478975172947646,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (228,N'247',10,N'Outubro',0.007457131013117139,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (229,N'248',11,N'Novembro',0.007500954961931405,N'curva_tecnica_lotex_2025_vigencia_2026'),
   (230,N'249',12,N'Dezembro',0.006597272153107686,N'curva_tecnica_lotex_2025_vigencia_2026');

  SET @metasInicial=CASE WHEN (SELECT COUNT(*) FROM OPENJSON(@metasAntes))=222
    AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)=3
    AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) j WHERE TRY_CONVERT(INT,j.[key]) BETWEEN 141 AND 143
      AND JSON_VALUE(j.value,'$.indicadorId')=@indicadorId AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=1.1000
      AND JSON_VALUE(j.value,'$.fonte')=N'meta_indice_110_base_2025')=3 THEN 1 ELSE 0 END;
  SET @metasFinal=CASE WHEN (SELECT COUNT(*) FROM OPENJSON(@metasAntes))=231
    AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)=12
    AND (SELECT COUNT(*) FROM @metasEsperadas e JOIN OPENJSON(@metasAntes) j ON TRY_CONVERT(INT,j.[key])=e.indice
      WHERE JSON_VALUE(j.value,'$.id')=e.id AND JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026 AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
        AND JSON_VALUE(j.value,'$.nomeMes')=e.nomeMes
        AND TRY_CONVERT(DECIMAL(38,18),JSON_VALUE(j.value,'$.metaMensal'))=e.metaFinal
        AND JSON_VALUE(j.value,'$.fonte')=e.fonteFinal)=12 THEN 1 ELSE 0 END;
  IF @metasInicial=0 AND @metasFinal=0
    THROW 53318,'Pré-condição inválida: metas não estão no estado inicial nem no final exato.',1;
  IF @metasInicial=1 AND EXISTS(SELECT 1 FROM OPENJSON(@metasAntes) WHERE TRY_CONVERT(INT,JSON_VALUE(value,'$.id')) BETWEEN 241 AND 249)
    THROW 53319,'Pré-condição inválida: IDs lógicos 241–249 já estão ocupados.',1;

  SET @estadoInicialIntegral=CASE WHEN @indicadorInicial=1 AND @lancamentosInicial=1 AND @metasInicial=1 AND @regraInicialEstado=1 THEN 1 ELSE 0 END;
  SET @estadoFinalIntegral=CASE WHEN @indicadorFinal=1 AND @lancamentosFinal=1 AND @metasFinal=1 AND @regraFinalEstado=1 THEN 1 ELSE 0 END;
  IF @estadoInicialIntegral=0 AND @estadoFinalIntegral=0
    THROW 53320,'Estado parcial/misto: somente o estado inicial integral ou final integral é aceito.',1;

  SET @protegidoAntes=(SELECT
    JSON_QUERY((SELECT * FROM dbo.indicadores WHERE id<>@indicadorId ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicadores_outros,
    JSON_QUERY((SELECT * FROM dbo.lancamentos WHERE id NOT IN(SELECT id FROM @alvos) ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos_outros,
    JSON_QUERY((SELECT * FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores') ORDER BY chave FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes_outras
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashProtegidoAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@protegidoAntes));

  IF @estadoFinalIntegral=1
  BEGIN
    COMMIT TRANSACTION;
    SELECT N'JÁ APLICADA — SEM DML' AS transacao,0 AS linhas_indicadores,0 AS linhas_lancamentos,
      0 AS linhas_configuracoes,0 AS registros_criados,0 AS registros_removidos,@migration AS migration;
    RETURN;
  END;

  UPDATE dbo.indicadores SET
    periodicidade=N'Mensal',tipo_calculo=N'participacao_ecossistema_lotex',
    tipo_consolidacao=N'ultima_posicao_acumulada',
    meta_anual=N'JAN–JUL/2026: ≥10% sobre a referência de 2025; AGO–DEZ/2026: ≥1% sobre a referência de 2025',
    formula_referencia=N'(ARR ECO LOTEX / ARR TOTAL) × 100'
  WHERE id=@indicadorId;
  SET @linhasIndicadores=@@ROWCOUNT;

  UPDATE l SET
    dados_entrada_json=a.dadosFinal,
    resultado_calculado=CASE WHEN a.resultadoTecnico IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoTecnico) END,
    resultado_oficial=CASE WHEN a.resultadoFinal IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoFinal) END,
    meta_referencia=CONVERT(NVARCHAR(100),a.metaFinal),
    percentual_atingido=CASE WHEN a.atingimentoFinal IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.atingimentoFinal) END,
    situacao=a.situacaoFinal,status=a.statusFinal
  FROM dbo.lancamentos l JOIN @alvos a ON a.id=l.id;
  SET @linhasLancamentos=@@ROWCOUNT;

  SET @metasNovo=@metasAntes;
  SET @metasNovo=JSON_MODIFY(@metasNovo,'$[141].metaMensal',CAST(0.012005355790887762 AS DECIMAL(38,18)));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'$[141].fonte',N'curva_tecnica_lotex_2025_vigencia_2026');
  SET @metasNovo=JSON_MODIFY(@metasNovo,'$[142].metaMensal',CAST(0.011790587817069536 AS DECIMAL(38,18)));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'$[142].fonte',N'curva_tecnica_lotex_2025_vigencia_2026');
  SET @metasNovo=JSON_MODIFY(@metasNovo,'$[143].metaMensal',CAST(0.009942355967711213 AS DECIMAL(38,18)));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'$[143].fonte',N'curva_tecnica_lotex_2025_vigencia_2026');
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":241,"indicadorId":22,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":0.009731162787506196,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":242,"indicadorId":22,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":0.009279020527557411,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":243,"indicadorId":22,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":0.008550687930999193,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":244,"indicadorId":22,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":0.008542119277860550,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":245,"indicadorId":22,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":0.007813320892746440,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":246,"indicadorId":22,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":0.007478975172947646,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":247,"indicadorId":22,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":0.007457131013117139,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":248,"indicadorId":22,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":0.007500954961931405,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":249,"indicadorId":22,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":0.006597272153107686,"fonte":"curva_tecnica_lotex_2025_vigencia_2026"}'));
  UPDATE dbo.configuracoes SET valor_json=@metasNovo WHERE chave=N'metas';
  SET @linhasConfiguracoes=@@ROWCOUNT;

  SET @regrasNovo=JSON_MODIFY(@regrasAntes,'$[21]',JSON_QUERY(@regraFinal));
  UPDATE dbo.configuracoes SET valor_json=@regrasNovo WHERE chave=N'regrasIndicadores';
  SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;

  IF @linhasIndicadores<>1 OR @linhasLancamentos<>12 OR @linhasConfiguracoes<>2
    THROW 53321,'Rowcount inesperado; esperado indicadores=1, lançamentos=12, configurações=2.',1;

  SELECT @metasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
  SELECT @regrasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
  IF ISJSON(@metasDepois)<>1 OR ISJSON(@regrasDepois)<>1
    THROW 53322,'Pós-condição inválida: configuração final não é JSON válido.',1;

  IF NOT EXISTS(SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId
    AND periodicidade=N'Mensal' AND tipo_calculo=N'participacao_ecossistema_lotex'
    AND tipo_consolidacao=N'ultima_posicao_acumulada'
    AND meta_anual=N'JAN–JUL/2026: ≥10% sobre a referência de 2025; AGO–DEZ/2026: ≥1% sobre a referência de 2025'
    AND formula_referencia=N'(ARR ECO LOTEX / ARR TOTAL) × 100')
    THROW 53323,'Pós-condição inválida: cadastro final divergiu.',1;

  IF (SELECT COUNT(*) FROM dbo.lancamentos l JOIN @alvos a ON a.id=l.id
    WHERE TRY_CONVERT(DECIMAL(38,18),l.meta_referencia)=a.metaFinal
      AND ((a.resultadoTecnico IS NULL AND l.resultado_calculado IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoTecnico)
      AND ((a.resultadoFinal IS NULL AND l.resultado_oficial IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoFinal)
      AND ((a.atingimentoFinal IS NULL AND l.percentual_atingido IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoFinal)
      AND ((a.situacaoFinal IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacaoFinal)
      AND l.status=a.statusFinal AND l.dados_entrada_json=a.dadosFinal)<>12
    THROW 53324,'Pós-condição inválida: lançamentos finais divergiram.',1;

  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'261',N'262',N'263',N'264')
    AND (JSON_VALUE(dados_entrada_json,'$.arrTotal2026') IS NOT NULL
      OR JSON_VALUE(dados_entrada_json,'$.arrEcoLotex2026') IS NOT NULL
      OR JSON_VALUE(dados_entrada_json,'$.arrEcoMarketplace2026') IS NOT NULL))
    THROW 53325,'Pós-condição inválida: componentes 2026 foram fabricados para SET–DEZ.',1;

  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(SELECT id FROM @alvos)
    AND JSON_VALUE(dados_entrada_json,'$.cenarioApuracaoEcossistema')<>N'lotex')
    THROW 53326,'Pós-condição inválida: cenário oficial diferente de Lotex.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(SELECT id FROM @alvos)
    AND JSON_VALUE(dados_entrada_json,'$.marketplaceAplicaAoCalculo')<>N'false')
    THROW 53327,'Pós-condição inválida: Marketplace não está marcado como auxiliar.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois))<>231
     OR (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>12
     OR (SELECT COUNT(*) FROM @metasEsperadas e JOIN OPENJSON(@metasDepois) j ON TRY_CONVERT(INT,j.[key])=e.indice
       WHERE JSON_VALUE(j.value,'$.id')=e.id AND JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
         AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
         AND TRY_CONVERT(DECIMAL(38,18),JSON_VALUE(j.value,'$.metaMensal'))=e.metaFinal
         AND JSON_VALUE(j.value,'$.fonte')=e.fonteFinal)<>12
    THROW 53328,'Pós-condição inválida: curva técnica de 12 metas divergiu.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@regrasDepois))<>23
     OR JSON_VALUE(@regrasDepois,'$[21].indicadorId')<>@indicadorId
     OR JSON_QUERY(@regrasDepois,'$[21]')<>@regraFinal
    THROW 53329,'Pós-condição inválida: regra final ou índice $[21] divergiu.',1;
  IF JSON_VALUE(@regrasDepois,'$[21].tipoCalculo')<>N'participacao_ecossistema_lotex'
     OR JSON_VALUE(@regrasDepois,'$[21].tipoConsolidacao')<>N'ultima_posicao_acumulada'
     OR JSON_VALUE(@regrasDepois,'$[21].parametrosCalculo.cenarioOficial')<>N'lotex'
     OR JSON_VALUE(@regrasDepois,'$[21].parametrosCalculo.marketplaceAplicaAoCalculo')<>N'false'
     OR JSON_QUERY(@regrasDepois,'$[21].parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
     OR JSON_VALUE(@regrasDepois,'$[21].parametrosCalculo.historicoRevisao.aplicaAoCalculo')<>N'false'
    THROW 53330,'Pós-condição inválida: semântica canônica da regra divergiu.',1;

  IF EXISTS(SELECT 1 FROM OPENJSON(@metasAntes) b FULL JOIN OPENJSON(@metasDepois) d ON d.[key]=b.[key]
    WHERE COALESCE(JSON_VALUE(b.value,'$.indicadorId'),JSON_VALUE(d.value,'$.indicadorId'))<>@indicadorId
      AND (b.[key] IS NULL OR d.[key] IS NULL OR b.value<>d.value OR b.type<>d.type))
    THROW 53331,'Pós-condição inválida: metas de outros indicadores foram alteradas.',1;
  IF EXISTS(SELECT 1 FROM OPENJSON(@regrasAntes) b FULL JOIN OPENJSON(@regrasDepois) d ON d.[key]=b.[key]
    WHERE ISNULL(b.[key],d.[key])<>N'21'
      AND (b.[key] IS NULL OR d.[key] IS NULL OR b.value<>d.value OR b.type<>d.type))
    THROW 53332,'Pós-condição inválida: outras 22 regras ou sua ordem foram alteradas.',1;

  SET @governancaDepois=(SELECT
    JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
    JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
    JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
    JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
    JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashGovernancaDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@governancaDepois));
  IF @hashGovernancaAntes<>@hashGovernancaDepois OR @governancaAntes<>@governancaDepois
    THROW 53333,'Governança foi alterada pela migration.',1;

  SET @protegidoDepois=(SELECT
    JSON_QUERY((SELECT * FROM dbo.indicadores WHERE id<>@indicadorId ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicadores_outros,
    JSON_QUERY((SELECT * FROM dbo.lancamentos WHERE id NOT IN(SELECT id FROM @alvos) ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos_outros,
    JSON_QUERY((SELECT * FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores') ORDER BY chave FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes_outras
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashProtegidoDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@protegidoDepois));
  IF @hashProtegidoAntes<>@hashProtegidoDepois OR @protegidoAntes<>@protegidoDepois
    THROW 53334,'Dados fora do escopo foram alterados.',1;

  COMMIT TRANSACTION;
  SELECT N'COMMIT' AS transacao,@linhasIndicadores AS linhas_indicadores,
    @linhasLancamentos AS linhas_lancamentos,@linhasConfiguracoes AS linhas_configuracoes,
    0 AS registros_criados,0 AS registros_removidos,@migration AS migration;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
