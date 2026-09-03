<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Lançamentos</title>
  <link rel="stylesheet" href="<?= APP_BASE_PATH ?>/assets/css/styles.css?v=ACTION-FEEDBACK-001">
  <script src="/assets/js/currency.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/ieo-recorrente.js?v=IEO-RECORRENTE-002" defer></script>
  <script src="/assets/js/situations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/bootstrap-data.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/indicator-periodicity.js?v=PERIODICIDADE-TRIMESTRAL-001" defer></script>
  <script src="/assets/js/dataStore.js?v=LUCRO-RECORRENTE-MENSAL-001" defer></script>
  <script src="/assets/js/central-persistence.js?v=ACTION-FEEDBACK-001" defer></script>
  <script src="/assets/js/databaseService.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/auth.js?v=RELATORIOS-ADMIN-001" defer></script>
  <script src="/assets/js/calculations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/formulas.js?v=LUCRO-RECORRENTE-MENSAL-001" defer></script>
  <script src="/assets/js/documentation-fields.js?v=DOCUMENTACAO-CENTRAL-001" defer></script>
  <script src="/assets/js/action-feedback.js?v=ACTION-FEEDBACK-001" defer></script>
  <script src="/assets/js/launches.js?v=LUCRO-RECORRENTE-MENSAL-001" defer></script>
  <script src="/assets/js/app.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
</head>
<body data-page="lancamentos">
  <div class="app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>
    <main class="content">
      <section class="page-heading">
        <p class="eyebrow">Preenchimento</p>
        <h1>Lançamentos</h1>
        <p>Registro dos dados pelas unidades apuradoras.</p>
      </section>

      <section class="filters" aria-label="Filtros dos lançamentos">
        <label>Mês <select data-filter="mes"></select></label>
        <label>Status <select data-filter="status"></select></label>
        <label>Indicador <select data-filter="indicador"></select></label>
      </section>

      <section class="panel">
        <div id="launchNotice" class="notice"></div>
        <div id="launchMessage" class="notice" hidden></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Mês / competência</th>
                <th>Meta</th>
                <th>Resultado da competência</th>
                <th>Situação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="lancamentosTable"></tbody>
          </table>
        </div>
      </section>

      <section id="launchEditorPanel" class="panel detail-panel" hidden>
        <div class="detail-header">
          <div>
            <p class="eyebrow">Lançamento selecionado</p>
            <h2 id="launchEditorTitle">Selecione um lançamento</h2>
          </div>
          <span id="launchStatusBadge" class="badge info"></span>
        </div>

        <div id="launchReference" class="detail-grid"></div>

        <form id="launchForm" class="editor-form">
          <input type="hidden" id="launchId">

          <label><span id="launchMetaLabel">Meta de referência mensal</span>
            <input id="launchMeta" type="text" readonly>
          </label>

          <label id="realizadoWrapper">Realizado mensal
            <input id="launchRealizado" type="number" step="any">
          </label>

          <div id="dynamicInputSection" class="full-span">
            <p class="eyebrow">Dados de entrada</p>
            <div id="dynamicInputFields" class="editor-form"></div>
          </div>

          <label id="manualPercentWrapper" hidden>Percentual manual
            <input id="launchPercentualManual" type="number" step="any" placeholder="Ex.: 0.85 para 85%">
          </label>

          <label><span id="launchResultadoMensalLabel">Resultado da competência</span>
            <input id="launchResultadoMensal" type="text" readonly>
          </label>

          <label id="percentualMensalWrapper" hidden><span id="launchPercentualCalculadoLabel">% da meta atingida</span>
            <input id="launchPercentualCalculado" type="text" readonly>
          </label>

          <label id="resultadoAnualWrapper"><span id="launchResultadoAcumuladoLabel">Resultado oficial anual</span>
            <input id="launchResultadoAcumulado" type="text" readonly>
          </label>

          <label id="percentualAnualWrapper" hidden><span id="launchPercentualAcumuladoLabel">% da meta atingida anual</span>
            <input id="launchPercentualAcumulado" type="text" readonly>
          </label>

          <label id="situacaoCalculadaWrapper"><span id="launchSituacaoCalculadaLabel">Situação</span>
            <input id="launchSituacaoCalculada" type="text" readonly>
          </label>

          <div id="formulaDetailsWrapper" class="full-span" hidden>
            <p class="eyebrow">Detalhes calculados</p>
            <div id="formulaDetails" class="detail-grid"></div>
          </div>

          <label class="full-span">Observação da área
            <textarea id="launchObservacaoArea" rows="3" placeholder="Informe contexto, explicação do resultado ou informação complementar sobre esta competência."></textarea>
          </label>

          <aside id="legacyLaunchJustification" class="legacy-information full-span" hidden>
            <strong>Justificativa legada (somente leitura)</strong>
            <p id="legacyLaunchJustificationText"></p>
          </aside>

          <section id="evidenceWrapper" class="evidence-section full-span" aria-labelledby="launchEvidenceTitle">
            <div class="evidence-section-heading">
              <div>
                <p class="eyebrow">Documentação comprobatória</p>
                <h3 id="launchEvidenceTitle">Evidências</h3>
              </div>
              <span id="evidenceRequirementText" class="evidence-requirement"></span>
            </div>

            <label>Referência / Link
              <input id="launchEvidenceReference" type="text" placeholder="Nota Técnica, processo, SharePoint ou outra referência documental">
            </label>

            <div class="evidence-upload-grid">
              <label>Arquivo
                <input id="launchEvidenceFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx">
              </label>
              <label>Descrição opcional
                <input id="launchEvidenceDescription" type="text" maxlength="500" placeholder="Ex.: Memória de cálculo validada pela área financeira">
              </label>
              <button id="addEvidenceButton" class="secondary-action" type="button">+ Adicionar arquivo</button>
            </div>
            <p id="launchEvidencePendingStatus" class="evidence-pending-status" aria-live="polite" hidden></p>

            <div>
              <h4>Arquivos anexados</h4>
              <div id="launchEvidenceList" class="evidence-list" aria-live="polite"></div>
            </div>
          </section>

          <label class="full-span">Métrica/Fórmula de referência
            <textarea id="launchMetrica" rows="4" readonly></textarea>
          </label>

          <div class="form-actions action-feedback-bar full-span">
            <div id="launchActionFeedback" class="action-feedback" role="status" aria-live="polite" hidden></div>
            <button id="saveDraftButton" class="primary-action" type="button">Salvar rascunho</button>
            <button id="sendApprovalButton" class="secondary-action" type="button">Enviar para homologação</button>
            <button id="requestReopenButton" class="secondary-action" type="button" hidden>Solicitar reabertura</button>
            <button id="clearLaunchButton" class="secondary-action" type="button">Limpar</button>
            <button id="closeLaunchButton" class="secondary-action" type="button">Voltar</button>
          </div>
        </form>
      </section>
    </main>
  </div>
</body>
</html>
