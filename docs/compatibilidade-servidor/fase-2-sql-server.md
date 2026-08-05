# FASE 2 — COMPATIBILIZAR A CONEXÃO COM O SQL SERVER

## Problema atual

O Sistema-Expedientes utiliza:

```php
sqlsrv_connect()
```

Já o Estrategia utiliza:

```php
new PDO('sqlsrv:...')
```

O primeiro depende da extensão `sqlsrv`. O segundo depende da extensão adicional `pdo_sqlsrv`.

## Decisão técnica

A implementação deverá possuir dois modos:

```text
pdo_sqlsrv
sqlsrv
```

O modo principal continuará sendo `pdo_sqlsrv`. O modo `sqlsrv` será usado como compatibilidade quando o servidor não possuir o driver PDO.

Status: implementado no código por `DB_DRIVER=pdo_sqlsrv` e `DB_DRIVER=sqlsrv`.

---

## Fase 2.1 — Testar primeiro o PDO_SQLSRV

### Ações

* [ ] Verificar se `pdo_sqlsrv` aparece em `PDO::getAvailableDrivers()` no servidor.
* [ ] Testar conexão com usuário SQL explícito no servidor.
* [ ] Testar conexão com identidade integrada separadamente no servidor.
* [ ] Executar `SELECT 1` no SQL Server corporativo.
* [ ] Executar uma consulta em `dbo.indicadores` no SQL Server corporativo.
* [x] Registrar o erro real no log, sem registrar senha ou DSN.

Itens de conexão seguem pendentes porque dependem do servidor SQL Server corporativo e das extensões PHP instaladas nele.

### Modificação em `Database.php`

Separar os métodos:

```php
connectPdoSqlsrv()
connectSqlsrvNative()
connectSqlite()
```

Status: implementado em `app/core/Database.php`.

Adicionar uma exceção mais informativa:

```text
PDO_SQLSRV_INDISPONIVEL
```

em vez de uma mensagem genérica.

Status: implementado em `app/core/Database.php`.

### Critério de conclusão

O seguinte teste deverá retornar sucesso:

```sql
SELECT 1 AS conexao;
```

Status: pendente de execução no servidor SQL Server. O script `scripts/testar-sqlserver.php` foi criado para essa validação.

---

## Fase 2.2 — Criar fallback com SQLSRV nativo

Esta fase somente será necessária se a infraestrutura não puder instalar ou habilitar `pdo_sqlsrv`.

## Novos arquivos

```text
app/core/database/SqlsrvConnectionAdapter.php
app/core/database/SqlsrvStatementAdapter.php
```

Status: implementado.

## Finalidade

Criar uma camada que ofereça uma interface semelhante ao PDO, mas que internamente utilize:

```php
sqlsrv_connect()
sqlsrv_prepare()
sqlsrv_execute()
sqlsrv_query()
sqlsrv_fetch_array()
sqlsrv_begin_transaction()
sqlsrv_commit()
sqlsrv_rollback()
```

Isso evita reescrever imediatamente todos os repositories e services.

O Estrategia utiliza transações em diferentes serviços e repositories, portanto o fallback precisará suportar, pelo menos:

```text
prepare
query
execute
fetch
fetchAll
beginTransaction
commit
rollBack
rowCount
```

Status: implementado no adapter, incluindo `fetchColumn`, `bindValue`, `inTransaction` e `lastInsertId` para compatibilidade com os usos atuais.

Há uso de transações em serviços de indicadores, lançamentos, homologações, evidências e administração.

## Nova configuração

```text
DB_DRIVER=sqlsrv
```

Status: suportado pela configuração e por `Database::getConnection()`.

## Regra de seleção

```php
if (DB_DRIVER === 'pdo_sqlsrv') {
    // PDO
} elseif (DB_DRIVER === 'sqlsrv') {
    // adapter SQLSRV
}
```

Status: implementado em `app/core/Database.php`.

## Critério de conclusão

Executar com sucesso:

* [ ] consulta simples no SQL Server corporativo;
* [ ] consulta com parâmetro no SQL Server corporativo;
* [ ] inclusão no SQL Server corporativo;
* [ ] alteração no SQL Server corporativo;
* [ ] transação com commit no SQL Server corporativo;
* [ ] transação com rollback no SQL Server corporativo;
* [ ] consulta com `fetchAll` no SQL Server corporativo.

Validação local realizada: a suíte PHP passou com os repositories/services aceitando o novo contrato de conexão. A validação real do adapter `sqlsrv` depende da extensão `sqlsrv` e de acesso ao banco.

---

