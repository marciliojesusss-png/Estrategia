# Fase 7 - Relatórios e exportação CSV

## Objetivo

Implementar relatórios filtráveis e exportação em CSV para consulta gerencial dos indicadores, lançamentos, pendências, homologações, devoluções e acumulado anual.

## Descrição técnica

A fase 7 transforma a tela `Relatórios` em um gerador dinâmico de relatórios. O usuário escolhe o tipo de relatório e aplica filtros por ano, mês, plano, pilar, unidade apuradora, diretoria responsável, status e indicador.

Cada tipo de relatório monta suas próprias colunas e linhas a partir dos dados em memória, respeitando o escopo do perfil logado. A exportação CSV usa exatamente a visão filtrada exibida na tabela, com separador `;` e BOM UTF-8 para melhor compatibilidade com Excel.

## Arquivos envolvidos

- `relatorios.html`
- `assets/js/reports.js`
- `assets/js/calculations.js`
- `assets/css/styles.css`
- `docs/00-plano-de-fases.md`
- `docs/07-fase-relatorios-exportacao.md`

## Regras de negócio

- Relatórios respeitam o escopo do perfil logado.
- Administrador visualiza todos os registros.
- Consulta/Gestão visualiza relatórios sem edição.
- Unidade Apuradora e Diretoria Homologadora continuam sem acesso à tela de relatórios conforme regra da fase 2.
- Filtros devem afetar a tabela e a exportação CSV.
- Relatório geral lista os indicadores.
- Relatórios por plano, pilar, unidade e diretoria consolidam quantidades e atingimento médio.
- Relatório de pendências lista lançamentos não iniciados, em preenchimento, enviados para homologação ou reabertos.
- Relatório de homologações lista lançamentos homologados.
- Relatório de devoluções lista lançamentos devolvidos para ajuste.
- Relatório acumulado anual lista o último acumulado disponível por indicador.

## Checklist de ações

- [x] Criar seleção de tipo de relatório.
- [x] Criar filtro por ano.
- [x] Criar filtro por mês.
- [x] Criar filtro por plano.
- [x] Criar filtro por pilar.
- [x] Criar filtro por unidade apuradora.
- [x] Criar filtro por diretoria responsável.
- [x] Criar filtro por status.
- [x] Criar filtro por indicador.
- [x] Implementar relatório geral dos indicadores.
- [x] Implementar relatório por plano.
- [x] Implementar relatório por pilar.
- [x] Implementar relatório por unidade apuradora.
- [x] Implementar relatório por diretoria responsável.
- [x] Implementar relatório de pendências.
- [x] Implementar relatório de homologações.
- [x] Implementar relatório de devoluções.
- [x] Implementar relatório acumulado anual.
- [x] Exportar CSV da visão filtrada.

## Critérios de aceite

- [x] Tela de relatórios carrega sem erro.
- [x] Tipo de relatório altera colunas e dados exibidos.
- [x] Filtros recalculam a tabela.
- [x] Contador de registros reflete a visão atual.
- [x] Exportação CSV respeita os filtros aplicados.
- [x] CSV inclui cabeçalho.
- [x] CSV é gerado em UTF-8 com separador `;`.
- [x] Relatórios agregados exibem total de indicadores, lançamentos, homologados, pendentes, devolvidos e atingimento médio.
- [x] Relatórios operacionais exibem status, justificativas e observações.
- [x] Relatório acumulado anual exibe resultado e percentual acumulado.

## Observações técnicas

- A exportação CSV é feita no navegador por `Blob`, sem backend.
- Os percentuais e valores numéricos usam funções já existentes em `calculations.js` para manter consistência visual.
- A fase 7 não altera dados; ela apenas consulta, consolida e exporta.
- A administração avançada e reabertura de lançamentos permanecem previstas para a fase 8.
