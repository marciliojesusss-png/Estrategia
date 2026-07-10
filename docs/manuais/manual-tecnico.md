# Manual técnico

## Arquitetura

A aplicação usa front controller em `public/index.php`, controllers HTTP, services de negócio, repositories PDO e views PHP. O diretório público é somente `public`; código, banco, logs e uploads permanecem fora dele. SQL Server é o destino produtivo e o SQLite preservado serve como origem histórica de migração.

## Operação e manutenção

- Configuração: variáveis de ambiente consumidas por `app/config/config.php`.
- Banco: schema em `database/sqlserver/schema.sql`; migração em `scripts/migrar-para-sqlserver.py`.
- APIs: contratos, autenticação, erros e paginação em `docs/api.md`.
- Segurança: sessão, CSRF, autorização por perfil/escopo, consultas preparadas, escape de saída e validação de uploads.
- Auditoria: eventos de acesso e alterações persistem autor, data, ação e contexto.
- Logs: ficam em `storage/logs`; retenção e acesso devem seguir a política corporativa.
- Testes: execute `powershell -File scripts/testar-projeto.ps1` após qualquer alteração.

Antes de alterar estados ou permissões, consulte os documentos de arquitetura do módulo. Mudanças de schema devem possuir script reversível, backup, reconciliação e registro de decisão.
