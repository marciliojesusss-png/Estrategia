/*
  Substitui somente a estrutura funcional e os dados da aplicacao no banco
  DB5319_IndicadoresEstrategicos usando um backup do banco Estrategia.

  REQUISITOS:
  - executar com sqlcmd -b a partir da pasta database\sqlserver;
  - manter schema.sql na mesma pasta deste arquivo;
  - interromper a aplicacao e encerrar as demais conexoes com o banco de destino;
  - usar caminhos novos para SafetyBackupFile, StagingDataFile e StagingLogFile;
  - executar com uma conta autorizada a BACKUP, RESTORE e ALTER no banco destino.

  GARANTIAS:
  - nao restaura sobre o banco de destino;
  - nao cria, remove ou altera logins, usuarios, roles, permissoes ou proprietario;
  - valida owner_sid, SID de dbo e SID de s531902 antes e depois;
  - toda substituicao de dados ocorre em uma unica transacao;
  - em caso de erro, a transacao e revertida e o staging permanece para diagnostico.
*/

:on error exit
:setvar TargetDatabase "DB5319_IndicadoresEstrategicos"
:setvar StagingDatabase "Estrategia_CARGA_20261110"
:setvar BackupFile "D:\SQLBackups\Estrategia_COPY_ONLY_20261110_091500.bak"
:setvar SafetyBackupFile "D:\SQLBackups\DB5319_IndicadoresEstrategicos_PRE_CARGA_20261110.bak"
:setvar StagingDataFile "D:\SQLData\Estrategia_CARGA_20261110.mdf"
:setvar StagingLogFile "D:\SQLData\Estrategia_CARGA_20261110_log.ldf"
:setvar DropStagingAfterSuccess "1"
:setvar ExpectedOwnerSid "0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000"
:setvar ExpectedDboSid "0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000"
:setvar ExpectedAppUserSid "0x401E46BC08211343899A19AC0768B6B8"

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

USE [master];
GO

DECLARE @ExpectedOwnerSid VARBINARY(85) =
    CONVERT(VARBINARY(85), N'$(ExpectedOwnerSid)', 1);

IF DB_ID(N'$(TargetDatabase)') IS NULL
    THROW 55000, N'Banco de destino nao encontrado.', 1;

IF DB_ID(N'$(StagingDatabase)') IS NOT NULL
    THROW 55001, N'O banco de staging ja existe. Remova-o ou altere StagingDatabase.', 1;

IF (SELECT owner_sid FROM sys.databases WHERE name = N'$(TargetDatabase)') <> @ExpectedOwnerSid
    THROW 55002, N'owner_sid do banco destino diverge do SID corporativo esperado.', 1;

IF EXISTS (
    SELECT 1
    FROM sys.dm_exec_sessions
    WHERE database_id = DB_ID(N'$(TargetDatabase)')
      AND session_id <> @@SPID
      AND is_user_process = 1
)
    THROW 55003, N'Ha outras conexoes no banco destino. Interrompa a aplicacao antes da carga.', 1;
GO

USE [$(TargetDatabase)];
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.database_principals
    WHERE name = N'dbo'
      AND sid = CONVERT(VARBINARY(85), N'$(ExpectedDboSid)', 1)
)
    THROW 55004, N'SID interno de dbo diverge do valor corporativo esperado.', 1;

IF NOT EXISTS (
    SELECT 1 FROM sys.database_principals
    WHERE name = N's531902'
      AND sid = CONVERT(VARBINARY(85), N'$(ExpectedAppUserSid)', 1)
)
    THROW 55005, N'SID do usuario s531902 diverge do valor esperado.', 1;
GO

USE [master];
GO

PRINT N'Criando backup de seguranca do banco destino...';
BACKUP DATABASE [$(TargetDatabase)]
TO DISK = N'$(SafetyBackupFile)'
WITH COPY_ONLY, CHECKSUM, STATS = 10;
GO

PRINT N'Validando e restaurando a origem como staging independente...';
RESTORE VERIFYONLY
FROM DISK = N'$(BackupFile)'
WITH CHECKSUM;
GO

RESTORE DATABASE [$(StagingDatabase)]
FROM DISK = N'$(BackupFile)'
WITH
    MOVE N'Estrategia' TO N'$(StagingDataFile)',
    MOVE N'Estrategia_log' TO N'$(StagingLogFile)',
    RECOVERY,
    STATS = 10;
GO

DBCC CHECKDB (N'$(StagingDatabase)') WITH NO_INFOMSGS;
GO

/* Colunas adicionadas depois da versao existente no backup DB5319. */
USE [$(TargetDatabase)];
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.lancamentos', N'versao_atual') IS NULL
        ALTER TABLE dbo.lancamentos
        ADD versao_atual INT NOT NULL
            CONSTRAINT df_lancamentos_versao_atual DEFAULT (1) WITH VALUES;
    ELSE IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.lancamentos')
          AND name = N'versao_atual' AND is_nullable = 1
    )
    BEGIN
        EXEC sys.sp_executesql N'
            UPDATE dbo.lancamentos SET versao_atual = 1 WHERE versao_atual IS NULL;
            ALTER TABLE dbo.lancamentos ALTER COLUMN versao_atual INT NOT NULL;';
    END;

    IF COL_LENGTH(N'dbo.evidencias', N'versao_lancamento') IS NULL
        ALTER TABLE dbo.evidencias
        ADD versao_lancamento INT NOT NULL
            CONSTRAINT df_evidencias_versao_lancamento DEFAULT (1) WITH VALUES;
    ELSE IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.evidencias')
          AND name = N'versao_lancamento' AND is_nullable = 1
    )
    BEGIN
        EXEC sys.sp_executesql N'
            UPDATE dbo.evidencias SET versao_lancamento = 1 WHERE versao_lancamento IS NULL;
            ALTER TABLE dbo.evidencias ALTER COLUMN versao_lancamento INT NOT NULL;';
    END;

    IF COL_LENGTH(N'dbo.retificacoes', N'versao_anterior') IS NULL
        ALTER TABLE dbo.retificacoes ADD versao_anterior INT NULL;

    IF COL_LENGTH(N'dbo.retificacoes', N'versao_nova') IS NULL
        ALTER TABLE dbo.retificacoes ADD versao_nova INT NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

/* Cria de forma idempotente as tabelas funcionais ja declaradas pelo projeto. */
:r .\schema.sql
GO

USE [$(TargetDatabase)];
GO

/* Estruturas funcionais posteriores ao schema base. */
IF OBJECT_ID(N'dbo.lancamentos_observacoes_documentais', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.lancamentos_observacoes_documentais (
        id NVARCHAR(100) NOT NULL
            CONSTRAINT pk_lancamentos_observacoes_documentais PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        indicador_id NVARCHAR(100) NOT NULL,
        competencia NVARCHAR(40) NOT NULL,
        ano INT NOT NULL,
        mes INT NOT NULL,
        versao_lancamento INT NOT NULL,
        tipo_observacao NVARCHAR(100) NOT NULL,
        observacao NVARCHAR(MAX) NOT NULL,
        fonte_documental NVARCHAR(500) NOT NULL,
        paginas_documento NVARCHAR(100) NOT NULL,
        sha256_observacao CHAR(64) NOT NULL,
        sha256_documento_declarado CHAR(64) NOT NULL,
        sha256_arquivo_fisico CHAR(64) NOT NULL,
        documento_referencia NVARCHAR(500) NOT NULL,
        substitui_observacao_id NVARCHAR(100) NULL,
        origem_registro NVARCHAR(255) NOT NULL,
        criado_em DATETIME2(0) NOT NULL
            CONSTRAINT df_lanc_obs_doc_criado_em DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_lanc_obs_doc_lancamento
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id),
        CONSTRAINT fk_lanc_obs_doc_indicador
            FOREIGN KEY (indicador_id) REFERENCES dbo.indicadores(id),
        CONSTRAINT fk_lanc_obs_doc_substituida
            FOREIGN KEY (substitui_observacao_id)
            REFERENCES dbo.lancamentos_observacoes_documentais(id),
        CONSTRAINT ck_lanc_obs_doc_mes CHECK (mes BETWEEN 1 AND 12),
        CONSTRAINT ck_lanc_obs_doc_versao CHECK (versao_lancamento >= 1),
        CONSTRAINT ck_lanc_obs_doc_tipo
            CHECK (tipo_observacao = N'OBSERVACAO_AREA_INFORME_TRIMESTRAL'),
        CONSTRAINT ck_lanc_obs_doc_nao_autossubstitui
            CHECK (substitui_observacao_id IS NULL OR substitui_observacao_id <> id),
        CONSTRAINT ck_lanc_obs_doc_hashes CHECK (
            LEN(sha256_observacao) = 64
            AND LEN(sha256_documento_declarado) = 64
            AND LEN(sha256_arquivo_fisico) = 64
            AND sha256_observacao COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'
            AND sha256_documento_declarado COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'
            AND sha256_arquivo_fisico COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'
        )
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.lancamentos_observacoes_documentais')
      AND name = N'ix_lanc_obs_doc_leitura'
)
    CREATE INDEX ix_lanc_obs_doc_leitura
    ON dbo.lancamentos_observacoes_documentais (
        lancamento_id, versao_lancamento, ano, mes, tipo_observacao, criado_em DESC
    );

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.lancamentos_observacoes_documentais')
      AND name = N'uq_lanc_obs_doc_identidade'
)
    CREATE UNIQUE INDEX uq_lanc_obs_doc_identidade
    ON dbo.lancamentos_observacoes_documentais (
        lancamento_id, versao_lancamento, competencia, tipo_observacao,
        sha256_documento_declarado, sha256_observacao
    );

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.lancamentos_observacoes_documentais')
      AND name = N'uq_lanc_obs_doc_substituicao'
)
    CREATE UNIQUE INDEX uq_lanc_obs_doc_substituicao
    ON dbo.lancamentos_observacoes_documentais (substitui_observacao_id)
    WHERE substitui_observacao_id IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.lancamentos_resultados_homologados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.lancamentos_resultados_homologados (
        lancamento_id NVARCHAR(100) NOT NULL,
        versao_lancamento INT NOT NULL,
        indicador_id NVARCHAR(100) NOT NULL,
        competencia NVARCHAR(40) NOT NULL,
        meta_oficial DECIMAL(38,12) NULL,
        resultado_calculado DECIMAL(38,12) NULL,
        resultado_oficial DECIMAL(38,12) NULL,
        percentual_atingido DECIMAL(38,12) NULL,
        situacao NVARCHAR(100) NULL,
        origem_resultado NVARCHAR(50) NOT NULL,
        versao_formula NVARCHAR(50) NOT NULL,
        detalhes_json NVARCHAR(MAX) NULL,
        homologado_por NVARCHAR(100) NOT NULL,
        homologado_em DATETIMEOFFSET(0) NOT NULL,
        created_at DATETIMEOFFSET(0) NOT NULL,
        CONSTRAINT PK_lancamentos_resultados_homologados
            PRIMARY KEY (lancamento_id, versao_lancamento),
        CONSTRAINT FK_lancamentos_resultados_homologados_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id),
        CONSTRAINT CK_lancamentos_resultados_homologados_detalhes_json
            CHECK (detalhes_json IS NULL OR ISJSON(detalhes_json) = 1)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.lancamentos_resultados_homologados')
      AND name = N'IX_resultados_homologados_indicador_competencia'
)
    CREATE INDEX IX_resultados_homologados_indicador_competencia
    ON dbo.lancamentos_resultados_homologados(indicador_id, competencia);
GO

/*
  Allowlist: somente estas tabelas de aplicacao podem ser esvaziadas e recarregadas.
  usuarios_acesso e usuarios_validacao sao dados da aplicacao; nao sao principals SQL.
*/
CREATE TABLE #TabelasCarga (
    ordem INT NOT NULL PRIMARY KEY,
    schema_name SYSNAME NOT NULL,
    table_name SYSNAME NOT NULL
);

INSERT INTO #TabelasCarga (ordem, schema_name, table_name) VALUES
    (10, N'dbo', N'indicadores'),
    (20, N'dbo', N'lancamentos'),
    (30, N'dbo', N'prazos_apuracao'),
    (40, N'dbo', N'homologacoes'),
    (50, N'dbo', N'solicitacoes_reabertura'),
    (60, N'dbo', N'retificacoes'),
    (70, N'dbo', N'evidencias'),
    (80, N'dbo', N'auditoria'),
    (90, N'dbo', N'configuracoes'),
    (100, N'dbo', N'usuarios_validacao'),
    (110, N'dbo', N'backups_importacao'),
    (120, N'dbo', N'usuarios_acesso'),
    (130, N'dbo', N'acessos_log'),
    (140, N'dbo', N'iniciativas_estrategicas'),
    (150, N'dbo', N'iniciativas_acompanhamentos'),
    (160, N'dbo', N'iniciativas_acompanhamento_itens'),
    (170, N'dbo', N'iniciativas_homologacoes'),
    (180, N'dbo', N'iniciativas_evidencias'),
    (190, N'dbo', N'lancamentos_observacoes_documentais'),
    (200, N'dbo', N'lancamentos_resultados_homologados');

IF EXISTS (
    SELECT schema_name, table_name FROM #TabelasCarga
    EXCEPT
    SELECT s.name, t.name
    FROM [$(StagingDatabase)].sys.tables AS t
    INNER JOIN [$(StagingDatabase)].sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
)
    THROW 55006, N'O staging nao possui todas as tabelas obrigatorias.', 1;

IF EXISTS (
    SELECT s.name, t.name
    FROM [$(StagingDatabase)].sys.tables AS t
    INNER JOIN [$(StagingDatabase)].sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    EXCEPT
    SELECT schema_name, table_name FROM #TabelasCarga
)
    THROW 55007, N'O staging possui tabela nao prevista pela allowlist. Revise o script.', 1;

IF EXISTS (
    SELECT schema_name, table_name FROM #TabelasCarga
    EXCEPT
    SELECT s.name, t.name
    FROM sys.tables AS t
    INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
)
    THROW 55008, N'O destino nao possui todas as tabelas obrigatorias apos preparar o schema.', 1;

/* Impede carga parcial por diferenca de nomes ou tipos de colunas. */
IF EXISTS (
    SELECT ss.name, st.name, sc.name, sty.name, sc.max_length, sc.precision,
           sc.scale, sc.is_identity, sc.is_computed
    FROM [$(StagingDatabase)].sys.tables AS st
    INNER JOIN [$(StagingDatabase)].sys.schemas AS ss ON ss.schema_id = st.schema_id
    INNER JOIN [$(StagingDatabase)].sys.columns AS sc ON sc.object_id = st.object_id
    INNER JOIN [$(StagingDatabase)].sys.types AS sty ON sty.user_type_id = sc.user_type_id
    INNER JOIN #TabelasCarga AS l
        ON l.schema_name = ss.name AND l.table_name = st.name
    EXCEPT
    SELECT ts.name, tt.name, tc.name, tty.name, tc.max_length, tc.precision,
           tc.scale, tc.is_identity, tc.is_computed
    FROM sys.tables AS tt
    INNER JOIN sys.schemas AS ts ON ts.schema_id = tt.schema_id
    INNER JOIN sys.columns AS tc ON tc.object_id = tt.object_id
    INNER JOIN sys.types AS tty ON tty.user_type_id = tc.user_type_id
    INNER JOIN #TabelasCarga AS l
        ON l.schema_name = ts.name AND l.table_name = tt.name
)
OR EXISTS (
    SELECT ts.name, tt.name, tc.name, tty.name, tc.max_length, tc.precision,
           tc.scale, tc.is_identity, tc.is_computed
    FROM sys.tables AS tt
    INNER JOIN sys.schemas AS ts ON ts.schema_id = tt.schema_id
    INNER JOIN sys.columns AS tc ON tc.object_id = tt.object_id
    INNER JOIN sys.types AS tty ON tty.user_type_id = tc.user_type_id
    INNER JOIN #TabelasCarga AS l
        ON l.schema_name = ts.name AND l.table_name = tt.name
    EXCEPT
    SELECT ss.name, st.name, sc.name, sty.name, sc.max_length, sc.precision,
           sc.scale, sc.is_identity, sc.is_computed
    FROM [$(StagingDatabase)].sys.tables AS st
    INNER JOIN [$(StagingDatabase)].sys.schemas AS ss ON ss.schema_id = st.schema_id
    INNER JOIN [$(StagingDatabase)].sys.columns AS sc ON sc.object_id = st.object_id
    INNER JOIN [$(StagingDatabase)].sys.types AS sty ON sty.user_type_id = sc.user_type_id
    INNER JOIN #TabelasCarga AS l
        ON l.schema_name = ss.name AND l.table_name = st.name
)
    THROW 55014, N'As colunas do staging e do destino divergem. A carga foi bloqueada.', 1;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE
        @Schema SYSNAME,
        @Table SYSNAME,
        @Qualified NVARCHAR(517),
        @SourceQualified NVARCHAR(776),
        @Sql NVARCHAR(MAX),
        @Columns NVARCHAR(MAX),
        @HasIdentity BIT,
        @SourceRows BIGINT,
        @TargetRows BIGINT;

    IF EXISTS (
        SELECT 1
        FROM master.sys.dm_exec_sessions
        WHERE database_id = DB_ID(N'$(TargetDatabase)')
          AND session_id <> @@SPID
          AND is_user_process = 1
    )
        THROW 55015, N'Uma conexao entrou no banco destino durante a preparacao.', 1;

    DECLARE delete_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT schema_name, table_name
        FROM #TabelasCarga
        ORDER BY ordem DESC;

    OPEN delete_cursor;
    FETCH NEXT FROM delete_cursor INTO @Schema, @Table;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Qualified = QUOTENAME(@Schema) + N'.' + QUOTENAME(@Table);
        SET @Sql = N'DISABLE TRIGGER ALL ON ' + @Qualified + N'; '
                 + N'ALTER TABLE ' + @Qualified + N' NOCHECK CONSTRAINT ALL; '
                 + N'DELETE FROM ' + @Qualified + N';';
        EXEC sys.sp_executesql @Sql;

        FETCH NEXT FROM delete_cursor INTO @Schema, @Table;
    END;

    CLOSE delete_cursor;
    DEALLOCATE delete_cursor;

    DECLARE load_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT schema_name, table_name
        FROM #TabelasCarga
        ORDER BY ordem;

    OPEN load_cursor;
    FETCH NEXT FROM load_cursor INTO @Schema, @Table;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Qualified = QUOTENAME(@Schema) + N'.' + QUOTENAME(@Table);
        SET @SourceQualified = QUOTENAME(N'$(StagingDatabase)') + N'.'
                             + QUOTENAME(@Schema) + N'.' + QUOTENAME(@Table);

        SELECT @Columns = STUFF((
            SELECT N',' + QUOTENAME(tc.name)
            FROM sys.tables AS tt
            INNER JOIN sys.schemas AS ts ON ts.schema_id = tt.schema_id
            INNER JOIN sys.columns AS tc ON tc.object_id = tt.object_id
            INNER JOIN [$(StagingDatabase)].sys.tables AS st ON st.name = tt.name
            INNER JOIN [$(StagingDatabase)].sys.schemas AS ss
                ON ss.schema_id = st.schema_id AND ss.name = ts.name
            INNER JOIN [$(StagingDatabase)].sys.columns AS sc
                ON sc.object_id = st.object_id AND sc.name = tc.name
            WHERE ts.name = @Schema
              AND tt.name = @Table
              AND tc.is_computed = 0
              AND sc.is_computed = 0
              AND TYPE_NAME(tc.system_type_id) <> N'timestamp'
              AND TYPE_NAME(sc.system_type_id) <> N'timestamp'
            ORDER BY tc.column_id
            FOR XML PATH(N''), TYPE
        ).value(N'.', N'nvarchar(max)'), 1, 1, N'');

        IF @Columns IS NULL OR @Columns = N''
            THROW 55009, N'Nao foi possivel determinar as colunas da carga.', 1;

        SELECT @HasIdentity = CASE WHEN EXISTS (
            SELECT 1
            FROM sys.tables AS t
            INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
            INNER JOIN sys.columns AS c ON c.object_id = t.object_id
            WHERE s.name = @Schema AND t.name = @Table AND c.is_identity = 1
        ) THEN 1 ELSE 0 END;

        SET @Sql = N'';
        IF @HasIdentity = 1
            SET @Sql += N'SET IDENTITY_INSERT ' + @Qualified + N' ON; ';

        SET @Sql += N'INSERT INTO ' + @Qualified + N' (' + @Columns + N') '
                  + N'SELECT ' + @Columns + N' FROM ' + @SourceQualified + N'; ';

        IF @HasIdentity = 1
            SET @Sql += N'SET IDENTITY_INSERT ' + @Qualified + N' OFF; ';

        EXEC sys.sp_executesql @Sql;

        SET @Sql = N'SELECT @n = COUNT_BIG(*) FROM ' + @SourceQualified + N';';
        EXEC sys.sp_executesql @Sql, N'@n BIGINT OUTPUT', @n = @SourceRows OUTPUT;

        SET @Sql = N'SELECT @n = COUNT_BIG(*) FROM ' + @Qualified + N';';
        EXEC sys.sp_executesql @Sql, N'@n BIGINT OUTPUT', @n = @TargetRows OUTPUT;

        IF @SourceRows <> @TargetRows
            THROW 55010, N'Quantidade de registros divergente apos a carga.', 1;

        PRINT CONCAT(@Qualified, N': ', @TargetRows, N' registros copiados.');

        FETCH NEXT FROM load_cursor INTO @Schema, @Table;
    END;

    CLOSE load_cursor;
    DEALLOCATE load_cursor;

    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.lancamentos')
          AND name = N'df_lancamentos_versao_atual'
    )
        ALTER TABLE dbo.lancamentos
        ADD CONSTRAINT df_lancamentos_versao_atual DEFAULT (1) FOR versao_atual;

    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.evidencias')
          AND name = N'df_evidencias_versao_lancamento'
    )
        ALTER TABLE dbo.evidencias
        ADD CONSTRAINT df_evidencias_versao_lancamento DEFAULT (1) FOR versao_lancamento;

    DECLARE constraint_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT schema_name, table_name
        FROM #TabelasCarga
        ORDER BY ordem;

    OPEN constraint_cursor;
    FETCH NEXT FROM constraint_cursor INTO @Schema, @Table;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Qualified = QUOTENAME(@Schema) + N'.' + QUOTENAME(@Table);
        SET @Sql = N'ALTER TABLE ' + @Qualified + N' WITH CHECK CHECK CONSTRAINT ALL; '
                 + N'ENABLE TRIGGER ALL ON ' + @Qualified + N';';
        EXEC sys.sp_executesql @Sql;

        FETCH NEXT FROM constraint_cursor INTO @Schema, @Table;
    END;

    CLOSE constraint_cursor;
    DEALLOCATE constraint_cursor;

    DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;

    /* Replica exatamente os dois triggers funcionais do staging, nunca triggers de seguranca. */
    DECLARE @TriggerName SYSNAME, @TriggerDefinition NVARCHAR(MAX);
    DECLARE trigger_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT trigger_name
        FROM (VALUES
            (N'tr_lanc_obs_doc_append_only'),
            (N'tr_lanc_obs_doc_integridade_insert')
        ) AS expected(trigger_name);

    OPEN trigger_cursor;
    FETCH NEXT FROM trigger_cursor INTO @TriggerName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @TriggerDefinition = NULL;

        SELECT @TriggerDefinition = sm.definition
        FROM [$(StagingDatabase)].sys.triggers AS tr
        INNER JOIN [$(StagingDatabase)].sys.sql_modules AS sm
            ON sm.object_id = tr.object_id
        INNER JOIN [$(StagingDatabase)].sys.tables AS parent_table
            ON parent_table.object_id = tr.parent_id
        INNER JOIN [$(StagingDatabase)].sys.schemas AS parent_schema
            ON parent_schema.schema_id = parent_table.schema_id
        WHERE tr.name = @TriggerName
          AND parent_schema.name = N'dbo'
          AND parent_table.name = N'lancamentos_observacoes_documentais';

        IF @TriggerDefinition IS NULL
            THROW 55016, N'Trigger funcional obrigatorio nao encontrado no staging.', 1;

        IF OBJECT_ID(N'dbo.' + @TriggerName, N'TR') IS NOT NULL
        BEGIN
            SET @Sql = N'DROP TRIGGER dbo.' + QUOTENAME(@TriggerName) + N';';
            EXEC sys.sp_executesql @Sql;
        END;

        EXEC sys.sp_executesql @TriggerDefinition;
        FETCH NEXT FROM trigger_cursor INTO @TriggerName;
    END;

    CLOSE trigger_cursor;
    DEALLOCATE trigger_cursor;

    IF NOT EXISTS (
        SELECT 1 FROM sys.database_principals
        WHERE name = N'dbo'
          AND sid = CONVERT(VARBINARY(85), N'$(ExpectedDboSid)', 1)
    )
        THROW 55011, N'SID de dbo mudou durante a carga.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.database_principals
        WHERE name = N's531902'
          AND sid = CONVERT(VARBINARY(85), N'$(ExpectedAppUserSid)', 1)
    )
        THROW 55012, N'SID de s531902 mudou durante a carga.', 1;

    IF (
        SELECT owner_sid FROM master.sys.databases
        WHERE name = N'$(TargetDatabase)'
    ) <> CONVERT(VARBINARY(85), N'$(ExpectedOwnerSid)', 1)
        THROW 55013, N'owner_sid mudou durante a carga.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

DBCC CHECKDB (N'$(TargetDatabase)') WITH NO_INFOMSGS;
GO

USE [master];
GO

SELECT
    name,
    state_desc,
    SUSER_SNAME(owner_sid) AS proprietario,
    master.sys.fn_varbintohexstr(owner_sid) AS owner_sid
FROM sys.databases
WHERE name IN (N'$(TargetDatabase)', N'$(StagingDatabase)');
GO

IF N'$(DropStagingAfterSuccess)' = N'1'
BEGIN
    ALTER DATABASE [$(StagingDatabase)] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$(StagingDatabase)];
END;
GO

PRINT N'CARGA CONCLUIDA. O banco destino manteve owner_sid, dbo e s531902.';
PRINT N'Valide a aplicacao antes de reabrir o acesso dos usuarios.';
GO
