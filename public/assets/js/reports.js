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

  function normalizeLaunchForReport(launch, rules) {
    if (Number(launch?.indicadorId) !== 6 || !window.IeoRecorrente) return launch;
    const rule = (rules || []).find((item) => Number(item.indicadorId) === 6);
    return window.IeoRecorrente.normalizarLancamentoParaExibicao(launch, rule);
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

  async function initLegacy({ data, user }) {
    const visibleLaunches = Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user);
    state = {
      data,
      user,
      indicadores: Auth.filterIndicatorsByUser(data.indicadores, user),
      lancamentos: visibleLaunches.map((launch) => normalizeLaunchForReport(launch, data.regrasIndicadores)),
      homologacoes: data.homologacoes,
      currentRows: [],
      currentColumns: []
    };

    fillReportTypes();
    fillFilters();
    bindEvents();
    renderReport();
  }

  let officialState = {
    user: null,
    payload: null,
    rows: [],
    optionsInitialized: false,
    sort: { key: "codigo", direction: 1 }
  };

  const MONTHS = [
    [1, "Janeiro"], [2, "Fevereiro"], [3, "Março"], [4, "Abril"],
    [5, "Maio"], [6, "Junho"], [7, "Julho"], [8, "Agosto"],
    [9, "Setembro"], [10, "Outubro"], [11, "Novembro"], [12, "Dezembro"]
  ];

  function officialApiUrl(params) {
    return window.appUrl
      ? window.appUrl("api/relatorios/consolidado", params)
      : `/api/relatorios/consolidado?${new URLSearchParams(params).toString()}`;
  }

  function detailedApiUrl(indicatorId, year) {
    return window.appUrl
      ? window.appUrl(`api/relatorios/indicador/${encodeURIComponent(indicatorId)}`, { ano: year })
      : `/api/relatorios/indicador/${encodeURIComponent(indicatorId)}?ano=${encodeURIComponent(year)}`;
  }

  function detailedReportUrl(indicatorId) {
    return window.appUrl
      ? window.appUrl("relatorios", { tipo: "detalhado", indicador: indicatorId })
      : `/relatorios?tipo=detalhado&indicador=${encodeURIComponent(indicatorId)}`;
  }

  function isActiveAdministrator(user) {
    return user?.perfilCodigo === "administrador" && user?.perfilOriginalCodigo === "administrador";
  }

  function selectOptions(target, values, allLabel, mapValue = (item) => item, mapLabel = (item) => item) {
    const select = document.getElementById(target);
    if (!select) return;
    const current = select.value;
    const options = allLabel === null ? [] : [{ value: "", label: allLabel }];
    values.forEach((item) => options.push({ value: String(mapValue(item)), label: String(mapLabel(item)) }));
    select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
    if (options.some((option) => option.value === current)) select.value = current;
  }

  function initializeOfficialOptions(options) {
    if (officialState.optionsInitialized) return;
    selectOptions("officialFilterYear", options.anos || [2026], null);
    selectOptions("officialFilterPlan", options.planos || [], "Todos");
    selectOptions("officialFilterBoard", options.diretorias || [], "Todas");
    selectOptions("officialFilterUnit", options.unidades || [], "Todas");
    selectOptions("officialFilterSituation", options.situacoes || [], "Todas", (item) => item, situationLabel);
    selectOptions("officialFilterIndicator", options.indicadores || [], "Todos", (item) => item.id, (item) => `${String(item.codigo).padStart(2, "0")} — ${item.nome}`);
    selectOptions("officialFilterCompetence", MONTHS, null, ([month]) => `2026-${String(month).padStart(2, "0")}`, ([, name]) => name);
    const competence = document.getElementById("officialFilterCompetence");
    if (competence) competence.value = "2026-03";
    officialState.optionsInitialized = true;
  }

  function officialFilters() {
    const value = (id) => document.getElementById(id)?.value || "";
    const year = value("officialFilterYear") || "2026";
    const competenceValue = value("officialFilterCompetence");
    return {
      ano: year,
      posicao: value("officialFilterPosition") || "ultima",
      competencia: competenceValue ? `${year}-${competenceValue.slice(-2)}` : "",
      trimestre: value("officialFilterQuarter"),
      plano: value("officialFilterPlan"),
      indicador: value("officialFilterIndicator"),
      diretoria: value("officialFilterBoard"),
      unidade: value("officialFilterUnit"),
      situacao: value("officialFilterSituation")
    };
  }

  function updatePositionFilters() {
    const position = document.getElementById("officialFilterPosition")?.value || "ultima";
    document.getElementById("officialCompetenceFilterLabel").hidden = position !== "competencia";
    document.getElementById("officialQuarterFilterLabel").hidden = position !== "trimestre";
  }

  function positionLabel(filters) {
    if (filters.posicao === "competencia") return "Competência";
    if (filters.posicao === "trimestre") return "Trimestre";
    return "Última posição oficial";
  }

  function referenceLabel(filters) {
    if (filters.posicao === "competencia" && filters.competencia) {
      const month = MONTHS.find(([number]) => number === Number(filters.competencia.slice(-2)));
      return month ? `${month[1]}/${filters.ano}` : filters.competencia;
    }
    if (filters.posicao === "trimestre" && filters.trimestre) return `${filters.trimestre}TRI/${filters.ano}`;
    return "Mais recente homologada";
  }

  function situationLabel(value) {
    const labels = { "Nao apurado": "Não apurado", "Nao atingido": "Não atingido" };
    return labels[value] || value || "Não apurado";
  }

  function governanceLabel(value) {
    const labels = {
      "Homologado - versao atual": "Homologado — versão atual",
      "Homologado legado - sem evento transacional": "Homologado legado — sem evento transacional",
      "Sem posicao oficial": "Sem posição oficial"
    };
    return labels[value] || value || "Sem posição oficial";
  }

  function formatMeasure(value, unit) {
    if (value === null || value === undefined || value === "") return "—";
    if (unit === "pontos") return `${Calculations.formatarValor(value, "numero")} pontos`;
    if (unit === "quantidade") {
      const number = Number(value);
      return Number.isFinite(number) ? number.toLocaleString("pt-BR", { maximumFractionDigits: Number.isInteger(number) ? 0 : 2 }) : String(value);
    }
    if (["moeda", "percentual", "inteiro"].includes(unit)) return Calculations.formatarValor(value, unit);
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) : String(value);
  }

  function formatApprovalDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(date)} -03:00`;
  }

  function badgeClass(value) {
    if (["Atingido", "Superado"].includes(value)) return "ok";
    if (["Abaixo da meta", "Não atingido", "Nao atingido"].includes(value)) return "danger";
    if (value === "Não apurado" || value === "Nao apurado") return "muted";
    return "info";
  }

  function sortedOfficialRows() {
    const { key, direction } = officialState.sort;
    return [...officialState.rows].sort((left, right) => {
      const a = left[key] ?? "";
      const b = right[key] ?? "";
      if (typeof a === "number" && typeof b === "number") return (a - b) * direction;
      return String(a).localeCompare(String(b), "pt-BR", { numeric: true }) * direction;
    });
  }

  function renderOfficialRows() {
    const body = document.getElementById("officialReportTable");
    const rows = sortedOfficialRows();
    document.getElementById("officialReportCount").textContent = `${rows.length} indicador(es)`;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="14">Nenhum indicador encontrado para os filtros e o escopo autorizado.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((row) => {
      const situation = situationLabel(row.situacao);
      const governance = governanceLabel(row.governanca);
      const source = row.fonteDocumental || "—";
      const observation = row.observacaoOficialDisponivel ? '<small class="report-document-note">Observação oficial disponível</small>' : "";
      return `<tr>
        <td>${String(row.codigo).padStart(2, "0")}</td><td class="report-indicator-name"><a class="report-detail-link" href="${escapeHtml(detailedReportUrl(row.indicadorId))}">${escapeHtml(row.indicador)}</a><small class="report-document-note no-print">Ver detalhes</small></td><td>${escapeHtml(row.plano || "—")}</td>
        <td>${escapeHtml(row.diretoria || "—")}</td><td>${escapeHtml(row.unidade || "—")}</td><td>${escapeHtml(row.competencia || "—")}</td>
        <td class="report-number">${escapeHtml(formatMeasure(row.metaOficial, row.unidadeMedida))}</td><td class="report-number">${escapeHtml(formatMeasure(row.resultadoOficial, row.unidadeMedida))}</td>
        <td class="report-number">${row.atingimento === null ? "—" : escapeHtml(Calculations.formatarPercentual(row.atingimento))}</td>
        <td><span class="badge ${badgeClass(situation)}">${escapeHtml(situation)}</span></td><td>${escapeHtml(governance)}</td><td>${row.versao ?? "—"}</td>
        <td>${escapeHtml(formatApprovalDate(row.dataHomologacao))}${row.homologador ? `<small class="report-document-note">${escapeHtml(row.homologador)}</small>` : ""}</td>
        <td>${escapeHtml(source)}${observation}</td></tr>`;
    }).join("");
  }

  function renderOfficialContext(payload) {
    const filters = payload.filtros;
    const generatedAt = formatApprovalDate(payload.geradoEm);
    const generatedBy = [payload.geradoPor?.nome, payload.geradoPor?.matricula].filter(Boolean).join(" — ") || "—";
    document.getElementById("reportContextYear").textContent = filters.ano;
    document.getElementById("reportContextPosition").textContent = positionLabel(filters);
    document.getElementById("reportContextReference").textContent = referenceLabel(filters);
    document.getElementById("reportContextScope").textContent = payload.escopo;
    document.getElementById("reportContextGeneratedAt").textContent = generatedAt;
    document.getElementById("reportContextGeneratedBy").textContent = generatedBy;
    document.getElementById("officialReportFooterGeneration").textContent = `Gerado por ${generatedBy} em ${generatedAt}`;
    const applied = [
      `Exercício: ${filters.ano}`, `Posição: ${positionLabel(filters)}`, `Referência: ${referenceLabel(filters)}`,
      `Escopo: ${payload.escopo}`, filters.plano ? `Plano: ${filters.plano}` : "",
      filters.diretoria ? `Diretoria: ${filters.diretoria}` : "", filters.unidade ? `Unidade: ${filters.unidade}` : "",
      filters.situacao ? `Situação: ${situationLabel(filters.situacao)}` : ""
    ].filter(Boolean);
    document.getElementById("officialReportFilterSummary").textContent = applied.join(" | ");
  }

  async function loadOfficialReport() {
    const notice = document.getElementById("officialReportNotice");
    notice.hidden = true;
    const response = await fetch(officialApiUrl(officialFilters()), { cache: "no-store", headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.sucesso === false) throw new Error(body.mensagem || "Não foi possível carregar o relatório consolidado.");
    const payload = body.dados || body;
    officialState.payload = payload;
    officialState.rows = Array.isArray(payload.linhas) ? payload.linhas : [];
    initializeOfficialOptions(payload.opcoes || {});
    renderOfficialContext(payload);
    renderOfficialRows();
  }

  function bindOfficialEvents() {
    const filterIds = ["officialFilterYear", "officialFilterPosition", "officialFilterCompetence", "officialFilterQuarter", "officialFilterPlan", "officialFilterIndicator", "officialFilterBoard", "officialFilterUnit", "officialFilterSituation"];
    filterIds.forEach((id) => document.getElementById(id)?.addEventListener("change", () => {
      updatePositionFilters();
      loadOfficialReport().catch(showOfficialError);
    }));
    document.getElementById("printOfficialReport")?.addEventListener("click", () => window.print());
    document.querySelector(".official-report-table thead")?.addEventListener("click", (event) => {
      const header = event.target.closest("[data-official-sort]");
      if (!header) return;
      const key = header.dataset.officialSort;
      officialState.sort = { key, direction: officialState.sort.key === key ? officialState.sort.direction * -1 : 1 };
      renderOfficialRows();
    });
  }

  function showOfficialError(error) {
    const notice = document.getElementById("officialReportNotice");
    notice.hidden = false;
    notice.textContent = error.message;
  }

  function detailedMode() {
    const params = new URLSearchParams(String(window.location?.search || ""));
    return params.get("tipo") === "detalhado" && Boolean(params.get("indicador"))
      ? { indicatorId: params.get("indicador"), year: params.get("ano") || "2026" }
      : null;
  }

  function polaridadeLabel(value) {
    const labels = {
      quanto_maior_melhor: "Quanto maior, melhor",
      quanto_menor_melhor: "Quanto menor, melhor",
      meta_exata: "Meta exata"
    };
    return labels[value] || value || "—";
  }

  function detailedIdentification(payload) {
    const indicator = payload.indicador || {};
    const items = [
      ["Código", String(indicator.codigo || "").padStart(2, "0")], ["Indicador", indicator.nome],
      ["Plano", indicator.plano], ["Pilar", indicator.pilar], ["Diretoria", indicator.diretoria],
      ["Unidade apuradora", indicator.unidade], ["Descrição", indicator.descricao], ["Fórmula", indicator.formula],
      ["Polaridade", polaridadeLabel(indicator.polaridade)], ["Periodicidade", indicator.periodicidade],
      ["Meta anual", indicator.metaAnual], ["Unidade de medida", indicator.unidadeMedida]
    ];
    document.getElementById("detailedReportTitle").textContent = `Relatório Detalhado — Indicador ${String(indicator.codigo || "").padStart(2, "0")} — ${indicator.nome || ""}`;
    document.getElementById("detailedIndicatorIdentification").innerHTML = items.map(([label, value]) => (
      `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value === null || value === undefined || value === "" ? "—" : value)}</strong></div>`
    )).join("");
  }

  function detailedValue(value, payload) {
    return formatMeasure(value, payload.indicador?.unidadeMedida);
  }

  function detailedTrajectory(payload) {
    const body = document.getElementById("detailedTrajectoryTable");
    body.innerHTML = (payload.trajetoria || []).map((row) => {
      const situation = situationLabel(row.situacao);
      return `<tr><td>${escapeHtml(referenceCompetence(row.competencia))}</td>
        <td class="report-number">${escapeHtml(detailedValue(row.meta, payload))}</td>
        <td class="report-number">${escapeHtml(detailedValue(row.resultado, payload))}</td>
        <td class="report-number">${row.atingimento === null ? "—" : escapeHtml(Calculations.formatarPercentual(row.atingimento))}</td>
        <td><span class="badge ${badgeClass(situation)}">${escapeHtml(situation)}</span></td>
        <td>${escapeHtml(governanceLabel(row.governanca))}</td><td>${row.versao ?? "—"}</td></tr>`;
    }).join("");
  }

  function referenceCompetence(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return value || "—";
    const month = MONTHS.find(([number]) => number === Number(match[2]));
    return `${month ? month[1] : match[2]}/${match[1]}`;
  }

  function detailedQuarterly(payload) {
    const body = document.getElementById("detailedQuarterTable");
    body.innerHTML = (payload.fechamentosTrimestrais || []).map((row) => {
      const situation = situationLabel(row.situacao);
      return `<tr><td>${escapeHtml(row.trimestre)}</td><td>${escapeHtml(referenceCompetence(row.competencia))}</td>
        <td class="report-number">${escapeHtml(detailedValue(row.meta, payload))}</td>
        <td class="report-number">${escapeHtml(detailedValue(row.resultado, payload))}</td>
        <td class="report-number">${row.atingimento === null ? "—" : escapeHtml(Calculations.formatarPercentual(row.atingimento))}</td>
        <td><span class="badge ${badgeClass(situation)}">${escapeHtml(situation)}</span></td>
        <td>${escapeHtml(governanceLabel(row.governanca))}</td><td>${row.versao ?? "—"}</td><td>${escapeHtml(row.fonteDocumental || "—")}</td></tr>`;
    }).join("");
  }

  function detailedObservations(payload) {
    const target = document.getElementById("detailedObservations");
    const observations = payload.observacoesOficiais || [];
    if (!observations.length) {
      target.innerHTML = '<p class="empty-state">Nenhuma observação oficial disponível para o exercício.</p>';
      return;
    }
    target.innerHTML = observations.map((item) => `<article class="detailed-document-card">
      <header><strong>${escapeHtml(item.trimestre)}</strong><span>${escapeHtml(referenceCompetence(item.competencia))}</span></header>
      <p>${escapeHtml(item.observacao)}</p><dl><dt>Fonte</dt><dd>${escapeHtml(item.fonte || "—")}</dd>
      <dt>Páginas</dt><dd>${escapeHtml(item.paginas || "—")}</dd><dt>Tipo</dt><dd>${escapeHtml(item.tipo || "—")}</dd>
      <dt>Carregado em</dt><dd>${escapeHtml(formatApprovalDate(item.carregadoEm))}</dd></dl></article>`).join("");
  }

  function evidenceDownloadUrl(id) {
    return window.appUrl
      ? window.appUrl(`evidencias/${encodeURIComponent(id)}/download`)
      : `/evidencias/${encodeURIComponent(id)}/download`;
  }

  function renderEvidenceRows(targetId, items) {
    const target = document.getElementById(targetId);
    if (!items.length) {
      target.innerHTML = '<tr><td colspan="6">Nenhuma evidência disponível.</td></tr>';
      return;
    }
    target.innerHTML = items.map((item) => `<tr><td>${escapeHtml(referenceCompetence(item.competencia))}</td><td>${item.versao}</td>
      <td>${escapeHtml(item.nomeArquivo || "—")}${item.descricao ? `<small class="report-document-note">${escapeHtml(item.descricao)}</small>` : ""}</td>
      <td>${escapeHtml(formatApprovalDate(item.dataUpload))}</td><td>${escapeHtml(item.usuario || "—")}</td>
      <td class="no-print">${item.podeBaixar ? `<a class="secondary-action table-action" href="${escapeHtml(evidenceDownloadUrl(item.id))}">Baixar</a>` : "—"}</td></tr>`).join("");
  }

  function detailedEvidence(payload) {
    const evidence = payload.evidencias || {};
    renderEvidenceRows("detailedCurrentEvidenceTable", evidence.versaoAtual || []);
    renderEvidenceRows("detailedHistoricalEvidenceTable", evidence.versoesAnteriores || []);
  }

  function detailedVersionHistory(payload) {
    const target = document.getElementById("detailedVersionHistoryTable");
    const items = payload.historicoVersoes || [];
    if (!items.length) {
      target.innerHTML = '<tr><td colspan="9">Nenhuma versão anterior registrada.</td></tr>';
      return;
    }
    target.innerHTML = items.map((item) => `<tr><td>${escapeHtml(referenceCompetence(item.competencia))}</td><td>${item.versao}</td>
      <td>${escapeHtml(item.status || "—")}</td><td>${escapeHtml(detailedValue(item.meta, payload))}</td>
      <td>${escapeHtml(detailedValue(item.resultado, payload))}</td><td>${item.atingimento === null ? "—" : escapeHtml(Calculations.formatarPercentual(item.atingimento))}</td>
      <td>${escapeHtml(situationLabel(item.situacao))}</td><td>${escapeHtml(formatApprovalDate(item.retificadoEm))}</td><td>${escapeHtml(item.retificadoPor || "—")}</td></tr>`).join("");
  }

  function detailedGovernance(payload) {
    const target = document.getElementById("detailedGovernanceTable");
    const items = payload.governancaResumida || [];
    if (!items.length) {
      target.innerHTML = '<tr><td colspan="7">Nenhuma posição homologada no exercício.</td></tr>';
      return;
    }
    target.innerHTML = items.map((item) => `<tr><td>${escapeHtml(referenceCompetence(item.competencia))}</td><td>${item.versao}</td>
      <td>${escapeHtml(governanceLabel(item.governanca))}</td><td>${escapeHtml(formatApprovalDate(item.submetidoEm))}</td>
      <td>${escapeHtml(item.submetidoPor || "—")}</td><td>${escapeHtml(formatApprovalDate(item.homologadoEm))}</td><td>${escapeHtml(item.homologadoPor || "—")}</td></tr>`).join("");
  }

  function detailedContext(payload) {
    const generatedAt = formatApprovalDate(payload.geradoEm);
    const generatedBy = [payload.geradoPor?.nome, payload.geradoPor?.matricula].filter(Boolean).join(" — ") || "—";
    document.getElementById("detailedContextYear").textContent = payload.ano;
    document.getElementById("detailedContextScope").textContent = payload.escopo;
    document.getElementById("detailedContextGeneratedAt").textContent = generatedAt;
    document.getElementById("detailedContextGeneratedBy").textContent = generatedBy;
    document.getElementById("detailedReportFooterGeneration").textContent = `Gerado por ${generatedBy} em ${generatedAt}`;
  }

  async function loadDetailedReport(mode) {
    const response = await fetch(detailedApiUrl(mode.indicatorId, mode.year), { cache: "no-store", headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.sucesso === false) throw new Error(body.mensagem || "Não foi possível carregar o relatório detalhado.");
    const payload = body.dados || body;
    detailedContext(payload); detailedIdentification(payload); detailedTrajectory(payload);
    detailedQuarterly(payload); detailedObservations(payload); detailedEvidence(payload);
    detailedVersionHistory(payload); detailedGovernance(payload);
  }

  function showDetailedError(error) {
    const notice = document.getElementById("detailedReportNotice");
    notice.hidden = false;
    notice.textContent = error.message;
  }

  async function init({ user }) {
    officialState.user = user;
    const mode = detailedMode();
    if (mode) {
      document.getElementById("officialConsolidatedReport").hidden = true;
      document.getElementById("detailedIndicatorReport").hidden = false;
      document.getElementById("printDetailedReport")?.addEventListener("click", () => window.print());
      await loadDetailedReport(mode).catch(showDetailedError);
      return;
    }
    updatePositionFilters();
    bindOfficialEvents();
    await loadOfficialReport();

    if (isActiveAdministrator(user)) {
      const legacySection = document.getElementById("operationalReportsSection");
      legacySection.hidden = false;
      const data = await DataStore.loadAll();
      await initLegacy({ data, user });
      window.DatabaseService?.initBancoDadosSqlServer?.();
    }
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.relatorios = { init };
  window.__REPORTS_TEST_INTERNALS__ = {
    governanceLabel, situationLabel, formatMeasure, formatApprovalDate, isActiveAdministrator,
    detailedMode, referenceCompetence, polaridadeLabel, detailedApiUrl, detailedReportUrl, evidenceDownloadUrl
  };
})();
