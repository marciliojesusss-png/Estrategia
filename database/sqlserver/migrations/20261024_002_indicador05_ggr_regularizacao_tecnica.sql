/*
  Indicador 05 — Gross Gaming Revenue (GGR)

  Regularização técnica restrita a:
  - cadastro: consolidação acumulada por soma mensal e meta anual recalibrada;
  - lançamentos 52–57: posições acumuladas documentais de ABR–SET/2026;
  - lançamento 60: meta exata vigente de DEZ/2026;
  - configurações metas/regrasIndicadores: curva, fechamentos e memória documental.

  As posições documentais acumuladas nunca são somadas entre competências.
  A memória da planilha de JUN permanece separada do fechamento oficial do Informe.
  Nenhuma homologação, evidência, auditoria, retificação ou reabertura é criada,
  alterada ou removida. IDs 49–51 e 58–59 permanecem integralmente preservados.

  IMPORTANTE: preparar e revisar este arquivo não autoriza sua execução.
  Ao executar com sqlcmd, informar -f 65001 para preservar os literais UTF-8.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52501, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255) = N'20261024_002_indicador05_ggr_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100) = N'5';
    DECLARE @metaAnualOriginal DECIMAL(19,2) = 15600000000.00;
    DECLARE @metaAnualVigente DECIMAL(19,2) = 14996238568.92;
    DECLARE @metaAnualDescricaoOriginal NVARCHAR(255) = N'≥ R$ 15,6 bilhões';
    DECLARE @metaAnualDescricaoVigente NVARCHAR(255) = N'≥ R$ 14.996.238.568,92';
    DECLARE @indicadorInicial BIT = 0;
    DECLARE @indicadorFinal BIT = 0;
    DECLARE @alvosEstadoInicial BIT = 0;
    DECLARE @alvosEstadoFinal BIT = 0;
    DECLARE @dezInicial BIT = 0;
    DECLARE @dezFinal BIT = 0;
    DECLARE @metasEstadoInicial BIT = 0;
    DECLARE @metasEstadoFinal BIT = 0;
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regraAntes NVARCHAR(MAX);
    DECLARE @regraFinal NVARCHAR(MAX);
    DECLARE @metasAntes NVARCHAR(MAX);
    DECLARE @metasDepois NVARCHAR(MAX);
    DECLARE @linhasIndicador INT = 0;
    DECLARE @linhasLancamentos INT = 0;
    DECLARE @linhasConfiguracoes INT = 0;
    DECLARE @esperadoIndicador INT = 0;
    DECLARE @esperadoLancamentos INT = 0;
    DECLARE @esperadoConfiguracoes INT = 0;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
        THROW 52502, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id=@indicadorId AND numero=5 AND nome=N'Gross Gaming Revenue (GGR)'
          AND plano=N'PEI' AND pilar=N'Eficiência e Rentabilidade'
          AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
          AND periodicidade=N'Não especificada' AND unidade_medida=N'moeda'
          AND tipo_calculo=N'ggr_formula'
          AND formula_referencia=N'GGR = Arrecadação total - Prêmios a pagar'
    )
        THROW 52503, 'Pré-condição inválida: identidade do Indicador 05 divergiu.', 1;

    SET @indicadorInicial = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id=@indicadorId AND tipo_consolidacao IS NULL AND meta_anual=@metaAnualDescricaoOriginal
    ) THEN 1 ELSE 0 END;
    SET @indicadorFinal = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id=@indicadorId AND tipo_consolidacao=N'acumulado_por_soma_mensal' AND meta_anual=@metaAnualDescricaoVigente
    ) THEN 1 ELSE 0 END;
    IF @indicadorInicial=0 AND @indicadorFinal=0
        THROW 52504, 'Pré-condição inválida: cadastro não está no estado inicial nem no final reconhecido.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND TRY_CONVERT(INT,id) BETWEEN 49 AND 60)<>12
       OR EXISTS (
          SELECT 1 FROM dbo.lancamentos
          WHERE indicador_id=@indicadorId
            AND (ano<>2026 OR mes<1 OR mes>12 OR TRY_CONVERT(INT,id)<>48+mes)
       )
        THROW 52505, 'Pré-condição inválida: lançamentos 49–60 não estão íntegros.', 1;

    /* JAN–MAR: histórico existente protegido, inclusive status e governança. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'49',N'50',N'51') AND indicador_id=@indicadorId
          AND status=N'Homologado' AND versao_atual=1
          AND usuario_responsavel=N'sucol@caixaloterias.local'
          AND ISJSON(dados_entrada_json)=1
          AND JSON_VALUE(dados_entrada_json,'$.arrecadacaoTotalMes') IS NOT NULL
          AND JSON_VALUE(dados_entrada_json,'$.premiosAPagarMes') IS NOT NULL)<>3
        THROW 52506, 'Pré-condição inválida: histórico JAN–MAR divergiu.', 1;

    /* OUT/NOV: acompanhamento futuro sem realizado; não são alvo. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'58',N'59') AND indicador_id=@indicadorId
          AND status=N'Não iniciado' AND versao_atual=1
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao=N'Sem dados'
          AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}'))<>2
        THROW 52507, 'Pré-condição inválida: OUT/NOV divergiram do estado vazio protegido.', 1;

    DECLARE @alvos TABLE (
        id NVARCHAR(100) PRIMARY KEY,
        mes INT NOT NULL,
        metaInicial DECIMAL(19,2) NOT NULL,
        metaFinal DECIMAL(19,2) NOT NULL,
        realizado DECIMAL(19,2) NOT NULL,
        percentual DECIMAL(38,18) NOT NULL,
        situacao NVARCHAR(100) NOT NULL,
        tipoPosicao NVARCHAR(100) NOT NULL,
        dadosFinal NVARCHAR(MAX) NOT NULL
    );

    INSERT INTO @alvos (id,mes,metaInicial,metaFinal,realizado,percentual,situacao,tipoPosicao,dadosFinal) VALUES
    (N'52',4,4193018947.00,4193018946.75,4455763900.80,
      CAST(CAST(4455763900.80 AS DECIMAL(38,18))/CAST(4193018946.75 AS DECIMAL(38,18)) AS DECIMAL(38,18)),
      N'Em acompanhamento',N'acompanhamento',
      N'{"ggrAcumuladoOficial":4455763900.80,"metaAcumuladaOficial":4193018946.75,"tipoPosicaoGGR":"acompanhamento","fonteResultadoGGR":"16.10(3).xlsx","metaPlanilhaGGR":4193018946.75,"atingimentoPlanilhaGGR":1.0626624771761772}'),
    (N'53',5,5285128208.00,5285128207.78,5640812286.33,
      CAST(CAST(5640812286.33 AS DECIMAL(38,18))/CAST(5285128207.78 AS DECIMAL(38,18)) AS DECIMAL(38,18)),
      N'Em acompanhamento',N'acompanhamento',
      N'{"ggrAcumuladoOficial":5640812286.33,"metaAcumuladaOficial":5285128207.78,"tipoPosicaoGGR":"acompanhamento","fonteResultadoGGR":"16.10(3).xlsx","metaPlanilhaGGR":5285128207.78,"atingimentoPlanilhaGGR":1.0672990445201336}'),
    (N'54',6,6512131485.00,6782063824.52,6784050495.32,
      CAST(CAST(6784050495.32 AS DECIMAL(38,18))/CAST(6782063824.52 AS DECIMAL(38,18)) AS DECIMAL(38,18)),
      N'Atingido',N'fechamento_trimestral',
      N'{"ggrAcumuladoOficial":6784050495.32,"metaAcumuladaOficial":6782063824.52,"tipoPosicaoGGR":"fechamento_trimestral","fonteResultadoGGR":"Informe DILOT/GERIN nº 0056/2026","metaPlanilhaGGR":6512131484.93,"atingimentoPlanilhaGGR":1.04175576169174,"metaOficialFechamentoGGR":6782063824.52,"resultadoOficialGGR":6784050495.32,"atingimentoOficialGGR":1.0002929301244285,"fontePlanilhaGGR":"16.10(3).xlsx","fonteOficialGGR":"Informe DILOT/GERIN nº 0056/2026"}'),
    (N'55',7,7644597006.00,7644597006.08,7883901606.54,
      CAST(CAST(7883901606.54 AS DECIMAL(38,18))/CAST(7644597006.08 AS DECIMAL(38,18)) AS DECIMAL(38,18)),
      N'Em acompanhamento',N'acompanhamento',
      N'{"ggrAcumuladoOficial":7883901606.54,"metaAcumuladaOficial":7644597006.08,"tipoPosicaoGGR":"acompanhamento","fonteResultadoGGR":"16.10(3).xlsx","metaPlanilhaGGR":7644597006.08,"atingimentoPlanilhaGGR":1.0313037561390972}'),
    (N'56',8,8771034927.00,8771034926.84,9031400541.43,
      CAST(CAST(9031400541.43 AS DECIMAL(38,18))/CAST(8771034926.84 AS DECIMAL(38,18)) AS DECIMAL(38,18)),
      N'Em acompanhamento',N'acompanhamento',
      N'{"ggrAcumuladoOficial":9031400541.43,"metaAcumuladaOficial":8771034926.84,"tipoPosicaoGGR":"acompanhamento","fonteResultadoGGR":"16.10(3).xlsx","metaPlanilhaGGR":8771034926.84,"atingimentoPlanilhaGGR":1.0296847084479464}'),
    (N'57',9,10271204884.00,10271204883.87,10435959467.05,
      CAST(CAST(10435959467.05 AS DECIMAL(38,18))/CAST(10271204883.87 AS DECIMAL(38,18)) AS DECIMAL(38,18)),
      N'Atingido',N'fechamento_trimestral',
      N'{"ggrAcumuladoOficial":10435959467.05,"metaAcumuladaOficial":10271204883.87,"tipoPosicaoGGR":"fechamento_trimestral","fonteResultadoGGR":"Informe DILOT/GERIN nº 0078/2026","metaPlanilhaGGR":10271204883.87,"atingimentoPlanilhaGGR":1.0160404339162517,"metaOficialFechamentoGGR":10271204883.87,"resultadoOficialGGR":10435959467.05,"atingimentoOficialGGR":1.0160404339162517,"fontePlanilhaGGR":"16.10(3).xlsx","fonteOficialGGR":"Informe DILOT/GERIN nº 0078/2026"}');

    IF EXISTS (
        SELECT 1
        FROM @alvos a
        INNER JOIN dbo.lancamentos l ON l.id=a.id AND l.indicador_id=@indicadorId
        WHERE l.competencia<>CONCAT(N'2026-',RIGHT(CONCAT(N'0',a.mes),2))
           OR l.ano<>2026 OR l.mes<>a.mes
           OR l.trimestre<>CONCAT(((a.mes-1)/3)+1,N'TRI/2026')
           OR l.plano<>N'PEI' OR l.pilar<>N'Eficiência e Rentabilidade'
           OR l.unidade_apuradora<>N'SUCOL' OR l.diretoria_responsavel<>N'DICOT'
           OR l.usuario_responsavel IS NOT NULL OR l.evidencia_id IS NOT NULL
           OR COALESCE(l.referencia_evidencia,N'')<>N''
           OR NOT (
          (
            l.status=N'Não iniciado' AND l.versao_atual=1
            AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)=a.metaInicial
            AND l.resultado_calculado IS NULL AND l.resultado_oficial IS NULL
            AND l.percentual_atingido IS NULL AND l.situacao=N'Sem dados'
            AND LTRIM(RTRIM(l.dados_entrada_json)) IN (N'[]',N'{}')
          )
          OR
          (
            l.status=N'Em preenchimento' AND l.versao_atual=1
            AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)=a.metaFinal
            AND TRY_CONVERT(DECIMAL(19,2),l.resultado_calculado)=a.realizado
            AND TRY_CONVERT(DECIMAL(19,2),l.resultado_oficial)=a.realizado
            AND ABS(TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)-a.percentual)<CAST(0.000000000000001 AS DECIMAL(38,18))
            AND l.situacao=a.situacao AND ISJSON(l.dados_entrada_json)=1
            AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.ggrAcumuladoOficial'))=a.realizado
            AND JSON_VALUE(l.dados_entrada_json,'$.tipoPosicaoGGR')=a.tipoPosicao
          )
        )
    ) OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'52',N'53',N'54',N'55',N'56',N'57') AND indicador_id=@indicadorId)<>6
        THROW 52508, 'Pré-condição inválida: ABR–SET não estão no estado inicial nem no final reconhecido.', 1;

    SET @alvosEstadoInicial = CASE WHEN (
      SELECT COUNT(*)
      FROM @alvos a INNER JOIN dbo.lancamentos l ON l.id=a.id AND l.indicador_id=@indicadorId
      WHERE l.status=N'Não iniciado' AND l.versao_atual=1
        AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)=a.metaInicial
        AND l.resultado_calculado IS NULL AND l.resultado_oficial IS NULL
        AND l.percentual_atingido IS NULL AND l.situacao=N'Sem dados'
        AND LTRIM(RTRIM(l.dados_entrada_json)) IN (N'[]',N'{}')
    )=6 THEN 1 ELSE 0 END;
    SET @alvosEstadoFinal = CASE WHEN (
      SELECT COUNT(*)
      FROM @alvos a INNER JOIN dbo.lancamentos l ON l.id=a.id AND l.indicador_id=@indicadorId
      WHERE l.status=N'Em preenchimento' AND l.versao_atual=1
        AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)=a.metaFinal
        AND TRY_CONVERT(DECIMAL(19,2),l.resultado_calculado)=a.realizado
        AND TRY_CONVERT(DECIMAL(19,2),l.resultado_oficial)=a.realizado
        AND ABS(TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)-a.percentual)<CAST(0.000000000000001 AS DECIMAL(38,18))
        AND l.situacao=a.situacao AND ISJSON(l.dados_entrada_json)=1
        AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.ggrAcumuladoOficial'))=a.realizado
        AND JSON_VALUE(l.dados_entrada_json,'$.tipoPosicaoGGR')=a.tipoPosicao
    )=6 THEN 1 ELSE 0 END;

    SET @dezInicial = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id=N'60' AND indicador_id=@indicadorId AND competencia=N'2026-12'
          AND ano=2026 AND mes=12 AND trimestre=N'4TRI/2026'
          AND plano=N'PEI' AND pilar=N'Eficiência e Rentabilidade'
          AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
          AND usuario_responsavel IS NULL AND evidencia_id IS NULL
          AND COALESCE(referencia_evidencia,N'')=N''
          AND status=N'Não iniciado' AND versao_atual=1
          AND TRY_CONVERT(DECIMAL(19,2),meta_referencia)=@metaAnualOriginal
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao=N'Sem dados'
          AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}')
    ) THEN 1 ELSE 0 END;
    SET @dezFinal = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id=N'60' AND indicador_id=@indicadorId AND competencia=N'2026-12'
          AND ano=2026 AND mes=12 AND trimestre=N'4TRI/2026'
          AND plano=N'PEI' AND pilar=N'Eficiência e Rentabilidade'
          AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
          AND usuario_responsavel IS NULL AND evidencia_id IS NULL
          AND COALESCE(referencia_evidencia,N'')=N''
          AND status=N'Não iniciado' AND versao_atual=1
          AND TRY_CONVERT(DECIMAL(19,2),meta_referencia)=@metaAnualVigente
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao=N'Sem dados'
          AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}')
    ) THEN 1 ELSE 0 END;
    IF @dezInicial=0 AND @dezFinal=0
        THROW 52509, 'Pré-condição inválida: DEZ não está no estado inicial nem no final reconhecido.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes
        WHERE lancamento_id IN (N'49',N'50',N'51',N'52',N'53',N'54',N'55',N'56',N'57',N'58',N'59',N'60'))<>3
       OR (SELECT COUNT(*) FROM dbo.homologacoes
           WHERE (id=N'16' AND lancamento_id=N'49')
              OR (id=N'17' AND lancamento_id=N'50')
              OR (id=N'18' AND lancamento_id=N'51'))<>3
       OR (SELECT COUNT(*) FROM dbo.evidencias
           WHERE lancamento_id IN (N'49',N'50',N'51',N'52',N'53',N'54',N'55',N'56',N'57',N'58',N'59',N'60'))<>3
       OR (SELECT COUNT(*) FROM dbo.evidencias
           WHERE (id=N'evidencia-49' AND lancamento_id=N'49')
              OR (id=N'evidencia-50' AND lancamento_id=N'50')
              OR (id=N'evidencia-51' AND lancamento_id=N'51'))<>3
       OR (SELECT COUNT(*) FROM dbo.auditoria
           WHERE entidade=N'lancamentos'
             AND entidade_id IN (N'49',N'50',N'51',N'52',N'53',N'54',N'55',N'56',N'57',N'58',N'59',N'60'))<>9
       OR (SELECT COUNT(*) FROM dbo.auditoria
           WHERE entidade=N'lancamentos'
             AND entidade_id IN (N'49',N'50',N'51')
             AND TRY_CONVERT(INT,id) BETWEEN 37 AND 45)<>9
       OR EXISTS (SELECT 1 FROM dbo.retificacoes
                  WHERE lancamento_id IN (N'49',N'50',N'51',N'52',N'53',N'54',N'55',N'56',N'57',N'58',N'59',N'60'))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura
                  WHERE lancamento_id IN (N'49',N'50',N'51',N'52',N'53',N'54',N'55',N'56',N'57',N'58',N'59',N'60'))
        THROW 52510, 'Pré-condição inválida: governança dos lançamentos 49–60 divergiu do estado real reconhecido.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'metas')<>1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores')<>1
        THROW 52511, 'Pré-condição inválida: configurações ausentes ou duplicadas.', 1;

    SELECT @metasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regrasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    IF ISJSON(@metasAntes)<>1 OR ISJSON(@regrasAntes)<>1
        THROW 52512, 'Pré-condição inválida: configuração JSON inválida.', 1;

    /*
      SQL Server 2016 exige path literal em JSON_MODIFY. Os índices abaixo foram
      confirmados por OPENJSON no banco Estrategia e são protegidos antes do DML.
      Qualquer mudança futura na ordem dos arrays interrompe a migration.
    */
    IF JSON_VALUE(@regrasAntes,'$[4].indicadorId')<>@indicadorId
       OR JSON_VALUE(@regrasAntes,'$[4].nome')<>N'Gross Gaming Revenue (GGR)'
       OR JSON_VALUE(@regrasAntes,'$[4].tipoCalculo')<>N'ggr_formula'
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes)
           WHERE TRY_CONVERT(INT,[key])=4
             AND JSON_VALUE(value,'$.indicadorId')=@indicadorId
             AND JSON_VALUE(value,'$.nome')=N'Gross Gaming Revenue (GGR)')<>1
        THROW 52534, 'Pré-condição inválida: o Indicador 05 não está no índice literal $[4] de regrasIndicadores.', 1;

    DECLARE @indicesMetas TABLE (
      indice INT PRIMARY KEY,
      id NVARCHAR(100) NOT NULL,
      mes INT NOT NULL,
      nomeMes NVARCHAR(50) NOT NULL
    );
    INSERT INTO @indicesMetas (indice,id,mes,nomeMes) VALUES
      (30,N'13',1,N'Janeiro'),(31,N'14',2,N'Fevereiro'),(32,N'15',3,N'Março'),
      (33,N'79',4,N'Abril'),(34,N'80',5,N'Maio'),(35,N'81',6,N'Junho'),
      (36,N'82',7,N'Julho'),(37,N'83',8,N'Agosto'),(38,N'84',9,N'Setembro'),
      (39,N'85',10,N'Outubro'),(40,N'86',11,N'Novembro'),(41,N'87',12,N'Dezembro');
    IF (SELECT COUNT(*)
        FROM @indicesMetas i
        INNER JOIN OPENJSON(@metasAntes) j ON TRY_CONVERT(INT,j.[key])=i.indice
        WHERE JSON_VALUE(j.value,'$.id')=i.id
          AND JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
          AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=i.mes
          AND JSON_VALUE(j.value,'$.nomeMes')=i.nomeMes)<>12
        THROW 52535, 'Pré-condição inválida: o bloco do Indicador 05 não ocupa integralmente os índices literais $[30] a $[41] de metas.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>12
       OR EXISTS (
          SELECT TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))
          FROM OPENJSON(@metasAntes)
          WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId
          GROUP BY TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))
          HAVING COUNT(*)<>1
       )
        THROW 52513, 'Pré-condição inválida: curva genérica do Indicador 05 não possui exatamente 12 competências únicas.', 1;

    DECLARE @metasAlvo TABLE (
      mes INT PRIMARY KEY,
      inicial DECIMAL(19,2),
      final DECIMAL(19,2),
      fonteInicial NVARCHAR(255),
      fonteFinal NVARCHAR(255)
    );
    INSERT INTO @metasAlvo VALUES
      (4,4193018947.00,4193018946.75,N'curva_acumulada_ggr_2026',N'curva_acumulada_ggr_2026'),
      (5,5285128208.00,5285128207.78,N'curva_acumulada_ggr_2026',N'curva_acumulada_ggr_2026'),
      (6,6512131485.00,6782063824.52,N'curva_acumulada_ggr_2026',N'fechamento_oficial_ggr_2tri_2026'),
      (7,7644597006.00,7644597006.08,N'curva_acumulada_ggr_2026',N'curva_acumulada_ggr_2026'),
      (8,8771034927.00,8771034926.84,N'curva_acumulada_ggr_2026',N'curva_acumulada_ggr_2026'),
      (9,10271204884.00,10271204883.87,N'curva_acumulada_ggr_2026',N'fechamento_oficial_ggr_3tri_2026'),
      (12,15600000000.00,14996238568.92,N'curva_acumulada_ggr_2026',N'proposicao_dilot_gerin_0050_2026');

    IF EXISTS (
        SELECT 1
        FROM @metasAlvo a
        LEFT JOIN OPENJSON(@metasAntes) j
          ON JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
         AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=a.mes
        WHERE j.[key] IS NULL
           OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(j.value,'$.metaMensal')) IS NULL
           OR JSON_VALUE(j.value,'$.fonte') IS NULL
           OR NOT (
             (
               TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(j.value,'$.metaMensal'))=a.inicial
               AND JSON_VALUE(j.value,'$.fonte')=a.fonteInicial
             )
             OR
             (
               TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(j.value,'$.metaMensal'))=a.final
               AND JSON_VALUE(j.value,'$.fonte')=a.fonteFinal
             )
           )
    )
        THROW 52514, 'Pré-condição inválida: meta configurada fora dos estados inicial/final reconhecidos.', 1;

    SET @metasEstadoInicial = CASE WHEN (
      SELECT COUNT(*)
      FROM @metasAlvo a
      INNER JOIN OPENJSON(@metasAntes) j
        ON JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
       AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=a.mes
      WHERE TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(j.value,'$.metaMensal'))=a.inicial
        AND JSON_VALUE(j.value,'$.fonte')=a.fonteInicial
    )=7 THEN 1 ELSE 0 END;
    SET @metasEstadoFinal = CASE WHEN (
      SELECT COUNT(*)
      FROM @metasAlvo a
      INNER JOIN OPENJSON(@metasAntes) j
        ON JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
       AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=a.mes
      WHERE TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(j.value,'$.metaMensal'))=a.final
        AND JSON_VALUE(j.value,'$.fonte')=a.fonteFinal
    )=7 THEN 1 ELSE 0 END;

    SET @regraAntes=JSON_QUERY(@regrasAntes,'$[4]');
    IF @regraAntes IS NULL
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
       OR JSON_VALUE(@regraAntes,'$.tipoCalculo')<>N'ggr_formula'
       OR JSON_VALUE(@regraAntes,'$.tipoConsolidacao')<>N'acumulado_por_soma_mensal'
       OR JSON_VALUE(@regraAntes,'$.unidadeMedida')<>N'moeda'
       OR JSON_VALUE(@regraAntes,'$.parametrosCalculo.campoArrecadacao')<>N'arrecadacaoTotalMes'
       OR JSON_VALUE(@regraAntes,'$.parametrosCalculo.campoPremios')<>N'premiosAPagarMes'
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.metaAnualValor')) IS NULL
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.metaAnualValor')) NOT IN (@metaAnualOriginal,@metaAnualVigente)
       OR (
          JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
          AND JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
       )
        THROW 52515, 'Pré-condição inválida: regra do Indicador 05 divergiu dos estados reconhecidos.', 1;

    SET @regraFinal=N'{"indicadorId":5,"nome":"Gross Gaming Revenue (GGR)","tipoCalculo":"ggr_formula","tipoConsolidacao":"acumulado_por_soma_mensal","metaRecorrente":false,"unidadeMedida":"moeda","metaAnualValor":14996238568.92,"parametrosCalculo":{"campoArrecadacao":"arrecadacaoTotalMes","campoPremios":"premiosAPagarMes","campoGgrAcumuladoDocumental":"ggrAcumuladoOficial","campoTipoPosicao":"tipoPosicaoGGR","metaTipo":"curva_acumulada_por_competencia","metasAcumuladasPorCompetencia":{"2026-01":1056593039,"2026-02":1997659493,"2026-03":3070246140.78,"2026-04":4193018946.75,"2026-05":5285128207.78,"2026-06":6782063824.52,"2026-07":7644597006.08,"2026-08":8771034926.84,"2026-09":10271204883.87,"2026-10":11442642920,"2026-11":12525118608,"2026-12":14996238568.92},"sentidoMeta":"quanto_maior_melhor","mesesFechamentoTrimestral":[3,6,9,12],"metaAnualOriginalGGR":15600000000,"fonteMetaAnualVigente":"Proposição DILOT/GERIN nº 0050/2026, de 06/08/2026","apresentacoesOficiaisTrimestrais":{"1TRI/2026":{"metaOficialReportada":3070246140.78,"resultadoOficialReportado":3322204494.29,"percentualAtingidoOficialReportado":1.0820645453025435,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},"2TRI/2026":{"metaOficialReportada":6782063824.52,"resultadoOficialReportado":6784050495.32,"percentualAtingidoOficialReportado":1.0002929301244285,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0056/2026"},"3TRI/2026":{"metaOficialReportada":10271204883.87,"resultadoOficialReportado":10435959467.05,"percentualAtingidoOficialReportado":1.0160404339162517,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0078/2026"},"4TRI/2026":{"metaOficialReportada":14996238568.92,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":"Sem dados","fonte":"Proposição DILOT/GERIN nº 0050/2026"}}},"camposEntrada":[{"nome":"arrecadacaoTotalMes","rotulo":"Arrecadação total no mês","tipo":"moeda","obrigatorio":false},{"nome":"premiosAPagarMes","rotulo":"Prêmios a pagar no mês","tipo":"moeda","obrigatorio":false},{"nome":"ggrAcumuladoOficial","rotulo":"GGR acumulado documental até a competência","tipo":"moeda","obrigatorio":false},{"nome":"tipoPosicaoGGR","rotulo":"Tipo da posição","tipo":"selecao","obrigatorio":false,"opcoes":["acompanhamento","fechamento_trimestral"]},{"nome":"fonteResultadoGGR","rotulo":"Fonte do resultado acumulado","tipo":"texto","obrigatorio":false},{"nome":"metaPlanilhaGGR","rotulo":"Meta de acompanhamento da planilha","tipo":"moeda","obrigatorio":false},{"nome":"atingimentoPlanilhaGGR","rotulo":"Atingimento de acompanhamento da planilha","tipo":"percentual","entradaPtBr":true,"escalaPercentual":"decimal","obrigatorio":false}],"campoResultadoPrincipal":"resultadoAcumulado","campoPercentualAtingido":"percentualAtingidoAnual","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"ggr_acumulado_por_curva"}';

    IF ISJSON(@regraFinal)<>1
        THROW 52516, 'Falha interna: JSON final da regra é inválido.', 1;

    DECLARE @regraEstadoInicial BIT = CASE WHEN
      TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.metaAnualValor'))=@metaAnualOriginal
      AND JSON_VALUE(@regraAntes,'$.parametrosCalculo.campoGgrAcumuladoDocumental') IS NULL
      AND JSON_VALUE(@regraAntes,'$.parametrosCalculo.campoTipoPosicao') IS NULL
      AND JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral') IS NULL
      AND JSON_VALUE(@regraAntes,'$.parametrosCalculo.metaAnualOriginalGGR') IS NULL
      AND JSON_QUERY(@regraAntes,'$.parametrosCalculo.apresentacoesOficiaisTrimestrais') IS NULL
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-01"'))=1056593039.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-02"'))=1997659493.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-03"'))=3070246140.78
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-04"'))=4193018947.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-05"'))=5285128208.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-06"'))=6512131485.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-07"'))=7644597006.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-08"'))=8771034927.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-09"'))=10271204884.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-10"'))=11442642920.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-11"'))=12525118608.00
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metasAcumuladasPorCompetencia."2026-12"'))=15600000000.00
      AND JSON_VALUE(@regraAntes,'$.campoResultadoPrincipal')=N'resultadoMensal'
      AND JSON_VALUE(@regraAntes,'$.campoPercentualAtingido')=N'percentualAtingidoMensal'
      AND (SELECT COUNT(*) FROM OPENJSON(@regraAntes,'$.camposEntrada'))=2
      AND (SELECT COUNT(*) FROM OPENJSON(@regraAntes,'$.camposEntrada')
           WHERE JSON_VALUE(value,'$.nome') IN (N'arrecadacaoTotalMes',N'premiosAPagarMes')
             AND JSON_VALUE(value,'$.obrigatorio')=N'true')=2
      THEN 1 ELSE 0 END;
    DECLARE @regraEstadoFinal BIT = CASE WHEN @regraAntes=@regraFinal THEN 1 ELSE 0 END;
    IF @regraEstadoInicial=0 AND @regraEstadoFinal=0
        THROW 52532, 'Pré-condição inválida: regra do Indicador 05 não corresponde exatamente ao estado inicial real nem ao estado final.', 1;

    IF NOT (
      (@indicadorInicial=1 AND @alvosEstadoInicial=1 AND @dezInicial=1 AND @metasEstadoInicial=1 AND @regraEstadoInicial=1)
      OR
      (@indicadorFinal=1 AND @alvosEstadoFinal=1 AND @dezFinal=1 AND @metasEstadoFinal=1 AND @regraEstadoFinal=1)
    )
        THROW 52533, 'Pré-condição inválida: estado parcialmente migrado ou inconsistente; somente o estado inicial integral ou o final integral são aceitos.', 1;

    /* Snapshots integrais imediatamente antes de qualquer DML. */
    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;

    SET @esperadoIndicador=@indicadorInicial;
    SELECT @esperadoLancamentos=COUNT(*)
    FROM @alvos a INNER JOIN dbo.lancamentos l ON l.id=a.id
    WHERE l.status=N'Não iniciado';
    SET @esperadoLancamentos=@esperadoLancamentos+@dezInicial;

    UPDATE dbo.indicadores
    SET tipo_consolidacao=N'acumulado_por_soma_mensal', meta_anual=@metaAnualDescricaoVigente
    WHERE id=@indicadorId AND @indicadorInicial=1;
    SET @linhasIndicador=@@ROWCOUNT;

    UPDATE l
    SET dados_entrada_json=a.dadosFinal,
        resultado_calculado=CONVERT(NVARCHAR(100),a.realizado),
        resultado_oficial=CONVERT(NVARCHAR(100),a.realizado),
        meta_referencia=CONVERT(NVARCHAR(100),a.metaFinal),
        percentual_atingido=CONVERT(NVARCHAR(100),a.percentual),
        situacao=a.situacao,
        status=N'Em preenchimento'
    FROM dbo.lancamentos l
    INNER JOIN @alvos a ON a.id=l.id
    WHERE l.indicador_id=@indicadorId AND l.status=N'Não iniciado';
    SET @linhasLancamentos=@@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET meta_referencia=CONVERT(NVARCHAR(100),@metaAnualVigente)
    WHERE id=N'60' AND indicador_id=@indicadorId AND @dezInicial=1;
    SET @linhasLancamentos=@linhasLancamentos+@@ROWCOUNT;

    SET @metasDepois=@metasAntes;
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[33].metaMensal',CAST(4193018946.75 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[34].metaMensal',CAST(5285128207.78 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[35].metaMensal',CAST(6782063824.52 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[35].fonte',N'fechamento_oficial_ggr_2tri_2026');
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[36].metaMensal',CAST(7644597006.08 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[37].metaMensal',CAST(8771034926.84 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[38].metaMensal',CAST(10271204883.87 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[38].fonte',N'fechamento_oficial_ggr_3tri_2026');
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[41].metaMensal',CAST(14996238568.92 AS DECIMAL(19,2)));
    SET @metasDepois=JSON_MODIFY(@metasDepois,'$[41].fonte',N'proposicao_dilot_gerin_0050_2026');

    SET @regrasDepois=JSON_MODIFY(@regrasAntes,'$[4]',JSON_QUERY(@regraFinal));
    SET @esperadoConfiguracoes=CASE WHEN @metasDepois<>@metasAntes THEN 1 ELSE 0 END
                                  +CASE WHEN @regrasDepois<>@regrasAntes THEN 1 ELSE 0 END;

    UPDATE dbo.configuracoes SET valor_json=@metasDepois
    WHERE chave=N'metas' AND valor_json<>@metasDepois;
    SET @linhasConfiguracoes=@@ROWCOUNT;
    UPDATE dbo.configuracoes SET valor_json=@regrasDepois
    WHERE chave=N'regrasIndicadores' AND valor_json<>@regrasDepois;
    SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;

    IF @linhasIndicador<>@esperadoIndicador
       OR @linhasLancamentos<>@esperadoLancamentos
       OR @linhasConfiguracoes<>@esperadoConfiguracoes
        THROW 52517, 'Validação falhou: quantidade de linhas alteradas divergiu do estado inicial detectado.', 1;

    IF NOT EXISTS (
       SELECT 1 FROM dbo.indicadores
       WHERE id=@indicadorId AND tipo_consolidacao=N'acumulado_por_soma_mensal'
         AND meta_anual=@metaAnualDescricaoVigente
    )
        THROW 52518, 'Validação falhou: cadastro final inválido.', 1;

    IF (SELECT COUNT(*)
        FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
        WHERE l.indicador_id=@indicadorId AND l.status=N'Em preenchimento'
          AND l.versao_atual=1
          AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)=a.metaFinal
          AND TRY_CONVERT(DECIMAL(19,2),l.resultado_calculado)=a.realizado
          AND TRY_CONVERT(DECIMAL(19,2),l.resultado_oficial)=a.realizado
          AND ABS(TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)-a.percentual)<CAST(0.000000000000001 AS DECIMAL(38,18))
          AND l.situacao=a.situacao
          AND JSON_VALUE(l.dados_entrada_json,'$.tipoPosicaoGGR')=a.tipoPosicao
          AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.ggrAcumuladoOficial'))=a.realizado)<>6
        THROW 52519, 'Validação falhou: posição final ABR–SET inválida.', 1;

    IF NOT EXISTS (
       SELECT 1 FROM dbo.lancamentos
       WHERE id=N'54'
         AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.metaPlanilhaGGR'))=6512131484.93
         AND ABS(TRY_CONVERT(DECIMAL(38,18),JSON_VALUE(dados_entrada_json,'$.atingimentoPlanilhaGGR'))-CAST(1.04175576169174 AS DECIMAL(38,18)))<CAST(0.000000000000001 AS DECIMAL(38,18))
         AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.metaOficialFechamentoGGR'))=6782063824.52
         AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.resultadoOficialGGR'))=6784050495.32
         AND ABS(TRY_CONVERT(DECIMAL(38,18),JSON_VALUE(dados_entrada_json,'$.atingimentoOficialGGR'))-CAST(1.0002929301244285 AS DECIMAL(38,18)))<CAST(0.000000000000001 AS DECIMAL(38,18))
         AND JSON_VALUE(dados_entrada_json,'$.fontePlanilhaGGR')=N'16.10(3).xlsx'
         AND JSON_VALUE(dados_entrada_json,'$.fonteOficialGGR')=N'Informe DILOT/GERIN nº 0056/2026'
    )
        THROW 52520, 'Validação falhou: separação planilha × Informe de JUN inválida.', 1;

    IF NOT EXISTS (
       SELECT 1 FROM dbo.lancamentos
       WHERE id=N'60' AND status=N'Não iniciado' AND versao_atual=1
         AND TRY_CONVERT(DECIMAL(19,2),meta_referencia)=@metaAnualVigente
         AND resultado_calculado IS NULL AND resultado_oficial IS NULL
         AND percentual_atingido IS NULL AND situacao=N'Sem dados'
    )
        THROW 52521, 'Validação falhou: DEZ não preservou ausência de realizado e meta vigente.', 1;

    SELECT @metasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regrasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    SELECT @regraAntes=value FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;
    IF TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.metaAnualValor'))<>@metaAnualVigente
       OR JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
       OR JSON_VALUE(@regraAntes,'$.parametrosCalculo.campoGgrAcumuladoDocumental')<>N'ggrAcumuladoOficial'
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.metaAnualOriginalGGR'))<>@metaAnualOriginal
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.apresentacoesOficiaisTrimestrais."2TRI/2026".metaOficialReportada'))<>6782063824.52
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.apresentacoesOficiaisTrimestrais."3TRI/2026".resultadoOficialReportado'))<>10435959467.05
        THROW 52522, 'Validação falhou: regra final do Indicador 05 inválida.', 1;

    IF EXISTS (
       SELECT a.mes FROM @metasAlvo a
       EXCEPT
       SELECT TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))
       FROM OPENJSON(@metasDepois)
       WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId
         AND EXISTS (
           SELECT 1 FROM @metasAlvo a
           WHERE a.mes=TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))
             AND a.final=TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(value,'$.metaMensal'))
         )
    )
        THROW 52523, 'Validação falhou: curva genérica final inválida.', 1;

    /* Proteção integral de linhas e campos fora do escopo autorizado. */
    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id<>@indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
        THROW 52524, 'Validação falhou: outro indicador foi alterado.', 1;

    IF EXISTS (
       SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
              tipo_calculo,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
       FROM dbo.indicadores WHERE id=@indicadorId
       EXCEPT
       SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
              tipo_calculo,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
       FROM #indicadoresAntes WHERE id=@indicadorId
    ) OR EXISTS (
       SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
              tipo_calculo,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
       FROM #indicadoresAntes WHERE id=@indicadorId
       EXCEPT
       SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
              tipo_calculo,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
       FROM dbo.indicadores WHERE id=@indicadorId
    )
        THROW 52525, 'Validação falhou: campo não autorizado do cadastro foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60') EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60'))
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60') EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60'))
        THROW 52526, 'Validação falhou: lançamento fora do escopo foi alterado.', 1;

    IF EXISTS (
       SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
              observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
       FROM dbo.lancamentos WHERE id IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60')
       EXCEPT
       SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
              observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
       FROM #lancamentosAntes WHERE id IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60')
    ) OR EXISTS (
       SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
              observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
       FROM #lancamentosAntes WHERE id IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60')
       EXCEPT
       SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
              observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
       FROM dbo.lancamentos WHERE id IN (N'52',N'53',N'54',N'55',N'56',N'57',N'60')
    )
        THROW 52527, 'Validação falhou: versão, usuário, datas ou outro campo protegido dos alvos foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores') EXCEPT SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores'))
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'metas',N'regrasIndicadores') EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores'))
       OR (SELECT COUNT(*) FROM dbo.configuracoes)<>(SELECT COUNT(*) FROM #configuracoesAntes)
        THROW 52528, 'Validação falhou: configuração não relacionada foi alterada.', 1;

    IF EXISTS (
       SELECT value FROM OPENJSON(@regrasDepois)
       WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
       EXCEPT
       SELECT value FROM OPENJSON(@regrasAntes)
       WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
       SELECT value FROM OPENJSON(@regrasAntes)
       WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
       EXCEPT
       SELECT value FROM OPENJSON(@regrasDepois)
       WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    )
        THROW 52529, 'Validação falhou: regra de outro indicador foi alterada.', 1;

    IF EXISTS (
       SELECT value FROM OPENJSON(@metasDepois)
       WHERE NOT (
         JSON_VALUE(value,'$.indicadorId')=@indicadorId
         AND TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')) IN (4,5,6,7,8,9,12)
       )
       EXCEPT
       SELECT value FROM OPENJSON(@metasAntes)
       WHERE NOT (
         JSON_VALUE(value,'$.indicadorId')=@indicadorId
         AND TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')) IN (4,5,6,7,8,9,12)
       )
    ) OR EXISTS (
       SELECT value FROM OPENJSON(@metasAntes)
       WHERE NOT (
         JSON_VALUE(value,'$.indicadorId')=@indicadorId
         AND TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')) IN (4,5,6,7,8,9,12)
       )
       EXCEPT
       SELECT value FROM OPENJSON(@metasDepois)
       WHERE NOT (
         JSON_VALUE(value,'$.indicadorId')=@indicadorId
         AND TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')) IN (4,5,6,7,8,9,12)
       )
    )
        THROW 52531, 'Validação falhou: meta fora do escopo autorizado foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
       OR EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
        THROW 52530, 'Validação falhou: governança foi criada, removida ou alterada.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS transacao,
           @linhasIndicador AS linhas_indicadores,
           @linhasLancamentos AS linhas_lancamentos,
           @linhasConfiguracoes AS linhas_configuracoes,
           0 AS registros_criados,
           0 AS registros_removidos,
           @migration AS migration;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
