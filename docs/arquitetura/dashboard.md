# Dashboard executivo

As consultas estão centralizadas em `DashboardRepository`; cálculos e tratamentos defensivos ficam em `ResumoExecutivoService`. A view não executa SQL nem recalcula métricas.

Definições provisórias:

- ativos/inativos: campo `indicadores.ativo`;
- rascunhos/submetidos: status atual de `lancamentos`;
- homologações pendentes: lançamentos enviados para homologação;
- aprovadas/rejeitadas: eventos `homologacao_lancamento` e `devolucao_lancamento`;
- situação: último lançamento por indicador no recorte;
- média de atingimento: média aritmética dos valores numéricos disponíveis, com duas casas e `null` quando não há denominador.

Filtros de ano, mês, plano, pilar, diretoria, unidade e status são aplicados pelo mesmo service a cards, gráficos e atualizações. O escopo de autenticação é incorporado antes da consulta.

Endpoints: `GET /api/dashboard/resumo` e `GET /api/dashboard/graficos`.

Chart.js ainda não foi incorporado porque não existe uma cópia local homologada. A view entrega barras e tabelas HTML/CSS acessíveis e sem CDN. Após seleção da versão, os mesmos dados do endpoint de gráficos poderão alimentar barras, linhas e rosca sem alterar cálculos.

Nenhum índice foi proposto sem plano de execução do SQL Server real. Candidatos para análise futura: `lancamentos(ano,mes,status,indicador_id)`, escopos de unidade/diretoria e `homologacoes(lancamento_id,acao,data_acao)`.
