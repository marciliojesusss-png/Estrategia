/*
  Migration: 20261027_001_indicador03_regularizacao_tecnica.sql
  Indicador 03 — Índice de Clientes Ativos em Canais Digitais

  PREPARADA, NÃO EXECUTADA.

  Escopo persistente futuro no estado inicial exato:
    - dbo.indicadores: 1 linha (somente tipo_consolidacao);
    - dbo.lancamentos: 9 linhas (somente IDs 28 a 36);
    - dbo.configuracoes: 2 linhas físicas (metas e regrasIndicadores);
    - metas lógicas criadas dentro do JSON: 9 (IDs 232 a 240);
    - registros físicos criados/removidos: 0;
    - IDs 25 a 27: 0 UPDATEs, preservação integral;
    - governança: 0 DML.

  Reexecução no estado final exato: 0/0/0 linhas e "JÁ APLICADA — SEM DML".
  Estado parcial ou misto: THROW e ROLLBACK.

  Compatibilidade: SQL Server 2016, compatibility level 130 e TSql130Parser.
  Precisão: DECIMAL; nunca FLOAT/REAL. Resultados documentais permanecem literais.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME()<>N'Estrategia'
    THROW 53300,'Execute esta migration somente no banco Estrategia.',1;

IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME())<>130
    THROW 53301,'Compatibilidade inválida: esperado nível 130.',1;

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @migration NVARCHAR(255)=N'20261027_001_indicador03_regularizacao_tecnica.sql';
  DECLARE @indicadorId NVARCHAR(100)=N'3';
  DECLARE @linhasIndicadores INT=0,@linhasLancamentos INT=0,@linhasConfiguracoes INT=0;
  DECLARE @esperadoIndicadores INT=0,@esperadoLancamentos INT=0,@esperadoConfiguracoes INT=0;
  DECLARE @indicadorInicial BIT=0,@indicadorFinal BIT=0;
  DECLARE @lancamentosInicial BIT=0,@lancamentosFinal BIT=0;
  DECLARE @metasInicial BIT=0,@metasFinal BIT=0;
  DECLARE @regraInicialEstado BIT=0,@regraFinalEstado BIT=0;
  DECLARE @estadoInicialIntegral BIT=0,@estadoFinalIntegral BIT=0;
  DECLARE @metasAntes NVARCHAR(MAX),@metasNovo NVARCHAR(MAX),@metasDepois NVARCHAR(MAX);
  DECLARE @regrasAntes NVARCHAR(MAX),@regrasNovo NVARCHAR(MAX),@regrasDepois NVARCHAR(MAX);
  DECLARE @regraAtual NVARCHAR(MAX),@regraInicial NVARCHAR(MAX),@regraFinal NVARCHAR(MAX);
  DECLARE @indiceRegra NVARCHAR(20),@hashRegraAtual VARBINARY(32);

  IF OBJECT_ID(N'dbo.indicadores',N'U') IS NULL
     OR OBJECT_ID(N'dbo.lancamentos',N'U') IS NULL
     OR OBJECT_ID(N'dbo.configuracoes',N'U') IS NULL
     OR OBJECT_ID(N'dbo.homologacoes',N'U') IS NULL
     OR OBJECT_ID(N'dbo.evidencias',N'U') IS NULL
     OR OBJECT_ID(N'dbo.auditoria',N'U') IS NULL
     OR OBJECT_ID(N'dbo.retificacoes',N'U') IS NULL
     OR OBJECT_ID(N'dbo.solicitacoes_reabertura',N'U') IS NULL
    THROW 53302,'Estrutura obrigatória ausente.',1;

  IF COL_LENGTH(N'dbo.indicadores',N'tipo_consolidacao') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'dados_entrada_json') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'resultado_calculado') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'resultado_oficial') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'meta_referencia') IS NULL
     OR COL_LENGTH(N'dbo.lancamentos',N'percentual_atingido') IS NULL
     OR COL_LENGTH(N'dbo.configuracoes',N'valor_json') IS NULL
    THROW 53303,'Coluna obrigatória ausente.',1;

  IF (SELECT COUNT(*) FROM dbo.indicadores WITH(UPDLOCK,HOLDLOCK) WHERE id=@indicadorId)<>1
    THROW 53304,'Indicador 03 ausente ou duplicado.',1;

  IF NOT EXISTS(SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId
    AND numero=3
    AND nome=N'Índice de Clientes Ativos em Canais Digitais'
    AND plano=N'PN' AND pilar=N'Cliente no Centro'
    AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
    AND periodicidade=N'Não especificada' AND unidade_medida=N'percentual'
    AND tipo_calculo=N'crescimento_media_mensal'
    AND meta_anual=N'Crescer 28% na quantidade média mensal de clientes ativos no ano'
    AND formula_referencia=N'((QMAATU / QMAANT) × 100) - 100'
    AND observacao_acompanhamento IS NULL AND ativo=1)
    THROW 53305,'Identidade ou campo cadastral protegido do Indicador 03 divergiu.',1;

  SET @indicadorInicial=CASE WHEN EXISTS(SELECT 1 FROM dbo.indicadores
    WHERE id=@indicadorId AND tipo_consolidacao IS NULL) THEN 1 ELSE 0 END;
  SET @indicadorFinal=CASE WHEN EXISTS(SELECT 1 FROM dbo.indicadores
    WHERE id=@indicadorId AND tipo_consolidacao=N'ultima_posicao') THEN 1 ELSE 0 END;
  IF @indicadorInicial=0 AND @indicadorFinal=0
    THROW 53306,'Cadastro não está no estado inicial nem no final reconhecido.',1;

  IF (SELECT COUNT(*) FROM dbo.lancamentos WITH(UPDLOCK,HOLDLOCK)
      WHERE indicador_id=@indicadorId AND ano=2026)<>12
    THROW 53307,'Esperados exatamente 12 lançamentos do Indicador 03 em 2026.',1;

  IF EXISTS(SELECT 1 FROM (VALUES
      (N'25',1),(N'26',2),(N'27',3),(N'28',4),(N'29',5),(N'30',6),
      (N'31',7),(N'32',8),(N'33',9),(N'34',10),(N'35',11),(N'36',12)
    ) esperado(id,mes)
    LEFT JOIN dbo.lancamentos l WITH(UPDLOCK,HOLDLOCK)
      ON l.id=esperado.id AND l.indicador_id=@indicadorId AND l.ano=2026
      AND l.mes=esperado.mes
      AND l.competencia=CONCAT(N'2026-',RIGHT(CONCAT(N'0',esperado.mes),2))
      AND l.trimestre=CONCAT(((esperado.mes-1)/3)+1,N'TRI/2026')
    WHERE l.id IS NULL)
    THROW 53308,'Mapeamento dos IDs 25–36 e competências divergiu.',1;

  /* IDs 25–27: guards funcionais e nenhuma autorização de UPDATE. */
  IF NOT EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'25'
    AND versao_atual=2 AND status=N'Retificado'
    AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=CAST(N'0.28' AS DECIMAL(10,4))
    AND resultado_calculado IS NULL
    AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=CAST(N'0.8853' AS DECIMAL(10,4))
    AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=CAST(N'3.1618' AS DECIMAL(10,4))
    AND situacao=N'Atingido' AND evidencia_id IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.qmaatu') IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.qmaant') IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoClientesAtivos')=N'acompanhamento'
    AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoClientesAtivos')=N'Planilha 16.10(3).xlsx'
    AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.resultadoDocumentalClientesAtivos'))=CAST(N'0.8853' AS DECIMAL(10,4)))
    THROW 53309,'ID 25 divergiu do estado funcional protegido.',1;

  IF NOT EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'26'
    AND versao_atual=2 AND status=N'Retificado'
    AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=CAST(N'0.28' AS DECIMAL(10,4))
    AND resultado_calculado IS NULL
    AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=CAST(N'0.7615' AS DECIMAL(10,4))
    AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=CAST(N'2.7196' AS DECIMAL(10,4))
    AND situacao=N'Atingido' AND evidencia_id IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.qmaatu') IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.qmaant') IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoClientesAtivos')=N'acompanhamento'
    AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoClientesAtivos')=N'Planilha 16.10(3).xlsx'
    AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.resultadoDocumentalClientesAtivos'))=CAST(N'0.7615' AS DECIMAL(10,4)))
    THROW 53310,'ID 26 divergiu do estado funcional protegido.',1;

  IF NOT EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'27'
    AND versao_atual=2 AND status=N'Retificado'
    AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=CAST(N'0.28' AS DECIMAL(10,4))
    AND TRY_CONVERT(DECIMAL(10,6),resultado_calculado)=CAST(N'0.744057' AS DECIMAL(10,6))
    AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=CAST(N'0.7441' AS DECIMAL(10,4))
    AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=CAST(N'2.6573' AS DECIMAL(10,4))
    AND situacao=N'Atingido'
    AND JSON_VALUE(dados_entrada_json,'$.qmaatu')=N'2982989'
    AND JSON_VALUE(dados_entrada_json,'$.qmaant')=N'1710374'
    AND JSON_VALUE(dados_entrada_json,'$.dataBaseApuracao') IS NULL
    AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoClientesAtivos')=N'fechamento_trimestral'
    AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoClientesAtivos')=N'Informe DILOT/GERIN nº 0029/2026'
    AND JSON_VALUE(dados_entrada_json,'$.janelaApuracaoClientesAtivos')=N'Média JAN–MAR/2026 comparada ao período equivalente de 2025.'
    AND evidencia_id=N'evidencia-6adff5b0167974.09918087')
    THROW 53311,'ID 27 divergiu do estado funcional protegido.',1;

  IF EXISTS(SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN(N'25',N'26') AND versao_lancamento=2)
     OR (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id=N'27' AND versao_lancamento=2
         AND id=N'evidencia-6adff5b0167974.09918087')<>1
    THROW 53312,'Versionamento das evidências dos IDs 25–27 divergiu.',1;

  DECLARE @alvos TABLE(
    id NVARCHAR(100) PRIMARY KEY,mes INT NOT NULL,
    resultadoTecnico DECIMAL(38,18) NULL,resultadoDocumental DECIMAL(38,18) NULL,
    atingimentoDocumental DECIMAL(38,18) NULL,situacao NVARCHAR(100) NULL,
    statusFinal NVARCHAR(100) NOT NULL,dadosFinal NVARCHAR(MAX) NOT NULL
  );
  INSERT INTO @alvos VALUES
    (N'28',4,NULL,CAST(N'0.7046' AS DECIMAL(38,18)),CAST(N'2.5164' AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento',
      N'{"resultadoDocumentalClientesAtivos":0.7046,"percentualAtingidoOficialClientesAtivos":2.5164,"tipoPosicaoClientesAtivos":"acompanhamento","fonteResultadoClientesAtivos":"Planilha 16.10(3).xlsx","janelaApuracaoClientesAtivos":"Posição mensal ABR/2026; componentes QMAATU/QMAANT não disponíveis na fonte mensal."}'),
    (N'29',5,NULL,CAST(N'0.7309' AS DECIMAL(38,18)),CAST(N'2.6104' AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento',
      N'{"resultadoDocumentalClientesAtivos":0.7309,"percentualAtingidoOficialClientesAtivos":2.6104,"tipoPosicaoClientesAtivos":"acompanhamento","fonteResultadoClientesAtivos":"Planilha 16.10(3).xlsx","janelaApuracaoClientesAtivos":"Posição mensal MAI/2026; componentes QMAATU/QMAANT não disponíveis na fonte mensal."}'),
    (N'30',6,CAST(N'0.621559993919400047' AS DECIMAL(38,18)),CAST(N'0.6216' AS DECIMAL(38,18)),CAST(N'2.22' AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento',
      N'{"qmaatu":3040125,"qmaant":1874815,"resultadoDocumentalClientesAtivos":0.6216,"percentualAtingidoOficialClientesAtivos":2.22,"tipoPosicaoClientesAtivos":"fechamento_trimestral","fonteResultadoClientesAtivos":"Informe DILOT/GERIN nº 0056/2026","janelaApuracaoClientesAtivos":"Média dos últimos 12 meses, conforme Informe do 2TRI/2026."}'),
    (N'31',7,NULL,CAST(N'0.5813' AS DECIMAL(38,18)),CAST(N'2.0761' AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento',
      N'{"resultadoDocumentalClientesAtivos":0.5813,"percentualAtingidoOficialClientesAtivos":2.0761,"tipoPosicaoClientesAtivos":"acompanhamento","fonteResultadoClientesAtivos":"Planilha 16.10(3).xlsx","janelaApuracaoClientesAtivos":"Posição mensal JUL/2026; componentes QMAATU/QMAANT não disponíveis na fonte mensal."}'),
    (N'32',8,NULL,CAST(N'0.5534' AS DECIMAL(38,18)),CAST(N'1.9764' AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento',
      N'{"resultadoDocumentalClientesAtivos":0.5534,"percentualAtingidoOficialClientesAtivos":1.9764,"tipoPosicaoClientesAtivos":"acompanhamento","fonteResultadoClientesAtivos":"Planilha 16.10(3).xlsx","janelaApuracaoClientesAtivos":"Posição mensal AGO/2026; componentes QMAATU/QMAANT não disponíveis na fonte mensal."}'),
    (N'33',9,CAST(N'0.526990958214971514' AS DECIMAL(38,18)),CAST(N'0.5270' AS DECIMAL(38,18)),CAST(N'1.8821' AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento',
      N'{"qmaatu":3079049,"qmaant":2016416,"resultadoDocumentalClientesAtivos":0.527,"percentualAtingidoOficialClientesAtivos":1.8821,"tipoPosicaoClientesAtivos":"fechamento_trimestral","fonteResultadoClientesAtivos":"Informe DILOT/GERIN nº 0078/2026","janelaApuracaoClientesAtivos":"Média JAN–SET/2026 comparada ao período equivalente de 2025."}'),
    (N'34',10,NULL,NULL,NULL,NULL,N'Não iniciado',N'{}'),
    (N'35',11,NULL,NULL,NULL,NULL,N'Não iniciado',N'{}'),
    (N'36',12,NULL,NULL,NULL,NULL,N'Não iniciado',N'{}');

  IF (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.indicador_id=@indicadorId AND l.ano=2026 AND l.mes=a.mes
        AND l.plano=N'PN' AND l.pilar=N'Cliente no Centro'
        AND l.unidade_apuradora=N'SUCOL' AND l.diretoria_responsavel=N'DICOT'
        AND l.versao_atual=1 AND l.evidencia_id IS NULL
        AND COALESCE(l.observacao_unidade,N'')=N'' AND COALESCE(l.referencia_evidencia,N'')=N''
        AND ((l.id=N'30' AND l.usuario_responsavel=N'UNIDADE-SUCOL')
          OR (l.id<>N'30' AND l.usuario_responsavel IS NULL)))<>9
    THROW 53313,'Campos estruturais/protegidos dos IDs 28–36 divergiram.',1;

  SET @lancamentosInicial=CASE WHEN
    (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE
       ((l.id=N'30' AND l.status=N'Em preenchimento'
          AND l.meta_referencia IS NULL
          AND TRY_CONVERT(DECIMAL(10,5),l.resultado_calculado)=CAST(N'0.62156' AS DECIMAL(10,5))
          AND TRY_CONVERT(DECIMAL(10,5),l.resultado_oficial)=CAST(N'0.62156' AS DECIMAL(10,5))
          AND TRY_CONVERT(DECIMAL(10,5),l.percentual_atingido)=CAST(N'2.21986' AS DECIMAL(10,5))
          AND l.situacao=N'Atingido'
          AND l.dados_entrada_json=N'{"qmaatu":3040125,"qmaant":1874815,"dataBaseApuracao":""}')
        OR
        (l.id<>N'30' AND l.status=N'Não iniciado'
          AND l.meta_referencia IS NULL AND l.resultado_calculado IS NULL
          AND l.resultado_oficial IS NULL AND l.percentual_atingido IS NULL
          AND l.situacao IS NULL AND LTRIM(RTRIM(l.dados_entrada_json))=N'[]')))=9
    THEN 1 ELSE 0 END;

  SET @lancamentosFinal=CASE WHEN
    (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=CAST(N'0.28' AS DECIMAL(10,4))
        AND l.status=a.statusFinal
        AND ((a.resultadoTecnico IS NULL AND l.resultado_calculado IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoTecnico)
        AND ((a.resultadoDocumental IS NULL AND l.resultado_oficial IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoDocumental)
        AND ((a.atingimentoDocumental IS NULL AND l.percentual_atingido IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoDocumental)
        AND ((a.situacao IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacao)
        AND l.dados_entrada_json=a.dadosFinal)=9
    THEN 1 ELSE 0 END;
  IF @lancamentosInicial=0 AND @lancamentosFinal=0
    THROW 53314,'IDs 28–36 não estão no estado inicial exato nem no final exato.',1;

  IF (SELECT COUNT(*) FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'metas')<>1
     OR (SELECT COUNT(*) FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores')<>1
    THROW 53315,'Configurações metas/regrasIndicadores ausentes ou duplicadas.',1;
  SELECT @metasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
  SELECT @regrasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
  IF ISJSON(@metasAntes)<>1 OR ISJSON(@regrasAntes)<>1
    THROW 53316,'Configuração JSON inválida.',1;

  IF EXISTS(SELECT JSON_VALUE(value,'$.id') FROM OPENJSON(@metasAntes)
    GROUP BY JSON_VALUE(value,'$.id') HAVING COUNT(*)<>1)
     OR EXISTS(SELECT JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
       FROM OPENJSON(@metasAntes)
       GROUP BY JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
       HAVING COUNT(*)<>1)
    THROW 53317,'Metas possuem ID lógico ou competência duplicada.',1;

  DECLARE @metasEsperadas TABLE(
    indiceInicial INT NULL,indiceFinal INT NOT NULL,id NVARCHAR(100) NOT NULL,
    mes INT NOT NULL,nomeMes NVARCHAR(50) NOT NULL,fonte NVARCHAR(255) NOT NULL
  );
  INSERT INTO @metasEsperadas VALUES
    (12,12,N'7',1,N'Janeiro',N'PEI_PN'),
    (13,13,N'8',2,N'Fevereiro',N'PEI_PN'),
    (14,14,N'9',3,N'Março',N'PEI_PN'),
    (NULL,213,N'232',4,N'Abril',N'PEI_PN'),
    (NULL,214,N'233',5,N'Maio',N'PEI_PN'),
    (NULL,215,N'234',6,N'Junho',N'PEI_PN'),
    (NULL,216,N'235',7,N'Julho',N'PEI_PN'),
    (NULL,217,N'236',8,N'Agosto',N'PEI_PN'),
    (NULL,218,N'237',9,N'Setembro',N'PEI_PN'),
    (NULL,219,N'238',10,N'Outubro',N'PEI_PN'),
    (NULL,220,N'239',11,N'Novembro',N'PEI_PN'),
    (NULL,221,N'240',12,N'Dezembro',N'PEI_PN');

  SET @metasInicial=CASE WHEN
    (SELECT COUNT(*) FROM OPENJSON(@metasAntes))=213
    AND (SELECT MAX(TRY_CONVERT(INT,JSON_VALUE(value,'$.id'))) FROM OPENJSON(@metasAntes))=231
    AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)=3
    AND (SELECT COUNT(*) FROM @metasEsperadas e INNER JOIN OPENJSON(@metasAntes) j
      ON TRY_CONVERT(INT,j.[key])=e.indiceInicial
      WHERE e.indiceInicial IS NOT NULL AND JSON_VALUE(j.value,'$.id')=e.id
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.indicadorId'))=3
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
        AND JSON_VALUE(j.value,'$.nomeMes')=e.nomeMes
        AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=CAST(N'0.28' AS DECIMAL(10,4))
        AND JSON_VALUE(j.value,'$.fonte')=e.fonte)=3
    AND NOT EXISTS(SELECT 1 FROM OPENJSON(@metasAntes)
      WHERE TRY_CONVERT(INT,JSON_VALUE(value,'$.id')) BETWEEN 232 AND 240)
    THEN 1 ELSE 0 END;

  SET @metasFinal=CASE WHEN
    (SELECT COUNT(*) FROM OPENJSON(@metasAntes))=222
    AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)=12
    AND (SELECT COUNT(*) FROM @metasEsperadas e INNER JOIN OPENJSON(@metasAntes) j
      ON TRY_CONVERT(INT,j.[key])=e.indiceFinal
      WHERE JSON_VALUE(j.value,'$.id')=e.id
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.indicadorId'))=3
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026
        AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
        AND JSON_VALUE(j.value,'$.nomeMes')=e.nomeMes
        AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=CAST(N'0.28' AS DECIMAL(10,4))
        AND JSON_VALUE(j.value,'$.fonte')=e.fonte)=12
    THEN 1 ELSE 0 END;
  IF @metasInicial=0 AND @metasFinal=0
    THROW 53318,'Metas não estão no estado inicial exato nem no final exato.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@regrasAntes))<>23
     OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes)
         WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
    THROW 53319,'Total ou unicidade das regras divergiu.',1;
  SELECT @indiceRegra=[key],@regraAtual=value FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;
  IF @indiceRegra<>N'2' OR JSON_VALUE(@regrasAntes,'$[2].indicadorId')<>@indicadorId
    THROW 53320,'Regra do Indicador 03 não está no índice literal $[2].',1;

  SET @regraInicial=N'{"indicadorId":3,"nome":"Índice de Clientes Ativos em Canais Digitais","tipoCalculo":"crescimento_media_mensal","tipoConsolidacao":"ultima_posicao","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":0.28,"parametrosCalculo":{"qmaatuCampo":"qmaatu","qmaantCampo":"qmaant","metaCrescimento":0.28},"camposEntrada":[{"nome":"qmaatu","rotulo":"QMAATU - Quantidade Média Mensal de Clientes Ativos no Ano nos canais digitais","tipo":"numero","obrigatorio":true},{"nome":"qmaant","rotulo":"QMAANT - Quantidade Média Mensal de Clientes Ativos do Ano anterior nos canais digitais","tipo":"numero","obrigatorio":true},{"nome":"dataBaseApuracao","rotulo":"Data-base da apuração","tipo":"data","obrigatorio":false}],"campoResultadoPrincipal":"resultadoMensal","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"ultima_posicao_homologada"}';
  SET @regraFinal=N'{"indicadorId":3,"nome":"Índice de Clientes Ativos em Canais Digitais","tipoCalculo":"crescimento_media_mensal","tipoConsolidacao":"ultima_posicao","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":0.28,"parametrosCalculo":{"qmaatuCampo":"qmaatu","qmaantCampo":"qmaant","metaCrescimento":0.28,"sentidoMeta":"quanto_maior_melhor","mesesFechamentoTrimestral":[3,6,9,12],"permiteAcompanhamentoMensal":true,"campoResultadoDocumental":"resultadoDocumentalClientesAtivos","campoPercentualAtingidoOficial":"percentualAtingidoOficialClientesAtivos","campoFonteResultado":"fonteResultadoClientesAtivos","campoTipoPosicao":"tipoPosicaoClientesAtivos","campoJanelaApuracao":"janelaApuracaoClientesAtivos","metasCanonicasPorCompetencia":{"2026-01":0.28,"2026-02":0.28,"2026-03":0.28,"2026-04":0.28,"2026-05":0.28,"2026-06":0.28,"2026-07":0.28,"2026-08":0.28,"2026-09":0.28,"2026-10":0.28,"2026-11":0.28,"2026-12":0.28},"apresentacoesOficiaisTrimestrais":{"1TRI/2026":{"metaOficialReportada":0.28,"resultadoOficialReportado":0.7441,"percentualAtingidoOficialReportado":2.6573,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},"2TRI/2026":{"metaOficialReportada":0.28,"resultadoOficialReportado":0.6216,"percentualAtingidoOficialReportado":2.22,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0056/2026"},"3TRI/2026":{"metaOficialReportada":0.28,"resultadoOficialReportado":0.527,"percentualAtingidoOficialReportado":1.8821,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0078/2026"},"4TRI/2026":{"metaOficialReportada":0.28,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":null,"fonte":null}}},"camposEntrada":[{"nome":"qmaatu","rotulo":"QMAATU - Quantidade Média Mensal de Clientes Ativos no Ano nos canais digitais","tipo":"inteiro","obrigatorio":false},{"nome":"qmaant","rotulo":"QMAANT - Quantidade Média Mensal de Clientes Ativos do Ano anterior nos canais digitais","tipo":"inteiro","obrigatorio":false},{"nome":"dataBaseApuracao","rotulo":"Data-base da apuração","tipo":"data","obrigatorio":false},{"nome":"resultadoDocumentalClientesAtivos","rotulo":"Resultado documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"percentualAtingidoOficialClientesAtivos","rotulo":"Atingimento oficial documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"tipoPosicaoClientesAtivos","rotulo":"Natureza da posição","tipo":"selecao","obrigatorio":false,"opcoes":[{"value":"","label":"Selecione..."},{"value":"acompanhamento","label":"Acompanhamento mensal"},{"value":"fechamento_trimestral","label":"Fechamento trimestral"}]},{"nome":"fonteResultadoClientesAtivos","rotulo":"Fonte documental","tipo":"texto","obrigatorio":false},{"nome":"janelaApuracaoClientesAtivos","rotulo":"Natureza/janela da apuração","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"resultadoMensal","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"exigeEvidenciaNosFechamentos":true,"resultadoOficial":"ultima_posicao_homologada","exigirHomologacaoTransacionalVersaoAtual":true,"acompanhamentoMensal":true}';

  IF ISJSON(@regraInicial)<>1 OR ISJSON(@regraFinal)<>1
    THROW 53321,'JSON interno de regra inicial/final inválido.',1;
  IF HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@regraInicial))<>
     0xA340E78AB12B5E783BF811469FDC5AA2F64306F5684B327B0D7F48C01D2C3676
    THROW 53322,'Hash canônico interno da regra inicial divergiu.',1;
  IF HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@regraFinal))<>
     0xF1E97EE6CC17EAB69CD1531DE170732C8FE1E6AC7B42315FEBD961CC3D5751CB
    THROW 53323,'Hash canônico interno da regra final divergiu.',1;

  SET @hashRegraAtual=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@regraAtual));
  SET @regraInicialEstado=CASE WHEN @regraAtual=@regraInicial AND @hashRegraAtual=
    0xA340E78AB12B5E783BF811469FDC5AA2F64306F5684B327B0D7F48C01D2C3676 THEN 1 ELSE 0 END;
  SET @regraFinalEstado=CASE WHEN @regraAtual=@regraFinal AND @hashRegraAtual=
    0xF1E97EE6CC17EAB69CD1531DE170732C8FE1E6AC7B42315FEBD961CC3D5751CB THEN 1 ELSE 0 END;
  IF @regraInicialEstado=0 AND @regraFinalEstado=0
    THROW 53324,'Regra não corresponde ao estado inicial nem ao final exato.',1;

  SET @estadoInicialIntegral=CASE WHEN @indicadorInicial=1 AND @lancamentosInicial=1
    AND @metasInicial=1 AND @regraInicialEstado=1 THEN 1 ELSE 0 END;
  SET @estadoFinalIntegral=CASE WHEN @indicadorFinal=1 AND @lancamentosFinal=1
    AND @metasFinal=1 AND @regraFinalEstado=1 THEN 1 ELSE 0 END;
  IF @estadoInicialIntegral=0 AND @estadoFinalIntegral=0
    THROW 53325,'Estado parcial/misto detectado; nenhuma alteração foi autorizada.',1;

  /* Snapshots integrais/protegidos imediatamente antes de qualquer DML. */
  SELECT * INTO #ids25a27Antes FROM dbo.lancamentos WHERE id IN(N'25',N'26',N'27');
  SELECT * INTO #indicadoresOutrosAntes FROM dbo.indicadores WHERE id<>@indicadorId;
  SELECT * INTO #indicador03Antes FROM dbo.indicadores WHERE id=@indicadorId;
  SELECT * INTO #lancamentosOutrosAntes FROM dbo.lancamentos WHERE id NOT IN(N'28',N'29',N'30',N'31',N'32',N'33',N'34',N'35',N'36');
  SELECT * INTO #lancamentosAlvoAntes FROM dbo.lancamentos WHERE id IN(N'28',N'29',N'30',N'31',N'32',N'33',N'34',N'35',N'36');
  SELECT * INTO #configuracoesOutrasAntes FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores');
  SELECT [key],value,type INTO #metasOutrasAntes FROM OPENJSON(@metasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId;
  SELECT [key],value,type INTO #regrasOutrasAntes FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId;
  SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
  SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
  SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
  SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
  SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;

  SET @esperadoIndicadores=CASE WHEN @estadoInicialIntegral=1 THEN 1 ELSE 0 END;
  SET @esperadoLancamentos=CASE WHEN @estadoInicialIntegral=1 THEN 9 ELSE 0 END;
  SET @esperadoConfiguracoes=CASE WHEN @estadoInicialIntegral=1 THEN 2 ELSE 0 END;

  IF @estadoInicialIntegral=1
  BEGIN
    UPDATE dbo.indicadores
      SET tipo_consolidacao=N'ultima_posicao'
      WHERE id=@indicadorId AND tipo_consolidacao IS NULL;
    SET @linhasIndicadores=@@ROWCOUNT;

    UPDATE l SET
      meta_referencia=N'0.28',
      resultado_calculado=CASE WHEN a.resultadoTecnico IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoTecnico) END,
      resultado_oficial=CASE WHEN a.resultadoDocumental IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoDocumental) END,
      percentual_atingido=CASE WHEN a.atingimentoDocumental IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.atingimentoDocumental) END,
      situacao=a.situacao,
      status=a.statusFinal,
      dados_entrada_json=a.dadosFinal
    FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
    WHERE l.indicador_id=@indicadorId;
    SET @linhasLancamentos=@@ROWCOUNT;

    SET @metasNovo=@metasAntes;
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":232,"indicadorId":3,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":233,"indicadorId":3,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":234,"indicadorId":3,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":235,"indicadorId":3,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":236,"indicadorId":3,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":237,"indicadorId":3,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":238,"indicadorId":3,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":239,"indicadorId":3,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":240,"indicadorId":3,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":0.28,"fonte":"PEI_PN"}'));
    SET @regrasNovo=JSON_MODIFY(@regrasAntes,'$[2]',JSON_QUERY(@regraFinal));

    UPDATE dbo.configuracoes SET valor_json=@metasNovo
      WHERE chave=N'metas' AND valor_json=@metasAntes;
    SET @linhasConfiguracoes=@@ROWCOUNT;
    UPDATE dbo.configuracoes SET valor_json=@regrasNovo
      WHERE chave=N'regrasIndicadores' AND valor_json=@regrasAntes;
    SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;
  END;

  IF @linhasIndicadores<>@esperadoIndicadores
     OR @linhasLancamentos<>@esperadoLancamentos
     OR @linhasConfiguracoes<>@esperadoConfiguracoes
    THROW 53326,'Rowcount físico divergiu; esperado inicial=1/9/2 ou final=0/0/0.',1;

  IF NOT EXISTS(SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId
    AND tipo_calculo=N'crescimento_media_mensal'
    AND tipo_consolidacao=N'ultima_posicao'
    AND periodicidade=N'Não especificada'
    AND meta_anual=N'Crescer 28% na quantidade média mensal de clientes ativos no ano')
    THROW 53327,'Cadastro final do Indicador 03 inválido.',1;

  IF (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=CAST(N'0.28' AS DECIMAL(10,4))
        AND l.status=a.statusFinal
        AND ((a.resultadoTecnico IS NULL AND l.resultado_calculado IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoTecnico)
        AND ((a.resultadoDocumental IS NULL AND l.resultado_oficial IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoDocumental)
        AND ((a.atingimentoDocumental IS NULL AND l.percentual_atingido IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoDocumental)
        AND ((a.situacao IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacao)
        AND l.dados_entrada_json=a.dadosFinal)<>9
    THROW 53328,'Estado final dos IDs 28–36 divergiu.',1;

  /* Precisão técnica: componentes integrais, razão antes da formatação, sem FLOAT/REAL. */
  IF NOT EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'30'
    AND ABS(TRY_CONVERT(DECIMAL(38,18),resultado_calculado)-
      CAST(N'0.621559993919400047' AS DECIMAL(38,18)))<=CAST(N'0.000000000000000001' AS DECIMAL(38,18))
    AND JSON_VALUE(dados_entrada_json,'$.qmaatu')=N'3040125'
    AND JSON_VALUE(dados_entrada_json,'$.qmaant')=N'1874815'
    AND JSON_VALUE(dados_entrada_json,'$.dataBaseApuracao') IS NULL
    AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=CAST(N'0.6216' AS DECIMAL(10,4))
    AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=CAST(N'2.22' AS DECIMAL(10,4)))
    THROW 53329,'Fechamento JUN/2TRI ou sua precisão divergiu.',1;

  IF NOT EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'33'
    AND ABS(TRY_CONVERT(DECIMAL(38,18),resultado_calculado)-
      CAST(N'0.526990958214971514' AS DECIMAL(38,18)))<=CAST(N'0.000000000000000001' AS DECIMAL(38,18))
    AND JSON_VALUE(dados_entrada_json,'$.qmaatu')=N'3079049'
    AND JSON_VALUE(dados_entrada_json,'$.qmaant')=N'2016416'
    AND JSON_VALUE(dados_entrada_json,'$.dataBaseApuracao') IS NULL
    AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=CAST(N'0.5270' AS DECIMAL(10,4))
    AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=CAST(N'1.8821' AS DECIMAL(10,4)))
    THROW 53330,'Fechamento SET/3TRI ou sua precisão divergiu.',1;

  SELECT @metasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
  SELECT @regrasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
  IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois))<>222
     OR (SELECT COUNT(*) FROM OPENJSON(@metasDepois)
         WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>12
     OR (SELECT COUNT(*) FROM @metasEsperadas e INNER JOIN OPENJSON(@metasDepois) j
       ON TRY_CONVERT(INT,j.[key])=e.indiceFinal
       WHERE JSON_VALUE(j.value,'$.id')=e.id
         AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026
         AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
         AND JSON_VALUE(j.value,'$.nomeMes')=e.nomeMes
         AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=CAST(N'0.28' AS DECIMAL(10,4))
         AND JSON_VALUE(j.value,'$.fonte')=e.fonte)<>12
    THROW 53331,'Curva final de 12 metas divergiu.',1;

  IF EXISTS(SELECT JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
    FROM OPENJSON(@metasDepois)
    GROUP BY JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
    HAVING COUNT(*)<>1)
    THROW 53332,'A migration produziu duplicidade lógica de metas.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@regrasDepois))<>23
     OR JSON_QUERY(@regrasDepois,'$[2]')<>@regraFinal
     OR HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),JSON_QUERY(@regrasDepois,'$[2]'))) <>
        0xF1E97EE6CC17EAB69CD1531DE170732C8FE1E6AC7B42315FEBD961CC3D5751CB
     OR JSON_QUERY(@regrasDepois,'$[2].parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
     OR JSON_VALUE(@regrasDepois,'$[2].exigirHomologacaoTransacionalVersaoAtual')<>N'true'
     OR JSON_VALUE(@regrasDepois,'$[2].exigeEvidenciaNosFechamentos')<>N'true'
     OR JSON_VALUE(@regrasDepois,'$[2].acompanhamentoMensal')<>N'true'
    THROW 53333,'Regra final, índice, hash ou propriedades obrigatórias divergiram.',1;

  IF EXISTS(SELECT * FROM dbo.lancamentos WHERE id IN(N'25',N'26',N'27')
      EXCEPT SELECT * FROM #ids25a27Antes)
     OR EXISTS(SELECT * FROM #ids25a27Antes
      EXCEPT SELECT * FROM dbo.lancamentos WHERE id IN(N'25',N'26',N'27'))
    THROW 53334,'IDs 25–27 foram alterados; preservação integral falhou.',1;

  IF EXISTS(SELECT * FROM dbo.indicadores WHERE id<>@indicadorId
      EXCEPT SELECT * FROM #indicadoresOutrosAntes)
     OR EXISTS(SELECT * FROM #indicadoresOutrosAntes
      EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
    THROW 53335,'Outro indicador foi alterado.',1;

  IF EXISTS(SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,
      periodicidade,unidade_medida,tipo_calculo,meta_anual,formula_referencia,
      observacao_acompanhamento,ativo,created_at,updated_at
      FROM dbo.indicadores WHERE id=@indicadorId
      EXCEPT SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,
      periodicidade,unidade_medida,tipo_calculo,meta_anual,formula_referencia,
      observacao_acompanhamento,ativo,created_at,updated_at FROM #indicador03Antes)
     OR EXISTS(SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,
      periodicidade,unidade_medida,tipo_calculo,meta_anual,formula_referencia,
      observacao_acompanhamento,ativo,created_at,updated_at FROM #indicador03Antes
      EXCEPT SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,
      periodicidade,unidade_medida,tipo_calculo,meta_anual,formula_referencia,
      observacao_acompanhamento,ativo,created_at,updated_at
      FROM dbo.indicadores WHERE id=@indicadorId)
    THROW 53336,'Campo cadastral não autorizado foi alterado.',1;

  IF EXISTS(SELECT * FROM dbo.lancamentos WHERE id NOT IN(N'28',N'29',N'30',N'31',N'32',N'33',N'34',N'35',N'36')
      EXCEPT SELECT * FROM #lancamentosOutrosAntes)
     OR EXISTS(SELECT * FROM #lancamentosOutrosAntes
      EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN(N'28',N'29',N'30',N'31',N'32',N'33',N'34',N'35',N'36'))
    THROW 53337,'Lançamento fora dos IDs 28–36 foi alterado.',1;

  IF EXISTS(SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,
      unidade_apuradora,diretoria_responsavel,observacao_unidade,evidencia_id,
      usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN(N'28',N'29',N'30',N'31',N'32',N'33',N'34',N'35',N'36')
      EXCEPT SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,
      unidade_apuradora,diretoria_responsavel,observacao_unidade,evidencia_id,
      usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual FROM #lancamentosAlvoAntes)
     OR EXISTS(SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,
      unidade_apuradora,diretoria_responsavel,observacao_unidade,evidencia_id,
      usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual FROM #lancamentosAlvoAntes
      EXCEPT SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,
      unidade_apuradora,diretoria_responsavel,observacao_unidade,evidencia_id,
      usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN(N'28',N'29',N'30',N'31',N'32',N'33',N'34',N'35',N'36'))
    THROW 53338,'Versão, usuário, datas ou campo protegido de ID 28–36 foi alterado.',1;

  IF EXISTS(SELECT * FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores')
      EXCEPT SELECT * FROM #configuracoesOutrasAntes)
     OR EXISTS(SELECT * FROM #configuracoesOutrasAntes
      EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores'))
    THROW 53339,'Configuração não relacionada foi alterada.',1;

  IF EXISTS(SELECT [key],value,type FROM OPENJSON(@metasDepois)
      WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
      EXCEPT SELECT [key],value,type FROM #metasOutrasAntes)
     OR EXISTS(SELECT [key],value,type FROM #metasOutrasAntes
      EXCEPT SELECT [key],value,type FROM OPENJSON(@metasDepois)
      WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId)
    THROW 53340,'Meta de outro indicador ou sua ordem foi alterada.',1;

  IF EXISTS(SELECT [key],value,type FROM OPENJSON(@regrasDepois)
      WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
      EXCEPT SELECT [key],value,type FROM #regrasOutrasAntes)
     OR EXISTS(SELECT [key],value,type FROM #regrasOutrasAntes
      EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasDepois)
      WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId)
    THROW 53341,'Regra de outro indicador ou sua ordem foi alterada.',1;

  IF EXISTS(SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
     OR EXISTS(SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
     OR EXISTS(SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
     OR EXISTS(SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
     OR EXISTS(SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
     OR EXISTS(SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
     OR EXISTS(SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
     OR EXISTS(SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
     OR EXISTS(SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
     OR EXISTS(SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
    THROW 53342,'Governança global foi criada, alterada ou removida.',1;

  /* A migration não cria posição oficial: MAR continua Retificado e sem homologação da versão 2. */
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'27' AND status=N'Homologado')
    THROW 53343,'MAR foi indevidamente transformado em posição oficial.',1;

  COMMIT TRANSACTION;
  SELECT CASE WHEN @estadoFinalIntegral=1 THEN N'JÁ APLICADA — SEM DML' ELSE N'COMMIT' END AS transacao,
    @linhasIndicadores AS linhas_indicadores,
    @linhasLancamentos AS linhas_lancamentos,
    @linhasConfiguracoes AS linhas_configuracoes,
    CASE WHEN @estadoInicialIntegral=1 THEN 9 ELSE 0 END AS metas_logicas_criadas,
    0 AS registros_fisicos_criados,0 AS registros_removidos,
    0 AS ids_25_27_alterados,0 AS registros_governanca_alterados,
    @migration AS migration;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
