/*
  Indicador 21 — Jogo Responsável 2026 (Capacitação e Disseminação)
  - configura a apresentação documental publicada do 2TRI/2026;
  - preserva o cálculo técnico contra a meta anual de 90%;
  - carrega somente setembro/2026, sem homologar e sem evidência física.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'21';
    DECLARE @competencia NVARCHAR(40) = N'2026-09';
    DECLARE @lancamentoId NVARCHAR(100);
    DECLARE @regraIndex INT;
    DECLARE @regraAtual NVARCHAR(MAX);
    DECLARE @regraNova NVARCHAR(MAX);
    DECLARE @configuracaoAtual NVARCHAR(MAX);
    DECLARE @configuracaoNova NVARCHAR(MAX);
    DECLARE @linhasLancamento INT;
    DECLARE @linhasConfiguracao INT;
    DECLARE @resultado DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), CAST(99 AS DECIMAL(18, 0)) / CAST(171 AS DECIMAL(18, 0)));
    DECLARE @atingimento DECIMAL(38, 18) = CONVERT(DECIMAL(38, 18), (CAST(99 AS DECIMAL(18, 0)) / CAST(171 AS DECIMAL(18, 0))) / CAST(0.90 AS DECIMAL(3, 2)));
    DECLARE @iniciativas NVARCHAR(MAX) = N'Curso na Universidade CAIXA; Capacitação em Jogo Responsável, realizada em maio/2026; Capacitação em Design de Jogos — GamGard, realizada em junho/2026.';
    DECLARE @observacao NVARCHAR(MAX) = N'Em setembro, novas conclusões do curso na Universidade CAIXA ampliaram o número de empregados que cumpriram o requisito de participação em pelo menos duas ações.';
    DECLARE @referencia NVARCHAR(MAX) = N'Informe oficial do 3TRI/2026 — 99 de 171 empregados cumpriram o requisito de participação em pelo menos duas iniciativas de disseminação de Jogo Responsável até 30/09/2026.';
    DECLARE @dados NVARCHAR(MAX);
    DECLARE @apresentacao2Tri NVARCHAR(MAX) = N'{"2TRI/2026":{"metaIntermediariaAplicavel":false,"metaOficialReportada":0,"resultadoOficialReportado":0.6685,"percentualAtingidoOficialReportado":0.6685,"situacaoOficial":"No prazo","observacao":"Sem meta intermediária vinculante no período."}}';

    SELECT @dados = (
        SELECT
            CAST(171 AS INT) AS publicoAlvoElegivelJR,
            CAST(99 AS INT) AS empregadosCapacitadosJR,
            CAST(2 AS INT) AS quantidadeMinimaIniciativasJR,
            @iniciativas AS iniciativasConsideradasJR,
            N'2026-09-30' AS dataBaseApuracaoJR,
            @referencia AS fonteEvidenciaJR,
            @observacao AS observacaoArea
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;

    DECLARE @homologacoesAntes INT = (SELECT COUNT(*) FROM dbo.homologacoes);
    DECLARE @retificacoesAntes INT = (SELECT COUNT(*) FROM dbo.retificacoes);
    DECLARE @evidenciasAntes INT = (SELECT COUNT(*) FROM dbo.evidencias);

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND competencia = @competencia) <> 1
        THROW 51001, 'Pré-condição inválida: setembro/2026 do indicador 21 não é inequívoco.', 1;

    SELECT @lancamentoId = id
    FROM dbo.lancamentos
    WHERE indicador_id = @indicadorId AND competencia = @competencia;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND status IN (N'Não iniciado', N'Nao iniciado')
          AND versao_atual = 1
          AND TRY_CONVERT(DECIMAL(18, 8), meta_referencia) = CAST(0.90 AS DECIMAL(18, 8))
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL
          AND situacao IS NULL
          AND evidencia_id IS NULL
          AND (dados_entrada_json = N'[]' OR dados_entrada_json IS NULL)
    )
        THROW 51002, 'Pré-condição inválida: setembro já possui conteúdo ou estado divergente.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id = @lancamentoId)
        THROW 51003, 'Pré-condição inválida: setembro já possui homologação.', 1;

    IF EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id = @lancamentoId)
        THROW 51004, 'Pré-condição inválida: setembro já possui retificação.', 1;

    IF EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id = @lancamentoId)
        THROW 51005, 'Pré-condição inválida: setembro já possui evidência física.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WHERE chave = N'regrasIndicadores') <> 1
        THROW 51006, 'Pré-condição inválida: configuração regrasIndicadores ausente ou duplicada.', 1;

    SELECT @configuracaoAtual = valor_json
    FROM dbo.configuracoes
    WHERE chave = N'regrasIndicadores';

    IF ISJSON(@configuracaoAtual) <> 1
        THROW 51007, 'Pré-condição inválida: regrasIndicadores não contém JSON válido.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@configuracaoAtual) WHERE JSON_VALUE(value, '$.indicadorId') = N'21') <> 1
        THROW 51008, 'Pré-condição inválida: regra do indicador 21 ausente ou ambígua.', 1;

    SELECT
        @regraIndex = TRY_CONVERT(INT, [key]),
        @regraAtual = value
    FROM OPENJSON(@configuracaoAtual)
    WHERE JSON_VALUE(value, '$.indicadorId') = N'21';

    IF JSON_VALUE(@regraAtual, '$.tipoCalculo') <> N'cobertura_capacitacao_jogo_responsavel'
       OR JSON_VALUE(@regraAtual, '$.parametrosCalculo.metaCobertura') <> N'0.9'
       OR JSON_VALUE(@regraAtual, '$.metaAnualValor') <> N'0.9'
        THROW 51009, 'Pré-condição inválida: regra técnica ou meta anual do indicador 21 divergem do esperado.', 1;

    SET @regraNova = JSON_MODIFY(
        @regraAtual,
        '$.parametrosCalculo.mesesFechamentoTrimestral',
        JSON_QUERY(N'[3,6,9,12]')
    );
    SET @regraNova = JSON_MODIFY(
        @regraNova,
        '$.parametrosCalculo.apresentacoesOficiaisTrimestrais',
        JSON_QUERY(@apresentacao2Tri)
    );

    DECLARE @sqlSubstituirRegra NVARCHAR(MAX) = CONCAT(
        N'SET @saida = JSON_MODIFY(@entrada, ''$[',
        CONVERT(NVARCHAR(10), @regraIndex),
        N']'', JSON_QUERY(@regra));'
    );
    EXEC sys.sp_executesql
        @sqlSubstituirRegra,
        N'@entrada NVARCHAR(MAX), @regra NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
        @entrada = @configuracaoAtual,
        @regra = @regraNova,
        @saida = @configuracaoNova OUTPUT;

    UPDATE dbo.configuracoes
    SET valor_json = @configuracaoNova,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE chave = N'regrasIndicadores';

    SET @linhasConfiguracao = @@ROWCOUNT;

    IF @linhasConfiguracao <> 1
        THROW 51010, 'Validação falhou: a configuração documental não alterou exatamente uma linha.', 1;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dados,
        resultado_calculado = CONVERT(NVARCHAR(100), @resultado),
        resultado_oficial = CONVERT(NVARCHAR(100), @resultado),
        meta_referencia = N'0.9',
        percentual_atingido = CONVERT(NVARCHAR(100), @atingimento),
        situacao = N'Abaixo da meta',
        status = N'Em preenchimento',
        observacao_unidade = @observacao,
        referencia_evidencia = @referencia,
        evidencia_id = NULL,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE id = @lancamentoId;

    SET @linhasLancamento = @@ROWCOUNT;

    IF @linhasLancamento <> 1
        THROW 51011, 'Validação falhou: a carga não alterou exatamente um lançamento.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND status = N'Em preenchimento'
          AND versao_atual = 1
          AND evidencia_id IS NULL
          AND ISJSON(dados_entrada_json) = 1
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.publicoAlvoElegivelJR')) = 171
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.empregadosCapacitadosJR')) = 99
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.quantidadeMinimaIniciativasJR')) = 2
          AND JSON_VALUE(dados_entrada_json, '$.dataBaseApuracaoJR') = N'2026-09-30'
          AND JSON_VALUE(dados_entrada_json, '$.iniciativasConsideradasJR') = @iniciativas
          AND JSON_VALUE(dados_entrada_json, '$.fonteEvidenciaJR') = @referencia
          AND JSON_VALUE(dados_entrada_json, '$.observacaoArea') = @observacao
          AND ABS(TRY_CONVERT(DECIMAL(38, 18), resultado_calculado) - @resultado) <= CAST(0.000000000000001 AS DECIMAL(38, 18))
          AND ABS(TRY_CONVERT(DECIMAL(38, 18), resultado_oficial) - @resultado) <= CAST(0.000000000000001 AS DECIMAL(38, 18))
          AND TRY_CONVERT(DECIMAL(18, 8), meta_referencia) = CAST(0.90 AS DECIMAL(18, 8))
          AND ABS(TRY_CONVERT(DECIMAL(38, 18), percentual_atingido) - @atingimento) <= CAST(0.000000000000001 AS DECIMAL(38, 18))
          AND situacao = N'Abaixo da meta'
          AND observacao_unidade = @observacao
          AND referencia_evidencia = @referencia
    )
        THROW 51012, 'Validação falhou: os campos finais de setembro divergem do autorizado.', 1;

    IF ABS(@resultado - CONVERT(DECIMAL(38, 18), CAST(99 AS DECIMAL(18, 0)) / CAST(171 AS DECIMAL(18, 0)))) > CAST(0.000000000000001 AS DECIMAL(38, 18))
       OR ABS(@atingimento - (@resultado / CAST(0.90 AS DECIMAL(38, 18)))) > CAST(0.000000000000001 AS DECIMAL(38, 18))
       OR CAST(ROUND(@resultado * 100, 2) AS DECIMAL(10, 2)) <> CAST(57.89 AS DECIMAL(10, 2))
       OR CAST(ROUND(@atingimento * 100, 2) AS DECIMAL(10, 2)) <> CAST(64.33 AS DECIMAL(10, 2))
        THROW 51013, 'Validação falhou: resultado ou atingimento de setembro estão incorretos.', 1;

    IF TRY_CONVERT(DECIMAL(18, 8), JSON_VALUE(@regraNova, '$.parametrosCalculo.metaCobertura')) <> CAST(0.90 AS DECIMAL(18, 8))
       OR TRY_CONVERT(DECIMAL(18, 8), JSON_VALUE(@regraNova, '$.metaAnualValor')) <> CAST(0.90 AS DECIMAL(18, 8))
       OR TRY_CONVERT(DECIMAL(18, 8), JSON_VALUE(@regraNova, '$.parametrosCalculo.apresentacoesOficiaisTrimestrais."2TRI/2026".metaOficialReportada')) <> CAST(0 AS DECIMAL(18, 8))
       OR TRY_CONVERT(DECIMAL(18, 8), JSON_VALUE(@regraNova, '$.parametrosCalculo.apresentacoesOficiaisTrimestrais."2TRI/2026".resultadoOficialReportado')) <> CAST(0.6685 AS DECIMAL(18, 8))
       OR TRY_CONVERT(DECIMAL(18, 8), JSON_VALUE(@regraNova, '$.parametrosCalculo.apresentacoesOficiaisTrimestrais."2TRI/2026".percentualAtingidoOficialReportado')) <> CAST(0.6685 AS DECIMAL(18, 8))
       OR JSON_VALUE(@regraNova, '$.parametrosCalculo.apresentacoesOficiaisTrimestrais."2TRI/2026".situacaoOficial') <> N'No prazo'
        THROW 51014, 'Validação falhou: apresentação oficial do 2TRI ou meta técnica foi alterada incorretamente.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId
    )
        THROW 51015, 'Validação falhou: outro lançamento foi alterado.', 1;

    IF EXISTS (
        SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores'
        EXCEPT
        SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores'
    ) OR EXISTS (
        SELECT * FROM #configuracoesAntes WHERE chave <> N'regrasIndicadores'
        EXCEPT
        SELECT * FROM dbo.configuracoes WHERE chave <> N'regrasIndicadores'
    )
        THROW 51016, 'Validação falhou: outra configuração foi alterada.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes) <> @homologacoesAntes
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id = @lancamentoId)
        THROW 51017, 'Validação falhou: homologação criada ou alterada.', 1;

    IF (SELECT COUNT(*) FROM dbo.retificacoes) <> @retificacoesAntes
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id = @lancamentoId)
        THROW 51018, 'Validação falhou: retificação criada ou alterada.', 1;

    IF (SELECT COUNT(*) FROM dbo.evidencias) <> @evidenciasAntes
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id = @lancamentoId)
        THROW 51019, 'Validação falhou: evidência física criada ou alterada.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @linhasLancamento AS lancamentos_alterados,
        @linhasConfiguracao AS configuracoes_alteradas,
        l.id,
        l.competencia,
        l.status,
        l.versao_atual,
        l.resultado_calculado,
        l.meta_referencia,
        l.percentual_atingido,
        l.situacao,
        l.evidencia_id,
        l.dados_entrada_json
    FROM dbo.lancamentos l
    WHERE l.id = @lancamentoId;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
