/*
Executar em modo SQLCMD, como sysadmin, na instancia corporativa.

Objetivo:
- restaurar uma copia isolada do backup Estrategia;
- alinhar owner/dbo com CORPCAIXA\c118119;
- criar ou remapear o usuario s531902 para o login de mesmo SID;
- gerar um NOVO backup, sem sobrescrever o arquivo de origem.

Exemplo:
sqlcmd -S "SERVIDOR\INSTANCIA" -E -b `
  -i ".\database\sqlserver\gerar-backup-sids-corporativos.sql" `
  -v StagingDatabase="Estrategia_SID_Ajuste" `
     SourceBackupPath="D:\Backup\Estrategia_LogBackup_2026-09-28_19-22-05.bak" `
     StagingDataPath="D:\SQLData\Estrategia_SID_Ajuste.mdf" `
     StagingLogPath="D:\SQLLog\Estrategia_SID_Ajuste_log.ldf" `
     OutputBackupPath="D:\Backup\Estrategia_SIDs_Corporativos.bak"

O banco de staging fica ONLINE ao final para permitir auditoria. Remova-o
manualmente somente depois de copiar e validar o novo backup.
*/

USE [master];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @StagingDatabase sysname = N'$(StagingDatabase)';
DECLARE @SourceBackupPath nvarchar(4000) = N'$(SourceBackupPath)';
DECLARE @StagingDataPath nvarchar(4000) = N'$(StagingDataPath)';
DECLARE @StagingLogPath nvarchar(4000) = N'$(StagingLogPath)';
DECLARE @OutputBackupPath nvarchar(4000) = N'$(OutputBackupPath)';
DECLARE @OwnerLogin sysname = N'CORPCAIXA\c118119';
DECLARE @ApplicationLogin sysname = N's531902';
DECLARE @ExpectedOwnerSid varbinary(85) =
    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000;
DECLARE @ExpectedApplicationSid varbinary(85) =
    0x401E46BC08211343899A19AC0768B6B8;
DECLARE @ExistingOutput int = 0;
DECLARE @sql nvarchar(max);

IF @StagingDatabase IN (N'Estrategia', N'DB5319_IndicadoresEstrategicos')
    THROW 51101, 'Use um nome isolado para StagingDatabase; o banco original nao pode ser alvo.', 1;

IF DB_ID(@StagingDatabase) IS NOT NULL
    THROW 51102, 'O banco de staging ja existe. Nenhuma restauracao foi executada.', 1;

IF @SourceBackupPath = @OutputBackupPath
    THROW 51103, 'SourceBackupPath e OutputBackupPath devem ser diferentes.', 1;

IF SUSER_SID(@OwnerLogin) IS NULL
    THROW 51104, 'O login CORPCAIXA\c118119 nao existe ou nao pode ser resolvido nesta instancia.', 1;

IF SUSER_SID(@OwnerLogin) <> @ExpectedOwnerSid
    THROW 51105, 'O SID de CORPCAIXA\c118119 nao coincide com o SID esperado.', 1;

IF SUSER_SID(@ApplicationLogin) IS NULL
    THROW 51106, 'O login s531902 nao existe nesta instancia.', 1;

IF SUSER_SID(@ApplicationLogin) <> @ExpectedApplicationSid
    THROW 51107, 'O SID do login s531902 nao coincide com o SID esperado.', 1;

IF EXISTS
(
    SELECT 1
    FROM sys.server_principals
    WHERE name IN (@OwnerLogin, @ApplicationLogin)
      AND is_disabled = 1
)
    THROW 51108, 'O login proprietario ou o login da aplicacao esta desabilitado.', 1;

EXEC master.dbo.xp_fileexist @OutputBackupPath, @ExistingOutput OUTPUT;
IF @ExistingOutput = 1
    THROW 51109, 'O arquivo de saida ja existe. Escolha um novo OutputBackupPath.', 1;

RESTORE VERIFYONLY
FROM DISK = @SourceBackupPath;

SET @sql =
    N'RESTORE DATABASE ' + QUOTENAME(@StagingDatabase)
    + N' FROM DISK = N''' + REPLACE(@SourceBackupPath, N'''', N'''''') + N''''
    + N' WITH MOVE N''Estrategia'' TO N'''
    + REPLACE(@StagingDataPath, N'''', N'''''') + N''','
    + N' MOVE N''Estrategia_log'' TO N'''
    + REPLACE(@StagingLogPath, N'''', N'''''') + N''','
    + N' RECOVERY, STATS = 10;';

EXEC sys.sp_executesql @sql;

BEGIN TRY
    BEGIN TRANSACTION;

    SET @sql =
        N'ALTER AUTHORIZATION ON DATABASE::' + QUOTENAME(@StagingDatabase)
        + N' TO ' + QUOTENAME(@OwnerLogin) + N';';
    EXEC sys.sp_executesql @sql;

    SET @sql =
        N'USE ' + QUOTENAME(@StagingDatabase) + N';'
        + N' IF USER_ID(N''' + REPLACE(@ApplicationLogin, N'''', N'''''') + N''') IS NULL'
        + N' CREATE USER ' + QUOTENAME(@ApplicationLogin)
        + N' FOR LOGIN ' + QUOTENAME(@ApplicationLogin)
        + N' WITH DEFAULT_SCHEMA = [dbo];'
        + N' ELSE ALTER USER ' + QUOTENAME(@ApplicationLogin)
        + N' WITH LOGIN = ' + QUOTENAME(@ApplicationLogin)
        + N', DEFAULT_SCHEMA = [dbo];'
        + N' IF NOT EXISTS ('
        + N' SELECT 1 FROM sys.database_role_members drm'
        + N' JOIN sys.database_principals r ON r.principal_id = drm.role_principal_id'
        + N' JOIN sys.database_principals m ON m.principal_id = drm.member_principal_id'
        + N' WHERE r.name = N''db_datareader'' AND m.name = N'''
        + REPLACE(@ApplicationLogin, N'''', N'''''') + N''')'
        + N' ALTER ROLE [db_datareader] ADD MEMBER ' + QUOTENAME(@ApplicationLogin) + N';'
        + N' IF NOT EXISTS ('
        + N' SELECT 1 FROM sys.database_role_members drm'
        + N' JOIN sys.database_principals r ON r.principal_id = drm.role_principal_id'
        + N' JOIN sys.database_principals m ON m.principal_id = drm.member_principal_id'
        + N' WHERE r.name = N''db_datawriter'' AND m.name = N'''
        + REPLACE(@ApplicationLogin, N'''', N'''''') + N''')'
        + N' ALTER ROLE [db_datawriter] ADD MEMBER ' + QUOTENAME(@ApplicationLogin) + N';';
    EXEC sys.sp_executesql @sql;

    IF EXISTS
    (
        SELECT 1
        FROM sys.databases
        WHERE name = @StagingDatabase
          AND owner_sid <> @ExpectedOwnerSid
    )
        THROW 51110, 'O owner_sid nao foi atualizado para o SID corporativo.', 1;

    SET @sql =
        N'USE ' + QUOTENAME(@StagingDatabase) + N';'
        + N' IF NOT EXISTS (SELECT 1 FROM sys.database_principals'
        + N' WHERE name = N''dbo'' AND sid = @OwnerSid)'
        + N' THROW 51111, ''O SID interno de dbo nao foi atualizado.'', 1;'
        + N' IF NOT EXISTS (SELECT 1 FROM sys.database_principals'
        + N' WHERE name = @ApplicationLogin AND sid = @ApplicationSid)'
        + N' THROW 51112, ''O SID de s531902 nao foi atualizado.'', 1;';
    EXEC sys.sp_executesql
        @sql,
        N'@OwnerSid varbinary(85), @ApplicationLogin sysname, @ApplicationSid varbinary(85)',
        @OwnerSid = @ExpectedOwnerSid,
        @ApplicationLogin = @ApplicationLogin,
        @ApplicationSid = @ExpectedApplicationSid;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SET @sql =
    N'BACKUP DATABASE ' + QUOTENAME(@StagingDatabase)
    + N' TO DISK = N''' + REPLACE(@OutputBackupPath, N'''', N'''''') + N''''
    + N' WITH INIT, COPY_ONLY, CHECKSUM, STATS = 10;';
EXEC sys.sp_executesql @sql;

RESTORE VERIFYONLY
FROM DISK = @OutputBackupPath
WITH CHECKSUM;

SELECT
    d.name AS database_name,
    SUSER_SNAME(d.owner_sid) AS owner_name,
    CONVERT(varchar(170), d.owner_sid, 1) AS owner_sid,
    @ApplicationLogin AS application_login,
    CONVERT(varchar(170), SUSER_SID(@ApplicationLogin), 1) AS application_sid,
    @OutputBackupPath AS novo_backup
FROM sys.databases AS d
WHERE d.name = @StagingDatabase;
GO
