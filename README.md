# Indicadores Estratégicos — CAIXA Loterias

Aplicação PHP para gestão de indicadores estratégicos, lançamentos mensais, evidências, homologações, visão trimestral, relatórios, administração de acessos e auditoria.

## Requisitos

- PHP 7.1.19 no ambiente corporativo, com PDO.
- SQL Server com `pdo_sqlsrv` e `sqlsrv` para homologação e produção.
- IIS com FastCGI e URL Rewrite para publicação.
- Python, `pyodbc` e Microsoft ODBC Driver somente para a migração SQLite → SQL Server.

## Executar localmente

Dois modos suportados para desenvolvimento local: manual (variáveis de ambiente) ou via script PowerShell fornecido.

- Manual (PowerShell) — a partir da raiz do projeto:

```powershell
$env:APP_ENV='development'
$env:DB_CONNECTION='sqlite'
php -S 127.0.0.1:8000 -t public public/router.php
```

- Usando o script (recomendado):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\executar-projeto.ps1
```

Por padrão, o servidor permanece em primeiro plano; pressione `Ctrl+C` para
finalizá-lo. Para iniciar em segundo plano:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\executar-projeto.ps1 -Background
```

Para finalizar uma execução em segundo plano ou iniciada em outro terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\finalizar-projeto.ps1 -Port 8000
```

Opções do script:

- `-BindHost` (padrão `127.0.0.1`)
- `-Port` (padrão `8000`)
- `-BasePath` (padrão vazio, use `/estrategia` para simular a publicação com prefixo)
- `-DryRun` (imprime o comando que seria executado e não inicia o servidor)
- `-Background` (inicia o servidor em segundo plano)

Exemplo com base path (e DryRun para teste sem iniciar):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\executar-projeto.ps1 -BindHost 127.0.0.1 -Port 8000 -BasePath '/estrategia' -DryRun
```

Acesse [http://127.0.0.1:8000](http://127.0.0.1:8000).

O router encaminha as rotas da aplicação ao front controller e entrega CSS, JavaScript e imagens diretamente. A primeira página será `/login` no ambiente local.

## Configuração do SQL Server

Defina as variáveis antes de iniciar a aplicação:

```powershell
$env:APP_ENV='production'
$env:DB_CONNECTION='sqlsrv'
$env:SQLSERVER_HOST='SERVIDOR_SQL'
$env:SQLSERVER_DATABASE='DB5319_IndicadoresEstrategicos'
$env:SQLSERVER_ENCRYPT='yes'
$env:SQLSERVER_TRUST_SERVER_CERTIFICATE='no'
$env:LDAP_PATH='C:\caminho\corporativo\acessoldap\LDAP.php'
php -S 127.0.0.1:8000 -t public public/router.php
```

Credenciais não devem ser gravadas no repositório. Em produção, a autenticação é corporativa; o LDAP identifica o empregado e `dbo.usuarios_acesso` define perfil e escopo.

## Migração para SQL Server

O SQLite em `database/indicadores.sqlite` é a origem controlada da migração. O schema de destino fica em `database/sqlserver/schema.sql`; o `.bat` chama `scripts/migrar-para-sqlserver.py`.

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
docs/                arquitetura, instalação, testes e publicação
public/              única raiz pública e front controller
scripts/             migração, testes e publicação
storage/             logs, temporários e arquivos operacionais
tests/               testes PHP, JavaScript e Python
uploads/             evidências fora da raiz pública
views/frontend/      páginas visuais completas integradas ao backend PHP
views/               layouts, componentes, formulários e detalhes server-side
```

Não existem páginas HTML soltas na raiz. Todas as requisições públicas devem entrar por `public/index.php`.

## Documentação

- [API](docs/api.md)
- [Instalação no IIS](docs/instalacao/manual-iis.md)
- [Manual técnico](docs/manuais/manual-tecnico.md)
- [Plano de implantação e rollback](docs/publicacao/plano-implantacao.md)
- [Checklist de go-live](docs/publicacao/checklist-go-live.md)
- [Matriz de rastreabilidade](docs/testes/matriz-rastreabilidade.md)
