# Fundação técnica no IIS

## Raiz pública

Configure o caminho físico do site ou aplicação IIS para a pasta `public`. Não aponte o IIS para a raiz do repositório. Assim, `app`, `database`, `docs`, `storage`, `uploads` e os scripts de migração não são publicados.

O arquivo `public/web.config` envia URLs inexistentes fisicamente ao front controller `public/index.php`. Sem URL Rewrite, use `index.php?rota=/dashboard`.

## Configuração externa

Defina no ambiente do Application Pool, sem gravar credenciais no repositório:

```text
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=sqlsrv
SQLSERVER_HOST=DF7436SR439
SQLSERVER_DATABASE=DB5319_IndicadoresEstrategicos
SQLSERVER_PORT=
SQLSERVER_USER=
SQLSERVER_PASSWORD=
SQLSERVER_ENCRYPT=yes
SQLSERVER_TRUST_SERVER_CERTIFICATE=no
LDAP_PATH=C:\caminho\protegido\LDAP.php
SESSION_IDLE_TIMEOUT=1800
```

Usuário e senha vazios fazem o PDO usar a identidade integrada disponível ao processo. A estratégia definitiva deve ser confirmada pela infraestrutura.

## Permissões

A identidade do Application Pool precisa de leitura na aplicação e escrita apenas em:

- `storage/logs`;
- `storage/backups`;
- `storage/temporarios`;
- `uploads/evidencias`.

Não conceda permissão de alteração em `app`, `public`, `database` ou `views`.

## Testes controlados

- `/saude` confirma somente a inicialização da aplicação e a versão do PHP.
- `/saude/banco` exige administrador e executa apenas `SELECT 1`.
- Erros de conexão são registrados sem DSN, usuário, senha ou consulta completa.
