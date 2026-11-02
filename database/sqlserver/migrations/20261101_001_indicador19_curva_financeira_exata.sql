/*
  Indicador 19 - Incentivo Socioambiental
  Alinha somente a curva financeira explicita da planilha da Unidade.

  Preserva:
  - lucroLiquidoReferencia = 1305400000.00;
  - percentuais 0%, 0,05%, 0,10% e 0,33%;
  - realizados e a deduplicacao da Brasil Ladies Cup;
  - status, versoes, usuarios, evidencias e toda a governanca;
  - observacoes documentais e o Indicador 7.

  A migration e idempotente: aceita o estado anterior ou o estado final.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @migration NVARCHAR(255) = N'20261101_001_indicador19_curva_financeira_exata.sql';
DECLARE @indicadorId NVARCHAR(100) = N'19';
DECLARE @metaAnualDescricaoAntiga NVARCHAR(MAX) = N'0,33% do Lucro Líquido do ano (R$ 4.307.900,00 estimados)';
DECLARE @metaAnualDescricaoNova NVARCHAR(MAX) = N'0,33% do Lucro Líquido do ano (R$ 4.307.854,94 conforme planilha da Unidade)';
DECLARE @atingimento3Tri DECIMAL(38,18) = CAST(0.145548076180383982 AS DECIMAL(38,18));
DECLARE @regrasAntes NVARCHAR(MAX);
DECLARE @regrasDepois NVARCHAR(MAX);
DECLARE @metasAntes NVARCHAR(MAX);
DECLARE @metasDepois NVARCHAR(MAX);
DECLARE @regraIndice INT;
DECLARE @regraAntesObjeto NVARCHAR(MAX);
DECLARE @regraDepoisObjeto NVARCHAR(MAX);
DECLARE @regraFinalObjeto NVARCHAR(MAX);
DECLARE @jsonItem NVARCHAR(MAX);
DECLARE @jsonIndice INT;
DECLARE @jsonTotal INT;
DECLARE @metaValor DECIMAL(19,2);
DECLARE @linhasIndicador INT = 0;
DECLARE @linhasLancamentos INT = 0;
DECLARE @linhasConfiguracoes INT = 0;

DECLARE @curva TABLE (
    mes INT NOT NULL PRIMARY KEY,
    meta_antiga DECIMAL(19,2) NOT NULL,
    meta_nova DECIMAL(19,2) NOT NULL
);

INSERT INTO @curva (mes, meta_antiga, meta_nova)
VALUES
    (1, 0.00,       0.00),
    (2, 0.00,       0.00),
    (3, 0.00,       0.00),
    (4, 652700.00,  652705.29),
    (5, 652700.00,  652705.29),
    (6, 652700.00,  652705.29),
    (7, 1305400.00, 1305410.59),
    (8, 1305400.00, 1305410.59),
    (9, 1305400.00, 1305410.59),
    (10,4307900.00, 4307854.94),
    (11,4307900.00, 4307854.94),
    (12,4307900.00, 4307854.94);

BEGIN TRY
    BEGIN TRANSACTION;

    IF DB_NAME() <> N'Estrategia'
        THROW 52001, 'Execute esta migration somente no banco Estrategia.', 1;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos_observacoes_documentais', N'U') IS NULL
        THROW 52002, 'Pre-condicao invalida: estrutura obrigatoria ausente.', 1;

    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #observacoesDocumentaisAntes FROM dbo.lancamentos_observacoes_documentais;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND numero = 19
          AND nome = N'Incentivo Socioambiental'
          AND plano = N'PN'
          AND unidade_apuradora = N'GENOL'
          AND diretoria_responsavel = N'DICOT'
          AND tipo_calculo = N'investimento_socioambiental'
          AND tipo_consolidacao = N'valor_acumulado'
          AND meta_anual IN (@metaAnualDescricaoAntiga, @metaAnualDescricaoNova)
    )
        THROW 52003, 'Pre-condicao invalida: cadastro do Indicador 19 diverge do estado esperado.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND ano=2026) <> 12
       OR EXISTS (
            SELECT mes FROM dbo.lancamentos
            WHERE indicador_id=@indicadorId AND ano=2026
            GROUP BY mes HAVING COUNT(*) <> 1
       )
        THROW 52004, 'Pre-condicao invalida: as 12 competencias do Indicador 19 nao estao completas e unicas.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.lancamentos l
        INNER JOIN @curva c ON c.mes=l.mes
        WHERE l.indicador_id=@indicadorId AND l.ano=2026
          AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia) NOT IN (c.meta_antiga,c.meta_nova)
    )
        THROW 52005, 'Pre-condicao invalida: meta_referencia contem valor fora da curva anterior/final.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE indicador_id=@indicadorId AND ano=2026 AND mes BETWEEN 7 AND 9
          AND status=N'Em preenchimento'
          AND versao_atual=1
          AND TRY_CONVERT(DECIMAL(19,2),resultado_calculado)=190000
          AND TRY_CONVERT(DECIMAL(19,2),resultado_oficial)=190000
          AND situacao=N'Abaixo da meta'
          AND JSON_VALUE(dados_entrada_json,'$.idProjetoIncentivoSocioambiental')=N'brasil-ladies-cup-2026'
          AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.valorInvestidoAcumuladoCompetencia'))=190000
    ) <> 3
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'223'),'$.valorInvestidoMes')) <> 190000
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'224'),'$.valorInvestidoMes')) <> 0
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id=N'225'),'$.valorInvestidoMes')) <> 0
        THROW 52006, 'Pre-condicao invalida: realizado ou deduplicacao da Brasil Ladies Cup divergiu.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE indicador_id=@indicadorId AND ano=2026 AND mes BETWEEN 7 AND 9
          AND ABS(TRY_CONVERT(DECIMAL(38,18),percentual_atingido)-CAST(0.145549256932740922 AS DECIMAL(38,18))) > CAST(0.000000000000001 AS DECIMAL(38,18))
          AND ABS(TRY_CONVERT(DECIMAL(38,18),percentual_atingido)-@atingimento3Tri) > CAST(0.000000000000001 AS DECIMAL(38,18))
    )
        THROW 52007, 'Pre-condicao invalida: atingimento de JUL-SET nao corresponde ao estado anterior/final.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave=N'regrasIndicadores') <> 1
       OR (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave=N'metas') <> 1
        THROW 52008, 'Pre-condicao invalida: configuracoes ausentes ou duplicadas.', 1;

    SELECT @regrasAntes=valor_json FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores';
    SELECT @metasAntes=valor_json FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'metas';
    IF ISJSON(@regrasAntes)<>1 OR ISJSON(@metasAntes)<>1
        THROW 52009, 'Pre-condicao invalida: configuracao JSON invalida.', 1;

    SELECT @regraIndice=TRY_CONVERT(INT,[key])
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;

    SELECT @regraAntesObjeto=value
    FROM OPENJSON(@regrasAntes)
    WHERE TRY_CONVERT(INT,[key])=@regraIndice;

    IF @regraIndice IS NULL
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntesObjeto,'$.parametrosCalculo.lucroLiquidoReferencia'))<>1305400000
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntesObjeto,'$.parametrosCalculo.percentualMetaAnual'))<>0.0033
       OR JSON_QUERY(@regraAntesObjeto,'$.parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
        THROW 52010, 'Pre-condicao invalida: regra/base/percentuais do Indicador 19 divergiram.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes)
        WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId AND TRY_CONVERT(INT,JSON_VALUE(value,'$.ano'))=2026)<>12
       OR EXISTS (
          SELECT 1
          FROM OPENJSON(@metasAntes) j
          INNER JOIN @curva c ON c.mes=TRY_CONVERT(INT,JSON_VALUE(j.value,'$.mes'))
          WHERE JSON_VALUE(j.value,'$.indicadorId')=@indicadorId
            AND TRY_CONVERT(INT,JSON_VALUE(j.value,'$.ano'))=2026
            AND TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(j.value,'$.metaMensal')) NOT IN (c.meta_antiga,c.meta_nova)
       )
        THROW 52011, 'Pre-condicao invalida: configuracao metas diverge da curva anterior/final.', 1;

    SET @regraDepoisObjeto=@regraAntesObjeto;
    SET @regraDepoisObjeto=JSON_MODIFY(@regraDepoisObjeto,'$.metaAnualValor',CAST(4307854.94 AS DECIMAL(19,2)));
    SET @regraDepoisObjeto=JSON_MODIFY(@regraDepoisObjeto,'$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaValorAcumulado',CAST(652705.29 AS DECIMAL(19,2)));
    SET @regraDepoisObjeto=JSON_MODIFY(@regraDepoisObjeto,'$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaValorAcumulado',CAST(1305410.59 AS DECIMAL(19,2)));
    SET @regraDepoisObjeto=JSON_MODIFY(@regraDepoisObjeto,'$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado',CAST(4307854.94 AS DECIMAL(19,2)));

    SET @regrasDepois=N'[]';
    SET @jsonIndice=0;
    SET @jsonTotal=(SELECT COUNT(*) FROM OPENJSON(@regrasAntes));
    WHILE @jsonIndice<@jsonTotal
    BEGIN
        SELECT @jsonItem=value FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,[key])=@jsonIndice;
        IF @jsonIndice=@regraIndice SET @jsonItem=@regraDepoisObjeto;
        SET @regrasDepois=JSON_MODIFY(@regrasDepois,'append $',JSON_QUERY(@jsonItem));
        SET @jsonIndice=@jsonIndice+1;
    END;

    SET @metasDepois=N'[]';
    SET @jsonIndice=0;
    SET @jsonTotal=(SELECT COUNT(*) FROM OPENJSON(@metasAntes));
    WHILE @jsonIndice<@jsonTotal
    BEGIN
        SELECT @jsonItem=value FROM OPENJSON(@metasAntes) WHERE TRY_CONVERT(INT,[key])=@jsonIndice;
        IF JSON_VALUE(@jsonItem,'$.indicadorId')=@indicadorId
           AND TRY_CONVERT(INT,JSON_VALUE(@jsonItem,'$.ano'))=2026
        BEGIN
            SET @metaValor=NULL;
            SELECT @metaValor=meta_nova FROM @curva WHERE mes=TRY_CONVERT(INT,JSON_VALUE(@jsonItem,'$.mes'));
            IF @metaValor IS NULL THROW 52023, 'Pre-condicao invalida: mes sem curva financeira.', 1;
            SET @jsonItem=JSON_MODIFY(@jsonItem,'$.metaMensal',@metaValor);
        END;
        SET @metasDepois=JSON_MODIFY(@metasDepois,'append $',JSON_QUERY(@jsonItem));
        SET @jsonIndice=@jsonIndice+1;
    END;

    UPDATE dbo.indicadores
    SET meta_anual=@metaAnualDescricaoNova
    WHERE id=@indicadorId AND meta_anual<>@metaAnualDescricaoNova;
    SET @linhasIndicador=@@ROWCOUNT;

    UPDATE l
    SET meta_referencia=CONVERT(NVARCHAR(100),c.meta_nova),
        percentual_atingido=CASE
          WHEN l.mes BETWEEN 4 AND 6 THEN N'0'
          WHEN l.mes BETWEEN 7 AND 9 THEN CONVERT(NVARCHAR(100),@atingimento3Tri)
          ELSE l.percentual_atingido
        END
    FROM dbo.lancamentos l
    INNER JOIN @curva c ON c.mes=l.mes
    WHERE l.indicador_id=@indicadorId AND l.ano=2026
      AND (
        TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)<>c.meta_nova
        OR (l.mes BETWEEN 7 AND 9 AND ABS(TRY_CONVERT(DECIMAL(38,18),l.percentual_atingido)-@atingimento3Tri)>CAST(0.000000000000001 AS DECIMAL(38,18)))
      );
    SET @linhasLancamentos=@@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json=@regrasDepois,updated_at=CONVERT(NVARCHAR(40),SYSDATETIMEOFFSET(),127)
    WHERE chave=N'regrasIndicadores' AND valor_json<>@regrasDepois;
    SET @linhasConfiguracoes=@@ROWCOUNT;

    UPDATE dbo.configuracoes
    SET valor_json=@metasDepois,updated_at=CONVERT(NVARCHAR(40),SYSDATETIMEOFFSET(),127)
    WHERE chave=N'metas' AND valor_json<>@metasDepois;
    SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND meta_anual=@metaAnualDescricaoNova)
        THROW 52012, 'Validacao falhou: descricao anual final divergente.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.lancamentos l INNER JOIN @curva c ON c.mes=l.mes
        WHERE l.indicador_id=@indicadorId AND l.ano=2026
          AND TRY_CONVERT(DECIMAL(19,2),l.meta_referencia)<>c.meta_nova
    )
       OR EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE indicador_id=@indicadorId AND ano=2026 AND mes BETWEEN 7 AND 9
          AND ABS(TRY_CONVERT(DECIMAL(38,18),percentual_atingido)-@atingimento3Tri)>CAST(0.000000000000001 AS DECIMAL(38,18))
    )
        THROW 52013, 'Validacao falhou: metas ou atingimento final dos lancamentos divergentes.', 1;

    DECLARE @regrasFinais NVARCHAR(MAX)=(SELECT valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores');
    DECLARE @metasFinais NVARCHAR(MAX)=(SELECT valor_json FROM dbo.configuracoes WHERE chave=N'metas');

    SELECT @regraFinalObjeto=value
    FROM OPENJSON(@regrasFinais)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;

    IF TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinalObjeto,'$.metaAnualValor'))<>4307854.94
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinalObjeto,'$.parametrosCalculo.lucroLiquidoReferencia'))<>1305400000
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinalObjeto,'$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaValorAcumulado'))<>652705.29
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinalObjeto,'$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaValorAcumulado'))<>1305410.59
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinalObjeto,'$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado'))<>4307854.94
        THROW 52014, 'Validacao falhou: regra final ou base de lucro liquido divergente.', 1;

    IF EXISTS (
        SELECT c.mes,c.meta_nova FROM @curva c
        EXCEPT
        SELECT TRY_CONVERT(INT,JSON_VALUE(value,'$.mes')),TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(value,'$.metaMensal'))
        FROM OPENJSON(@metasFinais)
        WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId AND TRY_CONVERT(INT,JSON_VALUE(value,'$.ano'))=2026
    )
        THROW 52015, 'Validacao falhou: configuracao metas final divergente.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id<>@indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
        THROW 52016, 'Validacao falhou: outro indicador, inclusive o Indicador 7, foi alterado.', 1;

    IF EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,tipo_calculo,tipo_consolidacao,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id=@indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,tipo_calculo,tipo_consolidacao,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id=@indicadorId
    ) OR EXISTS (
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,tipo_calculo,tipo_consolidacao,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM #indicadoresAntes WHERE id=@indicadorId
        EXCEPT
        SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,tipo_calculo,tipo_consolidacao,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
        FROM dbo.indicadores WHERE id=@indicadorId
    )
        THROW 52017, 'Validacao falhou: campo nao autorizado do cadastro foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE indicador_id<>@indicadorId EXCEPT SELECT * FROM #lancamentosAntes WHERE indicador_id<>@indicadorId)
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE indicador_id<>@indicadorId EXCEPT SELECT * FROM dbo.lancamentos WHERE indicador_id<>@indicadorId)
        THROW 52018, 'Validacao falhou: lancamento de outro indicador foi alterado.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,dados_entrada_json,resultado_calculado,resultado_oficial,situacao,status,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE indicador_id=@indicadorId
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,dados_entrada_json,resultado_calculado,resultado_oficial,situacao,status,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM #lancamentosAntes WHERE indicador_id=@indicadorId
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,dados_entrada_json,resultado_calculado,resultado_oficial,situacao,status,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM #lancamentosAntes WHERE indicador_id=@indicadorId
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,dados_entrada_json,resultado_calculado,resultado_oficial,situacao,status,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE indicador_id=@indicadorId
    )
        THROW 52019, 'Validacao falhou: realizado, workflow ou rastreabilidade foi alterado.', 1;

    IF EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasFinais) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@regrasFinais) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@metasFinais) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
        EXCEPT SELECT [key],value,type FROM OPENJSON(@metasFinais) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    )
        THROW 52020, 'Validacao falhou: configuracao de outro indicador foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'regrasIndicadores',N'metas') EXCEPT SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'regrasIndicadores',N'metas'))
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave NOT IN (N'regrasIndicadores',N'metas') EXCEPT SELECT * FROM dbo.configuracoes WHERE chave NOT IN (N'regrasIndicadores',N'metas'))
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
       OR EXISTS (SELECT * FROM dbo.lancamentos_observacoes_documentais EXCEPT SELECT * FROM #observacoesDocumentaisAntes)
       OR EXISTS (SELECT * FROM #observacoesDocumentaisAntes EXCEPT SELECT * FROM dbo.lancamentos_observacoes_documentais)
        THROW 52021, 'Validacao falhou: governanca, evidencias ou observacoes documentais foram alteradas.', 1;

    IF (SELECT SUM(TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(dados_entrada_json,'$.valorInvestidoMes')))
        FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND ano=2026 AND mes BETWEEN 7 AND 9)<>190000
        THROW 52022, 'Validacao falhou: Brasil Ladies Cup foi duplicada.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @migration AS migration,
        @linhasIndicador AS indicadores_alterados,
        @linhasLancamentos AS lancamentos_alterados,
        @linhasConfiguracoes AS configuracoes_alteradas,
        CAST(1305400000.00 AS DECIMAL(19,2)) AS lucro_liquido_referencia_preservado,
        CAST(652705.29 AS DECIMAL(19,2)) AS meta_2tri,
        CAST(1305410.59 AS DECIMAL(19,2)) AS meta_3tri,
        CAST(4307854.94 AS DECIMAL(19,2)) AS meta_4tri,
        @atingimento3Tri AS atingimento_setembro,
        0 AS registros_criados,
        0 AS registros_removidos;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
