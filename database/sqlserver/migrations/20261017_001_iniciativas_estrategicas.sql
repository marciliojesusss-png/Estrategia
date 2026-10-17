SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
BEGIN
    RAISERROR(N'Migration destinada exclusivamente ao banco Estrategia.', 16, 1);
    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.iniciativas_estrategicas', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.iniciativas_estrategicas (
            id NVARCHAR(100) NOT NULL,
            codigo NVARCHAR(50) NOT NULL,
            plano NVARCHAR(255) NOT NULL,
            pilar NVARCHAR(255) NOT NULL,
            titulo_executivo NVARCHAR(255) NOT NULL,
            descricao_oficial NVARCHAR(MAX) NOT NULL,
            objetivo NVARCHAR(MAX) NOT NULL,
            unidade_responsavel NVARCHAR(255) NOT NULL,
            diretoria_responsavel NVARCHAR(255) NOT NULL,
            ano_inicio INT NOT NULL,
            trimestre_inicio NVARCHAR(10) NOT NULL,
            previsao_conclusao DATE NULL,
            exige_evidencia BIT NOT NULL,
            ativo BIT NOT NULL,
            created_by NVARCHAR(255) NULL,
            created_at DATETIME2 NOT NULL,
            updated_at DATETIME2 NULL
        );
    END;

    IF OBJECT_ID(N'dbo.iniciativas_acompanhamentos', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.iniciativas_acompanhamentos (
            id NVARCHAR(100) NOT NULL,
            iniciativa_id NVARCHAR(100) NOT NULL,
            ano INT NOT NULL,
            trimestre NVARCHAR(10) NOT NULL,
            competencia CHAR(7) NOT NULL,
            data_referencia DATE NOT NULL,
            plano_snapshot NVARCHAR(255) NOT NULL,
            pilar_snapshot NVARCHAR(255) NOT NULL,
            titulo_snapshot NVARCHAR(255) NOT NULL,
            descricao_snapshot NVARCHAR(MAX) NOT NULL,
            objetivo_snapshot NVARCHAR(MAX) NOT NULL,
            unidade_snapshot NVARCHAR(255) NOT NULL,
            diretoria_snapshot NVARCHAR(255) NOT NULL,
            status_iniciativa NVARCHAR(40) NULL,
            andamento_unidade NVARCHAR(MAX) NULL,
            referencia_evidencia NVARCHAR(MAX) NULL,
            sintese_executiva_ca NVARCHAR(MAX) NULL,
            status_consolidacao_ca NVARCHAR(40) NOT NULL,
            status_fluxo NVARCHAR(40) NOT NULL,
            usuario_responsavel NVARCHAR(255) NULL,
            created_at DATETIME2 NOT NULL,
            updated_at DATETIME2 NULL
        );
    END;

    IF OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.iniciativas_acompanhamento_itens (
            id NVARCHAR(100) NOT NULL,
            acompanhamento_id NVARCHAR(100) NOT NULL,
            tipo NVARCHAR(40) NOT NULL,
            titulo NVARCHAR(255) NULL,
            descricao NVARCHAR(MAX) NOT NULL,
            status NVARCHAR(100) NULL,
            ordem INT NOT NULL,
            destaque_ca BIT NOT NULL,
            created_at DATETIME2 NOT NULL,
            updated_at DATETIME2 NULL
        );
    END;

    IF OBJECT_ID(N'dbo.iniciativas_homologacoes', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.iniciativas_homologacoes (
            id NVARCHAR(100) NOT NULL,
            acompanhamento_id NVARCHAR(100) NOT NULL,
            acao NVARCHAR(100) NOT NULL,
            status_anterior NVARCHAR(40) NULL,
            status_novo NVARCHAR(40) NULL,
            justificativa NVARCHAR(MAX) NULL,
            usuario NVARCHAR(255) NULL,
            perfil_usuario NVARCHAR(100) NULL,
            data_acao DATETIME2 NOT NULL,
            created_at DATETIME2 NOT NULL
        );
    END;

    IF OBJECT_ID(N'dbo.iniciativas_evidencias', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.iniciativas_evidencias (
            id NVARCHAR(100) NOT NULL,
            acompanhamento_id NVARCHAR(100) NOT NULL,
            nome_arquivo NVARCHAR(255) NOT NULL,
            tipo_arquivo NVARCHAR(100) NULL,
            caminho_arquivo NVARCHAR(MAX) NOT NULL,
            descricao NVARCHAR(MAX) NULL,
            data_upload DATETIME2 NOT NULL,
            usuario NVARCHAR(255) NULL,
            created_at DATETIME2 NOT NULL
        );
    END;

    /* Uma tabela preexistente com coluna ausente ou incompatível interrompe a migration. */
    DECLARE @colunas_esperadas TABLE (
        tabela SYSNAME NOT NULL,
        coluna SYSNAME NOT NULL,
        tipo SYSNAME NOT NULL,
        tamanho SMALLINT NOT NULL,
        nullable BIT NOT NULL
    );

    INSERT INTO @colunas_esperadas (tabela, coluna, tipo, tamanho, nullable) VALUES
        (N'iniciativas_estrategicas', N'id', N'nvarchar', 200, 0),
        (N'iniciativas_estrategicas', N'codigo', N'nvarchar', 100, 0),
        (N'iniciativas_estrategicas', N'plano', N'nvarchar', 510, 0),
        (N'iniciativas_estrategicas', N'pilar', N'nvarchar', 510, 0),
        (N'iniciativas_estrategicas', N'titulo_executivo', N'nvarchar', 510, 0),
        (N'iniciativas_estrategicas', N'descricao_oficial', N'nvarchar', -1, 0),
        (N'iniciativas_estrategicas', N'objetivo', N'nvarchar', -1, 0),
        (N'iniciativas_estrategicas', N'unidade_responsavel', N'nvarchar', 510, 0),
        (N'iniciativas_estrategicas', N'diretoria_responsavel', N'nvarchar', 510, 0),
        (N'iniciativas_estrategicas', N'ano_inicio', N'int', 4, 0),
        (N'iniciativas_estrategicas', N'trimestre_inicio', N'nvarchar', 20, 0),
        (N'iniciativas_estrategicas', N'previsao_conclusao', N'date', 3, 1),
        (N'iniciativas_estrategicas', N'exige_evidencia', N'bit', 1, 0),
        (N'iniciativas_estrategicas', N'ativo', N'bit', 1, 0),
        (N'iniciativas_estrategicas', N'created_by', N'nvarchar', 510, 1),
        (N'iniciativas_estrategicas', N'created_at', N'datetime2', 8, 0),
        (N'iniciativas_estrategicas', N'updated_at', N'datetime2', 8, 1),

        (N'iniciativas_acompanhamentos', N'id', N'nvarchar', 200, 0),
        (N'iniciativas_acompanhamentos', N'iniciativa_id', N'nvarchar', 200, 0),
        (N'iniciativas_acompanhamentos', N'ano', N'int', 4, 0),
        (N'iniciativas_acompanhamentos', N'trimestre', N'nvarchar', 20, 0),
        (N'iniciativas_acompanhamentos', N'competencia', N'char', 7, 0),
        (N'iniciativas_acompanhamentos', N'data_referencia', N'date', 3, 0),
        (N'iniciativas_acompanhamentos', N'plano_snapshot', N'nvarchar', 510, 0),
        (N'iniciativas_acompanhamentos', N'pilar_snapshot', N'nvarchar', 510, 0),
        (N'iniciativas_acompanhamentos', N'titulo_snapshot', N'nvarchar', 510, 0),
        (N'iniciativas_acompanhamentos', N'descricao_snapshot', N'nvarchar', -1, 0),
        (N'iniciativas_acompanhamentos', N'objetivo_snapshot', N'nvarchar', -1, 0),
        (N'iniciativas_acompanhamentos', N'unidade_snapshot', N'nvarchar', 510, 0),
        (N'iniciativas_acompanhamentos', N'diretoria_snapshot', N'nvarchar', 510, 0),
        (N'iniciativas_acompanhamentos', N'status_iniciativa', N'nvarchar', 80, 1),
        (N'iniciativas_acompanhamentos', N'andamento_unidade', N'nvarchar', -1, 1),
        (N'iniciativas_acompanhamentos', N'referencia_evidencia', N'nvarchar', -1, 1),
        (N'iniciativas_acompanhamentos', N'sintese_executiva_ca', N'nvarchar', -1, 1),
        (N'iniciativas_acompanhamentos', N'status_consolidacao_ca', N'nvarchar', 80, 0),
        (N'iniciativas_acompanhamentos', N'status_fluxo', N'nvarchar', 80, 0),
        (N'iniciativas_acompanhamentos', N'usuario_responsavel', N'nvarchar', 510, 1),
        (N'iniciativas_acompanhamentos', N'created_at', N'datetime2', 8, 0),
        (N'iniciativas_acompanhamentos', N'updated_at', N'datetime2', 8, 1),

        (N'iniciativas_acompanhamento_itens', N'id', N'nvarchar', 200, 0),
        (N'iniciativas_acompanhamento_itens', N'acompanhamento_id', N'nvarchar', 200, 0),
        (N'iniciativas_acompanhamento_itens', N'tipo', N'nvarchar', 80, 0),
        (N'iniciativas_acompanhamento_itens', N'titulo', N'nvarchar', 510, 1),
        (N'iniciativas_acompanhamento_itens', N'descricao', N'nvarchar', -1, 0),
        (N'iniciativas_acompanhamento_itens', N'status', N'nvarchar', 200, 1),
        (N'iniciativas_acompanhamento_itens', N'ordem', N'int', 4, 0),
        (N'iniciativas_acompanhamento_itens', N'destaque_ca', N'bit', 1, 0),
        (N'iniciativas_acompanhamento_itens', N'created_at', N'datetime2', 8, 0),
        (N'iniciativas_acompanhamento_itens', N'updated_at', N'datetime2', 8, 1),

        (N'iniciativas_homologacoes', N'id', N'nvarchar', 200, 0),
        (N'iniciativas_homologacoes', N'acompanhamento_id', N'nvarchar', 200, 0),
        (N'iniciativas_homologacoes', N'acao', N'nvarchar', 200, 0),
        (N'iniciativas_homologacoes', N'status_anterior', N'nvarchar', 80, 1),
        (N'iniciativas_homologacoes', N'status_novo', N'nvarchar', 80, 1),
        (N'iniciativas_homologacoes', N'justificativa', N'nvarchar', -1, 1),
        (N'iniciativas_homologacoes', N'usuario', N'nvarchar', 510, 1),
        (N'iniciativas_homologacoes', N'perfil_usuario', N'nvarchar', 200, 1),
        (N'iniciativas_homologacoes', N'data_acao', N'datetime2', 8, 0),
        (N'iniciativas_homologacoes', N'created_at', N'datetime2', 8, 0),

        (N'iniciativas_evidencias', N'id', N'nvarchar', 200, 0),
        (N'iniciativas_evidencias', N'acompanhamento_id', N'nvarchar', 200, 0),
        (N'iniciativas_evidencias', N'nome_arquivo', N'nvarchar', 510, 0),
        (N'iniciativas_evidencias', N'tipo_arquivo', N'nvarchar', 200, 1),
        (N'iniciativas_evidencias', N'caminho_arquivo', N'nvarchar', -1, 0),
        (N'iniciativas_evidencias', N'descricao', N'nvarchar', -1, 1),
        (N'iniciativas_evidencias', N'data_upload', N'datetime2', 8, 0),
        (N'iniciativas_evidencias', N'usuario', N'nvarchar', 510, 1),
        (N'iniciativas_evidencias', N'created_at', N'datetime2', 8, 0);

    DECLARE @erro_estrutura NVARCHAR(2048);
    SELECT TOP 1 @erro_estrutura =
        N'Estrutura incompatível detectada em dbo.' + esperado.tabela + N'.' + esperado.coluna + N'.'
    FROM @colunas_esperadas esperado
    LEFT JOIN sys.tables tabela
        ON tabela.name = esperado.tabela
       AND tabela.schema_id = SCHEMA_ID(N'dbo')
    LEFT JOIN sys.columns coluna
        ON coluna.object_id = tabela.object_id
       AND coluna.name = esperado.coluna
    LEFT JOIN sys.types tipo
        ON tipo.user_type_id = coluna.user_type_id
    WHERE coluna.object_id IS NULL
       OR tipo.name <> esperado.tipo
       OR coluna.max_length <> esperado.tamanho
       OR coluna.is_nullable <> esperado.nullable;

    IF @erro_estrutura IS NOT NULL
        RAISERROR(@erro_estrutura, 16, 1);

    /* Primary keys. */
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'pk_iniciativas_estrategicas')
        ALTER TABLE dbo.iniciativas_estrategicas ADD CONSTRAINT pk_iniciativas_estrategicas PRIMARY KEY (id);
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'pk_iniciativas_acompanhamentos')
        ALTER TABLE dbo.iniciativas_acompanhamentos ADD CONSTRAINT pk_iniciativas_acompanhamentos PRIMARY KEY (id);
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'pk_iniciativas_acompanhamento_itens')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens ADD CONSTRAINT pk_iniciativas_acompanhamento_itens PRIMARY KEY (id);
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_homologacoes') AND name = N'pk_iniciativas_homologacoes')
        ALTER TABLE dbo.iniciativas_homologacoes ADD CONSTRAINT pk_iniciativas_homologacoes PRIMARY KEY (id);
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_evidencias') AND name = N'pk_iniciativas_evidencias')
        ALTER TABLE dbo.iniciativas_evidencias ADD CONSTRAINT pk_iniciativas_evidencias PRIMARY KEY (id);

    /* Defaults. */
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'df_iniciativas_estrategicas_exige_evidencia')
        ALTER TABLE dbo.iniciativas_estrategicas ADD CONSTRAINT df_iniciativas_estrategicas_exige_evidencia DEFAULT (0) FOR exige_evidencia;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'df_iniciativas_estrategicas_ativo')
        ALTER TABLE dbo.iniciativas_estrategicas ADD CONSTRAINT df_iniciativas_estrategicas_ativo DEFAULT (1) FOR ativo;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'df_iniciativas_estrategicas_created_at')
        ALTER TABLE dbo.iniciativas_estrategicas ADD CONSTRAINT df_iniciativas_estrategicas_created_at DEFAULT (SYSUTCDATETIME()) FOR created_at;

    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'df_iniciativas_acompanhamentos_status_consolidacao_ca')
        ALTER TABLE dbo.iniciativas_acompanhamentos ADD CONSTRAINT df_iniciativas_acompanhamentos_status_consolidacao_ca DEFAULT (N'PENDENTE') FOR status_consolidacao_ca;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'df_iniciativas_acompanhamentos_status_fluxo')
        ALTER TABLE dbo.iniciativas_acompanhamentos ADD CONSTRAINT df_iniciativas_acompanhamentos_status_fluxo DEFAULT (N'NAO_INICIADO') FOR status_fluxo;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'df_iniciativas_acompanhamentos_created_at')
        ALTER TABLE dbo.iniciativas_acompanhamentos ADD CONSTRAINT df_iniciativas_acompanhamentos_created_at DEFAULT (SYSUTCDATETIME()) FOR created_at;

    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'df_iniciativas_acompanhamento_itens_ordem')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens ADD CONSTRAINT df_iniciativas_acompanhamento_itens_ordem DEFAULT (0) FOR ordem;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'df_iniciativas_acompanhamento_itens_destaque_ca')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens ADD CONSTRAINT df_iniciativas_acompanhamento_itens_destaque_ca DEFAULT (0) FOR destaque_ca;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'df_iniciativas_acompanhamento_itens_created_at')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens ADD CONSTRAINT df_iniciativas_acompanhamento_itens_created_at DEFAULT (SYSUTCDATETIME()) FOR created_at;

    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_homologacoes') AND name = N'df_iniciativas_homologacoes_data_acao')
        ALTER TABLE dbo.iniciativas_homologacoes ADD CONSTRAINT df_iniciativas_homologacoes_data_acao DEFAULT (SYSUTCDATETIME()) FOR data_acao;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_homologacoes') AND name = N'df_iniciativas_homologacoes_created_at')
        ALTER TABLE dbo.iniciativas_homologacoes ADD CONSTRAINT df_iniciativas_homologacoes_created_at DEFAULT (SYSUTCDATETIME()) FOR created_at;

    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_evidencias') AND name = N'df_iniciativas_evidencias_data_upload')
        ALTER TABLE dbo.iniciativas_evidencias ADD CONSTRAINT df_iniciativas_evidencias_data_upload DEFAULT (SYSUTCDATETIME()) FOR data_upload;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_evidencias') AND name = N'df_iniciativas_evidencias_created_at')
        ALTER TABLE dbo.iniciativas_evidencias ADD CONSTRAINT df_iniciativas_evidencias_created_at DEFAULT (SYSUTCDATETIME()) FOR created_at;

    /* Unique constraints. */
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'uq_iniciativas_estrategicas_codigo')
        ALTER TABLE dbo.iniciativas_estrategicas ADD CONSTRAINT uq_iniciativas_estrategicas_codigo UNIQUE (codigo);
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'uq_iniciativas_acompanhamentos_iniciativa_competencia')
        ALTER TABLE dbo.iniciativas_acompanhamentos ADD CONSTRAINT uq_iniciativas_acompanhamentos_iniciativa_competencia UNIQUE (iniciativa_id, competencia);

    /* Check constraints. */
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'ck_iniciativas_estrategicas_ano_inicio')
        ALTER TABLE dbo.iniciativas_estrategicas WITH CHECK ADD CONSTRAINT ck_iniciativas_estrategicas_ano_inicio CHECK (ano_inicio BETWEEN 1900 AND 9999);
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_estrategicas') AND name = N'ck_iniciativas_estrategicas_trimestre_inicio')
        ALTER TABLE dbo.iniciativas_estrategicas WITH CHECK ADD CONSTRAINT ck_iniciativas_estrategicas_trimestre_inicio CHECK (trimestre_inicio IN (N'1TRI', N'2TRI', N'3TRI', N'4TRI'));

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_ano')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_ano CHECK (ano BETWEEN 1900 AND 9999);
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_trimestre')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_trimestre CHECK (trimestre IN (N'1TRI', N'2TRI', N'3TRI', N'4TRI'));
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_competencia')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_competencia CHECK (
            competencia LIKE '[12][0-9][0-9][0-9]-[01][0-9]'
            AND SUBSTRING(competencia, 6, 2) IN ('03', '06', '09', '12')
        );
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_periodo_consistente')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_periodo_consistente CHECK (
            LEFT(competencia, 4) = CONVERT(CHAR(4), ano)
            AND YEAR(data_referencia) = ano
            AND data_referencia = EOMONTH(data_referencia)
            AND (
                (trimestre = N'1TRI' AND SUBSTRING(competencia, 6, 2) = '03' AND MONTH(data_referencia) = 3)
                OR (trimestre = N'2TRI' AND SUBSTRING(competencia, 6, 2) = '06' AND MONTH(data_referencia) = 6)
                OR (trimestre = N'3TRI' AND SUBSTRING(competencia, 6, 2) = '09' AND MONTH(data_referencia) = 9)
                OR (trimestre = N'4TRI' AND SUBSTRING(competencia, 6, 2) = '12' AND MONTH(data_referencia) = 12)
            )
        );
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_status_iniciativa')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_status_iniciativa CHECK (
            status_iniciativa IS NULL OR status_iniciativa IN (N'NAO_INICIADA', N'EM_ANDAMENTO', N'CONCLUIDA', N'SUSPENSA', N'CANCELADA')
        );
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_status_fluxo')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_status_fluxo CHECK (
            status_fluxo IN (N'NAO_INICIADO', N'EM_PREENCHIMENTO', N'ENVIADO_HOMOLOGACAO', N'DEVOLVIDO_AJUSTE', N'HOMOLOGADO', N'REABERTO')
        );
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'ck_iniciativas_acompanhamentos_status_consolidacao_ca')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamentos_status_consolidacao_ca CHECK (
            status_consolidacao_ca IN (N'PENDENTE', N'CONSOLIDADA', N'REVISAO_NECESSARIA')
        );

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'ck_iniciativas_acompanhamento_itens_tipo')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamento_itens_tipo CHECK (
            tipo IN (N'MARCO_ENTREGA', N'PROXIMO_PASSO', N'FRENTE_PROJETO')
        );
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'ck_iniciativas_acompanhamento_itens_ordem')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens WITH CHECK ADD CONSTRAINT ck_iniciativas_acompanhamento_itens_ordem CHECK (ordem >= 0);

    /* Foreign keys without cascading actions. */
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'fk_iniciativas_acompanhamentos_iniciativas')
        ALTER TABLE dbo.iniciativas_acompanhamentos WITH CHECK ADD CONSTRAINT fk_iniciativas_acompanhamentos_iniciativas FOREIGN KEY (iniciativa_id) REFERENCES dbo.iniciativas_estrategicas(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'fk_iniciativas_acompanhamento_itens_acompanhamentos')
        ALTER TABLE dbo.iniciativas_acompanhamento_itens WITH CHECK ADD CONSTRAINT fk_iniciativas_acompanhamento_itens_acompanhamentos FOREIGN KEY (acompanhamento_id) REFERENCES dbo.iniciativas_acompanhamentos(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_homologacoes') AND name = N'fk_iniciativas_homologacoes_acompanhamentos')
        ALTER TABLE dbo.iniciativas_homologacoes WITH CHECK ADD CONSTRAINT fk_iniciativas_homologacoes_acompanhamentos FOREIGN KEY (acompanhamento_id) REFERENCES dbo.iniciativas_acompanhamentos(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.iniciativas_evidencias') AND name = N'fk_iniciativas_evidencias_acompanhamentos')
        ALTER TABLE dbo.iniciativas_evidencias WITH CHECK ADD CONSTRAINT fk_iniciativas_evidencias_acompanhamentos FOREIGN KEY (acompanhamento_id) REFERENCES dbo.iniciativas_acompanhamentos(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

    /* Query indexes. */
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'idx_iniciativas_acompanhamentos_unidade_competencia_status')
        CREATE INDEX idx_iniciativas_acompanhamentos_unidade_competencia_status ON dbo.iniciativas_acompanhamentos (unidade_snapshot, competencia, status_fluxo);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'idx_iniciativas_acompanhamentos_diretoria_competencia_status')
        CREATE INDEX idx_iniciativas_acompanhamentos_diretoria_competencia_status ON dbo.iniciativas_acompanhamentos (diretoria_snapshot, competencia, status_fluxo);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'idx_iniciativas_acompanhamentos_iniciativa_ano_trimestre')
        CREATE INDEX idx_iniciativas_acompanhamentos_iniciativa_ano_trimestre ON dbo.iniciativas_acompanhamentos (iniciativa_id, ano, trimestre);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'idx_iniciativas_acompanhamento_itens_acompanhamento_tipo_ordem')
        CREATE INDEX idx_iniciativas_acompanhamento_itens_acompanhamento_tipo_ordem ON dbo.iniciativas_acompanhamento_itens (acompanhamento_id, tipo, ordem);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_homologacoes') AND name = N'idx_iniciativas_homologacoes_acompanhamento_data')
        CREATE INDEX idx_iniciativas_homologacoes_acompanhamento_data ON dbo.iniciativas_homologacoes (acompanhamento_id, data_acao);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_evidencias') AND name = N'idx_iniciativas_evidencias_acompanhamento_data')
        CREATE INDEX idx_iniciativas_evidencias_acompanhamento_data ON dbo.iniciativas_evidencias (acompanhamento_id, data_upload);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
