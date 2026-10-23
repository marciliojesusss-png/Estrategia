/*
  Indicador 17 — Repasse Social — MAR/2026 (1TRI)

  Elimina a dupla aproximação do percentual técnico legado. A razão é
  calculada uma única vez a partir dos valores financeiros oficiais, com
  precisão DECIMAL suficiente, e persistida na representação decimal usada
  pelo sistema.

  Escopo exclusivo: dbo.lancamentos.id = 195, coluna percentual_atingido.
  Nenhum valor financeiro, status, situação, versão, data ou registro de
  governança é alterado.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 51501, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @lancamentoId NVARCHAR(100) = N'195';
    DECLARE @meta DECIMAL(19, 2) = CAST(2142991572.00 AS DECIMAL(19, 2));
    DECLARE @realizado DECIMAL(19, 2) = CAST(2253033146.00 AS DECIMAL(19, 2));
    DECLARE @percentualExato DECIMAL(38, 18);
    DECLARE @linhasAlteradas INT;

    SET @percentualExato = CAST(@realizado / NULLIF(@meta, 0) AS DECIMAL(38, 18));

    IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
        THROW 51502, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON t.user_type_id = c.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.lancamentos')
          AND c.name = N'percentual_atingido'
          AND t.name = N'nvarchar'
          AND c.max_length >= 100
    )
        THROW 51503, 'Pré-condição inválida: percentual_atingido não comporta a precisão necessária.', 1;

    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @lancamentoId
          AND indicador_id = N'17'
          AND competencia = N'2026-03'
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = @meta
          AND TRY_CONVERT(DECIMAL(19, 2), resultado_oficial) = @realizado
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = @realizado
          AND percentual_atingido = N'1.05135'
          AND situacao = N'Atingido'
          AND status = N'Homologado'
          AND versao_atual = 1
    )
        THROW 51504, 'Pré-condição inválida: MAR/2026 diverge do diagnóstico autorizado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'198' AND indicador_id = N'17'
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(4545104157.26 AS DECIMAL(19, 2))
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = CAST(4615037076.03 AS DECIMAL(19, 2))
          AND percentual_atingido = N'1.01539'
          AND situacao = N'Atingido'
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'201' AND indicador_id = N'17'
          AND TRY_CONVERT(DECIMAL(19, 2), meta_referencia) = CAST(7165115749.39 AS DECIMAL(19, 2))
          AND TRY_CONVERT(DECIMAL(19, 2), JSON_VALUE(dados_entrada_json, '$.repasseSocialAcumuladoCompetencia')) = CAST(7095683438.69 AS DECIMAL(19, 2))
          AND CONVERT(DECIMAL(10, 2), TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) * 100) = CAST(99.03 AS DECIMAL(10, 2))
          AND situacao = N'Abaixo da meta'
    )
        THROW 51505, 'Pré-condição inválida: 2TRI ou 3TRI diverge do estado preservado.', 1;

    UPDATE dbo.lancamentos
    SET percentual_atingido = CONVERT(NVARCHAR(100), @percentualExato)
    WHERE id = @lancamentoId
      AND percentual_atingido = N'1.05135';
    SET @linhasAlteradas = @@ROWCOUNT;

    IF @linhasAlteradas <> 1
        THROW 51506, 'Validação falhou: quantidade de linhas alteradas diferente de 1.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) = @percentualExato
          AND CONVERT(DECIMAL(10, 2), @percentualExato * 100) = CAST(105.13 AS DECIMAL(10, 2))
    )
        THROW 51507, 'Validação falhou: percentual final de MAR/2026 não apresenta 105,13%.', 1;

    IF EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE id = @lancamentoId
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM #lancamentosAntes WHERE id = @lancamentoId
    ) OR EXISTS (
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM #lancamentosAntes WHERE id = @lancamentoId
        EXCEPT
        SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
               dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,situacao,status,
               observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
        FROM dbo.lancamentos WHERE id = @lancamentoId
    )
        THROW 51508, 'Validação falhou: outro campo do lançamento 195 foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId EXCEPT SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId)
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId EXCEPT SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId)
        THROW 51509, 'Validação falhou: outro lançamento foi alterado.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
        THROW 51510, 'Validação falhou: homologação ou evidência foi criada, alterada ou removida.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS resultado_transacao,
           @linhasAlteradas AS lancamentos_alterados,
           CONVERT(NVARCHAR(100), @percentualExato) AS percentual_atingido_final,
           CAST(105.13 AS DECIMAL(10, 2)) AS apresentacao_percentual;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
