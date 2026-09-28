/*
Executar no modo SQLCMD depois de cada restauracao no ambiente corporativo.

Variaveis obrigatorias na execucao:
- DatabaseName: nome do banco restaurado;
- ApplicationLogin: login corporativo ja existente na instancia.

O login da instancia deve ser criado e administrado previamente pelo DBA.
Este script cria ou remapeia somente o usuario dentro do banco restaurado e
concede as funcoes de leitura e gravacao usadas pela aplicacao.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [master];
GO

IF DB_ID(N'$(DatabaseName)') IS NULL
    THROW 51000, 'O banco informado em DatabaseName nao existe.', 1;

IF SUSER_ID(N'$(ApplicationLogin)') IS NULL
    THROW 51001, 'O login informado em ApplicationLogin nao existe na instancia.', 1;

IF EXISTS (
    SELECT 1
    FROM sys.server_principals
    WHERE name = N'$(ApplicationLogin)'
      AND is_disabled = 1
)
    THROW 51002, 'O login da aplicacao esta desabilitado na instancia.', 1;
GO

USE [$(DatabaseName)];
GO

DECLARE @login sysname = N'$(ApplicationLogin)';
DECLARE @sql nvarchar(max);

IF USER_ID(@login) IS NULL
BEGIN
    SET @sql = N'CREATE USER ' + QUOTENAME(@login)
        + N' FOR LOGIN ' + QUOTENAME(@login)
        + N' WITH DEFAULT_SCHEMA = [dbo];';
END
ELSE
BEGIN
    SET @sql = N'ALTER USER ' + QUOTENAME(@login)
        + N' WITH LOGIN = ' + QUOTENAME(@login)
        + N', DEFAULT_SCHEMA = [dbo];';
END;

EXEC sys.sp_executesql @sql;

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members AS drm
    INNER JOIN sys.database_principals AS role_principal
        ON role_principal.principal_id = drm.role_principal_id
    INNER JOIN sys.database_principals AS member_principal
        ON member_principal.principal_id = drm.member_principal_id
    WHERE role_principal.name = N'db_datareader'
      AND member_principal.name = @login
)
BEGIN
    SET @sql = N'ALTER ROLE [db_datareader] ADD MEMBER ' + QUOTENAME(@login) + N';';
    EXEC sys.sp_executesql @sql;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members AS drm
    INNER JOIN sys.database_principals AS role_principal
        ON role_principal.principal_id = drm.role_principal_id
    INNER JOIN sys.database_principals AS member_principal
        ON member_principal.principal_id = drm.member_principal_id
    WHERE role_principal.name = N'db_datawriter'
      AND member_principal.name = @login
)
BEGIN
    SET @sql = N'ALTER ROLE [db_datawriter] ADD MEMBER ' + QUOTENAME(@login) + N';';
    EXEC sys.sp_executesql @sql;
END;

SELECT
    DB_NAME() AS banco,
    dp.name AS usuario_banco,
    dp.type_desc AS tipo_usuario,
    SUSER_SNAME(dp.sid) AS login_instancia,
    dp.default_schema_name
FROM sys.database_principals AS dp
WHERE dp.name = @login;

SELECT
    member_principal.name AS membro,
    role_principal.name AS papel
FROM sys.database_role_members AS drm
INNER JOIN sys.database_principals AS role_principal
    ON role_principal.principal_id = drm.role_principal_id
INNER JOIN sys.database_principals AS member_principal
    ON member_principal.principal_id = drm.member_principal_id
WHERE member_principal.name = @login
ORDER BY role_principal.name;
GO
