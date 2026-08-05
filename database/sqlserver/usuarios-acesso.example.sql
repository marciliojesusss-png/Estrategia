-- Modelo ficticio para cadastro inicial em homologacao.
-- Revise matriculas, nomes, unidades e diretorias conforme retorno real do LDAP.

SET XACT_ABORT ON;
BEGIN TRAN;

MERGE dbo.usuarios_acesso AS target
USING (
    VALUES
        (N'C000001', N'Administrador Homologacao', N'C000001', N'GERAL', N'Escopo geral', N'administrador', NULL, NULL, 1),
        (N'C000002', N'Unidade Apuradora Homologacao', N'C000002', N'SUCOL', N'Unidade SUCOL', N'unidade_apuradora', N'SUCOL', NULL, 1),
        (N'C000003', N'Homologador Homologacao', N'C000003', N'DIFIR', N'Diretoria DIFIR', N'homologador', NULL, N'DIFIR', 1),
        (N'C000004', N'Usuario Companhia Homologacao', N'C000004', N'GERAL', N'Escopo geral', N'usuario_companhia', NULL, NULL, 1)
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

SELECT matricula, nome, perfil, sg_unidade, unidade_apuradora, diretoria_responsavel, ativo
FROM dbo.usuarios_acesso
ORDER BY ativo DESC, perfil, matricula;
