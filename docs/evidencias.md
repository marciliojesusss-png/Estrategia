# Evidências de lançamentos

## Finalidade

A seção Evidências registra a referência documental e os arquivos que sustentam os dados de uma competência. A observação da área continua destinada ao contexto e à explicação do resultado; justificativas formais permanecem nos fluxos de devolução, reabertura e retificação.

## Estrutura SQL

- `dbo.lancamentos.referencia_evidencia`: referência, processo, nota técnica ou link; aceita `NULL`.
- `dbo.evidencias`: um registro por arquivo, relacionado por `lancamento_id`.
- `dbo.lancamentos.evidencia_id`: campo legado mantido apenas como ponteiro para o anexo mais recente. A fonte de verdade da lista é `dbo.evidencias WHERE lancamento_id = ...`.

A migration idempotente é `database/sqlserver/migrations/20260831_002_evidencias_lancamentos.sql`.

## Armazenamento

Os arquivos são gravados por `EvidenciaStorage` em `UPLOAD_PATH`, fora da área pública. O nome físico é aleatório e o download sempre passa pelo backend autorizado. O diretório de upload é ignorado pelo Git.

Configurações:

- `UPLOAD_PATH`: definido pela aplicação como `uploads/evidencias`.
- `UPLOAD_MAX_BYTES`: padrão de 10 MB.
- `UPLOAD_ALLOWED_EXTENSIONS`: padrão `pdf,jpg,jpeg,png,xls,xlsx,doc,docx`.

Extensão e MIME são validados. Arquivos como `.msg`, `.eml`, `.zip` e executáveis não são aceitos.

## Permissões

- Unidade Apuradora: lista, baixa, inclui e remove somente no próprio escopo e enquanto o lançamento estiver editável.
- Homologador: lista e baixa somente na própria diretoria; não inclui nem remove.
- Administrador: segue as permissões administrativas existentes.
- Após envio ou homologação, anexos não podem ser alterados.

Quando `exigeEvidencia` estiver ativo, salvar rascunho sem arquivo é permitido, mas o envio para homologação exige ao menos um arquivo. A referência/link é complementar.

## Implantação corporativa

1. Fazer backup do banco corporativo.
2. Confirmar que `DB_NAME()` retorna `Estrategia`.
3. Executar `database/sqlserver/migrations/20260831_002_evidencias_lancamentos.sql`.
4. Publicar os arquivos da aplicação.
5. Configurar permissões de escrita no `UPLOAD_PATH` e revisar limite/extensões.
6. Testar upload, download, escopo e homologação.
