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
  const RVD_INDICATOR_IDS = new Set([2, 5, 6, 7]);
  const VIEW_SCOPE = Object.freeze({ OWN: "own", GENERAL: "general" });
  const EXPECTED_GENERAL_INDICATOR_COUNT = 23;
  const SUMMARY_CARD_FILTERS = {
    atingido: { label: "Indicadores atingidos", situation: "Atingido" },
    abaixo_da_meta: { label: "Indicadores abaixo da meta", situation: "Abaixo da meta" },
    sem_dados: { label: "Indicadores sem dados", situation: "Sem dados" }
  };
  const CHART_DEVICE_PIXEL_RATIO = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
  let chartInstance = null;
  let state = {
    data: null,
    user: null,
    indicators: [],
    launches: [],
    rules: [],
    operationalFrequencies: [],
    prazos: [],
    viewScope: VIEW_SCOPE.GENERAL,
    viewScopeDatasets: { own: null, general: null },
    responsibilityIndicatorIds: new Set(),
    viewScopeLoading: false,
    chartFilter: {
      pilar: null,
      situacao: null
    },
    summaryCardFilter: null,
    indicatorFilterId: null
  };

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function toFiniteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isRvdIndicator(indicator) {
    return RVD_INDICATOR_IDS.has(Number(indicator?.id));
  }

  function planBadgesMarkup(indicator) {
    const plan = String(indicator?.plano || "");
    const planBadge = `<span class="executive-plan-chip executive-plan-${plan.toLowerCase()}">${escapeHtml(plan)}</span>`;
    const rvdBadge = isRvdIndicator(indicator)
      ? '<span class="executive-plan-chip plan-badge--rvd" title="Remuneração Variável por Desempenho">RVD</span>'
      : "";
    return `<span class="executive-plan-badges">${planBadge}${rvdBadge}</span>`;
  }

  function limparNomeIndicador(nome) {
    return String(nome || "").replace(/^\s*\d+\.\s*/, "").trim();
  }

  function indicatorNumberLabel(indicator) {
    const number = Number(indicator?.numero);
    if (!Number.isFinite(number)) return "--";
    return String(number).padStart(2, "0");
  }

  function shortIndicatorName(indicator) {
    const name = limparNomeIndicador(indicator?.indicador);
    const normalized = normalizeText(name);
    const displayNames = [
      { match: "gross gaming revenue", label: "GGR" },
      { match: "lucro liquido recorrente", label: "Lucro Recorrente" },
      { match: "indice de eficiencia operacional", label: "IEO" },
      { match: "vendas com meio de pagamento pix", label: "Vendas Pix" },
      { match: "vendas provenientes de canais digitais", label: "Vendas Canais Digitais" },
      { match: "indice de satisfacao de clientes", label: "NPS" },
      { match: "indice de ofertas personalizadas", label: "Índ. Ofertas Personalizadas" },
      { match: "indice de clientes ativos em canais digitais", label: "Canais Digitais" },
      { match: "aprimoramento da experiencia do cliente", label: "Experiência do Cliente" },
      { match: "share da plataforma de jogos", label: "Share Plataforma Jogos" },
      { match: "ampliar capacidade de desenvolvimento", label: "Capacidade TIC" },
      { match: "disponibilidade", label: "Disponibilidade Sistemas" },
      { match: "backlog", label: "Backlog de TI" },
      { match: "clima organizacional", label: "Clima Organizacional" },
      { match: "engajamento", label: "Engajamento" },
      { match: "mulheres chefes de unidade", label: "Mulheres Gestoras" },
      { match: "gestores negros", label: "Gestores Diversidade/PcD" },
      { match: "capacitacao dos empregados", label: "Treinamento p/ Colaborador" },
      { match: "treinamento", label: "Treinamento p/ Colaborador" },
      { match: "inovacao e novos produtos", label: "Inovação e Novos Produtos" },
      { match: "agilidade no atendimento", label: "Agilidade Atendimento RH" },
      { match: "apoio ao desenvolvimento socioambiental", label: "Apoio Socioambiental" },
      { match: "repasse social", label: "Repasse Social" },
      { match: "principios de jogo responsavel", label: "Princípios de Jogo Responsável" },
      { match: "incentivo socioambiental", label: "Incentivo Socioambiental" },
      { match: "visibilidade dos repasses sociais", label: "Visibilidade Repasses Sociais" },
      { match: "jogo responsavel 2026", label: "Jogo Responsável 2026" },
      { match: "arrecadacao gerada com o ecossistema", label: "Arrecadação Ecossistema" },
      { match: "pegada de carbono", label: "Pegada de Carbono" },
      { match: "pdvs parceiros", label: "PDVs Parceiros" },
      { match: "parcerias estrategicas", label: "Parcerias Estratégicas" },
      { match: "participacao da rede loterica", label: "Participação Rede Lotérica" },
      { match: "rede loterica", label: "Rede Lotérica" }
    ];
    const mapped = displayNames.find((item) => normalized.includes(item.match));
    if (mapped) return mapped.label;
    const parentheticalAcronym = name.match(/\(([A-Z0-9]{2,10})\)/);
    if (parentheticalAcronym) return parentheticalAcronym[1].trim();
    const dashAcronym = name.match(/[—-]\s*([A-Z0-9]{2,10})\s*$/);
    if (dashAcronym) return dashAcronym[1].trim();
    const leadingAcronym = name.match(/^([A-Z0-9]{2,10})(?=\s|$)/);
    if (leadingAcronym) return leadingAcronym[1].trim();
    return name;
  }

  function nomeIndicadorMapa(indicator) {
    return shortIndicatorName(indicator);
  }

  async function loadCentralExecutiveData(viewScope = VIEW_SCOPE.GENERAL) {
    const baseTarget = typeof window.appUrl === "function"
      ? window.appUrl("api/dashboard/dados")
      : `${window.APP_BASE_PATH || ""}/index.php?route=api/dashboard/dados`;
    const requestedScope = viewScope === VIEW_SCOPE.GENERAL ? "geral" : "proprio";
    const target = `${baseTarget}${baseTarget.includes("?") ? "&" : "?"}escopo=${requestedScope}`;
    const response = await window.fetch(target, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    const data = payload?.dados;
    if (!response.ok || payload?.sucesso === false || !data) {
      throw new Error(payload?.mensagem || "Não foi possível consultar a fonte central do Resumo Executivo.");
    }
    if (![data.indicadores, data.lancamentos, data.regrasIndicadores, data.frequenciasCobrancaOperacional, data.prazos].every(Array.isArray)) {
      throw new Error("A fonte central retornou dados incompletos para o Resumo Executivo.");
    }
    if (normalizeText(data.fonte?.driver) !== "sqlsrv") {
      throw new Error("O Resumo Executivo exige a fonte central SQL Server.");
    }
    if (normalizeText(data.escopoVisualizacao) !== requestedScope) {
      throw new Error("A fonte central retornou um escopo de visualização diferente do solicitado.");
    }
    return data;
  }

  function viewScopeProfileCode(user) {
    const code = normalizeText(user?.perfilCodigo).replace(/[\s-]+/g, "_");
    if (code) return code;
    const profile = normalizeText(user?.perfil).replace(/[\s-]+/g, "_");
    if (profile === "unidade_apuradora") return "unidade_apuradora";
    if (profile === "diretoria_homologadora" || profile === "homologador") return "homologador";
    return profile;
  }

  function canChooseViewScope(user = state.user) {
    return ["unidade_apuradora", "homologador"].includes(viewScopeProfileCode(user));
  }

  function defaultViewScope(user) {
    return canChooseViewScope(user) ? VIEW_SCOPE.OWN : VIEW_SCOPE.GENERAL;
  }

  function viewScopeStorageKey(user) {
    const identity = user?.matricula || user?.id || "anonimo";
    const sessionIdentity = user?.csrfToken || "sessao-atual";
    return `estrategia:resumo-executivo:escopo:${identity}:${sessionIdentity}`;
  }

  function storedViewScope(user) {
    const fallback = defaultViewScope(user);
    if (!canChooseViewScope(user)) return fallback;
    try {
      const stored = window.sessionStorage?.getItem(viewScopeStorageKey(user));
      return Object.values(VIEW_SCOPE).includes(stored) ? stored : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function persistViewScope() {
    if (!canChooseViewScope()) return;
    try {
      window.sessionStorage?.setItem(viewScopeStorageKey(state.user), state.viewScope);
    } catch (_error) {
      // O seletor continua funcional em memória quando o storage não está disponível.
    }
  }

  function activeIndicators(data) {
    return (data?.indicadores || []).filter((indicator) => indicator?.ativo !== false);
  }

  function collectionsForViewScope(data, user, viewScope) {
    const allIndicators = activeIndicators(data);
    const ownIndicators = Auth.filterIndicatorsByUser(allIndicators, user);
    const visibleIndicators = viewScope === VIEW_SCOPE.GENERAL ? allIndicators : ownIndicators;
    const visibleIds = new Set(visibleIndicators.map((indicator) => Number(indicator.id)));
    const allLaunches = data?.lancamentos || [];
    return {
      indicators: visibleIndicators,
      launches: allLaunches.filter((launch) => visibleIds.has(Number(launch.indicadorId))),
      responsibilityIndicatorIds: new Set(ownIndicators.map((indicator) => Number(indicator.id)))
    };
  }

  function applyCentralData(data, viewScope) {
    const collections = collectionsForViewScope(data, state.user, viewScope);
    const visibleIds = new Set(collections.indicators.map((indicator) => Number(indicator.id)));

    state.data = data;
    state.viewScope = viewScope;
    state.indicators = collections.indicators;
    state.launches = collections.launches;
    state.rules = data?.regrasIndicadores || [];
    state.operationalFrequencies = (data?.frequenciasCobrancaOperacional || [])
      .filter((item) => visibleIds.has(Number(item.indicadorId)));
    state.prazos = data?.prazos || [];
    state.responsibilityIndicatorIds = collections.responsibilityIndicatorIds;
  }

  function isOwnResponsibility(indicator) {
    return state.responsibilityIndicatorIds.has(Number(indicator?.id));
  }

  function responsibilityLabel() {
    return viewScopeProfileCode(state.user) === "unidade_apuradora"
      ? "Minha unidade"
      : "Minha diretoria";
  }

  function responsibilityBadgeMarkup(indicator) {
    if (!canChooseViewScope() || state.viewScope !== VIEW_SCOPE.GENERAL || !isOwnResponsibility(indicator)) {
      return "";
    }
    return `<span class="executive-responsibility-badge">${escapeHtml(responsibilityLabel())}</span>`;
  }

  function renderViewScopeSelector(message = "") {
    const selector = document.getElementById("executiveViewScope");
    if (!selector) return;
    const selectable = canChooseViewScope();
    selector.hidden = !selectable;
    if (!selectable) return;

    const generalData = state.viewScopeDatasets.general;
    const generalCount = generalData ? activeIndicators(generalData).length : EXPECTED_GENERAL_INDICATOR_COUNT;
    const countTarget = selector.querySelector("[data-general-indicator-count]");
    if (countTarget) countTarget.textContent = String(generalCount);

    selector.querySelectorAll("[data-executive-view-scope]").forEach((button) => {
      const active = button.dataset.executiveViewScope === state.viewScope;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.disabled = state.viewScopeLoading;
    });
    selector.setAttribute("aria-busy", state.viewScopeLoading ? "true" : "false");

    const note = document.getElementById("executiveViewScopeNote");
    if (!note) return;
    if (message) {
      note.textContent = message;
    } else if (state.viewScope === VIEW_SCOPE.GENERAL) {
      note.textContent = `Visão institucional somente para consulta. Indicadores do seu escopo estão marcados como “${responsibilityLabel()}”.`;
    } else {
      note.textContent = `Exibindo ${state.indicators.length} indicador${state.indicators.length === 1 ? "" : "es"} do seu escopo operacional.`;
    }
  }

  function sanitizeInteractiveFiltersForScope() {
    const visibleIds = new Set(state.indicators.map((indicator) => Number(indicator.id)));
    const visiblePillars = new Set(state.indicators.map((indicator) => normalizeText(indicator.pilar)));
    if (state.indicatorFilterId && !visibleIds.has(Number(state.indicatorFilterId))) {
      state.indicatorFilterId = null;
    }
    if (state.chartFilter.pilar && !visiblePillars.has(normalizeText(state.chartFilter.pilar))) {
      state.chartFilter = { pilar: null, situacao: null };
    }
  }

  async function setViewScope(nextScope) {
    if (!canChooseViewScope() || !Object.values(VIEW_SCOPE).includes(nextScope) || nextScope === state.viewScope) {
      return;
    }
    const previousScope = state.viewScope;
    let errorMessage = "";
    state.viewScopeLoading = true;
    renderViewScopeSelector();
    try {
      let data = state.viewScopeDatasets[nextScope];
      if (!data && nextScope === VIEW_SCOPE.OWN) {
        data = state.viewScopeDatasets.general;
      }
      if (!data) {
        data = await loadCentralExecutiveData(nextScope);
        state.viewScopeDatasets[nextScope] = data;
      }
      applyCentralData(data, nextScope);
      sanitizeInteractiveFiltersForScope();
      fillFilters();
      updatePeriodFilters();
      persistViewScope();
      refresh();
    } catch (error) {
      state.viewScope = previousScope;
      errorMessage = error?.message || "Não foi possível alterar o escopo de visualização.";
    } finally {
      state.viewScopeLoading = false;
      renderViewScopeSelector(errorMessage);
    }
  }

  function isOperationalCompetenceRequired(frequency, month) {
    const normalizedFrequency = normalizeText(frequency) || "mensal";
    const numericMonth = Number(month);
    if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) return false;
    if (normalizedFrequency === "trimestral") return numericMonth % 3 === 0;
    if (normalizedFrequency === "semestral") return numericMonth === 6 || numericMonth === 12;
    if (normalizedFrequency === "anual") return numericMonth === 12;
    return normalizedFrequency === "mensal";
  }

  function operationalFrequencyForIndicator(indicator) {
    const configured = state.operationalFrequencies.find(
      (item) => Number(item.indicadorId) === Number(indicator?.id)
    );
    return configured?.frequenciaCobrancaOperacional || "mensal";
  }

  function isExpectedDeadlineCycle(indicator, launch) {
    return isOperationalCompetenceRequired(
      operationalFrequencyForIndicator(indicator),
      launch?.mes
    );
  }

  function operationalLaunchForResult(result, referenceDate = new Date()) {
    if (!result?.indicador) return null;
    const filters = selectedFilters();
    const activeCompetences = (state.prazos || [])
      .filter((item) => item?.ativo !== false)
      .map((item) => String(item.competencia || ""))
      .filter((item) => /^\d{4}-\d{2}$/.test(item));
    const referenceCompetence = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
    let targetCompetence = null;

    if (filters.periodo === "Mensal") {
      const selectedMonth = MONTHS.find(([, name]) => name === filters.competencia)?.[0] || null;
      targetCompetence = selectedMonth
        ? `2026-${String(selectedMonth).padStart(2, "0")}`
        : activeCompetences.filter((item) => item <= referenceCompetence).sort().at(-1) || null;
    } else if (filters.periodo === "Trimestral") {
      const quarter = QuarterlyConsolidation.QUARTERS.find((item) => `${item.label}/2026` === filters.competencia);
      const months = quarter?.months || quarter?.meses || [];
      const competences = months.map((month) => `2026-${String(month).padStart(2, "0")}`);
      targetCompetence = activeCompetences.filter((item) => competences.includes(item) && item <= referenceCompetence).sort().at(-1) || null;
    } else {
      targetCompetence = activeCompetences.filter((item) => item.startsWith("2026-") && item <= referenceCompetence).sort().at(-1) || null;
    }

    if (!targetCompetence) return result.lancamentoAcao || result.lancamento || null;
    const launch = state.launches.find((item) => (
      Number(item.indicadorId) === Number(result.indicador.id) &&
      window.PrazoApuracao.competenceOf(item) === targetCompetence
    )) || null;
    return launch && isExpectedDeadlineCycle(result.indicador, launch) ? launch : null;
  }

  function deadlineStatusForResult(result, referenceDate = new Date()) {
    if (!window.PrazoApuracao) return null;
    const launch = operationalLaunchForResult(result, referenceDate);
    if (!launch) return null;
    const prazo = window.PrazoApuracao.findForLaunch(state.prazos, launch);
    return {
      ...window.PrazoApuracao.avaliar(launch, prazo, referenceDate),
      competencia: window.PrazoApuracao.competenceOf(launch),
      statusOperacional: launch.status
    };
  }

  function formatDeadlineCompetence(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return "-";
    const month = MONTHS.find(([number]) => number === Number(match[2]));
    return month ? `${month[1].slice(0, 3)}/${match[1]}` : value;
  }

  function deadlineAlertMarkup(deadlineStatus) {
    if (!deadlineStatus?.atrasado) return "";
    const tone = deadlineStatus.codigo === window.PrazoApuracao.STATUS.HOMOLOGACAO_ATRASADA
      ? "approval-overdue"
      : "fill-overdue";
    return `
      <span class="deadline-alert deadline-alert--${tone}" role="status">
        <strong><span aria-hidden="true">⚠</span> ${escapeHtml(deadlineStatus.mensagem)}</strong>
        <small>${escapeHtml(formatDeadlineCompetence(deadlineStatus.competencia))} · Prazo: ${escapeHtml(deadlineStatus.prazoFormatado)}</small>
      </span>
    `;
  }

  function performanceToneByPercent(percentual) {
    const percent = toFiniteNumber(percentual);
    if (percent === null) return "cinza";
    if (percent >= 1) return "verde";
    if (percent > 0.8) return "amarelo";
    return "vermelho";
  }

  function performanceToneLabel(tone) {
    if (tone === "verde") return "Meta atingida";
    if (tone === "amarelo") return "Atenção";
    if (tone === "vermelho") return "Crítico";
    return "Sem dados";
  }

  function performanceToneRank(tone) {
    if (tone === "verde") return 0;
    if (tone === "amarelo") return 1;
    if (tone === "vermelho") return 2;
    return 3;
  }

  function performancePercentLabel(percentual) {
    const percent = toFiniteNumber(percentual);
    if (percent === null) return "Sem percentual";
    return `${Calculations.formatarPercentual(percent)} da meta`;
  }

  function performancePercentValue(percentual) {
    const percent = toFiniteNumber(percentual);
    return percent === null ? "Sem percentual" : Calculations.formatarPercentual(percent);
  }

  function performanceMapSize(result, index) {
    const number = Number(result?.indicador?.numero);
    if ([3].includes(number)) return "tall";
    if ([13, 15, 17, 18, 21, 23].includes(number)) return "wide";
    if (index < 6) return "featured";
    return "normal";
  }

  function performanceVariation(currentPercent, previousPercent) {
    const current = toFiniteNumber(currentPercent);
    const previous = toFiniteNumber(previousPercent);
    if (current === null || previous === null) return null;
    const diff = (current - previous) * 100;
    if (Math.abs(diff) < 0.05) return { value: 0, direction: "flat" };
    return { value: diff, direction: diff > 0 ? "up" : "down" };
  }

  function formatPerformanceVariation(variation) {
    if (!variation) return "—";
    const abs = Math.abs(variation.value);
    const value = abs.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (variation.direction === "up") return `▲ +${value} p.p.`;
    if (variation.direction === "down") return `▼ -${value} p.p.`;
    return `→ ${value} p.p.`;
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

  function shouldShowOperationalStatusInPerformanceMap() {
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

  function summarySituationGroup(value) {
    const normalized = normalizeText(normalizeSituation(value));
    if (normalized === "atingido" || normalized === "atingida") return "atingido";
    if (normalized === "abaixo da meta" || normalized === "critico" || normalized === "nao atingido") return "abaixo_da_meta";
    return "sem_dados";
  }

  function chartSituation(result) {
    const group = summarySituationGroup(displaySituation(result));
    if (group === "atingido") return "Atingido";
    if (group === "abaixo_da_meta") return "Abaixo da meta";
    return "Sem dados";
  }

  function hasChartFilter() {
    return Boolean(state.chartFilter.pilar);
  }

  function clearInteractiveFilters(except = null) {
    if (except !== "chart") state.chartFilter = { pilar: null, situacao: null };
    if (except !== "summaryCard") state.summaryCardFilter = null;
    if (except !== "indicator") state.indicatorFilterId = null;
  }

  function clearChartFilter() {
    state.chartFilter = { pilar: null, situacao: null };
    refresh();
  }

  function scrollToExecutiveTable(delay = 0) {
    const target = document.querySelector(".executive-table-panel")
      || document.getElementById("executiveTableTitle")
      || document.querySelector(".tabela-executiva");
    if (!target) return;
    const scroll = () => target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (delay) {
      window.setTimeout(scroll, delay);
      return;
    }
    scroll();
  }

  function applyChartFilter(pilar, situacao, options = {}) {
    if (state.chartFilter.pilar === pilar && state.chartFilter.situacao === situacao) {
      clearInteractiveFilters();
      refresh();
      return;
    }
    clearInteractiveFilters("chart");
    state.chartFilter = { pilar, situacao };
    refresh();
    if (options.scrollToTable) scrollToExecutiveTable(100);
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
    return summarySituationGroup(value);
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
      clearInteractiveFilters();
    } else {
      const active = state.summaryCardFilter === type;
      clearInteractiveFilters("summaryCard");
      state.summaryCardFilter = active ? null : type;
    }
    refresh();
    scrollToExecutiveTable();
  }

  function applyPillarGaugeFilter(pilar) {
    if (state.chartFilter.pilar === pilar && !state.chartFilter.situacao) {
      clearInteractiveFilters();
      refresh();
      return;
    }
    clearInteractiveFilters("chart");
    state.chartFilter = { pilar, situacao: null };
    refresh();
    scrollToExecutiveTable();
  }

  function hasIndicatorFilter() {
    return Boolean(state.indicatorFilterId);
  }

  function clearIndicatorFilter() {
    state.indicatorFilterId = null;
    refresh();
  }

  function applyIndicatorFilter(indicadorId) {
    const id = Number(indicadorId);
    if (!Number.isFinite(id)) return;
    if (Number(state.indicatorFilterId) === id) {
      clearInteractiveFilters();
      refresh();
      return;
    }
    clearInteractiveFilters("indicator");
    state.indicatorFilterId = id;
    refresh();
    scrollToExecutiveTable();
  }

  function filterResultsByIndicator(results) {
    if (!hasIndicatorFilter()) return results;
    return results.filter((result) => Number(result.indicador.id) === Number(state.indicatorFilterId));
  }

  function previousMonthlyResult(result) {
    const filters = selectedFilters();
    const launch = result?.lancamento;
    if (filters.periodo !== "Mensal" || !result?.indicador || !launch) return null;
    const year = Number(launch.ano);
    const month = Number(launch.mes);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    const previousLaunches = state.launches.filter((item) => (
      Number(item.indicadorId) === Number(result.indicador.id) &&
      (
        Number(item.ano) < year ||
        (Number(item.ano) === year && Number(item.mes) < month)
      )
    ));
    if (!previousLaunches.length) return null;
    const summary = StrategicResults.calcularDashboard({
      indicadores: [result.indicador],
      lancamentos: previousLaunches,
      regras: state.rules
    });
    const previous = summary.resultadosOficiais[0] || null;
    if (!previous || !previous.lancamento || toFiniteNumber(previous.percentualAtingido) === null) return null;
    return previous;
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
    const ids = new Set(indicators.map((item) => Number(item.id)));
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
      ids.has(Number(launch.indicadorId)) &&
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
    const situations = results.map((item) => summarySituationGroup(displaySituation(item)));
    const statuses = results.map(displayStatus);
    const achieved = situations.filter((item) => item === "atingido").length;
    const attention = situations.filter((item) => item === "abaixo_da_meta").length;
    return {
      total: results.length,
      achieved,
      attention,
      noData: results.length - achieved - attention,
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
      const specificClass = filter === "abaixo_da_meta" ? "abaixo-meta" : "";
      const filterAttrs = filter
        ? `role="button" tabindex="0" aria-pressed="${active ? "true" : "false"}" data-summary-card-filter="${filter}"`
        : "";
      return `
      <article class="executive-summary-card executive-tone-${tone} ${specificClass} ${filter ? "is-filterable" : ""} ${active ? "is-active" : ""}" ${filterAttrs}>
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
      const pillarSituations = items.map(chartSituation);
      const achieved = pillarSituations.filter((item) => item === "Atingido").length;
      const attention = pillarSituations.filter((item) => item === "Abaixo da meta").length;
      const noData = pillarSituations.filter((item) => item === "Sem dados").length;
      const gaugeTotal = items.length;
      const attainedPercent = gaugeTotal ? achieved / gaugeTotal : 0;
      const statusGauge = !gaugeTotal || noData === gaugeTotal
        ? "Sem dados"
        : achieved === gaugeTotal
          ? "Atingido"
          : attention
            ? "Abaixo da meta"
            : "Em acompanhamento";
      return {
        pillar,
        items,
        ...totals,
        total: items.length,
        achieved,
        attention,
        noData,
        totalWithData: gaugeTotal,
        gaugeTotal,
        attainedPercent,
        attainedPercentage: attainedPercent * 100,
        statusGauge
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

  function gaugeColor(status) {
    if (status === "Atingido") return "#35d65b";
    if (status === "Abaixo da meta") return "#ff7a00";
    if (status === "Em acompanhamento") return "#f9c846";
    return "#91a7bd";
  }

  function gaugeTone(status) {
    if (status === "Atingido") return "ok";
    if (status === "Abaixo da meta") return "attention";
    if (status === "Em acompanhamento") return "progress";
    return "neutral";
  }

  function renderPillarGauges(groups) {
    const target = document.getElementById("executivePillarGauges");
    if (!target) return;
    target.innerHTML = groups.map((group) => {
      const percent = Number(group.attainedPercentage || 0);
      const percentLabel = percent.toLocaleString("pt-BR", { maximumFractionDigits: percent % 1 ? 1 : 0 });
      const active = state.chartFilter.pilar && normalizeText(state.chartFilter.pilar) === normalizeText(group.pillar) && !state.chartFilter.situacao;
      const countLabel = group.gaugeTotal && group.noData !== group.gaugeTotal
        ? `${group.achieved} de ${group.gaugeTotal} atingidos`
        : "Sem dados no período";
      return `
        <button
          class="pilar-gauge-card pilar-gauge-${gaugeTone(group.statusGauge)} ${active ? "is-active" : ""}"
          type="button"
          data-gauge-pilar="${escapeHtml(group.pillar)}"
          style="--gauge-color:${gaugeColor(group.statusGauge)};"
          aria-label="${escapeHtml(group.pillar)}: ${percentLabel}% de indicadores atingidos"
        >
          <span class="pilar-card-header">
            <span class="pilar-icon">${pillarIcon(group.pillar)}</span>
            <span>${escapeHtml(group.pillar)}</span>
          </span>
          <span class="gauge" style="--percentual:${Math.max(0, Math.min(percent, 100))};">
            <span class="gauge-inner"><strong>${percentLabel}%</strong></span>
          </span>
          <span class="pilar-card-footer">
            <span class="pilar-card-status">${escapeHtml(group.statusGauge)}</span>
            <span class="pilar-card-count">${escapeHtml(countLabel)}</span>
          </span>
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
      { label: "Atingido", situation: "Atingido", key: "achieved", color: "#35d65b", muted: "rgba(53, 214, 91, 0.26)" },
      { label: "Abaixo da meta", situation: "Abaixo da meta", key: "attention", color: "#ff7a00", muted: "rgba(255, 122, 0, 0.28)" },
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
        maintainAspectRatio: false,
        devicePixelRatio: CHART_DEVICE_PIXEL_RATIO,
        resizeDelay: 80,
        layout: {
          padding: {
            left: 4,
            right: 8,
            top: 4,
            bottom: 0
          }
        },
        onClick: (event, elements, chart) => {
          const points = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);
          const point = points[0];
          if (!point) return;
          const row = rows[point.index];
          const segment = chartSegments[point.datasetIndex];
          if (!row || !segment || !row[segment.key]) return;
          applyChartFilter(row.pillar, segment.situation, { scrollToTable: true });
        },
        onHover: (event, elements) => {
          const point = elements && elements[0];
          const row = point ? rows[point.index] : null;
          const segment = point ? chartSegments[point.datasetIndex] : null;
          canvas.style.cursor = row && segment && row[segment.key] ? "pointer" : "default";
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#d8efff",
              boxWidth: 12,
              boxHeight: 8,
              padding: 14,
              font: { size: 12, weight: "700", family: "Arial, Helvetica, sans-serif" }
            }
          },
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
          x: {
            stacked: true,
            beginAtZero: true,
            grid: { color: "rgba(175, 196, 221, 0.12)" },
            ticks: { color: "#afc4dd", precision: 0, font: { size: 11, weight: "600", family: "Arial, Helvetica, sans-serif" } }
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: "#f5f9ff", font: { size: 11, weight: "700", family: "Arial, Helvetica, sans-serif" } }
          }
        }
      }
    });
  }

  function performanceMapCard(result, index = 0) {
    const name = limparNomeIndicador(result.indicador.indicador);
    const shortName = nomeIndicadorMapa(result.indicador);
    const officialResult = (result.lancamento || result.trimestral) ? StrategicResults.formatOfficialResult(result) : "-";
    const meta = StrategicResults.formatOfficialMeta(result);
    const situation = displaySituation(result);
    const status = displayStatus(result);
    const competence = result.competencia || "-";
    const previous = previousMonthlyResult(result);
    const variation = performanceVariation(result.percentualAtingido, previous?.percentualAtingido);
    const variationLabel = formatPerformanceVariation(variation);
    const percentLabel = performancePercentLabel(result.percentualAtingido);
    const percentValue = performancePercentValue(result.percentualAtingido);
    const tone = performanceToneByPercent(result.percentualAtingido);
    const toneLabel = performanceToneLabel(tone);
    const active = Number(result.indicador.id) === Number(state.indicatorFilterId);
    const size = performanceMapSize(result, index);
    const showOperationalStatus = shouldShowOperationalStatusInPerformanceMap();
    const deadlineStatus = deadlineStatusForResult(result);
    const tooltipLines = [
      `Indicador: ${name}`,
      `Resultado oficial: ${officialResult}`,
      `Meta: ${meta}`,
      `Percentual de atingimento: ${percentLabel}`,
      `Competência: ${competence}`,
      `Resultado anterior: ${previous ? StrategicResults.formatOfficialResult(previous) : "-"}`,
      `Percentual anterior: ${previous ? performancePercentLabel(previous.percentualAtingido) : "Sem comparação"}`,
      `Variação: ${variationLabel}`,
      `Situação: ${situation}`
    ];
    if (deadlineStatus?.atrasado) {
      if (showOperationalStatus) tooltipLines.push(`Status do resultado oficial: ${status}`);
      tooltipLines.push(`Competência operacional: ${formatDeadlineCompetence(deadlineStatus.competencia)}`);
      tooltipLines.push(`Status operacional: ${deadlineStatus.statusOperacional}`);
      tooltipLines.push(`${deadlineStatus.mensagem} — prazo: ${deadlineStatus.prazoFormatado}`);
    } else if (showOperationalStatus) {
      tooltipLines.push(`Status: ${status}`);
    }
    const tooltip = tooltipLines.join("\n");
    return `
      <button
        class="executive-performance-card executive-performance-${tone} executive-performance-size-${size} ${active ? "is-active" : ""} ${deadlineStatus?.atrasado ? "has-deadline-alert" : ""}"
        type="button"
        data-indicator-id="${result.indicador.id}"
        data-map-index="${index}"
        data-map-size="${size}"
        title="${escapeHtml(tooltip)}"
        aria-pressed="${active ? "true" : "false"}"
        aria-label="${escapeHtml(`${indicatorNumberLabel(result.indicador)}. ${name}: ${toneLabel}`)}"
      >
        <span class="executive-performance-name">${escapeHtml(`${indicatorNumberLabel(result.indicador)}. ${shortName}`)}</span>
        <span class="executive-performance-main">
          <strong>${officialResult}</strong>
          <span class="executive-performance-percent">
            <b>${escapeHtml(percentValue)}</b>
            ${toFiniteNumber(result.percentualAtingido) === null ? "" : "<small>da meta</small>"}
          </span>
        </span>
        <span class="executive-performance-footer">
          <span class="executive-performance-variation executive-performance-variation-${variation?.direction || "none"}">${escapeHtml(variationLabel)}</span>
        </span>
        ${deadlineAlertMarkup(deadlineStatus)}
      </button>
    `;
  }

  function renderPerformanceMap(results) {
    const target = document.getElementById("executivePerformanceMapGroups");
    const empty = document.getElementById("executivePerformanceMapEmpty");
    if (!target || !empty) return;

    const ordered = [...results].sort((a, b) => (
      Number(b.percentualAtingido !== null && b.percentualAtingido !== undefined) - Number(a.percentualAtingido !== null && a.percentualAtingido !== undefined) ||
      performanceToneRank(performanceToneByPercent(a.percentualAtingido)) - performanceToneRank(performanceToneByPercent(b.percentualAtingido)) ||
      (PLAN_ORDER[a.indicador.plano] || 99) - (PLAN_ORDER[b.indicador.plano] || 99) ||
      Number(a.indicador.numero) - Number(b.indicador.numero)
    ));
    empty.hidden = Boolean(ordered.length);
    target.innerHTML = ordered.map((result, index) => performanceMapCard(result, index)).join("");
  }

  function renderChartFilterBanner() {
    const banner = document.getElementById("executiveChartFilterBanner");
    const text = document.getElementById("executiveChartFilterText");
    const clearChart = document.getElementById("clearExecutiveChartFilter");
    const clearSummaryCard = document.getElementById("clearExecutiveSummaryCardFilter");
    const clearIndicator = document.getElementById("clearExecutiveIndicatorFilter");
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
    if (hasIndicatorFilter()) {
      const indicator = state.indicators.find((item) => Number(item.id) === Number(state.indicatorFilterId));
      filters.push(limparNomeIndicador(indicator?.indicador || "Indicador selecionado"));
    }

    if (!filters.length) {
      banner.hidden = true;
      text.textContent = "";
      if (clearChart) clearChart.hidden = true;
      if (clearSummaryCard) clearSummaryCard.hidden = true;
      if (clearIndicator) clearIndicator.hidden = true;
      return;
    }
    banner.hidden = false;
    text.textContent = `Filtro aplicado: ${filters.join(" | ")}`;
    if (clearChart) clearChart.hidden = !hasChartFilter();
    if (clearSummaryCard) clearSummaryCard.hidden = !hasSummaryCardFilter();
    if (clearIndicator) clearIndicator.hidden = !hasIndicatorFilter();
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
          <td>${planBadgesMarkup(result.indicador)}</td>
          <td>${escapeHtml(result.indicador.pilar)}</td>
          <td class="indicator-name"><span class="executive-indicator-cell"><span>${escapeHtml(limparNomeIndicador(result.indicador.indicador))}</span>${responsibilityBadgeMarkup(result.indicador)}</span></td>
          <td>${escapeHtml(result.competencia || "-")}</td>
          <td>${StrategicResults.formatOfficialMeta(result)}</td>
          <td class="official-value">${result.lancamento ? StrategicResults.formatOfficialResult(result) : "-"}</td>
          <td class="col-situacao"><span class="badge badge-situacao ${badgeClass(situation)} ${String(situation).length > 16 ? "long" : ""}">${escapeHtml(situation)}</span></td>
          ${shouldHideStatusColumn() ? "" : `<td class="col-status"><span class="badge badge-status ${badgeClass(status)}">${escapeHtml(status)}</span></td>`}
          <td><a class="secondary-action table-action dashboard-action" href="${window.AppRoutes ? window.AppRoutes.page("indicadores", { view: "detalhe", id: result.indicador.id, origem: "resumo-executivo" }) : `/indicadores?view=detalhe&id=${result.indicador.id}&origem=resumo-executivo`}" title="Visualizar indicador">Ver</a></td>
        </tr>
      `;
    }).join("");
  }

  function refresh() {
    const results = getFilteredResults();
    const chartResults = filterResultsByChart(results);
    const summaryCardResults = filterResultsBySummaryCard(chartResults);
    const tableResults = filterResultsByIndicator(summaryCardResults);
    const groups = groupByPillar(results);
    renderCards(results);
    renderPerformanceMap(results);
    renderPillarGauges(groups);
    renderChart(groups);
    renderChartFilterBanner();
    renderTable(tableResults);
  }

  async function init({ user }) {
    const initialScope = storedViewScope(user);
    const data = await loadCentralExecutiveData(initialScope);
    state = {
      data: null,
      user,
      indicators: [],
      launches: [],
      rules: [],
      operationalFrequencies: [],
      prazos: [],
      viewScope: initialScope,
      viewScopeDatasets: { own: null, general: null },
      responsibilityIndicatorIds: new Set(),
      viewScopeLoading: false,
      chartFilter: {
        pilar: null,
        situacao: null
      },
      summaryCardFilter: null,
      indicatorFilterId: null
    };
    state.viewScopeDatasets[initialScope] = data;
    applyCentralData(data, initialScope);
    fillFilters();
    renderViewScopeSelector();
    document.getElementById("executiveViewScope")?.addEventListener("click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("[data-executive-view-scope]")
        : null;
      if (!button) return;
      setViewScope(button.dataset.executiveViewScope);
    });
    document.querySelectorAll("[data-executive-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        if (select.dataset.executiveFilter === "periodo") updatePeriodFilters();
        refresh();
      });
    });
    document.getElementById("clearExecutiveChartFilter")?.addEventListener("click", clearChartFilter);
    document.getElementById("clearExecutiveSummaryCardFilter")?.addEventListener("click", clearSummaryCardFilter);
    document.getElementById("clearExecutiveIndicatorFilter")?.addEventListener("click", clearIndicatorFilter);
    document.getElementById("executivePerformanceMapGroups")?.addEventListener("click", (event) => {
      const item = event.target instanceof Element
        ? event.target.closest("[data-indicator-id]")
        : null;
      if (!item) return;
      applyIndicatorFilter(Number(item.dataset.indicatorId));
    });
    document.getElementById("executivePerformanceMapGroups")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const item = event.target instanceof Element
        ? event.target.closest("[data-indicator-id]")
        : null;
      if (!item) return;
      event.preventDefault();
      applyIndicatorFilter(Number(item.dataset.indicatorId));
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
  if (window.__EXECUTIVE_SUMMARY_TEST__) {
    window.ExecutiveSummaryInternals = {
      performanceToneByPercent,
      performanceToneLabel,
      performanceVariation,
      formatPerformanceVariation,
      performancePercentLabel,
      performancePercentValue,
      performanceMapSize,
      isRvdIndicator,
      planBadgesMarkup,
      viewScopeProfileCode,
      canChooseViewScope,
      defaultViewScope,
      activeIndicators,
      collectionsForViewScope,
      applyCentralData,
      isOwnResponsibility,
      responsibilityBadgeMarkup,
      setViewScope,
      loadCentralExecutiveData,
      deadlineStatusForResult,
      deadlineAlertMarkup,
      operationalLaunchForResult,
      isExpectedDeadlineCycle,
      isOperationalCompetenceRequired,
      operationalFrequencyForIndicator,
      shortIndicatorName,
      nomeIndicadorMapa
    };
  }
})();
