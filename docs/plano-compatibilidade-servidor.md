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

## Fase 4 - Compatibilidade Com IIS

Status em 2026-08-04:

- [x] Estrutura preferencial preservada com raiz publica em `public/`.
- [x] `public/web.config` validado com documento padrao `index.php` e front controller.
- [x] Plano alternativo criado na raiz com `index.php`.
- [x] Plano alternativo criado na raiz com `web.config`.
- [x] `web.config` da raiz bloqueia `app`, `database`, `storage`, `uploads`, `.env` e `.git`.
- [x] `web.config` da raiz encaminha rotas para `public/index.php`.
- [x] Teste automatizado atualizado para validar o modo alternativo.

Pendencias externas:

- [ ] Converter `/estrategia` em aplicacao no IIS.
- [ ] Associar ao Application Pool correto.
- [ ] Confirmar PHP 7.1.19 no FastCGI.
- [ ] Confirmar URL Rewrite instalado.
- [ ] Confirmar Autenticacao Windows e `REMOTE_USER`.
- [ ] Configurar `APP_BASE_PATH=/estrategia` no ambiente.

## Fase 5 - Permissoes, Logs, Sessoes E Uploads

Status em 2026-08-04:

- [x] `storage/logs` preservado com `.gitkeep`.
- [x] `.gitignore` ajustado para ignorar logs gerados e versionar `.gitkeep`.
- [x] Logger alterado para usar `error_log($mensagem)` quando nao puder gravar arquivo.
- [x] `EvidenciaStorage` valida permissao de escrita em `uploads/evidencias`.
- [x] Script criado em `scripts/verificar-permissoes.php`.
- [x] Script valida escrita real em `storage/logs`, `storage/temporarios`, `storage/backups` e `uploads/evidencias`.
- [x] Script valida disponibilidade de sessao PHP.

Saida validada do script:

```text
storage/logs: gravavel
storage/temporarios: gravavel
storage/backups: gravavel
uploads/evidencias: gravavel
sessao PHP: disponivel
```

Pendencia externa: conceder permissao de modificacao ao Application Pool nas pastas gravaveis no servidor IIS.

## Fase 6 - Banco, Schema E Usuarios

Status em 2026-08-04:

- [x] Script criado em `scripts/validar-banco-schema-usuarios.php`.
- [x] Validador confere tabelas esperadas.
- [x] Validador confere chaves estrangeiras.
- [x] Validador confere indices esperados.
- [x] Validador exibe contagens de `indicadores`, `lancamentos`, `usuarios_acesso` e `acessos_log`.
- [x] Validador confere administrador ativo.
- [x] Validador confere perfis `administrador`, `unidade_apuradora`, `homologador` e `usuario_companhia`.
- [x] Validador confere padrao de matriculas.
- [x] Modelo ficticio de usuarios iniciais criado em `database/sqlserver/usuarios-acesso.example.sql`.

Pendencias externas:

- [ ] Executar `database/sqlserver/schema.sql` no SQL Server corporativo.
- [ ] Migrar dados do SQLite para SQL Server.
- [ ] Executar `scripts/validar-banco-schema-usuarios.php` apontado para SQL Server.
- [ ] Cadastrar usuarios reais com matriculas confirmadas pelo LDAP corporativo.
- [ ] Validar login, perfil e escopo em homologacao.

## Fase 7 - Diagnostico Tecnico

Status em 2026-08-04:

- [x] Script criado em `scripts/preflight-servidor.php`.
- [x] Preflight verifica PHP, `php.ini`, extensoes, drivers PDO e configuracao.
- [x] Preflight verifica arquivo LDAP legado quando `AUTH_PROVIDER=legacy_file`.
- [x] Preflight verifica diretorios gravaveis.
- [x] Preflight tenta conexao com banco, `SELECT 1` e existencia das tabelas principais.
- [x] Diagnostico IIS criado em `public/diagnostico-iis.php`.
- [x] Diagnostico IIS exibe apenas informacoes nao sensiveis.
- [x] Mensagens do preflight usam marcadores por etapa.

Pendencias externas:

- [ ] Executar `scripts/preflight-servidor.php` no servidor corporativo.
- [ ] Acessar temporariamente `public/diagnostico-iis.php` pelo IIS.
- [ ] Remover `public/diagnostico-iis.php` apos homologacao.
