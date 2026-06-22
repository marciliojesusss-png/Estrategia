# Fase 1 - Estrutura inicial e dados base

## Objetivo

Criar a fundação estática do sistema web corporativo para acompanhamento dos indicadores estratégicos da CAIXA Loterias, usando apenas HTML5, CSS3, JavaScript puro, JSON, `localStorage` e Chart.js.

## Descrição técnica

A fase inicial monta a estrutura de pastas, telas principais e módulos JavaScript necessários para o desenvolvimento progressivo. Os dados simulados iniciais foram gerados a partir da aba `PEI_PN` da planilha `planilha destino_preenchida.xlsx`, contemplando os 23 indicadores, metas mensais e lançamentos de janeiro a março de 2026.

Nesta fase as telas já são navegáveis e carregam dados, mas os fluxos completos de edição, envio, homologação, devolução e reabertura serão implementados nas fases seguintes.

## Arquivos envolvidos

- `index.html`
- `dashboard.html`
- `indicadores.html`
- `lancamentos.html`
- `homologacao.html`
- `relatorios.html`
- `administracao.html`
- `assets/css/styles.css`
- `assets/js/app.js`
- `assets/js/auth.js`
- `assets/js/dataStore.js`
- `assets/js/calculations.js`
- `assets/js/dashboard.js`
- `assets/js/indicators.js`
- `assets/js/launches.js`
- `assets/js/approvals.js`
- `assets/js/reports.js`
- `assets/js/admin.js`
- `data/usuarios.json`
- `data/planos.json`
- `data/pilares.json`
- `data/unidades.json`
- `data/diretorias.json`
- `data/indicadores.json`
- `data/metas-mensais.json`
- `data/lancamentos.json`
- `data/homologacoes.json`
- `data/historico.json`
- `docs/00-plano-de-fases.md`
- `docs/01-fase-estrutura-inicial.md`

## Regras de negócio

- O sistema deve manter a lógica `Indicador → Unidade Apuradora → Preenchimento`.
- O sistema deve manter a lógica `Indicador → Diretoria Responsável → Homologação`.
- O login deve ser simulado com perfis definidos em JSON.
- Administrador visualiza todos os indicadores.
- Unidade Apuradora visualiza indicadores vinculados à sua unidade.
- Diretoria Homologadora visualiza indicadores vinculados à sua diretoria.
- Consulta/Gestão visualiza informações sem edição.
- Indicadores homologados devem ser tratados como bloqueados nas fases de edição.
- Fórmulas e métricas devem ser exibidas como referência não editável nas fases de preenchimento.
- Tipos de cálculo devem ser centralizados no motor de cálculo.

## Checklist de ações

- [x] Criar estrutura inicial de pastas.
- [x] Criar arquivos HTML principais.
- [x] Criar arquivo CSS principal.
- [x] Criar arquivos JavaScript principais.
- [x] Criar motor de cálculos inicial.
- [x] Criar camada de acesso aos dados JSON.
- [x] Criar autenticação simulada inicial.
- [x] Criar arquivos JSON iniciais.
- [x] Importar os 23 indicadores da aba `PEI_PN`.
- [x] Criar documentação do plano de fases.
- [x] Criar documentação da fase inicial.

## Critérios de aceite

- [x] Projeto possui estrutura organizada de pastas.
- [x] Páginas principais existem e carregam os scripts necessários.
- [x] CSS principal aplica layout corporativo responsivo.
- [x] JSON de indicadores contém 23 registros.
- [x] JSON de metas mensais contém dados iniciais de janeiro a março.
- [x] JSON de lançamentos contém dados iniciais de janeiro a março.
- [x] Login simulado carrega usuários de `usuarios.json`.
- [x] Dashboard inicial apresenta cards e gráficos básicos.
- [x] Consulta de indicadores lista dados da planilha.
- [x] Documentação da fase contém objetivo, descrição técnica, arquivos, regras, checklist, critérios e observações.

## Observações técnicas

- Os tipos de cálculo foram inferidos inicialmente a partir da meta anual, métrica e natureza do indicador. Eles devem ser revisados com a área de negócio nas próximas fases.
- Indicadores sem unidade apuradora ou diretoria responsável na planilha foram preservados com campo vazio para não inventar vínculo institucional.
- A leitura dos JSON usa `fetch`; portanto, recomenda-se executar o projeto por um servidor estático local durante os testes.
- A fase 1 não fecha o fluxo operacional completo. Ela prepara a base para validação e avanço controlado.
