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
    'auth_require_caixa_loterias_unit' => true,
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

A aplicacao usa exclusivamente SQL Server por meio de `sqlsrv_connect()`.
Nao existe fallback de banco em arquivo ou armazenamento operacional no navegador.

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

O perfil de autorizacao e consultado em `dbo.usuarios_acesso`. A autenticacao
corporativa continua sendo realizada pelo LDAP; nenhuma senha de usuario da
aplicacao e armazenada no banco.

### Restauracao no ambiente corporativo

O procedimento obrigatório de conferência dos SIDs antes de liberar cada novo
backup está documentado em
[`docs/controle-sid-backups-sqlserver.md`](docs/controle-sid-backups-sqlserver.md).

Os backups do ambiente local nao contem o login tecnico da instancia
corporativa. Depois de cada restauracao, o DBA deve criar ou remapear o usuario
do banco para o login corporativo e reaplicar os papeis da aplicacao.

Gere sempre um arquivo novo, com um unico conjunto de backup:

```sql
BACKUP DATABASE [Estrategia]
TO DISK = N'C:\Backup\Estrategia-Producao.bak'
WITH INIT, COPY_ONLY, CHECKSUM, STATS = 10;

RESTORE VERIFYONLY
FROM DISK = N'C:\Backup\Estrategia-Producao.bak'
WITH CHECKSUM;
```

Depois da restauracao, execute o script no modo SQLCMD. O login deve existir
previamente na instancia e ser administrado pelo DBA:

```powershell
sqlcmd -S "SERVIDOR\INSTANCIA" -E -b `
  -i ".\database\sqlserver\pos-restauracao-acesso-aplicacao.sql" `
  -v DatabaseName="DB5319_IndicadoresEstrategicos" ApplicationLogin="s531902"
```

O script e idempotente: cria ou remapeia o usuario do banco e garante a
associacao aos papeis `db_datareader` e `db_datawriter`. Ele nao cria login na
instancia e nao concede `db_owner`.

Quando o novo backup tambem precisar carregar os mesmos SIDs do backup
corporativo antigo, execute `database/sqlserver/gerar-backup-sids-corporativos.sql`
na instancia corporativa. O script exige que os logins `CORPCAIXA\c118119` e
`s531902` ja existam com os SIDs esperados, restaura um banco de staging, valida
`owner/dbo` e o usuario da aplicacao e grava um novo `.bak`. O backup de origem
nao e sobrescrito.

Por fim, valide a conexao a partir do servidor IIS, usando o mesmo PHP da
aplicacao:

```powershell
php .\scripts\diagnostico-sqlserver.php
```

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

Em producao, a autenticacao LDAP e seguida por uma segunda barreira: o codigo
numerico da unidade do empregado deve existir como ativo em
`BASEDB001.dbo.SIREDTB_Unidade_Caixa_Loterias`. A configuracao
`auth_require_caixa_loterias_unit` deve permanecer `true` no servidor da CAIXA.
O usuario tecnico da aplicacao precisa de permissao `SELECT` nessa tabela.
Consulte o procedimento completo em
[`docs/autenticacao-unidades-caixa-loterias.md`](docs/autenticacao-unidades-caixa-loterias.md).

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

Ler o `php.ini` carregado por um PHP:

```powershell
.\scripts\cmd\ler-php-ini.ps1
```

Ler o `php.ini` de um executavel especifico:

```powershell
.\scripts\cmd\ler-php-ini.ps1 -PhpExe 'C:\Sistemas\toolsphp8.3\php-8.3.24-nts-Win32-vs16-x64\php.exe'
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
storage/logs/php-ini-AAAA-MM-DD-HHMMSS.log
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

## IIS e arquivos estaticos

O procedimento completo para configurar e validar o IIS da CAIXA está em
[`docs/configuracao-iis-web-config-caixa.md`](docs/configuracao-iis-web-config-caixa.md).

Quando o diretório físico da aplicação no IIS aponta para a raiz do projeto, os
assets publicados são acessados por `/estrategia/public/assets/...`. O
`public/web.config` remove e adiciona novamente os segmentos ocultos herdados do
`web.config` raiz; não remova as tags `<remove>`. Sem elas, o IIS pode responder
`500.19` por entradas duplicadas e o navegador passa a informar erro de MIME em
todos os arquivos CSS e JavaScript.

Depois da publicação, valide diretamente um CSS e um JavaScript:

```powershell
Invoke-WebRequest `
  -Uri 'https://SERVIDOR/estrategia/public/assets/css/styles.css' `
  -UseBasicParsing | Select-Object StatusCode, Headers

Invoke-WebRequest `
  -Uri 'https://SERVIDOR/estrategia/public/assets/js/app.js' `
  -UseBasicParsing | Select-Object StatusCode, Headers
```

Os dois recursos devem retornar `200`. O CSS deve usar `text/css` e o
JavaScript deve usar um tipo JavaScript válido. Não desative
`X-Content-Type-Options: nosniff` para contornar respostas `500` ou MIME
incorreto; corrija primeiro a resposta do IIS.

## Banco e migrations

O schema versionado fica em `database/sqlserver/schema.sql`. Migrations
idempotentes ficam em `database/sqlserver/migrations/` e devem ser executadas
no banco corporativo antes da publicacao da versao correspondente.

## Testes

```powershell
php tests\security-publication.test.php
php tests\caixa-loterias-access-gate.test.php
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
database/            schema e migrations do SQL Server
public/              raiz publica e front controller
scripts/             servidor local e diagnosticos
scripts/cmd/         wrappers .ps1/.bat
storage/             logs, temporarios e backups
templates/           shell frontend
tests/               testes PHP, JavaScript e Python
uploads/             evidencias fora da raiz publica
views/               layouts, componentes e paginas
```

Requisicoes da aplicacao devem entrar por `public/index.php` ou pelo
`index.php` alternativo da raiz, sempre usando o parametro `route`.

## Governança de homologação e fechamento para o CA

- Unidade Apuradora: preenche e envia lançamentos da própria unidade.
- Diretoria Homologadora: homologa, devolve e reabre lançamentos da própria diretoria antes do fechamento para o CA.
- Consultor da Diretoria: perfil distinto, com o mesmo escopo de diretoria para homologar, devolver e reabrir antes do fechamento; não pode preencher lançamentos.
- Administrador: administra usuários e configurações e pode realizar reabertura excepcional depois do fechamento.

Quem criou, salvou, alterou, retificou ou enviou um lançamento não pode
homologá-lo nem devolvê-lo, mesmo que seu perfil seja alterado posteriormente.
A única exceção deliberada é o usuário cujo perfil cadastral original é
`Administrador`: durante a fase atual de produção e estabilização, ele mantém a
prerrogativa excepcional de continuidade operacional, inclusive quando utiliza
`Visualizar como`. A boa prática é preferir outro Administrador disponível para
a homologação, sem transformar essa preferência em bloqueio técnico. A decisão,
a cobertura desejada com três Administradores ativos e os controles preservados
estão documentados em [`docs/governanca-acessos.md`](docs/governanca-acessos.md).

A verificação dos demais perfis é feita no backend pela matrícula autenticada,
pelo responsável atual e pelos eventos de produção existentes em `auditoria` e
`homologacoes`.

A configuração `fechamentosConselhoAdministracao` é armazenada como JSON na
tabela existente `configuracoes`. A data de fechamento é cadastrada
explicitamente pelo Administrador e deve anteceder a reunião. Na própria data
de fechamento e depois dela, Diretoria e Consultor ficam bloqueados. A
reabertura administrativa pós-fechamento exige justificativa e gera o evento de
auditoria `reabertura_excepcional_pos_fechamento_ca`. A partir do fechamento,
lançamentos reabertos normalmente também ficam bloqueados para alteração e
reenvio. Uma reabertura excepcional inicia um ciclo temporário de correção que
permanece aberto nos estados intermediários e termina na nova homologação.
Solicitações históricas continuam consultáveis; a aprovação de uma solicitação
pendente usa o mesmo serviço central de reabertura.
