<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Lançamentos</title>
  <link rel="stylesheet" href="<?= APP_BASE_PATH ?>/assets/css/styles.css?v=APP-VERSION-001">
  <script src="/assets/js/currency.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/ieo-recorrente.js?v=METAS-OFICIAIS-002" defer></script>
  <script src="/assets/js/lucro-recorrente.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="/assets/js/situations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/bootstrap-data.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="/assets/js/indicator-periodicity.js?v=PERIODICIDADE-TRIMESTRAL-001" defer></script>
  <script src="/assets/js/dataStore.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="/assets/js/central-persistence.js?v=METAS-OFICIAIS-002" defer></script>
  <script src="/assets/js/databaseService.js?v=GOVERNANCA-CA-002" defer></script>
  <script src="/assets/js/auth.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="/assets/js/calculations.js?v=PLATAFORMA-JOGOS-001" defer></script>
  <script src="/assets/js/formulas.js?v=METAS-OFICIAIS-002" defer></script>
  <script src="/assets/js/documentation-fields.js?v=DOCUMENTACAO-COMPLEMENTAR-1TRI-001" defer></script>
  <script src="/assets/js/action-feedback.js?v=ACTION-FEEDBACK-001" defer></script>
  <script src="/assets/js/launches.js?v=OBSERVACOES-DOCUMENTAIS-1TRI-001" defer></script>
  <script src="/assets/js/app.js?v=APP-VERSION-001" defer></script>
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

          <section id="indicator22SummarySection" class="indicator22-section indicator22-summary-section full-span" aria-labelledby="indicator22SummaryTitle" hidden>
            <div class="indicator22-section-heading">
              <div>
                <p class="eyebrow">Acompanhamento mensal</p>
                <h3 id="indicator22SummaryTitle">Resumo da competência</h3>
              </div>
              <p>A meta da competência aplica o crescimento previsto sobre a referência do mesmo período de 2025.</p>
            </div>
            <div id="indicator22SummaryGrid" class="indicator22-summary-grid"></div>
          </section>

          <label><span id="launchMetaLabel">Meta de referência mensal</span>
            <input id="launchMeta" type="text" readonly>
          </label>

          <label id="realizadoWrapper">Realizado mensal
            <input id="launchRealizado" type="number" step="any">
          </label>

          <div id="dynamicInputSection" class="full-span">
            <p class="eyebrow">Dados de entrada</p>
            <div id="launchValidationFeedback" class="action-feedback launch-validation-feedback" role="alert" aria-live="assertive" hidden></div>
            <div id="dynamicInputFields" class="editor-form"></div>
          </div>

          <section id="indicator22OfficialSection" class="indicator22-section indicator22-official-section full-span" aria-labelledby="indicator22OfficialTitle" hidden>
            <div class="indicator22-section-heading">
              <div>
                <p class="eyebrow">Posição documental</p>
                <h3 id="indicator22OfficialTitle">Fechamento oficial</h3>
              </div>
              <p>Apresentação literal do Informe do trimestre, separada do acompanhamento técnico mensal.</p>
            </div>
            <div id="indicator22OfficialGrid" class="indicator22-official-grid"></div>
          </section>

          <details id="indicator22MemorySection" class="indicator22-memory full-span" hidden>
            <summary>
              <span>Memória de cálculo</span>
              <small>Auditoria, conferência e rastreabilidade</small>
            </summary>
            <div id="indicator22MemoryGrid" class="indicator22-memory-grid"></div>
          </details>

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

          <aside id="launchDocumentaryObservation" class="legacy-information full-span" hidden>
            <strong id="launchDocumentaryObservationNotice"></strong>
            <p>Fonte documental: <span id="launchDocumentaryObservationSource"></span></p>
          </aside>

          <aside id="legacyLaunchJustification" class="legacy-information full-span" hidden>
            <strong>Justificativa legada (somente leitura)</strong>
            <p id="legacyLaunchJustificationText"></p>
          </aside>

          <section id="evidenceWrapper" class="evidence-section full-span" aria-labelledby="launchEvidenceTitle">
            <div class="evidence-section-heading">
              <div>
                <p class="eyebrow">Documentação comprobatória</p>
                <h3 id="launchEvidenceTitle">Evidências atuais</h3>
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
              <h4>Arquivos da versão atual</h4>
              <div id="launchEvidenceList" class="evidence-list" aria-live="polite"></div>
            </div>
            <details id="launchEvidenceHistoryWrapper" class="evidence-history" hidden>
              <summary>Evidências de versões anteriores</summary>
              <p class="evidence-history-warning">Esta evidência pertence a uma versão anterior e não comprova a versão atual.</p>
              <div id="launchEvidenceHistoryList" class="evidence-list" aria-live="polite"></div>
            </details>
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
