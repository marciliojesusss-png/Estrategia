/*
  Indicador 01 — Índice de Ofertas Personalizadas aos Clientes Ativos

  Escopo persistente exclusivo:
  - dbo.indicadores: ID 1, somente tipo_consolidacao;
  - dbo.lancamentos: IDs 3, 6 e 9, somente dados/resultados/situação/status;
  - dbo.configuracoes: chave regrasIndicadores, somente o objeto $[0].

  dbo.configuracoes/metas e todas as tabelas de governança são somente leitura.
  Compatibilidade: SQL Server 2016, compatibility level 130 e TSql130Parser.
  Precisão: componentes inteiros e razões calculadas com DECIMAL(38,18), sem ponto flutuante binário.
  Este arquivo foi preparado para execução controlada posterior; não o execute sem autorização.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 53101, 'Execute esta migration somente no banco Estrategia.', 1;

IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) <> 130
    THROW 53102, 'Compatibilidade inválida: o banco Estrategia deve estar no nível 130.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255)=N'20261025_006_indicador01_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100)=N'1';
    DECLARE @indicadorInicial BIT=0,@indicadorFinal BIT=0;
    DECLARE @lancamentosInicial BIT=0,@lancamentosFinal BIT=0;
    DECLARE @regraInicialEstado BIT=0,@regraFinalEstado BIT=0;
    DECLARE @estadoInicialIntegral BIT=0,@estadoFinalIntegral BIT=0;
    DECLARE @linhasIndicador INT=0,@linhasLancamentos INT=0,@linhasConfiguracoes INT=0;
    DECLARE @esperadoIndicador INT=0,@esperadoLancamentos INT=0,@esperadoConfiguracoes INT=0;
    DECLARE @metasAntes NVARCHAR(MAX),@metasDepois NVARCHAR(MAX);
    DECLARE @regrasAntes NVARCHAR(MAX),@regrasDepois NVARCHAR(MAX);
    DECLARE @regraAntes NVARCHAR(MAX),@regraInicial NVARCHAR(MAX),@regraFinal NVARCHAR(MAX);
    DECLARE @protegidoAntes NVARCHAR(MAX),@protegidoDepois NVARCHAR(MAX);
    DECLARE @quantidadesAntes NVARCHAR(MAX),@quantidadesDepois NVARCHAR(MAX);
    DECLARE @hashProtegidoAntes VARBINARY(32),@hashProtegidoDepois VARBINARY(32);
    DECLARE @alvosProtegidosAntes NVARCHAR(MAX),@alvosProtegidosDepois NVARCHAR(MAX);
    DECLARE @hashAlvosProtegidosAntes VARBINARY(32),@hashAlvosProtegidosDepois VARBINARY(32);

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
        THROW 53103, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF COL_LENGTH(N'dbo.indicadores',N'tipo_consolidacao') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'dados_entrada_json') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'resultado_calculado') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'resultado_oficial') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'percentual_atingido') IS NULL
       OR COL_LENGTH(N'dbo.lancamentos',N'versao_atual') IS NULL
       OR COL_LENGTH(N'dbo.configuracoes',N'valor_json') IS NULL
        THROW 53104, 'Pré-condição inválida: coluna obrigatória ausente.', 1;

    IF (SELECT COUNT(*) FROM dbo.indicadores WITH (UPDLOCK,HOLDLOCK) WHERE id=@indicadorId)<>1
       OR NOT EXISTS (
          SELECT 1 FROM dbo.indicadores
          WHERE id=@indicadorId AND numero=1
            AND nome=N'Índice de Ofertas Personalizadas aos Clientes Ativos'
            AND plano=N'PEI' AND pilar=N'Cliente no Centro'
            AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT'
            AND periodicidade=N'Trimestral' AND unidade_medida=N'percentual'
            AND tipo_calculo=N'percentual_direto' AND meta_anual=N'≥ 10%'
            AND formula_referencia=N'Clientes únicos com oferta personalizada / Base de clientes ativos identificáveis'
            AND observacao_acompanhamento IS NULL AND ativo=1
            AND created_at=N'2026-06-29T11:18:10+00:00'
            AND updated_at=N'2026-06-29T11:18:10+00:00'
       )
        THROW 53105, 'Pré-condição inválida: identidade do Indicador 01 divergiu.', 1;

    SET @indicadorInicial=CASE WHEN EXISTS (
      SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND tipo_consolidacao IS NULL
    ) THEN 1 ELSE 0 END;
    SET @indicadorFinal=CASE WHEN EXISTS (
      SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND tipo_consolidacao=N'ultima_posicao_trimestral'
    ) THEN 1 ELSE 0 END;
    IF @indicadorInicial=0 AND @indicadorFinal=0
        THROW 53106, 'Pré-condição inválida: cadastro não está no estado inicial nem no final reconhecido.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN
          (N'1',N'2',N'3',N'4',N'5',N'6',N'7',N'8',N'9',N'10',N'11',N'12')
          AND indicador_id=@indicadorId)<>12
       OR EXISTS (
          SELECT 1 FROM dbo.lancamentos WHERE indicador_id=@indicadorId
            AND (ano<>2026 OR mes<1 OR mes>12 OR TRY_CONVERT(INT,id)<>mes
              OR competencia<>CONCAT(N'2026-',RIGHT(CONCAT(N'0',mes),2))
              OR trimestre<>CONCAT(((mes-1)/3)+1,N'TRI/2026')
              OR plano<>N'PEI' OR pilar<>N'Cliente no Centro'
              OR unidade_apuradora<>N'SUCOL' OR diretoria_responsavel<>N'DICOT'
              OR TRY_CONVERT(DECIMAL(10,4),meta_referencia)<>CAST(0.10 AS DECIMAL(10,4)))
       )
        THROW 53107, 'Pré-condição inválida: IDs/competências/identidade/metas dos 12 lançamentos divergiram.', 1;

    /* JAN/FEV: proteção integral de dados e identidade transacional real. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE
        (id=N'1' AND indicador_id=@indicadorId AND competencia=N'2026-01' AND versao_atual=1
          AND dados_entrada_json=N'{"baseClientesAtivosCompetencia":2480050,"clientesUnicosComOfertaPersonalizadaCompetencia":636553}'
          AND resultado_calculado=N'0.256669' AND resultado_oficial=N'0.256669'
          AND meta_referencia=N'0.1' AND percentual_atingido=N'2.56669'
          AND situacao=N'Atingido' AND status=N'Homologado' AND observacao_unidade=N'teste'
          AND evidencia_id=N'evidencia-1' AND usuario_responsavel=N'sucol@caixaloterias.local'
          AND created_at=N'2026-06-27' AND updated_at=N'2026-08-27T14:28:03-03:00'
          AND referencia_evidencia=N'')
        OR
        (id=N'2' AND indicador_id=@indicadorId AND competencia=N'2026-02' AND versao_atual=1
          AND dados_entrada_json=N'{"baseClientesAtivosCompetencia":2574950,"clientesUnicosComOfertaPersonalizadaCompetencia":539249}'
          AND resultado_calculado=N'0.209421' AND resultado_oficial=N'0.209421'
          AND meta_referencia=N'0.1' AND percentual_atingido=N'2.09421'
          AND situacao=N'Atingido' AND status=N'Homologado' AND observacao_unidade=N'teste'
          AND evidencia_id=N'evidencia-2' AND usuario_responsavel=N'sucol@caixaloterias.local'
          AND created_at=N'2026-06-27' AND updated_at=N'2026-08-27T14:28:03-03:00'
          AND referencia_evidencia=N''))<>2
        THROW 53108, 'Pré-condição inválida: JAN/FEV divergiram da fotografia integral protegida.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes WHERE lancamento_id IN (N'1',N'2'))<>2
       OR NOT EXISTS (SELECT 1 FROM dbo.homologacoes WHERE id=N'22' AND lancamento_id=N'1' AND acao=N'registro' AND data_acao=N'2026-08-27T14:28:02-03:00')
       OR NOT EXISTS (SELECT 1 FROM dbo.homologacoes WHERE id=N'23' AND lancamento_id=N'2' AND acao=N'registro' AND data_acao=N'2026-08-27T14:28:02-03:00')
       OR (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id IN (N'1',N'2'))<>2
       OR NOT EXISTS (SELECT 1 FROM dbo.evidencias WHERE id=N'evidencia-1' AND lancamento_id=N'1' AND descricao=N'teste' AND usuario=N'sucol@caixaloterias.local' AND versao_lancamento=1)
       OR NOT EXISTS (SELECT 1 FROM dbo.evidencias WHERE id=N'evidencia-2' AND lancamento_id=N'2' AND descricao=N'teste' AND usuario=N'sucol@caixaloterias.local' AND versao_lancamento=1)
       OR (SELECT COUNT(*) FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id=N'1')<>5
       OR (SELECT COUNT(*) FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id=N'2')<>3
       OR (SELECT COUNT(*) FROM dbo.auditoria WHERE id IN (N'59',N'60',N'61',N'62',N'63',N'64',N'65',N'66'))<>8
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'1',N'2'))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'1',N'2'))
        THROW 53109, 'Pré-condição inválida: governança real de JAN/FEV divergiu.', 1;

    /* MAR é legado: status textual sem homologação/evidência/auditoria transacional. */
    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'3',N'6',N'9'))
        THROW 53110, 'Pré-condição inválida: MAR/JUN/SET possuem governança não autorizada para regularização automática.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE id IN (N'4',N'5',N'7',N'8',N'10',N'11',N'12')
        AND status=N'Não iniciado' AND dados_entrada_json=N'[]'
        AND resultado_calculado IS NULL AND resultado_oficial IS NULL
        AND percentual_atingido IS NULL AND situacao IS NULL
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel IS NULL
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1)<>7
        THROW 53111, 'Pré-condição inválida: competências intermediárias ou DEZ divergiram do estado vazio protegido.', 1;

    SET @lancamentosInicial=CASE WHEN
      EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'3' AND indicador_id=@indicadorId
        AND dados_entrada_json=N'{"baseClientesAtivosCompetencia":2773599,"clientesUnicosComOfertaPersonalizadaCompetencia":1241587}'
        AND resultado_calculado=N'0.447645' AND resultado_oficial=N'0.447645'
        AND percentual_atingido=N'4.47645' AND situacao=N'Atingido' AND status=N'Homologado'
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel IS NULL
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1)
      AND EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'6' AND indicador_id=@indicadorId
        AND dados_entrada_json=N'{"baseClientesAtivosCompetencia":3018556,"clientesUnicosComOfertaPersonalizadaCompetencia":2371981}'
        AND resultado_calculado=N'0.7858' AND resultado_oficial=N'0.7858'
        AND percentual_atingido=N'7.858' AND situacao=N'Atingido' AND status=N'Em preenchimento'
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel=N'UNIDADE-SUCOL'
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1)
      AND EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'9' AND indicador_id=@indicadorId
        AND dados_entrada_json=N'[]' AND resultado_calculado IS NULL AND resultado_oficial IS NULL
        AND percentual_atingido IS NULL AND situacao IS NULL AND status=N'Não iniciado'
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel IS NULL
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1)
      THEN 1 ELSE 0 END;

    DECLARE @marRazao DECIMAL(38,18)=CAST(CAST(1241587 AS DECIMAL(20,10))/CAST(2773599 AS DECIMAL(20,10)) AS DECIMAL(38,18));
    DECLARE @junRazao DECIMAL(38,18)=CAST(CAST(2371981 AS DECIMAL(20,10))/CAST(3018556 AS DECIMAL(20,10)) AS DECIMAL(38,18));
    DECLARE @marJson NVARCHAR(MAX)=N'{"baseClientesAtivosCompetencia":2773599,"clientesUnicosComOfertaPersonalizadaCompetencia":1241587,"resultadoDocumentalOfertasPersonalizadas":0.4476,"percentualAtingidoOficialOfertasPersonalizadas":4.4764,"tipoPosicaoOfertasPersonalizadas":"fechamento_trimestral","fonteResultadoOfertasPersonalizadas":"Informe DILOT/GERIN nº 0029/2026"}';
    DECLARE @junJson NVARCHAR(MAX)=N'{"baseClientesAtivosCompetencia":3018556,"clientesUnicosComOfertaPersonalizadaCompetencia":2371981,"resultadoDocumentalOfertasPersonalizadas":0.7858,"percentualAtingidoOficialOfertasPersonalizadas":7.858,"tipoPosicaoOfertasPersonalizadas":"fechamento_trimestral","fonteResultadoOfertasPersonalizadas":"Informe DILOT/GERIN nº 0056/2026"}';
    DECLARE @setJson NVARCHAR(MAX)=N'{"resultadoDocumentalOfertasPersonalizadas":0.8379,"percentualAtingidoOficialOfertasPersonalizadas":8.379,"tipoPosicaoOfertasPersonalizadas":"fechamento_trimestral","fonteResultadoOfertasPersonalizadas":"Informe DILOT/GERIN nº 0078/2026"}';

    SET @lancamentosFinal=CASE WHEN
      EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'3' AND indicador_id=@indicadorId
        AND dados_entrada_json=@marJson AND TRY_CONVERT(DECIMAL(38,18),resultado_calculado)=@marRazao
        AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.4476
        AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=4.4764
        AND situacao=N'Atingido' AND status=N'Em preenchimento'
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel IS NULL
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1)
      AND EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'6' AND indicador_id=@indicadorId
        AND dados_entrada_json=@junJson AND TRY_CONVERT(DECIMAL(38,18),resultado_calculado)=@junRazao
        AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.7858
        AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=7.8580
        AND situacao=N'Atingido' AND status=N'Em preenchimento'
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel=N'UNIDADE-SUCOL'
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1)
      AND EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'9' AND indicador_id=@indicadorId
        AND dados_entrada_json=@setJson AND resultado_calculado IS NULL
        AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.8379
        AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=8.3790
        AND situacao=N'Atingido' AND status=N'Em preenchimento'
        AND observacao_unidade=N'' AND evidencia_id IS NULL AND usuario_responsavel IS NULL
        AND created_at=N'2026-08-27T14:28:03-03:00' AND updated_at=N'2026-08-27T14:28:03-03:00'
        AND referencia_evidencia=N'' AND versao_atual=1
        AND JSON_VALUE(dados_entrada_json,'$.baseClientesAtivosCompetencia') IS NULL
        AND JSON_VALUE(dados_entrada_json,'$.clientesUnicosComOfertaPersonalizadaCompetencia') IS NULL)
      THEN 1 ELSE 0 END;
    IF @lancamentosInicial=0 AND @lancamentosFinal=0
        THROW 53112, 'Pré-condição inválida: MAR/JUN/SET não estão no estado inicial nem no final exato.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'metas')<>1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores')<>1
        THROW 53113, 'Pré-condição inválida: configurações metas/regrasIndicadores ausentes ou duplicadas.', 1;
    SELECT @metasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regrasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    IF ISJSON(@metasAntes)<>1 OR ISJSON(@regrasAntes)<>1
        THROW 53114, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId
            AND TRY_CONVERT(INT,JSON_VALUE(value,'$.ano'))=2026
            AND TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')) BETWEEN 1 AND 12
            AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(value,'$.metaMensal'))=0.1000)<>12
       OR EXISTS (SELECT JSON_VALUE(value,'$.mes') FROM OPENJSON(@metasAntes)
            WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId
            GROUP BY JSON_VALUE(value,'$.mes') HAVING COUNT(*)<>1)
        THROW 53115, 'Pré-condição inválida: metas do Indicador 01 não são exatamente 12 posições de 0,10.', 1;

    IF JSON_VALUE(@regrasAntes,'$[0].indicadorId')<>@indicadorId
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
        THROW 53116, 'Pré-condição inválida: regra única do Indicador 01 não está no índice literal $[0].', 1;
    SELECT @regraAntes=value FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,[key])=0;

    SET @regraInicial=N'{"indicadorId":1,"nome":"Índice de Ofertas Personalizadas aos Clientes Ativos","tipoCalculo":"percentual_direto","tipoConsolidacao":"acumulado_por_competencia","metaRecorrente":true,"unidadeMedida":"percentual","metaAnualValor":0.1,"parametrosCalculo":{"numeradorCampo":"clientesUnicosComOfertaPersonalizadaCompetencia","denominadorCampo":"baseClientesAtivosCompetencia","metaReferencia":0.1,"metaTipo":"fixa","sentidoMeta":"quanto_maior_melhor","validarNumeradorAteDenominador":false},"camposEntrada":[{"nome":"baseClientesAtivosCompetencia","rotulo":"Base de clientes ativos identificáveis da competência","tipo":"numero","obrigatorio":true},{"nome":"clientesUnicosComOfertaPersonalizadaCompetencia","rotulo":"Clientes únicos com oferta personalizada até a competência","tipo":"numero","obrigatorio":true}],"campoResultadoPrincipal":"resultadoMensal","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"ultima_posicao_homologada"}';
    SET @regraFinal=N'{"indicadorId":1,"nome":"Índice de Ofertas Personalizadas aos Clientes Ativos","tipoCalculo":"percentual_direto","tipoConsolidacao":"ultima_posicao_trimestral","metaRecorrente":true,"unidadeMedida":"percentual","metaAnualValor":0.1,"parametrosCalculo":{"numeradorCampo":"clientesUnicosComOfertaPersonalizadaCompetencia","denominadorCampo":"baseClientesAtivosCompetencia","metaReferencia":0.1,"metaTipo":"fixa","sentidoMeta":"quanto_maior_melhor","validarNumeradorAteDenominador":false,"mesesFechamentoTrimestral":[3,6,9,12],"permiteAcompanhamentoMensal":true,"campoResultadoDocumental":"resultadoDocumentalOfertasPersonalizadas","campoPercentualAtingidoOficial":"percentualAtingidoOficialOfertasPersonalizadas","campoTipoPosicao":"tipoPosicaoOfertasPersonalizadas","campoFonteResultado":"fonteResultadoOfertasPersonalizadas","apresentacoesOficiaisTrimestrais":{"1TRI/2026":{"metaOficialReportada":0.1,"resultadoOficialReportado":0.4476,"percentualAtingidoOficialReportado":4.4764,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},"2TRI/2026":{"metaOficialReportada":0.1,"resultadoOficialReportado":0.7858,"percentualAtingidoOficialReportado":7.858,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0056/2026"},"3TRI/2026":{"metaOficialReportada":0.1,"resultadoOficialReportado":0.8379,"percentualAtingidoOficialReportado":8.379,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0078/2026"},"4TRI/2026":{"metaOficialReportada":0.1,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":null,"fonte":null}}},"camposEntrada":[{"nome":"baseClientesAtivosCompetencia","rotulo":"Base de clientes ativos identificáveis da competência","tipo":"inteiro","obrigatorio":false},{"nome":"clientesUnicosComOfertaPersonalizadaCompetencia","rotulo":"Clientes únicos com oferta personalizada até a competência","tipo":"inteiro","obrigatorio":false},{"nome":"resultadoDocumentalOfertasPersonalizadas","rotulo":"Resultado oficial/documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"percentualAtingidoOficialOfertasPersonalizadas","rotulo":"Atingimento oficial documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"tipoPosicaoOfertasPersonalizadas","rotulo":"Natureza da posição","tipo":"selecao","obrigatorio":false,"opcoes":[{"value":"","label":"Selecione..."},{"value":"acompanhamento","label":"Acompanhamento"},{"value":"fechamento_trimestral","label":"Fechamento trimestral"}]},{"nome":"fonteResultadoOfertasPersonalizadas","rotulo":"Fonte documental","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"resultadoMensal","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"ultima_posicao_fechamento_homologada","exigirHomologacaoTransacionalVersaoAtual":true}';
    IF ISJSON(@regraInicial)<>1 OR ISJSON(@regraFinal)<>1
        THROW 53117, 'Falha interna: JSON de regra inicial/final inválido.', 1;
    SET @regraInicialEstado=CASE WHEN @regraAntes=@regraInicial THEN 1 ELSE 0 END;
    SET @regraFinalEstado=CASE WHEN @regraAntes=@regraFinal THEN 1 ELSE 0 END;
    IF @regraInicialEstado=0 AND @regraFinalEstado=0
        THROW 53118, 'Pré-condição inválida: regra não corresponde exatamente ao estado inicial nem ao final.', 1;

    SET @estadoInicialIntegral=CASE WHEN @indicadorInicial=1 AND @lancamentosInicial=1 AND @regraInicialEstado=1 THEN 1 ELSE 0 END;
    SET @estadoFinalIntegral=CASE WHEN @indicadorFinal=1 AND @lancamentosFinal=1 AND @regraFinalEstado=1 THEN 1 ELSE 0 END;
    IF @estadoInicialIntegral=0 AND @estadoFinalIntegral=0
        THROW 53119, 'Pré-condição inválida: estado parcial; somente o estado inicial integral ou final integral é aceito.', 1;

    /* Snapshot por quantidade + SHA-256 de tudo que não pode mudar. */
    SET @quantidadesAntes=(SELECT
      (SELECT COUNT(*) FROM dbo.indicadores WHERE id<>@indicadorId) AS indicadores_outros,
      (SELECT COUNT(*) FROM dbo.lancamentos WHERE id NOT IN (N'3',N'6',N'9')) AS lancamentos_protegidos,
      (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores')) AS configuracoes_outras,
      (SELECT COUNT(*) FROM dbo.homologacoes) AS homologacoes,
      (SELECT COUNT(*) FROM dbo.evidencias) AS evidencias,
      (SELECT COUNT(*) FROM dbo.auditoria) AS auditoria,
      (SELECT COUNT(*) FROM dbo.retificacoes) AS retificacoes,
      (SELECT COUNT(*) FROM dbo.solicitacoes_reabertura) AS reaberturas,
      (SELECT COUNT(*) FROM dbo.usuarios_acesso) AS usuarios_acesso,
      (SELECT COUNT(*) FROM dbo.usuarios_validacao) AS usuarios_validacao,
      (SELECT COUNT(*) FROM dbo.acessos_log) AS acessos_log
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @protegidoAntes=(SELECT
      JSON_QUERY((SELECT * FROM dbo.indicadores WHERE id<>@indicadorId ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicadores_outros,
      JSON_QUERY((SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'3',N'6',N'9') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos_protegidos,
      JSON_QUERY((SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores') ORDER BY chave FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes_outras,
      JSON_QUERY(@metasAntes) AS metas_integrais,
      JSON_QUERY((SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId ORDER BY TRY_CONVERT(INT,[key]) FOR JSON PATH)) AS regras_outros,
      JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
      JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
      JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
      JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
      JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas,
      JSON_QUERY((SELECT * FROM dbo.usuarios_acesso ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS usuarios_acesso,
      JSON_QUERY((SELECT * FROM dbo.usuarios_validacao ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS usuarios_validacao,
      JSON_QUERY((SELECT * FROM dbo.acessos_log ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS acessos_log
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @hashProtegidoAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@protegidoAntes));

    SET @alvosProtegidosAntes=(SELECT
      JSON_QUERY((SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
        unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id=@indicadorId FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicador,
      JSON_QUERY((SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
        meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE id IN (N'3',N'6',N'9') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos,
      JSON_QUERY((SELECT chave,updated_at FROM dbo.configuracoes WHERE chave=N'regrasIndicadores' FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracao
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @hashAlvosProtegidosAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@alvosProtegidosAntes));

    SET @esperadoIndicador=CASE WHEN @estadoInicialIntegral=1 THEN 1 ELSE 0 END;
    SET @esperadoLancamentos=CASE WHEN @estadoInicialIntegral=1 THEN 3 ELSE 0 END;
    SET @esperadoConfiguracoes=CASE WHEN @estadoInicialIntegral=1 THEN 1 ELSE 0 END;

    IF @estadoInicialIntegral=1
    BEGIN
      UPDATE dbo.indicadores
      SET tipo_consolidacao=N'ultima_posicao_trimestral'
      WHERE id=@indicadorId AND tipo_consolidacao IS NULL;
      SET @linhasIndicador=@@ROWCOUNT;

      DECLARE @alvos TABLE (
        id NVARCHAR(100) PRIMARY KEY,
        dados NVARCHAR(MAX) NOT NULL,
        resultadoCalculado DECIMAL(38,18) NULL,
        resultadoOficial DECIMAL(38,18) NOT NULL,
        percentualOficial DECIMAL(38,18) NOT NULL,
        situacao NVARCHAR(100) NOT NULL,
        statusNovo NVARCHAR(100) NOT NULL
      );
      INSERT INTO @alvos VALUES
        (N'3',@marJson,@marRazao,CAST(0.4476 AS DECIMAL(38,18)),CAST(4.4764 AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento'),
        (N'6',@junJson,@junRazao,CAST(0.7858 AS DECIMAL(38,18)),CAST(7.8580 AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento'),
        (N'9',@setJson,NULL,CAST(0.8379 AS DECIMAL(38,18)),CAST(8.3790 AS DECIMAL(38,18)),N'Atingido',N'Em preenchimento');

      UPDATE l SET
        dados_entrada_json=a.dados,
        resultado_calculado=CASE WHEN a.resultadoCalculado IS NULL THEN NULL ELSE CONVERT(NVARCHAR(100),a.resultadoCalculado) END,
        resultado_oficial=CONVERT(NVARCHAR(100),a.resultadoOficial),
        percentual_atingido=CONVERT(NVARCHAR(100),a.percentualOficial),
        situacao=a.situacao,
        status=a.statusNovo
      FROM dbo.lancamentos l INNER JOIN @alvos a ON a.id=l.id
      WHERE l.indicador_id=@indicadorId;
      SET @linhasLancamentos=@@ROWCOUNT;

      SET @regrasDepois=JSON_MODIFY(@regrasAntes,'$[0]',JSON_QUERY(@regraFinal));
      UPDATE dbo.configuracoes SET valor_json=@regrasDepois
      WHERE chave=N'regrasIndicadores' AND valor_json=@regrasAntes;
      SET @linhasConfiguracoes=@@ROWCOUNT;
    END;

    IF @linhasIndicador<>@esperadoIndicador OR @linhasLancamentos<>@esperadoLancamentos
       OR @linhasConfiguracoes<>@esperadoConfiguracoes
        THROW 53120, 'Validação falhou: quantidade física alterada divergiu; PASS inicial=1/3/1, PASS final=0/0/0.', 1;

    SELECT @metasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
    SELECT @regrasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND tipo_consolidacao=N'ultima_posicao_trimestral')
        THROW 53121, 'Pós-condição inválida: tipo de consolidação final do Indicador 01.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'3' AND status=N'Em preenchimento'
      AND TRY_CONVERT(DECIMAL(38,18),resultado_calculado)=@marRazao
      AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.4476
      AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=4.4764
      AND dados_entrada_json=@marJson AND situacao=N'Atingido')
        THROW 53122, 'Pós-condição inválida: MAR técnico/documental/status.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'6' AND status=N'Em preenchimento'
      AND TRY_CONVERT(DECIMAL(38,18),resultado_calculado)=@junRazao
      AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.7858
      AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=7.8580
      AND dados_entrada_json=@junJson AND situacao=N'Atingido')
        THROW 53123, 'Pós-condição inválida: JUN técnico/documental/status.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'9' AND status=N'Em preenchimento'
      AND resultado_calculado IS NULL
      AND TRY_CONVERT(DECIMAL(10,4),resultado_oficial)=0.8379
      AND TRY_CONVERT(DECIMAL(10,4),percentual_atingido)=8.3790
      AND dados_entrada_json=@setJson AND situacao=N'Atingido'
      AND JSON_VALUE(dados_entrada_json,'$.baseClientesAtivosCompetencia') IS NULL
      AND JSON_VALUE(dados_entrada_json,'$.clientesUnicosComOfertaPersonalizadaCompetencia') IS NULL)
        THROW 53124, 'Pós-condição inválida: SET documental ou componentes fictícios.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'12' AND TRY_CONVERT(DECIMAL(10,4),meta_referencia)=0.1000
      AND status=N'Não iniciado' AND dados_entrada_json=N'[]'
      AND resultado_calculado IS NULL AND resultado_oficial IS NULL
      AND percentual_atingido IS NULL AND situacao IS NULL)
        THROW 53125, 'Pós-condição inválida: DEZ/4TRI não permaneceu vazio.', 1;

    IF @metasDepois<>@metasAntes
       OR (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId
           AND TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(value,'$.metaMensal'))=0.1000)<>12
        THROW 53126, 'Proteção violada: configuração metas foi alterada.', 1;

    IF JSON_QUERY(@regrasDepois,'$[0]')<>@regraFinal
       OR JSON_VALUE(@regrasDepois,'$[0].tipoCalculo')<>N'percentual_direto'
       OR JSON_VALUE(@regrasDepois,'$[0].tipoConsolidacao')<>N'ultima_posicao_trimestral'
       OR TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(@regrasDepois,'$[0].metaAnualValor'))<>0.1000
       OR TRY_CONVERT(DECIMAL(10,4),JSON_VALUE(@regrasDepois,'$[0].parametrosCalculo.metaReferencia'))<>0.1000
       OR JSON_VALUE(@regrasDepois,'$[0].parametrosCalculo.sentidoMeta')<>N'quanto_maior_melhor'
       OR JSON_QUERY(@regrasDepois,'$[0].parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
        THROW 53127, 'Pós-condição inválida: regra final do Indicador 01.', 1;

    SET @quantidadesDepois=(SELECT
      (SELECT COUNT(*) FROM dbo.indicadores WHERE id<>@indicadorId) AS indicadores_outros,
      (SELECT COUNT(*) FROM dbo.lancamentos WHERE id NOT IN (N'3',N'6',N'9')) AS lancamentos_protegidos,
      (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores')) AS configuracoes_outras,
      (SELECT COUNT(*) FROM dbo.homologacoes) AS homologacoes,
      (SELECT COUNT(*) FROM dbo.evidencias) AS evidencias,
      (SELECT COUNT(*) FROM dbo.auditoria) AS auditoria,
      (SELECT COUNT(*) FROM dbo.retificacoes) AS retificacoes,
      (SELECT COUNT(*) FROM dbo.solicitacoes_reabertura) AS reaberturas,
      (SELECT COUNT(*) FROM dbo.usuarios_acesso) AS usuarios_acesso,
      (SELECT COUNT(*) FROM dbo.usuarios_validacao) AS usuarios_validacao,
      (SELECT COUNT(*) FROM dbo.acessos_log) AS acessos_log
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @protegidoDepois=(SELECT
      JSON_QUERY((SELECT * FROM dbo.indicadores WHERE id<>@indicadorId ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicadores_outros,
      JSON_QUERY((SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'3',N'6',N'9') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos_protegidos,
      JSON_QUERY((SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'metas',N'regrasIndicadores') ORDER BY chave FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes_outras,
      JSON_QUERY(@metasDepois) AS metas_integrais,
      JSON_QUERY((SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId ORDER BY TRY_CONVERT(INT,[key]) FOR JSON PATH)) AS regras_outros,
      JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
      JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
      JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
      JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
      JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas,
      JSON_QUERY((SELECT * FROM dbo.usuarios_acesso ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS usuarios_acesso,
      JSON_QUERY((SELECT * FROM dbo.usuarios_validacao ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS usuarios_validacao,
      JSON_QUERY((SELECT * FROM dbo.acessos_log ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS acessos_log
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @hashProtegidoDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@protegidoDepois));
    IF @quantidadesAntes<>@quantidadesDepois OR @hashProtegidoAntes<>@hashProtegidoDepois OR @protegidoAntes<>@protegidoDepois
        THROW 53128, 'Proteção violada: quantidade/hash/conteúdo de dados protegidos divergiu.', 1;

    SET @alvosProtegidosDepois=(SELECT
      JSON_QUERY((SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
        unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id=@indicadorId FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicador,
      JSON_QUERY((SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
        meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE id IN (N'3',N'6',N'9') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos,
      JSON_QUERY((SELECT chave,updated_at FROM dbo.configuracoes WHERE chave=N'regrasIndicadores' FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracao
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @hashAlvosProtegidosDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@alvosProtegidosDepois));
    IF @hashAlvosProtegidosAntes<>@hashAlvosProtegidosDepois OR @alvosProtegidosAntes<>@alvosProtegidosDepois
        THROW 53129, 'Proteção violada: versão, usuário, datas, meta ou outro campo não autorizado dos alvos divergiu.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'3',N'6',N'9'))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'3',N'6',N'9'))
        THROW 53130, 'Pós-condição inválida: governança artificial foi criada.', 1;

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
