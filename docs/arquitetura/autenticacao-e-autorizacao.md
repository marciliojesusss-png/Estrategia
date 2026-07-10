# Autenticação e autorização

## Origem da identidade

A integração foi isolada em `app/auth/CorporateIdentity.php`. O contrato atualmente esperado do arquivo indicado por `LDAP_PATH` fornece `matricula`, `nome`, `funcao`, `unidade`, `sg_unidade` e `no_unidade`. Apenas `matricula` identifica o acesso na aplicação.

Esse contrato foi inferido do código legado e ainda precisa de confirmação formal da equipe responsável pelo LDAP. Em produção não há formulário ou senha local: se a identidade corporativa não estiver disponível ou a matrícula não estiver ativa em `usuarios_acesso`, o acesso é recusado.

Usuários locais `C000001` a `C000004` existem apenas quando `APP_ENV` é `local`, `development` ou `dev`, ou no servidor embutido local.

## Fluxo

1. A sessão segura é iniciada e verificada quanto à inatividade.
2. O provedor corporativo entrega e valida a matrícula.
3. A aplicação consulta `usuarios_acesso` por matrícula e `ativo = 1` com prepared statement.
4. O ID da sessão é regenerado na primeira autenticação.
5. Perfil e escopos mínimos são mantidos na sessão.
6. A política central valida módulo e ação no servidor.
7. Repositories recebem filtros forçados de unidade ou diretoria.
8. Login, logout, expiração e negativas são registrados em `acessos_log`.

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
