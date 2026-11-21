(function (root) {
  const MONTHS = [
    [1, "Jan"], [2, "Fev"], [3, "Mar"], [4, "Abr"],
    [5, "Mai"], [6, "Jun"], [7, "Jul"], [8, "Ago"],
    [9, "Set"], [10, "Out"], [11, "Nov"], [12, "Dez"]
  ];
  const chartInstances = new Map();

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ruleFor(indicator, rules) {
    if (root.IndicatorFormulas?.obterRegra) {
      return root.IndicatorFormulas.obterRegra(indicator, rules || []);
    }
    return (rules || []).find((rule) => Number(rule.indicadorId) === Number(indicator?.id)) || null;
  }

  function availableYears(launches, indicatorId) {
    const years = [...new Set((launches || [])
      .filter((launch) => Number(launch.indicadorId) === Number(indicatorId))
      .map((launch) => Number(launch.ano))
      .filter(Number.isFinite))]
      .sort((left, right) => right - left);
    return years.length ? years : [new Date().getFullYear()];
  }

  function isExpectedMonth(indicator, month) {
    return root.IndicatorPeriodicity?.isExpectedMonth?.(indicator, month) !== false;
  }

  function isAccumulatedRule(rule) {
    const consolidation = normalize(rule?.tipoConsolidacao);
    const calculation = normalize(rule?.tipoCalculo);
    const targetType = normalize(rule?.parametrosCalculo?.metaTipo);
    return consolidation.includes("acumul") ||
      consolidation.includes("soma") ||
      consolidation.includes("razao") ||
      targetType.includes("acumul") ||
      calculation.includes("acumul");
  }

  function pointText(launch, result) {
    const fields = launch?.camposEntrada || {};
    return fields.statusProjetoPlataformaJogos ||
      fields.marcoAtualPlataformaJogos ||
      fields.statusPlanoAcao ||
      fields.descricaoAndamentoSocioambiental ||
      launch?.situacaoCalculada ||
      result?.situacaoOficial ||
      result?.situacaoAtual ||
      launch?.status ||
      "";
  }

  function buildSeries({
    indicator,
    launches = [],
    rules = [],
    governance = [],
    year = 2026,
    calculator = root.StrategicResults?.calcularDashboard
  } = {}) {
    if (!indicator || typeof calculator !== "function") {
      return { year: Number(year), mode: "standard", unit: "", points: [], numericPoints: [], qualitative: false };
    }

    const selectedYear = Number(year);
    const rule = ruleFor(indicator, rules);
    const scoped = launches
      .filter((launch) => Number(launch.indicadorId) === Number(indicator.id) && Number(launch.ano) === selectedYear)
      .sort((left, right) => Number(left.mes) - Number(right.mes));
    const points = [];

    MONTHS.forEach(([month, label]) => {
      if (!isExpectedMonth(indicator, month)) return;
      const launchesInMonth = scoped.filter((launch) => Number(launch.mes) === month && launch.status === "Homologado");
      if (!launchesInMonth.length) return;

      const calculationScope = scoped.filter((launch) => Number(launch.mes) <= month);
      const summary = calculator({
        indicadores: [indicator],
        lancamentos: calculationScope,
        regras: rules,
        governancaHomologacaoAtual: governance
      });
      const result = summary?.resultadosOficiais?.[0] || null;
      const officialLaunch = result?.lancamento || result?.lancamentoAcao || null;
      const isCurrentOfficialPosition = result?.possuiPosicaoOficial === true &&
        Number(officialLaunch?.ano) === selectedYear &&
        Number(officialLaunch?.mes) === month;
      if (!isCurrentOfficialPosition) return;
      const launch = launchesInMonth[launchesInMonth.length - 1];
      const meta = toNumber(result?.meta);
      const realized = toNumber(result?.resultado);
      const percent = toNumber(result?.percentualAtingido);
      const situation = root.StrategicResults?.officialSituation?.(result) || result?.situacaoOficial || result?.situacaoCalculada;

      points.push({
        month,
        label: `${label}/${selectedYear}`,
        meta,
        realized,
        percent,
        situation: situation || "Sem dados",
        status: result?.status || launch.status,
        text: pointText(launch, result),
        official: true
      });
    });

    const numericPoints = points.filter((point) => point.meta !== null || point.realized !== null);
    return {
      year: selectedYear,
      mode: isAccumulatedRule(rule) ? "accumulated" : "standard",
      unit: rule?.unidadeMedida || indicator?.unidadeMedida || "",
      points,
      numericPoints,
      qualitative: numericPoints.length === 0 && points.length > 0
    };
  }

  function colorForSituation(value) {
    const situation = normalize(value);
    if (situation.includes("superad") || situation.includes("atingid")) return "#24b86a";
    if (situation.includes("critic") || situation.includes("nao ating")) return "#e04455";
    if (situation.includes("abaixo") || situation.includes("atenc")) return "#f3b51b";
    if (situation.includes("acompanh") || situation.includes("andamento")) return "#2d9cdb";
    return "#8ca3b8";
  }

  function formatValue(value, unit) {
    if (value === null || value === undefined) return "Sem dados";
    if (root.Calculations?.formatarValor) return root.Calculations.formatarValor(value, unit);
    return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }

  function formatAxis(value, unit) {
    const normalizedUnit = normalize(unit);
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    if (normalizedUnit === "percentual") {
      return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(number);
    }
    if (normalizedUnit === "moeda") {
      return `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(number)}`;
    }
    return new Intl.NumberFormat("pt-BR", { notation: Math.abs(number) >= 10000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(number);
  }

  function resolveElement(target) {
    return typeof target === "string" ? document.getElementById(target) : target;
  }

  function destroy(canvas) {
    const element = resolveElement(canvas);
    if (!element) return;
    const current = chartInstances.get(element) || root.Chart?.getChart?.(element);
    if (current) current.destroy();
    chartInstances.delete(element);
  }

  function renderTimeline(target, points) {
    const element = resolveElement(target);
    if (!element) return;
    element.innerHTML = points.map((point) => `
      <article class="indicator-evolution-milestone">
        <span>${escapeHtml(point.label)}</span>
        <strong>${escapeHtml(point.text || point.situation || point.status)}</strong>
        <small>${escapeHtml(point.status || "Homologado")}</small>
      </article>
    `).join("");
    element.hidden = false;
  }

  function render({
    canvas,
    empty,
    timeline,
    series,
    indicatorName = "Indicador"
  } = {}) {
    const canvasElement = resolveElement(canvas);
    const emptyElement = resolveElement(empty);
    const timelineElement = resolveElement(timeline);
    if (!canvasElement || !series) return null;

    destroy(canvasElement);
    if (timelineElement) {
      timelineElement.hidden = true;
      timelineElement.innerHTML = "";
    }

    if (!series.numericPoints.length) {
      canvasElement.hidden = true;
      if (series.qualitative && series.points.length) {
        if (emptyElement) emptyElement.hidden = true;
        renderTimeline(timelineElement, series.points);
      } else if (emptyElement) {
        emptyElement.textContent = "Nenhum resultado homologado disponível para o período selecionado.";
        emptyElement.hidden = false;
      }
      return null;
    }

    if (!root.Chart) {
      canvasElement.hidden = true;
      if (emptyElement) {
        emptyElement.textContent = "O componente de gráfico não está disponível.";
        emptyElement.hidden = false;
      }
      return null;
    }

    if (emptyElement) emptyElement.hidden = true;
    canvasElement.hidden = false;
    canvasElement.setAttribute("role", "img");
    canvasElement.setAttribute("aria-label", `Evolução de meta e realizado de ${indicatorName} em ${series.year}`);

    const points = series.numericPoints;
    const accumulated = series.mode === "accumulated";
    const targetData = points.map((point) => point.meta);
    const realizedData = points.map((point) => point.realized);
    const chart = new root.Chart(canvasElement, {
      type: "bar",
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            type: "line",
            label: "Meta",
            data: targetData,
            borderColor: "#f6c542",
            backgroundColor: "#f6c542",
            borderWidth: 3,
            borderDash: [7, 5],
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.22,
            spanGaps: true
          },
          {
            type: accumulated ? "line" : "bar",
            label: "Realizado",
            data: realizedData,
            borderColor: accumulated ? "#31b9ff" : points.map((point) => colorForSituation(point.situation)),
            backgroundColor: accumulated
              ? "rgba(49, 185, 255, 0.2)"
              : points.map((point) => colorForSituation(point.situation)),
            borderWidth: accumulated ? 3 : 1,
            pointRadius: accumulated ? 4 : 0,
            pointHoverRadius: accumulated ? 6 : 0,
            tension: accumulated ? 0.22 : 0,
            spanGaps: true,
            borderRadius: accumulated ? 0 : 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#d9ebff", usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const point = points[context.dataIndex];
                const value = context.dataset.label === "Meta" ? point.meta : point.realized;
                return `${context.dataset.label}: ${formatValue(value, series.unit)}`;
              },
              afterBody(items) {
                const point = points[items?.[0]?.dataIndex];
                if (!point) return [];
                const details = [`Situação: ${point.situation}`, `Status: ${point.status}`];
                if (point.percent !== null) details.push(`Atingimento: ${formatValue(point.percent, "percentual")}`);
                return details;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#c9ddf3" }
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(140, 177, 214, 0.16)" },
            ticks: {
              color: "#c9ddf3",
              callback(value) { return formatAxis(value, series.unit); }
            }
          }
        }
      }
    });
    chartInstances.set(canvasElement, chart);
    return chart;
  }

  const api = {
    MONTHS,
    availableYears,
    buildSeries,
    colorForSituation,
    formatValue,
    isAccumulatedRule,
    render,
    destroy
  };

  root.IndicatorEvolution = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

