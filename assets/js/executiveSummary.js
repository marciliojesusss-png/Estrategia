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
  const SITUATIONS = ["Atingido", "Abaixo da meta", "Sem dados", "Em andamento", "Sem cálculo"];
  const PLAN_ORDER = { PEI: 1, PN: 2 };
  const HIGHLIGHT_LIMIT = 12;
  const HIGHLIGHT_INDICATORS = [
    "ggr",
    "lucro liquido recorrente",
    "ieo recorrente",
    "vendas com meio de pagamento pix",
    "vendas provenientes de canais digitais",
    "nps",
    "clima organizacional",
    "repasse social",
    "principios de jogo responsavel",
    "arrecadacao gerada com o ecossistema",
    "participacao da rede loterica nos negocios"
  ];
  const SUMMARY_CARD_FILTERS = {
    atingido: { label: "Indicadores atingidos", situation: "Atingido" },
    abaixo_da_meta: { label: "Indicadores abaixo da meta", situation: "Abaixo da meta" },
    sem_dados: { label: "Indicadores sem dados", situation: "Sem dados" }
  };
  let chartInstance = null;
  let state = {
    data: null,
    user: null,
    indicators: [],
    launches: [],
    rules: [],
    chartFilter: {
      pilar: null,
      situacao: null
    },
    summaryCardFilter: null,
    highlightFilterId: null,
    highlightsPaused: false
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

  function limparNomeIndicador(nome) {
    return String(nome || "").replace(/^\s*\d+\.\s*/, "").trim();
  }

  function badgeClass(value) {
    value = Situations.normalizarSituacao(value);
    if (value === "Atingido" || value === "Homologado") return "ok";
    if (value === "Devolvido para ajuste") return "danger";
    if (value === "Abaixo da meta" || value === "Enviado para homologação") return "warn";
    return "info";
  }

  function displayStatus(result) {
    if (result.trimestral) return result.status;
    return result.lancamento ? result.status : "Não iniciado";
  }

  function displaySituation(result) {
    return normalizeSituation(StrategicResults.officialSituation(result));
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isUsuarioCompanhia(perfil) {
    const value = normalizeText(perfil).replace(/\s+/g, " ");
    return value === "usuario da companhia" ||
      value === "usuario companhia" ||
      value === "usuario_companhia" ||
      value === "consulta institucional" ||
      value === "consulta_institucional";
  }

  function isConsultaInstitucional(perfil) {
    const value = normalizeText(perfil).replace(/\s+/g, " ");
    return value === "consulta institucional" ||
      value === "consulta/gestao" ||
      value === "consulta gestao";
  }

  function shouldShowOperationalStatusInHighlights() {
    const perfil = state.user?.perfil;
    return !isUsuarioCompanhia(perfil) && !isConsultaInstitucional(perfil);
  }

  function shouldHideStatusColumn() {
    return isUsuarioCompanhia(state.user?.perfil);
  }

  function shouldHideOperationalHomologationCards() {
    return isUsuarioCompanhia(state.user?.perfil);
  }

  function normalizeSituation(value) {
    const normalizedValue = Situations.normalizarSituacao(value);
    const normalized = normalizeText(normalizedValue);
    if (normalized === "sem dados" || normalized === "sem calculo" || normalized === "nao iniciado" || normalized === "-") return "Sem dados";
    return normalizedValue || "Sem dados";
  }

  function chartSituation(result) {
    const situation = normalizeSituation(displaySituation(result));
    if (situation === "Atingido") return "Atingido";
    if (situation === "Sem dados") return "Sem dados";
    return "Abaixo da meta";
  }

  function hasChartFilter() {
    return Boolean(state.chartFilter.pilar);
  }

  function clearChartFilter() {
    state.chartFilter = { pilar: null, situacao: null };
    refresh();
  }

  function applyChartFilter(pilar, situacao) {
    if (state.chartFilter.pilar === pilar && state.chartFilter.situacao === situacao) {
      clearChartFilter();
      return;
    }
    state.chartFilter = { pilar, situacao };
    refresh();
  }

  function filterResultsByChart(results) {
    if (!hasChartFilter()) return results;
    return results.filter((result) => (
      normalizeText(result.indicador.pilar) === normalizeText(state.chartFilter.pilar) &&
      (!state.chartFilter.situacao || chartSituation(result) === state.chartFilter.situacao)
    ));
  }

  function hasSummaryCardFilter() {
    return Boolean(state.summaryCardFilter);
  }

  function normalizeSummaryCardSituation(value) {
    const normalized = normalizeText(normalizeSituation(value));
    if (normalized === "atingido" || normalized === "atingida") return "atingido";
    if (normalized === "abaixo da meta" || normalized === "critico" || normalized === "nao atingido") return "abaixo_da_meta";
    if (normalized === "sem dados" || normalized === "sem calculo" || normalized === "nao iniciado" || normalized === "-") return "sem_dados";
    return normalized;
  }

  function filterResultsBySummaryCard(results) {
    if (!hasSummaryCardFilter()) return results;
    return results.filter((result) => normalizeSummaryCardSituation(displaySituation(result)) === state.summaryCardFilter);
  }

  function clearSummaryCardFilter() {
    state.summaryCardFilter = null;
    refresh();
  }

  function applySummaryCardFilter(type) {
    if (type === "todos") {
      state.summaryCardFilter = null;
    } else {
      state.summaryCardFilter = state.summaryCardFilter === type ? null : type;
    }
    refresh();
    document.getElementById("executiveTableTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applyPillarGaugeFilter(pilar) {
    if (state.chartFilter.pilar === pilar && !state.chartFilter.situacao) {
      clearChartFilter();
      return;
    }
    state.chartFilter = { pilar, situacao: null };
    refresh();
    document.getElementById("executiveTableTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hasHighlightFilter() {
    return Boolean(state.highlightFilterId);
  }

  function clearHighlightFilter() {
    state.highlightFilterId = null;
    refresh();
  }

  function applyHighlightFilter(indicadorId) {
    if (state.highlightFilterId === indicadorId) {
      clearHighlightFilter();
      return;
    }
    state.highlightFilterId = indicadorId;
    refresh();
    document.getElementById("executiveTableTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function filterResultsByHighlight(results) {
    if (!hasHighlightFilter()) return results;
    return results.filter((result) => Number(result.indicador.id) === Number(state.highlightFilterId));
  }

  function clearInteractiveFilters() {
    state.chartFilter = { pilar: null, situacao: null };
    state.summaryCardFilter = null;
    state.highlightFilterId = null;
    refresh();
    document.getElementById("executiveTableTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function highlightPriority(result) {
    const situation = normalizeSituation(displaySituation(result));
    if (situation === "Abaixo da meta") return 0;
    if (situation === "Sem dados") return 1;
    if (normalizeText(displaySituation(result)) === "em acompanhamento") return 2;
    if (normalizeText(displaySituation(result)) === "em andamento") return 3;
    if (situation === "Atingido") return 4;
    return 5;
  }

  function suggestedHighlightPriority(result) {
    const name = normalizeText(limparNomeIndicador(result.indicador.indicador));
    const index = HIGHLIGHT_INDICATORS.findIndex((item) => name.includes(item));
    return index === -1 ? 99 : index;
  }

  function selectedHighlightResults(results) {
    const used = new Set();
    return [...results]
      .filter((result) => {
        if (used.has(result.indicador.id)) return false;
        used.add(result.indicador.id);
        return true;
      })
      .sort((a, b) => (
        highlightPriority(a) - highlightPriority(b) ||
        suggestedHighlightPriority(a) - suggestedHighlightPriority(b) ||
        (PLAN_ORDER[a.indicador.plano] || 99) - (PLAN_ORDER[b.indicador.plano] || 99) ||
        Number(a.indicador.numero) - Number(b.indicador.numero)
      ))
      .slice(0, HIGHLIGHT_LIMIT);
  }

  function selectedFilters() {
    const filters = Object.fromEntries(
      [...document.querySelectorAll("[data-executive-filter]")]
        .map((select) => [select.dataset.executiveFilter, select.value])
    );
    if (shouldHideStatusColumn()) {
      filters.status = "Todos";
    }
    return filters;
  }

  function fillSelect(select, values) {
    const current = select.value;
    select.innerHTML = values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
    if (values.includes(current)) select.value = current;
  }

  function renderExecutiveTableHeader() {
    const table = document.querySelector(".tabela-executiva");
    if (!table) return;
    table.classList.toggle("sem-coluna-status", shouldHideStatusColumn());
    table.querySelector("thead").innerHTML = `
      <tr>
        <th>Plano</th>
        <th>Pilar</th>
        <th>Indicador</th>
        <th>Última competência</th>
        <th>Meta</th>
        <th>Resultado oficial</th>
        <th class="col-situacao">Situação</th>
        ${shouldHideStatusColumn() ? "" : '<th class="col-status">Status</th>'}
        <th>Ações</th>
      </tr>
    `;
  }

  function updateExecutiveVisibilityByProfile() {
    const statusSelect = document.querySelector('[data-executive-filter="status"]');
    const statusFilter = statusSelect?.closest("label");
    const catalogLink = document.querySelector(".executive-detail-link");
    const heading = document.querySelector(".executive-heading");
    const content = document.querySelector(".executive-content");
    const filtersPanel = document.querySelector(".executive-filters");
    const hideInstitutionalHeading = isUsuarioCompanhia(state.user?.perfil);
    if (statusFilter) {
      statusFilter.hidden = shouldHideStatusColumn();
    }
    if (filtersPanel) {
      filtersPanel.classList.toggle("sem-status", shouldHideStatusColumn());
    }
    if (statusSelect && shouldHideStatusColumn()) {
      statusSelect.value = "Todos";
    }
    if (catalogLink) {
      catalogLink.hidden = isUsuarioCompanhia(state.user?.perfil);
    }
    if (heading) {
      heading.hidden = hideInstitutionalHeading;
    }
    if (content) {
      content.classList.toggle("resumo-sem-heading", hideInstitutionalHeading);
    }
    renderExecutiveTableHeader();
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
    updateExecutiveVisibilityByProfile();
  }

  function updatePeriodFilters() {
    const period = document.querySelector('[data-executive-filter="periodo"]').value;
    const competence = document.querySelector('[data-executive-filter="competencia"]');
    const status = document.querySelector('[data-executive-filter="status"]');
    if (period === "Trimestral") {
      fillSelect(competence, QuarterlyConsolidation.QUARTERS.map((item) => `${item.label}/2026`));
      fillSelect(status, ["Todos", "Sem dados", "Parcial", "Fechado"]);
      updateExecutiveVisibilityByProfile();
      return;
    }
    if (period === "Anual") {
      fillSelect(competence, ["2026"]);
      fillSelect(status, ["Todos", "Não iniciado", ...unique(state.launches.map((item) => item.status)).filter((item) => item !== "Não iniciado")]);
      updateExecutiveVisibilityByProfile();
      return;
    }
    fillSelect(competence, ["Última disponível", ...MONTHS.map(([, name]) => name)]);
    fillSelect(status, ["Todos", "Não iniciado", ...unique(state.launches.map((item) => item.status)).filter((item) => item !== "Não iniciado")]);
    updateExecutiveVisibilityByProfile();
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
          (filters.situacao === "Todas" || displaySituation(result) === normalizeSituation(filters.situacao))
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
      (filters.situacao === "Todas" || displaySituation(result) === normalizeSituation(filters.situacao))
    ));
  }

  function aggregate(results) {
    const situations = results.map((item) => normalizeSituation(displaySituation(item)));
    const statuses = results.map(displayStatus);
    return {
      total: results.length,
      achieved: situations.filter((item) => item === "Atingido").length,
      attention: situations.filter((item) => item === "Abaixo da meta").length,
      noData: situations.filter((item) => item === "Sem dados").length,
      homologated: statuses.filter((item) => item === "Homologado" || item === "Fechado").length,
      pending: statuses.filter((item) => item === "Enviado para homologação" || item === "Parcial").length
    };
  }

  function renderCards(results) {
    const totals = aggregate(results);
    const cards = [
      { label: "Total de indicadores", value: totals.total, tone: "total", filter: "todos" },
      { label: "Indicadores atingidos", value: totals.achieved, tone: "ok", filter: "atingido" },
      { label: "Indicadores abaixo da meta", value: totals.attention, tone: "warn", filter: "abaixo_da_meta" },
      { label: "Indicadores sem dados", value: totals.noData, tone: "neutral", filter: "sem_dados" },
      { label: "Indicadores homologados", value: totals.homologated, tone: "info" },
      { label: "Pendentes de homologação", value: totals.pending, tone: "pending" }
    ];
    const visibleCards = shouldHideOperationalHomologationCards()
      ? cards.filter((card) => card.tone !== "info" && card.tone !== "pending")
      : cards;
    const target = document.getElementById("executiveCards");
    target.classList.toggle("usuario-companhia", shouldHideOperationalHomologationCards());
    target.innerHTML = visibleCards.map(({ label, value, tone, filter }) => {
      const active = filter && filter !== "todos" && state.summaryCardFilter === filter;
      const filterAttrs = filter
        ? `role="button" tabindex="0" aria-pressed="${active ? "true" : "false"}" data-summary-card-filter="${filter}"`
        : "";
      return `
      <article class="executive-summary-card executive-tone-${tone} ${filter ? "is-filterable" : ""} ${active ? "is-active" : ""}" ${filterAttrs}>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
    }).join("");
  }

  function groupByPillar(results) {
    const represented = unique(results.map((item) => item.indicador.pilar));
    const pillars = [
      ...PILLAR_ORDER,
      ...represented.filter((pillar) => !PILLAR_ORDER.includes(pillar))
    ];
    return pillars.map((pillar) => {
      const items = results.filter((item) => item.indicador.pilar === pillar);
      const totals = aggregate(items);
      return {
        pillar,
        items,
        ...totals,
        attainedPercent: totals.total ? totals.achieved / totals.total : 0,
        attainedPercentage: totals.total ? (totals.achieved / totals.total) * 100 : 0
      };
    });
  }

  function pillarIcon(pillar) {
    const icons = {
      "cliente no centro": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0"/><path d="M12 3v2m0 6v2m-5-5H5m14 0h-2"/></svg>',
      "eficiencia e rentabilidade": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16"/><path d="M7 15v-4m5 4V6m5 9V9"/><path d="M8 5h8a3 3 0 0 1 0 6h-8a3 3 0 0 1 0-6Z"/><path d="M12 5v6"/></svg>',
      "tecnologia e inovacao": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/><circle cx="12" cy="12" r="4"/><path d="m5 5 3 3m8 8 3 3m0-14-3 3M8 16l-3 3"/></svg>',
      "pessoas, cultura e agilidade": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a3 3 0 1 0-3-3"/><path d="M8 11a3 3 0 1 1 3-3"/><path d="M4 20a5 5 0 0 1 8 0"/><path d="M12 20a5 5 0 0 1 8 0"/></svg>',
      "sustentabilidade e cidadania": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20c7-1 13-7 14-14-7 1-13 7-14 14Z"/><path d="M5 20c1-5 4-8 9-10"/><path d="M4 13c-1-4 1-7 5-9 1 3 0 5-2 7"/></svg>',
      "atuacao em ecossistema": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/><path d="M7 6.5A12 12 0 0 0 17 6.5M7 17.5a12 12 0 0 1 10 0"/></svg>'
    };
    return icons[normalizeText(pillar)] || '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 3"/></svg>';
  }

  function gaugeColor(percent) {
    if (percent >= 80) return "#35d65b";
    if (percent >= 50) return "#ffc233";
    if (percent > 0) return "#ff7a00";
    return "#7f94ad";
  }

  function gaugeTone(percent) {
    if (percent >= 80) return "ok";
    if (percent >= 50) return "warn";
    if (percent > 0) return "attention";
    return "neutral";
  }

  function renderPillarGauges(groups) {
    const target = document.getElementById("executivePillarGauges");
    if (!target) return;
    target.innerHTML = groups.map((group) => {
      const percent = Number(group.attainedPercentage || 0);
      const percentLabel = percent.toLocaleString("pt-BR", { maximumFractionDigits: percent % 1 ? 1 : 0 });
      const active = state.chartFilter.pilar && normalizeText(state.chartFilter.pilar) === normalizeText(group.pillar) && !state.chartFilter.situacao;
      return `
        <button
          class="pilar-gauge-card pilar-gauge-${gaugeTone(percent)} ${active ? "is-active" : ""}"
          type="button"
          data-gauge-pilar="${escapeHtml(group.pillar)}"
          style="--gauge-color:${gaugeColor(percent)};"
          aria-label="${escapeHtml(group.pillar)}: ${percentLabel}% de indicadores atingidos"
        >
          <span class="pilar-card-header">
            <span class="pilar-icon">${pillarIcon(group.pillar)}</span>
            <span>${escapeHtml(group.pillar)}</span>
          </span>
          <span class="gauge" style="--percentual:${Math.max(0, Math.min(percent, 100))};">
            <span class="gauge-inner"><strong>${percentLabel}%</strong></span>
          </span>
          <span class="pilar-card-footer">${group.total ? `${group.achieved} de ${group.total} atingidos` : "Sem indicadores no recorte"}</span>
        </button>
      `;
    }).join("");
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
          <span><strong>${group.attention}</strong> abaixo da meta</span>
          <span><strong>${group.noData}</strong> sem dados</span>
        </div>
        <div class="executive-progress" aria-label="${(group.attainedPercent * 100).toFixed(0)}% atingidos">
          <span style="width:${Math.min(group.attainedPercent * 100, 100)}%"></span>
        </div>
        <p>${(group.attainedPercent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% atingidos</p>
      </article>
    `).join("");
  }

  function renderInsights(results, groups) {
    const attentionPillar = [...groups].sort((a, b) => b.attention - a.attention || b.total - a.total)[0];
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
        <span>Pilar com mais indicadores abaixo da meta</span>
        <strong>${attentionPillar && attentionPillar.attention ? escapeHtml(attentionPillar.pillar) : "Nenhum pilar abaixo da meta"}</strong>
        <p>${attentionPillar && attentionPillar.attention ? `${attentionPillar.attention} indicador${attentionPillar.attention === 1 ? "" : "es"} abaixo da meta` : "Não há indicadores abaixo da meta no recorte atual."}</p>
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
      noData: group.items.filter((item) => chartSituation(item) === "Sem dados").length
    }));

    if (!groups.length || !window.Chart) return;
    const chartSegments = [
      { label: "Atingidos", situation: "Atingido", key: "achieved", color: "#35d65b", muted: "rgba(53, 214, 91, 0.26)" },
      { label: "Abaixo da meta", situation: "Abaixo da meta", key: "attention", color: "#ff9800", muted: "rgba(255, 152, 0, 0.28)" },
      { label: "Sem dados", situation: "Sem dados", key: "noData", color: "#91a7bd", muted: "rgba(145, 167, 189, 0.32)" }
    ];
    const activeFilter = hasChartFilter();
    const isSelectedSegment = (row, situation) => (
      activeFilter &&
      normalizeText(row.pillar) === normalizeText(state.chartFilter.pilar) &&
      (!state.chartFilter.situacao || situation === state.chartFilter.situacao)
    );
    chartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels: rows.map((row) => row.pillar),
        datasets: chartSegments.map((segment) => ({
          label: segment.label,
          data: rows.map((row) => row[segment.key]),
          backgroundColor: rows.map((row) => !activeFilter || isSelectedSegment(row, segment.situation) ? segment.color : segment.muted),
          borderColor: rows.map((row) => isSelectedSegment(row, segment.situation) ? "#14345d" : "transparent"),
          borderWidth: rows.map((row) => isSelectedSegment(row, segment.situation) ? 3 : 0),
          borderSkipped: false
        }))
      },
      options: {
        indexAxis: "y",
        responsive: true,
        onClick: (event, elements, chart) => {
          const points = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);
          const point = points[0];
          if (!point) return;
          const row = rows[point.index];
          const segment = chartSegments[point.datasetIndex];
          if (!row || !segment || !row[segment.key]) return;
          applyChartFilter(row.pillar, segment.situation);
        },
        onHover: (event, elements) => {
          const point = elements && elements[0];
          const row = point ? rows[point.index] : null;
          const segment = point ? chartSegments[point.datasetIndex] : null;
          canvas.style.cursor = row && segment && row[segment.key] ? "pointer" : "default";
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: () => "",
              label: (context) => {
                const segment = chartSegments[context.datasetIndex];
                const quantity = Number(context.raw || 0);
                return [
                  `Pilar: ${context.label}`,
                  `Situação: ${segment.situation}`,
                  `Quantidade: ${quantity} indicador${quantity === 1 ? "" : "es"}`
                ];
              }
            }
          }
        },
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
          y: { stacked: true }
        }
      }
    });
  }

  function highlightCard(result, duplicate = false) {
    const name = limparNomeIndicador(result.indicador.indicador);
    const officialResult = result.lancamento ? StrategicResults.formatOfficialResult(result) : "-";
    const meta = StrategicResults.formatOfficialMeta(result);
    const situation = displaySituation(result);
    const status = displayStatus(result);
    const competence = result.competencia || "-";
    const active = Number(result.indicador.id) === Number(state.highlightFilterId);
    const showOperationalStatus = shouldShowOperationalStatusInHighlights();
    const tooltipLines = [
      `Indicador: ${name}`,
      `Resultado oficial: ${officialResult}`,
      `Meta: ${meta}`,
      `Situacao: ${situation}`
    ];
    if (showOperationalStatus) {
      tooltipLines.push(`Status: ${status}`);
    }
    tooltipLines.push(`Ultima competencia: ${competence}`);
    const tooltip = tooltipLines.join("\n");
    return `
      <button
        class="executive-highlight-card ${active ? "is-active" : ""}"
        type="button"
        data-highlight-indicator-id="${result.indicador.id}"
        title="${escapeHtml(tooltip)}"
        ${duplicate ? 'aria-hidden="true" tabindex="-1"' : ""}
      >
        <span class="executive-highlight-name">${escapeHtml(name)}</span>
        <strong>${officialResult}</strong>
        <span class="badge ${badgeClass(situation)}">${escapeHtml(situation)}</span>
        <span class="executive-highlight-footer">
          <span>${escapeHtml(competence)}</span>
          ${showOperationalStatus ? `<span class="badge ${badgeClass(status)}">${escapeHtml(status)}</span>` : ""}
        </span>
      </button>
    `;
  }

  function renderHighlights(results) {
    const section = document.getElementById("executiveHighlights");
    const track = document.getElementById("executiveHighlightsTrack");
    const empty = document.getElementById("executiveHighlightsEmpty");
    const toggle = document.getElementById("toggleExecutiveHighlights");
    if (!section || !track || !empty || !toggle) return;

    const highlights = selectedHighlightResults(results);
    section.hidden = false;
    empty.hidden = Boolean(highlights.length);
    toggle.disabled = highlights.length < 2;
    toggle.textContent = state.highlightsPaused ? "Continuar" : "Pausar";
    track.classList.toggle("is-paused", state.highlightsPaused);
    track.classList.toggle("is-static", highlights.length < 2);
    track.innerHTML = highlights.length
      ? [
        ...highlights.map((result) => highlightCard(result)),
        ...highlights.map((result) => highlightCard(result, true))
      ].join("")
      : "";
  }

  function renderChartFilterBanner() {
    const banner = document.getElementById("executiveChartFilterBanner");
    const text = document.getElementById("executiveChartFilterText");
    const clearChart = document.getElementById("clearExecutiveChartFilter");
    const clearSummaryCard = document.getElementById("clearExecutiveSummaryCardFilter");
    const clearHighlight = document.getElementById("clearExecutiveHighlightFilter");
    if (!banner || !text) return;
    const filters = [];
    const summarySituation = SUMMARY_CARD_FILTERS[state.summaryCardFilter]?.situation || null;
    if (hasChartFilter() && summarySituation && !state.chartFilter.situacao) {
      filters.push(`${state.chartFilter.pilar} > ${summarySituation}`);
    } else if (hasChartFilter()) {
      filters.push(state.chartFilter.situacao
        ? `${state.chartFilter.pilar} > ${state.chartFilter.situacao}`
        : `Pilar > ${state.chartFilter.pilar}`);
    }
    if (hasSummaryCardFilter() && !(hasChartFilter() && summarySituation && !state.chartFilter.situacao)) {
      filters.push(SUMMARY_CARD_FILTERS[state.summaryCardFilter]?.label || "Filtro dos cards");
    }
    if (hasHighlightFilter()) {
      const indicator = state.indicators.find((item) => Number(item.id) === Number(state.highlightFilterId));
      filters.push(limparNomeIndicador(indicator?.indicador || "Indicador selecionado"));
    }

    if (!filters.length) {
      banner.hidden = true;
      text.textContent = "";
      if (clearChart) clearChart.hidden = true;
      if (clearSummaryCard) clearSummaryCard.hidden = true;
      if (clearHighlight) clearHighlight.hidden = true;
      return;
    }
    banner.hidden = false;
    text.textContent = `Filtro aplicado: ${filters.join(" | ")}`;
    if (clearChart) clearChart.hidden = !hasChartFilter();
    if (clearSummaryCard) clearSummaryCard.hidden = !hasSummaryCardFilter();
    if (clearHighlight) clearHighlight.hidden = !hasHighlightFilter();
  }

  function renderTable(results) {
    const target = document.getElementById("executiveTable");
    renderExecutiveTableHeader();
    const ordered = [...results].sort((a, b) => (
      (PLAN_ORDER[a.indicador.plano] || 99) - (PLAN_ORDER[b.indicador.plano] || 99) ||
      PILLAR_ORDER.indexOf(a.indicador.pilar) - PILLAR_ORDER.indexOf(b.indicador.pilar) ||
      Number(a.indicador.numero) - Number(b.indicador.numero)
    ));
    document.getElementById("executiveResultCount").textContent = `${ordered.length} indicador${ordered.length === 1 ? "" : "es"}`;
    if (!ordered.length) {
      const emptyMessage = hasSummaryCardFilter()
        ? "Nenhum indicador encontrado para o filtro selecionado."
        : "Nenhum indicador encontrado para os filtros selecionados.";
      target.innerHTML = `<tr><td colspan="${shouldHideStatusColumn() ? 8 : 9}">${emptyMessage}</td></tr>`;
      return;
    }
    target.innerHTML = ordered.map((result) => {
      const situation = displaySituation(result);
      const status = displayStatus(result);
      return `
        <tr>
          <td><span class="executive-plan-chip executive-plan-${result.indicador.plano.toLowerCase()}">${escapeHtml(result.indicador.plano)}</span></td>
          <td>${escapeHtml(result.indicador.pilar)}</td>
          <td class="indicator-name">${escapeHtml(limparNomeIndicador(result.indicador.indicador))}</td>
          <td>${escapeHtml(result.competencia || "-")}</td>
          <td>${StrategicResults.formatOfficialMeta(result)}</td>
          <td class="official-value">${result.lancamento ? StrategicResults.formatOfficialResult(result) : "-"}</td>
          <td class="col-situacao"><span class="badge badge-situacao ${badgeClass(situation)} ${String(situation).length > 16 ? "long" : ""}">${escapeHtml(situation)}</span></td>
          ${shouldHideStatusColumn() ? "" : `<td class="col-status"><span class="badge badge-status ${badgeClass(status)}">${escapeHtml(status)}</span></td>`}
          <td><a class="secondary-action table-action dashboard-action" href="${window.AppRoutes ? window.AppRoutes.page("indicadores") : "indicadores.html"}?view=detalhe&id=${result.indicador.id}&origem=resumo-executivo" title="Visualizar indicador">Ver</a></td>
        </tr>
      `;
    }).join("");
  }

  function refresh() {
    const results = getFilteredResults();
    const chartResults = filterResultsByChart(results);
    const summaryCardResults = filterResultsBySummaryCard(chartResults);
    const tableResults = filterResultsByHighlight(summaryCardResults);
    const groups = groupByPillar(results);
    renderCards(results);
    renderPillarGauges(groups);
    renderChart(groups);
    renderHighlights(results);
    renderChartFilterBanner();
    renderTable(tableResults);
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicators: Auth.filterIndicatorsByUser(data.indicadores, user),
      launches: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      rules: data.regrasIndicadores || [],
      chartFilter: {
        pilar: null,
        situacao: null
      },
      summaryCardFilter: null,
      highlightFilterId: null,
      highlightsPaused: false
    };
    fillFilters();
    document.querySelectorAll("[data-executive-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        if (select.dataset.executiveFilter === "periodo") updatePeriodFilters();
        refresh();
      });
    });
    document.getElementById("clearExecutiveChartFilter")?.addEventListener("click", clearChartFilter);
    document.getElementById("clearExecutiveSummaryCardFilter")?.addEventListener("click", clearSummaryCardFilter);
    document.getElementById("clearExecutiveHighlightFilter")?.addEventListener("click", clearHighlightFilter);
    document.getElementById("viewAllExecutiveIndicators")?.addEventListener("click", clearInteractiveFilters);
    document.getElementById("toggleExecutiveHighlights")?.addEventListener("click", () => {
      state.highlightsPaused = !state.highlightsPaused;
      renderHighlights(getFilteredResults());
    });
    document.getElementById("executiveHighlightsTrack")?.addEventListener("click", (event) => {
      const item = event.target instanceof Element
        ? event.target.closest("[data-highlight-indicator-id]")
        : null;
      if (!item) return;
      applyHighlightFilter(Number(item.dataset.highlightIndicatorId));
    });
    document.getElementById("executiveCards")?.addEventListener("click", (event) => {
      const item = event.target instanceof Element
        ? event.target.closest("[data-summary-card-filter]")
        : null;
      if (!item) return;
      applySummaryCardFilter(item.dataset.summaryCardFilter);
    });
    document.getElementById("executiveCards")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const item = event.target instanceof Element
        ? event.target.closest("[data-summary-card-filter]")
        : null;
      if (!item) return;
      event.preventDefault();
      applySummaryCardFilter(item.dataset.summaryCardFilter);
    });
    document.getElementById("executivePillarGauges")?.addEventListener("click", (event) => {
      const item = event.target instanceof Element
        ? event.target.closest("[data-gauge-pilar]")
        : null;
      if (!item) return;
      applyPillarGaugeFilter(item.dataset.gaugePilar);
    });
    updatePeriodFilters();
    refresh();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.resumoExecutivo = { init };
})();
