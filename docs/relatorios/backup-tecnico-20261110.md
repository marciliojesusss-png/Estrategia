# Relatório de backup tecnico - banco `Estrategia`

Data: 2026-11-10
Politica aplicada: `docs/controle-sid-backups-sqlserver.md`
Escopo: analise do projeto, geracao e verificacao de backup local do banco
`Estrategia`.

## 1. Resultado

| Item | Resultado |
| --- | --- |
| Backup gerado | Sim (arquivo novo, sem sobrescrever origem) |
| `COPY_ONLY` + `CHECKSUM` | Sim |
| `RESTORE VERIFYONLY ... WITH CHECKSUM` | Aprovado |
| Um unico conjunto de backup (`BackupType = 1`) | Aprovado |
| Restauracao de teste + `DBCC CHECKDB` | Aprovado |
| SID da aplicacao `s531902` | Aprovado |
| `owner_sid` / `dbo` = `CORPCAIXA\c118119` | **Reprovado** |
| Conformidade final da politica | **NAO CONFORME** |

O arquivo gerado e um **backup tecnico local**, valido como fonte controlada,
mas **nao pode ser liberado, transferido ou usado como backup oficial** da
aplicacao, porque a instancia local nao possui os dois SIDs corporativos.

## 2. Ambiente analisado

| Item | Valor |
| --- | --- |
| Instancia | `localhost\SQLEXPRESS01` (SQL Server 2016 Express, 13.0.5108.50) |
| Maquina | `LUKIN` (fora do dominio corporativo) |
| Banco | `Estrategia` (ONLINE, recovery `FULL`) |
| Arquivos | `Estrategia_Primary.mdf` / `Estrategia_Primary.ldf` (72 MB cada) |
| Tabelas de usuario | 20 |
| Configuracao da aplicacao | `app/config/servidor.local.php` (`integrated`, ambiente `development`) |

O projeto esta estruturado conforme o README: PHP 7.1+/`sqlsrv`, front
controller em `public/index.php`, rotas por `index.php?route=...`, schema em
`database/sqlserver/schema.sql` e 47 migrations idempotentes em
`database/sqlserver/migrations/`.

## 3. Validacao previa (secao 1 da politica)

Executada em modo somente leitura, sem alterar o banco de origem:

| # | Verificacao | Resultado | Detalhe |
| --- | --- | --- | --- |
| 01 | Login `s531902` existe | FALHA | ausente na instancia |
| 02 | SID do login `s531902` | FALHA | ausente |
| 03 | Login `CORPCAIXA\c118119` existe | FALHA | nao resolvido na instancia |
| 04 | SID do login `CORPCAIXA\c118119` | FALHA | nao resolvido na instancia |
| 05 | Logins habilitados | FALHA | logins nao existem |
| 06 | `owner_sid` de `Estrategia` | FALHA | `Lukin\Lukin` `0x010500000000000515000000C49B8F7A8EFEBA391046A000E9030000` |
| 07 | SID interno de `dbo` | FALHA | mesmo SID de `Lukin\Lukin` |
| 08 | SID do usuario `s531902` no banco | OK | `0x401E46BC08211343899A19AC0768B6B8` |
| 09 | `DENY CONNECT` para `s531902` | OK | inexistente |
| 10 | Papeis de `s531902` | OK | `db_datareader`, `db_datawriter` |

Conclusao da etapa: o requisito do usuario da aplicacao esta atendido, mas o
requisito de proprietario/`dbo` nao pode ser corrigido nesta instancia. O
`SUSER_SID(N'CORPCAIXA\c118119')` retorna `NULL`; maquinas fora do dominio nao
resolvem a conta e **nao podem** gerar backup conforme a secao 2 da politica.

## 4. Arquivo gerado

| Item | Valor |
| --- | --- |
| Caminho | `C:\Backup\Estrategia\Estrategia_TECNICO_NAO-CONFORME-SID_20261110_091926.bak` |
| Tamanho | 11.718.656 bytes (11,2 MB) |
| Criado em | 2026-11-10 09:19:31 |
| SHA-256 | `C3A0D367CC8A94C00BCC83538C11F30BBD70E770599AAD51CBEA94EFC63861CB` |
| Nome logico do backup | `Estrategia backup tecnico local - NAO CONFORME SIDs corporativos` |
| `BackupType` | `1` (Database) |
| `IsCopyOnly` | `1` |
| `HasBackupChecksums` | `1` |
| Conjuntos no arquivo | 1 |
| `DatabaseBackupLSN` | `41000002282400112` |
| Recovery model | `FULL` |

Local escolhido fora do OneDrive, conforme a secao "Seguranca e armazenamento".

## 5. Verificacoes executadas sobre o arquivo

1. `RESTORE VERIFYONLY FROM DISK = ... WITH CHECKSUM` - sem erro.
2. `RESTORE HEADERONLY` - 1 conjunto, `BackupType = 1`, `Position = 1`,
   `ServerName = LUKIN\SQLEXPRESS01`.
3. `RESTORE FILELISTONLY` - arquivos logicos `Estrategia` (D) e
   `Estrategia_log` (L).
4. Restauracao em banco isolado `Estrategia_Validacao_SID` com `MOVE` para
   `...\MSSQL\DATA\Estrategia_Validacao_SID.mdf` / `_log.ldf`.
5. `DBCC CHECKDB` sem erros de consistencia.
6. Validacao da copia restaurada (secao 4 da politica):

| Verificacao | Resultado | Detalhe |
| --- | --- | --- |
| `owner_sid` restaurado | FALHA | `Lukin\Lukin` |
| `dbo` restaurado | FALHA | SID de `Lukin\Lukin` |
| `s531902` restaurado | OK | `0x401E46BC08211343899A19AC0768B6B8` |
| `DENY CONNECT` apos restauracao | OK | inexistente |
| Papeis apos restauracao | OK | `db_datareader`, `db_datawriter` |

7. Banco temporario `Estrategia_Validacao_SID` removido ao final
   (confirmado: 0 bancos restantes com esse nome).

## 6. Criterios de aceite da politica

- [x] `RESTORE VERIFYONLY ... WITH CHECKSUM` terminou sem erro.
- [x] O arquivo contem somente o conjunto de backup esperado.
- [ ] `owner_sid` possui o SID de `CORPCAIXA\c118119`.
- [ ] O principal interno `dbo` possui o SID de `CORPCAIXA\c118119`.
- [x] O usuario `s531902` possui o SID corporativo esperado.
- [x] Nao existe `DENY CONNECT` para `s531902`.
- [x] `s531902` pertence a `db_datareader` e `db_datawriter`.
- [x] Os mesmos valores foram confirmados apos restaurar o `.bak`.
- [x] O backup de origem nao foi sobrescrito (arquivo novo, `INIT` e
      verificacao de existencia previa).
- [ ] A conexao da aplicacao foi testada no IIS apos a restauracao.

Resultado: **reprovado** nos requisitos de `owner/dbo` e no teste de conexao no
IIS. O arquivo deve permanecer identificado como legado/nao conforme.

## 7. Como produzir o backup conforme

Na instancia corporativa, como `sysadmin`, com os logins `CORPCAIXA\c118119` e
`s531902` ja existentes com os SIDs esperados:

```powershell
sqlcmd -S "SERVIDOR\INSTANCIA" -E -b `
  -i ".\database\sqlserver\gerar-backup-sids-corporativos.sql" `
  -v StagingDatabase="Estrategia_SID_Ajuste" `
     SourceBackupPath="D:\Backup\Estrategia_TECNICO_NAO-CONFORME-SID_20261110_091926.bak" `
     StagingDataPath="D:\SQLData\Estrategia_SID_Ajuste.mdf" `
     StagingLogPath="D:\SQLLog\Estrategia_SID_Ajuste_log.ldf" `
     OutputBackupPath="D:\Backup\Estrategia_SIDs_Corporativos_20261110.bak"
```

O script restaura o arquivo em staging, aplica `ALTER AUTHORIZATION` para
`CORPCAIXA\c118119`, remapeia `s531902`, garante os papeis, valida os dois SIDs e
grava um novo `.bak` com `COPY_ONLY` e `CHECKSUM`. Depois disso, ainda e
obrigatorio executar a validacao definitiva da secao 4 da politica sobre o novo
arquivo e testar a conexao no IIS.

Se o ambiente corporativo nao aceitar o arquivo local como origem, gere o
backup diretamente do banco `Estrategia` de origem com os SIDs ja alinhados.

## 8. Achados adicionais (repositorio e operacao)

1. **Backup versionado no Git**: `backup/DB5319_IndicadoresEstrategicos_ANTES_RESTAURACAO_20261104.bak`
   esta rastreado (`git ls-files`). A politica proibe versionar `.bak`.
   Recomendacao: `git rm --cached` do arquivo, adicionar `*.bak` e `/backup/` ao
   `.gitignore` e avaliar a remocao do arquivo do historico.
2. **Backup dentro do OneDrive**: a pasta do projeto esta no OneDrive e a
   subpasta `backup/` mantem um `.bak` corporativo. A politica proibe
   armazenamento em OneDrive. Recomendacao: mover para local autorizado e
   eliminar a copia.
3. **Script legado**: `database/sqlserver/backup-estrategia-sid-validado.sql`
   valida apenas o SID de `s531902`, exatamente o caso apontado como
   insuficiente na politica. Uso deve ficar restrito a diagnostico.
4. **Script de conveniencia**: `scripts/backup-seguranca-consistencia.php` gera
   backup para caminho fixo da instancia local, sem validar SIDs, sem
   `VERIFYONLY` com `CHECKSUM` (o `WITH CHECKSUM` esta no BACKUP, nao na
   verificacao) e sem restauracao de teste. Nao deve ser usado como evidencia de
   conformidade.
5. **Recovery model `FULL` sem rotina de log backup**: `log_reuse_wait_desc =
   LOG_BACKUP`, indicando que o log de transacoes nao e truncado. Risco de
   crescimento do `.ldf` e de falha por falta de espaco.
6. **Teste no IIS pendente**: o aceite exige `php .\scripts\diagnostico-sqlserver.php`
   no servidor web apos a restauracao. Nao foi executado por se tratar de
   ambiente local.

## 9. Proximos passos

1. Tratar os itens 1 e 2 da secao 8 (remover `.bak` do Git e do OneDrive).
2. Levar o arquivo ao ambiente corporativo e executar
   `gerar-backup-sids-corporativos.sql` para gerar o `.bak` conforme.
3. Rodar a validacao dupla da secao 4 da politica sobre o novo arquivo e
   registrar o hash na transferencia.
4. Testar a conexao da aplicacao no IIS.
5. Definir rotina de backup de log (`FULL`) ou reavaliar o recovery model.
