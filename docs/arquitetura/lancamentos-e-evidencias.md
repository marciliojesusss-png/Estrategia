# Lançamentos e evidências

O módulo usa os campos dos scripts versionados; a confirmação no SQL Server corporativo continua obrigatória. A máquina de estados implementada é `Rascunho -> Enviado para homologacao`, com retorno possível para `Devolvido para ajuste`, reabertura administrativa para `Reaberto` e edição justificada que gera `Retificado`.

- Somente `Rascunho`, `Reaberto` e `Devolvido para ajuste` são editáveis.
- Somente `Rascunho` pode ser excluído.
- Submissão usa atualização condicional do estado, cria evento em `homologacoes` e auditoria na mesma transação.
- Reabertura exige administrador e justificativa.
- Edição de reaberto exige justificativa e grava versões em `retificacoes`.
- Unidade apuradora é validada contra o escopo da sessão.
- Indicador deve existir, estar ativo e não pode repetir competência.

Evidências ficam fora de `public`, recebem nome aleatório, validação de extensão, MIME e tamanho, e são vinculadas ao banco em transação. Falha após armazenamento remove o arquivo. Download e remoção dependem de sessão, escopo e estado. Extensões são configuradas por `UPLOAD_ALLOWED_EXTENSIONS` e tamanho por `UPLOAD_MAX_BYTES`.

O esquema disponível mantém também `lancamentos.evidencia_id`; por compatibilidade, o último anexo é referenciado ali, enquanto `evidencias.lancamento_id` permite o histórico de anexos.
