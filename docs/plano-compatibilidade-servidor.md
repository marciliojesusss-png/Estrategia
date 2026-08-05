# Plano De Compatibilizacao Do Servidor

Documento de acompanhamento das fases de compatibilidade do projeto Estrategia com o ambiente corporativo.

## Fase 0 - Preparacao Do Projeto

Status em 2026-08-04:

- [x] Branch criada: `compatibilidade-servidor-php71`.
- [x] Tag criada: `antes-compatibilidade-servidor`.
- [x] Backup do SQLite local criado em `storage/backups/indicadores-antes-compatibilidade-servidor.sqlite`.
- [ ] Backup do banco SQL Server: pendente de confirmacao do banco corporativo.
- [ ] Backup da configuracao atual do IIS: pendente de acesso ao servidor.
- [ ] Application Pool do Sistema-Expedientes: pendente de consulta no IIS.
- [ ] Executavel PHP configurado no FastCGI: pendente de consulta no IIS.
- [ ] `php.ini` carregado pelo IIS: pendente de consulta no IIS.
- [x] Credenciais do Sistema-Expedientes nao foram copiadas para este repositorio.

## Evidencias Locais

O Git apontava para `main` antes da preparacao. A branch de trabalho para as fases de compatibilidade agora e `compatibilidade-servidor-php71`.

O backup local cobre o arquivo SQLite encontrado em `database/indicadores.sqlite`.

## Pendencias Externas

As pendencias restantes dependem de acesso ao ambiente do servidor corporativo e devem ser preenchidas antes de publicar ou homologar em IIS/SQL Server.

## Fase 1 - Configuracao Compativel

Status em 2026-08-04:

- [x] Arquivo de exemplo criado em `app/config/servidor.example.php`.
- [x] Arquivo local sensivel `app/config/servidor.local.php` configurado no `.gitignore`.
- [x] Carregamento ajustado para prioridade: variaveis do IIS, `servidor.local.php`, `.env`, defaults.
- [x] Constantes adicionadas: `DB_DRIVER`, `DB_AUTH_MODE`, `AUTH_PROVIDER`, `LDAP_LEGACY_PATH`.
- [x] Compatibilidade preservada com `DB_CONNECTION=sqlsrv` para o codigo atual.
- [x] `.env.example` atualizado com configuracoes novas e valores ficticios.
- [x] Script de verificacao criado em `scripts/verificar-configuracao.php`.
- [x] Script de verificacao mostra somente informacoes nao sensiveis.

Saida validada do script:

```text
Ambiente: production
Caminho-base: /estrategia
Driver: pdo_sqlsrv
Servidor SQL: configurado
Banco: configurado
Autenticacao: legacy_file
```

Observacao: `servidor.local.php` nao foi criado no workspace para evitar ativar valores locais ficticios. Ele deve ser criado apenas no servidor ou em ambiente local controlado, a partir de `servidor.example.php`.

## Fase 2 - Compatibilidade Com SQL Server

Status em 2026-08-04:

- [x] `Database.php` separado em `connectPdoSqlsrv()`, `connectSqlsrvNative()` e `connectSqlite()`.
- [x] Driver principal preservado como `DB_DRIVER=pdo_sqlsrv`.
- [x] Erro especifico `PDO_SQLSRV_INDISPONIVEL` adicionado quando o driver PDO nao existir.
- [x] Falhas de conexao registradas no log sem senha ou DSN.
- [x] Fallback `DB_DRIVER=sqlsrv` implementado com adapter nativo.
- [x] Arquivo criado: `app/core/database/SqlsrvConnectionAdapter.php`.
- [x] Arquivo criado: `app/core/database/SqlsrvStatementAdapter.php`.
- [x] Contrato de repositories/services ajustado para aceitar PDO ou adapter.
- [x] Script de teste criado em `scripts/testar-sqlserver.php`.

Operacoes suportadas pelo adapter:

```text
prepare
query
execute
fetch
fetchAll
fetchColumn
bindValue
beginTransaction
commit
rollBack
inTransaction
rowCount
lastInsertId
```

Pendencia externa: os testes reais de `SELECT 1 AS conexao` e `dbo.indicadores` devem ser executados no servidor com `pdo_sqlsrv` ou `sqlsrv` instalado e acesso ao banco corporativo.

## Fase 3 - Autenticacao Corporativa

Status em 2026-08-04:

- [x] Provider `legacy_file` criado em `app/auth/providers/LegacyIdentityProvider.php`.
- [x] Provider `native_ldap` criado em `app/auth/providers/NativeLdapIdentityProvider.php`.
- [x] Factory criada em `app/auth/providers/IdentityProviderFactory.php`.
- [x] `CorporateIdentity.php` alterado para delegar a identidade ao provider configurado por `AUTH_PROVIDER`.
- [x] Implementacao LDAP nativa preservada no provider `native_ldap`.
- [x] Provider legado valida e padroniza `matricula`, `nome`, `funcao`, `unidade`, `sg_unidade` e `no_unidade`.
- [x] Controle de perfil permanece em `usuarios_acesso`.
- [x] Teste automatizado adicionado com fixture de arquivo legado.

Pendencia externa: validar o formato real do arquivo corporativo indicado por `LDAP_LEGACY_PATH` no servidor.
