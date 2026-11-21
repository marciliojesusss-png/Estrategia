/*
  Grupos compartilhados de preenchimento e acesso temporario de auditor CAIXA.
  Banco esperado: Estrategia

  Caracteristicas:
  - transacional e idempotente;
  - nao altera LDAP, proprietario, SIDs ou arquivos fisicos;
  - preserva lancamentos e snapshots historicos (inclusive GERIN);
  - nao cadastra matriculas automaticamente.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [Estrategia];
GO

DECLARE @ownerSidAntes VARBINARY(85) = (SELECT owner_sid FROM sys.databases WHERE name = DB_NAME());
DECLARE @usuariosAntes INT = (SELECT COUNT(*) FROM dbo.usuarios_acesso);
DECLARE @lancamentosAntes INT = (SELECT COUNT(*) FROM dbo.lancamentos);
DECLARE @homologacoesAntes INT = (SELECT COUNT(*) FROM dbo.homologacoes);
DECLARE @evidenciasAntes INT = (SELECT COUNT(*) FROM dbo.evidencias);
DECLARE @auditoriaAntes INT = (SELECT COUNT(*) FROM dbo.auditoria);

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.grupos_preenchimento', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.grupos_preenchimento (
            codigo NVARCHAR(50) NOT NULL CONSTRAINT pk_grupos_preenchimento PRIMARY KEY,
            nome NVARCHAR(255) NOT NULL,
            tipo_escopo NVARCHAR(20) NOT NULL,
            escopo_referencia NVARCHAR(255) NOT NULL,
            limite_vagas INT NOT NULL,
            ativo BIT NOT NULL CONSTRAINT df_grupos_preenchimento_ativo DEFAULT (1),
            created_at DATETIME2 NOT NULL CONSTRAINT df_grupos_preenchimento_created_at DEFAULT (SYSUTCDATETIME()),
            updated_at DATETIME2 NULL,
            CONSTRAINT ck_grupos_preenchimento_tipo CHECK (tipo_escopo IN (N'UNIDADE', N'DIRETORIA')),
            CONSTRAINT ck_grupos_preenchimento_limite CHECK (limite_vagas > 0)
        );
    END;

    IF OBJECT_ID(N'dbo.grupos_preenchimento_unidades', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.grupos_preenchimento_unidades (
            grupo_codigo NVARCHAR(50) NOT NULL,
            unidade_codigo NVARCHAR(50) NOT NULL,
            created_at DATETIME2 NOT NULL CONSTRAINT df_grupos_preenchimento_unidades_created_at DEFAULT (SYSUTCDATETIME()),
            CONSTRAINT pk_grupos_preenchimento_unidades PRIMARY KEY (grupo_codigo, unidade_codigo),
            CONSTRAINT fk_grupos_preenchimento_unidades_grupo FOREIGN KEY (grupo_codigo)
                REFERENCES dbo.grupos_preenchimento(codigo)
        );
    END;

    IF COL_LENGTH(N'dbo.usuarios_acesso', N'grupo_preenchimento_codigo') IS NULL
        ALTER TABLE dbo.usuarios_acesso ADD grupo_preenchimento_codigo NVARCHAR(50) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'fk_usuarios_acesso_grupo_preenchimento')
        ALTER TABLE dbo.usuarios_acesso WITH CHECK ADD CONSTRAINT fk_usuarios_acesso_grupo_preenchimento
            FOREIGN KEY (grupo_preenchimento_codigo) REFERENCES dbo.grupos_preenchimento(codigo);

    IF OBJECT_ID(N'dbo.concessoes_acesso_auditoria', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.concessoes_acesso_auditoria (
            id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_concessoes_acesso_auditoria PRIMARY KEY,
            usuario_acesso_id INT NOT NULL,
            data_inicio DATETIME2 NOT NULL,
            data_fim DATETIME2 NOT NULL,
            justificativa NVARCHAR(1000) NOT NULL,
            protocolo NVARCHAR(100) NOT NULL,
            aprovado_por NVARCHAR(100) NOT NULL,
            ativo BIT NOT NULL CONSTRAINT df_concessoes_acesso_auditoria_ativo DEFAULT (1),
            created_at DATETIME2 NOT NULL CONSTRAINT df_concessoes_acesso_auditoria_created_at DEFAULT (SYSUTCDATETIME()),
            updated_at DATETIME2 NULL,
            CONSTRAINT fk_concessoes_acesso_auditoria_usuario FOREIGN KEY (usuario_acesso_id)
                REFERENCES dbo.usuarios_acesso(id),
            CONSTRAINT ck_concessoes_acesso_auditoria_periodo CHECK (data_fim > data_inicio)
        );
        CREATE INDEX ix_concessoes_auditoria_usuario_periodo
            ON dbo.concessoes_acesso_auditoria(usuario_acesso_id, ativo, data_inicio, data_fim);
    END;

    MERGE dbo.grupos_preenchimento AS destino
    USING (VALUES
        (N'DICOT', N'Preenchimento compartilhado DICOT', N'DIRETORIA', N'DICOT', 6, CAST(1 AS BIT)),
        (N'DILOT', N'Preenchimento compartilhado DILOT', N'DIRETORIA', N'DILOT', 2, CAST(1 AS BIT)),
        (N'SURCI', N'Preenchimento SURCI', N'UNIDADE', N'SURCI', 2, CAST(1 AS BIT)),
        (N'SUCTF', N'Preenchimento compartilhado SUCTF e GELOF', N'DIRETORIA', N'DIFIR', 2, CAST(1 AS BIT))
    ) AS origem(codigo, nome, tipo_escopo, escopo_referencia, limite_vagas, ativo)
    ON destino.codigo = origem.codigo
    WHEN MATCHED THEN UPDATE SET
        nome = origem.nome, tipo_escopo = origem.tipo_escopo,
        escopo_referencia = origem.escopo_referencia, limite_vagas = origem.limite_vagas,
        ativo = origem.ativo, updated_at = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (codigo, nome, tipo_escopo, escopo_referencia, limite_vagas, ativo)
        VALUES (origem.codigo, origem.nome, origem.tipo_escopo, origem.escopo_referencia, origem.limite_vagas, origem.ativo);

    MERGE dbo.grupos_preenchimento_unidades AS destino
    USING (VALUES
        (N'DICOT', N'SUCOL'), (N'DICOT', N'SULOT'), (N'DICOT', N'GENOL'), (N'DICOT', N'SUNEG'),
        (N'DILOT', N'GERIN'), (N'DILOT', N'DILOT'),
        (N'SURCI', N'SURCI'), (N'SUCTF', N'SUCTF'), (N'SUCTF', N'GELOF')
    ) AS origem(grupo_codigo, unidade_codigo)
    ON destino.grupo_codigo = origem.grupo_codigo AND destino.unidade_codigo = origem.unidade_codigo
    WHEN NOT MATCHED THEN INSERT (grupo_codigo, unidade_codigo)
        VALUES (origem.grupo_codigo, origem.unidade_codigo)
    WHEN NOT MATCHED BY SOURCE AND destino.grupo_codigo IN (N'DICOT', N'DILOT', N'SURCI', N'SUCTF') THEN DELETE;

    IF (SELECT COUNT(*) FROM dbo.indicadores WHERE UPPER(LTRIM(RTRIM(unidade_apuradora))) = N'GERIN') NOT IN (0, 2)
        THROW 51001, 'Quantidade inesperada de indicadores GERIN. Migracao cancelada.', 1;

    UPDATE dbo.indicadores
       SET unidade_apuradora = N'DILOT', updated_at = CONVERT(NVARCHAR(40), SYSUTCDATETIME(), 127)
     WHERE UPPER(LTRIM(RTRIM(unidade_apuradora))) = N'GERIN';

    IF (SELECT COUNT(*) FROM dbo.indicadores WHERE numero IN (12, 15) AND unidade_apuradora = N'DILOT') <> 2
        THROW 51002, 'Os indicadores 12 e 15 nao ficaram sob responsabilidade DILOT.', 1;

    DECLARE @unidades NVARCHAR(MAX) = (SELECT valor_json FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK) WHERE chave = N'unidades');
    IF ISJSON(@unidades) <> 1 THROW 51003, 'Configuracao de unidades invalida.', 1;

    -- SQL Server 2016 exige caminho literal no JSON_MODIFY. Cada objeto e
    -- atualizado isoladamente, preservando campos presentes e a ordem da lista.
    SELECT @unidades = N'[' + COALESCE(STUFF((
        SELECT N',' + CASE
            WHEN UPPER(JSON_VALUE([value], '$.sigla')) = N'GERIN'
                THEN JSON_MODIFY([value], '$.ativo', CAST(0 AS BIT))
            WHEN UPPER(JSON_VALUE([value], '$.sigla')) = N'DILOT'
                THEN JSON_MODIFY([value], '$.ativo', CAST(1 AS BIT))
            ELSE [value]
        END
        FROM OPENJSON(@unidades)
        ORDER BY CONVERT(INT, [key])
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 1, N''), N'') + N']';

    IF NOT EXISTS (SELECT 1 FROM OPENJSON(@unidades) WHERE UPPER(JSON_VALUE([value], '$.sigla')) = N'DILOT')
        SET @unidades = JSON_MODIFY(@unidades, 'append $', JSON_QUERY(N'{"id":"dilot","sigla":"DILOT","nome":"DILOT","ativo":true}'));

    UPDATE dbo.configuracoes
       SET valor_json = @unidades, updated_at = CONVERT(NVARCHAR(40), SYSUTCDATETIME(), 127)
     WHERE chave = N'unidades';

    IF (SELECT COUNT(*) FROM dbo.grupos_preenchimento WHERE ativo = 1) <> 4
        THROW 51004, 'Grupos de preenchimento nao foram configurados corretamente.', 1;
    IF (SELECT COUNT(*) FROM dbo.grupos_preenchimento_unidades WHERE grupo_codigo IN (N'DICOT', N'DILOT', N'SURCI', N'SUCTF')) <> 9
        THROW 51005, 'Mapeamento de unidades dos grupos ficou incompleto.', 1;
    IF (SELECT owner_sid FROM sys.databases WHERE name = DB_NAME()) <> @ownerSidAntes
        THROW 51006, 'SID do proprietario foi alterado. Migracao cancelada.', 1;
    IF (SELECT COUNT(*) FROM dbo.usuarios_acesso) <> @usuariosAntes
       OR (SELECT COUNT(*) FROM dbo.lancamentos) <> @lancamentosAntes
       OR (SELECT COUNT(*) FROM dbo.homologacoes) <> @homologacoesAntes
       OR (SELECT COUNT(*) FROM dbo.evidencias) <> @evidenciasAntes
       OR (SELECT COUNT(*) FROM dbo.auditoria) <> @auditoriaAntes
        THROW 51007, 'Dados historicos ou de acesso foram alterados indevidamente.', 1;

    COMMIT TRANSACTION;
    SELECT N'Migracao concluida.' AS resultado,
           (SELECT COUNT(*) FROM dbo.grupos_preenchimento WHERE ativo = 1) AS grupos_ativos,
           (SELECT COUNT(*) FROM dbo.indicadores WHERE unidade_apuradora = N'DILOT') AS indicadores_dilot;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
