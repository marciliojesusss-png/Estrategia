# Instalação no IIS

## Pré-requisitos

- Windows Server homologado, IIS com CGI/FastCGI e URL Rewrite.
- PHP 7.1.19 NTS x64 compatível com a arquitetura do Application Pool.
- Microsoft ODBC Driver e extensões `sqlsrv`/`pdo_sqlsrv` compatíveis com PHP 7.1.
- Banco SQL Server criado, schema aplicado e usuário de serviço com privilégio mínimo.

## Instalação

1. Copie o pacote para um diretório fora de `inetpub`, sem incluir credenciais ou backups.
2. Configure variáveis de ambiente conforme `app/config/config.php`; nunca altere o arquivo para gravar senhas.
3. Aponte o Physical Path do site exclusivamente para a pasta `public`.
4. No Handler Mapping, associe `*.php` ao `php-cgi.exe` via FastCGI.
5. Configure o Application Pool como `No Managed Code`, Integrated e identidade dedicada.
6. Conceda leitura ao código e escrita somente em `storage/logs`, `storage/uploads` e `storage/temporarios`.
7. Confirme no `php.ini`: timezone, limites de upload, sessões seguras, `display_errors=Off`, logging e `extension=pdo_sqlsrv`.
8. Aplique `database/sqlserver/schema.sql` e execute o migrador em homologação.
9. Execute `scripts/preflight-publicacao.ps1` no servidor; ele deve terminar sem erros.
10. Reinicie o pool e execute `scripts/smoke-test.ps1 -BaseUrl https://endereco`.

## Diagnóstico rápido

- `500.19`: módulo URL Rewrite ausente ou `web.config` inválido.
- `500.0`/FastCGI: verifique arquitetura, Visual C++ Runtime e permissões no PHP.
- `could not find driver`: `pdo_sqlsrv` não foi carregado; valide `php --ini` e `php -m` na mesma instalação usada pelo IIS.
- `Login timeout`: valide DNS, porta, TLS, ODBC Driver, firewall e credenciais.
- Rotas retornam 404: confirme URL Rewrite e que o Physical Path é `public`.
- Upload falha: compare limites do IIS, `upload_max_filesize`, `post_max_size` e ACL das pastas.

Não publique enquanto o preflight, o smoke test e o teste autenticado dos perfis não estiverem aprovados.
