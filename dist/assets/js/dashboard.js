(function () {
  const chartInstances = {};
  let state = {
    regras: []
  };

  const MONTH_ORDER = {
    Janeiro: 1,
    Fevereiro: 2,
    Março: 3,
    Abril: 4,
    Maio: 5,
    Junho: 6,
    Julho: 7,
    Agosto: 8,
    Setembro: 9,
    Outubro: 10,
    Novembro: 11,
    Dezembro: 12
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

  function countBy(items, key) {
    return items.reduce((acc, item) => {
      const value = item[key] || "Não informado";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function average(values) {
    const valid = values
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map(Number)
      .filter(Number.isFinite);
    if (!valid.length) return null;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  }

  function toFiniteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getAtingimento(lancamento) {
    const mensal = toFiniteNumber(lancamento.percentualAtingidoMensal);
    if (mensal !== null) return mensal;
    return toFiniteNumber(lancamento.percentualAtingido);
  }

  function hasAtingimento(lancamento) {
    return lancamento.status !== "Não iniciado" && getAtingimento(lancamento) !== null;
  }

  function indicatorMap(indicadores) {
    return Object.fromEntries(indicadores.map((item) => [item.id, item]));
  }

  function getRule(indicador, regras) {
    if (window.IndicatorFormulas && IndicatorFormulas.obterRegra) {
      return IndicatorFormulas.obterRegra(indicador, regras || []);
    }
    return (regras || []).find((regra) => regra.indicadorId === indicador.id) || null;
  }

  function getEntryDate(lancamento) {
    const camposEntrada = lancamento.camposEntrada || {};
    const dateValue = camposEntrada.dataBaseApuracao || camposEntrada.dataPesquisa || camposEntrada.dataApoio || camposEntrada.dataExecucao;
    if (!dateValue) return null;
    const timestamp = new Date(dateValue).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function sortByOfficialCompetence(a, b) {
    const dateA = getEntryDate(a);
    const dateB = getEntryDate(b);
    if (dateA !== null && dateB !== null && dateA !== dateB) return dateA - dateB;
    if (dateA !== null && dateB === null) return 1;
    if (dateA === null && dateB !== null) return -1;
    if ((a.ano || 0) !== (b.ano || 0)) return (a.ano || 0) - (b.ano || 0);
    return (a.mes || 0) - (b.mes || 0);
  }

  function competencia(lancamento) {
    if (!lancamento) return null;
    return `${lancamento.nomeMes || lancamento.mes}/${lancamento.ano}`;
  }

  function competenciaCurta(lancamento) {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const mes = meses[(Number(lancamento.mes) || 1) - 1] || lancamento.nomeMes || lancamento.mes;
    return `${mes}/${lancamento.ano}`;
  }

  function hasValidLaunchData(lancamento) {
    return (
      lancamento.status !== "Não iniciado" &&
      (
        getAtingimento(lancamento) !== null ||
        toFiniteNumber(lancamento.resultadoMensal) !== null ||
        toFiniteNumber(lancamento.resultadoOficialAnual) !== null ||
        (lancamento.camposEntrada && Object.values(lancamento.camposEntrada).some((value) => value !== "" && value !== null && value !== undefined))
      )
    );
  }

  function getOfficialPercent(lancamento, resultado) {
    if (resultado && toFiniteNumber(resultado.percentualAtingidoAnual) !== null) return toFiniteNumber(resultado.percentualAtingidoAnual);
    if (resultado && toFiniteNumber(resultado.percentualAtingidoAcumulado) !== null) return toFiniteNumber(resultado.percentualAtingidoAcumulado);
    if (resultado && toFiniteNumber(resultado.percentualAtingidoMensal) !== null) return toFiniteNumber(resultado.percentualAtingidoMensal);
    return [
      lancamento.percentualAtingidoAnual,
      lancamento.percentualAtingidoAcumulado,
      lancamento.percentualAtingidoMensal,
      lancamento.percentualAtingido
    ].map(toFiniteNumber).find((value) => value !== null) ?? null;
  }

  function getOfficialResult(lancamento, resultado) {
    if (resultado && toFiniteNumber(resultado.resultadoOficialAnual) !== null) return toFiniteNumber(resultado.resultadoOficialAnual);
    if (resultado && toFiniteNumber(resultado.resultadoAcumulado) !== null) return toFiniteNumber(resultado.resultadoAcumulado);
    if (resultado && toFiniteNumber(resultado.resultadoMensal) !== null) return toFiniteNumber(resultado.resultadoMensal);
    return [
      lancamento.resultadoOficialAnual,
      lancamento.resultadoAcumulado,
      lancamento.resultadoMensal,
      lancamento.realizadoMensal
    ].map(toFiniteNumber).find((value) => value !== null) ?? null;
  }

  function selectOfficialLaunch(regra, lancamentosValidos) {
    const ordered = [...lancamentosValidos].sort(sortByOfficialCompetence);
    switch (regra && regra.tipoConsolidacao) {
      case "ultima_posicao":
      case "ultima_posicao_acumulada":
      case "soma_acumulada_no_ano":
      case "razao_acumulada_no_ano":
      case "media_mensal_acumulada":
      case "resultado_pesquisa_oficial":
      case "acumulado_por_acoes_concluidas":
      case "comparacao_acumulada_ano_anterior":
      default:
        return ordered[ordered.length - 1] || null;
    }
  }

  function calcularResultadoPorMotor(indicador, regra, lancamentoOficial, lancamentosValidos) {
    if (!window.IndicatorFormulas || !IndicatorFormulas.calcularIndicador || !regra || !lancamentoOficial) return null;
    const lancamentosDoAno = lancamentosValidos
      .filter((item) => item.ano === lancamentoOficial.ano && item.mes <= lancamentoOficial.mes)
      .sort((a, b) => a.mes - b.mes);
    const resultado = IndicatorFormulas.calcularIndicador(indicador, regra, lancamentoOficial, lancamentosDoAno);
    return resultado && !resultado.erro ? resultado : null;
  }

  function obterResultadosMensais(indicador, regra, lancamentosDoIndicador) {
    const lancamentosValidos = (lancamentosDoIndicador || [])
      .filter(hasValidLaunchData)
      .sort(sortByOfficialCompetence);

    return lancamentosValidos.map((lancamento) => {
      const resultadoCalculado = calcularResultadoPorMotor(indicador, regra, lancamento, lancamentosValidos);
      const resultadoMensal = resultadoCalculado && toFiniteNumber(resultadoCalculado.resultadoMensal) !== null
        ? toFiniteNumber(resultadoCalculado.resultadoMensal)
        : toFiniteNumber(lancamento.resultadoMensal ?? lancamento.realizadoMensal);
      const percentualAtingido = resultadoCalculado && toFiniteNumber(resultadoCalculado.percentualAtingidoMensal) !== null
        ? toFiniteNumber(resultadoCalculado.percentualAtingidoMensal)
        : getAtingimento(lancamento);

      return {
        key: `${lancamento.ano}-${String(lancamento.mes).padStart(2, "0")}`,
        label: competenciaCurta(lancamento),
        mes: lancamento.mes,
        ano: lancamento.ano,
        resultado: resultadoMensal,
        percentualAtingido,
        status: lancamento.status,
        lancamento
      };
    });
  }

  function obterResultadoDashboard(indicador, regra, lancamentosDoIndicador) {
    const lancamentosValidos = (lancamentosDoIndicador || [])
      .filter(hasValidLaunchData)
      .sort(sortByOfficialCompetence);
    const resultadosMensais = obterResultadosMensais(indicador, regra, lancamentosDoIndicador);

    if (!lancamentosValidos.length) {
      return {
        indicador,
        regra,
        resultado: null,
        percentualAtingido: null,
        competencia: null,
        status: "Sem dados",
        lancamento: null,
        meta: regra && regra.metaAnualValor !== null ? regra.metaAnualValor : null,
        resultadosMensais
      };
    }

    const lancamentoOficial = selectOfficialLaunch(regra, lancamentosValidos);
    const resultadoCalculado = calcularResultadoPorMotor(indicador, regra, lancamentoOficial, lancamentosValidos);
    const percentualAtingido = getOfficialPercent(lancamentoOficial, resultadoCalculado);
    const resultado = getOfficialResult(lancamentoOficial, resultadoCalculado);

    return {
      indicador,
      regra,
      resultado,
      percentualAtingido,
      competencia: competencia(lancamentoOficial),
      status: lancamentoOficial.status,
      lancamento: lancamentoOficial,
      meta: regra && regra.metaAnualValor !== null ? regra.metaAnualValor : lancamentoOficial.metaMensal,
      resultadosMensais
    };
  }

  function calcularResultadosOficiais(indicadores, lancamentos, regras) {
    return indicadores.map((indicador) => {
      const regra = getRule(indicador, regras);
      const lancamentosDoIndicador = lancamentos.filter((item) => item.indicadorId === indicador.id);
      return obterResultadoDashboard(indicador, regra, lancamentosDoIndicador);
    });
  }

  function hasOfficialPercent(item) {
    return item && toFiniteNumber(item.percentualAtingido) !== null;
  }

  function calcularDashboard({ indicadores, lancamentos, regras }) {
    const resultadosOficiais = calcularResultadosOficiais(indicadores, lancamentos, regras);
    const indicadoresComAtingimento = resultadosOficiais.filter(hasOfficialPercent);
    return {
      totalIndicadores: indicadores.length,
      indicadoresPEI: indicadores.filter((item) => item.plano === "PEI").length,
      indicadoresPN: indicadores.filter((item) => item.plano === "PN").length,
      homologados: lancamentos.filter((item) => item.status === "Homologado").length,
      pendentes: lancamentos.filter((item) => item.status === "Enviado para homologação").length,
      devolvidos: lancamentos.filter((item) => item.status === "Devolvido para ajuste").length,
      naoIniciados: lancamentos.filter((item) => item.status === "Não iniciado").length,
      atingimentoOficial: average(indicadoresComAtingimento.map((item) => item.percentualAtingido)),
      abaixoDe80: indicadoresComAtingimento.filter((item) => item.percentualAtingido < 0.8).length,
      resultadosOficiais,
      indicadoresComAtingimento
    };
  }

  function renderCards(resumo) {
    const cards = [
      ["Total de indicadores", resumo.totalIndicadores],
      ["Indicadores PEI", resumo.indicadoresPEI],
      ["Indicadores PN", resumo.indicadoresPN],
      ["Homologados", resumo.homologados],
      ["Pendentes", resumo.pendentes],
      ["Devolvidos", resumo.devolvidos],
      ["Não iniciados", resumo.naoIniciados],
      ["Atingimento oficial", Calculations.formatarPercentual(resumo.atingimentoOficial)],
      ["Abaixo de 80%", resumo.abaixoDe80]
    ];

    document.getElementById("summaryCards").innerHTML = cards.map(([label, value]) => (
      `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`
    )).join("");
  }

  function chart(canvasId, config) {
    if (!window.Chart) return;
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
    }
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      canvas.hidden = false;
      const message = canvas.parentElement.querySelector(`[data-empty-chart="${canvasId}"]`);
      if (message) message.hidden = true;
    }
    chartInstances[canvasId] = new Chart(document.getElementById(canvasId), config);
  }

  function renderChartMessage(canvasId, showEmpty, text = "Sem dados preenchidos para exibição.") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }

    let message = canvas.parentElement.querySelector(`[data-empty-chart="${canvasId}"]`);
    if (!message) {
      message = document.createElement("p");
      message.className = "empty-state";
      message.dataset.emptyChart = canvasId;
      canvas.insertAdjacentElement("afterend", message);
    }

    message.textContent = text;
    canvas.hidden = showEmpty;
    message.hidden = !showEmpty;
  }

  function palette(size) {
    const colors = ["#0f5b99", "#2f7d32", "#168aad", "#c28b00", "#7c3aed", "#b3261e", "#4b5563", "#0f766e"];
    return Array.from({ length: size }, (_, index) => colors[index % colors.length]);
  }

  function percentAxisOptions() {
    return {
      beginAtZero: true,
      ticks: {
        callback: (value) => `${value}%`
      }
    };
  }

  function performanceByPilar(resultadosOficiais) {
    const buckets = {};
    resultadosOficiais.filter(hasOfficialPercent).forEach((resultado) => {
      const pilar = resultado.indicador.pilar || "Não informado";
      buckets[pilar] = buckets[pilar] || [];
      buckets[pilar].push(resultado.percentualAtingido);
    });

    return Object.entries(buckets).map(([pilar, values]) => ({
      pilar,
      percentual: average(values)
    }));
  }

  function monthlyEvolution(resultadosOficiais) {
    const buckets = {};
    resultadosOficiais.filter(hasOfficialPercent).forEach((resultado) => {
      const mes = resultado.lancamento && resultado.lancamento.nomeMes;
      if (!mes) return;
      buckets[mes] = buckets[mes] || [];
      buckets[mes].push(resultado.percentualAtingido);
    });

    return Object.entries(buckets)
      .map(([mes, values]) => ({ mes, percentual: average(values) }))
      .sort((a, b) => (MONTH_ORDER[a.mes] || 99) - (MONTH_ORDER[b.mes] || 99));
  }

  function performanceStatus(resultadosOficiais) {
    return resultadosOficiais.filter(hasOfficialPercent).reduce((acc, item) => {
      const percentual = item.percentualAtingido;
      const label = Calculations.calcularStatusDesempenho(percentual);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  }

  function ranking(resultadosOficiais) {
    return resultadosOficiais
      .filter(hasOfficialPercent)
      .sort((a, b) => b.percentualAtingido - a.percentualAtingido);
  }

  function renderCharts(indicadores, lancamentos, resumo) {
    if (!window.Chart) return;

    const resultadosOficiais = resumo.resultadosOficiais;
    const planoData = countBy(indicadores, "plano");
    const pilarData = countBy(indicadores, "pilar");
    const statusData = countBy(lancamentos, "status");
    const desempenhoPilar = performanceByPilar(resultadosOficiais);
    const evolucao = monthlyEvolution(resultadosOficiais);
    const desempenhoStatus = performanceStatus(resultadosOficiais);

    chart("chartPlano", {
      type: "doughnut",
      data: {
        labels: Object.keys(planoData),
        datasets: [{ data: Object.values(planoData), backgroundColor: palette(Object.keys(planoData).length) }]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    });

    chart("chartPilar", {
      type: "bar",
      data: {
        labels: Object.keys(pilarData),
        datasets: [{ label: "Indicadores", data: Object.values(pilarData), backgroundColor: "#0f5b99" }]
      },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });

    renderChartMessage("chartDesempenhoPilar", !desempenhoPilar.length, "Sem dados preenchidos para cálculo de desempenho oficial.");
    if (desempenhoPilar.length) chart("chartDesempenhoPilar", {
      type: "bar",
      data: {
        labels: desempenhoPilar.map((item) => item.pilar),
        datasets: [{
          label: "% atingimento oficial",
          data: desempenhoPilar.map((item) => Number((item.percentual * 100).toFixed(2))),
          backgroundColor: "#2f7d32"
        }]
      },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: percentAxisOptions() } }
    });

    renderChartMessage("chartEvolucao", !evolucao.length, "Sem dados de atingimento oficial para exibição.");
    if (evolucao.length) chart("chartEvolucao", {
      type: "line",
      data: {
        labels: evolucao.map((item) => item.mes),
        datasets: [{
          label: "% atingimento oficial",
          data: evolucao.map((item) => Number((item.percentual * 100).toFixed(2))),
          borderColor: "#168aad",
          backgroundColor: "rgba(22, 138, 173, 0.16)",
          fill: true,
          tension: 0.25
        }]
      },
      options: { scales: { y: percentAxisOptions() } }
    });

    chart("chartStatus", {
      type: "bar",
      data: {
        labels: Object.keys(statusData),
        datasets: [{ label: "Lançamentos", data: Object.values(statusData), backgroundColor: "#c28b00" }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const desempenhoStatusLabels = Object.keys(desempenhoStatus);
    renderChartMessage("chartDesempenhoStatus", !desempenhoStatusLabels.length, "Sem dados de desempenho oficial.");
    if (desempenhoStatusLabels.length) chart("chartDesempenhoStatus", {
      type: "doughnut",
      data: {
        labels: desempenhoStatusLabels,
        datasets: [{ data: Object.values(desempenhoStatus), backgroundColor: palette(desempenhoStatusLabels.length) }]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    });
  }

  function officialSituation(resultado) {
    if (!hasOfficialPercent(resultado)) return "Sem cálculo";
    if (resultado.percentualAtingido >= 1) return "Atingido";
    if (resultado.percentualAtingido >= 0.8) return "Abaixo da meta";
    return "Crítico";
  }

  function formatOfficialResult(resultado) {
    return Calculations.formatarValor(resultado.resultado, resultado.regra && resultado.regra.unidadeMedida);
  }

  function formatOfficialMeta(resultado) {
    return Calculations.formatarValor(resultado.meta, resultado.regra && resultado.regra.unidadeMedida);
  }

  function formatMonthlyResult(resultadoOficial, resultadoMensal) {
    return Calculations.formatarValor(resultadoMensal.resultado, resultadoOficial.regra && resultadoOficial.regra.unidadeMedida);
  }

  function getMonthColumns(resultadosOficiais) {
    const columns = new Map();
    resultadosOficiais.forEach((resultado) => {
      (resultado.resultadosMensais || []).forEach((mensal) => {
        if (mensal.resultado === null || mensal.resultado === undefined) return;
        if (!columns.has(mensal.key)) {
          columns.set(mensal.key, { key: mensal.key, label: mensal.label, mes: mensal.mes, ano: mensal.ano });
        }
      });
    });
    return [...columns.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  function renderOfficialPositionTable(resultadosOficiais) {
    const table = document.getElementById("officialPositionTableElement");
    const rows = resultadosOficiais
      .filter((item) => item.lancamento && (item.resultadosMensais || []).some((mensal) => mensal.resultado !== null && mensal.resultado !== undefined))
      .sort((a, b) => (Number(a.indicador.numero) || a.indicador.id) - (Number(b.indicador.numero) || b.indicador.id));
    const monthColumns = getMonthColumns(rows);

    if (!rows.length) {
      table.innerHTML = '<tbody id="officialPositionTable"><tr><td>Nenhum indicador possui lançamento válido no momento.</td></tr></tbody>';
      return monthColumns;
    }

    const colgroup = [
      '<col class="indicator-col">',
      ...monthColumns.map(() => '<col class="month-col">'),
      '<col class="result-col">',
      '<col class="meta-col">',
      '<col class="percent-col">',
      '<col class="situation-col">',
      '<col class="status-col">'
    ].join("");

    const header = `
      <thead>
        <tr>
          <th>Indicador</th>
          ${monthColumns.map((month) => `<th>${escapeHtml(month.label)}</th>`).join("")}
          <th>Resultado oficial</th>
          <th>Meta</th>
          <th>% atingimento oficial</th>
          <th>Situação</th>
          <th>Status</th>
        </tr>
      </thead>
    `;

    const body = rows.map((item) => {
      const monthlyByKey = Object.fromEntries((item.resultadosMensais || []).map((mensal) => [mensal.key, mensal]));
      return `
        <tr>
          <td class="indicator-name"><strong>${escapeHtml(item.indicador.numero)}.</strong> ${escapeHtml(item.indicador.indicador)}</td>
          ${monthColumns.map((month) => {
            const mensal = monthlyByKey[month.key];
            return `<td>${mensal ? formatMonthlyResult(item, mensal) : "-"}</td>`;
          }).join("")}
          <td class="official-value">${formatOfficialResult(item)}</td>
          <td>${formatOfficialMeta(item)}</td>
          <td>${Calculations.formatarPercentual(item.percentualAtingido)}</td>
          <td>${escapeHtml(officialSituation(item))}</td>
          <td>${escapeHtml(item.status || "-")}</td>
        </tr>
      `;
    }).join("");

    table.innerHTML = `<colgroup>${colgroup}</colgroup>${header}<tbody id="officialPositionTable">${body}</tbody>`;
    return monthColumns;
  }

  function renderOfficialTables(resultadosOficiais) {
    renderOfficialPositionTable(resultadosOficiais);
  }

  function logVerificacaoOperacional(lancamentos, label = "Base operacional") {
    if (!window.console || !console.table) return;
    console.table({
      escopo: label,
      totalLancamentos: lancamentos.length,
      homologados: lancamentos.filter((item) => item.status === "Homologado").length,
      enviados: lancamentos.filter((item) => item.status === "Enviado para homologação").length,
      devolvidos: lancamentos.filter((item) => item.status === "Devolvido para ajuste").length,
      naoIniciados: lancamentos.filter((item) => item.status === "Não iniciado").length,
      comAtingimento: lancamentos.filter(hasAtingimento).length
    });
  }

  function fillFilters(indicadores, lancamentos) {
    const filterValues = {
      ano: ["2026", ...unique(lancamentos.map((item) => String(item.ano)).filter((ano) => ano !== "2026"))],
      mes: ["Todos", ...unique(lancamentos.map((item) => item.nomeMes))],
      plano: ["Todos", ...unique(indicadores.map((item) => item.plano))],
      pilar: ["Todos", ...unique(indicadores.map((item) => item.pilar))],
      unidade: ["Todos", ...unique(indicadores.map((item) => item.unidadeApuradora))],
      diretoria: ["Todos", ...unique(indicadores.map((item) => item.diretoriaResponsavel))],
      status: ["Todos", ...unique(lancamentos.map((item) => item.status))]
    };

    document.querySelectorAll("[data-filter]").forEach((select) => {
      const key = select.dataset.filter;
      const currentValue = select.value;
      select.innerHTML = filterValues[key].map((value) => `<option>${escapeHtml(value)}</option>`).join("");
      if (filterValues[key].includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function applyFilters(indicadores, lancamentos) {
    const values = Object.fromEntries(
      [...document.querySelectorAll("[data-filter]")].map((select) => [select.dataset.filter, select.value])
    );

    const filteredIndicators = indicadores.filter((item) => (
      (!values.plano || values.plano === "Todos" || item.plano === values.plano) &&
      (!values.pilar || values.pilar === "Todos" || item.pilar === values.pilar) &&
      (!values.unidade || values.unidade === "Todos" || item.unidadeApuradora === values.unidade) &&
      (!values.diretoria || values.diretoria === "Todos" || item.diretoriaResponsavel === values.diretoria)
    ));

    const indicatorIds = new Set(filteredIndicators.map((item) => item.id));
    const filteredLaunches = lancamentos.filter((item) => (
      indicatorIds.has(item.indicadorId) &&
      (!values.ano || String(item.ano) === values.ano) &&
      (!values.mes || values.mes === "Todos" || item.nomeMes === values.mes) &&
      (!values.status || values.status === "Todos" || item.status === values.status)
    ));

    const resumo = calcularDashboard({ indicadores: filteredIndicators, lancamentos: filteredLaunches, regras: state.regras });
    renderCards(resumo);
    renderCharts(filteredIndicators, filteredLaunches, resumo);
    renderOfficialTables(resumo.resultadosOficiais);
  }

  async function init({ data, user }) {
    state = {
      regras: data.regrasIndicadores || []
    };
    const indicadores = Auth.filterIndicatorsByUser(data.indicadores, user);
    const lancamentos = Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user);
    logVerificacaoOperacional(data.lancamentos, "global");
    logVerificacaoOperacional(lancamentos, user.perfil || "escopo atual");
    fillFilters(indicadores, lancamentos);
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => applyFilters(indicadores, lancamentos));
    });
    applyFilters(indicadores, lancamentos);
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.dashboard = { init };
})();
