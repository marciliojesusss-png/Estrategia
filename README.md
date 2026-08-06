# Indicadores Estrategicos - CAIXA Loterias

Aplicacao PHP para gestao de indicadores estrategicos, lancamentos,
evidencias, homologacoes, relatorios, administracao de acessos e auditoria.

## Visao Geral

- PHP 7.1.19 no ambiente corporativo.
- IIS com FastCGI.
- Front controller em `public/index.php`.
- Rotas por `index.php?route=...`, sem URL Rewrite.
- Configuracao local em `app/config/servidor.local.php`, sem Dotenv.
- SQL Server via extensao nativa `sqlsrv` e `sqlsrv_connect()`.
- `pdo_sqlsrv` nao deve ser usado como driver da aplicacao.
- LDAP legado carregado de `../acessoldap/LDAP.php`.
- Credenciais e caminhos corporativos reais nao devem ser versionados.

## Requisitos

- PHP 7.1.19 com FastCGI no IIS.
- Extensao PHP `sqlsrv` habilitada.
- Microsoft ODBC Driver for SQL Server compativel com o `sqlsrv`.
- SQL Server acessivel a partir do servidor web.
- Arquivo LDAP compartilhado fora do projeto:

```text
pasta-raiz/
+-- Estrategia/
+-- acessoldap/
    +-- LDAP.php
```

Python, `pyodbc` e Microsoft ODBC Driver sao necessarios apenas para migracao
SQLite -> SQL Server.

## Rotas

A aplicacao nao usa rotas amigaveis. Use sempre:

```text
/estrategia/index.php?route=NOME_DA_ROTA
```

Rotas principais:

```text
/estrategia/index.php?route=login
/estrategia/index.php?route=dashboard
/estrategia/index.php?route=indicadores
/estrategia/index.php?route=lancamentos
/estrategia/index.php?route=homologacoes
/estrategia/index.php?route=visao-trimestral
/estrategia/index.php?route=relatorios
/estrategia/index.php?route=administracao
```

APIs:

```text
/estrategia/index.php?route=api/indicadores
/estrategia/index.php?route=api/lancamentos
/estrategia/index.php?route=api/homologacoes
```

Quando `route` estiver vazio, a rota padrao e `dashboard`. Links, formularios e
chamadas JavaScript devem usar `app_url()`.

## Execucao Local

Iniciar em primeiro plano:

```powershell
.\scripts\servidor.ps1 executar
```

Iniciar em segundo plano e abrir o navegador:

```powershell
.\scripts\cmd\iniciar-local.ps1
```

Finalizar:

```powershell
.\scripts\servidor.ps1 finalizar
```

Finalizar em uma porta especifica:

```powershell
.\scripts\servidor.ps1 finalizar -Port 8000
```

Reiniciar em segundo plano:

```powershell
.\scripts\servidor.ps1 reiniciar
```

URL local:

```text
http://127.0.0.1:8000/estrategia/index.php?route=login
```

Se houver mais de um PHP instalado:

```powershell
$env:PHP_EXE = 'C:\caminho\php.exe'
.\scripts\servidor.ps1 executar
```

Nao abra `index.php` pelo Explorador ou por `file://`. Se o navegador baixar o
arquivo PHP, a requisicao nao passou pelo PHP/FastCGI.

## Configuracao

Crie `app/config/servidor.local.php` no servidor. Esse arquivo e ignorado pelo
Git e nao deve ser enviado ao repositorio.

Modelo:

```php
<?php
return array(
    'app_env' => 'production',
    'app_base_path' => '/estrategia',
    'db_driver' => 'sqlsrv',
    'db_host' => 'SERVIDOR_SQL',
    'db_database' => 'NOME_DO_BANCO',
    'db_auth_mode' => 'sql',
    'db_username' => 'USUARIO_SQL',
    'db_password' => 'SENHA_SQL',
    'auth_provider' => 'legacy_file',
    'ldap_legacy_path' => dirname(dirname(__DIR__)) . '/../acessoldap/LDAP.php',
    'diagnostico_php_version' => '',
);
```

Nunca versionar:

- `app/config/servidor.local.php`;
- senhas;
- credenciais LDAP;
- tokens;
- nomes reais de servidores internos;
- caminhos absolutos corporativos.

## SQL Server

A aplicacao usa somente `sqlsrv_connect()`.

Configuracao esperada:

- `db_driver`: `sqlsrv`
- `db_auth_mode`: `sql` ou `integrated`
- `SQLSERVER_ENCRYPT`: `no`
- `SQLSERVER_TRUST_SERVER_CERTIFICATE`: nao configurado

Nao use `pdo_sqlsrv` em `db_driver`, `db_connection`, `DB_DRIVER` ou
`DB_CONNECTION`.

Tabelas essenciais:

- `indicadores`
- `lancamentos`
- `usuarios_acesso`
- `acessos_log`

## LDAP

O provedor esperado e:

```php
'auth_provider' => 'legacy_file'
```

O arquivo LDAP deve ficar fora da pasta `Estrategia`:

```text
../acessoldap/LDAP.php
```

A aplicacao valida `is_file()` e `is_readable()` antes de incluir o arquivo. Em
caso de falha, registra em `storage/logs/aplicacao.log`.

## Diagnosticos

Diagnostico completo do servidor:

```powershell
.\scripts\cmd\diagnostico-servidor.ps1
```

Preflight curto:

```powershell
.\scripts\cmd\preflight-servidor.ps1
```

Informacoes gerais do servidor:

```powershell
.\scripts\informacoes-servidor.ps1
```

Diagnostico exclusivo do SQL Server:

```powershell
.\scripts\cmd\diagnostico-sqlserver.ps1
```

Forcar um PHP especifico:

```powershell
$env:PHP_EXE = 'C:\caminho\php.exe'
.\scripts\cmd\diagnostico-sqlserver.ps1
```

Relatorios gerados:

```text
storage/logs/diagnostico-servidor-AAAA-MM-DD-HHMMSS.log
storage/logs/informacoes-servidor-AAAA-MM-DD-HHMMSS.log
storage/logs/diagnostico-sqlserver-AAAA-MM-DD-HHMMSS.log
```

Os scripts sao somente diagnostico: nao alteram banco, IIS, permissoes ou
configuracoes.

## Diagnostico Web Temporario

Para validar IIS, FastCGI, `REMOTE_USER` e roteamento pelo navegador, habilite
temporariamente em `app/config/servidor.local.php`:

```php
'diagnostico_web_habilitado' => true,
'diagnostico_web_chave' => 'CHAVE_LONGA_TEMPORARIA',
```

Acesse:

```text
/estrategia/index.php?route=diagnostico-servidor&chave=CHAVE_LONGA_TEMPORARIA
```

Desabilite apos o teste:

```php
'diagnostico_web_habilitado' => false,
```

## Migracao Para SQL Server

O SQLite local `database/indicadores.sqlite` e usado como origem de migracao e
permanece ignorado pelo Git. O schema de destino fica em
`database/sqlserver/schema.sql`. Os wrappers executam
`scripts/migrar-para-sqlserver.py`.

```powershell
.\scripts\cmd\migrar-para-sqlserver.ps1 -Ambiente homologacao -Servidor "SERVIDOR_SQL" -Banco "NOME_DO_BANCO"
.\scripts\cmd\migrar-para-sqlserver.ps1 -Ambiente homologacao -Servidor "SERVIDOR_SQL" -Banco "NOME_DO_BANCO" -VerifyOnly
.\scripts\cmd\migrar-para-sqlserver.ps1 -Ambiente producao -Servidor "SERVIDOR_SQL" -Banco "NOME_DO_BANCO"
```

## Testes

```powershell
php tests\security-publication.test.php
php tests\api-contract.test.php
node tests\backend-routing.test.js
```

Antes de publicar, valide:

- diagnosticos;
- login/autenticacao no IIS;
- rotas por `index.php?route=...`;
- acesso SQL Server;
- leitura do LDAP legado;
- escrita em `storage/logs`, `storage/temporarios`, `storage/backups` e
  `uploads/evidencias`;
- fluxos de lancamento, homologacao e relatorios.

## Estrutura

```text
app/                 nucleo, autenticacao, controllers, services e repositories
api/                 endpoints chamados pelo front controller
assets/              CSS, JavaScript e imagens-fonte
database/            SQLite local e schemas SQL
public/              raiz publica e front controller
scripts/             servidor local, diagnosticos e migracao
scripts/cmd/         wrappers .ps1/.bat
storage/             logs, temporarios e backups
templates/           shell frontend
tests/               testes PHP, JavaScript e Python
uploads/             evidencias fora da raiz publica
views/               layouts, componentes e paginas
```

Requisicoes da aplicacao devem entrar por `public/index.php` ou pelo
`index.php` alternativo da raiz, sempre usando o parametro `route`.
