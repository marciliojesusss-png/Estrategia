(function () {
  const REPORTS = [
    ["geral", "Relatório geral dos indicadores"],
    ["plano", "Relatório por plano"],
    ["pilar", "Relatório por pilar"],
    ["unidade", "Relatório por unidade apuradora"],
    ["diretoria", "Relatório por diretoria responsável"],
    ["pendencias", "Relatório de pendências"],
    ["homologacoes", "Relatório de homologações"],
    ["devolucoes", "Relatório de devoluções"],
    ["acumulado", "Relatório acumulado anual"]
  ];

  let state = {
    data: null,
    user: null,
    indicadores: [],
    lancamentos: [],
    homologacoes: [],
    currentRows: [],
    currentColumns: []
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

  function hasOperationalData(lancamento) {
    return [
      lancamento.realizadoMensal,
      lancamento.resultadoMensal,
      lancamento.percentualAtingido,
      lancamento.percentualAtingidoMensal,
      lancamento.resultadoAcumulado,
      lancamento.percentualAtingidoAcumulado,
      lancamento.resultadoOficialAnual,
      lancamento.percentualAtingidoAnual
    ].some((value) => toFiniteNumber(value) !== null);
  }

  function indicatorMap() {
    return Object.fromEntries(state.indicadores.map((item) => [item.id, item]));
  }

  function fillReportTypes() {
    document.getElementById("reportType").innerHTML = REPORTS
      .map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`)
      .join("");
  }

  function fillFilters() {
    const values = {
      ano: ["Todos", ...unique(state.lancamentos.map((item) => String(item.ano)))],
      mes: ["Todos", ...unique(state.lancamentos.map((item) => item.nomeMes))],
      plano: ["Todos", ...unique(state.indicadores.map((item) => item.plano))],
      pilar: ["Todos", ...unique(state.indicadores.map((item) => item.pilar))],
      unidade: ["Todos", ...unique(state.indicadores.map((item) => item.unidadeApuradora))],
      diretoria: ["Todos", ...unique(state.indicadores.map((item) => item.diretoriaResponsavel))],
      status: ["Todos", ...unique(state.lancamentos.map((item) => item.status))],
      indicador: ["Todos", ...state.indicadores.map((item) => `${item.numero} - ${limparNomeIndicador(item.indicador)}`)]
    };

    document.querySelectorAll("[data-filter]").forEach((select) => {
      const key = select.dataset.filter;
      const current = select.value;
      select.innerHTML = values[key].map((value) => `<option>${escapeHtml(value)}</option>`).join("");
      if (values[key].includes(current)) {
        select.value = current;
      }
    });
  }

  function filterIndicators() {
    const values = currentFilterValues();
    return state.indicadores.filter((item) => (
      (values.plano === "Todos" || item.plano === values.plano) &&
      (values.pilar === "Todos" || item.pilar === values.pilar) &&
      (values.unidade === "Todos" || item.unidadeApuradora === values.unidade) &&
      (values.diretoria === "Todos" || item.diretoriaResponsavel === values.diretoria) &&
      (values.indicador === "Todos" || values.indicador.startsWith(`${item.numero} - `))
    ));
  }

  function filterLaunches(indicadores) {
    const values = currentFilterValues();
    const ids = new Set(indicadores.map((item) => item.id));
    return state.lancamentos.filter((item) => (
      ids.has(item.indicadorId) &&
      (values.ano === "Todos" || String(item.ano) === values.ano) &&
      (values.mes === "Todos" || item.nomeMes === values.mes) &&
      (values.status === "Todos" || item.status === values.status)
    ));
  }

  function currentFilterValues() {
    return Object.fromEntries(
      [...document.querySelectorAll("[data-filter]")].map((select) => [select.dataset.filter, select.value || "Todos"])
    );
  }

  function formatValue(value, type) {
    if (type === "percent") return Calculations.formatarPercentual(value);
    if (type === "number") return value === null || value === undefined || value === "" ? "-" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
    return value === null || value === undefined || value === "" ? "-" : value;
  }

  function baseIndicatorRow(indicador) {
    return {
      numero: indicador.numero,
      indicador: limparNomeIndicador(indicador.indicador),
      plano: indicador.plano,
      pilar: indicador.pilar,
      periodicidade: indicador.periodicidade,
      unidadeApuradora: indicador.unidadeApuradora || "Não informado",
      diretoriaResponsavel: indicador.diretoriaResponsavel || "Não informado",
      tipoCalculo: indicador.tipoCalculo,
      metaAnualDescricao: indicador.metaAnualDescricao,
      metrica: indicador.metrica,
      ativo: indicador.ativo ? "Ativo" : "Inativo"
    };
  }

  function summarizeBy(indicadores, lancamentos, key, labelKey) {
    const porId = indicatorMap();
    const buckets = {};

    indicadores.forEach((indicador) => {
      const label = indicador[key] || "Não informado";
      buckets[label] = buckets[label] || { grupo: label, indicadores: new Set(), lancamentos: [], homologados: 0, pendentes: 0, devolvidos: 0 };
      buckets[label].indicadores.add(indicador.id);
    });

    lancamentos.forEach((lancamento) => {
      const indicador = porId[lancamento.indicadorId];
      if (!indicador) return;
      const label = indicador[key] || "Não informado";
      buckets[label] = buckets[label] || { grupo: label, indicadores: new Set(), lancamentos: [], homologados: 0, pendentes: 0, devolvidos: 0 };
      buckets[label].lancamentos.push(lancamento);
      if (lancamento.status === "Homologado") buckets[label].homologados += 1;
      if (lancamento.status === "Enviado para homologação") buckets[label].pendentes += 1;
      if (lancamento.status === "Devolvido para ajuste") buckets[label].devolvidos += 1;
    });

    return Object.values(buckets).map((item) => ({
      [labelKey]: item.grupo,
      totalIndicadores: item.indicadores.size,
      totalLancamentos: item.lancamentos.length,
      homologados: item.homologados,
      pendentes: item.pendentes,
      devolvidos: item.devolvidos,
      atingimentoMedio: average(item.lancamentos.map((launch) => launch.percentualAtingido))
    }));
  }

  function launchRows(lancamentos) {
    const porId = indicatorMap();
    return lancamentos.map((lancamento) => {
      const indicador = porId[lancamento.indicadorId];
      return {
        numero: indicador ? indicador.numero : lancamento.indicadorId,
        indicador: indicador ? limparNomeIndicador(indicador.indicador) : lancamento.indicadorId,
        plano: indicador ? indicador.plano : "-",
        pilar: indicador ? indicador.pilar : "-",
        unidadeApuradora: indicador && indicador.unidadeApuradora ? indicador.unidadeApuradora : "Não informado",
        diretoriaResponsavel: indicador && indicador.diretoriaResponsavel ? indicador.diretoriaResponsavel : "Não informado",
        ano: lancamento.ano,
        mes: lancamento.nomeMes,
        metaMensal: lancamento.metaMensal,
        realizadoMensal: lancamento.realizadoMensal,
        percentualAtingido: lancamento.percentualAtingido,
        resultadoAcumulado: lancamento.resultadoAcumulado,
        percentualAtingidoAcumulado: lancamento.percentualAtingidoAcumulado,
        status: lancamento.status,
        justificativa: lancamento.justificativa,
        evidencia: lancamento.evidencia,
        observacaoArea: lancamento.observacaoArea,
        observacaoDiretoria: lancamento.observacaoDiretoria,
        dataHomologacao: lancamento.dataHomologacao,
        dataDevolucao: lancamento.dataDevolucao
      };
    });
  }

  function accumulatedRows(indicadores, lancamentos) {
    const rows = [];
    indicadores.forEach((indicador) => {
      const launches = lancamentos
        .filter((item) => item.indicadorId === indicador.id && hasOperationalData(item))
        .sort((a, b) => a.mes - b.mes);
      if (!launches.length) {
        return;
      }
      const last = launches[launches.length - 1];
      rows.push({
        ...baseIndicatorRow(indicador),
        ano: last.ano,
        ultimoMes: last.nomeMes,
        resultadoAcumulado: last.resultadoAcumulado,
        percentualAtingidoAcumulado: last.percentualAtingidoAcumulado,
        statusUltimoLancamento: last.status
      });
    });
    return rows;
  }

  function buildReport() {
    const type = document.getElementById("reportType").value;
    const indicadores = filterIndicators();
    const lancamentos = filterLaunches(indicadores);

    if (type === "geral") {
      return {
        columns: [
          ["numero", "Nº"], ["indicador", "Indicador"], ["plano", "Plano"], ["pilar", "Pilar"],
          ["periodicidade", "Periodicidade"], ["unidadeApuradora", "Unidade apuradora"], ["diretoriaResponsavel", "Diretoria responsável"],
          ["tipoCalculo", "Tipo"], ["ativo", "Status"]
        ],
        rows: indicadores.map(baseIndicatorRow)
      };
    }

    if (type === "plano") {
      return {
        columns: summaryColumns("plano"),
        rows: summarizeBy(indicadores, lancamentos, "plano", "plano")
      };
    }

    if (type === "pilar") {
      return {
        columns: summaryColumns("pilar"),
        rows: summarizeBy(indicadores, lancamentos, "pilar", "pilar")
      };
    }

    if (type === "unidade") {
      return {
        columns: summaryColumns("unidadeApuradora"),
        rows: summarizeBy(indicadores, lancamentos, "unidadeApuradora", "unidadeApuradora")
      };
    }

    if (type === "diretoria") {
      return {
        columns: summaryColumns("diretoriaResponsavel"),
        rows: summarizeBy(indicadores, lancamentos, "diretoriaResponsavel", "diretoriaResponsavel")
      };
    }

    if (type === "pendencias") {
      return {
        columns: launchColumns(),
        rows: launchRows(lancamentos.filter((item) => ["Não iniciado", "Em preenchimento", "Enviado para homologação", "Reaberto"].includes(item.status)))
      };
    }

    if (type === "homologacoes") {
      return {
        columns: launchColumns(),
        rows: launchRows(lancamentos.filter((item) => item.status === "Homologado"))
      };
    }

    if (type === "devolucoes") {
      return {
        columns: launchColumns(),
        rows: launchRows(lancamentos.filter((item) => item.status === "Devolvido para ajuste"))
      };
    }

    return {
      columns: [
        ["numero", "Nº"], ["indicador", "Indicador"], ["plano", "Plano"], ["pilar", "Pilar"],
        ["ano", "Ano"], ["ultimoMes", "Último mês"], ["resultadoAcumulado", "Resultado acumulado", "number"],
        ["percentualAtingidoAcumulado", "% acumulado", "percent"], ["statusUltimoLancamento", "Status"]
      ],
      rows: accumulatedRows(indicadores, lancamentos)
    };
  }

  function summaryColumns(firstKey) {
    const labels = {
      plano: "Plano",
      pilar: "Pilar",
      unidadeApuradora: "Unidade apuradora",
      diretoriaResponsavel: "Diretoria responsável"
    };
    return [
      [firstKey, labels[firstKey]],
      ["totalIndicadores", "Indicadores", "number"],
      ["totalLancamentos", "Lançamentos", "number"],
      ["homologados", "Homologados", "number"],
      ["pendentes", "Pendentes", "number"],
      ["devolvidos", "Devolvidos", "number"],
      ["atingimentoMedio", "Atingimento médio", "percent"]
    ];
  }

  function launchColumns() {
    return [
      ["numero", "Nº"], ["indicador", "Indicador"], ["plano", "Plano"], ["pilar", "Pilar"],
      ["unidadeApuradora", "Unidade apuradora"], ["diretoriaResponsavel", "Diretoria responsável"],
      ["ano", "Ano"], ["mes", "Mês"], ["metaMensal", "Meta", "number"],
      ["realizadoMensal", "Realizado", "number"], ["percentualAtingido", "% atingido", "percent"],
      ["resultadoAcumulado", "Resultado acumulado", "number"], ["percentualAtingidoAcumulado", "% acumulado", "percent"],
      ["status", "Status"], ["justificativa", "Justificativa"], ["observacaoArea", "Observação da área"],
      ["evidencia", "Evidência"], ["observacaoDiretoria", "Observação da diretoria"]
    ];
  }

  function renderReport() {
    const report = buildReport();
    state.currentRows = report.rows;
    state.currentColumns = report.columns;

    document.getElementById("reportCount").textContent = `${report.rows.length} registro(s)`;
    document.getElementById("relatoriosHead").innerHTML = `<tr>${report.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`;

    const body = document.getElementById("relatoriosTable");
    if (!report.rows.length) {
      body.innerHTML = `<tr><td colspan="${report.columns.length}">Nenhum dado operacional preenchido até o momento.</td></tr>`;
      return;
    }

    body.innerHTML = report.rows.map((row) => `
      <tr>
        ${report.columns.map(([key, , type]) => `<td>${escapeHtml(formatValue(row[key], type))}</td>`).join("")}
      </tr>
    `).join("");
  }

  function bindEvents() {
    document.getElementById("reportType").addEventListener("change", renderReport);
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", renderReport);
    });
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicadores: Auth.filterIndicatorsByUser(data.indicadores, user),
      lancamentos: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      homologacoes: data.homologacoes,
      currentRows: [],
      currentColumns: []
    };

    fillReportTypes();
    fillFilters();
    bindEvents();
    renderReport();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.relatorios = { init };
})();
