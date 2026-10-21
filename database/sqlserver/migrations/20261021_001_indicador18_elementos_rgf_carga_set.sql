/*
  Indicador 18 — Princípios de Jogo Responsável (WLA)
  Carga controlada da posição oficial do 3TRI/2026 em setembro.

  Não altera schema, regra, curva, competências anteriores, evidências,
  retificações ou homologações.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadorId NVARCHAR(100) = N'18';
    DECLARE @competencia NVARCHAR(40) = N'2026-09';
    DECLARE @lancamentoId NVARCHAR(100);
    DECLARE @linhasAlteradas INT;
    DECLARE @homologacoesAntes INT = (SELECT COUNT(*) FROM dbo.homologacoes);
    DECLARE @retificacoesAntes INT = (SELECT COUNT(*) FROM dbo.retificacoes);
    DECLARE @evidenciasAntes INT = (SELECT COUNT(*) FROM dbo.evidencias);
    DECLARE @narrativa NVARCHAR(MAX) = N'Em setembro de 2026 foram incluídas na plataforma DigitalRG as informações relativas à submissão ao Responsible Gaming Framework (RGF/WLA) Nível 3.

Ao final do 3º trimestre, estavam atendidos 8 dos 10 elementos previstos para o exercício: 1, 2, 3, 4, 5, 8, 9 e 10, superando o quantitativo mínimo de 5 elementos esperado para o período.

Os elementos 6 — Publicidade, comunicação e marketing e 7 — Educação do jogador permanecem previstos para atendimento no decorrer do exercício.';
    DECLARE @referencia NVARCHAR(MAX) = N'Informe DILOT/GERIN 0078/2026 — Monitoramento PEI/PNI 3TRI/2026; submissão ao DigitalRG em setembro/2026.';
    DECLARE @dados NVARCHAR(MAX) = N'{"elementosRGFAtendidos":[{"elemento":"Pesquisa","status":"Concluída"},{"elemento":"Programa para empregados","status":"Concluída"},{"elemento":"Programa para revendedores","status":"Concluída"},{"elemento":"Desenho para jogos","status":"Concluída"},{"elemento":"Canais de jogos remotos","status":"Concluída"},{"elemento":"Orientação ao jogador para tratamento","status":"Concluída"},{"elemento":"Envolvimento das partes interessadas","status":"Concluída"},{"elemento":"Relatório de medições e riscos","status":"Concluída"}],"dataBaseApuracao":"2026-09-30"}';

    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND competencia = @competencia) <> 1
        THROW 51001, 'Pré-condição inválida: setembro/2026 do indicador 18 não é inequívoco.', 1;

    SELECT @lancamentoId = id
    FROM dbo.lancamentos
    WHERE indicador_id = @indicadorId AND competencia = @competencia;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND status IN (N'Não iniciado', N'Nao iniciado')
          AND versao_atual = 1
          AND TRY_CONVERT(DECIMAL(10, 4), meta_referencia) = CAST(5 AS DECIMAL(10, 4))
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

    UPDATE dbo.lancamentos
    SET dados_entrada_json = @dados,
        resultado_calculado = N'8',
        resultado_oficial = N'8',
        meta_referencia = N'5',
        percentual_atingido = N'1.6',
        situacao = N'Superado',
        status = N'Em preenchimento',
        observacao_unidade = @narrativa,
        referencia_evidencia = @referencia,
        evidencia_id = NULL,
        updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
    WHERE id = @lancamentoId;

    SET @linhasAlteradas = @@ROWCOUNT;

    IF @linhasAlteradas <> 1
        THROW 51006, 'Validação falhou: a carga não alterou exatamente um lançamento.', 1;

    DECLARE @elementosEsperados TABLE (elemento NVARCHAR(255) PRIMARY KEY);
    INSERT INTO @elementosEsperados (elemento) VALUES
        (N'Pesquisa'),
        (N'Programa para empregados'),
        (N'Programa para revendedores'),
        (N'Desenho para jogos'),
        (N'Canais de jogos remotos'),
        (N'Orientação ao jogador para tratamento'),
        (N'Envolvimento das partes interessadas'),
        (N'Relatório de medições e riscos');

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.lancamentos
        WHERE id = @lancamentoId
          AND ISJSON(dados_entrada_json) = 1
          AND JSON_VALUE(dados_entrada_json, '$.dataBaseApuracao') = N'2026-09-30'
          AND TRY_CONVERT(DECIMAL(10, 4), resultado_calculado) = CAST(8 AS DECIMAL(10, 4))
          AND TRY_CONVERT(DECIMAL(10, 4), resultado_oficial) = CAST(8 AS DECIMAL(10, 4))
          AND TRY_CONVERT(DECIMAL(10, 4), meta_referencia) = CAST(5 AS DECIMAL(10, 4))
          AND TRY_CONVERT(DECIMAL(10, 4), percentual_atingido) = CAST(1.6 AS DECIMAL(10, 4))
          AND situacao = N'Superado'
          AND status = N'Em preenchimento'
          AND versao_atual = 1
          AND evidencia_id IS NULL
          AND observacao_unidade = @narrativa
          AND referencia_evidencia = @referencia
    )
        THROW 51007, 'Validação falhou: os campos finais de setembro divergem do autorizado.', 1;

    IF (SELECT COUNT(*) FROM OPENJSON(@dados, '$.elementosRGFAtendidos')) <> 8
       OR (SELECT COUNT(DISTINCT elemento) FROM OPENJSON(@dados, '$.elementosRGFAtendidos') WITH (elemento NVARCHAR(255) '$.elemento')) <> 8
       OR EXISTS (
           SELECT 1
           FROM OPENJSON(@dados, '$.elementosRGFAtendidos')
           WITH (elemento NVARCHAR(255) '$.elemento', status NVARCHAR(100) '$.status')
           WHERE status NOT IN (N'Concluída', N'Homologada') OR elemento IS NULL
       )
       OR EXISTS (
           SELECT elemento FROM @elementosEsperados
           EXCEPT
           SELECT elemento FROM OPENJSON(@dados, '$.elementosRGFAtendidos') WITH (elemento NVARCHAR(255) '$.elemento')
       )
       OR EXISTS (
           SELECT elemento FROM OPENJSON(@dados, '$.elementosRGFAtendidos') WITH (elemento NVARCHAR(255) '$.elemento')
           EXCEPT
           SELECT elemento FROM @elementosEsperados
       )
        THROW 51008, 'Validação falhou: coleção de elementos inválida, incompleta ou duplicada.', 1;

    IF EXISTS (
        SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId
        EXCEPT
        SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId
    ) OR EXISTS (
        SELECT * FROM #lancamentosAntes WHERE id <> @lancamentoId
        EXCEPT
        SELECT * FROM dbo.lancamentos WHERE id <> @lancamentoId
    )
        THROW 51009, 'Validação falhou: outro lançamento foi alterado.', 1;

    IF (SELECT COUNT(*) FROM dbo.homologacoes) <> @homologacoesAntes
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id = @lancamentoId)
        THROW 51010, 'Validação falhou: homologação criada ou alterada.', 1;

    IF (SELECT COUNT(*) FROM dbo.retificacoes) <> @retificacoesAntes
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id = @lancamentoId)
        THROW 51011, 'Validação falhou: retificação criada ou alterada.', 1;

    IF (SELECT COUNT(*) FROM dbo.evidencias) <> @evidenciasAntes
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id = @lancamentoId)
        THROW 51012, 'Validação falhou: evidência física criada ou alterada.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS resultado_transacao,
        @linhasAlteradas AS registros_alterados,
        id,
        competencia,
        status,
        versao_atual,
        resultado_calculado,
        meta_referencia,
        percentual_atingido,
        situacao,
        evidencia_id,
        dados_entrada_json
    FROM dbo.lancamentos
    WHERE id = @lancamentoId;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
