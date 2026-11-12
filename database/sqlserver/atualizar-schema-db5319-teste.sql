:setvar TargetDatabase "DB5319_IndicadoresEstrategicos_ANTES_RESTAURACAO_20261104"

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

USE [$(TargetDatabase)];
GO

/*
  Compatibiliza o banco restaurado de 04/11/2026 com a versao atual da aplicacao.
  O script preserva os dados existentes e cria somente estruturas ausentes.
*/

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.lancamentos', N'versao_atual') IS NULL
        ALTER TABLE dbo.lancamentos
        ADD versao_atual INT NOT NULL
            CONSTRAINT df_lancamentos_versao_atual DEFAULT (1) WITH VALUES;

    IF COL_LENGTH(N'dbo.evidencias', N'versao_lancamento') IS NULL
        ALTER TABLE dbo.evidencias
        ADD versao_lancamento INT NOT NULL
            CONSTRAINT df_evidencias_versao_lancamento DEFAULT (1) WITH VALUES;

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

/* Cria as tabelas funcionais ausentes, inclusive as de iniciativas. */
:r .\schema.sql
GO

USE [$(TargetDatabase)];
GO

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

SELECT
    DB_NAME() AS banco,
    (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0) AS tabelas_usuario;
GO
