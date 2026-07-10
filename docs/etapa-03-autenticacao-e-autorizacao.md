# Etapa 3 — Autenticação e autorização

## Checklist de execução

- [ ] Confirmar e documentar a origem corporativa da identidade e o atributo usado como matrícula.
- [ ] Consultar o usuário exclusivamente pelos campos reais de `dbo.usuarios_acesso`.
- [ ] Recusar autenticação de usuário inexistente ou inativo.
- [ ] Regenerar o identificador da sessão após autenticação.
- [ ] Armazenar na sessão apenas dados necessários e revalidar autorização quando aplicável.
- [ ] Implementar expiração por inatividade e encerramento completo da sessão.
- [ ] Implementar proteção contra acesso direto às páginas e endpoints internos.
- [ ] Implementar middleware ou guarda de autenticação para todas as rotas protegidas.
- [ ] Implementar autorização por perfil, unidade e propriedade do registro.
- [ ] Aplicar a matriz de acesso aos quatro perfis em páginas, ações e APIs.
- [ ] Restringir `unidade_apuradora` aos indicadores e lançamentos de sua unidade.
- [ ] Restringir o homologador à fila e às decisões sob sua responsabilidade.
- [ ] Separar ocultação de interface de autorização efetiva no servidor.
- [ ] Registrar login, logout, expiração e tentativas negadas em `dbo.acessos_log`, usando somente campos existentes.
- [ ] Proteger login e logout contra redirecionamento aberto, fixação e uso indevido de sessão.
- [ ] Criar testes positivos e negativos por perfil, unidade, rota e ação.

## Critérios de aceite

- [ ] Nenhuma rota protegida é acessível sem sessão válida.
- [ ] A autorização é aplicada no servidor e não apenas na interface.
- [ ] Sessão expirada, usuário inativo e perfil insuficiente produzem resposta segura e auditável.
- [ ] O mecanismo respeita a autenticação corporativa confirmada, sem campos inventados.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

