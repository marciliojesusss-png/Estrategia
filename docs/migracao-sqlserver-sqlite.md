# Migracao SQL Server, SQLite e banco novo

O script `scripts/migrar-para-sqlserver.py` atende ao fluxo completo:

1. exporta as 20 tabelas do banco SQL Server `Estrategia` para
   `database/indicadores.sqlite`;
2. cria exclusivamente o banco novo `Monitoramento_Estrategia`;
3. aplica `database/sqlserver/schema.sql`;
4. importa os dados do SQLite, preservando inclusive os IDs de colunas
   `IDENTITY`;
5. compara contagens, chaves, agrupamentos, JSON, relacionamentos e tabelas de
   acesso.

Os arquivos SQLite e o relatorio gerado ficam ignorados pelo Git porque podem
conter dados da aplicacao.

## Requisitos

- Python 3;
- `pyodbc`;
- ODBC Driver 17 ou 18 for SQL Server;
- autenticacao integrada com acesso ao SQL Server.

Instalacao do modulo Python:

```powershell
python -m pip install --user pyodbc
```

## Exportar Estrategia para SQLite

```powershell
python .\scripts\migrar-para-sqlserver.py `
  --exportar-sqlserver-para-sqlite
```

O comando recusa substituir um SQLite existente. Para atualizar o snapshot,
criando antes uma copia de seguranca:

```powershell
python .\scripts\migrar-para-sqlserver.py `
  --exportar-sqlserver-para-sqlite `
  --sobrescrever-sqlite
```

## Criar e importar Monitoramento_Estrategia

```powershell
python .\scripts\migrar-para-sqlserver.py `
  --banco "Monitoramento_Estrategia" `
  --yes
```

O importador aborta se `Monitoramento_Estrategia` ja existir. Ele nao limpa,
trunca nem sobrescreve bancos existentes nesse fluxo.

O resultado detalhado da ultima verificacao fica em:

```text
database/sqlserver/migration-report.json
```
