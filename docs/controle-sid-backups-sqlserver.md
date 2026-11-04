# Controle de SID nos backups do SQL Server

## Objetivo

Todo backup do banco `Estrategia` destinado ao ambiente corporativo da CAIXA
deve ser validado antes do envio. O usuário de banco `s531902` precisa possuir
o mesmo SID do login corporativo existente na instância de destino.

Não basta o login e o usuário terem o mesmo nome. O SQL Server associa um login
da instância a um usuário do banco pelo SID. Se os nomes forem iguais, mas os
SIDs forem diferentes, o usuário fica órfão e a aplicação pode receber erro de
login ou de acesso ao banco depois da restauração.

## SIDs de referência

Os valores atualmente homologados são:

| Identidade | Finalidade | SID esperado |
| --- | --- | --- |
| `s531902` | Login e usuário da aplicação | `0x401E46BC08211343899A19AC0768B6B8` |
| `CORPCAIXA\c118119` | Proprietário corporativo e `dbo` | `0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000` |

O SID de `s531902` é o vínculo necessário para a conexão da aplicação. O SID de
`CORPCAIXA\c118119` é um SID Windows de domínio e somente pode ser aplicado como
proprietário em uma instância que consiga resolver essa conta corporativa.

## Login, usuário, owner e dbo

- O **login** pertence à instância e aparece em `sys.server_principals`.
- O **usuário** pertence ao banco e aparece em `sys.database_principals`.
- O login e o usuário são associados quando seus SIDs são iguais.
- O **owner** aparece em `sys.databases.owner_sid`.
- O usuário interno **dbo** aparece em `sys.database_principals`.

Durante uma restauração, o `owner_sid` pode passar a ser o SID da conta que
executou a restauração. Por isso, a validação deve mostrar separadamente o
`owner_sid`, o SID interno de `dbo` e o SID de `s531902`.

## Regra obrigatória para cada backup

Antes de liberar um novo `.bak` para a CAIXA:

1. Verifique o SID de `s531902` no banco que será copiado.
2. Gere um arquivo novo usando `CHECKSUM` e `COPY_ONLY`.
3. Execute `RESTORE VERIFYONLY` no arquivo gerado.
4. Restaure o arquivo com um nome temporário e isolado.
5. Verifique novamente o SID dentro da cópia restaurada.
6. Confirme os papéis `db_datareader` e `db_datawriter`.
7. Não envie o backup se qualquer validação falhar.

A verificação do banco antes do backup não substitui a verificação do `.bak`.
O aceite definitivo deve ser feito sobre uma restauração do arquivo que será
entregue.

## Validação antes do backup

Execute no banco que será copiado:

```sql
USE [Estrategia];
GO

DECLARE @SidEsperado varbinary(85) =
    0x401E46BC08211343899A19AC0768B6B8;

IF NOT EXISTS
(
    SELECT 1
    FROM sys.database_principals
    WHERE name = N's531902'
      AND sid = @SidEsperado
)
    THROW 51300, 'O SID de s531902 nao corresponde ao SID corporativo.', 1;

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
    THROW 51301, 'Foi encontrado DENY CONNECT para s531902.', 1;

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
    THROW 51302, 'Os papeis obrigatorios de s531902 nao foram encontrados.', 1;

SELECT
    DB_NAME() AS banco,
    name AS usuario_banco,
    type_desc,
    authentication_type_desc,
    CONVERT(varchar(170), sid, 1) AS sid,
    SUSER_SNAME(sid) AS login_resolvido,
    default_schema_name
FROM sys.database_principals
WHERE name = N's531902';
GO
```

No ambiente local, `login_resolvido` pode aparecer como `NULL`. Isso é esperado
quando o login da CAIXA não existe localmente. O requisito para o backup é que o
usuário de banco preserve exatamente o SID corporativo.

## Validação dos logins na instância corporativa

Na instância da CAIXA, valide os logins antes de alterar o banco:

```sql
USE [master];
GO

SELECT
    name,
    type_desc,
    is_disabled,
    CONVERT(varchar(170), sid, 1) AS sid
FROM sys.server_principals
WHERE name IN (N'CORPCAIXA\c118119', N's531902');

IF SUSER_SID(N'CORPCAIXA\c118119') IS NULL
   OR SUSER_SID(N'CORPCAIXA\c118119') <>
      0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000
    THROW 51310, 'SID inesperado para CORPCAIXA\c118119.', 1;

IF SUSER_SID(N's531902') IS NULL
   OR SUSER_SID(N's531902') <>
      0x401E46BC08211343899A19AC0768B6B8
    THROW 51311, 'SID inesperado para s531902.', 1;
GO
```

Se um login estiver ausente, desabilitado ou com SID diferente, o DBA deve
corrigir o login da instância. Não se deve inventar ou substituir um SID
corporativo.

## Geração do backup

Gere sempre um arquivo novo. Não acrescente conjuntos a um `.bak` antigo e não
sobrescreva o arquivo usado como origem da correção.

```sql
BACKUP DATABASE [Estrategia]
TO DISK = N'D:\Backup\Estrategia-Producao-SID-Validado.bak'
WITH INIT, COPY_ONLY, CHECKSUM, STATS = 10;

RESTORE VERIFYONLY
FROM DISK = N'D:\Backup\Estrategia-Producao-SID-Validado.bak'
WITH CHECKSUM;

RESTORE HEADERONLY
FROM DISK = N'D:\Backup\Estrategia-Producao-SID-Validado.bak';
```

O nome do arquivo deve identificar que ele passou pela validação de SID. O
resultado de `RESTORE HEADERONLY` deve apresentar somente o conjunto de backup
intencional. Para um backup completo, `BackupType` deve ser `1`.

## Validação definitiva do arquivo

Primeiro consulte os nomes lógicos gravados no backup:

```sql
RESTORE FILELISTONLY
FROM DISK = N'D:\Backup\Estrategia-Producao-SID-Validado.bak';
```

Depois restaure uma cópia isolada. Ajuste os nomes lógicos e caminhos conforme
o resultado de `RESTORE FILELISTONLY`:

```sql
RESTORE DATABASE [Estrategia_Validacao_SID]
FROM DISK = N'D:\Backup\Estrategia-Producao-SID-Validado.bak'
WITH
    MOVE N'Estrategia' TO N'D:\SQLData\Estrategia_Validacao_SID.mdf',
    MOVE N'Estrategia_log' TO N'D:\SQLLog\Estrategia_Validacao_SID_log.ldf',
    RECOVERY,
    STATS = 10;
```

Valide o SID e os papéis dentro da cópia:

```sql
USE [Estrategia_Validacao_SID];
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.database_principals
    WHERE name = N's531902'
      AND sid = 0x401E46BC08211343899A19AC0768B6B8
)
    THROW 51320, 'O backup nao preservou o SID corporativo de s531902.', 1;

SELECT
    name,
    type_desc,
    CONVERT(varchar(170), sid, 1) AS sid,
    default_schema_name
FROM sys.database_principals
WHERE name = N's531902';

SELECT
    m.name AS membro,
    r.name AS papel
FROM sys.database_role_members AS drm
INNER JOIN sys.database_principals AS r
    ON r.principal_id = drm.role_principal_id
INNER JOIN sys.database_principals AS m
    ON m.principal_id = drm.member_principal_id
WHERE m.name = N's531902'
ORDER BY r.name;
GO
```

Depois da auditoria, remova somente o banco temporário de validação:

```sql
USE [master];
GO
ALTER DATABASE [Estrategia_Validacao_SID]
    SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE [Estrategia_Validacao_SID];
GO
```

Confirme cuidadosamente o nome antes de executar a remoção.

## Correção dos SIDs

Para restaurar uma cópia isolada, corrigir `owner/dbo` e `s531902`, validar os
valores e gerar um novo backup, use:

```text
database/sqlserver/gerar-backup-sids-corporativos.sql
```

Esse script deve ser executado como `sysadmin` na instância corporativa. Ele
aborta antes da alteração quando os logins ou SIDs esperados não estão
disponíveis e nunca sobrescreve o backup de origem.

Para apenas criar ou remapear o usuário da aplicação depois de uma restauração,
use:

```text
database/sqlserver/pos-restauracao-acesso-aplicacao.sql
```

## Critérios de aceite

Um backup somente pode ser liberado quando todos os itens abaixo forem
confirmados:

- `RESTORE VERIFYONLY ... WITH CHECKSUM` foi concluído sem erro.
- `s531902` existe dentro do banco restaurado.
- O SID de `s531902` é `0x401E46BC08211343899A19AC0768B6B8`.
- Não existe `DENY CONNECT` para `s531902`.
- `s531902` pertence a `db_datareader` e `db_datawriter`.
- O arquivo contém um único conjunto de backup intencional.
- O backup de origem não foi sobrescrito.
- Quando exigido, `owner/dbo` foi alinhado com `CORPCAIXA\c118119` na instância
  corporativa.
- A conexão foi testada no IIS com a mesma configuração usada pela aplicação.

## Segurança e armazenamento

Backups completos podem conter dados corporativos e informações pessoais. Eles
não devem ser versionados no Git nem copiados para OneDrive, e-mail ou outro
destino sem autorização explícita. O hash do arquivo deve ser registrado quando
houver transferência entre ambientes.

## Registro da correção de 4 de novembro de 2026

Na correção realizada no banco local `Estrategia`:

- o usuário `s531902` foi criado com o SID corporativo esperado;
- foram concedidos `CONNECT`, `db_datareader` e `db_datawriter`;
- o backup foi gerado com `COPY_ONLY` e `CHECKSUM`;
- `RESTORE VERIFYONLY` foi concluído com sucesso;
- uma restauração temporária confirmou o SID e os dois papéis dentro do `.bak`.

O arquivo corrigido foi gerado como:

```text
Estrategia_SID_s531902_CORRIGIDO_20261104.bak
```
