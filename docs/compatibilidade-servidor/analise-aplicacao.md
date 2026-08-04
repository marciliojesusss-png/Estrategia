# Analise De Impacto Na Aplicacao

Esta analise complementa o plano de compatibilizacao. Ela foi feita a partir da estrutura atual do projeto e dos pontos que as fases devem alterar.

## Visao Geral Da Arquitetura Atual

O projeto e uma aplicacao PHP organizada em camadas, sem Composer visivel no repositorio. A entrada publica passa por `public/index.php`, que carrega `app/bootstrap.php`, registra rotas com `app/core/Router.php` e instancia controllers. A raiz publica preferencial ja e `public/`.

A configuracao nasce em `app/config/config.php`: primeiro carrega `.env` via `Dotenv`, depois define constantes globais como `APP_ENV`, `APP_BASE_PATH`, `DB_CONNECTION`, caminhos de storage/upload, LDAP e SQL Server.

O banco e centralizado em `app/core/Database.php`. Hoje ele retorna um objeto `PDO`: SQLite em desenvolvimento/local e SQL Server via `pdo_sqlsrv` em producao. Nao existe fallback nativo para `sqlsrv_connect()`.

A autenticacao passa por `app/auth/Auth.php`. Em ambiente local, ha usuarios simulados. Fora do ambiente local, `Auth` chama `CorporateIdentity::load()`, consulta a tabela `usuarios_acesso` e aplica perfil/escopo com `AccessPolicy`.

Logs, sessoes e uploads estao centralizados em `Logger`, `Session` e `EvidenciaStorage`. As pastas principais sao definidas por constantes: `LOG_PATH`, `TEMP_PATH`, `BACKUP_DIR` e `UPLOAD_PATH`.

## Fase 1 - Configuracao

Arquivos impactados:

- `app/config/config.php`
- `app/config/Dotenv.php`
- `.gitignore`
- `.env.example`
- scripts de diagnostico futuros

Estado atual:

- A prioridade real e ambiente + `.env` + defaults definidos em constantes.
- Nao existem `app/config/servidor.example.php` nem `app/config/servidor.local.php`.
- Nao existem constantes `DB_DRIVER`, `DB_AUTH_MODE`, `AUTH_PROVIDER` ou `LDAP_LEGACY_PATH`.
- Ja existe `APP_BASE_PATH`, mas sua normalizacao precisa ser preservada porque `public/router.php`, `helpers.php`, `Response.php` e `public/index.php` dependem dela.

Risco principal:

A mudanca de prioridade de configuracao precisa evitar redefinir constantes ja declaradas e nao pode exibir valores sensiveis em scripts de validacao. O arquivo `servidor.local.php` deve retornar array e ser carregado antes dos defaults, sem depender de sintaxe moderna incompativel com PHP 7.1.

## Fase 2 - SQL Server

Arquivos impactados:

- `app/core/Database.php`
- repositories em `app/repositories/`
- services em `app/services/`
- APIs legadas em `api/`
- testes PHP que instanciam services/repositories com `PDO`

Estado atual:

- `Database::getConnection()` sempre retorna `PDO`.
- `connectSqlServer()` verifica `PDO::getAvailableDrivers()` e usa DSN `sqlsrv:...`.
- Muitos constructors exigem `PDO` no tipo, por exemplo services de indicadores, lancamentos, homologacoes, evidencias e administracao.
- Varios repositories usam `getAttribute(PDO::ATTR_DRIVER_NAME)` para escolher paginacao SQL Server ou SQLite.
- Ha uso frequente de `prepare`, `query`, `execute`, `fetch`, `fetchAll`, `fetchColumn`, `rowCount`, `beginTransaction`, `commit`, `rollBack`, `inTransaction` e `lastInsertId`.

Risco principal:

Um adapter nativo `sqlsrv` apenas "parecido com PDO" nao sera suficiente enquanto constructors exigirem `PDO`. Antes de implementar fallback nativo, e preciso decidir um contrato comum. Caminhos possiveis:

- remover type hints `PDO` dos pontos que recebem conexao e documentar o contrato minimo;
- criar uma interface interna e atualizar services/repositories para ela;
- limitar o fallback nativo a scripts de diagnostico, mantendo a aplicacao dependente de `pdo_sqlsrv`.

O terceiro caminho e o menor em alteracao, mas nao cumpre a fase 2.2. Os dois primeiros exigem testes abrangentes, porque mexem no contrato de persistencia da aplicacao inteira.

## Fase 3 - Autenticacao Corporativa

Arquivos impactados:

- `app/auth/CorporateIdentity.php`
- `app/auth/Auth.php`
- novos providers em `app/auth/providers/`
- `tests/auth-authorization.test.php`

Estado atual:

- `CorporateIdentity` concentra normalizacao de `REMOTE_USER`, filtro LDAP, conexao LDAP e mapeamento de atributos.
- `Auth::loadCorporateData()` chama `CorporateIdentity::load()` fora do ambiente local.
- O controle de perfil ja esta corretamente separado na tabela `usuarios_acesso`.

Risco principal:

A criacao de providers deve preservar os metodos publicos hoje testados em `CorporateIdentity`, como `normalizeRemoteUser`, `buildUserFilter` e `mapEntry`, ou os testes e chamadas existentes quebrarao. O provider `legacy_file` tambem precisa tratar o arquivo corporativo externo como fronteira nao confiavel: validar existencia, validar formato do `$dados`, normalizar matricula e logar falhas sem vazar caminho sensivel se isso for considerado informacao restrita.

## Fase 4 - IIS E Rotas

Arquivos impactados:

- `public/web.config`
- `public/router.php`
- `public/index.php`
- `app/helpers/helpers.php`
- `app/core/Response.php`
- possiveis `index.php` e `web.config` na raiz, somente no plano alternativo

Estado atual:

- Ja existe `public/web.config` com front controller e bloqueio de segmentos internos.
- O servidor local remove `APP_BASE_PATH` para servir assets e encaminhar rotas.
- `public/index.php` tambem remove `APP_BASE_PATH` antes do dispatch.
- Existe output buffer para prefixar URLs com `APP_BASE_PATH`.

Risco principal:

Ha dois pontos que lidam com base path: o router local e o front controller. Mudancas devem ser testadas em `/estrategia` e na raiz, porque duplicar ou deixar de remover o prefixo gera 404 em rotas internas ou assets.

O plano alternativo com `index.php`/`web.config` na raiz aumenta a superficie publica. Se for usado, precisa de teste especifico bloqueando `.env`, `app`, `database`, `storage`, `uploads` e qualquer arquivo de configuracao sensivel.

## Fase 5 - Permissoes, Logs, Sessoes E Uploads

Arquivos impactados:

- `app/core/Logger.php`
- `app/core/Session.php`
- `app/services/EvidenciaStorage.php`
- `app/controllers/EvidenciaController.php`
- `uploads/web.config`
- novo `scripts/verificar-permissoes.php`

Estado atual:

- `Logger::ensureDirectory()` lanca excecao quando nao consegue criar `storage/logs`.
- O fallback para `error_log($mensagem)` ainda nao existe.
- `EvidenciaStorage` cria `UPLOAD_PATH` e usa `move_uploaded_file`.
- Downloads passam por controller autenticado e usam `readfile`.

Risco principal:

Hoje uma falha de permissao em logs pode esconder o erro original. O Logger deve falhar de forma degradada. Tambem convem que o script de permissoes teste escrita real e remocao, nao apenas `is_writable`, porque IIS/Application Pool pode se comportar diferente do terminal.

## Fase 6 - Banco, Schema E Usuarios

Arquivos impactados:

- `database/sqlserver/schema.sql`
- `scripts/migrar-para-sqlserver.py`
- `database/sqlserver/sincronizar-usuarios-acesso.sql`
- repositories que usam `usuarios_acesso`
- tela/API de administracao

Estado atual:

- O schema SQL Server ja existe.
- O README ja descreve migracao SQLite para SQL Server.
- `Auth::findAccess()` depende de `usuarios_acesso` com `matricula`, `perfil`, `sg_unidade`, `no_unidade`, `unidade_apuradora`, `diretoria_responsavel` e `ativo`.

Risco principal:

A matricula retornada pela autenticacao precisa casar exatamente com `usuarios_acesso`. Qualquer diferenca de dominio, caixa, zeros, prefixos ou sufixos causa acesso negado mesmo com LDAP funcionando.

## Fase 7 - Diagnostico Tecnico

Arquivos impactados:

- novo `scripts/preflight-servidor.php`
- arquivo temporario `public/diagnostico-iis.php`
- `Logger`
- possivelmente `Database`

Estado atual:

- Existem `/saude` e `/saude/banco`.
- `/saude/banco` exige administrador autenticado.
- Nao ha preflight CLI consolidado.

Risco principal:

O diagnostico deve ser util antes da autenticacao estar funcionando. Por isso o preflight de CLI nao deve depender de sessao, perfil ou rota protegida. Ja o diagnostico publico do IIS deve ser temporario e minimalista, sem listar ambiente completo, cookies, headers sensiveis ou connection strings.

## Fase 8 - Homologacao Funcional

Areas impactadas:

- login/autenticacao
- dashboard e resumo executivo
- indicadores
- lancamentos
- evidencias
- homologacoes
- relatorios
- administracao
- auditoria

Estado atual:

- Ha testes automatizados por modulo em `tests/`, cobrindo autorizacao, persistencia, evidencias, homologacao, dashboard, contratos de API e publicacao.
- A homologacao manual ainda e indispensavel porque envolve IIS, FastCGI, extensoes PHP, SQL Server e autenticacao corporativa.

Risco principal:

Os fluxos por perfil dependem simultaneamente de identidade corporativa, registro em `usuarios_acesso`, escopo de unidade/diretoria, CSRF e persistencia. Falhas devem ser diagnosticadas por camada, nao pela tela final.

## Fase 9 - Publicacao E Rollback

Arquivos e operacoes impactados:

- `servidor.local.php`, quando existir
- uploads existentes
- scripts SQL pendentes
- Application Pool e caminho fisico no IIS
- logs da tentativa

Estado atual:

- O projeto ja foi pensado para publicar pela pasta `public`.
- Uploads ficam fora da raiz publica em `uploads/evidencias`.
- Configuracoes sensiveis devem ficar fora do Git.

Risco principal:

Rollback so sera confiavel se o banco tiver estrategia clara. Se a publicacao aplicar scripts SQL destrutivos ou incompativeis, voltar apenas o caminho fisico do IIS pode nao restaurar a aplicacao anterior.

## Recomendacao De Execucao Tecnica

Antes de iniciar implementacao, tratar estas decisoes como bloqueadores:

- confirmar se `pdo_sqlsrv` pode ser instalado/habilitado no servidor;
- decidir se o fallback `sqlsrv` nativo sera realmente usado pela aplicacao inteira;
- obter o contrato real do arquivo LDAP corporativo externo;
- validar o formato exato da matricula retornada pelo ambiente corporativo;
- confirmar se o IIS apontara para `public` ou se sera necessario plano alternativo na raiz.

Ordem recomendada para codigo:

1. Configuracao segura e diagnostico de configuracao.
2. Preflight de ambiente sem depender de login.
3. Validacao `pdo_sqlsrv`.
4. Autenticacao por provider, preservando contrato atual.
5. Logger e permissoes.
6. Ajustes IIS/base path.
7. Schema, usuarios e homologacao por perfil.

## Testes Que Devem Ser Acrescentados

- prioridade de configuracao: ambiente, `servidor.local.php`, `.env`, default;
- ausencia de vazamento de senha em scripts e logs;
- `CorporateIdentity` delegando para provider sem quebrar normalizacao atual;
- provider `legacy_file` com fixture semelhante ao arquivo corporativo;
- erro claro quando `pdo_sqlsrv` estiver ausente;
- contrato do adapter `sqlsrv`, caso a fase 2.2 seja implementada;
- Logger com fallback quando `storage/logs` nao puder ser escrito;
- publicacao em `/estrategia` com assets, rotas internas e bloqueio de diretorios privados.
