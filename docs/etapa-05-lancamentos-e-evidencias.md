# Etapa 5 — Lançamentos e evidências

## Checklist de execução

- [ ] Confirmar campos e relacionamentos de `lancamentos`, `evidencias`, `retificacoes` e `solicitacoes_reabertura`.
- [ ] Formalizar a máquina de estados do lançamento e as transições permitidas por perfil.
- [ ] Implementar repositories com prepared statements e transações nas operações relacionadas.
- [ ] Implementar criação, consulta, edição e exclusão de rascunho conforme integridade e autorização.
- [ ] Garantir que lançamentos submetidos não sejam alterados pelo fluxo comum.
- [ ] Validar período, indicador, unidade, valores e demais campos reais no servidor.
- [ ] Implementar submissão atômica para homologação, impedindo submissão duplicada.
- [ ] Implementar histórico completo e ordenado das alterações.
- [ ] Implementar solicitação e processamento autorizado de reabertura.
- [ ] Implementar solicitação e processamento autorizado de retificação.
- [ ] Definir extensões, MIME types e tamanho máximo de evidências via configuração.
- [ ] Validar nome, extensão, MIME, tamanho, integridade e permissão antes do upload.
- [ ] Gerar nome de armazenamento seguro e impedir execução ou acesso direto indevido em `uploads`.
- [ ] Implementar download controlado e remoção de evidência apenas nos estados permitidos.
- [ ] Tratar arquivos órfãos em falhas de banco ou armazenamento.
- [ ] Aplicar escopo da unidade apuradora e demais permissões em todos os acessos.
- [ ] Auditar criação, edição, exclusão, upload, remoção, submissão, reabertura e retificação.
- [ ] Criar testes de concorrência, transação, autorização, transições e uploads maliciosos.

## Critérios de aceite

- [ ] Somente rascunhos autorizados podem ser editados ou excluídos pelo fluxo comum.
- [ ] Submissão e operações em múltiplas tabelas são atômicas.
- [ ] Evidências inválidas ou não autorizadas são recusadas e não deixam resíduos.
- [ ] O histórico permite rastrear integralmente o ciclo do lançamento.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

