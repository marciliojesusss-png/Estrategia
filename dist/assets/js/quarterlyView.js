(function () {
  const PILLAR_ORDER = [
    "Cliente no Centro",
    "Eficiência e Rentabilidade",
    "Tecnologia e Inovação",
    "Pessoas, Cultura e Agilidade",
    "Sustentabilidade e Cidadania",
    "Atuação em Ecossistema"
  ];
  const PLAN_ORDER = ["PEI", "PN"];
  let state = {};

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function badgeClass(value) {
    if (value === "Fechado" || value === "Atingido") return "ok";
    if (value === "Parcial" || value === "Abaixo da meta" || value === "Em andamento") return "warn";
    if (value === "Crítico" || value === "Não atingido") return "danger";
    return "info";
  }

  function ruleFor(indicator) {
    return IndicatorFormulas.obterRegra(indicator, state.rules);
  }

  function fillSelect(select, values) {
    const current = select.value;
    select.innerHTML = values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
    if (values.includes(current)) select.value = current;
  }

  function fillFilters() {
    const years = unique(state.launches.map((item) => String(item.ano))).sort();
    const values = {
      ano: years.length ? years : ["2026"],
      trimestre: ["Todos", "1TRI", "2TRI", "3TRI", "4TRI"],
      plano: ["Todos", ...PLAN_ORDER.filter((plan) => state.indicators.some((item) => item.plano === plan))],
      pilar: ["Todos", ...PILLAR_ORDER.filter((pillar) => state.indicators.some((item) => item.pilar === pillar))],
      unidade: ["Todos", ...unique(state.indicators.map((item) => item.unidadeApuradora)).sort()],
      diretoria: ["Todos", ...unique(state.indicators.map((item) => item.diretoriaResponsavel)).sort()],
      status: ["Todos", "Sem dados", "Parcial", "Fechado"]
    };
    document.querySelectorAll("[data-quarter-filter]").forEach((select) => {
      fillSelect(select, values[select.dataset.quarterFilter]);
    });
    document.querySelector('[data-quarter-filter="trimestre"]').value = "1TRI";
  }

  function filters() {
    return Object.fromEntries(
      [...document.querySelectorAll("[data-quarter-filter]")]
        .map((select) => [select.dataset.quarterFilter, select.value])
    );
  }

  function buildRows() {
    const selected = filters();
    const indicators = state.indicators.filter((indicator) => (
      (selected.plano === "Todos" || indicator.plano === selected.plano) &&
      (selected.pilar === "Todos" || indicator.pilar === selected.pilar) &&
      (selected.unidade === "Todos" || indicator.unidadeApuradora === selected.unidade) &&
      (selected.diretoria === "Todos" || indicator.diretoriaResponsavel === selected.diretoria)
    ));
    const quarterNumbers = selected.trimestre === "Todos"
      ? [1, 2, 3, 4]
      : [Number(selected.trimestre[0])];
    const rows = indicators.map((indicator) => {
      const rule = ruleFor(indicator);
      const launches = state.launches.filter((item) => item.indicadorId === indicator.id);
      const quarters = quarterNumbers.map((number) => (
        QuarterlyConsolidation.consolidarTrimestre(indicator, rule, launches, `${number}TRI/${selected.ano}`)
      ));
      return { indicator, rule, quarters };
    }).filter((row) => (
      selected.status === "Todos" || row.quarters.some((quarter) => quarter.statusTrimestre === selected.status)
    ));
    return { rows, quarterNumbers, year: selected.ano };
  }

  function renderSummary(rows) {
    const quarters = rows.flatMap((row) => row.quarters);
    const cards = [
      ["Indicadores", rows.length],
      ["Trimestres fechados", quarters.filter((item) => item.statusTrimestre === "Fechado").length],
      ["Trimestres parciais", quarters.filter((item) => item.statusTrimestre === "Parcial").length],
      ["Consolidados sem dados", quarters.filter((item) => item.statusTrimestre === "Sem dados").length]
    ];
    document.getElementById("quarterSummaryCards").innerHTML = cards.map(([label, value]) => (
      `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${value}</strong></article>`
    )).join("");
  }

  function renderAlerts(rows) {
    const alerts = rows.flatMap((row) => row.quarters
      .filter((quarter) => quarter.statusTrimestre === "Parcial" || quarter.possuiMesDevolvido)
      .map((quarter) => ({
        indicator: row.indicator,
        quarter
      })));
    document.getElementById("quarterAlerts").innerHTML = alerts.slice(0, 12).map(({ indicator, quarter }) => `
      <div class="notice ${quarter.possuiMesDevolvido ? "danger" : "warning"}">
        <strong>${escapeHtml(quarter.trimestre)} — ${escapeHtml(indicator.indicador)}</strong>
        <span>${escapeHtml(quarter.mensagem)}</span>
      </div>
    `).join("");
  }

  function quarterHeaders(quarterNumbers, year) {
    return quarterNumbers.map((number) => `
      <th>${number}TRI Meta</th>
      <th>${number}TRI Realizado</th>
      <th>${number}TRI Desempenho</th>
      <th>${number}TRI Status</th>
    `).join("");
  }

  function quarterCells(row) {
    return row.quarters.map((quarter) => `
      <td>${Calculations.formatarValor(quarter.metaTrimestral, row.rule.unidadeMedida)}</td>
      <td class="official-value">
        ${Calculations.formatarValor(quarter.resultadoTrimestral, row.rule.unidadeMedida)}
        ${row.rule.tipoCalculo === "razao_pix" && quarter.resultadoCalculadoTrimestral != null
          ? `<small>Calculado: ${Calculations.formatarValor(quarter.resultadoCalculadoTrimestral, row.rule.unidadeMedida)}<br>PIX: ${Calculations.formatarMoedaBR(quarter.pixAcumuladoTrimestre)}<br>Canais: ${Calculations.formatarMoedaBR(quarter.canaisAcumuladoTrimestre)}</small>`
          : row.rule.tipoCalculo === "razao_canais_digitais" && quarter.resultadoCalculadoTrimestral != null
            ? `<small>Canais eletrônicos: ${Calculations.formatarMoedaBR(quarter.canaisDigitaisAcumuladoTrimestre)}<br>Produtos de loterias: ${Calculations.formatarMoedaBR(quarter.produtosLoteriasAcumuladoTrimestre)}</small>`
          : ""}
      </td>
      <td>
        ${row.rule.tipoCalculo === "razao_canais_digitais" && quarter.desempenhoTrimestral != null
          ? `${(quarter.desempenhoTrimestral * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
          : Calculations.formatarPercentual(quarter.desempenhoTrimestral)}
        <span class="quarter-situation">${escapeHtml(quarter.situacaoTrimestral)}</span>
      </td>
      <td>
        <span class="badge ${badgeClass(quarter.statusTrimestre)}">${escapeHtml(quarter.statusTrimestre)}</span>
        <small>${quarter.mesesHomologados} de 3 homologados</small>
      </td>
    `).join("");
  }

  function renderTable(items, quarterNumbers, year) {
    return `
      <div class="table-wrap quarterly-table">
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              ${quarterHeaders(quarterNumbers, year)}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((row) => `
              <tr>
                <td class="indicator-name"><strong>${escapeHtml(row.indicator.numero)}.</strong> ${escapeHtml(row.indicator.indicador)}</td>
                ${quarterCells(row)}
                <td><a class="secondary-action table-action dashboard-action" href="indicadores.html?indicadorId=${row.indicator.id}">Visualizar</a></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderResults(rows, quarterNumbers, year) {
    const target = document.getElementById("quarterlyResults");
    document.getElementById("quarterResultCount").textContent = `${rows.length} indicador${rows.length === 1 ? "" : "es"}`;
    if (!rows.length) {
      target.innerHTML = '<div class="panel empty-state">Nenhum indicador encontrado para os filtros selecionados.</div>';
      return;
    }
    const plans = PLAN_ORDER.filter((plan) => rows.some((row) => row.indicator.plano === plan));
    target.innerHTML = plans.map((plan) => {
      const planRows = rows.filter((row) => row.indicator.plano === plan);
      const pillars = PILLAR_ORDER.filter((pillar) => planRows.some((row) => row.indicator.pilar === pillar));
      return `
        <article class="strategic-plan strategic-plan-${plan.toLowerCase()}">
          <header class="strategic-plan-header">
            <div><span>Plano estratégico</span><h3>${plan} ${year}</h3></div>
            <strong>${planRows.length} indicadores</strong>
          </header>
          <div class="strategic-pillars">
            ${pillars.map((pillar) => {
              const items = planRows.filter((row) => row.indicator.pilar === pillar);
              return `
                <section class="strategic-pillar">
                  <header class="strategic-pillar-header">
                    <div><span>Pilar ${PILLAR_ORDER.indexOf(pillar) + 1}</span><h4>${escapeHtml(pillar)}</h4></div>
                    <strong>${items.length}</strong>
                  </header>
                  ${renderTable(items, quarterNumbers, year)}
                </section>
              `;
            }).join("")}
          </div>
        </article>
      `;
    }).join("");
  }

  function refresh() {
    const result = buildRows();
    renderSummary(result.rows);
    renderAlerts(result.rows);
    renderResults(result.rows, result.quarterNumbers, result.year);
  }

  async function init({ data, user }) {
    state = {
      user,
      indicators: Auth.filterIndicatorsByUser(data.indicadores, user),
      launches: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      rules: data.regrasIndicadores || []
    };
    fillFilters();
    document.querySelectorAll("[data-quarter-filter]").forEach((select) => {
      select.addEventListener("change", refresh);
    });
    refresh();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.visaoTrimestral = { init };
})();
