(function () {
  const PER_PAGE = 25;
  const state = {
    operationPage: 1,
    accessPage: 1,
    requestVersion: 0
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function positivePage(value) {
    const page = Number.parseInt(value, 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  function filters() {
    return {
      dataInicial: byId("auditStartDate").value,
      dataFinal: byId("auditEndDate").value,
      usuario: byId("auditUser").value.trim(),
      acao: byId("auditAction").value.trim()
    };
  }

  function requestParams(resource, page) {
    const values = filters();
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE)
    });

    if (values.dataInicial) params.set("dataInicial", values.dataInicial);
    if (values.dataFinal) params.set("dataFinal", values.dataFinal);
    if (values.usuario) {
      params.set(resource === "acessos" ? "matricula" : "usuario", values.usuario);
    }
    if (resource === "auditoria" && values.acao) params.set("acao", values.acao);
    return params;
  }

  async function requestPage(resource, page) {
    const route = `api/administracao/${resource}`;
    const target = window.appUrl ? window.appUrl(route, requestParams(resource, page)) : route;
    const response = await fetch(target, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      throw new Error(`Resposta inválida da API (${response.status}).`);
    }
    if (!response.ok || payload.sucesso === false || payload.ok === false) {
      throw new Error(payload.mensagem || payload.error || `Falha na API (${response.status}).`);
    }
    return Object.prototype.hasOwnProperty.call(payload, "dados") ? payload.dados : payload;
  }

  function formatDateTime(value) {
    const raw = String(value || "").trim();
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(date);
  }

  function formatJson(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch (_) {
      return raw;
    }
  }

  function renderOperations(data) {
    const items = Array.isArray(data?.items) ? data.items : [];
    const pagination = data?.pagination || {};
    byId("auditOperationsCount").textContent = `${Number(pagination.total || 0)} registro(s)`;
    byId("auditOperationsBody").innerHTML = items.length
      ? items.map((item) => `
        <tr>
          <td class="audit-nowrap">${escapeHtml(formatDateTime(item.data_acao))}</td>
          <td>${escapeHtml(item.usuario || "—")}</td>
          <td>${escapeHtml(item.entidade || "—")}</td>
          <td>${escapeHtml(item.acao || "—")}</td>
          <td>${escapeHtml(item.entidade_id || "—")}</td>
          <td><pre class="audit-json">${escapeHtml(formatJson(item.dados_anteriores_json))}</pre></td>
          <td><pre class="audit-json">${escapeHtml(formatJson(item.dados_novos_json))}</pre></td>
        </tr>
      `).join("")
      : '<tr><td class="empty-state" colspan="7">Nenhuma operação encontrada para os filtros informados.</td></tr>';
    renderPagination("auditOperationsPagination", pagination);
  }

  function renderAccesses(data) {
    const items = Array.isArray(data?.items) ? data.items : [];
    const pagination = data?.pagination || {};
    byId("auditAccessCount").textContent = `${Number(pagination.total || 0)} registro(s)`;
    byId("auditAccessBody").innerHTML = items.length
      ? items.map((item) => `
        <tr>
          <td class="audit-nowrap">${escapeHtml(formatDateTime(item.data_acesso))}</td>
          <td>${escapeHtml(item.matricula || "—")}</td>
          <td>${escapeHtml(item.perfil || "—")}</td>
          <td>${escapeHtml(item.sg_unidade || "—")}</td>
          <td class="audit-nowrap">${escapeHtml(item.ip || "—")}</td>
          <td class="audit-event-cell">${escapeHtml(item.user_agent || "—")}</td>
        </tr>
      `).join("")
      : '<tr><td class="empty-state" colspan="6">Nenhum acesso encontrado para os filtros informados.</td></tr>';
    renderPagination("auditAccessPagination", pagination);
  }

  function renderPagination(id, pagination) {
    const target = byId(id);
    const page = positivePage(pagination.page);
    const pages = Math.max(0, Number.parseInt(pagination.pages, 10) || 0);
    target.hidden = pages <= 1;
    target.querySelector("[data-page-summary]").textContent = `Página ${page} de ${Math.max(1, pages)}`;
    target.querySelector('[data-page-action="previous"]').disabled = page <= 1;
    target.querySelector('[data-page-action="next"]').disabled = pages === 0 || page >= pages;
  }

  function showMessage(message, type) {
    const target = byId("auditMessage");
    target.className = `notice ${type || "info"}`;
    target.textContent = message;
    target.hidden = !message;
  }

  function setLoading() {
    byId("auditOperationsCount").textContent = "Carregando...";
    byId("auditAccessCount").textContent = "Carregando...";
    byId("auditOperationsBody").innerHTML = '<tr><td class="empty-state" colspan="7">Carregando operações...</td></tr>';
    byId("auditAccessBody").innerHTML = '<tr><td class="empty-state" colspan="6">Carregando acessos...</td></tr>';
  }

  function updateLocation() {
    if (!window.appUrl || !window.history?.replaceState) return;
    const values = filters();
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (state.operationPage > 1) params.set("paginaOperacoes", String(state.operationPage));
    if (state.accessPage > 1) params.set("paginaAcessos", String(state.accessPage));
    window.history.replaceState({}, "", window.appUrl("auditoria", params));
  }

  async function loadAll() {
    const version = ++state.requestVersion;
    setLoading();
    showMessage("");
    byId("auditFilterButton").disabled = true;
    try {
      const [operations, accesses] = await Promise.all([
        requestPage("auditoria", state.operationPage),
        requestPage("acessos", state.accessPage)
      ]);
      if (version !== state.requestVersion) return;
      renderOperations(operations);
      renderAccesses(accesses);
    } catch (error) {
      if (version !== state.requestVersion) return;
      showMessage(error.message || "Não foi possível carregar a auditoria.", "warning");
    } finally {
      if (version === state.requestVersion) byId("auditFilterButton").disabled = false;
    }
  }

  function readLocation() {
    const params = new URLSearchParams(window.location.search);
    byId("auditStartDate").value = params.get("dataInicial") || "";
    byId("auditEndDate").value = params.get("dataFinal") || "";
    byId("auditUser").value = params.get("usuario") || "";
    byId("auditAction").value = params.get("acao") || "";
    state.operationPage = positivePage(params.get("paginaOperacoes"));
    state.accessPage = positivePage(params.get("paginaAcessos"));
  }

  function bindPagination(id, stateKey, resource, renderer) {
    byId(id).addEventListener("click", async (event) => {
      const button = event.target.closest("[data-page-action]");
      if (!button || button.disabled) return;
      const direction = button.dataset.pageAction === "next" ? 1 : -1;
      state[stateKey] = Math.max(1, state[stateKey] + direction);
      updateLocation();
      try {
        button.disabled = true;
        const data = await requestPage(resource, state[stateKey]);
        renderer(data);
      } catch (error) {
        showMessage(error.message || "Não foi possível trocar de página.", "warning");
      }
    });
  }

  async function init() {
    readLocation();

    byId("auditFilterForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.operationPage = 1;
      state.accessPage = 1;
      updateLocation();
      loadAll();
    });

    byId("auditClearButton").addEventListener("click", () => {
      byId("auditFilterForm").reset();
      state.operationPage = 1;
      state.accessPage = 1;
      updateLocation();
      loadAll();
    });

    bindPagination("auditOperationsPagination", "operationPage", "auditoria", renderOperations);
    bindPagination("auditAccessPagination", "accessPage", "acessos", renderAccesses);
    await loadAll();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.auditoria = { init };
})();

