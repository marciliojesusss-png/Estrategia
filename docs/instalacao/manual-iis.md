# Instalação no IIS

## Pré-requisitos

- Windows Server homologado, IIS com CGI/FastCGI e URL Rewrite.
- PHP 7.1.19 NTS x64 compatível com a arquitetura do Application Pool.
- Microsoft ODBC Driver e extensões `sqlsrv`/`pdo_sqlsrv` compatíveis com PHP 7.1.
- Extensão PHP `ldap` compatível com PHP 7.1 e cadeia de certificados corporativa instalada no servidor.
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
9. Valide manualmente a sintaxe PHP, as extensões, as permissões e as rotas principais no servidor.
10. Reinicie o pool e valide login, dashboard, lançamentos, homologações, uploads e administração.

## Autenticação corporativa e `REMOTE_USER`

1. No IIS Manager, selecione a aplicação e abra **Authentication**.
2. Desabilite **Anonymous Authentication** e habilite **Windows Authentication**.
3. Em **Providers**, mantenha `Negotiate` antes de `NTLM`, conforme a política da infraestrutura.
4. Garanta que a conta do Application Pool possa acessar a configuração do site e que o PHP FastCGI receba a variável de servidor `REMOTE_USER`.
5. Configure `LDAP_URI`, `LDAP_BASE_DN`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`, `LDAP_USER_FILTER` e os atributos `LDAP_ATTR_*` no ambiente do processo FastCGI. Não grave a senha de bind em arquivos versionados.
6. Use `ldaps://` ou `LDAP_STARTTLS=true`, mantenha `LDAP_REQUIRE_TLS=true` em produção e instale a CA que assina o certificado LDAP no repositório de confiança do Windows.
7. Valide com um empregado autenticado que `REMOTE_USER` chega no formato `DOMINIO\matricula` e que a matrícula possui registro ativo em `dbo.usuarios_acesso`.

O servidor web autentica o usuário; o LDAP somente completa os atributos corporativos; a aplicação decide o perfil e o escopo por dados locais.

### Apache HTTP Server

Em instalações Apache, habilite o módulo corporativo de autenticação aprovado pela infraestrutura, como `mod_auth_gssapi` ou `mod_auth_kerb`, exija usuário válido na localização da aplicação e confirme que o FastCGI/PHP recebe `REMOTE_USER`. A aplicação não aceita matrícula enviada por query string, formulário ou cabeçalho HTTP comum como substituto dessa variável de servidor.

### Publicação em `https://www.gelot.mz.caixa/estrategia`

1. No site HTTPS `www.gelot.mz.caixa`, adicione uma aplicação IIS com alias `estrategia`.
2. Aponte o caminho físico dessa aplicação exclusivamente para `Estrategia\public`.
3. Configure `APP_BASE_PATH=/estrategia` no ambiente do processo FastCGI (este também é o padrão atual do projeto).
4. Mantenha o `public\web.config` na raiz da aplicação virtual e confirme que o URL Rewrite está instalado.

A entrada principal da aplicação é `https://www.gelot.mz.caixa/estrategia/`. Em modo de autenticação local, a própria raiz apresenta o formulário de login. Os demais endereços usam somente rotas limpas, sem extensão `.php`.

## Diagnóstico rápido

- `500.19`: módulo URL Rewrite ausente ou `web.config` inválido.
- `500.0`/FastCGI: verifique arquitetura, Visual C++ Runtime e permissões no PHP.
- `could not find driver`: `pdo_sqlsrv` não foi carregado; valide `php --ini` e `php -m` na mesma instalação usada pelo IIS.
- `Login timeout`: valide DNS, porta, TLS, ODBC Driver, firewall e credenciais.
- Rotas retornam 404: confirme URL Rewrite e que o Physical Path é `public`.
- Upload falha: compare limites do IIS, `upload_max_filesize`, `post_max_size` e ACL das pastas.

Não publique enquanto as validações técnicas e os testes autenticados dos perfis não estiverem aprovados.
