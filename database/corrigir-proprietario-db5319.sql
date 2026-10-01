/*
  Corrige exclusivamente o proprietário/dbo da base restaurada.

  Executar na instância corporativa como sysadmin, depois da restauração.
  O script aborta antes da alteração se o login corporativo ou os SIDs
  conhecidos não forem exatamente os esperados.
*/

USE [master];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Banco sysname = N'DB5319_IndicadoresEstrategicos';
DECLARE @LoginCorporativo sysname = N'CORPCAIXA\c118119';
DECLARE @SidCorporativoEsperado varbinary(85) =
    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000;
DECLARE @SidAplicacaoEsperado varbinary(85) =
    0x401E46BC08211343899A19AC0768B6B8;
DECLARE @SidLoginCorporativo varbinary(85);
DECLARE @SidAplicacaoAntes varbinary(85);

IF DB_ID(@Banco) IS NULL
    THROW 51000, 'A base DB5319_IndicadoresEstrategicos não existe nesta instância.', 1;

IF DATABASEPROPERTYEX(@Banco, 'Status') <> 'ONLINE'
    THROW 51001, 'A base DB5319_IndicadoresEstrategicos não está ONLINE.', 1;

SET @SidLoginCorporativo = SUSER_SID(@LoginCorporativo);

IF @SidLoginCorporativo IS NULL
    THROW 51002, 'O login CORPCAIXA\c118119 não existe ou não pode ser resolvido nesta instância.', 1;

IF @SidLoginCorporativo <> @SidCorporativoEsperado
    THROW 51003, 'O SID de CORPCAIXA\c118119 não coincide com o SID encontrado no backup antigo.', 1;

SELECT @SidAplicacaoAntes = sid
FROM [DB5319_IndicadoresEstrategicos].sys.database_principals
WHERE name = N's531902';

IF @SidAplicacaoAntes IS NULL
    THROW 51004, 'O usuário de banco s531902 não existe.', 1;

IF @SidAplicacaoAntes <> @SidAplicacaoEsperado
    THROW 51005, 'O SID do usuário de banco s531902 não é o esperado; nenhuma alteração foi aplicada.', 1;

IF EXISTS
(
    SELECT 1
    FROM [DB5319_IndicadoresEstrategicos].sys.database_permissions AS p
    JOIN [DB5319_IndicadoresEstrategicos].sys.database_principals AS u
      ON u.principal_id = p.grantee_principal_id
    WHERE u.name = N's531902'
      AND p.permission_name = N'CONNECT'
      AND p.state = 'D'
)
    THROW 51006, 'Foi encontrado DENY CONNECT para s531902; nenhuma alteração foi aplicada.', 1;

SELECT
    N'ANTES' AS etapa,
    d.name AS database_name,
    SUSER_SNAME(d.owner_sid) AS owner_name,
    CONVERT(varchar(170), d.owner_sid, 1) AS owner_sid,
    SUSER_SNAME(dbo_user.sid) AS dbo_resolvido,
    CONVERT(varchar(170), dbo_user.sid, 1) AS dbo_sid,
    CONVERT(varchar(170), @SidAplicacaoAntes, 1) AS s531902_sid
FROM sys.databases AS d
CROSS JOIN [DB5319_IndicadoresEstrategicos].sys.database_principals AS dbo_user
WHERE d.name = @Banco
  AND dbo_user.name = N'dbo';

BEGIN TRY
    BEGIN TRANSACTION;

    ALTER AUTHORIZATION
        ON DATABASE::[DB5319_IndicadoresEstrategicos]
        TO [CORPCAIXA\c118119];

    IF EXISTS
    (
        SELECT 1
        FROM sys.databases
        WHERE name = @Banco
          AND owner_sid <> @SidCorporativoEsperado
    )
        THROW 51007, 'O owner_sid não foi atualizado para o SID corporativo.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM [DB5319_IndicadoresEstrategicos].sys.database_principals
        WHERE name = N'dbo'
          AND sid <> @SidCorporativoEsperado
    )
        THROW 51008, 'O SID interno de dbo não foi atualizado para o SID corporativo.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM [DB5319_IndicadoresEstrategicos].sys.database_principals
        WHERE name = N's531902'
          AND sid <> @SidAplicacaoAntes
    )
        THROW 51009, 'O SID de s531902 mudou inesperadamente; a transação será revertida.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT
    N'DEPOIS' AS etapa,
    d.name AS database_name,
    SUSER_SNAME(d.owner_sid) AS owner_name,
    CONVERT(varchar(170), d.owner_sid, 1) AS owner_sid,
    SUSER_SNAME(dbo_user.sid) AS dbo_resolvido,
    CONVERT(varchar(170), dbo_user.sid, 1) AS dbo_sid,
    CASE WHEN d.owner_sid = dbo_user.sid THEN N'SIM' ELSE N'NAO' END
        AS owner_e_dbo_alinhados,
    CONVERT(varchar(170), app_user.sid, 1) AS s531902_sid
FROM sys.databases AS d
CROSS JOIN [DB5319_IndicadoresEstrategicos].sys.database_principals AS dbo_user
CROSS JOIN [DB5319_IndicadoresEstrategicos].sys.database_principals AS app_user
WHERE d.name = @Banco
  AND dbo_user.name = N'dbo'
  AND app_user.name = N's531902';

SELECT
    r.name AS papel_s531902
FROM [DB5319_IndicadoresEstrategicos].sys.database_role_members AS drm
JOIN [DB5319_IndicadoresEstrategicos].sys.database_principals AS r
  ON r.principal_id = drm.role_principal_id
JOIN [DB5319_IndicadoresEstrategicos].sys.database_principals AS m
  ON m.principal_id = drm.member_principal_id
WHERE m.name = N's531902'
ORDER BY r.name;
GO
