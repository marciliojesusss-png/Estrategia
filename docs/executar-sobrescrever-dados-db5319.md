# Sobrescrever os dados do DB5319

## O que este procedimento faz

O script `sobrescrever-dados-db5319.sql` copia os dados do backup:

```text
Estrategia_PRE_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak
```

para o banco:

```text
DB5319_IndicadoresEstrategicos_ANTES_RESTAURACAO_20261104
```

O nome do banco no SQL Server é sem acento em `RESTAURACAO`.

> **Atenção:** os dados funcionais atuais do banco de destino serão apagados e
> substituídos pelos dados do backup.

O script preserva e valida:

- proprietário do banco (`owner_sid`);
- SID interno de `dbo`;
- SID do usuário `s531902`;
- logins, usuários SQL, roles e permissões do destino.

Antes da substituição, é criado automaticamente um backup de segurança do
banco de destino.

## Importante sobre o backup

O backup é anterior à homologação das iniciativas. Portanto, depois da carga:

- os acompanhamentos poderão aparecer como `ENVIADO_HOMOLOGACAO`;
- o relatório filtrado por `Homologado` poderá não apresentar iniciativas;
- os usuários de aplicação também serão substituídos pelos existentes no backup.

## 1. Preparar a execução

Confirme que o backup existe:

```powershell
Test-Path -LiteralPath '.\backup\Estrategia_PRE_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak'
```

O resultado deve ser `True`.

Confirme que o banco está online:

```powershell
sqlcmd -S "LUKIN\SQLEXPRESS01" -E -Q "SELECT name,state_desc FROM sys.databases WHERE name=N'DB5319_IndicadoresEstrategicos_ANTES_RESTAURACAO_20261104';"
```

Antes de continuar:

1. Pare a aplicação.
2. Feche as conexões do SSMS com o banco de destino.
3. Confirme que ninguém está utilizando o banco.

O script será interrompido se encontrar outra conexão ativa.

## 2. Executar o script

Na raiz do projeto, entre na pasta SQL Server:

```powershell
Set-Location '.\database\sqlserver'
```

Execute:

```powershell
sqlcmd -S "LUKIN\SQLEXPRESS01" -E -b -f 65001 -i ".\sobrescrever-dados-db5319.sql"
```

O parâmetro `-b` encerra a execução caso ocorra qualquer erro.

## 3. Confirmar o sucesso

Ao final, devem aparecer as mensagens:

```text
CARGA CONCLUIDA. O banco destino manteve owner_sid, dbo e s531902.
Valide a aplicacao antes de reabrir o acesso dos usuarios.
```

O script também:

- valida o backup de origem;
- restaura a origem em um banco temporário;
- confere tabelas e colunas;
- copia os dados dentro de uma transação;
- valida constraints e integridade;
- remove o banco temporário após o sucesso.

## 4. Validar o banco

Execute:

```powershell
sqlcmd -S "LUKIN\SQLEXPRESS01" -E -b -d "DB5319_IndicadoresEstrategicos_ANTES_RESTAURACAO_20261104" -Q "SET NOCOUNT ON; DBCC CHECKDB WITH NO_INFOMSGS; SELECT COUNT(*) AS tabelas FROM sys.tables WHERE is_ms_shipped=0; SELECT name,sys.fn_varbintohexstr(sid) AS sid FROM sys.database_principals WHERE name IN (N'dbo',N's531902'); SELECT status_fluxo,COUNT(*) AS quantidade FROM dbo.iniciativas_acompanhamentos GROUP BY status_fluxo;"
```

Depois, reinicie a aplicação e valide:

1. Login.
2. Dashboard.
3. Indicadores.
4. Iniciativas com o filtro `Enviado para homologação`.
5. Usuários de acesso e relatórios.

## Se ocorrer erro

- Não execute o script novamente imediatamente.
- Leia a mensagem apresentada pelo `sqlcmd`.
- Os dados são revertidos se a falha ocorrer durante a transação de carga.
- O banco temporário permanece disponível para diagnóstico.
- Preserve o backup de segurança criado antes da carga.
- Verifique conexões ativas, espaço em disco, caminhos e permissões.

O backup de segurança é criado em:

```text
C:\Program Files\Microsoft SQL Server\MSSQL13.SQLEXPRESS01\MSSQL\Backup\DB5319_IndicadoresEstrategicos_ANTES_RESTAURACAO_20261104_PRE_CARGA_PRE_HOMOLOG_20261111_110041.bak
```

