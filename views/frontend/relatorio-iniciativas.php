<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Relatório de Iniciativas</title>
  <link rel="stylesheet" href="/assets/css/styles.css">
  <script src="/assets/js/dataStore.js" defer></script>
  <script src="/assets/js/databaseService.js" defer></script>
  <script src="/assets/js/auth.js" defer></script>
  <script src="/assets/js/action-feedback.js" defer></script>
  <script src="/assets/js/initiativeReport.js" defer></script>
  <script src="/assets/js/app.js" defer></script>
</head>
<body data-page="relatorios">
  <div class="app-shell report-app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>
    <main class="content report-page-content">
      <section class="page-heading report-screen-heading no-print">
        <p class="eyebrow">Consulta oficial e exportação</p>
        <h1>Relatório de Iniciativas</h1>
        <p>Acompanhamentos trimestrais, situação, andamento e governança da homologação.</p>
      </section>

      <nav class="report-module-navigation no-print" aria-label="Navegação do módulo Relatórios">
        <a href="/relatorios">Indicadores</a>
        <a class="active" href="/relatorios/iniciativas">Iniciativas</a>
      </nav>

      <article class="official-report initiative-official-report" aria-labelledby="initiativeReportTitle">
        <header class="official-report-header">
          <div>
            <p class="official-report-system">#INTERNO.CAIXA</p>
            <p class="official-report-system">Sistema Estratégia</p>
            <h2 id="initiativeReportTitle">Relatório de Iniciativas Estratégicas</h2>
          </div>
          <div class="row-actions no-print">
            <button id="exportInitiativeReport" class="secondary-action" type="button">Exportar CSV/Excel</button>
            <button id="printInitiativeReport" class="primary-action" type="button">Imprimir/PDF</button>
          </div>
        </header>

        <section class="official-report-context" aria-label="Identificação do relatório">
          <div><span>Exercício</span><strong id="initiativeContextYear">—</strong></div>
          <div><span>Escopo</span><strong id="initiativeContextScope">—</strong></div>
          <div><span>Gerado em</span><strong id="initiativeContextGeneratedAt">—</strong></div>
          <div><span>Gerado por</span><strong id="initiativeContextGeneratedBy">—</strong></div>
        </section>

        <form id="initiativeReportFilters" class="filters initiative-report-filters no-print">
          <label>Ano<select id="initiativeReportYear"><option value="2026" selected>2026</option></select></label>
          <label>Trimestre<select id="initiativeReportQuarter"><option value="">Todos</option><option>1TRI</option><option>2TRI</option><option>3TRI</option><option>4TRI</option></select></label>
          <label>Pilar<select id="initiativeReportPillar"><option value="">Todos</option></select></label>
          <label>Unidade<select id="initiativeReportUnit"><option value="">Todas</option></select></label>
          <label>Diretoria<select id="initiativeReportBoard"><option value="">Todas</option></select></label>
          <label>Status da iniciativa<select id="initiativeReportInitiativeStatus"><option value="">Todos</option><option value="NAO_INICIADA">Não iniciada</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDA">Concluída</option><option value="SUSPENSA">Suspensa</option><option value="CANCELADA">Cancelada</option></select></label>
          <label>Status do acompanhamento<select id="initiativeReportWorkflowStatus"><option value="">Todos</option><option value="NAO_INICIADO">Não iniciado</option><option value="EM_PREENCHIMENTO">Em preenchimento</option><option value="ENVIADO_HOMOLOGACAO">Enviado para homologação</option><option value="DEVOLVIDO_AJUSTE">Devolvido para ajuste</option><option value="HOMOLOGADO" selected>Homologado</option><option value="REABERTO">Reaberto</option></select></label>
          <div class="initiative-report-filter-actions">
            <button class="primary-action" type="submit">Consultar</button>
            <button id="clearInitiativeReportFilters" class="secondary-action" type="button">Limpar</button>
          </div>
        </form>

        <div id="initiativeReportMessage" class="notice info no-print" hidden></div>
        <p id="initiativeReportFilterSummary" class="official-report-filter-summary"></p>

        <section class="initiative-report-summary" aria-label="Resumo do relatório">
          <div><span>Acompanhamentos</span><strong id="initiativeReportTrackingCount">0</strong></div>
          <div><span>Iniciativas</span><strong id="initiativeReportMasterCount">0</strong></div>
          <div><span>Homologados</span><strong id="initiativeReportApprovedCount">0</strong></div>
          <div><span>Demais situações</span><strong id="initiativeReportPendingCount">0</strong></div>
        </section>

        <section
          id="initiativeReportList"
          class="initiative-report-list"
          aria-label="Iniciativas e acompanhamentos"
          aria-live="polite"
        >
          <p class="initiative-report-empty">Carregando relatório...</p>
        </section>

        <footer class="official-report-footer">
          <span>Sistema Estratégia — CAIXA Loterias</span>
          <span id="initiativeReportFooterGeneration">—</span>
        </footer>
      </article>
    </main>
  </div>
</body>
</html>
