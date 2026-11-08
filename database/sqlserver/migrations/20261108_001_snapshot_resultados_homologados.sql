SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 54001, 'Migration permitida somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.lancamentos_resultados_homologados', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.lancamentos_resultados_homologados (
            lancamento_id NVARCHAR(100) NOT NULL,
            versao_lancamento INT NOT NULL,
            indicador_id NVARCHAR(100) NOT NULL,
            competencia NVARCHAR(40) NOT NULL,
            meta_oficial DECIMAL(38, 12) NULL,
            resultado_calculado DECIMAL(38, 12) NULL,
            resultado_oficial DECIMAL(38, 12) NULL,
            percentual_atingido DECIMAL(38, 12) NULL,
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

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
