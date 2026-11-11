(function (root) {
  "use strict";

  const state = { user: null, payload: null, rows: [] };
  const STATUS_LABELS = {
    NAO_INICIADA: "Não iniciada",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDA: "Concluída",
    SUSPENSA: "Suspensa",
    CANCELADA: "Cancelada",
    NAO_INICIADO: "Não iniciado",
    EM_PREENCHIMENTO: "Em preenchimento",
    ENVIADO_HOMOLOGACAO: "Enviado para homologação",
    DEVOLVIDO_AJUSTE: "Devolvido para ajuste",
    HOMOLOGADO: "Homologado",
    REABERTO: "Reaberto"
  };

  function text(value) {
    return value === null || value === undefined || value === "" ? "—" : String(value);
  }

  function statusLabel(value) {
    return STATUS_LABELS[value] || text(value);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
  }

  function apiUrl(params) {
    if (typeof root.appUrl === "function") return root.appUrl("api/relatorios/iniciativas", params);
    return `/api/relatorios/iniciativas?${new URLSearchParams(params).toString()}`;
  }

  async function requestReport(params) {
    const response = await fetch(apiUrl(params), { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.sucesso === false) {
      throw new Error(payload.mensagem || "Não foi possível carregar o relatório de iniciativas.");
    }
    return payload.dados;
  }

  function currentFilters() {
    const fields = {
      ano: "initiativeReportYear",
      trimestre: "initiativeReportQuarter",
      pilar: "initiativeReportPillar",
      unidade: "initiativeReportUnit",
      diretoria: "initiativeReportBoard",
      statusIniciativa: "initiativeReportInitiativeStatus",
      statusFluxo: "initiativeReportWorkflowStatus"
    };
    const result = {};
    Object.entries(fields).forEach(([key, id]) => {
      const value = document.getElementById(id)?.value || "";
      if (value) result[key] = value;
    });
    return result;
  }

  function replaceOptions(id, values, allLabel) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    const options = [];
    if (allLabel) options.push({ value: "", label: allLabel });
    values.forEach((value) => options.push({ value: String(value), label: String(value) }));
    select.replaceChildren(...options.map((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      return option;
    }));
    if (options.some((item) => item.value === current)) select.value = current;
    else if (options.length) select.value = options[0].value;
  }

  function showMessage(message, type = "info") {
    const target = document.getElementById("initiativeReportMessage");
    target.textContent = message;
    target.className = `notice ${type} no-print`;
    target.hidden = !message;
  }

  function renderContext(payload, filters) {
    const context = payload.contexto || {};
    document.getElementById("initiativeContextYear").textContent = filters.ano || "Todos";
    document.getElementById("initiativeContextScope").textContent = text(context.escopo);
    document.getElementById("initiativeContextGeneratedAt").textContent = formatDate(context.geradoEm);
    document.getElementById("initiativeContextGeneratedBy").textContent = text(context.geradoPor);
    document.getElementById("initiativeReportFooterGeneration").textContent = `Gerado em ${formatDate(context.geradoEm)}`;
  }

  function renderSummary(payload) {
    const summary = payload.resumo || {};
    document.getElementById("initiativeReportTrackingCount").textContent = String(summary.acompanhamentos || 0);
    document.getElementById("initiativeReportMasterCount").textContent = String(summary.iniciativas || 0);
    document.getElementById("initiativeReportApprovedCount").textContent = String(summary.homologados || 0);
    document.getElementById("initiativeReportPendingCount").textContent = String(summary.pendentes || 0);
  }

  function renderFilterSummary(filters) {
    const parts = [
      filters.ano ? `Ano: ${filters.ano}` : "Todos os anos",
      filters.trimestre ? `Trimestre: ${filters.trimestre}` : "",
      filters.pilar ? `Pilar: ${filters.pilar}` : "",
      filters.unidade ? `Unidade: ${filters.unidade}` : "",
      filters.diretoria ? `Diretoria: ${filters.diretoria}` : "",
      filters.statusIniciativa ? `Situação: ${statusLabel(filters.statusIniciativa)}` : "",
      filters.statusFluxo ? `Acompanhamento: ${statusLabel(filters.statusFluxo)}` : ""
    ].filter(Boolean);
    document.getElementById("initiativeReportFilterSummary").textContent = parts.join(" · ");
  }

  function cell(value, className = "") {
    const td = document.createElement("td");
    td.textContent = text(value);
    if (className) td.className = className;
    return td;
  }

  function renderTable(rows) {
    const body = document.getElementById("initiativeReportTable");
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = cell("Nenhum acompanhamento encontrado para os filtros selecionados.");
      td.colSpan = 13;
      tr.append(td);
      body.replaceChildren(tr);
      return;
    }
    body.replaceChildren(...rows.map((row) => {
      const tr = document.createElement("tr");
      tr.append(
        cell(row.codigo),
        cell(row.pilarSnapshot),
        cell(row.tituloSnapshot, "initiative-report-title-cell"),
        cell(row.unidadeSnapshot),
        cell(row.diretoriaSnapshot),
        cell(`${row.trimestre}/${row.ano}`),
        cell(statusLabel(row.statusIniciativa)),
        cell(statusLabel(row.statusFluxo)),
        cell(row.andamentoUnidade, "initiative-report-long-cell"),
        cell(row.referenciaEvidencia, "initiative-report-reference-cell"),
        cell(row.quantidadeEvidencias || 0),
        cell(row.homologadoPor),
        cell(formatDate(row.homologadoEm))
      );
      return tr;
    }));
  }

  function populateOptions(payload) {
    const options = payload.opcoes || {};
    replaceOptions("initiativeReportYear", options.anos || [2026], "Todos");
    replaceOptions("initiativeReportPillar", options.pilares || [], "Todos");
    replaceOptions("initiativeReportUnit", options.unidades || [], "Todas");
    replaceOptions("initiativeReportBoard", options.diretorias || [], "Todas");
  }

  async function loadReport() {
    const filters = currentFilters();
    showMessage("");
    try {
      const payload = await requestReport(filters);
      state.payload = payload;
      state.rows = Array.isArray(payload.linhas) ? payload.linhas : [];
      populateOptions(payload);
      renderContext(payload, filters);
      renderSummary(payload);
      renderFilterSummary(filters);
      renderTable(state.rows);
    } catch (error) {
      state.payload = null;
      state.rows = [];
      showMessage(error.message || String(error), "danger");
      renderTable([]);
    }
  }

  function csvValue(value) {
    const normalized = value === null || value === undefined ? "" : String(value).replace(/\r?\n/g, " ");
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    if (!state.rows.length) {
      showMessage("Não há registros para exportar.", "warning");
      return;
    }
    const headers = [
      "Código", "Pilar", "Iniciativa", "Unidade", "Diretoria", "Período",
      "Status da iniciativa", "Status do acompanhamento", "Andamento",
      "Referência documental", "Arquivos", "Homologado por", "Homologado em"
    ];
    const lines = [headers.map(csvValue).join(";")];
    state.rows.forEach((row) => {
      lines.push([
        row.codigo, row.pilarSnapshot, row.tituloSnapshot, row.unidadeSnapshot,
        row.diretoriaSnapshot, `${row.trimestre}/${row.ano}`,
        statusLabel(row.statusIniciativa), statusLabel(row.statusFluxo),
        row.andamentoUnidade, row.referenciaEvidencia, row.quantidadeEvidencias || 0,
        row.homologadoPor, formatDate(row.homologadoEm)
      ].map(csvValue).join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const year = currentFilters().ano || "todos";
    link.download = `relatorio-iniciativas-${year}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    const objectUrl = link.href;
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function clearFilters() {
    document.getElementById("initiativeReportFilters").reset();
    const year = document.getElementById("initiativeReportYear");
    if (Array.from(year.options).some((option) => option.value === "2026")) year.value = "2026";
    document.getElementById("initiativeReportWorkflowStatus").value = "HOMOLOGADO";
    loadReport();
  }

  async function init({ user }) {
    state.user = user;
    document.getElementById("initiativeReportFilters").addEventListener("submit", (event) => {
      event.preventDefault();
      loadReport();
    });
    document.getElementById("clearInitiativeReportFilters").addEventListener("click", clearFilters);
    document.getElementById("exportInitiativeReport").addEventListener("click", exportCsv);
    document.getElementById("printInitiativeReport").addEventListener("click", () => root.print());
    await loadReport();
  }

  root.PageModules = root.PageModules || {};
  root.PageModules.relatorios = { init };
})(window);

