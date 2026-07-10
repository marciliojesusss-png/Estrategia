# CAIXA Loterias - Indicadores Estrategicos

Aplicacao web para acompanhamento dos indicadores estrategicos da CAIXA Loterias, com lancamentos mensais, homologacoes, visao trimestral, resumo executivo, relatorios e administracao de acessos.

O projeto pode rodar de duas formas:

- **Validacao local:** HTML/JavaScript com SQLite versionado e armazenamento local do navegador.
- **Ambiente corporativo:** PHP com backend em SQL Server e autenticacao corporativa via LDAP.

## Visao Rapida

Principais recursos:

- Resumo executivo dos indicadores.
- Visao trimestral consolidada.
- Cadastro e consulta de indicadores.
- Lancamentos mensais por unidade apuradora.
- Homologacao por diretoria responsavel.
- Solicitacao e aprovacao de reabertura.
- Relatorios operacionais.
- Administracao de acessos corporativos.
- Migracao facilitada de SQLite para SQL Server.

Banco local versionado:

```text
database/indicadores.sqlite
```

Banco corporativo esperado:

```text
SQL Server DF7436SR439 / banco DB5319_IndicadoresEstrategicos
```

## Como Rodar Localmente

### Modo HTML/local

Abra:

```text
index.html
```

Esse modo usa os arquivos estaticos e dados locais no navegador. E util para validacao visual e consulta local.

### Modo PHP/local

Recomendado para testar APIs, sessao e regras de acesso:

```bat
php -S 127.0.0.1:8000 -t public
```

Depois acesse:

```text
http://127.0.0.1:8000/index.php
```

No modo PHP, as paginas em `public/` usam as APIs de `/api` e o backend PHP acessa o banco configurado.

## Autenticacao

Em producao, a aplicacao nao deve ter tela de login propria. O fluxo esperado e:

```text
Usuario acessa o sistema
        |
        v
LDAP corporativo identifica a matricula
        |
        v
Aplicacao consulta usuarios_acesso no SQL Server
        |
        v
Perfil e escopo sao carregados na sessao
```

O LDAP identifica o empregado. A tabela `usuarios_acesso` define o perfil dentro da aplicacao.

Perfis suportados:

```text
administrador
unidade_apuradora
homologador
usuario_companhia
```

Tabelas corporativas de autenticacao:

```text
dbo.usuarios_acesso
dbo.acessos_log
```

Em producao:

- se o LDAP nao estiver disponivel, o acesso falha;
- se a matricula nao estiver ativa em `usuarios_acesso`, o acesso falha;
- paginas e APIs validam perfil e escopo no backend;
- operacoes de escrita exigem token CSRF.

## Configuracao Para SQL Server

Variaveis principais:

```bat
set APP_ENV=production
set DB_CONNECTION=sqlsrv
set SQLSERVER_HOST=SERVIDOR_SQL
set SQLSERVER_DATABASE=DB5319_IndicadoresEstrategicos
set SQLSERVER_ENCRYPT=yes
set SQLSERVER_TRUST_SERVER_CERTIFICATE=no
set LDAP_PATH=C:\caminho\corporativo\acessoldap\LDAP.php
```

Dependencias do servidor PHP:

- PHP 7.1.19.
- Extensoes `pdo_sqlsrv` e `sqlsrv`.
- Acesso ao SQL Server.
- Caminho corporativo do `LDAP.php`.

Dependencias dos scripts de migracao:

- Python.
- Pacote `pyodbc`.
- Microsoft ODBC Driver for SQL Server.

Instalacao do `pyodbc`:

```bat
python -m pip install pyodbc
```

## Migracao SQLite Para SQL Server

A aplicacao usa SQLite como base local versionada e SQL Server como banco corporativo. O script de migracao copia a estrutura e os dados do SQLite para o SQL Server, validando no final se a carga ficou consistente.

Use este fluxo quando for preparar uma base de homologacao ou quando for levar a aplicacao para o ambiente corporativo com `DB_CONNECTION=sqlsrv`.

### Arquivos Do Processo

O ponto de entrada recomendado e o arquivo `.bat` da raiz:

```text
migrar-para-sqlserver.bat
scripts/migrar-para-sqlserver.py
```

O `.bat` apenas encontra o Python e chama o script principal. Toda a logica fica em:

```text
scripts/migrar-para-sqlserver.py
```

O schema SQL Server usado para criar as tabelas fica em:

```text
database/sqlserver/schema.sql
```

### O Que O Script Faz

Ao executar a migracao completa, o script:

1. Valida dependencias.
2. Le o SQLite de origem em `database/indicadores.sqlite`.
3. Cria um backup do SQLite em `database/backups/`.
4. Conecta no SQL Server usando as variaveis ou parametros informados.
5. Cria o banco SQL Server se ele ainda nao existir e o usuario tiver permissao.
6. Executa `database/sqlserver/schema.sql` para criar as tabelas e indices.
7. Copia os dados das tabelas principais para `dbo.*` no SQL Server.
8. Normaliza valores booleanos e pequenos problemas de JSON encontrados na origem.
9. Opcionalmente sincroniza `usuarios_acesso`.
10. Opcionalmente gera SQL manual para `usuarios_acesso`.
11. Verifica contagens, IDs, chaves estrangeiras, JSONs e tabelas de autenticacao.
12. Gera ou atualiza relatorios em `database/sqlserver/`.

Se a verificacao final passar, a base SQL Server esta pronta para ser usada pela aplicacao PHP configurada com:

```bat
set DB_CONNECTION=sqlsrv
```

### Antes De Executar

Instale as dependencias do script na maquina que fara a migracao:

```bat
python -m pip install pyodbc
```

Tambem e necessario ter o Microsoft ODBC Driver for SQL Server instalado e acesso ao servidor SQL Server de destino.

Por padrao, o script usa:

```text
Servidor: localhost
Banco: Estrategia
Driver: ODBC Driver 18 for SQL Server
SQLite: database/indicadores.sqlite
```

Voce pode sobrescrever esses valores por parametros no comando.

### Como Executar

#### Migrar Para Homologacao

Para migrar para uma base local ou de homologacao com os valores padrao:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao
```

Em homologacao, o script usa `TrustServerCertificate=yes` por padrao. Isso facilita testes com SQL Server local ou certificado autoassinado.

Para informar servidor e banco:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -Servidor "SERVIDOR_SQL" -Banco "Estrategia_HML"
```

#### Migrar Para Producao

```bat
.\migrar-para-sqlserver.bat -Ambiente producao -Servidor "SERVIDOR_SQL" -Banco "Estrategia"
```

Em producao, o script pede confirmacao antes de continuar e bloqueia opcoes perigosas como `-Truncate` e `-SeedAuthUsers`.
O padrao de producao e `TrustServerCertificate=no`.

#### Criar Somente Estrutura

Use quando quiser criar apenas o banco, as tabelas e os indices, sem copiar os dados do SQLite:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -SchemaOnly
```

#### Recarregar Homologacao

Use somente em homologacao, quando for permitido apagar os dados das tabelas de destino antes de recarregar:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -Truncate
```

O script pede confirmacao antes de apagar os dados. Em producao, essa opcao e bloqueada.

#### Verificar Sem Migrar

Use quando quiser apenas conferir se o SQL Server continua igual ao SQLite:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -VerifyOnly
```

Essa opcao nao copia dados. Ela somente executa as validacoes e atualiza `database/sqlserver/migration-report.json`.

#### Usuarios De Acesso

A tabela `usuarios_acesso` define quais empregados podem acessar a aplicacao e com qual perfil. Se essa tabela existir no SQLite local e voce quiser sincroniza-la para o SQL Server:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -SyncAuthUsers
```

Se a equipe de banco preferir executar manualmente no SSMS:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -GerarSqlAuthUsers
```

Isso gera:

```text
database/sqlserver/sincronizar-usuarios-acesso.sql
```

Para criar usuarios ficticios apenas em homologacao/local:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -SchemaOnly -SeedAuthUsers
```

Nao use usuarios ficticios em producao.

### Relatorios Gerados

O principal relatorio e:

```text
database/sqlserver/migration-report.json
```

Ele informa se a migracao passou ou se existem alertas. O script valida:

- quantidade de registros por tabela;
- IDs existentes no SQLite e no SQL Server;
- contagens agrupadas importantes;
- chaves estrangeiras;
- campos JSON;
- tabelas de autenticacao.

Quando `-SyncAuthUsers` e usado, tambem e gerado:

```text
database/sqlserver/usuarios-acesso-sync-report.json
```

Quando `-GerarSqlAuthUsers` e usado, tambem e gerado:

```text
database/sqlserver/sincronizar-usuarios-acesso.sql
```

### Opcoes Mais Usadas

```text
-Ambiente homologacao|producao
```

Define o modo de execucao. Em homologacao, o script e mais permissivo com certificado local. Em producao, exige confirmacao e bloqueia opcoes destrutivas.

```text
-Servidor "SERVIDOR_SQL"
```

Define o servidor SQL Server.

```text
-Banco "Estrategia"
```

Define o banco SQL Server de destino.

```text
-Truncate
```

Apaga os dados das tabelas migradas antes de recarregar. Use apenas em homologacao.

```text
-SchemaOnly
```

Cria apenas a estrutura SQL Server.

```text
-SkipBackup
```

Nao cria backup do SQLite antes da migracao. Use somente quando tiver certeza de que ja existe backup.

```text
-SkipVerify
```

Nao executa a verificacao final.

```text
-Yes
```

Responde automaticamente as confirmacoes do script. Use com cuidado.

### Erro De Certificado SQL Server

Se aparecer erro parecido com:

```text
Provedor SSL: A cadeia de certificacao foi emitida por uma autoridade que nao e de confianca.
```

Em homologacao/local, o comando com `-Ambiente homologacao` ja usa `TrustServerCertificate=yes` por padrao. Se quiser forcar a validacao do certificado tambem em homologacao, execute:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -TrustServerCertificate no
```

Em producao, o recomendado e manter:

```text
Encrypt=yes
TrustServerCertificate=no
```

Nesse caso, a maquina da aplicacao precisa confiar no certificado usado pelo SQL Server.

## Persistencia Dos Dados

Camadas usadas pelo projeto:

1. **Semente embutida:** dados base no frontend.
2. **Base local do navegador:** armazenamento por perfil do Chrome/Edge.
3. **SQLite versionado:** `database/indicadores.sqlite`.
4. **SQL Server corporativo:** destino da implantacao em servidor.

O SQLite e adequado para validacao e portabilidade. Em ambiente corporativo, o banco principal deve ser o SQL Server.

## Estrutura Principal

```text
.
|-- index.html
|-- indicadores.html
|-- lancamentos.html
|-- homologacao.html
|-- relatorios.html
|-- resumo-executivo.html
|-- visao-trimestral.html
|-- administracao.html
|-- migrar-para-sqlserver.bat
|-- app/
|   |-- auth/
|   |-- config/
|   |-- core/
|   |-- repositories/
|   `-- services/
|-- api/
|-- public/
|   |-- index.php
|   |-- resumo-executivo.php
|   |-- visao-trimestral.php
|   |-- indicadores.php
|   |-- lancamentos.php
|   |-- homologacao.php
|   |-- relatorios.php
|   |-- administracao.php
|   |-- api/
|   `-- assets/
|-- templates/
|-- assets/
|   |-- css/
|   `-- js/
|-- database/
|   |-- indicadores.sqlite
|   |-- schema.sql
|   |-- README.md
|   `-- sqlserver/
|       `-- schema.sql
|-- tests/
`-- scripts/
    `-- migrar-para-sqlserver.py
```

## Testes E Validacoes

Lint PHP:

```bat
php -l app\auth\Auth.php
```

Testes JavaScript principais:

```bat
node tests\persistence.test.js
node tests\encoding.test.js
node tests\formulas.test.js
node tests\quarterly.test.js
node tests\executive-summary.test.js
node tests\currency.test.js
node tests\local-validation.test.js
node tests\sqlite-database.test.js
```

Validar scripts Python:

```bat
python -m py_compile scripts\migrar-para-sqlserver.py
```

## Checklist De Implantacao

- [ ] Validar sistema localmente.
- [ ] Criar banco SQL Server de homologacao.
- [ ] Rodar migracao em homologacao.
- [ ] Conferir `database/sqlserver/migration-report.json`.
- [ ] Configurar `usuarios_acesso`.
- [ ] Configurar `LDAP_PATH`.
- [ ] Rodar a aplicacao com `DB_CONNECTION=sqlsrv`.
- [ ] Testar login LDAP.
- [ ] Testar perfis e escopos.
- [ ] Testar lancamentos e homologacoes.
- [ ] Repetir fluxo em producao somente apos homologacao aprovada.

## Observacoes

- O banco JSON em arquivos foi removido depois da migracao para SQLite.
- O SQLite continua util para desenvolvimento e validacao local.
- Em producao, use SQL Server como banco principal.
- O fallback local de usuario deve ficar restrito a desenvolvimento.
- As APIs protegem sessao, perfil, escopo e CSRF no backend.
