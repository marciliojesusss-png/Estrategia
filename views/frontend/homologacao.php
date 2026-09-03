<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Homologação</title>
  <link rel="stylesheet" href="/assets/css/styles.css?v=ACTION-FEEDBACK-001">
  <script src="/assets/js/currency.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/ieo-recorrente.js?v=IEO-RECORRENTE-002" defer></script>
  <script src="/assets/js/situations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/bootstrap-data.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/indicator-periodicity.js?v=PERIODICIDADE-TRIMESTRAL-001" defer></script>
  <script src="/assets/js/dataStore.js?v=CAPACITACAO-POSICAO-001" defer></script>
  <script src="/assets/js/central-persistence.js?v=ACTION-FEEDBACK-001" defer></script>
  <script src="/assets/js/databaseService.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/auth.js?v=RELATORIOS-ADMIN-001" defer></script>
  <script src="/assets/js/calculations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/formulas.js?v=CAPACITACAO-POSICAO-001" defer></script>
  <script src="/assets/js/documentation-fields.js?v=DOCUMENTACAO-CENTRAL-001" defer></script>
  <script src="/assets/js/action-feedback.js?v=ACTION-FEEDBACK-001" defer></script>
  <script src="/assets/js/approvals.js?v=DOCUMENTACAO-CENTRAL-001" defer></script>
  <script src="/assets/js/app.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
</head>
<body data-page="homologacao">
  <div class="app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>
    <main class="content">
      <section class="page-heading">
        <p class="eyebrow">Validação da diretoria</p>
        <h1>Homologação</h1>
        <p>Validação dos lançamentos, histórico de ações e rastreabilidade.</p>
      </section>

      <section class="filters" aria-label="Filtros da homologação">
        <label>Mês <select data-filter="mes"></select></label>
        <label>Status <select data-filter="status"></select></label>
        <label>Indicador <select data-filter="indicador"></select></label>
      </section>

      <section class="panel">
        <div id="approvalMessage" class="notice" hidden></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Unidade apuradora</th>
                <th>Diretoria responsável</th>
                <th>Mês</th>
                <th>Realizado</th>
                <th>% atingido</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="homologacaoTable"></tbody>
          </table>
        </div>
      </section>

      <section id="approvalPanel" class="panel detail-panel" hidden>
        <div class="detail-header">
          <div>
            <p class="eyebrow">Análise da diretoria</p>
            <h2 id="approvalTitle">Selecione um lançamento</h2>
          </div>
          <span id="approvalStatusBadge" class="badge info"></span>
        </div>

        <div id="approvalReference" class="detail-grid"></div>

        <form id="approvalForm" class="editor-form">
          <input type="hidden" id="approvalLaunchId">

          <label class="full-span">Observação da área
            <textarea id="approvalObservacaoArea" rows="3" readonly></textarea>
          </label>

          <aside id="legacyApprovalJustification" class="legacy-information full-span" hidden>
            <strong>Justificativa legada da unidade (somente leitura)</strong>
            <p id="legacyApprovalJustificationText"></p>
          </aside>

          <section class="evidence-section full-span" aria-labelledby="approvalEvidenceTitle">
            <div class="evidence-section-heading">
              <div>
                <p class="eyebrow">Documentação da unidade apuradora</p>
                <h3 id="approvalEvidenceTitle">Evidências da Unidade Apuradora</h3>
              </div>
              <span class="evidence-requirement">Somente leitura</span>
            </div>
            <div class="evidence-reference-readonly">
              <strong>Referência / Link</strong>
              <p id="approvalEvidenceReference">Não informada.</p>
            </div>
            <div>
              <h4>Anexos</h4>
              <div id="approvalEvidenceList" class="evidence-list" aria-live="polite"></div>
            </div>
          </section>

          <label class="full-span">Observação da diretoria
            <textarea id="approvalObservacaoDiretoria" rows="4"></textarea>
          </label>

          <div class="form-actions action-feedback-bar full-span">
            <div id="approvalActionFeedback" class="action-feedback" role="status" aria-live="polite" hidden></div>
            <button id="approveButton" class="primary-action" type="button">Homologar</button>
            <button id="returnButton" class="secondary-action" type="button">Devolver para ajuste</button>
            <button id="reopenButton" class="secondary-action" type="button">Reabrir para edição</button>
            <button id="closeApprovalButton" class="secondary-action" type="button">Voltar</button>
          </div>
        </form>
      </section>
    </main>
  </div>
</body>
</html>
