<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Relatório Consolidado</title>
  <link rel="stylesheet" href="/assets/css/styles.css?v=APP-VERSION-001">
  <script src="<?= APP_BASE_PATH ?>/assets/js/currency.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/ieo-recorrente.js?v=METAS-OFICIAIS-002" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/lucro-recorrente.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/situations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/bootstrap-data.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/indicator-periodicity.js?v=PERIODICIDADE-TRIMESTRAL-001" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/dataStore.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/databaseService.js?v=GOVERNANCA-CA-002" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/dataService.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/auth.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/calculations.js?v=PLATAFORMA-JOGOS-001" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/reports.js?v=RELATORIO-DETALHADO-001" defer></script>
  <script src="<?= APP_BASE_PATH ?>/assets/js/app.js?v=APP-VERSION-001" defer></script>
</head>
<body data-page="relatorios">
  <div class="app-shell report-app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>
    <main class="content report-page-content">
      <section class="page-heading report-screen-heading no-print">
        <p class="eyebrow">Consulta oficial e impressão</p>
        <h1>Relatórios</h1>
        <p>Posições homologadas vigentes dos indicadores estratégicos.</p>
      </section>

      <article id="officialConsolidatedReport" class="official-report" aria-labelledby="officialReportTitle">
        <header class="official-report-header">
          <div><p class="official-report-system">Sistema Estratégia</p><h2 id="officialReportTitle">Relatório Consolidado de Indicadores — Posição Oficial</h2></div>
          <button id="printOfficialReport" class="primary-action no-print" type="button">Imprimir</button>
        </header>
        <section class="official-report-context" aria-label="Identificação do relatório">
          <div><span>Exercício</span><strong id="reportContextYear">—</strong></div><div><span>Posição</span><strong id="reportContextPosition">—</strong></div>
          <div><span>Referência</span><strong id="reportContextReference">—</strong></div><div><span>Escopo</span><strong id="reportContextScope">—</strong></div>
          <div><span>Gerado em</span><strong id="reportContextGeneratedAt">—</strong></div><div><span>Gerado por</span><strong id="reportContextGeneratedBy">—</strong></div>
        </section>
        <section class="filters official-report-filters no-print" aria-label="Filtros do relatório consolidado">
          <label>Exercício<select id="officialFilterYear"></select></label>
          <label>Posição<select id="officialFilterPosition"><option value="ultima">Última posição oficial</option><option value="competencia">Competência</option><option value="trimestre">Trimestre</option></select></label>
          <label id="officialCompetenceFilterLabel" hidden>Competência<select id="officialFilterCompetence"></select></label>
          <label id="officialQuarterFilterLabel" hidden>Trimestre<select id="officialFilterQuarter"><option value="1">1TRI</option><option value="2">2TRI</option><option value="3">3TRI</option><option value="4">4TRI</option></select></label>
          <label>Plano<select id="officialFilterPlan"></select></label><label>Indicador<select id="officialFilterIndicator"></select></label>
          <label>Diretoria<select id="officialFilterBoard"></select></label><label>Unidade<select id="officialFilterUnit"></select></label><label>Situação<select id="officialFilterSituation"></select></label>
        </section>
        <p id="officialReportFilterSummary" class="official-report-filter-summary"></p>
        <div id="officialReportNotice" class="notice warning no-print" hidden></div>
        <div class="panel-actions official-report-count-row"><strong id="officialReportCount">0 indicador(es)</strong></div>
        <div class="table-wrap official-report-table-wrap">
          <table class="official-report-table">
            <thead><tr><th data-official-sort="codigo">Código</th><th data-official-sort="indicador">Indicador</th><th data-official-sort="plano">Plano</th><th data-official-sort="diretoria">Diretoria</th><th data-official-sort="unidade">Unidade</th><th data-official-sort="competencia">Competência oficial</th><th>Meta oficial</th><th>Resultado oficial</th><th>Atingimento</th><th data-official-sort="situacao">Situação</th><th data-official-sort="governanca">Governança</th><th>Versão</th><th>Homologado em</th><th>Fonte documental</th></tr></thead>
            <tbody id="officialReportTable"></tbody>
          </table>
        </div>
        <footer class="official-report-footer"><span>Sistema Estratégia — CAIXA Loterias</span><span id="officialReportFooterGeneration">—</span></footer>
      </article>

      <article id="detailedIndicatorReport" class="official-report detailed-indicator-report" aria-labelledby="detailedReportTitle" hidden>
        <header class="official-report-header">
          <div><p class="official-report-system">Sistema Estratégia</p><h2 id="detailedReportTitle">Relatório Detalhado do Indicador</h2></div>
          <div class="row-actions no-print"><a id="backToConsolidatedReport" class="secondary-action" href="<?= APP_BASE_PATH ?>/relatorios">Voltar ao Consolidado</a><button id="printDetailedReport" class="primary-action" type="button">Imprimir relatório detalhado</button></div>
        </header>
        <section class="official-report-context" aria-label="Identificação da geração do relatório detalhado">
          <div><span>Exercício</span><strong id="detailedContextYear">—</strong></div><div><span>Escopo</span><strong id="detailedContextScope">—</strong></div>
          <div><span>Gerado em</span><strong id="detailedContextGeneratedAt">—</strong></div><div><span>Gerado por</span><strong id="detailedContextGeneratedBy">—</strong></div>
        </section>
        <div id="detailedReportNotice" class="notice warning no-print" hidden></div>

        <section class="detailed-report-section" aria-labelledby="detailedIdentificationTitle">
          <h3 id="detailedIdentificationTitle">Identificação</h3><div id="detailedIndicatorIdentification" class="detail-grid detailed-identification-grid"></div>
        </section>
        <section class="detailed-report-section" aria-labelledby="detailedTrajectoryTitle">
          <h3 id="detailedTrajectoryTitle">Evolução JAN–DEZ</h3><p class="help-text">Somente posições homologadas vigentes são apresentadas como oficiais.</p>
          <div class="table-wrap"><table class="detailed-report-table"><thead><tr><th>Competência</th><th>Meta</th><th>Resultado</th><th>Atingimento</th><th>Situação</th><th>Governança</th><th>Versão</th></tr></thead><tbody id="detailedTrajectoryTable"></tbody></table></div>
        </section>
        <section class="detailed-report-section" aria-labelledby="detailedQuarterTitle">
          <h3 id="detailedQuarterTitle">Fechamentos trimestrais</h3>
          <div class="table-wrap"><table class="detailed-report-table"><thead><tr><th>Trimestre</th><th>Competência</th><th>Meta</th><th>Resultado</th><th>Atingimento</th><th>Situação</th><th>Governança</th><th>Versão</th><th>Fonte documental</th></tr></thead><tbody id="detailedQuarterTable"></tbody></table></div>
        </section>
        <section class="detailed-report-section" aria-labelledby="detailedObservationsTitle">
          <h3 id="detailedObservationsTitle">Observação oficial da área</h3><div id="detailedObservations" class="detailed-document-grid"></div>
        </section>
        <section class="detailed-report-section" aria-labelledby="detailedEvidenceTitle">
          <h3 id="detailedEvidenceTitle">Evidências</h3><h4>Evidência da versão atual</h4>
          <div class="table-wrap"><table class="detailed-report-table"><thead><tr><th>Competência</th><th>Versão</th><th>Arquivo</th><th>Data do upload</th><th>Usuário</th><th class="no-print">Ação</th></tr></thead><tbody id="detailedCurrentEvidenceTable"></tbody></table></div>
          <details id="detailedHistoricalEvidence" class="detailed-collapsible no-print-closed"><summary>Evidências de versões anteriores</summary><div class="table-wrap"><table class="detailed-report-table"><thead><tr><th>Competência</th><th>Versão</th><th>Arquivo</th><th>Data do upload</th><th>Usuário</th><th class="no-print">Ação</th></tr></thead><tbody id="detailedHistoricalEvidenceTable"></tbody></table></div></details>
        </section>
        <section class="detailed-report-section" aria-labelledby="detailedVersionTitle">
          <h3 id="detailedVersionTitle">Histórico de versões</h3><details id="detailedVersionHistory" class="detailed-collapsible no-print-closed"><summary>Ver histórico de versões</summary><div class="table-wrap"><table class="detailed-report-table"><thead><tr><th>Competência</th><th>Versão</th><th>Status</th><th>Meta</th><th>Resultado</th><th>Atingimento</th><th>Situação</th><th>Retificado em</th><th>Retificado por</th></tr></thead><tbody id="detailedVersionHistoryTable"></tbody></table></div></details>
        </section>
        <section class="detailed-report-section" aria-labelledby="detailedGovernanceTitle">
          <h3 id="detailedGovernanceTitle">Governança resumida</h3><div class="table-wrap"><table class="detailed-report-table"><thead><tr><th>Competência</th><th>Versão</th><th>Governança</th><th>Submetido em</th><th>Submetido por</th><th>Homologado em</th><th>Homologado por</th></tr></thead><tbody id="detailedGovernanceTable"></tbody></table></div>
        </section>
        <footer class="official-report-footer"><span>Sistema Estratégia — CAIXA Loterias</span><span id="detailedReportFooterGeneration">—</span></footer>
      </article>

      <section id="operationalReportsSection" class="operational-report-section no-print" hidden>
        <header class="page-heading"><p class="eyebrow">Área administrativa</p><h2>Consulta/Exportação Operacional</h2><p>Funcionalidade administrativa legada preservada, separada do relatório oficial.</p></header>
        <section id="databaseServerPanel" class="panel database-local-panel" aria-labelledby="database-server-title">
          <div class="panel-title-row"><div><p class="eyebrow">Fonte central</p><h2 id="database-server-title">SQL Server</h2></div></div><p class="help-text">Dados operacionais carregados exclusivamente do SQL Server.</p>
          <div id="databaseServerInfo" class="detail-grid"></div><div class="validation-base-actions"><button id="checkSqlServerIntegrityButton" class="secondary-action" type="button">Verificar integridade do banco</button><button id="reloadSqlServerDataButton" class="secondary-action" type="button">Recarregar dados do banco</button></div><div id="databaseServerStatus" class="notice info" hidden></div>
        </section>
        <section class="filters" aria-label="Filtros da consulta operacional"><label>Relatório<select id="reportType"></select></label><label>Ano<select data-filter="ano"></select></label><label>Mês<select data-filter="mes"></select></label><label>Plano<select data-filter="plano"></select></label><label>Pilar<select data-filter="pilar"></select></label><label>Unidade<select data-filter="unidade"></select></label><label>Diretoria<select data-filter="diretoria"></select></label><label>Status<select data-filter="status"></select></label><label>Indicador<select data-filter="indicador"></select></label></section>
        <section class="panel"><div class="panel-actions"><span id="reportCount" class="result-count"></span></div><div class="table-wrap"><table><thead id="relatoriosHead"></thead><tbody id="relatoriosTable"></tbody></table></div></section>
      </section>
    </main>
  </div>
</body>
</html>
