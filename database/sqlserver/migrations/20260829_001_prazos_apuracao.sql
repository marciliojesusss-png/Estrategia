SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
BEGIN
    THROW 50001, 'Migration cancelada: execute somente no banco Estrategia.', 1;
END;

IF OBJECT_ID(N'dbo.prazos_apuracao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.prazos_apuracao (
        id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT pk_prazos_apuracao PRIMARY KEY,
        competencia CHAR(7) NOT NULL,
        data_limite_preenchimento DATE NOT NULL,
        data_limite_homologacao DATE NOT NULL,
        ativo BIT NOT NULL
            CONSTRAINT df_prazos_apuracao_ativo DEFAULT 1,
        created_at DATETIME2 NOT NULL
            CONSTRAINT df_prazos_apuracao_created_at DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NULL,
        CONSTRAINT uq_prazos_apuracao_competencia UNIQUE (competencia),
        CONSTRAINT ck_prazos_apuracao_competencia CHECK (
            competencia LIKE '[12][0-9][0-9][0-9]-[01][0-9]'
            AND SUBSTRING(competencia, 6, 2) BETWEEN '01' AND '12'
        ),
        CONSTRAINT ck_prazos_apuracao_datas CHECK (
            data_limite_homologacao >= data_limite_preenchimento
        )
    );
END;

