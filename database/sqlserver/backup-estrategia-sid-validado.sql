/*
Executar em modo SQLCMD com autenticação integrada e privilégio sysadmin.

Exemplo:
sqlcmd -S "SERVIDOR\\INSTANCIA" -E -b -i ".\\database\\sqlserver\\backup-estrategia-sid-validado.sql" `
  -v BackupFile="D:\\Backup\\Estrategia_SID_s531902_VALIDADO_AAAAMMDD_HHMMSS.bak" `
     ValidationDatabase="Estrategia_Validacao_SID_AAAAMMDD_HHMMSS" `
     ValidationDataFile="D:\\SQLData\\Estrategia_Validacao_SID_AAAAMMDD_HHMMSS.mdf" `
     ValidationLogFile="D:\\SQLLog\\Estrategia_Validacao_SID_AAAAMMDD_HHMMSS_log.ldf"

O script:
- valida o SID e os papéis de s531902 antes do backup;
- cria um backup COPY_ONLY com CHECKSUM sem sobrescrever arquivo existente;
- executa VERIFYONLY, HEADERONLY e FILELISTONLY;
- restaura uma cópia isolada e valida o SID e os papéis dentro dela;
- remove somente a cópia temporária de validação.
*/

USE [master];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @BackupFile nvarchar(4000) = N'$(BackupFile)';
DECLARE @ValidationDatabase sysname = N'$(ValidationDatabase)';
DECLARE @ValidationDataFile nvarchar(4000) = N'$(ValidationDataFile)';
DECLARE @ValidationLogFile nvarchar(4000) = N'$(ValidationLogFile)';
DECLARE @ExpectedSid varbinary(85) = 0x401E46BC08211343899A19AC0768B6B8;
DECLARE @ExistingBackup int = 0;
DECLARE @Sql nvarchar(max);

IF DB_ID(N'Estrategia') IS NULL
    THROW 51400, 'O banco Estrategia nao existe nesta instancia.', 1;

IF @ValidationDatabase IN (N'Estrategia', N'master', N'model', N'msdb', N'tempdb')
    THROW 51401, 'Use um nome isolado para o banco temporario de validacao.', 1;

IF DB_ID(@ValidationDatabase) IS NOT NULL
    THROW 51402, 'O banco temporario de validacao ja existe.', 1;

EXEC master.dbo.xp_fileexist @BackupFile, @ExistingBackup OUTPUT;
IF @ExistingBackup = 1
    THROW 51403, 'O arquivo de backup ja existe; nenhum arquivo foi sobrescrito.', 1;

USE [Estrategia];

IF NOT EXISTS
(
    SELECT 1
    FROM sys.database_principals
    WHERE name = N's531902'
      AND sid = @ExpectedSid
)
    THROW 51404, 'O SID de s531902 nao corresponde ao SID corporativo.', 1;

IF EXISTS
(
    SELECT 1
    FROM sys.database_permissions AS p
    INNER JOIN sys.database_principals AS u
        ON u.principal_id = p.grantee_principal_id
    WHERE u.name = N's531902'
      AND p.permission_name = N'CONNECT'
      AND p.state = 'D'
)
    THROW 51405, 'Foi encontrado DENY CONNECT para s531902.', 1;

IF
(
    SELECT COUNT(*)
    FROM sys.database_role_members AS drm
    INNER JOIN sys.database_principals AS r
        ON r.principal_id = drm.role_principal_id
    INNER JOIN sys.database_principals AS m
        ON m.principal_id = drm.member_principal_id
    WHERE m.name = N's531902'
      AND r.name IN (N'db_datareader', N'db_datawriter')
) <> 2
    THROW 51406, 'Os papeis obrigatorios de s531902 nao foram encontrados.', 1;

USE [master];

BEGIN TRY
    BACKUP DATABASE [Estrategia]
    TO DISK = @BackupFile
    WITH INIT, COPY_ONLY, CHECKSUM, STATS = 10;

    RESTORE VERIFYONLY
    FROM DISK = @BackupFile
    WITH CHECKSUM;

    RESTORE HEADERONLY
    FROM DISK = @BackupFile;

    RESTORE FILELISTONLY
    FROM DISK = @BackupFile;

    SET @Sql =
        N'RESTORE DATABASE ' + QUOTENAME(@ValidationDatabase)
        + N' FROM DISK = N''' + REPLACE(@BackupFile, N'''', N'''''') + N''''
        + N' WITH MOVE N''Estrategia'' TO N'''
        + REPLACE(@ValidationDataFile, N'''', N'''''') + N''','
        + N' MOVE N''Estrategia_log'' TO N'''
        + REPLACE(@ValidationLogFile, N'''', N'''''') + N''','
        + N' RECOVERY, STATS = 10;';
    EXEC sys.sp_executesql @Sql;

    SET @Sql =
        N'USE ' + QUOTENAME(@ValidationDatabase) + N';'
        + N' IF NOT EXISTS (SELECT 1 FROM sys.database_principals'
        + N' WHERE name = N''s531902'' AND sid = @ExpectedSid)'
        + N' THROW 51407, ''O backup nao preservou o SID corporativo de s531902.'', 1;'
        + N' IF EXISTS (SELECT 1 FROM sys.database_permissions AS p'
        + N' INNER JOIN sys.database_principals AS u'
        + N' ON u.principal_id = p.grantee_principal_id'
        + N' WHERE u.name = N''s531902'''
        + N' AND p.permission_name = N''CONNECT'' AND p.state = ''D'')'
        + N' THROW 51408, ''O backup restaurado contem DENY CONNECT para s531902.'', 1;'
        + N' IF (SELECT COUNT(*) FROM sys.database_role_members AS drm'
        + N' INNER JOIN sys.database_principals AS r ON r.principal_id = drm.role_principal_id'
        + N' INNER JOIN sys.database_principals AS m ON m.principal_id = drm.member_principal_id'
        + N' WHERE m.name = N''s531902'''
        + N' AND r.name IN (N''db_datareader'', N''db_datawriter'')) <> 2'
        + N' THROW 51409, ''O backup restaurado nao preservou os papeis obrigatorios.'', 1;'
        + N' SELECT DB_NAME() AS banco_validado, name AS usuario_banco,'
        + N' CONVERT(varchar(170),sid,1) AS sid, default_schema_name'
        + N' FROM sys.database_principals WHERE name = N''s531902'';'
        + N' SELECT m.name AS membro, r.name AS papel'
        + N' FROM sys.database_role_members AS drm'
        + N' INNER JOIN sys.database_principals AS r ON r.principal_id = drm.role_principal_id'
        + N' INNER JOIN sys.database_principals AS m ON m.principal_id = drm.member_principal_id'
        + N' WHERE m.name = N''s531902'' ORDER BY r.name;';
    EXEC sys.sp_executesql
        @Sql,
        N'@ExpectedSid varbinary(85)',
        @ExpectedSid = @ExpectedSid;

    SELECT
        d.name AS banco_origem,
        SUSER_SNAME(d.owner_sid) AS owner_resolvido,
        CONVERT(varchar(170), d.owner_sid, 1) AS owner_sid,
        @BackupFile AS arquivo_backup,
        @ValidationDatabase AS banco_temporario_validado
    FROM sys.databases AS d
    WHERE d.name = N'Estrategia';

    SET @Sql =
        N'ALTER DATABASE ' + QUOTENAME(@ValidationDatabase)
        + N' SET SINGLE_USER WITH ROLLBACK IMMEDIATE;'
        + N' DROP DATABASE ' + QUOTENAME(@ValidationDatabase) + N';';
    EXEC sys.sp_executesql @Sql;
END TRY
BEGIN CATCH
    IF DB_ID(@ValidationDatabase) IS NOT NULL
    BEGIN
        SET @Sql =
            N'ALTER DATABASE ' + QUOTENAME(@ValidationDatabase)
            + N' SET SINGLE_USER WITH ROLLBACK IMMEDIATE;'
            + N' DROP DATABASE ' + QUOTENAME(@ValidationDatabase) + N';';
        EXEC sys.sp_executesql @Sql;
    END;
    THROW;
END CATCH;
GO
