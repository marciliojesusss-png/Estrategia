# Etapa 8 — Administração e auditoria

## Checklist de execução

- [ ] Confirmar estrutura e regras reais de `usuarios_acesso`, `usuarios_validacao`, `configuracoes`, `acessos_log` e `auditoria`. **Implementação limitada ao esquema disponível.**
- [x] Implementar listagem, pesquisa e filtros de usuários.
- [ ] Implementar cadastro somente se permitido pela estrutura e pelo processo corporativo. **Cadastro técnico implementado; uso em produção depende de aprovação do processo corporativo.**
- [x] Implementar edição, ativação, inativação, perfil e unidade usando apenas os campos informados.
- [x] Validar perfis contra a lista corporativa permitida.
- [x] Impedir perda acidental do próprio acesso administrativo com confirmação e validação no servidor.
- [x] Impedir que a operação deixe o sistema sem administrador ativo, adotando proteção segura por padrão.
- [x] Implementar consulta de usuários de validação conforme os campos disponíveis.
- [ ] Implementar gestão segura das configurações existentes, com validação por chave e tipo. **Chave existente e JSON são validados; faltam tipos corporativos definidos por chave.**
- [x] Proteger valores sensíveis de configuração contra exposição, alteração pela interface e registro indevido.
- [x] Implementar consulta de acessos e auditoria com filtros suportados pelos campos disponíveis.
- [x] Exibir valor anterior e novo somente para administrador e mascarar configurações sensíveis.
- [x] Restringir administração e auditoria aos perfis definidos na matriz de acesso.
- [x] Auditar todas as alterações administrativas, incluindo estado anterior e novo.
- [x] Implementar paginação e limite máximo para consultas volumosas de auditoria.
- [x] Criar testes de autoalteração, último administrador, campos sensíveis, filtros e autorização.

## Critérios de aceite

- [x] Apenas administradores autorizados alteram usuários e configurações.
- [x] Nenhuma tela do novo módulo inventa campos ausentes ou expõe valores sensíveis.
- [x] Alterações administrativas são rastreáveis e consultas de auditoria são paginadas.
- [x] Proteções contra remoção indevida de acesso foram testadas.

## Acompanhamento

- Decisões: usar apenas os sete campos informados de `usuarios_acesso`; bloquear último administrador por padrão; restringir configurações a chaves existentes; mascarar chaves sensíveis inclusive no histórico; manter `usuarios_validacao` somente leitura nesta etapa.
- Evidências: `AdministracaoRepository.php`, `AdministracaoService.php`, `AuditoriaConsultaRepository.php`, controllers e views administrativas, `tests/administration-audit-module.test.php` e `docs/arquitetura/administracao-e-auditoria.md`.
- Pendências: confirmar esquemas e processo corporativo de cadastro; definir tipo permitido por chave de configuração; validar paginação e planos no SQL Server real.
