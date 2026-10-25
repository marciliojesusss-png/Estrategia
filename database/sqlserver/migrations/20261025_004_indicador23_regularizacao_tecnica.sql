/*
  Indicador 23 — Participação da Rede Lotérica nos Negócios da CAIXA Loterias

  Escopo persistente exclusivo:
  - dbo.indicadores: ID 23, somente nome e tipo_consolidacao;
  - dbo.lancamentos: IDs 265–276, somente campos técnicos/documentais;
  - dbo.configuracoes: chaves metas e regrasIndicadores.

  Compatibilidade: SQL Server 2016, compatibility level 130 e TSql130Parser.
  Precisão: metas/índices em DECIMAL(10,4); razões técnicas em DECIMAL(38,18).
  Nenhuma tabela de governança recebe DML. Preparar este arquivo não autoriza
  sua execução. Ao usar sqlcmd, informar -f 65001 para preservar UTF-8.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52901, 'Execute esta migration somente no banco Estrategia.', 1;

IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) <> 130
    THROW 52902, 'Compatibilidade inválida: o banco Estrategia deve estar no nível 130.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255)=N'20261025_004_indicador23_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100)=N'23';
    DECLARE @nomeInicial NVARCHAR(255)=N'Participação da Rede Lotérica nos Negócios';
    DECLARE @nomeFinal NVARCHAR(255)=N'Participação da Rede Lotérica nos Negócios da CAIXA Loterias';
    DECLARE @indicadorInicial BIT=0, @indicadorFinal BIT=0;
    DECLARE @lancamentosInicial BIT=0, @lancamentosFinal BIT=0;
    DECLARE @metasInicial BIT=0, @metasFinal BIT=0;
    DECLARE @regraInicialEstado BIT=0, @regraFinalEstado BIT=0;
    DECLARE @estadoInicialIntegral BIT=0, @estadoFinalIntegral BIT=0;
    DECLARE @linhasIndicador INT=0, @linhasLancamentos INT=0, @linhasConfiguracoes INT=0;
    DECLARE @esperadoIndicador INT=0, @esperadoLancamentos INT=0, @esperadoConfiguracoes INT=0;
    DECLARE @metasAntes NVARCHAR(MAX), @metasNovo NVARCHAR(MAX), @metasDepois NVARCHAR(MAX);
    DECLARE @regrasAntes NVARCHAR(MAX), @regrasNovo NVARCHAR(MAX), @regrasDepois NVARCHAR(MAX);
    DECLARE @regraAntes NVARCHAR(MAX), @regraInicial NVARCHAR(MAX), @regraFinal NVARCHAR(MAX);

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
        THROW 52903, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF COL_LENGTH(N'dbo.indicadores',N'tipo_consolidacao') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'dados_entrada_json') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'resultado_calculado') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'resultado_oficial') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'meta_referencia') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'percentual_atingido') IS NULL
       OR COL_LENGTH(N'dbo.configuracoes',N'valor_json') IS NULL
        THROW 52904, 'Pré-condição inválida: coluna obrigatória ausente.', 1;

    IF (SELECT COUNT(*) FROM dbo.indicadores WITH (UPDLOCK,HOLDLOCK) WHERE id=@indicadorId)<>1
       OR NOT EXISTS (
          SELECT 1 FROM dbo.indicadores
          WHERE id=@indicadorId AND numero=23
            AND nome IN (@nomeInicial,@nomeFinal)
            AND plano=N'PN' AND pilar=N'Atuação em Ecossistema'
            AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
            AND periodicidade=N'Não especificada' AND unidade_medida=N'percentual'
            AND tipo_calculo=N'crescimento_rede_loterica_base_2025'
            AND meta_anual=N'Resultado 2026 ≥ 102% da base 2025'
            AND formula_referencia=N'Arrecadação da Rede Lotérica em 2026 / Arrecadação da Rede Lotérica em 2025, sempre em período equivalente'
            AND ativo=1
       )
        THROW 52905, 'Pré-condição inválida: identidade do Indicador 23 divergiu.', 1;

    SET @indicadorInicial=CASE WHEN EXISTS (
      SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND nome=@nomeInicial AND tipo_consolidacao IS NULL
    ) THEN 1 ELSE 0 END;
    SET @indicadorFinal=CASE WHEN EXISTS (
      SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND nome=@nomeFinal
        AND tipo_consolidacao=N'acumulado_periodo_equivalente'
    ) THEN 1 ELSE 0 END;
    IF @indicadorInicial=0 AND @indicadorFinal=0
        THROW 52906, 'Pré-condição inválida: cadastro não está no estado inicial nem no final reconhecido.', 1;

    DECLARE @alvos TABLE (
      id NVARCHAR(100) PRIMARY KEY, mes INT NOT NULL,
      metaInicial DECIMAL(10,4) NOT NULL, metaFinal DECIMAL(10,4) NOT NULL,
      resultadoFinal DECIMAL(38,18) NULL, percentualFinal DECIMAL(38,18) NULL,
      situacaoFinal NVARCHAR(100) NULL, statusFinal NVARCHAR(100) NOT NULL,
      dadosFinal NVARCHAR(MAX) NOT NULL
    );
    INSERT INTO @alvos VALUES
      (N'265',1,0.0050,1.0050,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'266',2,0.0050,1.0050,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'267',3,0.0050,1.0050,1.0057,
       CAST(CAST(1.0057 AS DECIMAL(20,10))/CAST(1.0050 AS DECIMAL(20,10)) AS DECIMAL(38,18)),
       N'Atingido',N'Em preenchimento',
       N'{"resultadoDocumentalRedeLoterica":0.0057,"percentualAtingidoOficialRedeLoterica":1.1386,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0029/2026","escalaResultadoDocumentalRedeLoterica":"incremento"}'),
      (N'268',4,0.0100,1.0100,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'269',5,0.0100,1.0100,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'270',6,0.0100,1.0100,0.9880,
       CAST(CAST(0.9880 AS DECIMAL(20,10))/CAST(1.0100 AS DECIMAL(20,10)) AS DECIMAL(38,18)),
       N'Abaixo da meta',N'Em preenchimento',
       N'{"resultadoDocumentalRedeLoterica":0.9880,"percentualAtingidoOficialRedeLoterica":0.9784,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0056/2026","escalaResultadoDocumentalRedeLoterica":"indice"}'),
      (N'271',7,0.0150,1.0150,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'272',8,0.0150,1.0150,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'273',9,0.0150,1.0150,0.9816,
       CAST(CAST(0.9816 AS DECIMAL(20,10))/CAST(1.0150 AS DECIMAL(20,10)) AS DECIMAL(38,18)),
       N'Abaixo da meta',N'Em preenchimento',
       N'{"resultadoDocumentalRedeLoterica":0.9816,"percentualAtingidoOficialRedeLoterica":0.9671,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0078/2026","escalaResultadoDocumentalRedeLoterica":"indice"}'),
      (N'274',10,0.0200,1.0200,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'275',11,0.0200,1.0200,NULL,NULL,NULL,N'Não iniciado',N'[]'),
      (N'276',12,0.0200,1.0200,NULL,NULL,NULL,N'Não iniciado',N'[]');

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN
          (N'265',N'266',N'267',N'268',N'269',N'270',N'271',N'272',N'273',N'274',N'275',N'276')
          AND indicador_id=@indicadorId)<>12
       OR EXISTS (
          SELECT 1 FROM dbo.lancamentos
          WHERE indicador_id=@indicadorId
            AND (ano<>2026 OR mes<1 OR mes>12 OR TRY_CONVERT(INT,id)<>264+mes
              OR competencia<>CONCAT(N'2026-',RIGHT(CONCAT(N'0',mes),2))
              OR trimestre<>CONCAT(((mes-1)/3)+1,N'TRI/2026'))
       )
        THROW 52907, 'Pré-condição inválida: IDs 265–276 ou competências JAN–DEZ divergiram.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
        WHERE l.indicador_id=@indicadorId AND l.plano=N'PN' AND l.pilar=N'Atuação em Ecossistema'
          AND l.unidade_apuradora=N'SUCOL' AND l.diretoria_responsavel=N'DICOT'
          AND l.versao_atual=1 AND l.evidencia_id IS NULL
          AND COALESCE(l.referencia_evidencia,N'')=N''
          AND COALESCE(l.observacao_unidade,N'')=N'')<>12
        THROW 52908, 'Pré-condição inválida: campos estruturais/protegidos dos lançamentos divergiram.', 1;

    SET @lancamentosInicial=CASE WHEN
      (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
       WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=a.metaInicial
         AND (
           (l.id=N'267' AND l.status=N'Em preenchimento' AND l.versao_atual=1
             AND l.usuario_responsavel=N'UNIDADE-SUCOL'
             AND TRY_CONVERT(DECIMAL(10,6),l.resultado_calculado)=0.005693
             AND TRY_CONVERT(DECIMAL(10,6),l.resultado_oficial)=0.005693
             AND TRY_CONVERT(DECIMAL(10,4),l.percentual_atingido)=1.1386
             AND l.situacao=N'Atingido'
             AND l.dados_entrada_json=N'{"arrecadacaoRedeLoterica2025":3000000000,"arrecadacaoRedeLoterica2026":3017079000,"metaTrimestral":0.5}'
             AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoRedeLoterica2025'))=3000000000.00
             AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(l.dados_entrada_json,'$.arrecadacaoRedeLoterica2026'))=3017079000.00
             AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(l.dados_entrada_json,'$.metaTrimestral'))=0.5000)
           OR
           (l.id<>N'267' AND l.status=N'Não iniciado' AND l.usuario_responsavel IS NULL
             AND l.resultado_calculado IS NULL AND l.resultado_oficial IS NULL
             AND l.percentual_atingido IS NULL AND l.situacao IS NULL
             AND LTRIM(RTRIM(l.dados_entrada_json)) IN (N'[]',N'{}'))
         ))=12 THEN 1 ELSE 0 END;

    SET @lancamentosFinal=CASE WHEN
      (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
       WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=a.metaFinal
         AND l.status=a.statusFinal AND l.versao_atual=1
         AND ((l.id=N'267' AND l.usuario_responsavel=N'UNIDADE-SUCOL') OR (l.id<>N'267' AND l.usuario_responsavel IS NULL))
         AND ((a.resultadoFinal IS NULL AND l.resultado_calculado IS NULL)
              OR TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoFinal)
         AND ((a.resultadoFinal IS NULL AND l.resultado_oficial IS NULL)
              OR TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoFinal)
         AND ((a.percentualFinal IS NULL AND l.percentual_atingido IS NULL)
              OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.percentualFinal)
         AND ((a.situacaoFinal IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacaoFinal)
         AND l.dados_entrada_json=a.dadosFinal)=12 THEN 1 ELSE 0 END;
    IF @lancamentosInicial=0 AND @lancamentosFinal=0
        THROW 52909, 'Pré-condição inválida: lançamentos não estão no estado inicial exato nem no final exato.', 1;

    /* PASS = 0 em cada tabela de governança; THROW = qualquer quantidade diferente de zero. */
    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (SELECT id FROM @alvos))
       OR EXISTS (SELECT 1 FROM dbo.auditoria
          WHERE (entidade=N'lancamentos' AND entidade_id IN (SELECT id FROM @alvos))
             OR (entidade=N'indicadores' AND entidade_id=@indicadorId))
        THROW 52910, 'Pré-condição inválida: o Indicador 23 possui governança; esperado zero.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'metas')<>1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores')<>1
        THROW 52911, 'Pré-condição inválida: configurações metas/regrasIndicadores ausentes ou duplicadas.', 1;
    SELECT @metasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regrasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    IF ISJSON(@metasAntes)<>1 OR ISJSON(@regrasAntes)<>1
        THROW 52912, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF EXISTS (SELECT JSON_VALUE(value,'$.id') FROM OPENJSON(@metasAntes)
               GROUP BY JSON_VALUE(value,'$.id') HAVING COUNT(*)<>1)
       OR EXISTS (SELECT JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
                  FROM OPENJSON(@metasAntes)
                  GROUP BY JSON_VALUE(value,'$.indicadorId'),JSON_VALUE(value,'$.ano'),JSON_VALUE(value,'$.mes')
                  HAVING COUNT(*)<>1)
        THROW 52913, 'Pré-condição inválida: metas possuem ID lógico ou competência duplicada.', 1;

    DECLARE @metasEsperadas TABLE (
      indice INT PRIMARY KEY,id NVARCHAR(100) NOT NULL,mes INT NOT NULL,nomeMes NVARCHAR(50) NOT NULL,
      metaInicial DECIMAL(10,4) NULL,fonteInicial NVARCHAR(255) NULL,
      metaFinal DECIMAL(10,4) NOT NULL,fonteFinal NVARCHAR(255) NOT NULL
    );
    INSERT INTO @metasEsperadas VALUES
      (147,N'67',1,N'Janeiro',1.0200,N'meta_indice_102_base_2025',1.0050,N'curva_indice_periodo_equivalente_2026'),
      (148,N'68',2,N'Fevereiro',1.0200,N'meta_indice_102_base_2025',1.0050,N'curva_indice_periodo_equivalente_2026'),
      (149,N'69',3,N'Março',1.0200,N'meta_indice_102_base_2025',1.0050,N'curva_indice_periodo_equivalente_2026'),
      /* O array atual possui 195 objetos (índices 0–194); os novos itens são anexados. */
      (195,N'214',4,N'Abril',NULL,NULL,1.0100,N'curva_indice_periodo_equivalente_2026'),
      (196,N'215',5,N'Maio',NULL,NULL,1.0100,N'curva_indice_periodo_equivalente_2026'),
      (197,N'216',6,N'Junho',NULL,NULL,1.0100,N'curva_indice_periodo_equivalente_2026'),
      (198,N'217',7,N'Julho',NULL,NULL,1.0150,N'curva_indice_periodo_equivalente_2026'),
      (199,N'218',8,N'Agosto',NULL,NULL,1.0150,N'curva_indice_periodo_equivalente_2026'),
      (200,N'219',9,N'Setembro',NULL,NULL,1.0150,N'curva_indice_periodo_equivalente_2026'),
      (201,N'220',10,N'Outubro',NULL,NULL,1.0200,N'curva_indice_periodo_equivalente_2026'),
      (202,N'221',11,N'Novembro',NULL,NULL,1.0200,N'curva_indice_periodo_equivalente_2026'),
      (203,N'222',12,N'Dezembro',NULL,NULL,1.0200,N'curva_indice_periodo_equivalente_2026');

    SET @metasInicial=CASE WHEN
      (SELECT COUNT(*) FROM OPENJSON(@metasAntes))=195
      AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)=3
      AND (SELECT COUNT(*) FROM @metasEsperadas e INNER JOIN OPENJSON(@metasAntes) j
           ON TRY_CONVERT(INT,j.[key])=e.indice
           WHERE e.metaInicial IS NOT NULL AND JSON_VALUE(j.value,'$.id')=e.id
             AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026
             AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
             AND JSON_VALUE(j.value,'$.nomeMes')=e.nomeMes
             AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=e.metaInicial
             AND JSON_VALUE(j.value,'$.fonte')=e.fonteInicial)=3
      THEN 1 ELSE 0 END;
    SET @metasFinal=CASE WHEN
      (SELECT COUNT(*) FROM OPENJSON(@metasAntes))=204
      AND (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)=12
      AND (SELECT COUNT(*) FROM @metasEsperadas e INNER JOIN OPENJSON(@metasAntes) j
           ON TRY_CONVERT(INT,j.[key])=e.indice
           WHERE JSON_VALUE(j.value,'$.id')=e.id
             AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026
             AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
             AND JSON_VALUE(j.value,'$.nomeMes')=e.nomeMes
             AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=e.metaFinal
             AND JSON_VALUE(j.value,'$.fonte')=e.fonteFinal)=12
      THEN 1 ELSE 0 END;
    IF @metasInicial=0 AND @metasFinal=0
        THROW 52914, 'Pré-condição inválida: curva metas não está no estado inicial exato nem no final exato.', 1;

    IF EXISTS (
      SELECT 1 FROM OPENJSON(@metasAntes) j
      WHERE TRY_CONVERT(INT,JSON_VALUE(j.value,'$.id')) BETWEEN 214 AND 222
        AND NOT EXISTS (SELECT 1 FROM @metasEsperadas e
          WHERE e.id=JSON_VALUE(j.value,'$.id') AND JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
            AND e.mes=TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes')))
    )
        THROW 52915, 'Pré-condição inválida: IDs lógicos 214–222 colidem com outra meta.', 1;

    IF JSON_VALUE(@regrasAntes,'$[22].indicadorId')<>@indicadorId
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
        THROW 52916, 'Pré-condição inválida: regra única do Indicador 23 não está no índice literal $[22].', 1;
    SELECT @regraAntes=value FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,[key])=22;

    SET @regraInicial=N'{"indicadorId":23,"nome":"Participação da Rede Lotérica nos Negócios","tipoCalculo":"crescimento_rede_loterica_base_2025","tipoConsolidacao":"acumulado_periodo_equivalente","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":1.02,"parametrosCalculo":{"campoValor2026Mes":"arrecadacaoRedeLotericaMes2026","campoValor2026Acumulado":"arrecadacaoRedeLotericaAcumulada2026","campoValor2026PeriodoAtual":"arrecadacaoRedeLoterica2026PeriodoAtual","campoBase2025PeriodoEquivalente":"arrecadacaoRedeLoterica2025PeriodoEquivalente","campoBase2025Acumulada":"arrecadacaoRedeLoterica2025Acumulada","campoBase2025PeriodoAtual":"arrecadacaoRedeLoterica2025PeriodoEquivalente","campoNumerador":"arrecadacaoRedeLotericaMes2026","campoNumeradorLegado":"arrecadacaoRedeLotericaMes2026","campoNumerador2025":"arrecadacaoRedeLoterica2025PeriodoEquivalente","campoNumerador2025Legado":"arrecadacaoRedeLotericaMes2025","metaTipo":"incremento_minimo","metaCrescimento":0.02,"metaIndice":1.02,"sentidoMeta":"quanto_maior_melhor","mensagemBaseInsuficiente":"Dados insuficientes: informe a arrecadação da Rede Lotérica em 2025 para o período equivalente.","mensagemRealizadoInsuficiente":"Arrecadação da Rede Lotérica 2026 deve ser informada e não pode ser negativa."},"camposEntrada":[{"nome":"arrecadacaoRedeLoterica2025PeriodoEquivalente","rotulo":"Base 2025 - Rede Lotérica no período equivalente","tipo":"moeda","obrigatorio":true},{"nome":"arrecadacaoRedeLotericaMes2026","rotulo":"Arrecadação Rede Lotérica 2026 no mês","tipo":"moeda","obrigatorio":true},{"nome":"arrecadacaoRedeLotericaAcumulada2026","rotulo":"Arrecadação Rede Lotérica 2026 acumulada até a competência","tipo":"moeda","obrigatorio":false},{"nome":"arrecadacaoRedeLoterica2026PeriodoAtual","rotulo":"Arrecadação Rede Lotérica 2026 no período atual","tipo":"moeda","obrigatorio":false},{"nome":"arrecadacaoTotalLoteriasPeriodo","rotulo":"Arrecadação total de loterias no período","tipo":"moeda","obrigatorio":false},{"nome":"fonteEvidenciaRedeLoterica","rotulo":"Fonte/evidência da Rede Lotérica","tipo":"texto","obrigatorio":false},{"nome":"observacaoArea","rotulo":"Observação da área","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"indiceEmRelacaoA2025","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"crescimento_acumulado_periodo_equivalente"}';

    SET @regraFinal=N'{"indicadorId":23,"nome":"Participação da Rede Lotérica nos Negócios da CAIXA Loterias","tipoCalculo":"crescimento_rede_loterica_base_2025","tipoConsolidacao":"acumulado_periodo_equivalente","metaRecorrente":false,"unidadeMedida":"percentual","metaAnualValor":1.02,"parametrosCalculo":{"campoValor2026Mes":"arrecadacaoRedeLotericaMes2026","campoValor2026Acumulado":"arrecadacaoRedeLotericaAcumulada2026","campoBase2025PeriodoEquivalente":"arrecadacaoRedeLoterica2025PeriodoEquivalente","campoBase2025Acumulada":"arrecadacaoRedeLoterica2025Acumulada","campoResultadoDocumental":"resultadoDocumentalRedeLoterica","campoPercentualAtingidoOficial":"percentualAtingidoOficialRedeLoterica","campoTipoPosicao":"tipoPosicaoRedeLoterica","campoFonteResultado":"fonteResultadoRedeLoterica","campoEscalaResultadoDocumental":"escalaResultadoDocumentalRedeLoterica","metaTipo":"curva_indice_periodo_equivalente","metaIndice":1.02,"sentidoMeta":"quanto_maior_melhor","mesesFechamentoTrimestral":[3,6,9,12],"metasPorCompetencia":{"2026-01":1.005,"2026-02":1.005,"2026-03":1.005,"2026-04":1.01,"2026-05":1.01,"2026-06":1.01,"2026-07":1.015,"2026-08":1.015,"2026-09":1.015,"2026-10":1.02,"2026-11":1.02,"2026-12":1.02},"apresentacoesOficiaisTrimestrais":{"1TRI":{"metaTecnicaIndice":1.005,"resultadoTecnicoIndice":1.0057,"metaOficialReportada":0.005,"resultadoOficialReportado":0.0057,"percentualAtingidoOficialReportado":1.1386,"escalaResultadoDocumental":"incremento","situacao":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},"2TRI":{"metaTecnicaIndice":1.01,"resultadoTecnicoIndice":0.988,"metaOficialReportada":1.01,"resultadoOficialReportado":0.988,"percentualAtingidoOficialReportado":0.9784,"escalaResultadoDocumental":"indice","situacao":"Abaixo da meta","fonte":"Informe DILOT/GERIN nº 0056/2026"},"3TRI":{"metaTecnicaIndice":1.015,"resultadoTecnicoIndice":0.9816,"metaOficialReportada":1.015,"resultadoOficialReportado":0.9816,"percentualAtingidoOficialReportado":0.9671,"escalaResultadoDocumental":"indice","situacao":"Abaixo da meta","fonte":"Informe DILOT/GERIN nº 0078/2026"},"4TRI":{"metaTecnicaIndice":1.02,"resultadoTecnicoIndice":null,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"escalaResultadoDocumental":"indice","situacao":null,"fonte":null}}},"camposEntrada":[{"nome":"arrecadacaoRedeLoterica2025PeriodoEquivalente","rotulo":"Base 2025 - Rede Lotérica no período equivalente","tipo":"moeda","obrigatorio":false},{"nome":"arrecadacaoRedeLotericaMes2026","rotulo":"Arrecadação Rede Lotérica 2026 no mês","tipo":"moeda","obrigatorio":false},{"nome":"arrecadacaoRedeLotericaAcumulada2026","rotulo":"Arrecadação Rede Lotérica 2026 acumulada até a competência","tipo":"moeda","obrigatorio":false},{"nome":"resultadoDocumentalRedeLoterica","rotulo":"Resultado documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"percentualAtingidoOficialRedeLoterica","rotulo":"Atingimento oficial documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"tipoPosicaoRedeLoterica","rotulo":"Natureza da posição","tipo":"selecao","obrigatorio":false,"opcoes":[{"value":"","label":"Selecione..."},{"value":"fechamento_trimestral","label":"Fechamento trimestral"}]},{"nome":"fonteResultadoRedeLoterica","rotulo":"Fonte documental","tipo":"texto","obrigatorio":false},{"nome":"escalaResultadoDocumentalRedeLoterica","rotulo":"Escala do resultado documental","tipo":"selecao","obrigatorio":false,"opcoes":[{"value":"indice","label":"Índice"},{"value":"incremento","label":"Incremento"}]},{"nome":"observacaoArea","rotulo":"Observação da área","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"indiceEmRelacaoA2025","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"crescimento_acumulado_periodo_equivalente"}';
    IF ISJSON(@regraInicial)<>1 OR ISJSON(@regraFinal)<>1
        THROW 52917, 'Falha interna: JSON de regra inicial/final inválido.', 1;
    SET @regraInicialEstado=CASE WHEN @regraAntes=@regraInicial THEN 1 ELSE 0 END;
    SET @regraFinalEstado=CASE WHEN @regraAntes=@regraFinal THEN 1 ELSE 0 END;
    IF @regraInicialEstado=0 AND @regraFinalEstado=0
        THROW 52918, 'Pré-condição inválida: regra não corresponde exatamente ao estado inicial nem ao final.', 1;

    SET @estadoInicialIntegral=CASE WHEN @indicadorInicial=1 AND @lancamentosInicial=1
      AND @metasInicial=1 AND @regraInicialEstado=1 THEN 1 ELSE 0 END;
    SET @estadoFinalIntegral=CASE WHEN @indicadorFinal=1 AND @lancamentosFinal=1
      AND @metasFinal=1 AND @regraFinalEstado=1 THEN 1 ELSE 0 END;
    IF @estadoInicialIntegral=0 AND @estadoFinalIntegral=0
        THROW 52919, 'Pré-condição inválida: estado parcial; somente o estado inicial integral ou final integral é aceito.', 1;

    /* Snapshots integrais/protegidos imediatamente antes do DML. */
    SELECT * INTO #indicadoresOutrosAntes FROM dbo.indicadores WHERE id<>@indicadorId;
    SELECT * INTO #indicador23Antes FROM dbo.indicadores WHERE id=@indicadorId;
    SELECT * INTO #lancamentosOutrosAntes FROM dbo.lancamentos WHERE id NOT IN (SELECT id FROM @alvos);
    SELECT * INTO #lancamentos23Antes FROM dbo.lancamentos WHERE id IN (SELECT id FROM @alvos);
    SELECT * INTO #configuracoesOutrasAntes FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores');
    SELECT [key],value,type INTO #metasOutrasAntes FROM OPENJSON(@metasAntes)
      WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId;
    SELECT [key],value,type INTO #regrasOutrasAntes FROM OPENJSON(@regrasAntes)
      WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #usuariosAcessoAntes FROM dbo.usuarios_acesso;
    SELECT * INTO #usuariosValidacaoAntes FROM dbo.usuarios_validacao;
    SELECT * INTO #acessosLogAntes FROM dbo.acessos_log;

    SET @esperadoIndicador=CASE WHEN @estadoInicialIntegral=1 THEN 1 ELSE 0 END;
    SET @esperadoLancamentos=CASE WHEN @estadoInicialIntegral=1 THEN 12 ELSE 0 END;
    SET @esperadoConfiguracoes=CASE WHEN @estadoInicialIntegral=1 THEN 2 ELSE 0 END;

    IF @estadoInicialIntegral=1
    BEGIN
      UPDATE dbo.indicadores
      SET nome=@nomeFinal,tipo_consolidacao=N'acumulado_periodo_equivalente'
      WHERE id=@indicadorId AND nome=@nomeInicial AND tipo_consolidacao IS NULL;
      SET @linhasIndicador=@@ROWCOUNT;

      UPDATE l SET
        meta_referencia=CONVERT(NVARCHAR(100),a.metaFinal),
        resultado_calculado=CASE WHEN a.resultadoFinal IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoFinal) END,
        resultado_oficial=CASE WHEN a.resultadoFinal IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoFinal) END,
        percentual_atingido=CASE WHEN a.percentualFinal IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.percentualFinal) END,
        situacao=a.situacaoFinal,status=a.statusFinal,dados_entrada_json=a.dadosFinal
      FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.indicador_id=@indicadorId;
      SET @linhasLancamentos=@@ROWCOUNT;

      SET @metasNovo=@metasAntes;
      SET @metasNovo=JSON_MODIFY(@metasNovo,'$[147].metaMensal',CAST(1.0050 AS DECIMAL(10,4)));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'$[147].fonte',N'curva_indice_periodo_equivalente_2026');
      SET @metasNovo=JSON_MODIFY(@metasNovo,'$[148].metaMensal',CAST(1.0050 AS DECIMAL(10,4)));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'$[148].fonte',N'curva_indice_periodo_equivalente_2026');
      SET @metasNovo=JSON_MODIFY(@metasNovo,'$[149].metaMensal',CAST(1.0050 AS DECIMAL(10,4)));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'$[149].fonte',N'curva_indice_periodo_equivalente_2026');
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":214,"indicadorId":23,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":1.0100,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":215,"indicadorId":23,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":1.0100,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":216,"indicadorId":23,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":1.0100,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":217,"indicadorId":23,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":1.0150,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":218,"indicadorId":23,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":1.0150,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":219,"indicadorId":23,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":1.0150,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":220,"indicadorId":23,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":1.0200,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":221,"indicadorId":23,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":1.0200,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(N'{"id":222,"indicadorId":23,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":1.0200,"fonte":"curva_indice_periodo_equivalente_2026"}'));
      SET @regrasNovo=JSON_MODIFY(@regrasAntes,'$[22]',JSON_QUERY(@regraFinal));

      UPDATE dbo.configuracoes SET valor_json=@metasNovo
      WHERE chave=N'metas' AND valor_json=@metasAntes;
      SET @linhasConfiguracoes=@@ROWCOUNT;
      UPDATE dbo.configuracoes SET valor_json=@regrasNovo
      WHERE chave=N'regrasIndicadores' AND valor_json=@regrasAntes;
      SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;
    END;

    IF @linhasIndicador<>@esperadoIndicador OR @linhasLancamentos<>@esperadoLancamentos
       OR @linhasConfiguracoes<>@esperadoConfiguracoes
        THROW 52920, 'Validação falhou: quantidade física alterada divergiu; PASS inicial=1/12/2, PASS final=0/0/0.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND nome=@nomeFinal
      AND tipo_consolidacao=N'acumulado_periodo_equivalente')
        THROW 52921, 'Validação falhou: cadastro final do Indicador 23 inválido.', 1;

    /* PASS = 12 lançamentos finais; THROW = quantidade <> 12. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
        WHERE TRY_CONVERT(DECIMAL(10,4),l.meta_referencia)=a.metaFinal
          AND l.status=a.statusFinal
          AND ((a.resultadoFinal IS NULL AND l.resultado_calculado IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.resultado_calculado)=a.resultadoFinal)
          AND ((a.resultadoFinal IS NULL AND l.resultado_oficial IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.resultado_oficial)=a.resultadoFinal)
          AND ((a.percentualFinal IS NULL AND l.percentual_atingido IS NULL) OR TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)=a.percentualFinal)
          AND ((a.situacaoFinal IS NULL AND l.situacao IS NULL) OR l.situacao=a.situacaoFinal)
          AND l.dados_entrada_json=a.dadosFinal)<>12
        THROW 52922, 'Validação falhou: lançamentos finais; PASS=12 e THROW=quantidade<>12.', 1;

    /* PASS = 8 intermediários vazios; THROW = quantidade <> 8. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN
        (N'265',N'266',N'268',N'269',N'271',N'272',N'274',N'275')
        AND status=N'Não iniciado' AND resultado_calculado IS NULL AND resultado_oficial IS NULL
        AND percentual_atingido IS NULL AND situacao IS NULL
        AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}'))<>8
        THROW 52923, 'Validação falhou: meses intermediários; PASS=8 e THROW=quantidade<>8.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos l WHERE l.id=N'267'
      AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=1.0050
      AND TRY_CONVERT(DECIMAL(10,4),resultado_calculado)=1.0057
      AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=1.0057
      AND TRY_CONVERT(DECIMAL(38,18),percentual_atingido)=CAST(CAST(1.0057 AS DECIMAL(20,10))/CAST(1.0050 AS DECIMAL(20,10)) AS DECIMAL(38,18))
      AND situacao=N'Atingido' AND status=N'Em preenchimento'
      AND dados_entrada_json=N'{"resultadoDocumentalRedeLoterica":0.0057,"percentualAtingidoOficialRedeLoterica":1.1386,"tipoPosicaoRedeLoterica":"fechamento_trimestral","fonteResultadoRedeLoterica":"Informe DILOT/GERIN nº 0029/2026","escalaResultadoDocumentalRedeLoterica":"incremento"}'
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.resultadoDocumentalRedeLoterica'))=0.0057
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.percentualAtingidoOficialRedeLoterica'))=1.1386
      AND JSON_VALUE(dados_entrada_json,'$.escalaResultadoDocumentalRedeLoterica')=N'incremento')
        THROW 52924, 'Validação falhou: fechamento MAR/1TRI inválido.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'270'
      AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=1.0100
      AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.9880
      AND TRY_CONVERT(DECIMAL(38,18),percentual_atingido)=CAST(CAST(0.9880 AS DECIMAL(20,10))/CAST(1.0100 AS DECIMAL(20,10)) AS DECIMAL(38,18))
      AND situacao=N'Abaixo da meta' AND status=N'Em preenchimento'
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.percentualAtingidoOficialRedeLoterica'))=0.9784
      AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoRedeLoterica')=N'Informe DILOT/GERIN nº 0056/2026')
        THROW 52925, 'Validação falhou: fechamento JUN/2TRI inválido.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'273'
      AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=1.0150
      AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.9816
      AND TRY_CONVERT(DECIMAL(38,18),percentual_atingido)=CAST(CAST(0.9816 AS DECIMAL(20,10))/CAST(1.0150 AS DECIMAL(20,10)) AS DECIMAL(38,18))
      AND situacao=N'Abaixo da meta' AND status=N'Em preenchimento'
      AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(dados_entrada_json,'$.percentualAtingidoOficialRedeLoterica'))=0.9671
      AND JSON_VALUE(dados_entrada_json,'$.fonteResultadoRedeLoterica')=N'Informe DILOT/GERIN nº 0078/2026')
        THROW 52926, 'Validação falhou: fechamento SET/3TRI inválido.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'276'
      AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=1.0200 AND status=N'Não iniciado'
      AND resultado_calculado IS NULL AND resultado_oficial IS NULL
      AND percentual_atingido IS NULL AND situacao IS NULL AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}'))
        THROW 52927, 'Validação falhou: DEZ/4TRI não preservou ausência de resultado.', 1;

    IF EXISTS (SELECT 1 FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND ISJSON(dados_entrada_json)=1
      AND (JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLoterica2025') IS NOT NULL
        OR JSON_VALUE(dados_entrada_json,'$.arrecadacaoRedeLoterica2026') IS NOT NULL
        OR JSON_VALUE(dados_entrada_json,'$.metaTrimestral') IS NOT NULL))
        THROW 52928, 'Validação falhou: componentes financeiros ou metaTrimestral legados permaneceram ativos.', 1;

    SELECT @metasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regrasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM @metasEsperadas e INNER JOIN OPENJSON(@metasDepois) j
           ON TRY_CONVERT(INT,j.[key])=e.indice
           WHERE JSON_VALUE(j.value,'$.id')=e.id
             AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))=e.mes
             AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(j.value,'$.metaMensal'))=e.metaFinal
             AND JSON_VALUE(j.value,'$.fonte')=e.fonteFinal)<>12
        THROW 52929, 'Validação falhou: curva final; PASS=12 e THROW=quantidade<>12.', 1;

    IF JSON_QUERY(@regrasDepois,'$[22]')<>@regraFinal
       OR JSON_VALUE(@regrasDepois,'$[22].tipoCalculo')<>N'crescimento_rede_loterica_base_2025'
       OR JSON_VALUE(@regrasDepois,'$[22].tipoConsolidacao')<>N'acumulado_periodo_equivalente'
       OR JSON_VALUE(@regrasDepois,'$[22].parametrosCalculo.sentidoMeta')<>N'quanto_maior_melhor'
       OR JSON_QUERY(@regrasDepois,'$[22].parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
       OR JSON_VALUE(@regrasDepois,'$[22].parametrosCalculo.metaTrimestral') IS NOT NULL
       OR @regraFinal LIKE N'%"tipoCalculo":"incremento_rede_loterica_base_2025"%'
        THROW 52930, 'Validação falhou: regra final, fechamentos ou remoção do modelo legado inválidos.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id<>@indicadorId EXCEPT SELECT * FROM #indicadoresOutrosAntes)
       OR EXISTS (SELECT * FROM #indicadoresOutrosAntes EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
        THROW 52931, 'Validação falhou: outro indicador foi alterado.', 1;

    IF EXISTS (SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
      tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
      FROM dbo.indicadores WHERE id=@indicadorId
      EXCEPT SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
      tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at FROM #indicador23Antes)
       OR EXISTS (SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
      tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at FROM #indicador23Antes
      EXCEPT SELECT id,numero,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
      tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
      FROM dbo.indicadores WHERE id=@indicadorId)
        THROW 52932, 'Validação falhou: campo não autorizado do cadastro foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (SELECT id FROM @alvos) EXCEPT SELECT * FROM #lancamentosOutrosAntes)
       OR EXISTS (SELECT * FROM #lancamentosOutrosAntes EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (SELECT id FROM @alvos))
        THROW 52933, 'Validação falhou: lançamento fora dos IDs 265–276 foi alterado.', 1;

    IF EXISTS (SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN (SELECT id FROM @alvos)
      EXCEPT SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual FROM #lancamentos23Antes)
       OR EXISTS (SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual FROM #lancamentos23Antes
      EXCEPT SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN (SELECT id FROM @alvos))
        THROW 52934, 'Validação falhou: versão, usuário, datas ou campo protegido dos alvos foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores') EXCEPT SELECT * FROM #configuracoesOutrasAntes)
       OR EXISTS (SELECT * FROM #configuracoesOutrasAntes EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores'))
        THROW 52935, 'Validação falhou: configuração não relacionada foi alterada.', 1;

    IF EXISTS (SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
       EXCEPT SELECT [key],value,type FROM #metasOutrasAntes)
       OR EXISTS (SELECT [key],value,type FROM #metasOutrasAntes
       EXCEPT SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId)
        THROW 52936, 'Validação falhou: objeto de meta de outro indicador foi alterado.', 1;

    IF EXISTS (SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
       EXCEPT SELECT [key],value,type FROM #regrasOutrasAntes)
       OR EXISTS (SELECT [key],value,type FROM #regrasOutrasAntes
       EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId)
        THROW 52937, 'Validação falhou: regra de outro indicador foi alterada.', 1;

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
        THROW 52938, 'Validação falhou: governança global foi criada, removida ou alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.usuarios_acesso EXCEPT SELECT * FROM #usuariosAcessoAntes)
       OR EXISTS (SELECT * FROM #usuariosAcessoAntes EXCEPT SELECT * FROM dbo.usuarios_acesso)
       OR EXISTS (SELECT * FROM dbo.usuarios_validacao EXCEPT SELECT * FROM #usuariosValidacaoAntes)
       OR EXISTS (SELECT * FROM #usuariosValidacaoAntes EXCEPT SELECT * FROM dbo.usuarios_validacao)
       OR EXISTS (SELECT * FROM dbo.acessos_log EXCEPT SELECT * FROM #acessosLogAntes)
       OR EXISTS (SELECT * FROM #acessosLogAntes EXCEPT SELECT * FROM dbo.acessos_log)
        THROW 52939, 'Validação falhou: usuários, permissões ou logs de acesso foram alterados.', 1;

    COMMIT TRANSACTION;
    SELECT CASE WHEN @estadoFinalIntegral=1 THEN N'JÁ APLICADA — SEM DML' ELSE N'COMMIT' END AS transacao,
      @linhasIndicador AS linhas_indicadores,@linhasLancamentos AS linhas_lancamentos,
      @linhasConfiguracoes AS linhas_configuracoes,0 AS registros_criados,0 AS registros_removidos,
      @migration AS migration;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
