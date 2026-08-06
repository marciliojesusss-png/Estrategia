# Indicadores Estratégicos — CAIXA Loterias

Aplicação PHP para gestão de indicadores estratégicos, lançamentos mensais, evidências, homologações, visão trimestral, relatórios, administração de acessos e auditoria.

## Requisitos

- PHP 7.1.19 no ambiente corporativo, com PDO.
- SQL Server com a extensão nativa `sqlsrv` para homologação e produção.
- IIS com FastCGI e URL Rewrite para publicação.
- Python, `pyodbc` e Microsoft ODBC Driver somente para a migração SQLite → SQL Server.

## Executar localmente

Use o único script operacional da pasta `scripts/` a partir da raiz do projeto.
Por padrão, ele inicia a aplicação com o prefixo `/estrategia`:

```powershell
.\scripts\servidor.ps1 executar
```

O servidor inicia em primeiro plano; pressione `Ctrl+C` para finalizá-lo.
Para iniciar em segundo plano, use:

```powershell
.\scripts\servidor.ps1 executar -Background
```

Para finalizar o servidor:

```powershell
.\scripts\servidor.ps1 finalizar
```

Para reiniciar, finalizando a execução atual e iniciando outra em segundo plano:

```powershell
.\scripts\servidor.ps1 reiniciar
```

Para simular qualquer ação sem alterar processos, use `-DryRun`.

Para executar deliberadamente na raiz, informe `-BasePath '/'` ao iniciar ou
reiniciar:

```powershell
.\scripts\servidor.ps1 reiniciar -BasePath '/'
```

Opções disponíveis: `-BindHost` (padrão `127.0.0.1`), `-Port` (padrão `8000`),
`-BasePath` (padrão `/estrategia`), `-Background` e `-DryRun`.

Acesse [http://127.0.0.1:8000/estrategia/](http://127.0.0.1:8000/estrategia/).
Não existe uma rota de login separada; a própria entrada `/estrategia/`
apresenta o formulário e recebe o POST de autenticação.

O router encaminha as rotas da aplicação ao front controller e entrega CSS,
JavaScript e imagens diretamente.

## Configuração do SQL Server

O carregador interno lê opcionalmente o arquivo `.env` na raiz antes da
configuração da aplicação. O arquivo local `.env` é ignorado pelo Git; use
`.env.example` como modelo e nunca versione valores reais de senha. Variáveis
definidas no ambiente do IIS/FastCGI prevalecem sobre o arquivo.

`DB_HOST`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD` são mantidas por
compatibilidade com a conexão SQL Server existente. A autenticação corporativa usa `REMOTE_USER`, fornecido pelo
IIS após a Autenticação do Windows, e consulta o LDAP com configuração externa.
Defina `LDAP_URI`, `LDAP_BASE_DN`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`,
`LDAP_USER_FILTER` e os atributos `LDAP_ATTR_*` no ambiente seguro do IIS.
Use `ldaps://` ou `LDAP_STARTTLS=true`; em produção, mantenha
`LDAP_REQUIRE_TLS=true`.

Defina as variáveis antes de iniciar a aplicação:

```powershell
$env:APP_ENV='production'
$env:DB_CONNECTION='sqlsrv'
$env:SQLSERVER_HOST='SERVIDOR_SQL'
$env:SQLSERVER_DATABASE='DB5319_IndicadoresEstrategicos'
$env:SQLSERVER_ENCRYPT='yes'
$env:SQLSERVER_TRUST_SERVER_CERTIFICATE='no'
$env:LDAP_URI='ldaps://ldap.corporativo.interno:636'
$env:LDAP_BASE_DN='OU=Usuarios,DC=corp,DC=empresa,DC=interno'
$env:LDAP_USER_FILTER='(sAMAccountName={matricula})'
$env:LDAP_REQUIRE_TLS='true'
php -S 127.0.0.1:8000 -t public public/router.php
```

Configure `LDAP_BIND_DN` e `LDAP_BIND_PASSWORD` somente no ambiente do IIS/FastCGI. Credenciais não devem ser gravadas no repositório. Em produção, a autenticação é corporativa: o IIS identifica o empregado, o LDAP valida e completa seus atributos, e `dbo.usuarios_acesso` define perfil e escopo.

## Migração para SQL Server

O SQLite local em `database/indicadores.sqlite` é usado como origem da migração e permanece ignorado pelo Git. Faça backup antes da migração; o schema de destino fica em `database/sqlserver/schema.sql`, e o `.bat` chama `scripts/migrar-para-sqlserver.py`.

```powershell
# Homologação
.\migrar-para-sqlserver.bat -Ambiente homologacao -Servidor "DF7436SR439" -Banco "DB5319_IndicadoresEstrategicos"

# Apenas verificar uma carga existente
.\migrar-para-sqlserver.bat -Ambiente homologacao -Servidor "DF7436SR439" -Banco "DB5319_IndicadoresEstrategicos" -VerifyOnly

# Produção — somente após homologação e aceite
.\migrar-para-sqlserver.bat -Ambiente producao -Servidor "DF7436SR439" -Banco "DB5319_IndicadoresEstrategicos"
```

O migrador cria backup da origem, executa preflight, aplica o schema, copia os dados e reconcilia contagens, IDs, agrupamentos, chaves estrangeiras e JSON. O resultado é salvo em `database/sqlserver/migration-report.json`.

## Testes e publicação

Os testes podem ser executados diretamente pelos arquivos em `tests/`, usando
PHP, Node.js e Python conforme o tipo de teste. Antes da publicação, valide
manualmente a sintaxe, as extensões do PHP, as permissões do IIS, o login, as
rotas principais, os uploads e os fluxos de homologação.

Após alterar arquivos em `assets/`, replique manualmente as alterações
correspondentes em `public/assets/`.

## Estrutura

```text
app/                 núcleo, autenticação, controllers, services e repositories
api/                 endpoints compatíveis
assets/              CSS, JavaScript e imagens-fonte
database/            SQLite de origem e schemas SQL
public/              única raiz pública e front controller
scripts/             migração SQL Server e servidor local
storage/             logs, temporários e arquivos operacionais
tests/               testes PHP, JavaScript e Python
uploads/             evidências fora da raiz pública
views/frontend/      páginas visuais completas integradas ao backend PHP
views/               layouts, componentes, formulários e detalhes server-side
```

Não existem páginas HTML soltas na raiz. Todas as requisições públicas devem entrar por `public/index.php`.
