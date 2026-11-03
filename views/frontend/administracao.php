<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Configurações</title>
  <link rel="stylesheet" href="/assets/css/styles.css?v=APP-VERSION-001">
  <script src="/assets/js/currency.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/ieo-recorrente.js?v=INDICADOR06-CONFERENCIA-001" defer></script>
  <script src="/assets/js/lucro-recorrente.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="/assets/js/situations.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/formulas.js?v=INDICADOR21-ATINGIMENTO-001" defer></script>
  <script src="/assets/js/bootstrap-data.js?v=METAS-OFICIAIS-003" defer></script>
  <script src="/assets/js/indicator-periodicity.js?v=PERIODICIDADE-TRIMESTRAL-001" defer></script>
  <script src="/assets/js/dataStore.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="/assets/js/databaseService.js?v=GOVERNANCA-CA-002" defer></script>
  <script src="/assets/js/dataService.js?v=PERSISTENCIA-CENTRAL-008" defer></script>
  <script src="/assets/js/auth.js?v=GOVERNANCA-CA-001" defer></script>
  <script src="/assets/js/prazo-apuracao.js?v=PRAZOS-APURACAO-001" defer></script>
  <script src="/assets/js/admin.js?v=MATRIZ-COBERTURA-003" defer></script>
  <script src="/assets/js/app.js?v=APP-VERSION-001" defer></script>
</head>
<body data-page="administracao">
  <div class="app-shell">
    <header id="appHeader" class="topbar"></header>
    <nav id="appNav" class="sidebar"></nav>
    <main class="content">
      <section class="page-heading">
        <p class="eyebrow">Parâmetros do sistema</p>
        <h1>Configurações</h1>
        <p>Parâmetros do sistema, perfis de acesso e integridade da base SQL Server.</p>
      </section>

      <section id="databaseServerPanel" class="panel database-local-panel" aria-labelledby="database-server-title">
        <div class="panel-title-row">
          <div>
            <p class="eyebrow">Fonte central</p>
            <h2 id="database-server-title">SQL Server</h2>
          </div>
        </div>
        <p class="help-text">Indicadores, lançamentos, regras, prazos, acessos e auditoria utilizam exclusivamente o SQL Server.</p>
        <div id="databaseServerInfo" class="detail-grid"></div>
        <div class="validation-base-actions">
          <button id="checkSqlServerIntegrityButton" class="secondary-action" type="button">Verificar integridade do banco</button>
          <button id="reloadSqlServerDataButton" class="secondary-action" type="button">Recarregar dados do banco</button>
        </div>
        <div id="databaseServerStatus" class="notice info" hidden></div>
      </section>

      <section id="adminGrid" class="admin-grid"></section>

      <section class="panel admin-workspace">
        <div class="admin-tabs" aria-label="Módulos administrativos">
          <button class="secondary-action" type="button" data-admin-module="cobertura">Matriz de Cobertura</button>
          <button class="secondary-action" type="button" data-admin-module="acessos">Acessos</button>
          <button class="secondary-action" type="button" data-admin-module="usuarios">Usuários</button>
          <button class="secondary-action" type="button" data-admin-module="planos">Planos</button>
          <button class="secondary-action" type="button" data-admin-module="pilares">Pilares</button>
          <button class="secondary-action" type="button" data-admin-module="unidades">Unidades</button>
          <button class="secondary-action" type="button" data-admin-module="diretorias">Diretorias</button>
          <button class="secondary-action" type="button" data-admin-module="indicadores">Indicadores</button>
          <button class="secondary-action" type="button" data-admin-module="metas">Metas</button>
          <button class="secondary-action" type="button" data-admin-module="tiposCalculo">Tipos de cálculo</button>
          <button class="secondary-action" type="button" data-admin-module="prazosApuracao">Prazos de Apuração</button>
          <button class="secondary-action" type="button" data-admin-module="fechamentoCa">Fechamento para o CA</button>
          <button class="secondary-action" type="button" data-admin-module="reabertura">Reabertura</button>
          <button class="secondary-action" type="button" data-admin-module="solicitacoesReabertura">Solicitações de Reabertura</button>
          <button class="secondary-action" type="button" data-admin-module="historico">Histórico</button>
        </div>

        <div id="adminMessage" class="notice" hidden></div>

        <div class="panel-actions indicators-actions">
          <div>
            <p class="eyebrow">Módulo selecionado</p>
            <h2 id="adminModuleTitle">Usuários</h2>
          </div>
          <div class="action-group">
            <button id="resetOperationalDataButton" class="secondary-action" type="button">Reiniciar lançamentos</button>
            <button id="adminNewButton" class="primary-action" type="button">Novo registro</button>
          </div>
        </div>

        <form id="adminForm" class="editor-form" hidden></form>

        <section id="accessCoverageWorkspace" class="access-coverage-workspace" aria-labelledby="access-coverage-title" hidden>
          <div class="access-coverage-heading">
            <div>
              <p class="eyebrow">Leitura administrativa</p>
              <h3 id="access-coverage-title">Matriz de Cobertura</h3>
              <p class="help-text">Posição atual derivada exclusivamente dos acessos ativos e dos catálogos institucionais.</p>
            </div>
          </div>

          <div id="accessCoverageCards" class="summary-grid access-coverage-cards" aria-live="polite"></div>

          <form id="accessCoverageFilters" class="filters access-coverage-filters" aria-label="Filtros da matriz de cobertura">
            <label>Diretoria
              <select id="accessCoverageDirectoryFilter" name="diretoria">
                <option value="">Todas</option>
              </select>
            </label>
            <label>Unidade
              <select id="accessCoverageUnitFilter" name="unidade">
                <option value="">Todas</option>
              </select>
            </label>
            <label>Função/Perfil
              <select id="accessCoverageFunctionFilter" name="funcao">
                <option value="">Todas</option>
              </select>
            </label>
            <label>Situação de cobertura
              <select id="accessCoverageStatusFilter" name="cobertura">
                <option value="">Todas</option>
              </select>
            </label>
          </form>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Diretoria</th>
                  <th>Unidade/Escopo</th>
                  <th>Função</th>
                  <th>Esperado</th>
                  <th>Ativos</th>
                  <th>Cobertura</th>
                </tr>
              </thead>
              <tbody id="accessCoverageTableBody"></tbody>
            </table>
          </div>

          <section class="access-coverage-users" aria-labelledby="access-coverage-users-title">
            <div class="panel-title-row">
              <div>
                <p class="eyebrow">Acessos atuais</p>
                <h3 id="access-coverage-users-title">Usuários ativos por cobertura</h3>
              </div>
            </div>
            <div id="accessCoverageUsers" class="access-coverage-user-grid"></div>
          </section>
        </section>

        <div id="adminDefaultTable" class="table-wrap">
          <table>
            <thead id="adminTableHead"></thead>
            <tbody id="adminTableBody"></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</body>
</html>





