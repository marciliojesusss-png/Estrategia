# Controle obrigatório de SIDs nos backups do SQL Server

## Regra

Todo backup do banco `Estrategia` vinculado a esta aplicação deve conter e
preservar, obrigatoriamente, os dois SIDs corporativos abaixo.

| Identidade | Como deve constar no banco | SID obrigatório |
| --- | --- | --- |
| `s531902` | Usuário da aplicação em `sys.database_principals` | `0x401E46BC08211343899A19AC0768B6B8` |
| `CORPCAIXA\c118119` | Proprietário em `sys.databases.owner_sid` e SID do principal interno `dbo` | `0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000` |

Essa regra vale para backups de desenvolvimento, homologação, produção,
transferência, contingência e rollback. Não há exceção por ambiente ou
finalidade.

Um backup que contenha somente o SID de `s531902`, ou somente o SID de
`CORPCAIXA\c118119`, é **não conforme** e não pode ser liberado, transferido ou
utilizado como backup oficial da aplicação.

## O que precisa ser validado

O SQL Server associa logins da instância a usuários do banco pelo SID, não pelo
nome. Para o backup ser considerado válido:

- o login `s531902` deve existir na instância, estar habilitado e possuir o SID
  esperado;
- o usuário `s531902` deve existir no banco com o mesmo SID;
- `s531902` não pode possuir `DENY CONNECT`;
- `s531902` deve pertencer a `db_datareader` e `db_datawriter`;
- o login `CORPCAIXA\c118119` deve existir na instância, estar habilitado e
  possuir o SID esperado;
- `CORPCAIXA\c118119` deve ser o proprietário do banco;
- o `owner_sid` e o SID interno de `dbo` devem ser exatamente o SID de
  `CORPCAIXA\c118119`.

O principal interno continua se chamando `dbo`. Não é necessário criar outro
usuário do banco chamado `CORPCAIXA\c118119`; o requisito é que o SID dessa
conta esteja registrado no proprietário do banco e em `dbo`.

## Fluxo obrigatório

Para cada novo arquivo `.bak`:

1. Valide os dois logins na instância.
2. Valide `owner/dbo`, o usuário `s531902` e seus papéis no banco de origem.
3. Corrija qualquer divergência antes de gerar o backup.
4. Gere um arquivo novo com `COPY_ONLY` e `CHECKSUM`.
5. Execute `RESTORE VERIFYONLY` e confira que existe somente o conjunto de
   backup intencional.
6. Restaure o arquivo em um banco temporário e isolado.
7. Valide novamente os dois SIDs dentro da cópia restaurada.
8. Libere o arquivo somente se todas as verificações forem aprovadas.

A validação do banco de origem não substitui a restauração de teste. O aceite
definitivo é feito sobre o mesmo arquivo que será entregue ou armazenado.

## 1. Validação antes do backup

Execute como `sysadmin` na instância que gerará o backup:

```sql
USE [master];
GO

DECLARE @SidAplicacao varbinary(85) =
    0x401E46BC08211343899A19AC0768B6B8;
DECLARE @SidProprietario varbinary(85) =
    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000;

IF DB_ID(N'Estrategia') IS NULL
    THROW 51300, 'O banco Estrategia nao existe.', 1;

IF SUSER_SID(N's531902') IS NULL
   OR SUSER_SID(N's531902') <> @SidAplicacao
    THROW 51301, 'SID ausente ou incorreto para o login s531902.', 1;

IF SUSER_SID(N'CORPCAIXA\c118119') IS NULL
   OR SUSER_SID(N'CORPCAIXA\c118119') <> @SidProprietario
    THROW 51302, 'SID ausente ou incorreto para CORPCAIXA\c118119.', 1;

IF EXISTS
(
    SELECT 1
    FROM sys.server_principals
    WHERE name IN (N's531902', N'CORPCAIXA\c118119')
      AND is_disabled = 1
)
    THROW 51303, 'Um dos logins corporativos esta desabilitado.', 1;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.databases
    WHERE name = N'Estrategia'
      AND owner_sid = @SidProprietario
)
    THROW 51304, 'O owner_sid de Estrategia nao pertence a CORPCAIXA\c118119.', 1;
GO

USE [Estrategia];
GO

DECLARE @SidAplicacao varbinary(85) =
    0x401E46BC08211343899A19AC0768B6B8;
DECLARE @SidProprietario varbinary(85) =
    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.database_principals
    WHERE name = N'dbo'
      AND sid = @SidProprietario
)
    THROW 51305, 'O SID interno de dbo nao pertence a CORPCAIXA\c118119.', 1;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.database_principals
    WHERE name = N's531902'
      AND sid = @SidAplicacao
)
    THROW 51306, 'O usuario s531902 nao possui o SID corporativo.', 1;

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
    THROW 51307, 'Foi encontrado DENY CONNECT para s531902.', 1;

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
    THROW 51308, 'Os papeis obrigatorios de s531902 nao foram encontrados.', 1;

SELECT
    d.name AS banco,
    SUSER_SNAME(d.owner_sid) AS proprietario,
    CONVERT(varchar(170), d.owner_sid, 1) AS owner_sid,
    CONVERT(varchar(170), dbo_user.sid, 1) AS dbo_sid,
    CONVERT(varchar(170), app_user.sid, 1) AS s531902_sid
FROM master.sys.databases AS d
CROSS JOIN sys.database_principals AS dbo_user
CROSS JOIN sys.database_principals AS app_user
WHERE d.name = DB_NAME()
  AND dbo_user.name = N'dbo'
  AND app_user.name = N's531902';
GO
```

Qualquer `THROW` interrompe o processo. Não gere o backup enquanto houver uma
divergência.

## 2. Correção antes da geração

O procedimento preferencial para alinhar os dois SIDs e gerar um novo arquivo
é:

```text
database/sqlserver/gerar-backup-sids-corporativos.sql
```

Esse script deve ser executado em modo SQLCMD, como `sysadmin`, em uma instância
que consiga resolver os dois logins corporativos. Ele:

- restaura o backup de origem em um banco isolado;
- define `CORPCAIXA\c118119` como proprietário e `dbo`;
- cria ou remapeia `s531902` para o SID correto;
- garante `db_datareader` e `db_datawriter`;
- gera um arquivo novo sem sobrescrever o backup de origem.

Se uma instância local não conseguir resolver `CORPCAIXA\c118119`, ela não pode
gerar um backup conforme esta política. Nesse caso, faça o alinhamento e a
geração final em uma instância corporativa controlada.

O script `pos-restauracao-acesso-aplicacao.sql` corrige somente o usuário da
aplicação. Ele não substitui o alinhamento de `owner/dbo` e, isoladamente, não é
suficiente para aprovar um backup.

## 3. Geração do arquivo

Use sempre um caminho novo. O arquivo de saída não pode existir e o backup de
origem nunca deve ser sobrescrito.

```sql
USE [master];
GO

DECLARE @Arquivo nvarchar(4000) =
    N'D:\Backup\Estrategia-SIDs-Corporativos-Validado.bak';
DECLARE @ArquivoExiste int = 0;

EXEC master.dbo.xp_fileexist @Arquivo, @ArquivoExiste OUTPUT;
IF @ArquivoExiste = 1
    THROW 51320, 'O arquivo de saida ja existe.', 1;

BACKUP DATABASE [Estrategia]
TO DISK = @Arquivo
WITH INIT, COPY_ONLY, CHECKSUM, STATS = 10;

RESTORE VERIFYONLY
FROM DISK = @Arquivo
WITH CHECKSUM;

RESTORE HEADERONLY
FROM DISK = @Arquivo;

RESTORE FILELISTONLY
FROM DISK = @Arquivo;
GO
```

No `RESTORE HEADERONLY`, confirme que existe apenas o conjunto intencional. Em
um backup completo, `BackupType` deve ser `1`.

## 4. Validação definitiva do `.bak`

Restaure o arquivo em uma instância que resolva os dois logins. Ajuste os nomes
lógicos e caminhos conforme o resultado de `RESTORE FILELISTONLY`:

```sql
USE [master];
GO

RESTORE DATABASE [Estrategia_Validacao_SID]
FROM DISK = N'D:\Backup\Estrategia-SIDs-Corporativos-Validado.bak'
WITH
    MOVE N'Estrategia' TO N'D:\SQLData\Estrategia_Validacao_SID.mdf',
    MOVE N'Estrategia_log' TO N'D:\SQLLog\Estrategia_Validacao_SID_log.ldf',
    RECOVERY,
    STATS = 10;
GO
```

Valide a cópia restaurada:

```sql
USE [master];
GO

DECLARE @SidProprietario varbinary(85) =
    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.databases
    WHERE name = N'Estrategia_Validacao_SID'
      AND owner_sid = @SidProprietario
)
    THROW 51330, 'O backup nao preservou o owner_sid corporativo.', 1;
GO

USE [Estrategia_Validacao_SID];
GO

DECLARE @SidAplicacao varbinary(85) =
    0x401E46BC08211343899A19AC0768B6B8;
DECLARE @SidProprietario varbinary(85) =
    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000;

IF NOT EXISTS
    (SELECT 1 FROM sys.database_principals
     WHERE name = N'dbo' AND sid = @SidProprietario)
    THROW 51331, 'O backup nao preservou o SID corporativo de dbo.', 1;

IF NOT EXISTS
    (SELECT 1 FROM sys.database_principals
     WHERE name = N's531902' AND sid = @SidAplicacao)
    THROW 51332, 'O backup nao preservou o SID corporativo de s531902.', 1;

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
    THROW 51333, 'O backup restaurado contem DENY CONNECT para s531902.', 1;

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
    THROW 51334, 'O backup nao preservou os papeis de s531902.', 1;

SELECT
    DB_NAME() AS banco_validado,
    CONVERT(varchar(170), dbo_user.sid, 1) AS dbo_sid,
    CONVERT(varchar(170), app_user.sid, 1) AS s531902_sid
FROM sys.database_principals AS dbo_user
CROSS JOIN sys.database_principals AS app_user
WHERE dbo_user.name = N'dbo'
  AND app_user.name = N's531902';
GO
```

Somente depois da validação, remova o banco temporário. Confirme o nome antes
de executar:

```sql
USE [master];
GO
ALTER DATABASE [Estrategia_Validacao_SID]
    SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE [Estrategia_Validacao_SID];
GO
```

## Critérios de aceite

Um backup só pode ser aprovado quando todos os itens forem confirmados:

- [ ] `RESTORE VERIFYONLY ... WITH CHECKSUM` terminou sem erro.
- [ ] O arquivo contém somente o conjunto de backup esperado.
- [ ] `owner_sid` possui o SID de `CORPCAIXA\c118119`.
- [ ] O principal interno `dbo` possui o SID de `CORPCAIXA\c118119`.
- [ ] O usuário `s531902` possui o SID corporativo esperado.
- [ ] Não existe `DENY CONNECT` para `s531902`.
- [ ] `s531902` pertence a `db_datareader` e `db_datawriter`.
- [ ] Os mesmos valores foram confirmados após restaurar o `.bak`.
- [ ] O backup de origem não foi sobrescrito.
- [ ] A conexão da aplicação foi testada no IIS após a restauração.

Se qualquer item falhar, o backup deve ser rejeitado e gerado novamente após a
correção.

## Backups antigos

Backups anteriores que não comprovem os dois SIDs são considerados legados e
não conformes. Eles podem ser usados apenas como fonte controlada para gerar um
novo backup corrigido; não podem ser liberados como backup oficial.

O script `backup-estrategia-sid-validado.sql` valida principalmente o SID de
`s531902`. Ele não deve ser usado como única evidência de conformidade com esta
política. A validação dupla deste documento continua obrigatória.

## Segurança e armazenamento

Backups podem conter dados corporativos e informações pessoais. Portanto:

- não versione arquivos `.bak` no Git;
- não armazene backups no OneDrive, e-mail ou local não autorizado;
- restrinja o acesso aos arquivos e aos bancos temporários de validação;
- registre o hash do arquivo em toda transferência entre ambientes;
- elimine com segurança as cópias temporárias após a validação e a retenção
  obrigatória.
