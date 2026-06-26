# Correção de encoding e ortografia

## Objetivo

Eliminar caracteres quebrados e padronizar os textos institucionais do sistema em português brasileiro, preservando integralmente os dados operacionais.

## Correções realizadas

- Arquivos HTML, JavaScript, JSON, CSS e Markdown mantidos em UTF-8.
- Declaração `<meta charset="UTF-8">` aplicada a todas as páginas.
- Mojibake simples e duplo corrigido.
- Símbolos `≥` e `≤` restaurados.
- Nomes dos 23 indicadores padronizados.
- Nomes dos 6 pilares padronizados.
- Status, situações, rótulos e mensagens revisados.
- Perfil `Consulta/Gestão` corrigido nos dados e nas permissões.
- Campos de março, relatórios, evidências e referências corrigidos.

## Migração segura do navegador

A camada `DataStore` executa a migração `UTF8-PTBR-001` uma única vez.

A rotina:

- percorre os dados JSON armazenados no `localStorage`;
- corrige somente valores textuais reconhecidamente corrompidos;
- preserva IDs, valores numéricos, datas e estruturas;
- não remove lançamentos, homologações, histórico, justificativas ou evidências;
- normaliza os nomes institucionais de indicadores e pilares.

Não é utilizado `localStorage.clear()`.

## Ferramenta de manutenção

O script abaixo pode ser executado para auditar e corrigir novamente os arquivos-fonte:

```text
node scripts/corrigir-encoding.js
```

Ele é idempotente: uma segunda execução não altera arquivos já corrigidos.

## Validação

- `tests/encoding.test.js` valida nomes, pilares, símbolos, charset e migração do navegador.
- `tests/formulas.test.js` confirma que as regras de cálculo permanecem funcionais.

## Critérios de aceite

- [x] Nenhum texto de interface permanece com mojibake.
- [x] Indicadores e pilares usam os nomes institucionais corretos.
- [x] Símbolos matemáticos são exibidos corretamente.
- [x] Todas as páginas declaram UTF-8.
- [x] Dados salvos são migrados sem exclusão.
- [x] Dashboard por Plano, Pilar e Indicador permanece funcional.
- [x] Fórmulas existentes não foram alteradas.
