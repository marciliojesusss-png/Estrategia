# Etapa 6 — Homologações

## Checklist de execução

- [ ] Confirmar campos, chaves e valores reais de status em `dbo.homologacoes`.
- [ ] Validar o vínculo entre homologador, indicador, unidade e lançamento.
- [ ] Implementar fila de homologações pendentes com filtros e paginação.
- [ ] Restringir a fila ao escopo autorizado do homologador.
- [ ] Exibir detalhes completos do lançamento e evidências por acesso controlado.
- [ ] Implementar aprovação com usuário, data/hora, estado anterior e novo estado.
- [ ] Implementar rejeição com justificativa obrigatória e validada.
- [ ] Impedir decisão repetida ou concorrente sobre uma homologação já processada.
- [ ] Atualizar homologação e lançamento na mesma transação.
- [ ] Registrar aprovação e rejeição na auditoria dentro do fluxo transacional.
- [ ] Implementar histórico com filtros por período, indicador, unidade e status.
- [ ] Padronizar feedback de sucesso, conflito, validação e acesso negado.
- [ ] Criar testes para aprovação, rejeição, justificativa, concorrência, rollback e autorização.

## Critérios de aceite

- [ ] Apenas homologadores autorizados decidem registros de seu escopo.
- [ ] Lançamento, homologação e auditoria permanecem consistentes após cada decisão.
- [ ] Não é possível processar duas vezes a mesma pendência.
- [ ] O histórico apresenta responsável, momento, transição e justificativa aplicável.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

