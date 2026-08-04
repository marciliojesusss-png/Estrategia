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

---

## Fase 2.1 — Testar primeiro o PDO_SQLSRV

### Ações

* [ ] Verificar se `pdo_sqlsrv` aparece em `PDO::getAvailableDrivers()`.
* [ ] Testar conexão com usuário SQL explícito.
* [ ] Testar conexão com identidade integrada separadamente.
* [ ] Executar `SELECT 1`.
* [ ] Executar uma consulta em `dbo.indicadores`.
* [ ] Registrar o erro real no log, sem registrar senha ou DSN.

### Modificação em `Database.php`

Separar os métodos:

```php
connectPdoSqlsrv()
connectSqlsrvNative()
connectSqlite()
```

Adicionar uma exceção mais informativa:

```text
PDO_SQLSRV_INDISPONIVEL
```

em vez de uma mensagem genérica.

### Critério de conclusão

O seguinte teste deverá retornar sucesso:

```sql
SELECT 1 AS conexao;
```

---

## Fase 2.2 — Criar fallback com SQLSRV nativo

Esta fase somente será necessária se a infraestrutura não puder instalar ou habilitar `pdo_sqlsrv`.

## Novos arquivos

```text
app/core/database/SqlsrvConnectionAdapter.php
app/core/database/SqlsrvStatementAdapter.php
```

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

Há uso de transações em serviços de indicadores, lançamentos, homologações, evidências e administração.

## Nova configuração

```text
DB_DRIVER=sqlsrv
```

## Regra de seleção

```php
if (DB_DRIVER === 'pdo_sqlsrv') {
    // PDO
} elseif (DB_DRIVER === 'sqlsrv') {
    // adapter SQLSRV
}
```

## Critério de conclusão

Executar com sucesso:

* consulta simples;
* consulta com parâmetro;
* inclusão;
* alteração;
* transação com commit;
* transação com rollback;
* consulta com `fetchAll`.

---

