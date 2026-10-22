/*
  Correcao da responsabilidade organizacional dos indicadores 16 e 17.

  Escopo autorizado:
  - indicador 16: SULOT / DICOT -> GENOL / DICOT;
  - indicador 17: GENOL / DICOT -> SULOT / DICOT;
  - todos os lancamentos dos indicadores 16 e 17 acompanham a nova unidade;
  - indicadores 09 e 19 permanecem inalterados.

  Nenhum valor, meta, calculo, status, versao, data, usuario, configuracao,
  auditoria, homologacao, evidencia ou retificacao pode ser alterado.

  IMPORTANTE: preparar e revisar este arquivo nao autoriza sua execucao.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @linhasIndicador16 INT;
    DECLARE @linhasIndicador17 INT;
    DECLARE @linhasLancamentos16 INT;
    DECLARE @linhasLancamentos17 INT;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
        THROW 51201, 'Pre-condicao invalida: estrutura obrigatoria ausente.', 1;

    IF (SELECT COUNT(*) FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK) WHERE id IN (N'9', N'16', N'17', N'19')) <> 4
        THROW 51202, 'Pre-condicao invalida: os indicadores 09, 16, 17 e 19 devem existir uma unica vez.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'9'
          AND nome = N'Vendas com Meio de Pagamento PIX'
          AND unidade_apuradora = N'SULOT'
          AND diretoria_responsavel = N'DICOT'
    )
        THROW 51203, 'Pre-condicao invalida: indicador 09 diverge de SULOT / DICOT.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'16'
          AND nome = N'Apoio ao Desenvolvimento Socioambiental'
          AND unidade_apuradora = N'SULOT'
          AND diretoria_responsavel = N'DICOT'
    )
        THROW 51204, 'Pre-condicao invalida: indicador 16 diverge do estado diagnosticado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'17'
          AND nome = N'Repasse Social'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
    )
        THROW 51205, 'Pre-condicao invalida: indicador 17 diverge do estado diagnosticado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'19'
          AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
    )
        THROW 51206, 'Pre-condicao invalida: indicador 19 diverge de GENOL / DICOT.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK) WHERE indicador_id = N'16') <> 12
       OR EXISTS (
           SELECT 1 FROM dbo.lancamentos
           WHERE indicador_id = N'16'
             AND (ISNULL(unidade_apuradora, N'') <> N'SULOT'
                  OR ISNULL(diretoria_responsavel, N'') <> N'DICOT')
       )
        THROW 51207, 'Pre-condicao invalida: lancamentos do indicador 16 divergem das 12 linhas SULOT / DICOT diagnosticadas.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK) WHERE indicador_id = N'17') <> 12
       OR EXISTS (
           SELECT 1 FROM dbo.lancamentos
           WHERE indicador_id = N'17'
             AND (ISNULL(unidade_apuradora, N'') <> N'GENOL'
                  OR ISNULL(diretoria_responsavel, N'') <> N'DICOT')
       )
        THROW 51208, 'Pre-condicao invalida: lancamentos do indicador 17 divergem das 12 linhas GENOL / DICOT diagnosticadas.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE indicador_id IN (N'16', N'17')
          AND (dados_entrada_json LIKE N'%SULOT%'
               OR dados_entrada_json LIKE N'%GENOL%'
               OR dados_entrada_json LIKE N'%unidade_apuradora%'
               OR dados_entrada_json LIKE N'%unidadeApuradora%'
               OR dados_entrada_json LIKE N'%diretoria_responsavel%'
               OR dados_entrada_json LIKE N'%diretoriaResponsavel%')
    )
        THROW 51209, 'Pre-condicao invalida: dados_entrada_json contem responsabilidade organizacional e exige nova analise.', 1;

    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;

    UPDATE dbo.indicadores
    SET unidade_apuradora = N'GENOL',
        diretoria_responsavel = N'DICOT'
    WHERE id = N'16';
    SET @linhasIndicador16 = @@ROWCOUNT;

    UPDATE dbo.indicadores
    SET unidade_apuradora = N'SULOT',
        diretoria_responsavel = N'DICOT'
    WHERE id = N'17';
    SET @linhasIndicador17 = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET unidade_apuradora = N'GENOL',
        diretoria_responsavel = N'DICOT'
    WHERE indicador_id = N'16';
    SET @linhasLancamentos16 = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET unidade_apuradora = N'SULOT',
        diretoria_responsavel = N'DICOT'
    WHERE indicador_id = N'17';
    SET @linhasLancamentos17 = @@ROWCOUNT;

    IF @linhasIndicador16 <> 1 OR @linhasIndicador17 <> 1
        THROW 51210, 'Validacao falhou: a correcao deve atingir exatamente os indicadores 16 e 17.', 1;

    IF @linhasLancamentos16 <> 12 OR @linhasLancamentos17 <> 12
        THROW 51211, 'Validacao falhou: a correcao deve atingir exatamente 12 lancamentos de cada indicador.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'16' AND nome = N'Apoio ao Desenvolvimento Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'17' AND nome = N'Repasse Social'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
    )
        THROW 51212, 'Validacao falhou: responsabilidade final dos indicadores 16 e 17 incorreta.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'9' AND nome = N'Vendas com Meio de Pagamento PIX'
          AND unidade_apuradora = N'SULOT' AND diretoria_responsavel = N'DICOT'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'19' AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
    )
        THROW 51213, 'Validacao falhou: indicadores 09 ou 19 foram alterados.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE indicador_id = N'16'
          AND (ISNULL(unidade_apuradora, N'') <> N'GENOL'
               OR ISNULL(diretoria_responsavel, N'') <> N'DICOT')
    ) OR EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE indicador_id = N'17'
          AND (ISNULL(unidade_apuradora, N'') <> N'SULOT'
               OR ISNULL(diretoria_responsavel, N'') <> N'DICOT')
    )
        THROW 51214, 'Validacao falhou: existe lancamento dos indicadores 16 ou 17 fora do escopo final.', 1;

    IF EXISTS (
        SELECT * FROM #indicadoresAntes WHERE id NOT IN (N'16', N'17')
        EXCEPT
        SELECT * FROM dbo.indicadores WHERE id NOT IN (N'16', N'17')
    ) OR EXISTS (
        SELECT * FROM dbo.indicadores WHERE id NOT IN (N'16', N'17')
        EXCEPT
        SELECT * FROM #indicadoresAntes WHERE id NOT IN (N'16', N'17')
    )
        THROW 51215, 'Validacao falhou: indicador fora do escopo foi alterado.', 1;

    IF EXISTS (
        SELECT 1
        FROM #indicadoresAntes anterior
        JOIN dbo.indicadores atual ON atual.id = anterior.id
        WHERE anterior.id IN (N'16', N'17')
          AND EXISTS (
              SELECT anterior.id, anterior.numero, anterior.nome, anterior.plano, anterior.pilar,
                     anterior.periodicidade, anterior.unidade_medida, anterior.tipo_calculo,
                     anterior.tipo_consolidacao, anterior.meta_anual, anterior.formula_referencia,
                     anterior.observacao_acompanhamento, anterior.ativo, anterior.created_at, anterior.updated_at
              EXCEPT
              SELECT atual.id, atual.numero, atual.nome, atual.plano, atual.pilar,
                     atual.periodicidade, atual.unidade_medida, atual.tipo_calculo,
                     atual.tipo_consolidacao, atual.meta_anual, atual.formula_referencia,
                     atual.observacao_acompanhamento, atual.ativo, atual.created_at, atual.updated_at
          )
    )
        THROW 51216, 'Validacao falhou: atributo protegido dos indicadores 16 ou 17 foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM #lancamentosAntes WHERE indicador_id NOT IN (N'16', N'17')
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE indicador_id NOT IN (N'16', N'17')
    ) OR EXISTS (
        SELECT * FROM dbo.lancamentos WHERE indicador_id NOT IN (N'16', N'17')
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE indicador_id NOT IN (N'16', N'17')
    )
        THROW 51217, 'Validacao falhou: lancamento fora do escopo foi alterado.', 1;

    IF EXISTS (
        SELECT 1
        FROM #lancamentosAntes anterior
        JOIN dbo.lancamentos atual ON atual.id = anterior.id
        WHERE anterior.indicador_id IN (N'16', N'17')
          AND EXISTS (
              SELECT anterior.id, anterior.indicador_id, anterior.competencia, anterior.ano,
                     anterior.mes, anterior.trimestre, anterior.plano, anterior.pilar,
                     anterior.dados_entrada_json, anterior.resultado_calculado, anterior.resultado_oficial,
                     anterior.meta_referencia, anterior.percentual_atingido, anterior.situacao,
                     anterior.status, anterior.observacao_unidade, anterior.referencia_evidencia,
                     anterior.evidencia_id, anterior.versao_atual, anterior.usuario_responsavel,
                     anterior.created_at, anterior.updated_at
              EXCEPT
              SELECT atual.id, atual.indicador_id, atual.competencia, atual.ano,
                     atual.mes, atual.trimestre, atual.plano, atual.pilar,
                     atual.dados_entrada_json, atual.resultado_calculado, atual.resultado_oficial,
                     atual.meta_referencia, atual.percentual_atingido, atual.situacao,
                     atual.status, atual.observacao_unidade, atual.referencia_evidencia,
                     atual.evidencia_id, atual.versao_atual, atual.usuario_responsavel,
                     atual.created_at, atual.updated_at
          )
    )
        THROW 51218, 'Validacao falhou: valor, meta, calculo, status, versao, data ou usuario de lancamento foi alterado.', 1;

    IF EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
        THROW 51219, 'Validacao falhou: homologacao foi criada, alterada ou removida.', 1;

    IF EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
        THROW 51220, 'Validacao falhou: evidencia foi criada, alterada ou removida.', 1;

    IF EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
        THROW 51221, 'Validacao falhou: retificacao foi criada, alterada ou removida.', 1;

    IF EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
        THROW 51222, 'Validacao falhou: auditoria foi criada, alterada ou removida.', 1;

    IF EXISTS (SELECT * FROM #configuracoesAntes EXCEPT SELECT * FROM dbo.configuracoes)
       OR EXISTS (SELECT * FROM dbo.configuracoes EXCEPT SELECT * FROM #configuracoesAntes)
        THROW 51223, 'Validacao falhou: configuracao foi criada, alterada ou removida.', 1;

    IF EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
        THROW 51224, 'Validacao falhou: solicitacao de reabertura foi criada, alterada ou removida.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
