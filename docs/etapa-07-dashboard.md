# Etapa 7 — Dashboard

## Checklist de execução

- [ ] Validar com a área de negócio a definição de cada card, percentual e status. **Definições provisórias documentadas; falta homologação formal.**
- [ ] Confirmar no SQL Server real os campos e fontes para plano, pilar, diretoria, unidade, período e metas.
- [x] Implementar consultas consolidadas no repository, sem SQL na view ou JavaScript.
- [x] Implementar service para cálculos, denominadores nulos, arredondamento e regras temporais.
- [x] Criar cards de indicadores e lançamentos conforme dados disponíveis.
- [x] Criar resumos de homologações pendentes, aprovadas e rejeitadas.
- [x] Implementar filtros por ano, mês, plano, pilar, diretoria, unidade e status quando suportados pelo esquema.
- [x] Aplicar filtros de modo consistente a cards, gráficos e atualizações recentes.
- [x] Restringir dados pelo perfil e escopo da unidade do usuário.
- [ ] Criar gráficos de barras, linhas e rosca com Chart.js local e acessível. **Visualizações HTML/CSS acessíveis entregues; falta incorporar uma versão local homologada do Chart.js.**
- [x] Exibir estados vazio, indisponibilidade e erro sem vazar detalhes; o HTML é renderizado no servidor e não possui espera assíncrona inicial.
- [x] Implementar endpoint de resumo e endpoint de gráficos com respostas padronizadas.
- [ ] Avaliar índices com planos de execução e justificar qualquer script SQL proposto. **Candidatos documentados; falta plano de execução no SQL Server real.**
- [x] Criar testes dos cálculos, filtros combinados, escopo, períodos sem dados e linha de base local de desempenho.

## Critérios de aceite

- [ ] Métricas foram homologadas pela área de negócio com amostras reconciliadas no banco.
- [x] Cards e gráficos respeitam os mesmos filtros e o mesmo escopo de acesso.
- [x] O dashboard lida corretamente com ausência de dados e divisão por zero.
- [ ] O tempo de resposta atende ao limite definido para o volume real. **Teste local aprovado; falta carga representativa no SQL Server.**

## Acompanhamento

- Decisões: calcular métricas exclusivamente no backend; usar o último lançamento por indicador para situação; retornar `null` para médias sem denominador; não propor índices sem plano de execução; não simular uma biblioteca Chart.js ausente.
- Evidências: `DashboardRepository.php`, `ResumoExecutivoService.php`, controllers e view do dashboard, endpoints `/api/dashboard/*`, `tests/dashboard-module.test.php` e `docs/arquitetura/dashboard.md`.
- Pendências: homologação das métricas e fontes; Chart.js local aprovado; planos de execução e teste de carga com `pdo_sqlsrv`; reconciliação das amostras no banco corporativo.
