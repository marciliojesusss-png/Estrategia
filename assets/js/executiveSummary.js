(function () {
  const PILLAR_ORDER = [
    "Cliente no Centro",
    "Eficiência e Rentabilidade",
    "Tecnologia e Inovação",
    "Pessoas, Cultura e Agilidade",
    "Sustentabilidade e Cidadania",
    "Atuação em Ecossistema"
  ];
  const MONTHS = [
    [1, "Janeiro"], [2, "Fevereiro"], [3, "Março"], [4, "Abril"],
    [5, "Maio"], [6, "Junho"], [7, "Julho"], [8, "Agosto"],
    [9, "Setembro"], [10, "Outubro"], [11, "Novembro"], [12, "Dezembro"]
  ];
  const SITUATIONS = ["Atingido", "Abaixo da meta", "Crítico", "Sem dados", "Em andamento", "Não atingido", "Sem cálculo"];
  const PLAN_ORDER = { PEI: 1, PN: 2 };
  let chartInstance = null;
  let state = {
    data: null,
    user: null,
    indicators: [],
    launches: [],
    rules: []
  };

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
    if (value === "Atingido" || value === "Homologado") return "ok";
    if (value === "Crítico" || value === "Não atingido" || value === "Devolvido para ajuste") return "danger";
    if (value === "Abaixo da meta" || value === "Enviado para homologação") return "warn";
    return "info";
  }

  function displayStatus(result) {
    if (result.trimestral) return result.status;
    return result.lancamento ? result.status : "Não iniciado";
  }

  function displaySituation(result) {
    return StrategicResults.officialSituation(result);
  }

  function chartSituation(result) {
    const situation = displaySituation(result);
    if (situation === "Atingido") return "Atingido";
    if (situation === "Crítico" || situation === "Não atingido") return "Crítico";
    if (situation === "Sem dados" || situation === "Sem cálculo") return "Sem dados";
    return "Abaixo da meta";
  }

  function selectedFilters() {
    return Object.fromEntries(
      [...document.querySelectorAll("[data-executive-filter]")]
        .map((select) => [select.dataset.executiveFilter, select.value])
    );
  }

  function fillSelect(select, values) {
    const current = select.value;
    select.innerHTML = values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
    if (values.includes(current)) select.value = current;
  }

  function fillFilters() {
    const values = {
      periodo: ["Mensal", "Trimestral", "Anual"],
      plano: ["Todos", ...["PEI", "PN"].filter((plan) => state.indicators.some((item) => item.plano === plan))],
      pilar: ["Todos", ...PILLAR_ORDER.filter((pillar) => state.indicators.some((item) => item.pilar === pillar))],
      unidade: ["Todos", ...unique(state.indicators.map((item) => item.unidadeApuradora)).sort()],
      diretoria: ["Todos", ...unique(state.indicators.map((item) => item.diretoriaResponsavel)).sort()],
      status: ["Todos", "Não iniciado", ...unique(state.launches.map((item) => item.status)).filter((item) => item !== "Não iniciado")],
      situacao: ["Todas", ...SITUATIONS],
      competencia: ["Última disponível", ...MONTHS.map(([, name]) => name)]
    };

    document.querySelectorAll("[data-executive-filter]").forEach((select) => {
      fillSelect(select, values[select.dataset.executiveFilter]);
    });
  }

  function updatePeriodFilters() {
    const period = document.querySelector('[data-executive-filter="periodo"]').value;
    const competence = document.querySelector('[data-executive-filter="competencia"]');
    const status = document.querySelector('[data-executive-filter="status"]');
    if (period === "Trimestral") {
      fillSelect(competence, QuarterlyConsolidation.QUARTERS.map((item) => `${item.label}/2026`));
      fillSelect(status, ["Todos", "Sem dados", "Parcial", "Fechado"]);
      return;
    }
    if (period === "Anual") {
      fillSelect(competence, ["2026"]);
      fillSelect(status, ["Todos", "Não iniciado", ...unique(state.launches.map((item) => item.status)).filter((item) => item !== "Não iniciado")]);
      return;
    }
    fillSelect(competence, ["Última disponível", ...MONTHS.map(([, name]) => name)]);
    fillSelect(status, ["Todos", "Não iniciado", ...unique(state.launches.map((item) => item.status)).filter((item) => item !== "Não iniciado")]);
  }

  function quarterlyResult(indicator, quarterLabel) {
    const rule = IndicatorFormulas.obterRegra(indicator, state.rules);
    const launches = state.launches.filter((item) => item.indicadorId === indicator.id);
    const quarter = QuarterlyConsolidation.consolidarTrimestre(indicator, rule, launches, quarterLabel);
    return {
      indicador: indicator,
      regra: rule,
      resultado: quarter.resultadoTrimestral,
      percentualAtingido: quarter.desempenhoTrimestral,
      competencia: quarter.trimestre,
      status: quarter.statusTrimestre,
      lancamento: quarter.ultimoLancamentoHomologado,
      lancamentoAcao: quarter.ultimoLancamentoHomologado,
      meta: quarter.metaTrimestral,
      situacaoCalculada: quarter.situacaoTrimestral,
      trimestral: true,
      consolidadoTrimestral: quarter
    };
  }

  function getFilteredResults() {
    const filters = selectedFilters();
    const indicators = state.indicators.filter((indicator) => (
      (filters.plano === "Todos" || indicator.plano === filters.plano) &&
      (filters.pilar === "Todos" || indicator.pilar === filters.pilar) &&
      (filters.unidade === "Todos" || indicator.unidadeApuradora === filters.unidade) &&
      (filters.diretoria === "Todos" || indicator.diretoriaResponsavel === filters.diretoria)
    ));
    const ids = new Set(indicators.map((item) => item.id));
    if (filters.periodo === "Trimestral") {
      return indicators
        .map((indicator) => quarterlyResult(indicator, filters.competencia))
        .filter((result) => (
          (filters.status === "Todos" || displayStatus(result) === filters.status) &&
          (filters.situacao === "Todas" || displaySituation(result) === filters.situacao)
        ));
    }

    const selectedMonth = filters.periodo === "Mensal"
      ? MONTHS.find(([, name]) => name === filters.competencia)?.[0] || null
      : null;
    const launches = state.launches.filter((launch) => (
      ids.has(launch.indicadorId) &&
      Number(launch.ano) === 2026 &&
      (!selectedMonth || Number(launch.mes) <= selectedMonth)
    ));
    const summary = StrategicResults.calcularDashboard({
      indicadores: indicators,
      lancamentos: launches,
      regras: state.rules
    });

    return summary.resultadosOficiais.filter((result) => (
      (filters.status === "Todos" || displayStatus(result) === filters.status) &&
      (filters.situacao === "Todas" || displaySituation(result) === filters.situacao)
    ));
  }

  function aggregate(results) {
    const situations = results.map(displaySituation);
    const statuses = results.map(displayStatus);
    return {
      total: results.length,
      achieved: situations.filter((item) => item === "Atingido").length,
      attention: situations.filter((item) => item === "Abaixo da meta").length,
      critical: situations.filter((item) => item === "Crítico").length,
      noData: situations.filter((item) => item === "Sem dados").length,
      homologated: statuses.filter((item) => item === "Homologado" || item === "Fechado").length,
      pending: statuses.filter((item) => item === "Enviado para homologação" || item === "Parcial").length
    };
  }

  function renderCards(results) {
    const totals = aggregate(results);
    const cards = [
      ["Total de indicadores", totals.total, "total"],
      ["Indicadores atingidos", totals.achieved, "ok"],
      ["Indicadores abaixo da meta", totals.attention, "warn"],
      ["Indicadores críticos", totals.critical, "danger"],
      ["Indicadores sem dados", totals.noData, "neutral"],
      ["Indicadores homologados", totals.homologated, "info"],
      ["Pendentes de homologação", totals.pending, "pending"]
    ];
    document.getElementById("executiveCards").innerHTML = cards.map(([label, value, tone]) => `
      <article class="executive-summary-card executive-tone-${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function groupByPillar(results) {
    const represented = unique(results.map((item) => item.indicador.pilar));
    const pillars = [
      ...PILLAR_ORDER.filter((pillar) => represented.includes(pillar)),
      ...represented.filter((pillar) => !PILLAR_ORDER.includes(pillar))
    ];
    return pillars.map((pillar) => {
      const items = results.filter((item) => item.indicador.pilar === pillar);
      const totals = aggregate(items);
      return {
        pillar,
        items,
        ...totals,
        attainedPercent: totals.total ? totals.achieved / totals.total : 0
      };
    });
  }

  function renderPillarCards(groups) {
    const target = document.getElementById("executivePillarCards");
    if (!groups.length) {
      target.innerHTML = '<div class="panel empty-state">Nenhum pilar encontrado para os filtros selecionados.</div>';
      return;
    }
    target.innerHTML = groups.map((group) => `
      <article class="executive-pillar-card">
        <div class="executive-pillar-title">
          <span>${escapeHtml(group.pillar)}</span>
          <strong>${group.total}</strong>
        </div>
        <div class="executive-pillar-metrics">
          <span><strong>${group.achieved}</strong> atingido${group.achieved === 1 ? "" : "s"}</span>
          <span><strong>${group.attention + group.critical}</strong> em atenção/crítico</span>
          <span><strong>${group.critical}</strong> crítico${group.critical === 1 ? "" : "s"}</span>
        </div>
        <div class="executive-progress" aria-label="${(group.attainedPercent * 100).toFixed(0)}% atingidos">
          <span style="width:${Math.min(group.attainedPercent * 100, 100)}%"></span>
        </div>
        <p>${(group.attainedPercent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% atingidos</p>
      </article>
    `).join("");
  }

  function renderInsights(results, groups) {
    const criticalPillar = [...groups].sort((a, b) => b.critical - a.critical || b.total - a.total)[0];
    const plans = unique(results.map((item) => item.indicador.plano)).map((plan) => {
      const items = results.filter((item) => item.indicador.plano === plan);
      const achieved = items.filter((item) => displaySituation(item) === "Atingido").length;
      const withData = items.filter((item) => displaySituation(item) !== "Sem dados").length;
      return { plan, total: items.length, achieved, withData, percent: items.length ? achieved / items.length : 0 };
    }).sort((a, b) => b.percent - a.percent || b.achieved - a.achieved);
    const plansWithData = plans.filter((plan) => plan.withData > 0);
    const bestPlan = plansWithData[0];
    const tiedPlans = bestPlan
      ? plansWithData.filter((plan) => plan.percent === bestPlan.percent && plan.achieved === bestPlan.achieved)
      : [];
    const bestPlanLabel = !bestPlan
      ? "Sem dados"
      : tiedPlans.length > 1
        ? `Empate: ${tiedPlans.map((plan) => plan.plan).join(" e ")}`
        : bestPlan.plan;
    const bestPlanDescription = !bestPlan
      ? "Nenhum plano possui resultado oficial no recorte atual."
      : tiedPlans.length > 1
        ? `${(bestPlan.percent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos indicadores atingidos em cada plano`
        : `${(bestPlan.percent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos indicadores atingidos`;

    document.getElementById("executiveInsights").innerHTML = `
      <article class="executive-insight-card">
        <span>Pilar com mais indicadores críticos</span>
        <strong>${criticalPillar && criticalPillar.critical ? escapeHtml(criticalPillar.pillar) : "Nenhum pilar crítico"}</strong>
        <p>${criticalPillar && criticalPillar.critical ? `${criticalPillar.critical} indicador${criticalPillar.critical === 1 ? "" : "es"} crítico${criticalPillar.critical === 1 ? "" : "s"}` : "Não há indicadores críticos no recorte atual."}</p>
      </article>
      <article class="executive-insight-card">
        <span>Plano com melhor desempenho</span>
        <strong>${escapeHtml(bestPlanLabel)}</strong>
        <p>${escapeHtml(bestPlanDescription)}</p>
      </article>
    `;
  }

  function renderChart(groups) {
    const canvas = document.getElementById("executivePillarChart");
    const empty = document.getElementById("executiveChartEmpty");
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    canvas.hidden = !groups.length;
    empty.hidden = Boolean(groups.length);

    const rows = groups.map((group) => ({
      pillar: group.pillar,
      achieved: group.items.filter((item) => chartSituation(item) === "Atingido").length,
      attention: group.items.filter((item) => chartSituation(item) === "Abaixo da meta").length,
      critical: group.items.filter((item) => chartSituation(item) === "Crítico").length,
      noData: group.items.filter((item) => chartSituation(item) === "Sem dados").length
    }));

    document.getElementById("executivePillarBreakdown").innerHTML = rows.length
      ? rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.pillar)}</td>
          <td>${row.achieved}</td>
          <td>${row.attention}</td>
          <td>${row.critical}</td>
          <td>${row.noData}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="5">Nenhum indicador encontrado.</td></tr>';

    if (!groups.length || !window.Chart) return;
    chartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels: rows.map((row) => row.pillar),
        datasets: [
          { label: "Atingidos", data: rows.map((row) => row.achieved), backgroundColor: "#2f7d32" },
          { label: "Abaixo da meta", data: rows.map((row) => row.attention), backgroundColor: "#c28b00" },
          { label: "Críticos", data: rows.map((row) => row.critical), backgroundColor: "#b3261e" },
          { label: "Sem dados", data: rows.map((row) => row.noData), backgroundColor: "#9aa6b2" }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
          y: { stacked: true }
        }
      }
    });
  }

  function renderTable(results) {
    const target = document.getElementById("executiveTable");
    const ordered = [...results].sort((a, b) => (
      (PLAN_ORDER[a.indicador.plano] || 99) - (PLAN_ORDER[b.indicador.plano] || 99) ||
      PILLAR_ORDER.indexOf(a.indicador.pilar) - PILLAR_ORDER.indexOf(b.indicador.pilar) ||
      Number(a.indicador.numero) - Number(b.indicador.numero)
    ));
    document.getElementById("executiveResultCount").textContent = `${ordered.length} indicador${ordered.length === 1 ? "" : "es"}`;
    if (!ordered.length) {
      target.innerHTML = '<tr><td colspan="9">Nenhum indicador encontrado para os filtros selecionados.</td></tr>';
      return;
    }
    target.innerHTML = ordered.map((result) => {
      const situation = displaySituation(result);
      const status = displayStatus(result);
      return `
        <tr>
          <td><span class="executive-plan-chip executive-plan-${result.indicador.plano.toLowerCase()}">${escapeHtml(result.indicador.plano)}</span></td>
          <td>${escapeHtml(result.indicador.pilar)}</td>
          <td class="indicator-name"><strong>${escapeHtml(result.indicador.numero)}.</strong> ${escapeHtml(result.indicador.indicador)}</td>
          <td>${escapeHtml(result.competencia || "-")}</td>
          <td class="official-value">${result.lancamento ? StrategicResults.formatOfficialResult(result) : "-"}</td>
          <td>${StrategicResults.formatOfficialMeta(result)}</td>
          <td><span class="badge ${badgeClass(situation)}">${escapeHtml(situation)}</span></td>
          <td><span class="badge ${badgeClass(status)}">${escapeHtml(status)}</span></td>
          <td><a class="secondary-action table-action dashboard-action" href="indicadores.html?indicadorId=${result.indicador.id}">Visualizar</a></td>
        </tr>
      `;
    }).join("");
  }

  function refresh() {
    const results = getFilteredResults();
    const groups = groupByPillar(results);
    renderCards(results);
    renderInsights(results, groups);
    renderPillarCards(groups);
    renderChart(groups);
    renderTable(results);
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicators: Auth.filterIndicatorsByUser(data.indicadores, user),
      launches: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      rules: data.regrasIndicadores || []
    };
    fillFilters();
    document.querySelectorAll("[data-executive-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        if (select.dataset.executiveFilter === "periodo") updatePeriodFilters();
        refresh();
      });
    });
    updatePeriodFilters();
    refresh();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.resumoExecutivo = { init };
})();
