<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Auditoria</title>
  <link rel="stylesheet" href="/assets/css/styles.css?v=APP-VERSION-001">
  <script src="/assets/js/bootstrap-data.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="/assets/js/dataStore.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="/assets/js/databaseService.js?v=GOVERNANCA-CA-002" defer></script>
  <script src="/assets/js/dataService.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/auth.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="/assets/js/auditoria.js?v=AUDITORIA-UI-001" defer></script>
  <script src="/assets/js/app.js?v=APP-VERSION-001" defer></script>
</head>
<body data-page="auditoria">
  <div class="app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>

    <main class="content">
      <section class="page-heading audit-heading">
        <p class="eyebrow">Governança e rastreabilidade</p>
        <h1>Auditoria</h1>
        <p>Consulte operações realizadas no sistema e registros de acesso.</p>
      </section>

      <form id="auditFilterForm" class="panel filters audit-filters">
        <label>
          Data inicial
          <input id="auditStartDate" type="date" name="dataInicial">
        </label>
        <label>
          Data final
          <input id="auditEndDate" type="date" name="dataFinal">
        </label>
        <label>
          Usuário
          <input id="auditUser" name="usuario" autocomplete="off">
        </label>
        <label>
          Ação
          <input id="auditAction" name="acao" autocomplete="off">
        </label>
        <div class="audit-filter-actions">
          <button id="auditFilterButton" class="primary-action" type="submit">Filtrar</button>
          <button id="auditClearButton" class="secondary-action" type="button">Limpar</button>
        </div>
      </form>

      <div id="auditMessage" class="notice" role="status" hidden></div>

      <section class="panel audit-panel" aria-labelledby="audit-operations-title">
        <div class="panel-title-row">
          <div>
            <p class="eyebrow">Histórico do sistema</p>
            <h2 id="audit-operations-title">Operações</h2>
          </div>
          <span id="auditOperationsCount" class="result-count">Carregando...</span>
        </div>
        <div class="table-wrap">
          <table class="audit-table audit-operations-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Entidade</th>
                <th>Ação</th>
                <th>Registro</th>
                <th>Anterior</th>
                <th>Novo</th>
              </tr>
            </thead>
            <tbody id="auditOperationsBody">
              <tr><td class="empty-state" colspan="7">Carregando operações...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="auditOperationsPagination" class="audit-pagination" hidden>
          <button class="secondary-action" type="button" data-page-action="previous">Anterior</button>
          <span data-page-summary></span>
          <button class="secondary-action" type="button" data-page-action="next">Próxima</button>
        </div>
      </section>

      <section class="panel audit-panel" aria-labelledby="audit-access-title">
        <div class="panel-title-row">
          <div>
            <p class="eyebrow">Segurança</p>
            <h2 id="audit-access-title">Acessos</h2>
          </div>
          <span id="auditAccessCount" class="result-count">Carregando...</span>
        </div>
        <div class="table-wrap">
          <table class="audit-table audit-access-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Matrícula</th>
                <th>Perfil</th>
                <th>Unidade</th>
                <th>IP</th>
                <th>Evento</th>
              </tr>
            </thead>
            <tbody id="auditAccessBody">
              <tr><td class="empty-state" colspan="6">Carregando acessos...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="auditAccessPagination" class="audit-pagination" hidden>
          <button class="secondary-action" type="button" data-page-action="previous">Anterior</button>
          <span data-page-summary></span>
          <button class="secondary-action" type="button" data-page-action="next">Próxima</button>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
