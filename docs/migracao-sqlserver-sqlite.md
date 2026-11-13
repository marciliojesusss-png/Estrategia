# Migrar indicadores.sqlite para o SQL Server da CAIXA

O script `scripts/migrar-para-sqlserver.py` usa o arquivo local
`database/indicadores.sqlite` para criar um banco completamente novo no SQL
Server corporativo.

Destino fixado para o fluxo corporativo:

```text
Servidor: DF7436SR439
Banco novo: Monitoramento_Estrategia
Proprietario/dbo: CORPCAIXA\c118119
Login da aplicacao: s531902
```

O banco `DB5319_IndicadoresEstrategicos` nao e usado, limpo ou sobrescrito por
esse processo.

## Protecoes do fluxo

- exige que `Monitoramento_Estrategia` ainda nao exista;
- nunca usa um banco existente como destino;
- valida os SIDs corporativos antes de criar o banco;
- cria o banco inicialmente em `RESTRICTED_USER`;
- aplica `database/sqlserver/schema.sql`;
- importa as 20 tabelas e preserva valores de colunas `IDENTITY`;
- compara contagens, chaves, agrupamentos, JSON e relacionamentos;
- define `CORPCAIXA\c118119` como proprietario e `dbo`;
- cria ou remapeia `s531902` e garante `db_datareader` e `db_datawriter`;
- somente muda para `MULTI_USER` depois de todas as validacoes;
- em caso de erro, mantem o banco restrito para diagnostico.

No servidor `DF7436SR439`, as opcoes `--truncate`, `--seed-auth-users`,
`--skip-schema` e `--skip-verify` sao bloqueadas.

## Requisitos

1. O arquivo abaixo deve existir e ter sido previamente validado:

   ```text
   database/indicadores.sqlite
   ```

2. Python 3 e o modulo `pyodbc`:

   ```powershell
   python -m pip install --user pyodbc
   ```

3. ODBC Driver 17 ou 18 for SQL Server.
4. A maquina deve alcancar `DF7436SR439` pela rede corporativa.
5. A execucao usa autenticacao integrada do Windows.
6. Os logins `CORPCAIXA\c118119` e `s531902` devem existir na instancia com os
   SIDs corporativos esperados.
7. A execucao deve ocorrer pela propria conta `CORPCAIXA\c118119` ou por uma
   conta `sysadmin` com permissao para criar bancos.

## Executar a migracao

Abra o PowerShell na raiz da aplicacao e confira primeiro a ajuda:

```powershell
python .\scripts\migrar-para-sqlserver.py --help
```

Para criar e preencher o banco novo:

```powershell
python .\scripts\migrar-para-sqlserver.py --yes
```

Os valores abaixo ja sao os padroes e podem ser informados explicitamente para
facilitar a auditoria do comando:

```powershell
python .\scripts\migrar-para-sqlserver.py `
  --servidor "DF7436SR439" `
  --banco "Monitoramento_Estrategia" `
  --sqlite ".\database\indicadores.sqlite" `
  --yes
```

Sem `--yes`, o script exige a digitacao de `SIM` antes da criacao.

## Resultado esperado

Ao final devem aparecer as mensagens:

```text
Verificacao concluida sem alertas
SIDs e papeis corporativos validados
Banco liberado em MULTI_USER
```

O relatorio detalhado fica em:

```text
database/sqlserver/migration-report.json
```

O SQLite, suas copias de seguranca e o relatorio ficam ignorados pelo Git por
conterem dados da aplicacao.

## Exportacao opcional para atualizar o SQLite

A exportacao SQL Server local para SQLite continua disponivel como operacao
separada. Ela nao se conecta ao servidor da CAIXA por padrao:

```powershell
python .\scripts\migrar-para-sqlserver.py `
  --exportar-sqlserver-para-sqlite `
  --servidor-origem "localhost\SQLEXPRESS01" `
  --banco-origem "Estrategia" `
  --sobrescrever-sqlite
```
