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

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = text(value);
    return node;
  }

  function statusTone(value) {
    if (["HOMOLOGADO", "CONCLUIDA"].includes(value)) return "success";
    if (["DEVOLVIDO_AJUSTE", "CANCELADA", "SUSPENSA"].includes(value)) return "danger";
    if (["ENVIADO_HOMOLOGACAO", "REABERTO"].includes(value)) return "warning";
    return "info";
  }

  function statusBadge(value) {
    return element(
      "span",
      `initiative-report-status initiative-report-status--${statusTone(value)}`,
      statusLabel(value)
    );
  }

  function periodLabel(row) {
    return [row.trimestre, row.ano].filter(Boolean).join("/") || "—";
  }

  function narrativeText(value) {
    if (value === null || value === undefined || value === "") return "—";
    const blocks = [];
    let current = [];
    const flush = () => {
      if (!current.length) return;
      blocks.push(current.join(" ").replace(/\s+/g, " ").trim());
      current = [];
    };
    String(value).replace(/\r/g, "").split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        flush();
        return;
      }
      if (/^(?:[-•▪]\s+|[ivxlcdm]+\)|\d+[.)])\s*/i.test(line)) flush();
      current.push(line);
    });
    flush();
    return blocks.join("\n");
  }

  function trackingOrder(row) {
    const quarter = Number.parseInt(String(row.trimestre || "0"), 10) || 0;
    return (Number(row.ano) || 0) * 10 + quarter;
  }

  function groupRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = String(row.iniciativaId || row.codigo || row.tituloSnapshot || "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return Array.from(groups.values())
      .map((items) => items.sort((left, right) => trackingOrder(right) - trackingOrder(left)))
      .sort((left, right) => String(left[0]?.codigo || left[0]?.tituloSnapshot || "")
        .localeCompare(String(right[0]?.codigo || right[0]?.tituloSnapshot || ""), "pt-BR", { numeric: true }));
  }

  function appendDefinition(list, label, value) {
    const item = element("div", "initiative-report-definition");
    item.append(element("dt", "", label), element("dd", "", value));
    list.append(item);
  }

  function trackingMetadata(row, compact = false) {
    const list = element("dl", compact
      ? "initiative-report-metadata initiative-report-metadata--compact"
      : "initiative-report-metadata");
    appendDefinition(list, "Período", periodLabel(row));
    appendDefinition(list, "Unidade", row.unidadeSnapshot);
    appendDefinition(list, "Diretoria", row.diretoriaSnapshot);
    appendDefinition(list, "Pilar", row.pilarSnapshot);
    return list;
  }

  function governanceMetadata(row) {
    const list = element("dl", "initiative-report-governance");
    appendDefinition(list, "Referência documental", row.referenciaEvidencia);
    appendDefinition(list, "Arquivos", row.quantidadeEvidencias || 0);
    appendDefinition(list, "Homologado por", row.homologadoPor);
    appendDefinition(list, "Homologado em", formatDate(row.homologadoEm));
    return list;
  }

  function progressBlock(row, heading = "Andamento da iniciativa") {
    const section = element("section", "initiative-report-progress");
    section.append(
      element("h4", "initiative-report-progress__title", heading),
      element("p", "initiative-report-progress__text", narrativeText(row.andamentoUnidade))
    );
    return section;
  }

  function historyItem(row) {
    const item = element("article", "initiative-report-history-item");
    const header = element("header", "initiative-report-history-item__header");
    header.append(element("h5", "", periodLabel(row)));
    const statuses = element("div", "initiative-report-statuses");
    statuses.append(statusBadge(row.statusIniciativa), statusBadge(row.statusFluxo));
    header.append(statuses);
    item.append(header, trackingMetadata(row, true), progressBlock(row, "Andamento no período"), governanceMetadata(row));
    return item;
  }

  function initiativeCard(rows) {
    const current = rows[0];
    const history = rows.slice(1);
    const card = element("article", "initiative-report-card");
    const header = element("header", "initiative-report-card__header");
    const identity = element("div", "initiative-report-card__identity");
    identity.append(
      element("p", "initiative-report-card__code", current.codigo),
      element("h3", "initiative-report-card__title", current.tituloSnapshot)
    );
    const statuses = element("div", "initiative-report-statuses");
    statuses.append(statusBadge(current.statusIniciativa), statusBadge(current.statusFluxo));
    header.append(identity, statuses);
    card.append(header, trackingMetadata(current), progressBlock(current));

    const details = element("details", "initiative-report-details");
    const summary = element(
      "summary",
      "initiative-report-details__summary",
      history.length ? `Ver detalhes e histórico (${rows.length} acompanhamentos)` : "Ver detalhes"
    );
    const content = element("div", "initiative-report-details__content");
    content.append(element("h4", "initiative-report-details__title", "Governança do acompanhamento atual"));
    content.append(governanceMetadata(current));
    if (history.length) {
      content.append(element("h4", "initiative-report-details__title", "Histórico trimestral"));
      const historyList = element("div", "initiative-report-history");
      historyList.append(...history.map(historyItem));
      content.append(historyList);
    }
    details.append(summary, content);
    card.append(details);
    return card;
  }

  function renderList(rows) {
    const list = document.getElementById("initiativeReportList");
    if (!rows.length) {
      list.replaceChildren(element(
        "p",
        "initiative-report-empty",
        "Nenhum acompanhamento encontrado para os filtros selecionados."
      ));
      return;
    }
    list.replaceChildren(...groupRows(rows).map(initiativeCard));
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
      renderList(state.rows);
    } catch (error) {
      state.payload = null;
      state.rows = [];
      showMessage(error.message || String(error), "danger");
      renderList([]);
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

