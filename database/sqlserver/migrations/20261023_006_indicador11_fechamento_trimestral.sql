/*
  Indicador 11 — validação da separação entre acompanhamento mensal e fechamento trimestral.

  Fonte mensal soberana: 16.10(3).xlsx.
  Fechamentos oficiais: Informes DILOT/GERIN 0029, 0056 e 0078/2026.

  Decisão de preservação:
  - a classificação acompanhamento/fechamento é derivada de [3,6,9,12] pelo código;
  - os valores históricos persistidos não são reescritos para corrigir apresentação;
  - a memória da planilha permanece no bootstrap/camada de apresentação;
  - esta migration é deliberadamente SEM DML persistente: valida e preserva o estado.

  IMPORTANTE: este arquivo deve ser revisado e autorizado antes da execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52301, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255) = N'20261023_006_indicador11_fechamento_trimestral.sql';
    DECLARE @indicadorId NVARCHAR(100) = N'11';

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 52302, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id=@indicadorId
          AND numero=11
          AND nome=N'Ampliar a Capacidade de Desenvolvimento de Soluções de TIC'
          AND unidade_apuradora=N'SUCOL'
          AND diretoria_responsavel=N'DICOT'
          AND plano=N'PN'
          AND pilar=N'Tecnologia e Inovação'
          AND periodicidade=N'Não especificada'
          AND tipo_calculo=N'marco_projeto_percentual'
          AND tipo_consolidacao=N'ultima_posicao_trimestral'
          AND unidade_medida=N'percentual'
          AND meta_anual=N'Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026.'
    )
        THROW 52303, 'Pré-condição inválida: cadastro do Indicador 11 divergiu.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=N'9' AND unidade_apuradora=N'SULOT' AND diretoria_responsavel=N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=N'10' AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=N'16' AND unidade_apuradora=N'GENOL' AND diretoria_responsavel=N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=N'17' AND unidade_apuradora=N'SULOT' AND diretoria_responsavel=N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=N'19' AND unidade_apuradora=N'GENOL' AND diretoria_responsavel=N'DICOT')
       OR NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=N'20' AND unidade_apuradora=N'SUCOL' AND diretoria_responsavel=N'DICOT')
        THROW 52304, 'Pré-condição inválida: indicador protegido divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id=@indicadorId)<>12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND id IN
          (N'121',N'122',N'123',N'124',N'125',N'126',N'127',N'128',N'129',N'130',N'131',N'132'))<>12
       OR EXISTS (
          SELECT 1 FROM dbo.lancamentos
          WHERE indicador_id=@indicadorId
            AND (ano<>2026 OR mes<1 OR mes>12 OR id<>CONVERT(NVARCHAR(100),120+mes)
                 OR ISJSON(dados_entrada_json)<>1 OR versao_atual<>1)
       )
        THROW 52305, 'Pré-condição inválida: lançamentos 121–132 não estão íntegros.', 1;

    /* JAN/FEV: o bruto legado 35%/0%/0%/Abaixo da meta permanece intocado. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'121',N'122') AND indicador_id=@indicadorId
          AND status=N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.35
          AND TRY_CONVERT(DECIMAL(19,6),resultado_calculado)=0
          AND TRY_CONVERT(DECIMAL(19,6),resultado_oficial)=0
          AND TRY_CONVERT(DECIMAL(19,6),percentual_atingido)=0
          AND situacao=N'Abaixo da meta')<>2
        THROW 52306, 'Pré-condição inválida: JAN/FEV divergiram do legado preservado.', 1;

    /* MAR: fechamento oficial do 1TRI preservado literalmente. */
    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos
        WHERE id=N'123' AND indicador_id=@indicadorId AND status=N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.35
          AND TRY_CONVERT(DECIMAL(19,6),resultado_calculado)=0.35
          AND TRY_CONVERT(DECIMAL(19,6),resultado_oficial)=0.35
          AND TRY_CONVERT(DECIMAL(19,6),percentual_atingido)=1
          AND situacao=N'Atingido')
        THROW 52307, 'Pré-condição inválida: fechamento de MAR divergiu.', 1;

    /* ABR/MAI: dados ainda não iniciados; interpretação de acompanhamento fica no código. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'124',N'125') AND indicador_id=@indicadorId
          AND status=N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.70
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao IS NULL)<>2
        THROW 52308, 'Pré-condição inválida: ABR/MAI divergiram do legado esperado.', 1;

    /* JUN: fechamento oficial do 2TRI já correto; nenhuma regravação. */
    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos
        WHERE id=N'126' AND indicador_id=@indicadorId AND status=N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.70
          AND TRY_CONVERT(DECIMAL(19,6),resultado_calculado)=0.35
          AND TRY_CONVERT(DECIMAL(19,6),resultado_oficial)=0.35
          AND TRY_CONVERT(DECIMAL(19,6),percentual_atingido)=0.50
          AND situacao=N'Abaixo da meta'
          AND observacao_unidade LIKE N'%23 profissionais%')
        THROW 52309, 'Pré-condição inválida: fechamento de JUN divergiu.', 1;

    /* JUL: acompanhamento qualitativo preservado como veio da migration 005. */
    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos
        WHERE id=N'127' AND indicador_id=@indicadorId AND status=N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.85
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao=N'Em acompanhamento')
        THROW 52310, 'Pré-condição inválida: JUL divergiu do acompanhamento legado.', 1;

    /* AGO: valores brutos são preservados; a camada oficial os ignora por não ser fechamento. */
    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos
        WHERE id=N'128' AND indicador_id=@indicadorId AND status=N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.85
          AND TRY_CONVERT(DECIMAL(19,6),resultado_calculado)=1
          AND TRY_CONVERT(DECIMAL(19,6),resultado_oficial)=1
          AND ABS(TRY_CONVERT(DECIMAL(38,18),percentual_atingido)-CONVERT(DECIMAL(38,18),1.176470588235294118))<0.000000000000000001
          AND situacao=N'Em acompanhamento'
          AND JSON_VALUE(dados_entrada_json,'$.eventoCapacidadeTicId')=N'os-25173021-spassu-2026'
          AND JSON_VALUE(dados_entrada_json,'$.numeroOrdemServicoTIC')=N'25173021'
          AND JSON_VALUE(dados_entrada_json,'$.dataAberturaOrdemServicoTIC')=N'2026-06-10'
          AND JSON_VALUE(dados_entrada_json,'$.dataConclusaoOrdemServicoTIC')=N'2026-08-14'
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.quantidadeProfissionaisAdicionaisTIC'))=18
          AND JSON_VALUE(dados_entrada_json,'$.fabricaSoftwareTIC')=N'Spassu'
          AND JSON_VALUE(dados_entrada_json,'$.descricaoAndamentoTIC') LIKE N'%Nova Plataforma/SIPLX%')
        THROW 52311, 'Pré-condição inválida: AGO ou o evento OS 25173021 divergiram.', 1;

    /* SET: fechamento oficial do 3TRI preservado. */
    IF NOT EXISTS (SELECT 1 FROM dbo.lancamentos
        WHERE id=N'129' AND indicador_id=@indicadorId AND status=N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.85
          AND TRY_CONVERT(DECIMAL(19,6),resultado_calculado)=1
          AND TRY_CONVERT(DECIMAL(19,6),resultado_oficial)=1
          AND ABS(TRY_CONVERT(DECIMAL(38,18),percentual_atingido)-CONVERT(DECIMAL(38,18),1.176470588235294118))<0.000000000000000001
          AND situacao=N'Atingido'
          AND JSON_VALUE(dados_entrada_json,'$.eventoCapacidadeTicId')=N'os-25173021-spassu-2026')
        THROW 52312, 'Pré-condição inválida: fechamento de SET divergiu.', 1;

    /* OUT/NOV e DEZ permanecem exatamente como posições futuras já persistidas. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'130',N'131',N'132') AND indicador_id=@indicadorId
          AND status=N'Não iniciado'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=1
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL AND situacao IS NULL)<>3
        THROW 52313, 'Pré-condição inválida: OUT–DEZ divergiram do estado futuro esperado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.configuracoes c CROSS APPLY OPENJSON(c.valor_json) j
        WHERE c.chave=N'regrasIndicadores'
          AND JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
          AND JSON_VALUE(j.value,'$.tipoCalculo')=N'marco_projeto_percentual'
          AND JSON_VALUE(j.value,'$.tipoConsolidacao')=N'ultima_posicao_trimestral'
          AND JSON_QUERY(j.value,'$.parametrosCalculo.mesesFechamentoTrimestral')=N'[3,6,9,12]'
          AND TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(j.value,'$.parametrosCalculo.curvaTrimestralPercentual."1TRI/2026".metaPercentual'))=0.35
          AND TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(j.value,'$.parametrosCalculo.curvaTrimestralPercentual."2TRI/2026".metaPercentual'))=0.70
          AND TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(j.value,'$.parametrosCalculo.curvaTrimestralPercentual."3TRI/2026".metaPercentual'))=0.85
          AND TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(j.value,'$.parametrosCalculo.curvaTrimestralPercentual."4TRI/2026".metaPercentual'))=1
    )
        THROW 52314, 'Pré-condição inválida: regra trimestral vigente divergiu.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id=@indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id=@indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade_id=@indicadorId OR entidade_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id=@indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id=@indicadorId))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE indicador_id=@indicadorId OR lancamento_id IN (SELECT id FROM dbo.lancamentos WHERE indicador_id=@indicadorId))
        THROW 52315, 'Pré-condição inválida: governança do Indicador 11 mudou.', 1;

    /* Proteção integral: uma migration sem DML deve deixar todas as tabelas idênticas. */
    IF EXISTS (SELECT * FROM dbo.indicadores EXCEPT SELECT * FROM #indicadoresAntes)
       OR EXISTS (SELECT * FROM #indicadoresAntes EXCEPT SELECT * FROM dbo.indicadores)
       OR EXISTS (SELECT * FROM dbo.lancamentos EXCEPT SELECT * FROM #lancamentosAntes)
       OR EXISTS (SELECT * FROM #lancamentosAntes EXCEPT SELECT * FROM dbo.lancamentos)
       OR EXISTS (SELECT * FROM dbo.configuracoes EXCEPT SELECT * FROM #configuracoesAntes)
       OR EXISTS (SELECT * FROM #configuracoesAntes EXCEPT SELECT * FROM dbo.configuracoes)
       OR EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
       OR EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
        THROW 52316, 'Validação falhou: a execução alteraria dados persistidos.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS transacao,@migration AS migration,
           0 AS indicadores_alterados,0 AS lancamentos_alterados,0 AS configuracoes_alteradas,
           0 AS registros_criados,0 AS registros_removidos;

    /* Comparação lógica pré/pós solicitada para os registros de proteção especial. */
    SELECT a.id,N'IDÊNTICO' AS comparacao_pre_pos,
           N'Comparação integral validada por EXCEPT entre snapshot e tabela final' AS criterio
    FROM #lancamentosAntes a
    INNER JOIN dbo.lancamentos d ON d.id=a.id
    WHERE a.id IN (N'121',N'122',N'123',N'126',N'130',N'131',N'132')
    ORDER BY a.id;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
