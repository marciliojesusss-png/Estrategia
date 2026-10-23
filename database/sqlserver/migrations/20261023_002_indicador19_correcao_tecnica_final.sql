/*
  Indicador 19 - Incentivo Socioambiental
  Correção técnica final, exclusiva e transacional:
  - explicita a consolidação como valor acumulado;
  - completa a configuração genérica de metas de abril a dezembro/2026;
  - padroniza somente o nome e o identificador lógico documental de julho a setembro.

  Não altera valores financeiros, percentuais, situações, status, governança ou o Indicador 16.
  IMPORTANTE: preparar e revisar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @migration NVARCHAR(255) = N'20261023_002_indicador19_correcao_tecnica_final.sql';
DECLARE @indicadorId NVARCHAR(100) = N'19';
DECLARE @nomeCanonico NVARCHAR(255) = N'Patrocínio da edição 2026 da Brasil Ladies Cup';
DECLARE @idProjeto NVARCHAR(100) = N'brasil-ladies-cup-2026';
DECLARE @metasAntes NVARCHAR(MAX);
DECLARE @metasDepois NVARCHAR(MAX);
DECLARE @regrasAntes NVARCHAR(MAX);
DECLARE @regra19 NVARCHAR(MAX);
DECLARE @linhasIndicador INT = 0;
DECLARE @linhasLancamentos INT = 0;
DECLARE @linhasConfiguracoes INT = 0;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 51901, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND numero = 19
          AND nome = N'Incentivo Socioambiental'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN'
          AND pilar = N'Sustentabilidade e Cidadania'
          AND unidade_medida = N'moeda'
          AND tipo_calculo = N'investimento_socioambiental'
          AND ISNULL(tipo_consolidacao, N'') = N''
          AND meta_anual = N'0,33% do Lucro Líquido do ano (R$ 4.307.900,00 estimados)'
    )
        THROW 51902, 'Pré-condição inválida: identidade ou cadastro do Indicador 19 diverge do diagnóstico.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores
        WHERE id = N'16' AND nome = N'Apoio ao Desenvolvimento Socioambiental'
          AND unidade_apuradora = N'GENOL' AND diretoria_responsavel = N'DICOT'
          AND tipo_calculo = N'iniciativas_apoiadas'
          AND tipo_consolidacao = N'iniciativas_acumuladas'
    )
        THROW 51903, 'Pré-condição inválida: o Indicador 16 protegido diverge do estado regularizado.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND id IN
          (N'217',N'218',N'219',N'220',N'221',N'222',N'223',N'224',N'225',N'226',N'227',N'228')) <> 12
        THROW 51904, 'Pré-condição inválida: lançamentos 217 a 228 não estão íntegros.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'217',N'218',N'219') AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,2), meta_referencia) = 0
          AND TRY_CONVERT(DECIMAL(19,2), resultado_calculado) = 0) <> 3
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'217',N'218',N'219'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'217',N'218',N'219'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade_id IN (N'217',N'218',N'219'))
        THROW 51905, 'Pré-condição inválida: HOMOLOGAÇÃO LEGADA SEM EVENTO TRANSACIONAL de JAN–MAR divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'220',N'221',N'222') AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND TRY_CONVERT(DECIMAL(19,2), meta_referencia) = 652700
          AND TRY_CONVERT(DECIMAL(19,2), resultado_calculado) = 0
          AND TRY_CONVERT(DECIMAL(19,2), resultado_oficial) = 0
          AND TRY_CONVERT(DECIMAL(38,18), percentual_atingido) = 0
          AND situacao = N'Abaixo da meta'
          AND usuario_responsavel = N'UNIDADE-GENOL'
          AND versao_atual = 1) <> 3
       OR (SELECT COUNT(*) FROM dbo.homologacoes WHERE lancamento_id IN (N'220',N'221',N'222')) <> 3
       OR (SELECT COUNT(*) FROM dbo.evidencias WHERE lancamento_id IN (N'220',N'221',N'222')) <> 3
        THROW 51906, 'Pré-condição inválida: dados ou governança reais de ABR–JUN divergiram.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.homologacoes WHERE id = N'homologacao-6a986d07df65c7.82309601' AND lancamento_id = N'220')
       OR NOT EXISTS (SELECT 1 FROM dbo.homologacoes WHERE id = N'homologacao-6a986d0fc84003.79789225' AND lancamento_id = N'221')
       OR NOT EXISTS (SELECT 1 FROM dbo.homologacoes WHERE id = N'homologacao-6a986d1722dbf6.62798576' AND lancamento_id = N'222')
       OR NOT EXISTS (SELECT 1 FROM dbo.evidencias WHERE id = N'evidencia-6a98533e3a3972.30845880' AND lancamento_id = N'220')
       OR NOT EXISTS (SELECT 1 FROM dbo.evidencias WHERE id = N'evidencia-6a98567ec1b2a7.54255601' AND lancamento_id = N'221')
       OR NOT EXISTS (SELECT 1 FROM dbo.evidencias WHERE id = N'evidencia-6a986cb5075e53.24463386' AND lancamento_id = N'222')
        THROW 51907, 'Pré-condição inválida: IDs históricos de homologação/evidência de ABR–JUN divergiram.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'223',N'224',N'225') AND indicador_id = @indicadorId
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(DECIMAL(19,2), meta_referencia) = 1305400
          AND TRY_CONVERT(DECIMAL(19,2), resultado_calculado) = 190000
          AND TRY_CONVERT(DECIMAL(19,2), resultado_oficial) = 190000
          AND ABS(TRY_CONVERT(DECIMAL(38,18), percentual_atingido)
              - CAST(0.145549256932740922 AS DECIMAL(38,18))) < CAST(0.000000000000001 AS DECIMAL(38,18))
          AND situacao = N'Abaixo da meta'
          AND ISJSON(dados_entrada_json) = 1
          AND JSON_VALUE(dados_entrada_json, '$.nomeProjetoIncentivoSocioambiental') = N'Brasil Ladies Cup 2026'
          AND TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(dados_entrada_json, '$.valorInvestidoAcumuladoCompetencia')) = 190000
          AND JSON_VALUE(dados_entrada_json, '$.idProjetoIncentivoSocioambiental') IS NULL) <> 3
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'223'), '$.valorInvestidoMes')) <> 190000
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'224'), '$.valorInvestidoMes')) <> 0
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'225'), '$.valorInvestidoMes')) <> 0
        THROW 51908, 'Pré-condição inválida: posição financeira/documental de JUL–SET divergiu.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'223',N'224',N'225'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'223',N'224',N'225'))
        THROW 51909, 'Pré-condição inválida: JUL–SET já possuem governança formal.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'metas') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51910, 'Pré-condição inválida: configurações ausentes ou duplicadas.', 1;

    SELECT @metasAntes = valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'metas';
    SELECT @regrasAntes = valor_json FROM dbo.configuracoes WITH (HOLDLOCK) WHERE chave = N'regrasIndicadores';
    IF ISJSON(@metasAntes) <> 1 OR ISJSON(@regrasAntes) <> 1
        THROW 51911, 'Pré-condição inválida: configuração JSON inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId) <> 3
       OR EXISTS (
          SELECT 1 FROM OPENJSON(@metasAntes)
          WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId
            AND (TRY_CONVERT(INT, JSON_VALUE(value, '$.mes')) NOT IN (1,2,3)
                 OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(value, '$.metaMensal')) <> 0)
       )
       OR EXISTS (SELECT 1 FROM OPENJSON(@metasAntes) WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.id')) BETWEEN 178 AND 186)
        THROW 51912, 'Pré-condição inválida: configuração genérica de metas não corresponde à curva parcial diagnosticada.', 1;

    SELECT @regra19 = value FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value, '$.indicadorId') = @indicadorId;
    IF @regra19 IS NULL
       OR JSON_VALUE(@regra19, '$.tipoCalculo') <> N'investimento_socioambiental'
       OR JSON_VALUE(@regra19, '$.tipoConsolidacao') <> N'valor_acumulado'
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(@regra19, '$.metaAnualValor')) <> 4307900
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(@regra19, '$.parametrosCalculo.lucroLiquidoReferencia')) <> 1305400000
       OR TRY_CONVERT(DECIMAL(19,6), JSON_VALUE(@regra19, '$.parametrosCalculo.percentualMetaAnual')) <> 0.0033
       OR JSON_QUERY(@regra19, '$.parametrosCalculo.mesesFechamentoTrimestral') <> N'[3,6,9,12]'
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(@regra19, '$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaValorAcumulado')) <> 0
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(@regra19, '$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaValorAcumulado')) <> 652700
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(@regra19, '$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaValorAcumulado')) <> 1305400
       OR TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(@regra19, '$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado')) <> 4307900
        THROW 51913, 'Pré-condição inválida: regra conceitual do Indicador 19 diverge.', 1;

    SET @metasDepois = @metasAntes;
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":178,"indicadorId":19,"ano":2026,"mes":4,"nomeMes":"Abril","metaMensal":652700,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":179,"indicadorId":19,"ano":2026,"mes":5,"nomeMes":"Maio","metaMensal":652700,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":180,"indicadorId":19,"ano":2026,"mes":6,"nomeMes":"Junho","metaMensal":652700,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":181,"indicadorId":19,"ano":2026,"mes":7,"nomeMes":"Julho","metaMensal":1305400,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":182,"indicadorId":19,"ano":2026,"mes":8,"nomeMes":"Agosto","metaMensal":1305400,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":183,"indicadorId":19,"ano":2026,"mes":9,"nomeMes":"Setembro","metaMensal":1305400,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":184,"indicadorId":19,"ano":2026,"mes":10,"nomeMes":"Outubro","metaMensal":4307900,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":185,"indicadorId":19,"ano":2026,"mes":11,"nomeMes":"Novembro","metaMensal":4307900,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));
    SET @metasDepois = JSON_MODIFY(@metasDepois, 'append $', JSON_QUERY(N'{"id":186,"indicadorId":19,"ano":2026,"mes":12,"nomeMes":"Dezembro","metaMensal":4307900,"fonte":"curva_trimestral_incentivo_socioambiental_2026"}'));

    UPDATE dbo.indicadores
    SET tipo_consolidacao = N'valor_acumulado'
    WHERE id = @indicadorId AND tipo_consolidacao IS NULL;
    SET @linhasIndicador = @@ROWCOUNT;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = JSON_MODIFY(
        JSON_MODIFY(dados_entrada_json, '$.nomeProjetoIncentivoSocioambiental', @nomeCanonico),
        '$.idProjetoIncentivoSocioambiental', @idProjeto
    )
    WHERE indicador_id = @indicadorId AND id IN (N'223',N'224',N'225');
    SET @linhasLancamentos = @@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json = @metasDepois
    WHERE chave = N'metas' AND valor_json = @metasAntes;
    SET @linhasConfiguracoes = @@ROWCOUNT;

    IF @linhasIndicador <> 1 OR @linhasLancamentos <> 3 OR @linhasConfiguracoes <> 1
        THROW 51914, 'Validação falhou: quantidades alteradas diferentes de indicadores=1, lançamentos=3, configurações=1.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND tipo_consolidacao=N'valor_acumulado')
        THROW 51915, 'Validação falhou: consolidação final inválida.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'223',N'224',N'225') AND indicador_id=@indicadorId
          AND JSON_VALUE(dados_entrada_json, '$.nomeProjetoIncentivoSocioambiental')=@nomeCanonico
          AND JSON_VALUE(dados_entrada_json, '$.idProjetoIncentivoSocioambiental')=@idProjeto) <> 3
        THROW 51916, 'Validação falhou: padronização documental final inválida.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value, '$.indicadorId')=@indicadorId) <> 12
       OR EXISTS (
          SELECT mes,meta FROM (VALUES (1,0),(2,0),(3,0),(4,652700),(5,652700),(6,652700),
             (7,1305400),(8,1305400),(9,1305400),(10,4307900),(11,4307900),(12,4307900)) v(mes,meta)
          EXCEPT
          SELECT TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')), TRY_CONVERT(INT,JSON_VALUE(value,'$.metaMensal'))
          FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId
       )
        THROW 51917, 'Validação falhou: curva genérica final incompleta ou divergente.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id<>@indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
        THROW 51918, 'Validação falhou: outro indicador, inclusive o 16, foi alterado.', 1;

    IF EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id=@indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id=@indicadorId
    ) OR EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id=@indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,
               tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id=@indicadorId
    )
        THROW 51919, 'Validação falhou: campo não autorizado do cadastro foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'223',N'224',N'225') EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'223',N'224',N'225'))
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'223',N'224',N'225') EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'223',N'224',N'225'))
        THROW 51920, 'Validação falhou: lançamento fora de JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'223',N'224',N'225')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'223',N'224',N'225')
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM #lancamentosAntes WHERE id IN (N'223',N'224',N'225')
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,
               observacao_unidade,referencia_evidencia,evidencia_id,versao_atual,usuario_responsavel,created_at,updated_at
        FROM dbo.lancamentos WHERE id IN (N'223',N'224',N'225')
    )
        THROW 51921, 'Validação falhou: campo financeiro, workflow ou rastreabilidade de JUL–SET foi alterado.', 1;

    IF EXISTS (
        SELECT l.id,j.[key],j.value,j.type FROM dbo.lancamentos l CROSS APPLY OPENJSON(l.dados_entrada_json) j
        WHERE l.id IN (N'223',N'224',N'225') AND j.[key] NOT IN (N'nomeProjetoIncentivoSocioambiental',N'idProjetoIncentivoSocioambiental')
        EXCEPT
        SELECT l.id,j.[key],j.value,j.type FROM #lancamentosAntes l CROSS APPLY OPENJSON(l.dados_entrada_json) j
        WHERE l.id IN (N'223',N'224',N'225') AND j.[key] NOT IN (N'nomeProjetoIncentivoSocioambiental',N'idProjetoIncentivoSocioambiental')
    ) OR EXISTS (
        SELECT l.id,j.[key],j.value,j.type FROM #lancamentosAntes l CROSS APPLY OPENJSON(l.dados_entrada_json) j
        WHERE l.id IN (N'223',N'224',N'225') AND j.[key] NOT IN (N'nomeProjetoIncentivoSocioambiental',N'idProjetoIncentivoSocioambiental')
        EXCEPT
        SELECT l.id,j.[key],j.value,j.type FROM dbo.lancamentos l CROSS APPLY OPENJSON(l.dados_entrada_json) j
        WHERE l.id IN (N'223',N'224',N'225') AND j.[key] NOT IN (N'nomeProjetoIncentivoSocioambiental',N'idProjetoIncentivoSocioambiental')
    )
        THROW 51922, 'Validação falhou: propriedade documental não autorizada de JUL–SET foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave<>N'metas' EXCEPT SELECT * FROM #configuracoesAntes WHERE chave<>N'metas')
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave<>N'metas' EXCEPT SELECT * FROM dbo.configuracoes WHERE chave<>N'metas')
       OR EXISTS (
          SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
          EXCEPT SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
       )
       OR EXISTS (
          SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
          EXCEPT SELECT [key],value,type FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
       )
        THROW 51923, 'Validação falhou: configuração não relacionada foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
       OR EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
        THROW 51924, 'Validação falhou: governança foi criada, removida ou alterada.', 1;

    IF (SELECT SUM(TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.valorInvestidoMes')))
        FROM dbo.lancamentos WHERE id IN (N'223',N'224',N'225')) <> 190000
        THROW 51925, 'Validação falhou: o investimento foi duplicado; esperado 190000 + 0 + 0.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @migration AS migration,
        @linhasIndicador AS indicadores_alterados,
        @linhasLancamentos AS lancamentos_alterados,
        @linhasConfiguracoes AS configuracoes_alteradas,
        0 AS registros_criados,
        0 AS registros_removidos;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
