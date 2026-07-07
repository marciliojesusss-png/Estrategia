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
SQL Server / banco Estrategia
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

Guia detalhado:

```text
docs/autenticacao-corporativa.md
```

## Configuracao Para SQL Server

Variaveis principais:

```bat
set APP_ENV=production
set DB_CONNECTION=sqlsrv
set SQLSERVER_HOST=SERVIDOR_SQL
set SQLSERVER_DATABASE=Estrategia
set SQLSERVER_ENCRYPT=yes
set SQLSERVER_TRUST_SERVER_CERTIFICATE=no
set LDAP_PATH=C:\caminho\corporativo\acessoldap\LDAP.php
```

Dependencias do servidor PHP:

- PHP 8 ou superior.
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

O projeto possui um orquestrador para simplificar a migracao:

```text
migrar-para-sqlserver.bat
scripts/migrar-para-sqlserver.ps1
```

Ele executa os scripts Python existentes na ordem correta:

1. Valida dependencias.
2. Cria backup do SQLite.
3. Executa a migracao para SQL Server.
4. Executa a verificacao da migracao.
5. Gera/atualiza relatorios em `database/sqlserver/`.

### Migrar Para Homologacao

Com valores padrao (`localhost`, banco `Estrategia`):

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao
```

Em homologacao, o orquestrador usa `TrustServerCertificate=yes` por padrao para permitir SQL Server local ou de teste com certificado autoassinado.

Informando servidor e banco:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -Servidor "SERVIDOR_SQL" -Banco "Estrategia_HML"
```

### Migrar Para Producao

```bat
.\migrar-para-sqlserver.bat -Ambiente producao -Servidor "SERVIDOR_SQL" -Banco "Estrategia"
```

Em producao, o script pede confirmacao antes de continuar e bloqueia opcoes perigosas como `-Truncate` e `-SeedAuthUsers`.
O padrao de producao e `TrustServerCertificate=no`.

### Criar Somente Estrutura

Use quando quiser criar apenas tabelas, sem copiar dados:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -SchemaOnly
```

### Recarregar Homologacao

Use somente em homologacao, quando for permitido apagar as tabelas de destino antes de recarregar:

```bat
.\migrar-para-sqlserver.bat -Ambiente homologacao -Truncate
```

O script pede confirmacao. Em producao, essa opcao e bloqueada.

### Usuarios De Acesso

Se a tabela `usuarios_acesso` existir no SQLite local e voce quiser sincroniza-la para o SQL Server:

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

Guia detalhado:

```text
docs/migracao-sqlite-para-sqlserver.md
```

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
|-- docs/
|-- tests/
`-- scripts/
    |-- migrar-para-sqlserver.ps1
    |-- migrar-sqlite-para-sqlserver.py
    |-- verificar-sqlserver.py
    |-- sincronizar-usuarios-acesso-sqlserver.py
    `-- gerar-sql-usuarios-acesso.py
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
python -m py_compile scripts\migrar-sqlite-para-sqlserver.py scripts\verificar-sqlserver.py scripts\sincronizar-usuarios-acesso-sqlserver.py scripts\gerar-sql-usuarios-acesso.py
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
