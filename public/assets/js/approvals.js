(function () {
  const ACTIONABLE_STATUS = "Enviado para homologação";

  let state = {
    data: null,
    user: null,
    indicadores: [],
    lancamentos: [],
    homologacoes: [],
    solicitacoesReabertura: [],
    evidenciasPorLancamento: {},
    selectedId: null
  };

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function cleanIndicatorName(value) {
    return String(value || "").replace(/^\s*\d+\s*[.\-–—]\s*/, "").trim();
  }

  function indicatorFilterOptions(lancamentos, indicadores = state.indicadores) {
    const availableIds = new Set(lancamentos.map((item) => String(item.indicadorId)));
    return indicadores
      .filter((item) => availableIds.has(String(item.id)))
      .sort((left, right) => {
        const leftNumber = Number(left.numero ?? left.id);
        const rightNumber = Number(right.numero ?? right.id);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
          return leftNumber - rightNumber;
        }
        return cleanIndicatorName(left.indicador).localeCompare(cleanIndicatorName(right.indicador), "pt-BR");
      })
      .map((item) => {
        const number = Number(item.numero ?? item.id);
        const officialNumber = Number.isFinite(number) ? String(number).padStart(2, "0") : String(item.numero || item.id);
        return { value: String(item.id), label: `${officialNumber} - ${cleanIndicatorName(item.indicador)}` };
      });
  }

  function officialOperationalLaunches(launches, indicators) {
    const byId = Object.fromEntries((indicators || []).map((indicator) => [String(indicator.id), indicator]));
    return (launches || []).filter((launch) => {
      const indicator = byId[String(launch.indicadorId)];
      return !indicator || window.IndicatorPeriodicity?.isExpectedCompetence(indicator, launch) !== false;
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function launchDocumentation(regra, lancamento) {
    if (window.DocumentationFields) return DocumentationFields.resolve(regra, lancamento);
    return {
      reference: lancamento?.referenciaEvidencia || lancamento?.linkEvidencia || "",
      observation: lancamento?.observacaoArea || ""
    };
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

  function showActionFeedback(message, type = "success") {
    if (window.ActionFeedback?.show("approvalActionFeedback", message, type)) return;
    showMessage(message, type === "error" ? "danger" : type === "warning" ? "warning" : "info");
  }

  function clearActionFeedback() {
    window.ActionFeedback?.clear("approvalActionFeedback");
  }

  async function apiJson(path, options = {}) {
    const csrfToken = window.Auth?.getCurrentUser?.()?.csrfToken || window.CAIXA_LOTERIAS_AUTH_USER?.csrfToken || "";
    const target = window.appUrl ? window.appUrl(path) : path;
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(options.headers || {})
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.sucesso === false || payload.ok === false) {
      throw new Error(payload.mensagem || payload.error || `Falha na API (${response.status}).`);
    }
    return Object.prototype.hasOwnProperty.call(payload, "dados") ? payload.dados : payload;
  }

  function getIndicatorMap() {
    return Object.fromEntries(state.indicadores.map((item) => [item.id, item]));
  }

  function getRule(indicador) {
    return window.IndicatorFormulas ? window.IndicatorFormulas.obterRegra(indicador, state.data.regrasIndicadores || []) : null;
  }

  function appUrl(path) {
    return typeof window.appUrl === "function" ? window.appUrl(path) : path;
  }

  function formatUploadDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
  }

  function renderApprovalEvidenceList(lancamento) {
    const target = document.getElementById("approvalEvidenceList");
    const items = state.evidenciasPorLancamento[String(lancamento.id)] || [];
    if (!items.length) {
      target.innerHTML = '<p class="evidence-empty">Nenhum arquivo anexado.</p>';
      return;
    }
    target.innerHTML = items.map((item) => `
      <article class="evidence-item">
        <div class="evidence-item-icon" aria-hidden="true">📎</div>
        <div class="evidence-item-content">
          <strong>${escapeHtml(item.nomeArquivo)}</strong>
          ${item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ""}
          <small>${escapeHtml([formatUploadDate(item.dataUpload), item.usuario].filter(Boolean).join(" • "))}</small>
        </div>
        <div class="evidence-item-actions">
          <a class="secondary-action" href="${escapeHtml(appUrl(`evidencias/${encodeURIComponent(item.id)}/download`))}">Baixar</a>
        </div>
      </article>
    `).join("");
  }

  async function loadApprovalEvidences(lancamento) {
    document.getElementById("approvalEvidenceList").innerHTML = '<p class="evidence-empty">Carregando anexos...</p>';
    try {
      const items = await apiJson(`api/lancamentos/${encodeURIComponent(lancamento.id)}/evidencias`, { method: "GET" });
      state.evidenciasPorLancamento[String(lancamento.id)] = Array.isArray(items) ? items : [];
      if (String(state.selectedId) === String(lancamento.id)) renderApprovalEvidenceList(lancamento);
    } catch (error) {
      document.getElementById("approvalEvidenceList").innerHTML = `<p class="evidence-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function launchForDisplay(indicador, lancamento, regra) {
    if (Number(indicador?.id) === 6 && window.IeoRecorrente) {
      return window.IeoRecorrente.normalizarLancamentoParaExibicao(lancamento, regra);
    }
    if (regra?.tipoCalculo !== "nota_pesquisa_nps" || !window.IndicatorFormulas) return lancamento;

    const scope = state.lancamentos.filter((item) => (
      Number(item.indicadorId) === Number(indicador.id) &&
      Number(item.ano) === Number(lancamento.ano) &&
      Number(item.mes) <= Number(lancamento.mes)
    ));
    const calculated = window.IndicatorFormulas.calcularIndicador(indicador, regra, lancamento, scope);
    if (!calculated || calculated.statusCalculo === "erro") return lancamento;
    return {
      ...lancamento,
      resultadoMensal: calculated.resultadoMensal,
      realizadoMensal: calculated.resultadoMensal,
      resultadoAcumulado: calculated.resultadoAcumulado,
      percentualAtingido: calculated.percentualAtingidoMensal,
      percentualAtingidoAcumulado: calculated.percentualAtingidoAcumulado,
      situacaoCalculada: calculated.situacao || lancamento.situacaoCalculada,
      __npsCalculation: calculated
    };
  }

  function getSelectedLaunch() {
    return state.lancamentos.find((item) => String(item.id) === String(state.selectedId));
  }

  function isAdmin() {
    return state.user?.perfil === "Administrador";
  }

  function canApproveOrReturn(lancamento) {
    return lancamento
      && lancamento.status === ACTIONABLE_STATUS
      && ["Administrador", "Diretoria Homologadora"].includes(state.user?.perfil);
  }

  function canAct(lancamento) {
    return canApproveOrReturn(lancamento);
  }

  function canReopen(lancamento) {
    return isAdmin() && lancamento && lancamento.status === "Homologado";
  }

  function isHomologador() {
    return state.user?.perfil === "Diretoria Homologadora";
  }

  function pendingReopenRequest(lancamento) {
    if (!lancamento) return null;
    const formalRequest = state.solicitacoesReabertura.find((item) => (
      String(item.lancamentoId) === String(lancamento.id) &&
      item.statusSolicitacao === "Pendente"
    ));
    if (formalRequest) return formalRequest;
    return lancamento.solicitacaoReabertura?.status === "Pendente"
      ? {
          id: lancamento.solicitacaoReabertura.solicitacaoId || `legacy-${lancamento.id}`,
          lancamentoId: lancamento.id,
          statusSolicitacao: "Pendente"
        }
      : null;
  }

  function canRequestReopen(lancamento) {
    return isHomologador() && lancamento && lancamento.status === "Homologado" && !pendingReopenRequest(lancamento);
  }

  function fillFilters(lancamentos) {
    const options = {
      mes: ["Todos", ...unique(lancamentos.map((item) => item.nomeMes))].map((value) => ({ value, label: value })),
      status: ["Todos", ...unique(lancamentos.map((item) => item.status))].map((value) => ({ value, label: value })),
      indicador: [
        { value: "", label: "Todos os indicadores" },
        ...indicatorFilterOptions(lancamentos)
      ]
    };

    document.querySelectorAll("[data-filter]").forEach((select) => {
      const currentValue = select.value;
      const availableOptions = options[select.dataset.filter] || [];
      select.innerHTML = availableOptions.map((option) => (
        `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
      )).join("");
      if (availableOptions.some((option) => option.value === currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function filterLaunches(lancamentos, values) {
    return lancamentos.filter((item) => (
      (values.mes === "Todos" || item.nomeMes === values.mes) &&
      (values.status === "Todos" || item.status === values.status) &&
      (!values.indicador || String(item.indicadorId) === String(values.indicador))
    ));
  }

  function getFilteredLaunches() {
    const values = Object.fromEntries(
      [...document.querySelectorAll("[data-filter]")].map((select) => [select.dataset.filter, select.value])
    );
    return filterLaunches(state.lancamentos, values);
  }

  function renderTable(lancamentos) {
    const target = document.getElementById("homologacaoTable");
    const porId = getIndicatorMap();

    if (!lancamentos.length) {
      target.innerHTML = '<tr><td colspan="8">Nenhum lançamento disponível para os filtros selecionados.</td></tr>';
      return;
    }

    target.innerHTML = lancamentos.map((item) => {
      const indicador = porId[item.indicadorId];
      const regra = indicador ? getRule(indicador) : null;
      const displayItem = launchForDisplay(indicador, item, regra);
      return `
        <tr>
          <td>${escapeHtml(indicador ? indicador.indicador : item.indicadorId)}</td>
          <td>${escapeHtml(indicador ? indicador.unidadeApuradora || "Não informado" : "-")}</td>
          <td>${escapeHtml(indicador ? indicador.diretoriaResponsavel || "Não informado" : "-")}</td>
          <td>${escapeHtml(item.nomeMes)}/${escapeHtml(item.ano)}</td>
          <td>${Calculations.formatarValor(displayItem.resultadoMensal ?? displayItem.realizadoMensal, regra && regra.unidadeMedida)}</td>
          <td>${Calculations.formatarPercentual(displayItem.percentualAtingido)}</td>
          <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td><button class="secondary-action table-action" type="button" data-id="${item.id}">${canAct(item) ? "Analisar" : "Consultar"}</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderReference(indicador, lancamento) {
    const regra = getRule(indicador);
    const documentation = launchDocumentation(regra, lancamento);
    const displayLaunch = launchForDisplay(indicador, lancamento, regra);
    const npsCalculation = displayLaunch.__npsCalculation || null;
    const metodologiaIeo = Number(indicador?.id) === 6
      ? window.IeoRecorrente?.getMetodologiaIeoPorCompetencia?.(lancamento)
      : null;
    const metodologiaIeoCa = metodologiaIeo?.codigo === "ca_agosto_2026";
    const componentesIeo = metodologiaIeo
      ? (window.IeoRecorrente?.getCamposEntrada?.(lancamento) || []).map((field) => [
        field.rotulo,
        Calculations.formatarValor(lancamento.camposEntrada?.[field.nome], field.tipo)
      ])
      : [];
    const componentesInteiros = metodologiaIeo
      ? []
      : (regra?.camposEntrada || [])
        .filter((field) => field.tipo === "inteiro")
        .filter((field) => {
          const value = lancamento.camposEntrada?.[field.nome];
          return value !== null && value !== undefined && value !== "";
        })
        .map((field) => [
          field.rotulo || field.nome,
          Calculations.formatarInteiroBR(lancamento.camposEntrada[field.nome])
        ]);
    const tipoCapacitacao = regra?.tipoCalculo === "cobertura_capacitacao"
      ? window.IndicatorFormulas?.resolverTipoPosicaoCapacitacao?.(lancamento)
      : null;
    const detalhesCapacitacao = tipoCapacitacao ? [
      ["Tipo da posição", tipoCapacitacao === "acompanhamento" ? "Acompanhamento sem nova medição" : "Apuração quantitativa"],
      ...(tipoCapacitacao === "acompanhamento" ? [
        ["Ações realizadas / andamento", lancamento.camposEntrada?.acoesAcompanhamentoCapacitacao || "-", true]
      ] : []),
      ["Data-base da posição", lancamento.camposEntrada?.dataBaseApuracaoCapacitacao || "-"],
      ["Fonte/evidência informada", documentation.reference || "-"],
      ["Situação", tipoCapacitacao === "acompanhamento" ? "Em acompanhamento" : displayLaunch.situacaoCalculada || "-"]
    ] : [];
    const componentesNps = regra?.tipoCalculo === "nota_pesquisa_nps" ? [
      ["Tipo da posição", lancamento.camposEntrada?.tipoPosicaoNPS || "-"],
      ["Percentual de promotores", Calculations.formatarPercentual(npsCalculation?.percentualPromotores)],
      ["Percentual de detratores", Calculations.formatarPercentual(npsCalculation?.percentualDetratores)],
      ["NPS calculado", Calculations.formatarValor(npsCalculation?.npsCalculado ?? displayLaunch.resultadoMensal, "pontos")],
      ["Data-base da pesquisa", lancamento.camposEntrada?.dataBasePesquisaNPS || "-"],
      ["Fórmula do NPS", "Percentual de promotores − percentual de detratores", true]
    ] : [];
    const metaReferencia = regra?.tipoCalculo === "nota_pesquisa_nps"
      ? Calculations.formatarValor(npsCalculation?.metaReferenciaPeriodo ?? lancamento.metaMensal, "pontos")
      : regra?.parametrosCalculo?.metaTipo === "curva_acumulada_por_competencia"
      ? (() => {
        const key = lancamento?.competencia || `${lancamento?.ano}-${String(lancamento?.mes).padStart(2, "0")}`;
        const curva = regra.parametrosCalculo.metasAcumuladasPorCompetencia || {};
        return Object.prototype.hasOwnProperty.call(curva, key) && curva[key] !== null
          ? Calculations.formatarValor(curva[key], regra.unidadeMedida)
          : "Pendente de curva orcamentaria";
      })()
      : Calculations.formatarValor(regra && regra.metaAnualValor !== null ? regra.metaAnualValor : lancamento.metaMensal, regra && regra.unidadeMedida);
    document.getElementById("approvalReference").innerHTML = [
      ["Plano", indicador.plano],
      ["Pilar", indicador.pilar],
      ["Unidade apuradora", indicador.unidadeApuradora || "Não informado"],
      ["Diretoria responsável", indicador.diretoriaResponsavel || "Não informado"],
      ["Mês/Ano", `${lancamento.nomeMes}/${lancamento.ano}`],
      ["Meta de referência", metaReferencia],
      [metodologiaIeoCa ? "IEO calculado da competência" : regra?.tipoCalculo === "nota_pesquisa_nps" ? "NPS calculado" : "Realizado mensal", Calculations.formatarValor(displayLaunch.resultadoMensal ?? displayLaunch.realizadoMensal, regra && regra.unidadeMedida)],
      ["Percentual atingido", Calculations.formatarPercentual(displayLaunch.percentualAtingido)],
      ...(!metodologiaIeoCa ? [
        ["Resultado acumulado", Calculations.formatarValor(displayLaunch.resultadoAcumulado, regra && regra.unidadeMedida)],
        ["Percentual acumulado", Calculations.formatarPercentual(displayLaunch.percentualAtingidoAcumulado)]
      ] : []),
      ["Tipo de cálculo", indicador.tipoCalculo],
      ["Métrica/Fórmula", metodologiaIeo?.formula || indicador.metrica, true],
      ...(metodologiaIeo ? [["Metodologia vigente", metodologiaIeo.descricao, true]] : []),
      ...componentesIeo,
      ...componentesNps,
      ...componentesInteiros,
      ...detalhesCapacitacao
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
    const requestable = canRequestReopen(lancamento);
    const pendingRequest = pendingReopenRequest(lancamento);
    const reopenButton = document.getElementById("reopenButton");
    document.getElementById("approvalObservacaoDiretoria").disabled = !(actionable || reopenable);
    document.getElementById("approveButton").disabled = !actionable;
    document.getElementById("returnButton").disabled = !actionable;
    reopenButton.hidden = !(isAdmin() || isHomologador());
    reopenButton.textContent = isAdmin() ? "Reabrir para edição" : pendingRequest ? "Solicitação pendente" : "Solicitar reabertura";
    reopenButton.disabled = isAdmin() ? !reopenable : !requestable;
  }

  function renderPanel(options = {}) {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    const regra = indicador && getRule(indicador);
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
    const documentation = launchDocumentation(regra, lancamento);
    document.getElementById("approvalObservacaoArea").value = documentation.observation;
    document.getElementById("approvalEvidenceReference").textContent = documentation.reference || "Não informada.";
    const legacyJustification = document.getElementById("legacyApprovalJustification");
    const legacyText = String(lancamento.justificativa || "").trim();
    legacyJustification.hidden = !legacyText;
    document.getElementById("legacyApprovalJustificationText").textContent = legacyText;
    renderApprovalEvidenceList(lancamento);
    loadApprovalEvidences(lancamento);
    document.getElementById("approvalObservacaoDiretoria").value = lancamento.observacaoDiretoria || "";
    renderReference(indicador, lancamento);
    setActionState(lancamento);

    if (!options.suppressGeneralNotice && lancamento.status === "Homologado") {
      const pendingRequest = pendingReopenRequest(lancamento);
      showMessage(
        canReopen(lancamento) && lancamento.solicitacaoReabertura?.status === "Pendente"
          ? `A unidade solicitou a reabertura em ${new Date(lancamento.solicitacaoReabertura.dataSolicitacao).toLocaleString("pt-BR")}.`
          : canReopen(lancamento)
            ? "Lançamento homologado. Use Reabrir para edição caso a unidade precise ajustar os dados."
            : pendingRequest
              ? "Solicitação de reabertura pendente de análise pelo Administrador."
              : "Lançamentos homologados só podem ser reabertos pelo Administrador. Caso seja necessário corrigir alguma informação, envie uma solicitação de reabertura com justificativa.",
        (canReopen(lancamento) && lancamento.solicitacaoReabertura?.status === "Pendente") || pendingRequest ? "warning" : "info"
      );
    } else if (!options.suppressGeneralNotice && !canAct(lancamento)) {
      showMessage(`Lançamento com status "${lancamento.status}" está disponível apenas para consulta.`, "warning");
    }
  }

  function reopenRequestTypes() {
    return [
      "Correção de valor lançado",
      "Correção de evidência",
      "Correção de observação",
      "Correção de status",
      "Ajuste metodológico",
      "Outro"
    ];
  }

  function ensureReopenRequestDialog() {
    let dialog = document.getElementById("reopenRequestDialog");
    if (dialog) return dialog;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="reopenRequestDialog" class="app-modal">
        <form id="reopenRequestForm" class="editor-form" method="dialog">
          <div class="detail-header full-span">
            <div>
              <p class="eyebrow">Solicitação formal</p>
              <h2>Solicitar reabertura do lançamento</h2>
            </div>
          </div>
          <label>Indicador
            <input id="reopenRequestIndicator" type="text" readonly>
          </label>
          <label>Competência
            <input id="reopenRequestCompetence" type="text" readonly>
          </label>
          <label>Situação atual
            <input id="reopenRequestSituation" type="text" readonly>
          </label>
          <label>Status atual
            <input id="reopenRequestStatus" type="text" readonly>
          </label>
          <label class="full-span">Tipo de ajuste necessário
            <select id="reopenRequestType" required>
              ${reopenRequestTypes().map((type) => `<option>${escapeHtml(type)}</option>`).join("")}
            </select>
          </label>
          <label class="full-span">Justificativa da solicitação
            <textarea id="reopenRequestJustification" rows="4" required></textarea>
          </label>
          <label class="full-span">Observação complementar
            <textarea id="reopenRequestObservation" rows="3"></textarea>
          </label>
          <div class="form-actions full-span">
            <button id="submitReopenRequestButton" class="primary-action" type="submit">Enviar solicitação</button>
            <button class="secondary-action" type="button" data-close-reopen-request>Cancelar</button>
          </div>
        </form>
      </dialog>
    `);
    dialog = document.getElementById("reopenRequestDialog");
    dialog.querySelector("[data-close-reopen-request]").addEventListener("click", () => dialog.close());
    dialog.querySelector("#reopenRequestForm").addEventListener("submit", (event) => {
      event.preventDefault();
      submitReopenRequest();
    });
    return dialog;
  }

  function openReopenRequestDialog() {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    if (!lancamento || !indicador || !canRequestReopen(lancamento)) return;
    const dialog = ensureReopenRequestDialog();
    document.getElementById("reopenRequestIndicator").value = indicador.indicador || lancamento.indicadorId;
    document.getElementById("reopenRequestCompetence").value = lancamento.competencia || `${lancamento.nomeMes}/${lancamento.ano}`;
    document.getElementById("reopenRequestSituation").value = lancamento.situacaoCalculada || "-";
    document.getElementById("reopenRequestStatus").value = lancamento.status;
    document.getElementById("reopenRequestType").value = "Correção de valor lançado";
    document.getElementById("reopenRequestJustification").value = "";
    document.getElementById("reopenRequestObservation").value = "";
    dialog.showModal();
  }

  async function submitReopenRequest() {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !canRequestReopen(lancamento)) {
      showMessage("Ja existe uma solicitacao de reabertura pendente para este lancamento.", "warning");
      return;
    }

    const justificativa = document.getElementById("reopenRequestJustification").value.trim();
    if (!justificativa) {
      showMessage("Informe a justificativa da solicitacao.", "warning");
      return;
    }

    const submitButton = document.getElementById("submitReopenRequestButton");
    if (submitButton) submitButton.disabled = true;
    clearActionFeedback();
    try {
      const result = await apiJson("api/solicitacoes-reabertura", {
        method: "POST",
        body: JSON.stringify({
          action: "criar",
          lancamentoId: lancamento.id,
          indicadorId: lancamento.indicadorId,
          competencia: lancamento.competencia || `${lancamento.ano}-${String(lancamento.mes).padStart(2, "0")}`,
          tipoAjuste: document.getElementById("reopenRequestType").value,
          justificativa,
          observacaoComplementar: document.getElementById("reopenRequestObservation").value.trim()
        })
      });
      const createdRequest = result.solicitacao || result;
      state.solicitacoesReabertura = [...state.solicitacoesReabertura, createdRequest];
      state.data.solicitacoesReabertura = state.solicitacoesReabertura;
      document.getElementById("reopenRequestDialog").close();
      refresh();
      state.selectedId = lancamento.id;
      renderPanel({ suppressGeneralNotice: true });
      showActionFeedback("Solicitação de reabertura enviada com sucesso.");
    } catch (error) {
      showActionFeedback(error.message || "Não foi possível solicitar a reabertura.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  function applyOfficialLaunch(updated) {
    state.lancamentos = state.lancamentos.map((item) => (
      String(item.id) === String(updated.id) ? { ...item, ...updated } : item
    ));
    state.data.lancamentos = state.data.lancamentos.map((item) => (
      String(item.id) === String(updated.id) ? { ...item, ...updated } : item
    ));
  }

  function setDecisionBusy(busy) {
    if (!busy) {
      const lancamento = getSelectedLaunch();
      if (lancamento) {
        setActionState(lancamento);
        return;
      }
    }
    ["approveButton", "returnButton", "reopenButton"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = busy;
    });
  }

  async function reloadOfficialLaunch(id, fallback, observation = "") {
    try {
      const detail = await apiJson(`api/homologacoes/${encodeURIComponent(id)}`, { method: "GET" });
      return { ...(detail.lancamento || fallback), observacaoDiretoria: observation };
    } catch (_error) {
      return { ...fallback, observacaoDiretoria: observation };
    }
  }

  async function persistDecision(action) {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !canAct(lancamento)) return;

    const observacaoDiretoria = document.getElementById("approvalObservacaoDiretoria").value.trim();
    if (action === "return" && !observacaoDiretoria) {
      showMessage("A devolução para ajuste exige observação da diretoria.", "warning");
      return;
    }

    if (action === "return" && observacaoDiretoria.length < 5) {
      showMessage("A observação da devolução deve ter pelo menos 5 caracteres.", "warning");
      return;
    }

    clearActionFeedback();
    setDecisionBusy(true);
    try {
      const endpoint = action === "approve"
        ? `api/homologacoes/${encodeURIComponent(lancamento.id)}/aprovar`
        : `api/homologacoes/${encodeURIComponent(lancamento.id)}/rejeitar`;
      const body = action === "approve"
        ? { observacaoDiretoria }
        : { justificativa: observacaoDiretoria };
      const confirmed = await apiJson(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });
      const updated = await reloadOfficialLaunch(lancamento.id, confirmed, observacaoDiretoria);
      applyOfficialLaunch(updated);
      refresh();
      state.selectedId = updated.id;
      renderPanel({ suppressGeneralNotice: true });
      showActionFeedback(
        action === "approve"
          ? "Lançamento homologado com sucesso."
          : "Lançamento devolvido para ajuste com sucesso."
      );
    } catch (error) {
      showActionFeedback(
        error.message || (action === "approve"
          ? "Não foi possível homologar o lançamento."
          : "Não foi possível devolver o lançamento para ajuste."),
        "error"
      );
    } finally {
      setDecisionBusy(false);
    }
  }

  async function reopenLaunch() {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !canReopen(lancamento)) {
      showMessage("Somente Administrador pode reabrir um lançamento homologado.", "warning");
      return;
    }

    const observacaoDiretoria = document.getElementById("approvalObservacaoDiretoria").value.trim();
    if (!observacaoDiretoria) {
      showMessage("A reabertura exige observação da diretoria.", "warning");
      return;
    }

    clearActionFeedback();
    setDecisionBusy(true);
    try {
      const updated = await apiJson(`api/lancamentos/${encodeURIComponent(lancamento.id)}/reabrir`, {
        method: "POST",
        body: JSON.stringify({ justificativa: observacaoDiretoria })
      });
      applyOfficialLaunch({ ...updated, observacaoDiretoria });
      refresh();
      state.selectedId = updated.id;
      renderPanel({ suppressGeneralNotice: true });
      showActionFeedback("Lançamento reaberto para edição com sucesso.");
    } catch (error) {
      showActionFeedback(error.message || "Não foi possível reabrir o lançamento para edição.", "error");
    } finally {
      setDecisionBusy(false);
    }
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
      state.selectedId = button.dataset.id;
      clearActionFeedback();
      renderPanel();
      document.getElementById("approvalPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("approveButton").addEventListener("click", () => persistDecision("approve"));
    document.getElementById("returnButton").addEventListener("click", () => persistDecision("return"));
    document.getElementById("reopenButton").addEventListener("click", () => {
      if (isAdmin()) {
        reopenLaunch();
        return;
      }
      openReopenRequestDialog();
    });
    document.getElementById("closeApprovalButton").addEventListener("click", () => {
      state.selectedId = null;
      clearActionFeedback();
      document.getElementById("approvalPanel").hidden = true;
    });
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicadores: Auth.filterIndicatorsByUser(data.indicadores, user),
      lancamentos: officialOperationalLaunches(
        Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
        data.indicadores
      ),
      homologacoes: data.homologacoes,
      solicitacoesReabertura: data.solicitacoesReabertura || [],
      evidenciasPorLancamento: {},
      selectedId: null
    };

    bindEvents();
    refresh();

    const requestedId = new URLSearchParams(window.location.search).get("lancamentoId");
    if (requestedId && state.lancamentos.some((item) => String(item.id) === String(requestedId))) {
      state.selectedId = requestedId;
      renderPanel();
      document.getElementById("approvalPanel").scrollIntoView({ block: "start" });
    }
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.homologacao = { init };
  window.__APPROVALS_FILTER_TEST_INTERNALS__ = { indicatorFilterOptions, filterLaunches, officialOperationalLaunches };
})();
