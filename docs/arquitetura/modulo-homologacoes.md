# Módulo de homologações

O esquema disponível registra eventos de homologação. A fila pendente é derivada de lançamentos com status `Enviado para homologacao`; aprovação e rejeição acrescentam eventos imutáveis em `homologacoes`.

- Aprovação altera o lançamento para `Homologado`.
- Rejeição exige justificativa com ao menos cinco caracteres e altera para `Devolvido para ajuste`.
- A atualização do lançamento usa estado esperado, impedindo decisão repetida ou concorrente.
- Estado do lançamento, evento de homologação e auditoria são gravados na mesma transação.
- Homologador é limitado a `diretoria_responsavel`; administrador possui escopo global.
- Detalhe apresenta dados do lançamento e evidências por download controlado.
- Fila e histórico têm paginação e filtros por indicador, unidade, diretoria, status e período.

Os estados `Pendente`, `Aprovado` e `Rejeitado` do requisito são representados, respectivamente, pela fila de lançamentos enviados, evento/estado `Homologado` e evento/estado `Devolvido para ajuste`. Nenhuma coluna foi adicionada.
