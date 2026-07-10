# Etapa 5 — Lançamentos e evidências

## Checklist de execução

- [ ] Confirmar campos e relacionamentos de `lancamentos`, `evidencias`, `retificacoes` e `solicitacoes_reabertura`. **Implementação limitada aos scripts versionados; falta validar o SQL Server real.**
- [x] Formalizar a máquina de estados do lançamento e as transições permitidas por perfil.
- [x] Implementar repositories com prepared statements e transações nas operações relacionadas.
- [x] Implementar criação, consulta, edição e exclusão de rascunho conforme integridade e autorização.
- [x] Garantir que lançamentos submetidos não sejam alterados pelo fluxo comum.
- [x] Validar período, indicador, unidade e demais campos disponíveis no servidor.
- [x] Implementar submissão atômica para homologação, impedindo submissão duplicada.
- [x] Implementar histórico completo e ordenado por meio da auditoria.
- [ ] Implementar solicitação e processamento autorizado de reabertura. **Processamento administrativo direto está implementado; o fluxo legado de solicitação ainda será consolidado sem `replaceAll`.**
- [x] Implementar processamento autorizado de retificação, com justificativa e versões anterior/nova.
- [x] Definir extensões, MIME types e tamanho máximo de evidências via configuração.
- [x] Validar nome, extensão, MIME, tamanho, integridade e permissão antes do upload.
- [x] Gerar nome de armazenamento seguro e impedir execução ou acesso direto indevido em `uploads`.
- [x] Implementar download controlado e remoção de evidência apenas nos estados permitidos.
- [x] Tratar arquivos órfãos em falhas de banco ou armazenamento.
- [x] Aplicar escopo da unidade apuradora e demais permissões em todos os acessos.
- [x] Auditar criação, edição, exclusão, upload, remoção, submissão, reabertura e retificação.
- [x] Criar testes de conflito concorrente, transação, autorização, transições e uploads maliciosos.

## Critérios de aceite

- [x] Somente estados editáveis autorizados podem ser alterados e somente rascunhos podem ser excluídos pelo fluxo comum.
- [x] Submissão e operações em múltiplas tabelas são atômicas.
- [x] Evidências inválidas ou não autorizadas são recusadas e falhas após armazenamento não deixam resíduos.
- [x] O histórico permite rastrear integralmente o ciclo implementado do lançamento.

## Acompanhamento

- Decisões: substituir `replaceAll` por operações específicas; usar atualização condicional de status contra submissão duplicada; armazenar evidências fora de `public`; manter inativação/estados e auditoria como fonte do histórico.
- Evidências: repositories de lançamentos, evidências e retificações; `LancamentoService`, `EvidenciaService`, `LancamentoStateMachine`, controllers e views; `tests/launches-evidence-module.test.php`; `docs/arquitetura/lancamentos-e-evidencias.md`.
- Pendências: confirmar esquema corporativo; consolidar o endpoint legado de solicitação de reabertura; validar `pdo_sqlsrv`, concorrência real e permissões de filesystem no IIS; homologar limites e MIME types com segurança da informação.
