# Matriz de rastreabilidade

| Requisito | Implementação principal | Evidência automatizada |
|---|---|---|
| Fundação, rotas e erros | `app/core`, `public/index.php`, `public/web.config` | `foundation.test.php`, `security-publication.test.php` |
| Autenticação, sessão e perfis | `app/auth`, `Auth.php`, `AccessPolicy.php` | `auth-authorization.test.php`, `auth-scope.test.js` |
| Indicadores e fórmulas | `IndicadorService`, validators e repositories | `indicators-module.test.php`, `formulas.test.js` |
| Lançamentos e evidências | `LancamentoService`, `EvidenciaService`, state machine | `launches-evidence-module.test.php`, `local-validation.test.js` |
| Homologação e reabertura | `HomologacaoService`, controllers e repositories | `homologations-module.test.php` |
| Dashboard e visão trimestral | services/repositories de dashboard e APIs | `dashboard-module.test.php`, `quarterly.test.js`, `executive-summary.test.js` |
| Administração e auditoria | `AdministracaoService`, auditoria e configurações | `administration-audit-module.test.php` |
| APIs e contratos | endpoints em `api/` e `public/api/` | `api-contract.test.php` |
| Persistência e migração | SQLite legado, schema e migrador SQL Server | `sqlite-database.test.js`, `migration-report.json` |
| Interface e responsividade | HTML, `assets/js` e `assets/css` | `navigation-layout.test.js`, `encoding.test.js`, `display-names.test.js` |
| Segurança de publicação | CSRF, escape, uploads e isolamento do public | `security-publication.test.php` |

Os testes automatizados comprovam comportamento local e estrutura. Integração real, concorrência, desempenho e compatibilidade IIS/PHP 7.1.19/SQL Server exigem evidência no ambiente de homologação.
