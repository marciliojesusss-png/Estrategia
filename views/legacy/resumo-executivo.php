<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Resumo Executivo</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=RESUMO-GRAFICO-SCROLL-001">
  <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
  <script src="assets/js/currency.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/situations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/bootstrap-data.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/dataStore.js?v=SOLICITACOES-REABERTURA-001" defer></script>
  <script src="assets/js/databaseService.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/auth.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/calculations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/formulas.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/quarterly.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="assets/js/dashboard.js?v=SOLICITACOES-REABERTURA-001" defer></script>
  <script src="assets/js/executiveSummary.js?v=RESUMO-GRAFICO-SCROLL-001" defer></script>
  <script src="assets/js/app.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
</head>
<body data-page="resumoExecutivo">
  <div class="app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>
    <main class="content executive-content">
      <section class="page-heading executive-heading">
        <div>
          <p class="eyebrow">Visão gerencial</p>
          <h1>Resumo Executivo</h1>
          <p>Leitura consolidada do desempenho oficial dos indicadores estratégicos.</p>
        </div>
        <a class="secondary-action executive-detail-link" href="/indicadores">Ver catálogo de indicadores</a>
      </section>

      <section class="filters executive-filters" aria-label="Filtros do resumo executivo">
        <label>Período <select data-executive-filter="periodo"></select></label>
        <label>Plano <select data-executive-filter="plano"></select></label>
        <label>Pilar <select data-executive-filter="pilar"></select></label>
        <label>Unidade apuradora <select data-executive-filter="unidade"></select></label>
        <label>Diretoria responsável <select data-executive-filter="diretoria"></select></label>
        <label>Status <select data-executive-filter="status"></select></label>
        <label>Situação <select data-executive-filter="situacao"></select></label>
        <label>Competência <select data-executive-filter="competencia"></select></label>
      </section>

      <section id="executiveCards" class="executive-summary-grid" aria-label="Indicadores gerais"></section>

      <section class="painel-pilares" aria-label="Análise por pilar">
        <div class="panel executive-gauges-panel painel-pilares__gauges" aria-labelledby="pillarGaugesTitle">
        <div class="section-heading executive-section-heading">
          <div>
            <p class="eyebrow">Desempenho por Pilar</p>
            <h2 id="pillarGaugesTitle">Percentual de indicadores atingidos</h2>
          </div>
        </div>
          <div id="executivePillarGauges" class="gauges-pilares-grid" aria-label="Percentual de indicadores atingidos por pilar"></div>
        </div>

        <div class="panel executive-chart-panel painel-pilares__grafico" aria-labelledby="pillarChartTitle">
        <div class="section-heading executive-section-heading">
          <div>
            <p class="eyebrow">Distribuição das situações</p>
            <h2 id="pillarChartTitle">Indicadores por Pilar</h2>
          </div>
        </div>
        <div id="executiveChartEmpty" class="empty-state" hidden>Não há indicadores para os filtros selecionados.</div>
          <canvas id="executivePillarChart" height="250"></canvas>
        </div>
      </section>

      <section id="executiveHighlights" class="panel executive-highlights-panel" aria-labelledby="executiveHighlightsTitle">
        <div class="section-heading executive-section-heading">
          <div>
            <p class="eyebrow">Leitura rápida</p>
            <h2 id="executiveHighlightsTitle">Destaques dos Indicadores</h2>
          </div>
          <div class="executive-highlights-actions">
            <button id="toggleExecutiveHighlights" class="secondary-action table-action" type="button">Pausar</button>
            <button id="viewAllExecutiveIndicators" class="secondary-action table-action" type="button">Ver todos</button>
          </div>
        </div>
        <div id="executiveHighlightsEmpty" class="empty-state" hidden>Nenhum indicador encontrado para os filtros selecionados.</div>
        <div id="executiveHighlightsScroller" class="executive-highlights-scroller" aria-label="Destaques dos indicadores">
          <div id="executiveHighlightsTrack" class="executive-highlights-track"></div>
        </div>
      </section>

      <section class="panel executive-table-panel" aria-labelledby="executiveTableTitle">
        <div class="section-heading executive-section-heading">
          <div>
            <p class="eyebrow">Posição consolidada</p>
            <h2 id="executiveTableTitle">Tabela executiva</h2>
          </div>
          <strong id="executiveResultCount" class="result-count"></strong>
        </div>
        <div id="executiveChartFilterBanner" class="executive-chart-filter-banner" hidden>
          <span id="executiveChartFilterText"></span>
          <span class="executive-active-filter-actions">
            <button id="clearExecutiveSummaryCardFilter" class="secondary-action table-action" type="button" hidden>Limpar filtro</button>
            <button id="clearExecutiveHighlightFilter" class="secondary-action table-action" type="button" hidden>Limpar filtro</button>
            <button id="clearExecutiveChartFilter" class="secondary-action table-action" type="button" hidden>Limpar filtro do gráfico</button>
          </span>
        </div>
        <div class="table-wrap executive-table-wrap">
          <table class="tabela-executiva">
            <thead>
              <tr>
                <th>Plano</th>
                <th>Pilar</th>
                <th>Indicador</th>
                <th>Última competência</th>
                <th>Meta</th>
                <th>Resultado oficial</th>
                <th>Situação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="executiveTable"></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</body>
</html>





