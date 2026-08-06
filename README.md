# Indicadores Estrategicos - CAIXA Loterias

Aplicacao PHP para gestao de indicadores estrategicos, lancamentos mensais,
evidencias, homologacoes, visao trimestral, relatorios, administracao de
acessos e auditoria.

## Estado Atual

- PHP 7.1.19 no ambiente corporativo.
- IIS com FastCGI.
- Roteamento por `index.php?route=...`, sem dependencia do modulo URL Rewrite.
- `public/index.php` como front controller da aplicacao.
- Configuracoes locais em `app/config/servidor.local.php`, sem Dotenv.
- SQL Server pela extensao nativa `sqlsrv`, usando `sqlsrv_connect()`.
- `pdo_sqlsrv` nao deve ser configurado como driver da aplicacao.
- LDAP legado carregado por arquivo compartilhado em `../acessoldap/LDAP.php`.
- Credenciais, caminhos absolutos de servidor e informacoes corporativas locais
  nao devem ser versionados.

## Requisitos

- PHP 7.1.19 com FastCGI no IIS.
- Extensao PHP `sqlsrv` habilitada.
- Microsoft ODBC Driver for SQL Server compativel com a extensao `sqlsrv`.
- SQL Server acessivel pela identidade/configuracao definida no servidor.
- Arquivo LDAP compartilhado fora do projeto:

```text
pasta-raiz/
+-- Estrategia/
+-- acessoldap/
    +-- LDAP.php
```

- Python, `pyodbc` e Microsoft ODBC Driver sao usados somente para migracao
  SQLite -> SQL Server.

## Roteamento

A aplicacao nao depende de rotas amigaveis nem de URL Rewrite. Toda navegacao
deve passar por:

```text
/estrategia/index.php?route=NOME_DA_ROTA
```

Exemplos:

```text
/estrategia/index.php?route=login
/estrategia/index.php?route=dashboard
/estrategia/index.php?route=indicadores
/estrategia/index.php?route=lancamentos
/estrategia/index.php?route=homologacoes
/estrategia/index.php?route=api/indicadores
/estrategia/index.php?route=api/lancamentos
```

A rota padrao e `dashboard` quando o parametro `route` esta vazio. Links,
formularios, redirecionamentos e chamadas JavaScript devem usar os helpers
centrais:

```php
app_url('indicadores')
asset_url('assets/css/styles.css')
```

O `web.config` deve permanecer apenas com documento padrao, filtros de
seguranca, tratamento de erros e headers. Nao inclua regras de rewrite.

## Executar Localmente

Use o script operacional da pasta `scripts/` a partir da raiz do projeto. Por
padrao, ele inicia a aplicacao com o prefixo `/estrategia`:

```powershell
.\scripts\servidor.ps1 executar
```

Para iniciar em segundo plano e abrir o navegador automaticamente na rota local
correta:

```powershell
.\scripts\cmd\iniciar-local.ps1
```

Para iniciar em segundo plano:

```powershell
.\scripts\servidor.ps1 executar -Background
```

Para finalizar:

```powershell
.\scripts\servidor.ps1 finalizar
```

Se o servidor foi iniciado em outra porta:

```powershell
.\scripts\servidor.ps1 finalizar -Port 8000
```

O comando de finalizacao usa o PID salvo, a linha de comando do PHP e a porta
TCP para localizar o processo local.

Para reiniciar em segundo plano:

```powershell
.\scripts\servidor.ps1 reiniciar
```

Para executar deliberadamente na raiz:

```powershell
.\scripts\servidor.ps1 reiniciar -BasePath '/'
```

Opcoes disponiveis: `-BindHost`, `-Port`, `-BasePath`, `-Background` e
`-DryRun`.

Se houver mais de uma versao do PHP instalada, informe o executavel desejado
antes de iniciar. Se `PHP_EXE` nao for informado, os scripts tentam localizar
`php.exe` automaticamente pelo `PATH` e por pastas comuns do Windows:

```powershell
$env:PHP_EXE = 'C:\caminho\php-7.1.19\php.exe'
.\scripts\servidor.ps1 executar
```

Acesse:

```text
http://127.0.0.1:8000/estrategia/index.php?route=dashboard
```

Em ambiente local sem usuario autenticado, use:

```text
http://127.0.0.1:8000/estrategia/index.php?route=login
```

Nao abra `index.php` diretamente pelo Explorador de Arquivos nem por `file://`.
Se o navegador baixar `index.php`, a requisicao nao passou pelo PHP. Use o
servidor local acima ou configure o FastCGI do IIS.

## Configuracao Local Do Servidor

Use `app/config/servidor.local.php` no servidor. Esse arquivo e ignorado pelo
Git e nao deve ser publicado no repositorio.

Modelo resumido:

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

O caminho LDAP padrao da aplicacao ja e calculado como:

```php
dirname(APP_ROOT) . '/acessoldap/LDAP.php'
```

Use valor customizado somente se a estrutura fisica do servidor for diferente.

Nunca versionar:

- `app/config/servidor.local.php`
- senhas de banco;
- credenciais LDAP;
- tokens;
- nomes reais de servidores internos;
- caminhos absolutos corporativos.

## SQL Server

A aplicacao usa exclusivamente a extensao nativa `sqlsrv`, via
`sqlsrv_connect()`.

Configuracoes esperadas:

- `db_driver`: `sqlsrv`
- `db_auth_mode`: `sql` ou `integrated`
- `SQLSERVER_ENCRYPT`: fixo como `no`
- `SQLSERVER_TRUST_SERVER_CERTIFICATE`: nao configurado

Nao use `pdo_sqlsrv` em `db_driver`, `db_connection`, `DB_DRIVER` ou
`DB_CONNECTION`. A configuracao central ainda normaliza valores antigos para
`sqlsrv` para evitar falha imediata, mas o diagnostico aponta qualquer
configuracao legada para limpeza.

A conexao SQL Server da aplicacao nao usa criptografia TLS nem validacao de
certificado no driver. O diagnostico espera `Encrypt=no`.

Tabelas essenciais esperadas pelo diagnostico:

- `indicadores`
- `lancamentos`
- `usuarios_acesso`
- `acessos_log`

## LDAP Legado

O provedor esperado e:

```php
'auth_provider' => 'legacy_file'
```

O arquivo LDAP nao deve ser copiado para dentro do projeto. Ele deve existir
fora da pasta `Estrategia`, em estrutura equivalente a:

```text
../acessoldap/LDAP.php
```

O carregamento valida `is_file()` e `is_readable()` antes de incluir o arquivo.
Em caso de falha, a aplicacao registra mensagem em:

```text
storage/logs/aplicacao.log
```

## Diagnostico Do Servidor

Execute o diagnostico completo no servidor:

```powershell
.\scripts\cmd\diagnostico-servidor.ps1
```

Se houver mais de um PHP instalado e voce quiser forcar um executavel:

```powershell
$env:PHP_EXE = 'C:\caminho\php.exe'
.\scripts\cmd\diagnostico-servidor.ps1
```

O diagnostico roda com o PHP encontrado, independentemente da versao. Para
comparar contra uma versao alvo especifica, configure em
`app/config/servidor.local.php`:

```php
'diagnostico_php_version' => '7.1.19',
```

Quando essa chave nao existe ou esta vazia, o diagnostico apenas exige PHP
7.1.19 ou superior para conseguir executar as verificacoes. O script verifica
PHP, FastCGI/IIS, `servidor.local.php`, rotas, SQL Server, tabelas, LDAP
legado, permissoes, logs recentes, ausencia de URL Rewrite e sintaxe PHP. Ele
continua ate o fim mesmo quando encontra falhas.

Cada item e exibido como:

```text
OK
AVISO
FALHA
```

O relatorio tambem e gravado em:

```text
storage/logs/diagnostico-servidor-AAAA-MM-DD-HHMMSS.log
```

Codigo de saida:

- `0`: sem falha critica;
- `1`: uma ou mais falhas criticas encontradas.

Para uma verificacao mais curta, use:

```powershell
.\scripts\cmd\preflight-servidor.ps1
```

### Diagnostico SQL Server

Quando o erro parece estar somente na conexao com o SQL Server, execute o
diagnostico especifico. Ele usa a mesma configuracao carregada pela aplicacao em
`app/config/servidor.local.php` e tenta conectar usando a extensao nativa
`sqlsrv`.

No servidor, abra o PowerShell na raiz do projeto e execute:

```powershell
.\scripts\cmd\diagnostico-sqlserver.ps1
```

Se houver mais de um PHP instalado, ou se o `php` do terminal for diferente do
PHP configurado no IIS/FastCGI, informe o executavel manualmente:

```powershell
$env:PHP_EXE = 'C:\caminho\php.exe'
.\scripts\cmd\diagnostico-sqlserver.ps1
```

Exemplo apontando para um PHP especifico:

```powershell
$env:PHP_EXE = 'C:\php\php.exe'
.\scripts\cmd\diagnostico-sqlserver.ps1
```

O diagnostico verifica:

- PHP, SAPI, `PHP_BINARY` e `php.ini`;
- extensao `sqlsrv`;
- funcao `sqlsrv_connect()`;
- `DB_DRIVER` e `DB_CONNECTION`;
- servidor, banco, modo de autenticacao e opcoes da conexao, sem exibir senha;
- erro exato retornado por `sqlsrv_errors()`;
- `SELECT 1`;
- banco atual;
- login SQL atual;
- versao do SQL Server;
- tabelas essenciais: `indicadores`, `lancamentos`, `usuarios_acesso` e
  `acessos_log`.

O relatorio tambem e gravado em:

```text
storage/logs/diagnostico-sqlserver-AAAA-MM-DD-HHMMSS.log
```

Codigo de saida:

- `0`: sem falha critica;
- `1`: uma ou mais falhas criticas encontradas.

O script nao altera banco, permissoes ou configuracoes. Ele apenas le a
configuracao local, tenta conectar e executa consultas de validacao.

Falhas comuns:

- `extensao sqlsrv: ausente`: habilite a extensao no `php.ini` usado pelo PHP
  executado.
- `funcao sqlsrv_connect: indisponivel`: o driver Microsoft PHP para SQL Server
  nao esta carregado nesse PHP.
- `Login failed`: revise `db_username`, `db_password`, banco padrao e permissoes
  do login.
- `Cannot open database`: o banco configurado nao existe ou o login nao tem
  permissao.
- `tabela ... ausente`: aplique o schema/migracao no banco correto.

Os wrappers ficam em `scripts/cmd/`. Em PowerShell, prefira os `.ps1`, pois eles
executam em publicacoes abertas por caminho UNC sem iniciar o CMD. Os `.bat`
continuam disponiveis para uso direto no `cmd.exe` e tambem usam `pushd`.
`\\servidor\compartilhamento\Estrategia`.

## Diagnostico Web Temporario

O diagnostico web existe para validar IIS, FastCGI, `REMOTE_USER` e roteamento
pelo proprio navegador. Ele fica desabilitado por padrao.

Para habilitar temporariamente, adicione exclusivamente em
`app/config/servidor.local.php`:

```php
'diagnostico_web_habilitado' => true,
'diagnostico_web_chave' => 'CHAVE_LONGA_TEMPORARIA',
```

Acesse:

```text
/estrategia/index.php?route=diagnostico-servidor&chave=CHAVE_LONGA_TEMPORARIA
```

Para desabilitar, remova essas chaves ou defina:

```php
'diagnostico_web_habilitado' => false,
```

O modo web nunca deve permanecer habilitado depois da homologacao. Ele nao
exibe senhas, tokens, credenciais completas, usuario SQL completo, host SQL
completo ou banco SQL completo.

## Migracao Para SQL Server

O SQLite local em `database/indicadores.sqlite` e usado como origem de migracao
e permanece ignorado pelo Git. Faca backup antes de migrar. O schema de destino
fica em `database/sqlserver/schema.sql`. Os wrappers abaixo executam o migrador
`scripts/migrar-para-sqlserver.py`.

```powershell
.\scripts\cmd\migrar-para-sqlserver.ps1 -Ambiente homologacao -Servidor "SERVIDOR_SQL" -Banco "NOME_DO_BANCO"
.\scripts\cmd\migrar-para-sqlserver.ps1 -Ambiente homologacao -Servidor "SERVIDOR_SQL" -Banco "NOME_DO_BANCO" -VerifyOnly
.\scripts\cmd\migrar-para-sqlserver.ps1 -Ambiente producao -Servidor "SERVIDOR_SQL" -Banco "NOME_DO_BANCO"
```

O migrador cria backup da origem, executa preflight, aplica schema, copia dados
e reconcilia contagens, IDs, agrupamentos, chaves estrangeiras e JSON.

## Testes E Publicacao

Testes principais:

```powershell
php tests\security-publication.test.php
php tests\api-contract.test.php
node tests\backend-routing.test.js
```

Antes de publicar, valide:

- `.\scripts\cmd\diagnostico-servidor.ps1`;
- login/autenticacao no IIS;
- rotas por `index.php?route=...`;
- acesso SQL Server;
- leitura do LDAP legado;
- escrita em `storage/logs`, `storage/temporarios`, `storage/backups` e
  `uploads/evidencias`;
- upload e download de evidencias;
- fluxos de lancamento e homologacao.

Ao alterar arquivos em `assets/`, replique as alteracoes correspondentes em
`public/assets/`.

## Estrutura

```text
app/                 nucleo, autenticacao, controllers, services e repositories
api/                 endpoints compativeis chamados pelo front controller
assets/              CSS, JavaScript e imagens-fonte
database/            SQLite de origem e schemas SQL
public/              raiz publica, assets publicados e front controller
scripts/             servidor local, diagnostico, preflight e migracao
scripts/cmd/         wrappers .ps1/.bat seguros para PowerShell, CMD e UNC
storage/             logs, temporarios, backups e arquivos operacionais
templates/           renderizacao do shell frontend
tests/               testes PHP, JavaScript e Python
uploads/             evidencias fora da raiz publica
views/               layouts, componentes, formularios e paginas server-side
views/frontend/      paginas visuais integradas ao backend PHP
```

Nao existem paginas HTML soltas na raiz. Requisicoes da aplicacao devem entrar
por `public/index.php` ou pelo `index.php` alternativo da raiz, sempre usando o
parametro `route`.
