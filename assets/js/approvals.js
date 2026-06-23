(function () {
  const ACTIONABLE_STATUS = "Enviado para homologação";

  let state = {
    data: null,
    user: null,
    indicadores: [],
    lancamentos: [],
    homologacoes: [],
    selectedId: null
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

  function badgeClass(status) {
    if (status === "Homologado") return "ok";
    if (status === "Devolvido para ajuste") return "danger";
    if (status === ACTIONABLE_STATUS) return "warn";
    return "info";
  }

  function showMessage(message, type = "info") {
    const target = document.getElementById("approvalMessage");
    target.className = `notice ${type}`;
    target.textContent = message;
    target.hidden = false;
  }

  function getIndicatorMap() {
    return Object.fromEntries(state.indicadores.map((item) => [item.id, item]));
  }

  function getRule(indicador) {
    return window.IndicatorFormulas ? window.IndicatorFormulas.obterRegra(indicador, state.data.regrasIndicadores || []) : null;
  }

  function getSelectedLaunch() {
    return state.lancamentos.find((item) => item.id === state.selectedId);
  }

  function canAct(lancamento) {
    return lancamento && lancamento.status === ACTIONABLE_STATUS;
  }

  function canReopen(lancamento) {
    return lancamento && lancamento.status === "Homologado";
  }

  function fillFilters(lancamentos) {
    const values = {
      mes: ["Todos", ...unique(lancamentos.map((item) => item.nomeMes))],
      status: ["Todos", ...unique(lancamentos.map((item) => item.status))]
    };

    document.querySelectorAll("[data-filter]").forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = values[select.dataset.filter].map((value) => `<option>${escapeHtml(value)}</option>`).join("");
      if (values[select.dataset.filter].includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function getFilteredLaunches() {
    const values = Object.fromEntries(
      [...document.querySelectorAll("[data-filter]")].map((select) => [select.dataset.filter, select.value])
    );
    return state.lancamentos.filter((item) => (
      (values.mes === "Todos" || item.nomeMes === values.mes) &&
      (values.status === "Todos" || item.status === values.status)
    ));
  }

  function renderTable(lancamentos) {
    const target = document.getElementById("homologacaoTable");
    const porId = getIndicatorMap();

    if (!lancamentos.length) {
      target.innerHTML = '<tr><td colspan="8">Nenhum lançamento disponível para homologação.</td></tr>';
      return;
    }

    target.innerHTML = lancamentos.map((item) => {
      const indicador = porId[item.indicadorId];
      const regra = indicador ? getRule(indicador) : null;
      return `
        <tr>
          <td>${escapeHtml(indicador ? indicador.indicador : item.indicadorId)}</td>
          <td>${escapeHtml(indicador ? indicador.unidadeApuradora || "Não informado" : "-")}</td>
          <td>${escapeHtml(indicador ? indicador.diretoriaResponsavel || "Não informado" : "-")}</td>
          <td>${escapeHtml(item.nomeMes)}/${escapeHtml(item.ano)}</td>
          <td>${Calculations.formatarValor(item.resultadoMensal ?? item.realizadoMensal, regra && regra.unidadeMedida)}</td>
          <td>${Calculations.formatarPercentual(item.percentualAtingido)}</td>
          <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td><button class="secondary-action table-action" type="button" data-id="${item.id}">${canAct(item) ? "Analisar" : "Consultar"}</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderReference(indicador, lancamento) {
    const regra = getRule(indicador);
    document.getElementById("approvalReference").innerHTML = [
      ["Plano", indicador.plano],
      ["Pilar", indicador.pilar],
      ["Unidade apuradora", indicador.unidadeApuradora || "Não informado"],
      ["Diretoria responsável", indicador.diretoriaResponsavel || "Não informado"],
      ["Mês/Ano", `${lancamento.nomeMes}/${lancamento.ano}`],
      ["Meta mensal", Calculations.formatarValor(regra && regra.metaAnualValor !== null ? regra.metaAnualValor : lancamento.metaMensal, regra && regra.unidadeMedida)],
      ["Realizado mensal", Calculations.formatarValor(lancamento.resultadoMensal ?? lancamento.realizadoMensal, regra && regra.unidadeMedida)],
      ["Percentual atingido", Calculations.formatarPercentual(lancamento.percentualAtingido)],
      ["Resultado acumulado", Calculations.formatarValor(lancamento.resultadoAcumulado, regra && regra.unidadeMedida)],
      ["Percentual acumulado", Calculations.formatarPercentual(lancamento.percentualAtingidoAcumulado)],
      ["Tipo de cálculo", indicador.tipoCalculo],
      ["Métrica/Fórmula", indicador.metrica, true]
    ].map(([label, value, full]) => `
      <article class="detail-item ${full ? "full-span" : ""}">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
  }

  function setActionState(lancamento) {
    const actionable = canAct(lancamento);
    const reopenable = canReopen(lancamento);
    document.getElementById("approvalObservacaoDiretoria").disabled = !(actionable || reopenable);
    document.getElementById("approveButton").disabled = !actionable;
    document.getElementById("returnButton").disabled = !actionable;
    document.getElementById("reopenButton").disabled = !reopenable;
  }

  function renderPanel() {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    const panel = document.getElementById("approvalPanel");

    if (!lancamento || !indicador) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    document.getElementById("approvalTitle").textContent = `${indicador.indicador} - ${lancamento.nomeMes}/${lancamento.ano}`;
    const badge = document.getElementById("approvalStatusBadge");
    badge.textContent = lancamento.status;
    badge.className = `badge ${badgeClass(lancamento.status)}`;
    document.getElementById("approvalLaunchId").value = lancamento.id;
    document.getElementById("approvalJustificativa").value = lancamento.justificativa || "";
    document.getElementById("approvalObservacaoArea").value = lancamento.observacaoArea || "";
    document.getElementById("approvalEvidencia").value = lancamento.evidencia || "";
    document.getElementById("approvalObservacaoDiretoria").value = lancamento.observacaoDiretoria || "";
    renderReference(indicador, lancamento);
    setActionState(lancamento);

    if (canReopen(lancamento)) {
      showMessage("Lançamento homologado. Use Reabrir para edição caso a unidade precise ajustar os dados.", "info");
    } else if (!canAct(lancamento)) {
      showMessage(`Lançamento com status "${lancamento.status}" está disponível apenas para consulta.`, "warning");
    }
  }

  function mergeScopedLaunches() {
    const scopedIds = new Set(state.lancamentos.map((item) => item.id));
    return state.data.lancamentos.map((item) => (
      scopedIds.has(item.id) ? state.lancamentos.find((updated) => updated.id === item.id) : item
    ));
  }

  function nextHomologacaoId() {
    return state.homologacoes.length
      ? Math.max(...state.homologacoes.map((item) => Number(item.id) || 0)) + 1
      : 1;
  }

  function upsertHomologacao(lancamento, status, observacaoDiretoria) {
    const existing = state.homologacoes.find((item) => item.lancamentoId === lancamento.id);
    const base = {
      lancamentoId: lancamento.id,
      indicadorId: lancamento.indicadorId,
      ano: lancamento.ano,
      mes: lancamento.mes,
      status,
      homologadoPor: status === "Homologado" ? state.user.email || state.user.nome : "",
      dataHomologacao: status === "Homologado" ? new Date().toISOString().slice(0, 10) : "",
      devolvidoPor: status === "Devolvido para ajuste" ? state.user.email || state.user.nome : "",
      dataDevolucao: status === "Devolvido para ajuste" ? new Date().toISOString().slice(0, 10) : "",
      observacaoDiretoria
    };

    if (existing) {
      state.homologacoes = state.homologacoes.map((item) => (
        item.lancamentoId === lancamento.id ? { ...item, ...base } : item
      ));
      return;
    }

    state.homologacoes = [...state.homologacoes, { id: nextHomologacaoId(), ...base }];
  }

  async function persistDecision(action) {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !canAct(lancamento)) return;

    const observacaoDiretoria = document.getElementById("approvalObservacaoDiretoria").value.trim();
    if (action === "return" && !observacaoDiretoria) {
      showMessage("A devolução para ajuste exige observação da diretoria.", "warning");
      return;
    }

    const original = { ...lancamento };
    const today = new Date().toISOString().slice(0, 10);
    const status = action === "approve" ? "Homologado" : "Devolvido para ajuste";
    const updated = {
      ...lancamento,
      status,
      observacaoDiretoria,
      homologadoPor: action === "approve" ? state.user.email || state.user.nome : "",
      dataHomologacao: action === "approve" ? today : "",
      devolvidoPor: action === "return" ? state.user.email || state.user.nome : "",
      dataDevolucao: action === "return" ? today : ""
    };

    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? updated : item);
    upsertHomologacao(updated, status, observacaoDiretoria);

    const mergedLaunches = mergeScopedLaunches();
    state.data.lancamentos = mergedLaunches;
    state.data.homologacoes = state.homologacoes;
    DataStore.salvarLancamentos(mergedLaunches);
    DataStore.saveLocal("homologacoes", state.homologacoes);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: action === "approve" ? "homologacao_lancamento" : "devolucao_lancamento",
      entidade: "lancamentos",
      registroId: updated.id,
      valorAnterior: original,
      valorNovo: updated
    });

    showMessage(action === "approve" ? "Lançamento homologado com sucesso." : "Lançamento devolvido para ajuste.", "info");
    refresh();
    state.selectedId = updated.id;
    renderPanel();
  }

  async function reopenLaunch() {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !canReopen(lancamento)) return;

    const observacaoDiretoria = document.getElementById("approvalObservacaoDiretoria").value.trim();
    if (!observacaoDiretoria) {
      showMessage("A reabertura exige observação da diretoria.", "warning");
      return;
    }

    const original = { ...lancamento };
    const today = new Date().toISOString().slice(0, 10);
    const updated = {
      ...lancamento,
      status: "Reaberto",
      observacaoDiretoria,
      homologadoPor: "",
      dataHomologacao: "",
      reabertoPor: state.user.email || state.user.nome,
      dataReabertura: today
    };

    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? updated : item);
    upsertHomologacao(updated, "Reaberto", observacaoDiretoria);

    const mergedLaunches = mergeScopedLaunches();
    state.data.lancamentos = mergedLaunches;
    state.data.homologacoes = state.homologacoes;
    DataStore.salvarLancamentos(mergedLaunches);
    DataStore.saveLocal("homologacoes", state.homologacoes);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: "reabertura_lancamento",
      entidade: "lancamentos",
      registroId: updated.id,
      valorAnterior: original,
      valorNovo: updated
    });

    showMessage("Lançamento reaberto para edição pela unidade apuradora.", "info");
    refresh();
    state.selectedId = updated.id;
    renderPanel();
  }

  function refresh() {
    fillFilters(state.lancamentos);
    renderTable(getFilteredLaunches());
  }

  function bindEvents() {
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => renderTable(getFilteredLaunches()));
    });

    document.getElementById("homologacaoTable").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button) return;
      state.selectedId = Number(button.dataset.id);
      renderPanel();
      document.getElementById("approvalPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("approveButton").addEventListener("click", () => persistDecision("approve"));
    document.getElementById("returnButton").addEventListener("click", () => persistDecision("return"));
    document.getElementById("reopenButton").addEventListener("click", reopenLaunch);
    document.getElementById("closeApprovalButton").addEventListener("click", () => {
      state.selectedId = null;
      document.getElementById("approvalPanel").hidden = true;
    });
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicadores: Auth.filterIndicatorsByUser(data.indicadores, user),
      lancamentos: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      homologacoes: data.homologacoes,
      selectedId: null
    };

    bindEvents();
    refresh();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.homologacao = { init };
})();
