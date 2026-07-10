# Etapa 8 — Administração e auditoria

## Checklist de execução

- [ ] Confirmar estrutura e regras reais de `usuarios_acesso`, `usuarios_validacao`, `configuracoes`, `acessos_log` e `auditoria`.
- [ ] Implementar listagem, pesquisa e filtros de usuários.
- [ ] Implementar cadastro somente se permitido pela estrutura e pelo processo corporativo.
- [ ] Implementar edição, ativação, inativação, perfil e unidade usando apenas campos reais.
- [ ] Validar perfis contra a lista corporativa permitida.
- [ ] Impedir perda acidental do próprio acesso administrativo com confirmação e validação no servidor.
- [ ] Impedir que a operação deixe o sistema sem administrador ativo, se essa regra for aprovada.
- [ ] Implementar consulta de usuários de validação conforme relacionamentos reais.
- [ ] Implementar gestão segura das configurações existentes, com validação por chave e tipo.
- [ ] Proteger valores sensíveis de configuração contra exposição e registro indevido.
- [ ] Implementar consulta de acessos e auditoria com filtros suportados pelos campos reais.
- [ ] Exibir valor anterior e novo valor somente quando existirem e forem autorizados.
- [ ] Restringir administração e auditoria aos perfis definidos na matriz de acesso.
- [ ] Auditar todas as alterações administrativas, incluindo estado anterior e novo.
- [ ] Implementar paginação e limites para consultas volumosas de auditoria.
- [ ] Criar testes de autoalteração, último administrador, campos sensíveis, filtros e autorização.

## Critérios de aceite

- [ ] Apenas administradores autorizados alteram usuários e configurações.
- [ ] Nenhuma tela inventa campos ausentes nem expõe valores sensíveis.
- [ ] Alterações administrativas são rastreáveis e consultas de auditoria são paginadas.
- [ ] Proteções contra remoção indevida de acesso foram testadas.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

