/*
  Indicador 19 - Incentivo Socioambiental
  Substitui somente o baseline tecnico de Lucro Liquido pela referencia
  explicita da planilha da Unidade: R$ 1.305.410.587,78.

  Preserva integralmente a curva financeira, os lancamentos, o Indicador 7
  e todas as tabelas de governanca. Idempotente no estado anterior/final.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @migration NVARCHAR(255)=N'20261101_002_indicador19_baseline_exato.sql';
DECLARE @indicadorId NVARCHAR(100)=N'19';
DECLARE @baselineAnterior DECIMAL(19,2)=CAST(1305400000.00 AS DECIMAL(19,2));
DECLARE @baselineNovo DECIMAL(19,2)=CAST(1305410587.78 AS DECIMAL(19,2));
DECLARE @regrasAntes NVARCHAR(MAX);
DECLARE @regrasDepois NVARCHAR(MAX);
DECLARE @regrasFinais NVARCHAR(MAX);
DECLARE @regraAntes NVARCHAR(MAX);
DECLARE @regraDepois NVARCHAR(MAX);
DECLARE @regraFinal NVARCHAR(MAX);
DECLARE @regraIndice INT;
DECLARE @jsonIndice INT;
DECLARE @jsonTotal INT;
DECLARE @jsonItem NVARCHAR(MAX);
DECLARE @configuracoesAlteradas INT=0;

BEGIN TRY
    BEGIN TRANSACTION;

    IF DB_NAME()<>N'Estrategia'
        THROW 52101, 'Execute esta migration somente no banco Estrategia.', 1;

    IF OBJECT_ID(N'dbo.configuracoes',N'U') IS NULL
       OR OBJECT_ID(N'dbo.indicadores',N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos',N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes',N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias',N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes',N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura',N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria',N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos_observacoes_documentais',N'U') IS NULL
        THROW 52102, 'Pre-condicao invalida: estrutura obrigatoria ausente.', 1;

    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;
    SELECT * INTO #observacoesDocumentaisAntes FROM dbo.lancamentos_observacoes_documentais;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave=N'regrasIndicadores')<>1
        THROW 52103, 'Pre-condicao invalida: regrasIndicadores ausente ou duplicada.', 1;

    SELECT @regrasAntes=valor_json
    FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK)
    WHERE chave=N'regrasIndicadores';

    IF ISJSON(@regrasAntes)<>1
        THROW 52104, 'Pre-condicao invalida: regrasIndicadores nao contem JSON valido.', 1;

    SELECT @regraIndice=TRY_CONVERT(INT,[key]),@regraAntes=value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;

    IF @regraIndice IS NULL
       OR (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId)<>1
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.lucroLiquidoReferencia')) NOT IN (@baselineAnterior,@baselineNovo)
       OR JSON_VALUE(@regraAntes,'$.tipoCalculo')<>N'investimento_socioambiental'
       OR JSON_VALUE(@regraAntes,'$.tipoConsolidacao')<>N'valor_acumulado'
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntes,'$.parametrosCalculo.percentualMetaAnual'))<>0.0033
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaValorAcumulado'))<>0
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaValorAcumulado'))<>652705.29
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaValorAcumulado'))<>1305410.59
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado'))<>4307854.94
        THROW 52105, 'Pre-condicao invalida: regra, baseline ou curva do Indicador 19 divergente.', 1;

    IF ROUND(@baselineNovo*CAST(0.0005 AS DECIMAL(19,6)),2)<>652705.29
       OR ROUND(@baselineNovo*CAST(0.001 AS DECIMAL(19,6)),2)<>1305410.59
       OR ROUND(@baselineNovo*CAST(0.0033 AS DECIMAL(19,6)),2)<>4307854.94
        THROW 52106, 'Validacao matematica falhou: baseline nao reproduz a curva financeira.', 1;

    SET @regraDepois=JSON_MODIFY(@regraAntes,'$.parametrosCalculo.lucroLiquidoReferencia',@baselineNovo);
    SET @regrasDepois=N'[]';
    SET @jsonIndice=0;
    SET @jsonTotal=(SELECT COUNT(*) FROM OPENJSON(@regrasAntes));

    WHILE @jsonIndice<@jsonTotal
    BEGIN
        SELECT @jsonItem=value FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,[key])=@jsonIndice;
        IF @jsonIndice=@regraIndice SET @jsonItem=@regraDepois;
        SET @regrasDepois=JSON_MODIFY(@regrasDepois,'append $',JSON_QUERY(@jsonItem));
        SET @jsonIndice=@jsonIndice+1;
    END;

    UPDATE dbo.configuracoes
    SET valor_json=@regrasDepois,
        updated_at=CONVERT(NVARCHAR(40),SYSDATETIMEOFFSET(),127)
    WHERE chave=N'regrasIndicadores' AND valor_json<>@regrasDepois;
    SET @configuracoesAlteradas=@@ROWCOUNT;

    SELECT @regrasFinais=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    SELECT @regraFinal=value
    FROM OPENJSON(@regrasFinais)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;

    IF TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinal,'$.parametrosCalculo.lucroLiquidoReferencia'))<>@baselineNovo
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinal,'$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaValorAcumulado'))<>652705.29
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinal,'$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaValorAcumulado'))<>1305410.59
       OR TRY_CONVERT(DECIMAL(19,2),JSON_VALUE(@regraFinal,'$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaValorAcumulado'))<>4307854.94
        THROW 52107, 'Validacao pos falhou: baseline ou curva final divergente.', 1;

    IF EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    ) OR EXISTS (
        SELECT [key],value,type FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
        EXCEPT
        SELECT [key],value,type FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>@indicadorId
    )
        THROW 52108, 'Validacao pos falhou: outra regra, inclusive o Indicador 7, foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.configuracoes WHERE chave<>N'regrasIndicadores' EXCEPT SELECT * FROM #configuracoesAntes WHERE chave<>N'regrasIndicadores')
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave<>N'regrasIndicadores' EXCEPT SELECT * FROM dbo.configuracoes WHERE chave<>N'regrasIndicadores')
       OR EXISTS (SELECT * FROM dbo.indicadores EXCEPT SELECT * FROM #indicadoresAntes)
       OR EXISTS (SELECT * FROM #indicadoresAntes EXCEPT SELECT * FROM dbo.indicadores)
       OR EXISTS (SELECT * FROM dbo.lancamentos EXCEPT SELECT * FROM #lancamentosAntes)
       OR EXISTS (SELECT * FROM #lancamentosAntes EXCEPT SELECT * FROM dbo.lancamentos)
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
        THROW 52109, 'Validacao pos falhou: lancamentos, cadastro ou governanca foram alterados.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS resultado_transacao,
           @migration AS migration,
           @configuracoesAlteradas AS configuracoes_alteradas,
           CAST(0 AS INT) AS lancamentos_alterados,
           @baselineAnterior AS baseline_anterior,
           @baselineNovo AS baseline_novo,
           CAST(652705.29 AS DECIMAL(19,2)) AS meta_2tri_preservada,
           CAST(1305410.59 AS DECIMAL(19,2)) AS meta_3tri_preservada,
           CAST(4307854.94 AS DECIMAL(19,2)) AS meta_4tri_preservada,
           CAST(0 AS INT) AS registros_criados,
           CAST(0 AS INT) AS registros_removidos;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
