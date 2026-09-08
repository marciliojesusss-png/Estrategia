SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM dbo.usuarios_acesso WHERE matricula = N'C118119')
BEGIN
    UPDATE dbo.usuarios_acesso
       SET nome = N'Administrador LDAP',
           perfil = N'administrador',
           sg_unidade = N'GERAL',
           no_unidade = N'Escopo geral',
           unidade_apuradora = NULL,
           diretoria_responsavel = NULL,
           ativo = 1,
           updated_at = SYSUTCDATETIME()
     WHERE matricula = N'C118119';
END
ELSE
BEGIN
    INSERT INTO dbo.usuarios_acesso (
        matricula, nome, perfil, sg_unidade, no_unidade,
        unidade_apuradora, diretoria_responsavel, ativo,
        created_at, updated_at
    ) VALUES (
        N'C118119', N'Administrador LDAP', N'administrador', N'GERAL', N'Escopo geral',
        NULL, NULL, 1, SYSUTCDATETIME(), SYSUTCDATETIME()
    );
END;

COMMIT TRANSACTION;

SELECT id, matricula, nome, perfil, ativo
FROM dbo.usuarios_acesso
WHERE matricula = N'C118119';
