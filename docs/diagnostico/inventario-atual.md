# Inventário do estado atual

Data do levantamento: 10/07/2026.

## Visão geral

O repositório contém três implementações sobrepostas:

1. páginas HTML e JavaScript na raiz, com dados de semente e persistência local;
2. páginas PHP em `public/`, que reutilizam os HTML por meio de `templates/page.php`;
3. backend PHP em `app/` e `api/`, com SQLite como padrão e suporte parcial a SQL Server.

Essa sobreposição é útil como protótipo, mas hoje não representa a arquitetura final exigida pelo prompt.

## Inventário por área

| Área | Artefatos atuais | Diagnóstico |
|---|---|---|
| Telas estáticas | `index.html`, `dashboard.html`, `indicadores.html`, `lancamentos.html`, `homologacao.html`, `relatorios.html`, `resumo-executivo.html`, `visao-trimestral.html`, `administracao.html` | Protótipo funcional e referência visual. |
| Entrada PHP | `public/index.php` e páginas PHP por módulo | Protegem páginas por perfil e injetam o frontend existente. Não há roteador amigável. |
| Templates | `templates/page.php` e `templates/partials/*` | Camada de composição inicial; ainda depende dos HTML da raiz. |
| APIs | `api/*.php` | Endpoints procedurais, carregados por `api/bootstrap.php`. Cobertura REST incompleta. |
| Espelhos públicos | `public/api/*.php` | Arquivos homônimos aos de `api/`, mas nenhum dos dez pares é idêntico; há risco de divergência. |
| Núcleo | `app/core/Database.php`, `Request.php`, `Response.php` | Fundação parcial, sem roteador e tratamento central completo. |
| Autenticação | `app/auth/Auth.php` | LDAP por arquivo externo, sessão, perfis, escopo, CSRF e usuários locais. Incompatível com PHP 7.1. |
| Repositories | sete arquivos em `app/repositories/` | Leitura e substituição em lote; vários comandos são específicos de SQLite. |
| Services | cinco arquivos em `app/services/` | Regras ainda incompletas; o cálculo oficial permanece no frontend. |
| Frontend | `assets/js`, `assets/css`, `assets/img` | Grande parte da regra de negócio e do workflow ainda está em JavaScript. |
| Ativos públicos | `public/assets` | Cópia dos ativos da raiz, criando duas fontes de manutenção. |
| Banco local | `database/indicadores.sqlite`, `database/schema.sql` | Base de validação versionada. Não deve ser o banco de produção. |
| SQL Server | `database/sqlserver/schema.sql`, relatórios e sincronização de usuários | Esquema proposto e migração ensaiada, ainda não validados contra o banco corporativo oficial. |
| Migração | `migrar-para-sqlserver.bat`, `scripts/migrar-para-sqlserver.py` | Copia e reconcilia SQLite/SQL Server; requer Python, `pyodbc` e ODBC Driver. |
| Testes | 12 testes Node em `tests/` | Dez passam; dois falham na linha de base atual. Não há suíte automatizada PHP. |

## Funcionalidades identificadas

- Resumo executivo e dashboard.
- Visão trimestral.
- Consulta de indicadores.
- Lançamentos mensais.
- Homologação e devolução para ajuste.
- Solicitação e decisão de reabertura.
- Relatórios e exportação JSON.
- Administração de acessos.
- Persistência local, SQLite e migração para SQL Server.

## Dependências observadas

- PHP atual da máquina: 8.3.31; não há evidência de PHP 7.1.19 instalado.
- Node atual: 24.16.0, usado apenas nos testes JavaScript.
- LDAP corporativo esperado por arquivo indicado em `LDAP_PATH`.
- PDO SQLite como configuração padrão.
- PDO SQL Server quando `DB_CONNECTION=sqlsrv`.
- Python, `pyodbc` e Microsoft ODBC Driver para migração.
- Não foram encontrados `composer.json`, `package.json`, `web.config` ou manifesto de versões das bibliotecas visuais.

## Linha de base de testes

| Resultado | Testes |
|---|---|
| Passaram | `auth-scope`, `currency`, `display-names`, `encoding`, `executive-chart-filter`, `executive-summary`, `formulas`, `local-validation`, `persistence`, `quarterly` |
| Falharam | `navigation-layout`, `sqlite-database` |

Todos os arquivos PHP passam no lint do PHP 8.3.31 instalado, o que não comprova compatibilidade com PHP 7.1.19.

## Duplicações a eliminar

- `api/` e `public/api/`: dez pares homônimos, todos diferentes por hash.
- `assets/` e `public/assets/`: duas cópias dos ativos.
- HTML na raiz e páginas PHP: as páginas PHP dependem dos protótipos HTML.
- Regras de cálculo e workflow divididas entre JavaScript, services e endpoints procedurais.

