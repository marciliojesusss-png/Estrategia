# Autenticação e autorização

## Origem da identidade

A integração está isolada em `app/auth/CorporateIdentity.php`. Em produção, o IIS entrega `REMOTE_USER` após autenticação integrada; a aplicação extrai e normaliza a matrícula e a consulta no LDAP nativo. O retorno exige `matricula`, `nome`, `funcao`, `unidade`, `sg_unidade` e `no_unidade`.

O LDAP somente identifica o empregado e entrega atributos corporativos. A matrícula ativa em `usuarios_acesso` define perfil e escopo locais. Se o `REMOTE_USER`, a consulta LDAP, os atributos obrigatórios ou o acesso local não forem válidos, o acesso é recusado de modo controlado.

Usuários locais `C000001` a `C000004` existem apenas quando `APP_ENV` é `local`, `development` ou `dev`, ou no servidor embutido local.

## Fluxo

1. A sessão segura é iniciada e verificada quanto à inatividade.
2. O IIS fornece `REMOTE_USER`; o provedor extrai a matrícula e a consulta no LDAP por filtro escapado, com TLS.
3. A aplicação valida os atributos LDAP obrigatórios e consulta `usuarios_acesso` por matrícula e `ativo = 1` com prepared statement.
4. O ID da sessão é regenerado na primeira autenticação.
5. Perfil e escopos mínimos são mantidos na sessão.
6. A política central valida módulo e ação no servidor.
7. Repositories recebem filtros forçados de unidade ou diretoria.
8. Login, logout, expiração e negativas são registrados em `acessos_log` com dados corporativos, IP, navegador e recurso solicitado.

## Testes de autenticação corporativa

- Empregado válido: IIS entrega `REMOTE_USER`, o LDAP retorna exatamente um empregado com todos os atributos obrigatórios e a matrícula possui registro ativo em `usuarios_acesso`.
- Empregado inexistente: o LDAP não localiza a matrícula e a aplicação retorna 401 controlado, sem expor filtro, DN ou credenciais.
- LDAP indisponível: interrompa o acesso ao servidor LDAP e confirme 401 controlado, além de log técnico sem segredo.
- Atributos incompletos: remova um atributo configurado por `LDAP_ATTR_*` e confirme que a sessão não é criada.
- Unidade sem autorização: use uma matrícula sem registro ativo em `usuarios_acesso` ou sem o escopo local permitido e confirme 401 ou 403, conforme a etapa.
- Perfil local inexistente: use uma matrícula LDAP válida sem perfil ativo e confirme que nenhuma permissão é concedida.

Os testes automatizados cobrem normalização de `REMOTE_USER`, filtro LDAP, atributos obrigatórios, expiração de sessão, escopo e auditoria. A comunicação com o LDAP e o IIS deve ser validada em homologação com uma conta corporativa autorizada.

## Registro sem alterar o esquema

Como o esquema versionado de `acessos_log` não contém uma coluna de evento, `AccessLogger` grava o tipo no início de `user_agent`, por exemplo `[evento=login]` ou `[evento=acesso_negado]`. São usadas somente as colunas existentes: `matricula`, `nome`, `perfil`, `sg_unidade`, `ip`, `user_agent` e `data_acesso`.

Essa decisão deve ser revista depois da confirmação do esquema real. Nenhuma coluna foi criada.

## Matriz implementada

| Módulo | Administrador | Homologador | Unidade apuradora | Usuário companhia |
|---|---|---|---|---|
| Dashboard e visão trimestral | visualizar | visualizar | visualizar | visualizar |
| Indicadores | visualizar/gerenciar | visualizar | visualizar | visualizar |
| Lançamentos | visualizar/gerenciar | visualizar | visualizar/gerenciar | negar |
| Homologações | visualizar/decidir | visualizar/decidir | visualizar | negar |
| Relatórios | visualizar | visualizar | visualizar | visualizar |
| Administração | gerenciar | negar | negar | negar |
| Auditoria | visualizar | negar | negar | negar |
| Reabertura | solicitar/decidir | solicitar | solicitar | negar |

Além da matriz, unidade apuradora é filtrada por `unidade_apuradora` e homologador por `diretoria_responsavel`. A confirmação desses campos no SQL Server real permanece obrigatória.

## Logout

`GET /logout` apenas apresenta confirmação. O encerramento exige `POST /logout` com cabeçalho CSRF válido, registra o evento, limpa a sessão, remove o cookie e redireciona para a entrada fixa da aplicação. Não é aceito destino de redirecionamento fornecido pelo usuário.
