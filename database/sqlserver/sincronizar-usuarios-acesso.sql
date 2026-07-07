USE [Estrategia];
GO

SET XACT_ABORT ON;
BEGIN TRAN;


MERGE dbo.usuarios_acesso AS target
USING (
    VALUES (N'C000002', N'Unidade Apuradora Local', N'C000002', N'SUCOL', N'Ambiente Local', N'unidade_apuradora', N'SUCOL', NULL, 1)
) AS source (
    matricula,
    nome,
    email,
    sg_unidade,
    no_unidade,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo
)
ON target.matricula = source.matricula
WHEN MATCHED THEN
    UPDATE SET
        nome = source.nome,
        email = source.email,
        sg_unidade = source.sg_unidade,
        no_unidade = source.no_unidade,
        perfil = source.perfil,
        unidade_apuradora = source.unidade_apuradora,
        diretoria_responsavel = source.diretoria_responsavel,
        ativo = source.ativo,
        updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        matricula,
        nome,
        email,
        sg_unidade,
        no_unidade,
        perfil,
        unidade_apuradora,
        diretoria_responsavel,
        ativo,
        created_at,
        updated_at
    )
    VALUES (
        source.matricula,
        source.nome,
        source.email,
        source.sg_unidade,
        source.no_unidade,
        source.perfil,
        source.unidade_apuradora,
        source.diretoria_responsavel,
        source.ativo,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );


MERGE dbo.usuarios_acesso AS target
USING (
    VALUES (N'C000004', N'Usuario Companhia Local', N'C000004', N'LOCAL', N'Ambiente Local', N'usuario_companhia', NULL, NULL, 1)
) AS source (
    matricula,
    nome,
    email,
    sg_unidade,
    no_unidade,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo
)
ON target.matricula = source.matricula
WHEN MATCHED THEN
    UPDATE SET
        nome = source.nome,
        email = source.email,
        sg_unidade = source.sg_unidade,
        no_unidade = source.no_unidade,
        perfil = source.perfil,
        unidade_apuradora = source.unidade_apuradora,
        diretoria_responsavel = source.diretoria_responsavel,
        ativo = source.ativo,
        updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        matricula,
        nome,
        email,
        sg_unidade,
        no_unidade,
        perfil,
        unidade_apuradora,
        diretoria_responsavel,
        ativo,
        created_at,
        updated_at
    )
    VALUES (
        source.matricula,
        source.nome,
        source.email,
        source.sg_unidade,
        source.no_unidade,
        source.perfil,
        source.unidade_apuradora,
        source.diretoria_responsavel,
        source.ativo,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );


MERGE dbo.usuarios_acesso AS target
USING (
    VALUES (N'C118119', N'Administrador Local', N'marcilio.cruz@caixa.gov.br', N'LOCAL', N'Ambiente Local', N'administrador', NULL, NULL, 1)
) AS source (
    matricula,
    nome,
    email,
    sg_unidade,
    no_unidade,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo
)
ON target.matricula = source.matricula
WHEN MATCHED THEN
    UPDATE SET
        nome = source.nome,
        email = source.email,
        sg_unidade = source.sg_unidade,
        no_unidade = source.no_unidade,
        perfil = source.perfil,
        unidade_apuradora = source.unidade_apuradora,
        diretoria_responsavel = source.diretoria_responsavel,
        ativo = source.ativo,
        updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        matricula,
        nome,
        email,
        sg_unidade,
        no_unidade,
        perfil,
        unidade_apuradora,
        diretoria_responsavel,
        ativo,
        created_at,
        updated_at
    )
    VALUES (
        source.matricula,
        source.nome,
        source.email,
        source.sg_unidade,
        source.no_unidade,
        source.perfil,
        source.unidade_apuradora,
        source.diretoria_responsavel,
        source.ativo,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );


MERGE dbo.usuarios_acesso AS target
USING (
    VALUES (N'C123321', N'Homologador Local', N'elvis.alves@caixa.gov.br', N'DIFIR', N'Ambiente Local', N'homologador', NULL, N'DIFIR', 1)
) AS source (
    matricula,
    nome,
    email,
    sg_unidade,
    no_unidade,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo
)
ON target.matricula = source.matricula
WHEN MATCHED THEN
    UPDATE SET
        nome = source.nome,
        email = source.email,
        sg_unidade = source.sg_unidade,
        no_unidade = source.no_unidade,
        perfil = source.perfil,
        unidade_apuradora = source.unidade_apuradora,
        diretoria_responsavel = source.diretoria_responsavel,
        ativo = source.ativo,
        updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        matricula,
        nome,
        email,
        sg_unidade,
        no_unidade,
        perfil,
        unidade_apuradora,
        diretoria_responsavel,
        ativo,
        created_at,
        updated_at
    )
    VALUES (
        source.matricula,
        source.nome,
        source.email,
        source.sg_unidade,
        source.no_unidade,
        source.perfil,
        source.unidade_apuradora,
        source.diretoria_responsavel,
        source.ativo,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );


COMMIT;

SELECT
    id,
    matricula,
    nome,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo,
    created_at,
    updated_at
FROM dbo.usuarios_acesso
ORDER BY ativo DESC, nome ASC, matricula ASC;
