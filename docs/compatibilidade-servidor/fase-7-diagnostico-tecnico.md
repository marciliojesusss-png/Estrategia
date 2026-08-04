# FASE 7 — CRIAR UM DIAGNÓSTICO TÉCNICO DO SERVIDOR

## Novo arquivo

```text
scripts/preflight-servidor.php
```

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

## Diagnóstico do IIS

Criar temporariamente:

```text
public/diagnostico-iis.php
```

Ele deverá exibir somente informações não sensíveis:

```text
PHP_VERSION
REMOTE_USER presente ou ausente
AUTH_TYPE
SERVER_SOFTWARE
REQUEST_URI
APP_BASE_PATH
```

Não deverá exibir:

* senha;
* usuário SQL completo;
* senha LDAP;
* cookie;
* token;
* connection string.

O arquivo deverá ser excluído após a homologação.

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

## Critério de conclusão

Quando ocorrer um erro, será possível identificar claramente se ele pertence a:

* PHP;
* extensão;
* banco;
* autenticação;
* configuração;
* permissão;
* IIS;
* rota.

---

