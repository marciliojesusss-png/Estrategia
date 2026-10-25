/*
  Indicador 23 — carga complementar dos componentes mensais autênticos JAN–AGO/2026.

  Escopo persistente exclusivo:
  - dbo.lancamentos: IDs 265–272;
  - nenhuma configuração ou tabela de governança recebe DML;
  - valores documentais dos Informes permanecem no JSON, separados do cálculo técnico.

  Compatibilidade: SQL Server 2016 / compatibility level 130.
  Precisão: componentes em DECIMAL(19,2), resultados e atingimentos em DECIMAL(38,18).
  Preparar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 53001, 'Execute esta migration somente no banco Estrategia.', 1;

IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) <> 130
    THROW 53002, 'Compatibilidade inválida: o banco Estrategia deve estar no nível 130.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255)=N'20261025_005_indicador23_componentes_rede_loterica.sql';
    DECLARE @indicadorId NVARCHAR(100)=N'23';
    DECLARE @estadoInicial BIT=0, @estadoFinal BIT=0;
    DECLARE @linhasLancamentos INT=0, @esperadoLancamentos INT=0;

    IF OBJECT_ID(N'dbo.indicadores',N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos',N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes',N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes',N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias',N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria',N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes',N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura',N'U') IS NULL
       OR OBJECT_ID(N'dbo.usuarios_acesso',N'U') IS NULL
       OR OBJECT_ID(N'dbo.usuarios_validacao',N'U') IS NULL
       OR OBJECT_ID(N'dbo.acessos_log',N'U') IS NULL
        THROW 53003, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF COL_LENGTH(N'dbo.lancamentos',N'dados_entrada_json') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'resultado_calculado') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'resultado_oficial') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'meta_referencia') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'percentual_atingido') IS NULL
        THROW 53004, 'Pré-condição inválida: coluna obrigatória ausente.', 1;

    IF NOT EXISTS (
      SELECT 1 FROM dbo.indicadores
      WHERE id=@indicadorId AND numero=23
        AND nome=N'Participação da Rede Lotérica nos Negócios da CAIXA Loterias'
        AND tipo_calculo=N'crescimento_rede_loterica_base_2025'
        AND tipo_consolidacao=N'acumulado_periodo_equivalente'
        AND plano=N'PN' AND pilar=N'Atuação em Ecossistema'
        AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
        AND meta_anual=N'Resultado 2026 ≥ 102% da base 2025'
        AND ativo=1
    ) OR (SELECT COUNT(*) FROM dbo.indicadores WHERE id=@indicadorId)<>1
        THROW 53005, 'Pré-condição inválida: estado final da migration 004 não foi reconhecido no cadastro.', 1;

    DECLARE @alvos TABLE (
      id NVARCHAR(100) PRIMARY KEY,
      mes INT NOT NULL,
      meta DECIMAL(5,4) NOT NULL,
      base2025Mes DECIMAL(19,2) NOT NULL,
      realizado2026Mes DECIMAL(19,2) NOT NULL,
      base2025Acumulada DECIMAL(19,2) NOT NULL,
      realizado2026Acumulado DECIMAL(19,2) NOT NULL,
      resultadoFinal DECIMAL(38,18) NOT NULL,
      atingimentoFinal DECIMAL(38,18) NOT NULL,
      situacaoFinal NVARCHAR(100) NOT NULL,
      statusInicial NVARCHAR(100) NOT NULL,
      resultadoInicial DECIMAL(38,18) NULL,
      atingimentoInicial DECIMAL(38,18) NULL,
      situacaoInicial NVARCHAR(100) NULL,
      dadosInicial NVARCHAR(MAX) NOT NULL,
      dadosFinal NVARCHAR(MAX) NOT NULL
    );

    INSERT INTO @alvos VALUES
      (N'265',1,1.0050,1345843615.20,1483427750.90,1345843615.20,1483427750.90,
       1.102228917346800517,1.096745191389851261,N'Atingido',N'Não iniciado',NULL,NULL,NULL,N'[]',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1345843615.20,"arrecadacaoRedeLotericaMes2026":1483427750.90}'),
      (N'266',2,1.0050,1691450489.90,1439543898.10,3037294105.10,2922971649.00,
       0.962360426042365086,0.957572563226233916,N'Abaixo da meta',N'Não iniciado',NULL,NULL,NULL,N'[]',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1691450489.90,"arrecadacaoRedeLotericaMes2026":1439543898.10}'),
      (N'267',3,1.0050,1337016995.60,1476242711.30,4374311100.70,4399214360.30,
       1.005693070069025235,1.000689621959229090,N'Atingido',N'Em preenchimento',1.005700000000000000,1.000696517412935323,N'Atingido',
       N'{"resultadoDocumentalRedeLoterica":0.0057,"percentualAtingidoOficialRedeLoterica":1.1386,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0029/2026","escalaResultadoDocumentalRedeLoterica":"incremento"}',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1337016995.60,"arrecadacaoRedeLotericaMes2026":1476242711.30,"resultadoDocumentalRedeLoterica":0.0057,"percentualAtingidoOficialRedeLoterica":1.1386,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0029/2026","escalaResultadoDocumentalRedeLoterica":"incremento"}'),
      (N'268',4,1.0100,1435038130.70,1520757013.20,5809349231.40,5919971373.50,
       1.019042088484210662,1.008952562855654121,N'Atingido',N'Não iniciado',NULL,NULL,NULL,N'[]',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1435038130.70,"arrecadacaoRedeLotericaMes2026":1520757013.20}'),
      (N'269',5,1.0100,1527837662.30,1600397124.10,7337186893.70,7520368497.60,
       1.024966190251646309,1.014818010150144860,N'Atingido',N'Não iniciado',NULL,NULL,NULL,N'[]',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1527837662.30,"arrecadacaoRedeLotericaMes2026":1600397124.10}'),
      (N'270',6,1.0100,1862564945.90,1573326249.20,9199751839.60,9093694746.80,
       0.988471744167763192,0.978684895215607121,N'Abaixo da meta',N'Em preenchimento',0.988000000000000000,0.978217821782178217,N'Abaixo da meta',
       N'{"resultadoDocumentalRedeLoterica":0.9880,"percentualAtingidoOficialRedeLoterica":0.9784,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0056/2026","escalaResultadoDocumentalRedeLoterica":"indice"}',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1862564945.90,"arrecadacaoRedeLotericaMes2026":1573326249.20,"resultadoDocumentalRedeLoterica":0.9880,"percentualAtingidoOficialRedeLoterica":0.9784,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0056/2026","escalaResultadoDocumentalRedeLoterica":"indice"}'),
      (N'271',7,1.0150,1552114336.40,1464165326.50,10751866176.00,10557860073.30,
       0.981956053067973007,0.967444387259086706,N'Abaixo da meta',N'Não iniciado',NULL,NULL,NULL,N'[]',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1552114336.40,"arrecadacaoRedeLotericaMes2026":1464165326.50}'),
      (N'272',8,1.0150,1468593628.90,1516647865.60,12220459804.90,12074507938.90,
       0.988056761502420872,0.973454937440808741,N'Abaixo da meta',N'Não iniciado',NULL,NULL,NULL,N'[]',
       N'{"arrecadacaoRedeLoterica2025PeriodoEquivalente":1468593628.90,"arrecadacaoRedeLotericaMes2026":1516647865.60}');

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN
          (N'265',N'266',N'267',N'268',N'269',N'270',N'271',N'272',N'273',N'274',N'275',N'276')
          AND indicador_id=@indicadorId)<>12
        THROW 53006, 'Pré-condição inválida: lançamentos 265–276 divergiram.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
        WHERE l.indicador_id=@indicadorId AND l.ano=2026 AND l.mes=a.mes
          AND l.competencia=CONCAT(N'2026-',RIGHT(CONCAT(N'0',a.mes),2))
          AND l.plano=N'PN' AND l.pilar=N'Atuação em Ecossistema'
          AND l.unidade_apuradora=N'SUCOL' AND l.diretoria_responsavel=N'DICOT'
          AND l.versao_atual=1 AND l.evidencia_id IS NULL
          AND COALESCE(l.referencia_evidencia,N'')=N''
          AND COALESCE(l.observacao_unidade,N'')=N''
          AND TRY_CONVERT(DECIMAL(5,4),l.meta_referencia)=a.meta)<>8
        THROW 53007, 'Pré-condição inválida: estrutura, versão ou meta dos alvos divergiu.', 1;

    IF EXISTS (
      SELECT 1 FROM @alvos a
      CROSS APPLY (
        SELECT CAST(SUM(b.base2025Mes) AS DECIMAL(19,2)) AS baseAcumulada,
               CAST(SUM(b.realizado2026Mes) AS DECIMAL(19,2)) AS realizadoAcumulado
        FROM @alvos b WHERE b.mes<=a.mes
      ) s
      WHERE s.baseAcumulada<>a.base2025Acumulada OR s.realizadoAcumulado<>a.realizado2026Acumulado
    )
        THROW 53008, 'Pré-condição inválida: deltas mensais não recompõem os acumulados centavo a centavo.', 1;

    IF EXISTS (
      SELECT 1 FROM @alvos a
      WHERE CAST(CAST(a.realizado2026Acumulado AS DECIMAL(19,2))
            /CAST(a.base2025Acumulada AS DECIMAL(19,2)) AS DECIMAL(38,18))<>a.resultadoFinal
         OR CAST(CAST(a.resultadoFinal AS DECIMAL(19,18))
            /CAST(a.meta AS DECIMAL(5,4)) AS DECIMAL(38,18))<>a.atingimentoFinal
         OR a.situacaoFinal<>CASE WHEN a.resultadoFinal>=a.meta THEN N'Atingido' ELSE N'Abaixo da meta' END
    )
        THROW 53009, 'Pré-condição inválida: resultado ou atingimento técnico de alta precisão divergiu.', 1;

    SET @estadoInicial=CASE WHEN (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.status=a.statusInicial AND l.dados_entrada_json=a.dadosInicial
        AND ((a.resultadoInicial IS NULL AND l.resultado_calculado IS NULL AND l.resultado_oficial IS NULL)
          OR (TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoInicial
            AND TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoInicial))
        AND ((a.atingimentoInicial IS NULL AND l.percentual_atingido IS NULL)
          OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoInicial)
        AND ((a.situacaoInicial IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacaoInicial))=8
      THEN 1 ELSE 0 END;

    SET @estadoFinal=CASE WHEN (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.status=N'Em preenchimento' AND l.dados_entrada_json=a.dadosFinal
        AND TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoFinal
        AND TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoFinal
        AND TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoFinal
        AND l.situacao=a.situacaoFinal)=8
      THEN 1 ELSE 0 END;

    IF @estadoInicial=0 AND @estadoFinal=0
        THROW 53010, 'Pré-condição inválida: estado parcial; somente o estado integral inicial ou final é aceito.', 1;

    IF EXISTS (SELECT 1 FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND ISJSON(dados_entrada_json)=1
      AND (JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLoterica2025') IS NOT NULL
        OR JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLoterica2026') IS NOT NULL
        OR JSON_VALUE(dados_entrada_json,'$.metaTrimestral') IS NOT NULL))
        THROW 53011, 'Pré-condição inválida: massa de teste antiga ou metaTrimestral reapareceu.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'273' AND indicador_id=@indicadorId
      AND TRY_CONVERT(DECIMAL(5,4),meta_referencia)=1.0150
      AND TRY_CONVERT(DECIMAL(38,18),resultado_calculado)=0.981600000000000000
      AND TRY_CONVERT(DECIMAL(38,18),resultado_oficial)=0.981600000000000000
      AND TRY_CONVERT(DECIMAL(38,18),percentual_atingido)=0.967093596059113300
      AND situacao=N'Abaixo da meta' AND status=N'Em preenchimento'
      AND dados_entrada_json=N'{"resultadoDocumentalRedeLoterica":0.9816,"percentualAtingidoOficialRedeLoterica":0.9671,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0078/2026","escalaResultadoDocumentalRedeLoterica":"indice"}')
        THROW 53012, 'Pré-condição inválida: SET/documental do 3TRI divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'274',N'275',N'276')
      AND indicador_id=@indicadorId AND status=N'Não iniciado'
      AND resultado_calculado IS NULL AND resultado_oficial IS NULL
      AND percentual_atingido IS NULL AND situacao IS NULL
      AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}'))<>3
        THROW 53013, 'Pré-condição inválida: OUT–DEZ não estão vazios.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.auditoria
          WHERE (entidade=N'lancamentos' AND entidade_id IN (SELECT id FROM @alvos))
             OR (entidade=N'indicadores' AND entidade_id=@indicadorId))
        THROW 53014, 'Pré-condição inválida: governança do Indicador 23 deve permanecer zero.', 1;

    DECLARE @metas NVARCHAR(MAX), @regras NVARCHAR(MAX);
    SELECT @metas=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regras=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    IF ISJSON(@metas)<>1 OR ISJSON(@regras)<>1
       OR (SELECT COUNT(*) FROM OPENJSON(@metas) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>12
       OR JSON_VALUE(@regras,'$[22].indicadorId')<>@indicadorId
       OR JSON_VALUE(@regras,'$[22].tipoCalculo')<>N'crescimento_rede_loterica_base_2025'
       OR JSON_VALUE(@regras,'$[22].tipoConsolidacao')<>N'acumulado_periodo_equivalente'
       OR JSON_QUERY(@regras,'$[22].parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
        THROW 53015, 'Pré-condição inválida: metas ou regra final da migration 004 divergiram.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metas) j INNER JOIN @alvos a
        ON TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=a.mes
        WHERE JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
          AND TRY_CONVERT(DECIMAL(5,4),JSON_VALUE(j.value,'$.metaMensal'))=a.meta)<>8
        THROW 53016, 'Pré-condição inválida: curva JAN–AGO divergiu.', 1;

    /* Snapshots integrais/protegidos imediatamente antes do único UPDATE. */
    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosOutrosAntes FROM dbo.lancamentos WHERE id NOT IN (SELECT id FROM @alvos);
    SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      INTO #alvosProtegidosAntes FROM dbo.lancamentos WHERE id IN (SELECT id FROM @alvos);
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #usuariosAcessoAntes FROM dbo.usuarios_acesso;
    SELECT * INTO #usuariosValidacaoAntes FROM dbo.usuarios_validacao;
    SELECT * INTO #acessosLogAntes FROM dbo.acessos_log;

    SET @esperadoLancamentos=CASE WHEN @estadoInicial=1 THEN 8 ELSE 0 END;
    IF @estadoInicial=1
    BEGIN
      UPDATE l SET
        dados_entrada_json=a.dadosFinal,
        resultado_calculado=CONVERT(NVARCHAR(100),a.resultadoFinal),
        resultado_oficial=CONVERT(NVARCHAR(100),a.resultadoFinal),
        percentual_atingido=CONVERT(NVARCHAR(100),a.atingimentoFinal),
        situacao=a.situacaoFinal,
        status=N'Em preenchimento'
      FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.indicador_id=@indicadorId;
      SET @linhasLancamentos=@@ROWCOUNT;
    END;

    IF @linhasLancamentos<>@esperadoLancamentos
        THROW 53017, 'Validação falhou: linhas físicas; PASS inicial=8 e PASS final=0.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.status=N'Em preenchimento' AND l.dados_entrada_json=a.dadosFinal
        AND TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoFinal
        AND TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoFinal
        AND TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.atingimentoFinal
        AND l.situacao=a.situacaoFinal)<>8
        THROW 53018, 'Validação falhou: componentes ou resultados finais JAN–AGO divergiram.', 1;

    IF EXISTS (
      SELECT 1 FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoRedeLoterica2025PeriodoEquivalente'))<>a.base2025Mes
         OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoRedeLotericaMes2026'))<>a.realizado2026Mes
    )
        THROW 53019, 'Validação falhou: componentes mensais não foram persistidos centavo a centavo.', 1;

    IF EXISTS (
      SELECT 1 FROM @alvos a
      CROSS APPLY (
        SELECT CAST(SUM(TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoRedeLoterica2025PeriodoEquivalente'))) AS DECIMAL(19,2)) AS baseAcumulada,
               CAST(SUM(TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoRedeLotericaMes2026'))) AS DECIMAL(19,2)) AS realizadoAcumulado
        FROM dbo.lancamentos l WHERE l.indicador_id=@indicadorId AND l.mes<=a.mes
      ) s
      WHERE s.baseAcumulada<>a.base2025Acumulada OR s.realizadoAcumulado<>a.realizado2026Acumulado
    )
        THROW 53020, 'Validação falhou: reconstrução acumulada persistida divergiu por pelo menos R$ 0,01.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'267'
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLoterica2025PeriodoEquivalente'))=1337016995.60
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLotericaMes2026'))=1476242711.30
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.resultadoDocumentalRedeLoterica'))=0.0057
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.percentualAtingidoOficialRedeLoterica'))=1.1386
      AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoRedeLoterica')=N'Informe DILOT/GERIN nº 0029/2026')
        THROW 53021, 'Validação falhou: MAR técnico/documental não foi preservado corretamente.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'270'
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLoterica2025PeriodoEquivalente'))=1862564945.90
      AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLotericaMes2026'))=1573326249.20
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.resultadoDocumentalRedeLoterica'))=0.9880
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.percentualAtingidoOficialRedeLoterica'))=0.9784
      AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoRedeLoterica')=N'Informe DILOT/GERIN nº 0056/2026')
        THROW 53022, 'Validação falhou: JUN técnico/documental não foi preservado corretamente.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores EXCEPT SELECT * FROM #indicadoresAntes)
       OR EXISTS (SELECT * FROM #indicadoresAntes EXCEPT SELECT * FROM dbo.indicadores)
        THROW 53023, 'Validação falhou: cadastro de indicador foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (SELECT id FROM @alvos) EXCEPT SELECT * FROM #lancamentosOutrosAntes)
       OR EXISTS (SELECT * FROM #lancamentosOutrosAntes EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (SELECT id FROM @alvos))
        THROW 53024, 'Validação falhou: SET, OUT–DEZ ou outro lançamento foi alterado.', 1;

    IF EXISTS (SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN (SELECT id FROM @alvos)
      EXCEPT SELECT * FROM #alvosProtegidosAntes)
       OR EXISTS (SELECT * FROM #alvosProtegidosAntes EXCEPT
      SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN (SELECT id FROM @alvos))
        THROW 53025, 'Validação falhou: campo protegido dos alvos foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes EXCEPT SELECT * FROM #configuracoesAntes)
       OR EXISTS (SELECT * FROM #configuracoesAntes EXCEPT SELECT * FROM dbo.configuracoes)
        THROW 53026, 'Validação falhou: configurações foram alteradas sem necessidade.', 1;

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
        THROW 53027, 'Validação falhou: governança foi criada, removida ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.usuarios_acesso EXCEPT SELECT * FROM #usuariosAcessoAntes)
       OR EXISTS (SELECT * FROM #usuariosAcessoAntes EXCEPT SELECT * FROM dbo.usuarios_acesso)
       OR EXISTS (SELECT * FROM dbo.usuarios_validacao EXCEPT SELECT * FROM #usuariosValidacaoAntes)
       OR EXISTS (SELECT * FROM #usuariosValidacaoAntes EXCEPT SELECT * FROM dbo.usuarios_validacao)
       OR EXISTS (SELECT * FROM dbo.acessos_log EXCEPT SELECT * FROM #acessosLogAntes)
       OR EXISTS (SELECT * FROM #acessosLogAntes EXCEPT SELECT * FROM dbo.acessos_log)
        THROW 53028, 'Validação falhou: usuários, permissões ou logs foram alterados.', 1;

    COMMIT TRANSACTION;
    SELECT CASE WHEN @estadoFinal=1 THEN N'JÁ APLICADA — SEM DML' ELSE N'COMMIT' END AS transacao,
      @linhasLancamentos AS linhas_lancamentos,0 AS registros_criados,0 AS registros_removidos,
      @migration AS migration;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
