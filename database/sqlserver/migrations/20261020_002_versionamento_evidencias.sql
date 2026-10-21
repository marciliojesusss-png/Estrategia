/*
  Versionamento estrutural de evidencias de lancamentos.

  Reconciliacao:
  - versao inicial = 1;
  - cada reabertura formal cria a versao seguinte;
  - homologacoes e a fonte primaria dos eventos;
  - auditoria complementa eventos legados sem homologacao equivalente;
  - datas invalidas, eventos duplicados e historicos incompletos interrompem a migration.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 51200, 'Migration permitida somente no banco Estrategia.', 1;

IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
   OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
   OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
   OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
   OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
    THROW 51201, 'Estrutura obrigatoria de lancamentos/evidencias nao encontrada.', 1;

BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.lancamentos', N'versao_atual') IS NULL
        ALTER TABLE dbo.lancamentos ADD versao_atual INT NULL;

    IF COL_LENGTH(N'dbo.evidencias', N'versao_lancamento') IS NULL
        ALTER TABLE dbo.evidencias ADD versao_lancamento INT NULL;

    IF COL_LENGTH(N'dbo.retificacoes', N'versao_anterior') IS NULL
        ALTER TABLE dbo.retificacoes ADD versao_anterior INT NULL;

    IF COL_LENGTH(N'dbo.retificacoes', N'versao_nova') IS NULL
        ALTER TABLE dbo.retificacoes ADD versao_nova INT NULL;

GO

BEGIN TRY
    DECLARE @lancamentos_antes INT = (SELECT COUNT(*) FROM dbo.lancamentos);
    DECLARE @evidencias_antes INT = (SELECT COUNT(*) FROM dbo.evidencias);
    DECLARE @homologacoes_antes INT = (SELECT COUNT(*) FROM dbo.homologacoes);
    DECLARE @retificacoes_antes INT = (SELECT COUNT(*) FROM dbo.retificacoes);

    SELECT id, status
    INTO #status_lancamentos_antes
    FROM dbo.lancamentos;

    CREATE TABLE #reaberturas (
        lancamento_id NVARCHAR(100) NOT NULL,
        acao NVARCHAR(100) NOT NULL,
        data_evento DATETIMEOFFSET(0) NOT NULL,
        origem NVARCHAR(20) NOT NULL
    );

    IF EXISTS (
        SELECT 1
        FROM dbo.homologacoes
        WHERE acao IN (N'lancamento_reaberto', N'reabertura_excepcional_pos_fechamento_ca')
          AND TRY_CONVERT(DATETIMEOFFSET(0), data_acao, 127) IS NULL
    )
        THROW 51202, 'Ha reabertura em homologacoes com data invalida.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.auditoria
        WHERE entidade = N'lancamentos'
          AND acao IN (N'lancamento_reaberto', N'reabertura_excepcional_pos_fechamento_ca')
          AND TRY_CONVERT(DATETIMEOFFSET(0), data_acao, 127) IS NULL
    )
        THROW 51203, 'Ha reabertura em auditoria com data invalida.', 1;

    INSERT INTO #reaberturas (lancamento_id, acao, data_evento, origem)
    SELECT h.lancamento_id, h.acao, TRY_CONVERT(DATETIMEOFFSET(0), h.data_acao, 127), N'homologacoes'
    FROM dbo.homologacoes AS h
    WHERE h.acao IN (N'lancamento_reaberto', N'reabertura_excepcional_pos_fechamento_ca');

    INSERT INTO #reaberturas (lancamento_id, acao, data_evento, origem)
    SELECT a.entidade_id, a.acao, TRY_CONVERT(DATETIMEOFFSET(0), a.data_acao, 127), N'auditoria'
    FROM dbo.auditoria AS a
    WHERE a.entidade = N'lancamentos'
      AND a.acao IN (N'lancamento_reaberto', N'reabertura_excepcional_pos_fechamento_ca')
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.homologacoes AS h
          WHERE h.lancamento_id = a.entidade_id
            AND h.acao = a.acao
            AND h.acao IN (N'lancamento_reaberto', N'reabertura_excepcional_pos_fechamento_ca')
            AND ABS(DATEDIFF(SECOND,
                TRY_CONVERT(DATETIMEOFFSET(0), h.data_acao, 127),
                TRY_CONVERT(DATETIMEOFFSET(0), a.data_acao, 127))) <= 10
      );

    IF EXISTS (SELECT 1 FROM #reaberturas r LEFT JOIN dbo.lancamentos l ON l.id=r.lancamento_id WHERE l.id IS NULL)
        THROW 51204, 'Ha evento de reabertura sem lancamento correspondente.', 1;

    IF EXISTS (
        SELECT lancamento_id, data_evento
        FROM #reaberturas
        GROUP BY lancamento_id, data_evento
        HAVING COUNT(*) > 1
    )
        THROW 51205, 'Ha eventos de reabertura duplicados ou ambiguos.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.evidencias AS e
        WHERE e.versao_lancamento IS NULL
          AND EXISTS (SELECT 1 FROM #reaberturas r WHERE r.lancamento_id=e.lancamento_id)
          AND TRY_CONVERT(DATETIMEOFFSET(0), e.data_upload, 127) IS NULL
    )
        THROW 51206, 'Ha evidencia sem data valida em lancamento historicamente reaberto.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.evidencias AS e
        INNER JOIN #reaberturas AS r ON r.lancamento_id=e.lancamento_id
        WHERE e.versao_lancamento IS NULL
          AND TRY_CONVERT(DATETIMEOFFSET(0), e.data_upload, 127)=r.data_evento
    )
        THROW 51207, 'Ha evidencia anexada no mesmo instante de uma reabertura; conciliacao manual necessaria.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.retificacoes AS t
        WHERE (t.versao_anterior IS NULL OR t.versao_nova IS NULL)
          AND (
              TRY_CONVERT(DATETIMEOFFSET(0), t.data_retificacao, 127) IS NULL
              OR NOT EXISTS (
                  SELECT 1 FROM #reaberturas r
                  WHERE r.lancamento_id=t.lancamento_id
                    AND r.data_evento<=TRY_CONVERT(DATETIMEOFFSET(0), t.data_retificacao, 127)
              )
          )
    )
        THROW 51208, 'Ha retificacao sem reabertura historica inequivoca.', 1;

    UPDATE l
    SET versao_atual = 1 + (
        SELECT COUNT(*) FROM #reaberturas r WHERE r.lancamento_id=l.id
    )
    FROM dbo.lancamentos AS l
    WHERE l.versao_atual IS NULL;

    UPDATE e
    SET versao_lancamento = 1 + (
        SELECT COUNT(*)
        FROM #reaberturas r
        WHERE r.lancamento_id=e.lancamento_id
          AND r.data_evento<TRY_CONVERT(DATETIMEOFFSET(0), e.data_upload, 127)
    )
    FROM dbo.evidencias AS e
    WHERE e.versao_lancamento IS NULL;

    UPDATE t
    SET versao_nova = 1 + (
            SELECT COUNT(*)
            FROM #reaberturas r
            WHERE r.lancamento_id=t.lancamento_id
              AND r.data_evento<=TRY_CONVERT(DATETIMEOFFSET(0), t.data_retificacao, 127)
        ),
        versao_anterior = (
            SELECT COUNT(*)
            FROM #reaberturas r
            WHERE r.lancamento_id=t.lancamento_id
              AND r.data_evento<=TRY_CONVERT(DATETIMEOFFSET(0), t.data_retificacao, 127)
        )
    FROM dbo.retificacoes AS t
    WHERE t.versao_anterior IS NULL OR t.versao_nova IS NULL;

    UPDATE l
    SET evidencia_id = atual.id
    FROM dbo.lancamentos AS l
    OUTER APPLY (
        SELECT TOP (1) e.id
        FROM dbo.evidencias AS e
        WHERE e.lancamento_id=l.id
          AND e.versao_lancamento=l.versao_atual
        ORDER BY e.data_upload DESC, e.id DESC
    ) AS atual
    WHERE ISNULL(l.evidencia_id, N'')<>ISNULL(atual.id, N'');

    IF EXISTS (SELECT 1 FROM dbo.lancamentos WHERE versao_atual IS NULL OR versao_atual<1)
        THROW 51209, 'Falha ao reconciliar versao dos lancamentos.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.evidencias e
        INNER JOIN dbo.lancamentos l ON l.id=e.lancamento_id
        WHERE e.versao_lancamento IS NULL
           OR e.versao_lancamento<1
           OR e.versao_lancamento>l.versao_atual
    )
        THROW 51210, 'Falha ao reconciliar versao das evidencias.', 1;

    ALTER TABLE dbo.lancamentos ALTER COLUMN versao_atual INT NOT NULL;
    ALTER TABLE dbo.evidencias ALTER COLUMN versao_lancamento INT NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name=N'df_lancamentos_versao_atual')
        ALTER TABLE dbo.lancamentos ADD CONSTRAINT df_lancamentos_versao_atual DEFAULT (1) FOR versao_atual;

    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name=N'df_evidencias_versao_lancamento')
        ALTER TABLE dbo.evidencias ADD CONSTRAINT df_evidencias_versao_lancamento DEFAULT (1) FOR versao_lancamento;

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'ck_lancamentos_versao_atual')
        ALTER TABLE dbo.lancamentos WITH CHECK ADD CONSTRAINT ck_lancamentos_versao_atual CHECK (versao_atual>=1);

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'ck_evidencias_versao_lancamento')
        ALTER TABLE dbo.evidencias WITH CHECK ADD CONSTRAINT ck_evidencias_versao_lancamento CHECK (versao_lancamento>=1);

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name=N'idx_evidencias_lancamento_versao'
          AND object_id=OBJECT_ID(N'dbo.evidencias')
    )
        CREATE INDEX idx_evidencias_lancamento_versao
        ON dbo.evidencias(lancamento_id, versao_lancamento, data_upload, id);

    IF (SELECT COUNT(*) FROM dbo.lancamentos)<>@lancamentos_antes
       OR (SELECT COUNT(*) FROM dbo.evidencias)<>@evidencias_antes
       OR (SELECT COUNT(*) FROM dbo.homologacoes)<>@homologacoes_antes
       OR (SELECT COUNT(*) FROM dbo.retificacoes)<>@retificacoes_antes
        THROW 51211, 'A migration alterou indevidamente a quantidade de registros produtivos.', 1;

    IF EXISTS (
        SELECT id, status FROM dbo.lancamentos
        EXCEPT
        SELECT id, status FROM #status_lancamentos_antes
    ) OR EXISTS (
        SELECT id, status FROM #status_lancamentos_antes
        EXCEPT
        SELECT id, status FROM dbo.lancamentos
    )
        THROW 51212, 'A migration alterou indevidamente status de lancamento.', 1;

    IF EXISTS (SELECT 1 FROM dbo.lancamentos WHERE id=N'152')
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.lancamentos
            WHERE id=N'152'
              AND status=N'Homologado'
              AND versao_atual=1
              AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.mulheresGestorasMes'))=15
              AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json, '$.totalGestoresMes'))=30
        )
            THROW 51213, 'O lancamento 152 nao permaneceu Homologado, 15/30 e versao 1.', 1;

        IF NOT EXISTS (
            SELECT 1 FROM dbo.evidencias
            WHERE lancamento_id=N'152'
              AND nome_arquivo=N'PEI_PN_31_08_ (1).xlsx'
              AND versao_lancamento=1
        )
            THROW 51214, 'A evidencia historica esperada do lancamento 152 nao ficou na versao 1.', 1;
    END;

    SELECT
        COUNT(*) AS lancamentos_total,
        SUM(CASE WHEN versao_atual=1 THEN 1 ELSE 0 END) AS lancamentos_versao_1,
        SUM(CASE WHEN versao_atual>1 THEN 1 ELSE 0 END) AS lancamentos_reabertos
    FROM dbo.lancamentos;

    SELECT
        COUNT(*) AS evidencias_total,
        SUM(CASE WHEN versao_lancamento=1 THEN 1 ELSE 0 END) AS evidencias_versao_1,
        SUM(CASE WHEN versao_lancamento>1 THEN 1 ELSE 0 END) AS evidencias_versoes_posteriores
    FROM dbo.evidencias;

    SELECT l.id, l.status, l.versao_atual, COUNT(e.id) AS quantidade_evidencias
    FROM dbo.lancamentos l
    LEFT JOIN dbo.evidencias e ON e.lancamento_id=l.id
    WHERE l.versao_atual>1 OR l.id=N'152'
    GROUP BY l.id,l.status,l.versao_atual
    ORDER BY l.id;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
