# Fase 6 - Dashboard com gráficos

## Objetivo

Criar a visão executiva dos indicadores estratégicos, com cards de resumo, filtros e gráficos em Chart.js para acompanhamento por plano, pilar, status, evolução mensal e rankings de desempenho.

## Descrição técnica

A fase 6 expande a tela `Dashboard` para consolidar informações dos indicadores e lançamentos dentro do escopo do usuário logado. Os filtros por ano, mês, plano, pilar, unidade, diretoria e status recalculam dinamicamente os cards, gráficos e rankings.

Os gráficos usam Chart.js carregado por CDN, mantendo a premissa de desenvolvimento em HTML, CSS e JavaScript puro. Quando o usuário altera qualquer filtro, os gráficos existentes são destruídos e recriados com os novos dados agregados.

## Arquivos envolvidos

- `dashboard.html`
- `assets/js/dashboard.js`
- `assets/js/calculations.js`
- `assets/css/styles.css`
- `docs/00-plano-de-fases.md`
- `docs/06-fase-dashboard-graficos.md`

## Regras de negócio

- Dashboard respeita o escopo do perfil logado.
- Administrador visualiza todos os indicadores e lançamentos.
- Unidade Apuradora visualiza apenas sua unidade.
- Diretoria Homologadora visualiza apenas sua diretoria.
- Consulta/Gestão visualiza a visão geral sem edição.
- Cards e gráficos devem responder aos filtros selecionados.
- Percentual médio deve considerar apenas lançamentos com percentual calculável.
- Indicadores sem cálculo devem ser tratados como `Sem cálculo`.
- Rankings devem considerar o percentual médio dos lançamentos filtrados por indicador.

## Checklist de ações

- [x] Manter filtros por ano, mês, plano, pilar, unidade, diretoria e status.
- [x] Recalcular cards a partir dos filtros.
- [x] Exibir total de indicadores.
- [x] Exibir quantidade de indicadores PEI.
- [x] Exibir quantidade de indicadores PN.
- [x] Exibir lançamentos homologados.
- [x] Exibir lançamentos pendentes.
- [x] Exibir lançamentos devolvidos.
- [x] Exibir lançamentos não iniciados.
- [x] Exibir percentual médio de atingimento.
- [x] Criar gráfico de indicadores por plano.
- [x] Criar gráfico de indicadores por pilar.
- [x] Criar gráfico de desempenho médio por pilar.
- [x] Criar gráfico de evolução mensal do percentual atingido.
- [x] Criar gráfico de status dos lançamentos.
- [x] Criar gráfico de situação de desempenho.
- [x] Criar ranking dos indicadores com maior atingimento.
- [x] Criar ranking dos indicadores com menor atingimento.

## Critérios de aceite

- [x] Dashboard carrega sem erro.
- [x] Filtros alteram cards, gráficos e rankings.
- [x] Gráfico por plano exibe PEI e PN quando houver dados filtrados.
- [x] Gráfico por pilar exibe distribuição dos indicadores.
- [x] Desempenho médio por pilar usa percentuais dos lançamentos filtrados.
- [x] Evolução mensal respeita a ordem dos meses.
- [x] Status dos lançamentos mostra a distribuição de status.
- [x] Ranking de maior atingimento exibe até cinco indicadores.
- [x] Ranking de menor atingimento exibe até cinco indicadores.
- [x] Dashboard continua sem backend ou framework.

## Observações técnicas

- Os gráficos dependem do carregamento do Chart.js via CDN.
- A renderização foi preparada para destruir instâncias anteriores antes de recriar gráficos, evitando sobreposição ao mudar filtros.
- A tela usa o motor de cálculo existente apenas para formatação de percentuais e classificação de desempenho.
- A fase 6 não altera regras de lançamento ou homologação; apenas consolida e visualiza dados já existentes.
