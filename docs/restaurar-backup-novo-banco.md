# Restaurar o backup como banco novo

O utilitario `scripts/restaurar-backup-novo-banco.py` restaura o arquivo
`backup/Estrategia_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak` como um banco
novo no SQL Server `DF7436SR439`.

O nome padrao do banco novo e:

```text
Estrategia_HOMOLOGACAO_INICIATIVAS_20261111_110041
```

## Protecoes

- nao usa `WITH REPLACE`;
- aborta se o banco novo ja existir;
- aborta se algum `.mdf`, `.ndf` ou `.ldf` de destino ja existir;
- confirma no cabecalho que o backup completo pertence ao banco `Estrategia`;
- exige `--executar` para fazer qualquer alteracao;
- usa autenticacao integrada do Windows;
- confere os SIDs corporativos de `CORPCAIXA\c118119` e `s531902`;
- configura `CORPCAIXA\c118119` como `owner/dbo`;
- remapeia `s531902` e garante `db_datareader` e `db_datawriter`;
- executa `RESTORE VERIFYONLY` e `DBCC CHECKDB`;
- nunca remove automaticamente um banco criado parcialmente apos uma falha.

## Requisitos

1. Python 3.9 ou superior.
2. Driver ODBC 17 ou 18 para SQL Server.
3. Modulo Python `pyodbc`:

   ```powershell
   python -m pip install pyodbc
   ```

4. A conta Windows deve ter permissao para restaurar/criar banco na instancia.
5. O servico do SQL Server deve conseguir ler o backup em:

   ```text
   D:\SQLBackups\Estrategia_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak
   ```

O caminho `backup/...` do repositorio fica na estacao cliente. O comando
`RESTORE` e executado pelo servico do SQL Server e, portanto, precisa de um
caminho existente no servidor SQL ou de um compartilhamento UNC acessivel.

## Conferir o plano

Na raiz do projeto:

```powershell
python .\scripts\restaurar-backup-novo-banco.py
```

Esse comando nao conecta e nao altera o SQL Server.

## Restaurar

Depois que o `.bak` estiver em `D:\SQLBackups` no servidor:

```powershell
python .\scripts\restaurar-backup-novo-banco.py --executar
```

Para escolher outro nome:

```powershell
python .\scripts\restaurar-backup-novo-banco.py `
  --banco "DB5319_Estrategia_HOMOLOGACAO_INICIATIVAS" `
  --executar
```

## Copiar e restaurar na propria maquina do SQL Server

Se o projeto estiver sendo executado diretamente no servidor `DF7436SR439`, o
script pode copiar o arquivo local sem sobrescrever um arquivo existente:

```powershell
python .\scripts\restaurar-backup-novo-banco.py --copiar-backup --executar
```

Em execucao remota, copie o arquivo manualmente ou informe um caminho UNC com
`--backup-servidor`.

Para consultar todas as opcoes:

```powershell
python .\scripts\restaurar-backup-novo-banco.py --help
```
