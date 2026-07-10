# Etapa 6 — Homologações

## Checklist de execução

- [ ] Confirmar campos, chaves e valores reais de status em `dbo.homologacoes`. **Implementação limitada ao esquema versionado; falta validar o SQL Server real.**
- [ ] Validar o vínculo corporativo entre homologador, indicador, unidade e lançamento. **Vínculo técnico por diretoria implementado; falta homologação da regra de negócio.**
- [x] Implementar fila de homologações pendentes com filtros e paginação.
- [x] Restringir a fila ao escopo autorizado do homologador.
- [x] Exibir detalhes completos do lançamento e evidências por acesso controlado.
- [x] Implementar aprovação com usuário, data/hora, estado anterior e novo estado.
- [x] Implementar rejeição com justificativa obrigatória e validada.
- [x] Impedir decisão repetida ou concorrente sobre uma homologação já processada.
- [x] Atualizar evento de homologação e lançamento na mesma transação.
- [x] Registrar aprovação e rejeição na auditoria dentro do fluxo transacional.
- [x] Implementar histórico com filtros por período, indicador, unidade, diretoria e status.
- [x] Padronizar feedback de sucesso, conflito, validação e acesso negado.
- [x] Criar testes para aprovação, rejeição, justificativa, concorrência, rollback e autorização.

## Critérios de aceite

- [x] Apenas homologadores autorizados e administradores decidem registros de seu escopo.
- [x] Lançamento, homologação e auditoria permanecem consistentes após cada decisão.
- [x] Não é possível processar duas vezes a mesma pendência.
- [x] O histórico apresenta responsável, momento, transição e justificativa aplicável.

## Acompanhamento

- Decisões: preservar `homologacoes` como histórico imutável de eventos; derivar pendência do status do lançamento; representar rejeição como `Devolvido para ajuste`; usar atualização condicional do estado para controle de concorrência.
- Evidências: `HomologacoesRepository.php`, `HomologacaoService.php`, controllers e views de homologação, `tests/homologations-module.test.php` e `docs/arquitetura/modulo-homologacoes.md`.
- Pendências: confirmar esquema e valores reais no SQL Server; homologar a associação entre diretoria e homologador; executar testes concorrentes com `pdo_sqlsrv` e volume representativo.
