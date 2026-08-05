# FASE 7 — CRIAR UM DIAGNÓSTICO TÉCNICO DO SERVIDOR

## Novo arquivo

```text
scripts/preflight-servidor.php
```

Status: implementado.

## Verificações

O script deverá conferir:

```text
versão do PHP
php.ini carregado
extensão sqlsrv
extensão pdo_sqlsrv
extensão ldap
drivers PDO disponíveis
configuração carregada
arquivo LDAP legado existente
diretórios graváveis
conexão SQL
SELECT 1
existência das tabelas
```

Status: coberto por `scripts/preflight-servidor.php`.

## Diagnóstico do IIS

Criar temporariamente:

```text
public/diagnostico-iis.php
```

Status: implementado como arquivo temporário de diagnóstico com saída limitada.

Ele deverá exibir somente informações não sensíveis:

```text
PHP_VERSION
REMOTE_USER presente ou ausente
AUTH_TYPE
SERVER_SOFTWARE
REQUEST_URI
APP_BASE_PATH
```

Status: coberto por `public/diagnostico-iis.php`.

Não deverá exibir:

* senha;
* usuário SQL completo;
* senha LDAP;
* cookie;
* token;
* connection string.

O arquivo deverá ser excluído após a homologação.

Status: o arquivo não exibe senhas, cookies, tokens, usuário SQL completo nem connection string. Deve ser removido após a homologação no IIS.

## Logs por etapa

Padronizar mensagens:

```text
[BOOT]
[CONFIG]
[DATABASE]
[AUTH]
[SESSION]
[ROUTER]
[UPLOAD]
```

Exemplo:

```text
[DATABASE] Driver pdo_sqlsrv indisponível.
[AUTH] Arquivo LDAP legado não localizado.
[ROUTER] Caminho-base divergente: esperado /estrategia.
```

Status: `scripts/preflight-servidor.php` emite mensagens por etapa e usa `Logger` com marcadores como `[BOOT]`, `[CONFIG]`, `[DATABASE]`, `[AUTH]` e `[UPLOAD]`.

## Critério de conclusão

Quando ocorrer um erro, será possível identificar claramente se ele pertence a:

* [x] PHP;
* [x] extensão;
* [x] banco;
* [x] autenticação;
* [x] configuração;
* [x] permissão;
* [x] IIS;
* [ ] rota em execução real no IIS.

Validação local realizada em modo SQLite. A validação final depende de executar o preflight no servidor com IIS, SQL Server e autenticação corporativa.

---

