SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
  Indicador 14 — Gestores Negros, Amarelos, Pardos ou Indígenas e/ou PcD.

  Escopo controlado:
  - ativa, somente na regra 14, o arredondamento do resultado percentual antes
    do cálculo do atingimento;
  - preenche agosto e setembro/2026 como rascunhos "Em preenchimento";
  - não altera janeiro a julho, homologações, retificações ou evidências;
  - não cria evidência física e não envia lançamentos para homologação.
*/

IF DB_NAME() <> N'Estrategia'
    THROW 50001, 'Migration deve ser executada exclusivamente no banco Estrategia.', 1;

DECLARE @indicadorId NVARCHAR(100) = N'14';
DECLARE @nomeIndicador NVARCHAR(255) = N'Gestores Negros, Amarelos, Pardos ou Indígenas e/ou PcD';
DECLARE @referencia NVARCHAR(MAX) = N'Fonte: INFOPESSOAS — posição mensal de gestores enquadrados nos grupos de diversidade/PcD.';
DECLARE @resultado NVARCHAR(100) = N'0.2609';
DECLARE @atingimento NVARCHAR(100) = N'0.745428571429';
DECLARE @agora NVARCHAR(40) = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127);

BEGIN TRY
    BEGIN TRANSACTION;

    IF (
        SELECT COUNT(*)
        FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND numero = 14
          AND nome = @nomeIndicador
          AND unidade_apuradora = N'SUCTF'
          AND diretoria_responsavel = N'DIFIR'
          AND unidade_medida = N'percentual'
          AND tipo_calculo = N'percentual_direto'
          AND ativo = 1
    ) <> 1
        THROW 50002, 'Indicador 14 não localizado de forma canônica e inequívoca.', 1;

    DECLARE @regras NVARCHAR(MAX);
    SELECT @regras = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'regrasIndicadores';

    IF ISJSON(@regras) <> 1
        THROW 50003, 'Configuração regrasIndicadores ausente ou inválida.', 1;

    DECLARE @indiceRegra INT;
    DECLARE @regra14Antes NVARCHAR(MAX);
    SELECT
        @indiceRegra = TRY_CONVERT(INT, [key]),
        @regra14Antes = value
    FROM OPENJSON(@regras)
    WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.indicadorId')) = 14;

    IF @indiceRegra IS NULL OR (
        SELECT COUNT(*) FROM OPENJSON(@regras)
        WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.indicadorId')) = 14
    ) <> 1
        THROW 50004, 'Regra do indicador 14 ausente ou ambígua.', 1;

    IF JSON_VALUE(@regra14Antes, '$.tipoCalculo') <> N'percentual_direto'
       OR TRY_CONVERT(DECIMAL(10,4), JSON_VALUE(@regra14Antes, '$.metaAnualValor')) <> CAST(0.35 AS DECIMAL(10,4))
       OR JSON_VALUE(@regra14Antes, '$.parametrosCalculo.numeradorCampo') <> N'gestoresEnquadradosMes'
       OR JSON_VALUE(@regra14Antes, '$.parametrosCalculo.denominadorCampo') <> N'totalGestoresMes'
        THROW 50005, 'Regra atual do indicador 14 diverge das pré-condições aprovadas.', 1;

    DECLARE @regra13Antes NVARCHAR(MAX) = (
        SELECT value FROM OPENJSON(@regras)
        WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.indicadorId')) = 13
    );

    IF @regra13Antes IS NULL
        THROW 50006, 'Regra do indicador Mulheres Gestoras não encontrada para validação de isolamento.', 1;

    DECLARE @historicoEsperado TABLE (
        id NVARCHAR(100) PRIMARY KEY,
        mes INT NOT NULL,
        numerador INT NOT NULL,
        denominador INT NOT NULL,
        data_base NVARCHAR(10) NOT NULL
    );
    INSERT INTO @historicoEsperado (id, mes, numerador, denominador, data_base)
    VALUES
        (N'157', 1,  9, 33, N'2026-02-02'),
        (N'158', 2, 11, 42, N'2026-03-03'),
        (N'159', 3, 11, 43, N'2026-04-01'),
        (N'160', 4, 11, 43, N'2026-05-01'),
        (N'161', 5, 12, 45, N'2026-06-01'),
        (N'162', 6, 11, 46, N'2026-07-01'),
        (N'163', 7, 12, 46, N'2026-08-01');

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos AS l WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN @historicoEsperado AS e ON e.id = l.id AND e.mes = l.mes
        WHERE l.indicador_id = @indicadorId
          AND l.ano = 2026
          AND l.competencia = CONCAT(N'2026-', RIGHT(N'0' + CONVERT(NVARCHAR(2), e.mes), 2))
          AND l.status = N'Homologado'
          AND TRY_CONVERT(INT, JSON_VALUE(l.dados_entrada_json, '$.gestoresEnquadradosMes')) = e.numerador
          AND TRY_CONVERT(INT, JSON_VALUE(l.dados_entrada_json, '$.totalGestoresMes')) = e.denominador
          AND JSON_VALUE(l.dados_entrada_json, '$.dataBaseApuracao') = e.data_base
    ) <> 7
        THROW 50007, 'Janeiro a julho não correspondem ao histórico aprovado; execução interrompida.', 1;

    DECLARE @janJulAntes NVARCHAR(MAX) = (
        SELECT l.*
        FROM dbo.lancamentos AS l
        WHERE l.indicador_id = @indicadorId AND l.ano = 2026 AND l.mes BETWEEN 1 AND 7
        ORDER BY l.mes
        FOR JSON PATH, INCLUDE_NULL_VALUES
    );
    DECLARE @homologacoesAntes INT = (
        SELECT COUNT(*)
        FROM dbo.homologacoes AS h
        INNER JOIN dbo.lancamentos AS l ON l.id = h.lancamento_id
        WHERE l.indicador_id = @indicadorId AND l.ano = 2026 AND l.mes BETWEEN 1 AND 9
    );
    DECLARE @evidenciasAntes INT = (
        SELECT COUNT(*)
        FROM dbo.evidencias AS e
        INNER JOIN dbo.lancamentos AS l ON l.id = e.lancamento_id
        WHERE l.indicador_id = @indicadorId AND l.ano = 2026 AND l.mes BETWEEN 1 AND 9
    );
    DECLARE @retificacoesAntes INT = (
        SELECT COUNT(*)
        FROM dbo.retificacoes AS r
        INNER JOIN dbo.lancamentos AS l ON l.id = r.lancamento_id
        WHERE l.indicador_id = @indicadorId AND l.ano = 2026 AND l.mes BETWEEN 1 AND 9
    );

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos AS l WITH (UPDLOCK, HOLDLOCK)
        WHERE l.indicador_id = @indicadorId
          AND l.ano = 2026
          AND ((l.id = N'164' AND l.mes = 8 AND l.competencia = N'2026-08')
            OR (l.id = N'165' AND l.mes = 9 AND l.competencia = N'2026-09'))
          AND l.status = N'Não iniciado'
          AND (l.dados_entrada_json = N'[]' OR l.dados_entrada_json IS NULL)
          AND l.resultado_calculado IS NULL
          AND l.resultado_oficial IS NULL
          AND l.meta_referencia IS NULL
          AND l.percentual_atingido IS NULL
          AND l.situacao IS NULL
          AND l.evidencia_id IS NULL
          AND l.versao_atual = 1
    ) <> 2
        THROW 50008, 'Agosto e setembro não estão no estado vazio esperado; nenhuma carga foi aplicada.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'164', N'165')
    ) OR EXISTS (
        SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'164', N'165')
    ) OR EXISTS (
        SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'164', N'165')
    )
        THROW 50009, 'Agosto ou setembro já possuem governança/evidência associada; execução interrompida.', 1;

    /* SQL Server 2016 exige literal no argumento path de JSON_MODIFY. O índice
       continua sendo descoberto e validado; somente o comando é materializado. */
    DECLARE @sqlRegra NVARCHAR(MAX) = N'
        SET @regrasSaida = JSON_MODIFY(
            JSON_MODIFY(
                @regrasEntrada,
                ''$[' + CONVERT(NVARCHAR(10), @indiceRegra) + N'].parametrosCalculo.arredondarResultadoAntesAtingimento'',
                CAST(1 AS BIT)
            ),
            ''$[' + CONVERT(NVARCHAR(10), @indiceRegra) + N'].parametrosCalculo.casasDecimaisResultadoPercentual'',
            2
        );';
    EXEC sys.sp_executesql
        @sqlRegra,
        N'@regrasEntrada NVARCHAR(MAX), @regrasSaida NVARCHAR(MAX) OUTPUT',
        @regrasEntrada = @regras,
        @regrasSaida = @regras OUTPUT;

    UPDATE dbo.configuracoes
    SET valor_json = @regras,
        updated_at = @agora
    WHERE chave = N'regrasIndicadores';

    IF @@ROWCOUNT <> 1
        THROW 50010, 'Não foi possível atualizar exclusivamente a configuração regrasIndicadores.', 1;

    UPDATE dbo.lancamentos
    SET dados_entrada_json = CASE id
            WHEN N'164' THEN N'{"gestoresEnquadradosMes":12,"totalGestoresMes":46,"dataBaseApuracao":"2026-09-01"}'
            WHEN N'165' THEN N'{"gestoresEnquadradosMes":12,"totalGestoresMes":46,"dataBaseApuracao":"2026-10-01"}'
        END,
        resultado_calculado = @resultado,
        resultado_oficial = @resultado,
        meta_referencia = N'0.35',
        percentual_atingido = @atingimento,
        situacao = N'Abaixo da meta',
        status = N'Em preenchimento',
        referencia_evidencia = @referencia,
        evidencia_id = NULL,
        usuario_responsavel = COALESCE(usuario_responsavel, N'MIGRACAO-20261020-003'),
        updated_at = @agora
    WHERE indicador_id = @indicadorId
      AND ano = 2026
      AND id IN (N'164', N'165')
      AND status = N'Não iniciado';

    IF @@ROWCOUNT <> 2
        THROW 50011, 'A carga não alterou exatamente os dois lançamentos autorizados.', 1;

    DECLARE @regra14Depois NVARCHAR(MAX) = (
        SELECT value FROM OPENJSON(@regras)
        WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.indicadorId')) = 14
    );
    DECLARE @regra13Depois NVARCHAR(MAX) = (
        SELECT value FROM OPENJSON(@regras)
        WHERE TRY_CONVERT(INT, JSON_VALUE(value, '$.indicadorId')) = 13
    );

    IF JSON_VALUE(@regra14Depois, '$.parametrosCalculo.arredondarResultadoAntesAtingimento') <> N'true'
       OR TRY_CONVERT(INT, JSON_VALUE(@regra14Depois, '$.parametrosCalculo.casasDecimaisResultadoPercentual')) <> 2
        THROW 50012, 'Parâmetros de arredondamento não foram persistidos corretamente.', 1;

    IF @regra13Depois <> @regra13Antes
        THROW 50013, 'A regra de Mulheres Gestoras foi alterada indevidamente.', 1;

    DECLARE @janJulDepois NVARCHAR(MAX) = (
        SELECT l.*
        FROM dbo.lancamentos AS l
        WHERE l.indicador_id = @indicadorId AND l.ano = 2026 AND l.mes BETWEEN 1 AND 7
        ORDER BY l.mes
        FOR JSON PATH, INCLUDE_NULL_VALUES
    );

    IF @janJulDepois <> @janJulAntes
        THROW 50014, 'Janeiro a julho foram alterados indevidamente.', 1;

    IF (
        SELECT COUNT(*)
        FROM dbo.lancamentos
        WHERE indicador_id = @indicadorId
          AND ano = 2026
          AND id IN (N'164', N'165')
          AND status = N'Em preenchimento'
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.gestoresEnquadradosMes')) = 12
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.totalGestoresMes')) = 46
          AND TRY_CONVERT(DECIMAL(10,4), resultado_calculado) = CAST(0.2609 AS DECIMAL(10,4))
          AND TRY_CONVERT(DECIMAL(10,4), resultado_oficial) = CAST(0.2609 AS DECIMAL(10,4))
          AND TRY_CONVERT(DECIMAL(10,4), meta_referencia) = CAST(0.35 AS DECIMAL(10,4))
          AND TRY_CONVERT(DECIMAL(19,12), percentual_atingido) = CAST(0.745428571429 AS DECIMAL(19,12))
          AND situacao = N'Abaixo da meta'
          AND referencia_evidencia = @referencia
          AND evidencia_id IS NULL
          AND versao_atual = 1
    ) <> 2
        THROW 50015, 'Validação final dos rascunhos de agosto e setembro falhou.', 1;

    IF JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id = N'164'), '$.dataBaseApuracao') <> N'2026-09-01'
       OR JSON_VALUE((SELECT dados_entrada_json FROM dbo.lancamentos WHERE id = N'165'), '$.dataBaseApuracao') <> N'2026-10-01'
        THROW 50016, 'Datas-base finais divergentes da convenção histórica confirmada.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes AS h INNER JOIN dbo.lancamentos AS l ON l.id=h.lancamento_id WHERE l.indicador_id=@indicadorId AND l.ano=2026 AND l.mes BETWEEN 1 AND 9) <> @homologacoesAntes
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'164', N'165'))
        THROW 50017, 'Homologações foram alteradas ou criadas indevidamente.', 1;

    IF (SELECT COUNT(*) FROM dbo.evidencias AS e INNER JOIN dbo.lancamentos AS l ON l.id=e.lancamento_id WHERE l.indicador_id=@indicadorId AND l.ano=2026 AND l.mes BETWEEN 1 AND 9) <> @evidenciasAntes
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'164', N'165'))
        THROW 50018, 'Evidências físicas foram alteradas ou vinculadas indevidamente.', 1;

    IF (SELECT COUNT(*) FROM dbo.retificacoes AS r INNER JOIN dbo.lancamentos AS l ON l.id=r.lancamento_id WHERE l.indicador_id=@indicadorId AND l.ano=2026 AND l.mes BETWEEN 1 AND 9) <> @retificacoesAntes
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'164', N'165'))
        THROW 50019, 'Retificações foram alteradas ou criadas indevidamente.', 1;

    IF (
        SELECT MAX(mes) FROM dbo.lancamentos
        WHERE indicador_id = @indicadorId AND ano = 2026 AND mes BETWEEN 7 AND 9 AND status = N'Homologado'
    ) <> 7
        THROW 50020, 'A posição oficial do 3TRI deixou de ser julho.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS transacao,
        1 AS regras_alteradas,
        2 AS lancamentos_alterados,
        0 AS homologacoes_criadas,
        0 AS evidencias_fisicas_criadas,
        7 AS posicao_oficial_3tri_mes,
        1 AS meses_homologados_3tri;

    SELECT
        id,
        competencia,
        dados_entrada_json,
        resultado_calculado,
        meta_referencia,
        percentual_atingido,
        situacao,
        status,
        referencia_evidencia,
        evidencia_id,
        versao_atual
    FROM dbo.lancamentos
    WHERE id IN (N'164', N'165')
    ORDER BY mes;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
