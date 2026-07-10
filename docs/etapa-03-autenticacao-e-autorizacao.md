# Etapa 3 — Autenticação e autorização

## Checklist de execução

- [ ] Confirmar e documentar a origem corporativa da identidade e o atributo usado como matrícula. **Contrato atual isolado e documentado; falta confirmação formal da equipe responsável pelo LDAP.**
- [x] Consultar o usuário exclusivamente pelos campos informados de `dbo.usuarios_acesso`: `matricula`, `nome`, `perfil`, `sg_unidade`, `no_unidade` e `ativo`.
- [x] Recusar autenticação de usuário inexistente ou inativo em produção.
- [x] Regenerar o identificador da sessão após autenticação.
- [x] Armazenar na sessão apenas dados necessários e revalidar o usuário ativo a cada requisição.
- [x] Implementar expiração por inatividade e encerramento completo da sessão.
- [x] Implementar proteção contra acesso direto às páginas e endpoints internos.
- [x] Implementar guarda de autenticação para todas as rotas protegidas.
- [x] Implementar autorização por perfil, unidade e propriedade/escopo do registro.
- [x] Aplicar a matriz de acesso aos quatro perfis em páginas, ações e APIs.
- [x] Restringir `unidade_apuradora` aos indicadores e lançamentos de sua unidade.
- [x] Restringir o homologador à fila e às decisões sob sua responsabilidade.
- [x] Separar ocultação de interface de autorização efetiva no servidor.
- [x] Registrar login, logout, expiração e tentativas negadas em `dbo.acessos_log`, usando somente campos existentes.
- [x] Proteger login e logout contra redirecionamento aberto, fixação e uso indevido de sessão.
- [x] Criar testes positivos e negativos por perfil, unidade, rota e ação.

## Critérios de aceite

- [x] Nenhuma rota protegida é acessível sem autenticação e sessão válida.
- [x] A autorização é aplicada no servidor e não apenas na interface.
- [x] Sessão expirada, usuário inativo e perfil insuficiente produzem resposta segura e auditável.
- [ ] O mecanismo respeita a autenticação corporativa confirmada, sem campos inventados.

## Acompanhamento

- Decisões: matrícula é a única chave da identidade; perfil e escopo vêm de `usuarios_acesso`; `sg_unidade` representa o escopo de unidade ou diretoria conforme o perfil; logout exige POST e CSRF; eventos são prefixados em `user_agent` para não alterar `acessos_log`.
- Evidências: `app/auth/CorporateIdentity.php`, `AccessPolicy.php`, `AccessLogger.php`, `Auth.php`, guardas em `public/` e `api/`, `tests/auth-authorization.test.php` e `docs/arquitetura/autenticacao-e-autorizacao.md`.
- Pendências: confirmação formal do contrato LDAP, do significado de `sg_unidade` para cada perfil e do esquema real de `acessos_log`; validação no IIS com identidade corporativa real.
