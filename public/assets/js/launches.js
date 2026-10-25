(function () {
  const EDITABLE_STATUSES = ["Não iniciado", "Nao iniciado", "Rascunho", "Em preenchimento", "Devolvido para ajuste", "Reaberto", "Retificado"];
  const MANUAL_TYPES = ["manual_homologado", "qualitativo"];
  const DECIMAL_PERCENTAGE_ENTRY_FIELDS = new Set([
    "resultadoOficialPix",
    "percentualAtingidoOficialPix",
    "resultadoAcumuladoDocumentalCanaisDigitais",
    "percentualAtingidoOficialCanaisDigitais"
  ]);

  let state = {
    data: null,
    user: null,
    indicadores: [],
    regras: [],
    lancamentos: [],
    mutationPolicies: {},
    evidenciasPorLancamento: {},
    evidenciasHistoricasPorLancamento: {},
    evidenceOperationInProgress: false,
    selectedId: null
  };
  let socioambientalValidationActive = false;

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

  function monthName(value) {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const month = Number(value);
    return months[month - 1] || "";
  }

  function launchMonthName(launch) {
    return launch?.nomeMes || monthName(launch?.mes);
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

  function toNumberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizarPercentual(value) {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof IndicatorFormulas !== "undefined" && IndicatorFormulas.normalizarPercentual) {
      return IndicatorFormulas.normalizarPercentual(value);
    }
    let normalizedValue = value;
    if (typeof normalizedValue === "string") {
      normalizedValue = normalizedValue.trim().replace("%", "");
      if (normalizedValue.includes(",")) normalizedValue = normalizedValue.replace(/\./g, "").replace(",", ".");
    }
    const number = toNumberOrNull(normalizedValue);
    return number === null ? null : number > 1 ? number / 100 : number;
  }

  function usesDecimalPercentageEntry(field) {
    return field?.tipo === "percentual" && (
      field.escalaPercentual === "decimal" ||
      DECIMAL_PERCENTAGE_ENTRY_FIELDS.has(field.nome)
    );
  }

  function usesLocalizedPercentageEntry(field) {
    return field?.tipo === "percentual" && (field.entradaPtBr === true || usesDecimalPercentageEntry(field));
  }

  function isCanaisDigitaisDocumentalField(field) {
    return [
      "resultadoAcumuladoDocumentalCanaisDigitais",
      "percentualAtingidoOficialCanaisDigitais",
      "tipoPosicaoCanaisDigitais",
      "fonteResultadoCanaisDigitais"
    ].includes(String(field?.nome || ""));
  }

  function badgeClass(status) {
    if (status === "Homologado") return "ok";
    if (status === "Devolvido para ajuste") return "danger";
    if (status === "Enviado para homologação") return "warn";
    return "info";
  }

  function showMessage(message, type = "info") {
    const target = document.getElementById("launchMessage");
    target.className = `notice ${type}`;
    target.textContent = message;
    target.hidden = false;
  }

  function showActionFeedback(message, type = "success") {
    if (window.ActionFeedback?.show("launchActionFeedback", message, type)) return;
    showMessage(message, type === "error" ? "danger" : type === "warning" ? "warning" : "info");
  }

  function clearActionFeedback() {
    window.ActionFeedback?.clear("launchActionFeedback");
  }

  function getIndicatorMap() {
    return Object.fromEntries(state.indicadores.map((item) => [item.id, item]));
  }

  function getSelectedLaunch() {
    return state.lancamentos.find((item) => String(item.id) === String(state.selectedId));
  }

  function launchCompetence(lancamento) {
    if (lancamento?.competencia) return String(lancamento.competencia).slice(0, 7);
    return `${lancamento?.ano || ""}-${String(lancamento?.mes || "").padStart(2, "0")}`;
  }

  function activeClosure(lancamento) {
    const competence = launchCompetence(lancamento);
    return (state.data?.fechamentosConselhoAdministracao || []).find((closure) => (
      closure?.ativo === true && (closure.competencias || []).includes(competence)
    )) || null;
  }

  function exceptionalCorrectionCycleActive(lancamento) {
    const relevant = (state.data?.homologacoes || [])
      .filter((entry) => String(entry.lancamentoId ?? entry.lancamento_id ?? "") === String(lancamento?.id ?? ""))
      .filter((entry) => [
        "reabertura_excepcional_pos_fechamento_ca",
        "lancamento_reaberto",
        "homologacao_lancamento"
      ].includes(String(entry.acao || "")))
      .sort((left, right) => String(right.dataAcao ?? right.data_acao ?? right.createdAt ?? right.created_at ?? "")
        .localeCompare(String(left.dataAcao ?? left.data_acao ?? left.createdAt ?? left.created_at ?? "")));
    return relevant[0]?.acao === "reabertura_excepcional_pos_fechamento_ca";
  }

  function latestReopenCycleAction(lancamento, homologacoes = state.data?.homologacoes || []) {
    return (homologacoes || [])
      .filter((entry) => String(entry.lancamentoId ?? entry.lancamento_id ?? "") === String(lancamento?.id ?? ""))
      .filter((entry) => [
        "reabertura_excepcional_pos_fechamento_ca",
        "lancamento_reaberto",
        "homologacao_lancamento"
      ].includes(String(entry.acao || "")))
      .sort((left, right) => String(right.dataAcao ?? right.data_acao ?? right.createdAt ?? right.created_at ?? "")
        .localeCompare(String(left.dataAcao ?? left.data_acao ?? left.createdAt ?? left.created_at ?? "")))[0]?.acao || null;
  }

  function unresolvedReopenCycle(lancamento, homologacoes = state.data?.homologacoes || []) {
    const status = Situations.normalizeText(lancamento?.status);
    if (status === "reaberto") return true;
    if (status !== "em preenchimento" || Number(lancamento?.versaoAtual ?? lancamento?.versao_atual ?? 1) <= 1) return false;
    return ["lancamento_reaberto", "reabertura_excepcional_pos_fechamento_ca"]
      .includes(latestReopenCycleAction(lancamento, homologacoes));
  }

  function requiresTransactionalPersistence(lancamento, homologacoes = state.data?.homologacoes || []) {
    return Situations.normalizeText(lancamento?.status) === "retificado" || unresolvedReopenCycle(lancamento, homologacoes);
  }

  function launchMutationPolicy(lancamento) {
    const official = state.mutationPolicies?.[String(lancamento?.id ?? "")];
    if (official) return official;
    const closure = activeClosure(lancamento);
    if (!closure) return { permitida: true, mensagem: "" };
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (today < closure.dataFechamento || exceptionalCorrectionCycleActive(lancamento)) {
      return { permitida: true, excepcional: today >= closure.dataFechamento, mensagem: "" };
    }
    const [year, month, day] = String(closure.dataFechamento).split("-");
    return {
      permitida: false,
      mensagem: `Alteração indisponível. Esta competência foi fechada para envio ao Conselho de Administração em ${day}/${month}/${year}.`
    };
  }

  function isEditable(lancamento) {
    const statusEditable = lancamento && (EDITABLE_STATUSES.includes(lancamento.status) || lancamento.revisaoMoedaPendente === true);
    return Boolean(statusEditable && launchMutationPolicy(lancamento).permitida);
  }

  async function loadMutationPolicy(lancamento) {
    if (!lancamento?.id) return;
    try {
      state.mutationPolicies[String(lancamento.id)] = await evidenceApi(
        `api/lancamentos/${encodeURIComponent(lancamento.id)}/edicao`,
        { method: "GET" }
      );
    } catch (error) {
      state.mutationPolicies[String(lancamento.id)] = {
        permitida: false,
        mensagem: error.message || "Não foi possível verificar a disponibilidade de edição."
      };
    }
  }

  function isManual(indicador) {
    const regra = indicador ? getRule(indicador) : null;
    return regra && MANUAL_TYPES.includes(regra.tipoCalculo);
  }

  function hasSpecificInputRule(regra) {
    return Boolean(regra && !regra.aviso && (regra.camposEntrada || []).length);
  }

  function usesAutomaticCalculation(indicador, regra) {
    return hasSpecificInputRule(regra) && !isManual(indicador);
  }

  function isIeoRule(regra) {
    return regra?.tipoCalculo === "indice_inverso" && Number(regra?.indicadorId) === 6;
  }

  function isIeoCaCompetence(regra, lancamento = getSelectedLaunch()) {
    return isIeoRule(regra) &&
      window.IeoRecorrente?.getMetodologiaIeoPorCompetencia?.(lancamento)?.codigo === "ca_agosto_2026";
  }

  function appUrl(path) {
    return typeof window.appUrl === "function" ? window.appUrl(path) : path;
  }

  function csrfToken() {
    return window.Auth?.getCurrentUser?.()?.csrfToken ||
      window.CAIXA_LOTERIAS_AUTH_USER?.csrfToken ||
      window.CAIXA_LOTERIAS_CSRF_TOKEN ||
      "";
  }

  async function evidenceApi(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (csrfToken()) headers["X-CSRF-Token"] = csrfToken();
    if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(appUrl(path), { cache: "no-store", ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.sucesso === false || payload.ok === false) {
      throw new Error(payload.mensagem || payload.error || `Falha na API (${response.status}).`);
    }
    return Object.prototype.hasOwnProperty.call(payload, "dados") ? payload.dados : payload;
  }

  function evidenceItems(launchId) {
    return state.evidenciasPorLancamento[String(launchId)] || [];
  }

  function historicalEvidenceItems(launchId) {
    return state.evidenciasHistoricasPorLancamento[String(launchId)] || [];
  }

  function formatUploadDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
  }

  function renderEvidenceList(lancamento) {
    const target = document.getElementById("launchEvidenceList");
    const items = evidenceItems(lancamento.id);
    if (!items.length) {
      target.innerHTML = '<p class="evidence-empty">Nenhum arquivo anexado.</p>';
      renderHistoricalEvidenceList(lancamento);
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
          ${isEditable(lancamento) ? `<button class="secondary-action danger-action" type="button" data-remove-evidence="${escapeHtml(item.id)}">Remover</button>` : ""}
        </div>
      </article>
    `).join("");

    renderHistoricalEvidenceList(lancamento);
  }

  function renderHistoricalEvidenceList(lancamento) {
    const wrapper = document.getElementById("launchEvidenceHistoryWrapper");
    const target = document.getElementById("launchEvidenceHistoryList");
    if (!wrapper || !target) return;
    const items = historicalEvidenceItems(lancamento.id);
    wrapper.hidden = !items.length;
    target.innerHTML = items.map((item) => `
      <article class="evidence-item">
        <div class="evidence-item-icon" aria-hidden="true">&#128206;</div>
        <div class="evidence-item-content">
          <strong>Versão ${escapeHtml(item.versaoLancamento)} — ${escapeHtml(item.nomeArquivo)}</strong>
          ${item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ""}
          <small>${escapeHtml([formatUploadDate(item.dataUpload), item.usuario].filter(Boolean).join(" â€¢ "))}</small>
        </div>
        <div class="evidence-item-actions">
          <a class="secondary-action" href="${escapeHtml(appUrl(`evidencias/${encodeURIComponent(item.id)}/download`))}">Baixar</a>
        </div>
      </article>
    `).join("");
  }

  async function loadEvidenceList(launchId, quiet = false) {
    if (!quiet) document.getElementById("launchEvidenceList").innerHTML = '<p class="evidence-empty">Carregando anexos...</p>';
    const [items, historicalItems] = await Promise.all([
      evidenceApi(`api/lancamentos/${encodeURIComponent(launchId)}/evidencias`, { method: "GET" }),
      evidenceApi(`api/lancamentos/${encodeURIComponent(launchId)}/evidencias/historico`, { method: "GET" })
    ]);
    state.evidenciasPorLancamento[String(launchId)] = Array.isArray(items) ? items : [];
    state.evidenciasHistoricasPorLancamento[String(launchId)] = Array.isArray(historicalItems) ? historicalItems : [];
    const selected = getSelectedLaunch();
    if (selected && String(selected.id) === String(launchId)) renderEvidenceList(selected);
    return state.evidenciasPorLancamento[String(launchId)];
  }

  function pendingEvidenceFile() {
    return document.getElementById("launchEvidenceFile")?.files?.[0] || null;
  }

  function renderPendingEvidenceStatus(errorMessage = "") {
    const target = document.getElementById("launchEvidencePendingStatus");
    if (!target) return;
    const file = pendingEvidenceFile();
    if (!file) {
      target.hidden = true;
      target.textContent = "";
      target.className = "evidence-pending-status";
      return;
    }
    target.hidden = false;
    target.className = `evidence-pending-status${errorMessage ? " is-error" : ""}`;
    target.textContent = errorMessage || `Arquivo selecionado: ${file.name} — será anexado ao salvar.`;
  }

  function setEvidenceOperationBusy(busy) {
    state.evidenceOperationInProgress = busy;
    ["addEvidenceButton", "saveDraftButton", "sendApprovalButton"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = busy || !isEditable(getSelectedLaunch());
    });
  }

  async function uploadPendingEvidence(lancamento) {
    const fileInput = document.getElementById("launchEvidenceFile");
    const file = pendingEvidenceFile();
    if (!file) return { uploaded: false };

    const form = new FormData();
    form.append("evidencia", file);
    form.append("descricao", document.getElementById("launchEvidenceDescription").value.trim());
    try {
      const evidence = await evidenceApi(`api/lancamentos/${encodeURIComponent(lancamento.id)}/evidencias`, { method: "POST", body: form });
      fileInput.value = "";
      document.getElementById("launchEvidenceDescription").value = "";
      renderPendingEvidenceStatus();
      await loadEvidenceList(lancamento.id, true);
      return { uploaded: true, evidence };
    } catch (error) {
      renderPendingEvidenceStatus(`Arquivo selecionado, mas ainda não anexado: ${error.message}`);
      throw error;
    }
  }

  async function addEvidence() {
    clearActionFeedback();
    const lancamento = getSelectedLaunch();
    if (!lancamento || !isEditable(lancamento) || !pendingEvidenceFile()) {
      showMessage("Selecione um arquivo permitido.", "warning");
      return;
    }
    if (state.evidenceOperationInProgress) return;
    setEvidenceOperationBusy(true);
    try {
      await uploadPendingEvidence(lancamento);
      showActionFeedback("Evidência anexada com sucesso.");
    } catch (error) {
      showActionFeedback(error.message || "Não foi possível anexar a evidência.", "error");
    } finally {
      setEvidenceOperationBusy(false);
    }
  }

  async function removeEvidence(id) {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !isEditable(lancamento)) return;
    if (!window.confirm("Remover este arquivo de evidência?")) return;
    clearActionFeedback();
    try {
      await evidenceApi(`api/evidencias/${encodeURIComponent(id)}/remover`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadEvidenceList(lancamento.id, true);
      showActionFeedback("Evidência removida com sucesso.");
    } catch (error) {
      showActionFeedback(error.message || "Não foi possível remover a evidência.", "error");
    }
  }

  function canAdjustOfficialPerformance() {
    return state.user?.perfilCodigo === "administrador" ||
      state.user?.perfil === "Administrador" ||
      state.user?.sgUnidade === "GERIN" ||
      state.user?.unidadeApuradora === "GERIN";
  }

  function getMetaLabel(regra) {
    if (regra?.tipoCalculo === "razao_canais_digitais") return "Meta da competência";
    if (regra?.tipoCalculo === "marco_projeto_percentual" && regra?.parametrosCalculo?.metaTipo === "curva_trimestral_percentual") {
      return "Meta do fechamento trimestral";
    }
    if (regra?.tipoCalculo === "melhorias_acumuladas") return "Meta acumulada do período";
    if (regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto") return "Meta oficial do período";
    if (regra?.tipoCalculo === "participacao_ecossistema_com_cenarios") return "Meta trimestral 2026";
    if (regra?.tipoCalculo === "incremento_rede_loterica_base_2025") return "Meta trimestral de incremento";
    if (regra?.tipoCalculo === "crescimento_comparado_base_2025") return "Meta em indice (110% da base 2025)";
    if (regra?.tipoCalculo === "crescimento_rede_loterica_base_2025") return "Meta em indice (102% da base 2025)";
    if (isIeoRule(regra)) return "Meta de referência da competência";
    if (regra?.tipoCalculo === "lucro_recorrente_mensal") return "Meta da competência";
    if (regra?.parametrosCalculo?.metaTipo === "curva_acumulada_por_competencia") {
      return "Meta acumulada de referencia";
    }
    if (regra?.parametrosCalculo?.metaMensalFixa || regra?.parametrosCalculo?.metaMensalPix) {
      return "Meta mensal de referência";
    }
    return regra && regra.tipoConsolidacao === "ultima_posicao"
      ? "Meta de referência mensal"
      : "Meta de referência";
  }

  function getRule(indicador) {
    return IndicatorFormulas.obterRegra(indicador, state.regras);
  }

  function getDisplayMeta(regra, lancamento, metas = state.data?.metas || []) {
    const persistedMeta = lancamento?.metaReferencia ?? lancamento?.metaMensal ?? null;
    if (regra?.tipoCalculo === "marco_projeto_percentual" && regra?.parametrosCalculo?.metaTipo === "curva_trimestral_percentual") {
      const trimestre = lancamento?.trimestre || `${Math.ceil(Number(lancamento?.mes) / 3)}TRI/${lancamento?.ano || 2026}`;
      return lancamento?.metaReferenciaTrimestre ??
        lancamento?.camposEntrada?.metaReferenciaTrimestre ??
        regra.parametrosCalculo.curvaTrimestralPercentual?.[trimestre]?.metaPercentual ??
        null;
    }
    const metaPercentualAcoesPropostas = Calculations.resolverMetaPercentualAcoesPropostas?.(regra, lancamento);
    if (metaPercentualAcoesPropostas !== null && metaPercentualAcoesPropostas !== undefined) {
      return metaPercentualAcoesPropostas;
    }
    const resolvedMeta = window.DataStore?.resolveMeta?.(
      lancamento?.indicadorId ?? lancamento?.indicador_id ?? regra?.indicadorId,
      lancamento?.ano,
      lancamento?.mes,
      metas,
      persistedMeta
    );
    if (resolvedMeta !== null && resolvedMeta !== undefined && resolvedMeta !== "" && Number.isFinite(Number(resolvedMeta))) {
      return Number(resolvedMeta);
    }
    if (regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto") {
      const trimestre = lancamento?.trimestre || `${Math.ceil(Number(lancamento?.mes) / 3)}TRI/${lancamento?.ano || 2026}`;
      const metas = regra.parametrosCalculo.metasTrimestraisOficiais || {};
      return Object.prototype.hasOwnProperty.call(metas, trimestre) ? metas[trimestre] : null;
    }
    if (regra?.tipoCalculo === "melhorias_acumuladas") {
      const trimestre = lancamento?.trimestre || `${Math.ceil(Number(lancamento?.mes) / 3)}TRI/${lancamento?.ano || 2026}`;
      return regra?.parametrosCalculo?.curvaTrimestralAcumulada?.[trimestre]?.metaPercentual ?? null;
    }
    if (regra?.tipoCalculo === "participacao_ecossistema_com_cenarios") {
      const curve = getEcossistemaCurveForLaunch(regra, lancamento, lancamento?.camposEntrada?.cenarioApuracaoEcossistema);
      return curve ? curve.meta2026 / 100 : lancamento.metaMensal ?? regra?.metaAnualValor;
    }
    if (regra?.tipoCalculo === "incremento_rede_loterica_base_2025") {
      const curve = getRedeLotericaCurveForLaunch(regra, lancamento);
      return curve ? curve.metaIncremento / 100 : lancamento.metaMensal ?? regra?.metaAnualValor;
    }
    if (regra?.tipoCalculo === "lucro_recorrente_mensal") {
      const key = lancamento?.competencia || `${lancamento?.ano}-${String(lancamento?.mes).padStart(2, "0")}`;
      const curve = regra?.parametrosCalculo?.metasMensaisPorCompetencia || {};
      return Object.prototype.hasOwnProperty.call(curve, key)
        ? curve[key]
        : lancamento?.metaMensal ?? lancamento?.metaReferencia ?? null;
    }
    if (regra?.parametrosCalculo?.metaTipo === "curva_acumulada_por_competencia") {
      const key = lancamento?.competencia || `${lancamento?.ano}-${String(lancamento?.mes).padStart(2, "0")}`;
      const curva = regra.parametrosCalculo.metasAcumuladasPorCompetencia || {};
      return Object.prototype.hasOwnProperty.call(curva, key) && curva[key] !== null
        ? curva[key]
        : "Pendente de curva orcamentaria";
    }
    return regra?.parametrosCalculo?.metaMensalFixa ??
      regra?.parametrosCalculo?.metaMensalPix ??
      regra?.parametrosCalculo?.metaMinimaMelhoriasAno ??
      regra?.parametrosCalculo?.metaReferencia ??
      lancamento.metaMensal ??
      regra?.metaAnualValor;
  }

  function getLaunchListPerformance(regra, lancamento, calculation = null) {
    const accumulatedRatio = regra?.tipoCalculo === "razao_canais_digitais";
    if (accumulatedRatio) {
      return {
        resultado: calculation?.resultadoAcumulado ?? calculation?.resultadoOficialAnual ?? lancamento?.resultadoAcumulado ?? lancamento?.resultadoOficialAnual ?? null,
        percentual: calculation?.percentualAtingidoAnual ?? calculation?.percentualAtingidoAcumulado ?? lancamento?.percentualAtingidoAnual ?? lancamento?.percentualAtingidoAcumulado ?? lancamento?.percentualAtingido ?? null
      };
    }
    return {
      resultado: calculation ? calculation.resultadoMensal : lancamento?.resultadoMensal ?? lancamento?.realizadoMensal,
      percentual: calculation?.percentualAtingidoMensal ?? lancamento?.percentualAtingido ?? lancamento?.percentualAtingidoMensal ?? null
    };
  }

  function formatDisplayMeta(regra, lancamento, metas = state.data?.metas || []) {
    const meta = getDisplayMeta(regra, lancamento, metas);
    return typeof meta === "string" ? meta : Calculations.formatarValor(meta, regra && regra.unidadeMedida);
  }

  function getQuarterKey(lancamento) {
    const quarter = String(lancamento?.trimestre || "").match(/([1-4])\s*TRI/i);
    if (quarter) return `${quarter[1]}TRI`;
    return lancamento?.mes ? `${Math.ceil(Number(lancamento.mes) / 3)}TRI` : null;
  }

  function normalizeEcossistemaScenario(value, regra) {
    const fallback = regra?.parametrosCalculo?.cenarioOficialResumoExecutivo || "lotex_marketplace";
    const text = String(value || fallback)
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/\+/g, "_")
      .replace(/_+/g, "_");
    if (text === "lotex") return "lotex";
    if (["lotex_marketplace", "lotex_e_marketplace"].includes(text)) return "lotex_marketplace";
    return fallback;
  }

  function getEcossistemaCurveForLaunch(regra, lancamento, scenarioValue) {
    const scenario = normalizeEcossistemaScenario(scenarioValue, regra);
    const quarter = getQuarterKey(lancamento);
    return quarter ? regra?.parametrosCalculo?.curvasCenarios?.[scenario]?.[quarter] || null : null;
  }

  function getRedeLotericaCurveForLaunch(regra, lancamento) {
    const quarter = getQuarterKey(lancamento);
    return quarter ? regra?.parametrosCalculo?.curvaIncrementoTrimestral?.[quarter] || null : null;
  }

  function getEntryValuesFromLaunch(lancamento, regra) {
    const saved = lancamento.camposEntrada || {};
    const values = Object.fromEntries((regra.camposEntrada || []).map((field) => {
      if (saved[field.nome] !== undefined) return [field.nome, saved[field.nome]];
      if (field.nome === "realizadoMensal" && !isOfertasPersonalizadasRule(regra)) return [field.nome, lancamento.realizadoMensal ?? ""];
      return [field.nome, ""];
    }));
    if (regra?.tipoCalculo === "participacao_ecossistema_com_cenarios") {
      values.cenarioApuracaoEcossistema = normalizeEcossistemaScenario(values.cenarioApuracaoEcossistema, regra);
      const curve = getEcossistemaCurveForLaunch(regra, lancamento, values.cenarioApuracaoEcossistema);
      if (curve) {
        values.referencia2025Trimestre = curve.referencia2025;
        values.metaTrimestral2026 = curve.meta2026;
      }
    }
    if (regra?.tipoCalculo === "incremento_rede_loterica_base_2025") {
      const curve = getRedeLotericaCurveForLaunch(regra, lancamento);
      if (curve) values.metaTrimestral = curve.metaIncremento;
    }
    if (regra?.tipoCalculo === "cobertura_capacitacao") {
      values.tipoPosicaoCapacitacao = IndicatorFormulas.resolverTipoPosicaoCapacitacao(lancamento) || "";
      values.modoResultadoCapacitacao = IndicatorFormulas.resolverModoResultadoCapacitacao(lancamento);
      const trimestre = lancamento.trimestre || `${Math.ceil(Number(lancamento.mes) / 3)}TRI/${lancamento.ano || 2026}`;
      const criterio = regra.parametrosCalculo?.curvaTrimestralCursos?.[trimestre] || {};
      values.quantidadeCursosMinimaCapacitacao = criterio.quantidadeCursosMinima ?? "";
    }
    if (regra?.tipoCalculo === "melhorias_acumuladas") {
      values.tipoPosicaoAprimoramento = IndicatorFormulas.resolverTipoPosicaoAprimoramento(lancamento) || "";
    }
    return values;
  }

  function formatEntryValue(field, value) {
    if (field.tipo === "moeda" && value !== "") return CurrencyBR.formatarMoedaBR(value).replace(/^R\$\s?/, "");
    if (field.tipo === "inteiro" && value !== "") return Calculations.formatarInteiroBR(value);
    if (usesDecimalPercentageEntry(field) && value !== "") {
      const decimal = toNumberOrNull(value);
      return decimal === null ? "" : `${(decimal * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
    }
    if (field.tipo === "percentual" && field.entradaPtBr && value !== "") {
      const normalized = normalizarPercentual(value);
      return normalized === null ? "" : (normalized * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
    }
    return value ?? "";
  }

  function formatIntegerEntryInput(input, event) {
    const rawValue = input.value.trim();
    if (!rawValue) {
      input.setCustomValidity("");
      return;
    }
    let parsed = Calculations.parseInteiroBR(rawValue);
    if (parsed === null && event?.inputType !== "insertFromPaste" && /^\d[\d.]*$/.test(rawValue)) {
      parsed = Calculations.parseInteiroBR(rawValue.replace(/\./g, ""));
    }
    if (parsed === null) {
      input.setCustomValidity("Informe uma quantidade inteira não negativa, sem casas decimais.");
      return;
    }
    const selectionStart = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, selectionStart).replace(/\D/g, "").length;
    input.value = Calculations.formatarInteiroBR(parsed);
    let cursorPosition = digitsBeforeCursor === 0 ? 0 : input.value.length;
    let digitsSeen = 0;
    for (let index = 0; index < input.value.length && digitsBeforeCursor > 0; index += 1) {
      if (!/\d/.test(input.value[index])) continue;
      digitsSeen += 1;
      if (digitsSeen === digitsBeforeCursor) {
        cursorPosition = index + 1;
        break;
      }
    }
    input.setSelectionRange(cursorPosition, cursorPosition);
    input.setCustomValidity("");
  }

  function renderEntryInput(field, value, extra = "") {
    const wrapperClass = field.tipo === "textarea" ? "full-span" : "";
    const emptyDocumentalField = isCanaisDigitaisDocumentalField(field) && (
      value === null || value === undefined || value === ""
    );
    if (field.tipo === "selecao") {
      const options = field.opcoes || [];
      return `
        <label class="${wrapperClass}" data-entry-wrapper="${escapeHtml(field.nome)}">${escapeHtml(field.rotulo || field.nome)}
          <select
            class="dynamic-entry-field"
            data-entry-field="${escapeHtml(field.nome)}"
            data-entry-type="texto"
            ${field.obrigatorio ? "required" : ""}
            ${extra}
          >
            ${options.map((option) => {
              const label = typeof option === "string"
                ? option
                : option.label ?? option.nome ?? option.id ?? "";
              const optionValue = typeof option === "string"
                ? option
                : option.value ?? option.id ?? option.label ?? option.nome ?? "";
              const selected = [optionValue, label].some((candidate) => String(value || "") === String(candidate));
              return `<option value="${escapeHtml(optionValue)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
            }).join("")}
          </select>
        </label>
      `;
    }
    if (field.tipo === "textarea") {
      return `
        <label class="full-span" data-entry-wrapper="${escapeHtml(field.nome)}">${escapeHtml(field.rotulo || field.nome)}
          <textarea
            class="dynamic-entry-field"
            data-entry-field="${escapeHtml(field.nome)}"
            data-entry-type="texto"
            rows="4"
            ${field.obrigatorio ? "required" : ""}
            ${field.somenteLeitura ? "readonly" : ""}
            ${extra}
          >${escapeHtml(value ?? "")}</textarea>
        </label>
      `;
    }
    return `
      <label class="${wrapperClass}" data-entry-wrapper="${escapeHtml(field.nome)}">${escapeHtml(field.rotulo || field.nome)}
        <input
          class="dynamic-entry-field"
          data-entry-field="${escapeHtml(field.nome)}"
          data-entry-type="${escapeHtml(field.tipo || "numero")}"
          type="${["texto", "moeda", "inteiro"].includes(field.tipo) || usesLocalizedPercentageEntry(field) ? "text" : field.tipo === "data" ? "date" : "number"}"
          ${emptyDocumentalField ? "placeholder=\"-\"" : field.tipo === "moeda" || usesLocalizedPercentageEntry(field) ? "inputmode=\"decimal\" placeholder=\"0,00\"" : field.tipo === "inteiro" ? "inputmode=\"numeric\" placeholder=\"0\"" : field.tipo === "texto" || field.tipo === "data" ? "" : "step=\"any\""}
          value="${escapeHtml(emptyDocumentalField ? "" : formatEntryValue(field, value))}"
          ${field.obrigatorio ? "required" : ""}
          ${field.somenteLeitura ? "readonly" : ""}
          ${extra}
        >
      </label>
    `;
  }

  function isRgfElementsRule(regra) {
    return regra?.tipoCalculo === "plano_acao_por_elementos";
  }

  function normalizeRgfKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function rgfRowsFromLaunch(lancamento) {
    const fields = lancamento?.camposEntrada || {};
    if (Array.isArray(fields.elementosRGFAtendidos) && fields.elementosRGFAtendidos.length) {
      return fields.elementosRGFAtendidos.map((item) => ({
        elemento: item?.elemento || "",
        status: item?.status || "",
        acao: item?.acao || "",
        data: item?.data || "",
        evidencia: item?.evidencia || ""
      }));
    }
    if (fields.elementoRGF || fields.statusAcao || fields.acaoExecutada) {
      return [{
        elemento: fields.elementoRGF || "",
        status: fields.statusAcao || "",
        acao: fields.acaoExecutada || "",
        data: fields.dataConclusao || "",
        evidencia: fields.evidenciaAcao || ""
      }];
    }
    return [{ elemento: "", status: "", acao: "", data: "", evidencia: "" }];
  }

  function rgfElementOptions(regra) {
    return regra?.parametrosCalculo?.elementosJogoResponsavel || [];
  }

  function rgfStatusOptions(regra) {
    const configuredField = (regra?.camposEntrada || []).find((field) => field.nome === "statusAcao");
    return configuredField?.opcoes || ["Não iniciada", "Em andamento", "Concluída", "Homologada"];
  }

  function renderRgfOption(value, selectedValue, label = value) {
    const selected = String(value) === String(selectedValue || "") ? "selected" : "";
    return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
  }

  function renderRgfRow(row, regra) {
    const elementOptions = rgfElementOptions(regra);
    const statusOptions = rgfStatusOptions(regra);
    return `
      <article class="rgf-element-row" data-rgf-row>
        <label>Elemento RGF/WLA
          <select class="rgf-entry-field" data-rgf-field="elemento" required>
            ${renderRgfOption("", row.elemento, "Selecione")}
            ${elementOptions.map((option) => renderRgfOption(option, row.elemento)).join("")}
          </select>
        </label>
        <label>Status
          <select class="rgf-entry-field" data-rgf-field="status" required>
            ${renderRgfOption("", row.status, "Selecione")}
            ${statusOptions.map((option) => {
              const label = typeof option === "string" ? option : option.label ?? option.nome ?? option.value ?? "";
              const value = typeof option === "string" ? option : option.value ?? option.id ?? label;
              return renderRgfOption(value, row.status, label);
            }).join("")}
          </select>
        </label>
        <label class="full-span">Ação/descrição <span class="field-optional">(opcional)</span>
          <textarea class="rgf-entry-field" data-rgf-field="acao" rows="2">${escapeHtml(row.acao)}</textarea>
        </label>
        <label>Data <span class="field-optional">(opcional)</span>
          <input class="rgf-entry-field" data-rgf-field="data" type="date" value="${escapeHtml(row.data)}">
        </label>
        <label>Referência/evidência textual <span class="field-optional">(opcional)</span>
          <input class="rgf-entry-field" data-rgf-field="evidencia" type="text" value="${escapeHtml(row.evidencia)}">
        </label>
        <button class="secondary-action rgf-remove-row" type="button" data-remove-rgf-element>Remover elemento</button>
      </article>
    `;
  }

  function renderRgfElementsFields(lancamento, regra) {
    return `
      <section class="rgf-elements-editor full-span">
        <div class="rgf-elements-heading">
          <div>
            <h4>Elementos atendidos</h4>
            <p>Registre cada elemento uma única vez. Somente Concluída e Homologada entram no cálculo.</p>
          </div>
          <button class="secondary-action" type="button" data-add-rgf-element>Adicionar elemento</button>
        </div>
        <div class="rgf-elements-list">
          ${rgfRowsFromLaunch(lancamento).map((row) => renderRgfRow(row, regra)).join("")}
        </div>
      </section>
    `;
  }

  function collectRgfRows() {
    return [...document.querySelectorAll("[data-rgf-row]")].map((row) => ({
      elemento: row.querySelector('[data-rgf-field="elemento"]')?.value.trim() || "",
      status: row.querySelector('[data-rgf-field="status"]')?.value.trim() || "",
      acao: row.querySelector('[data-rgf-field="acao"]')?.value.trim() || "",
      data: row.querySelector('[data-rgf-field="data"]')?.value.trim() || "",
      evidencia: row.querySelector('[data-rgf-field="evidencia"]')?.value.trim() || ""
    })).filter((item) => Object.values(item).some(Boolean));
  }

  function validateRgfRows(regra, options = {}) {
    if (!isRgfElementsRule(regra)) return true;
    const rows = [...document.querySelectorAll("[data-rgf-row]")];
    const seen = new Set();
    let invalid = null;
    rows.forEach((row) => {
      const elementInput = row.querySelector('[data-rgf-field="elemento"]');
      const statusInput = row.querySelector('[data-rgf-field="status"]');
      const key = normalizeRgfKey(elementInput?.value);
      elementInput?.setCustomValidity("");
      statusInput?.setCustomValidity("");
      if (!key && !invalid) {
        elementInput?.setCustomValidity("Selecione o elemento RGF/WLA.");
        invalid = elementInput;
      } else if (seen.has(key) && !invalid) {
        elementInput?.setCustomValidity("Este elemento já foi informado nesta competência.");
        invalid = elementInput;
      } else if (key) {
        seen.add(key);
      }
      if (!String(statusInput?.value || "").trim() && !invalid) {
        statusInput?.setCustomValidity("Selecione o status do elemento.");
        invalid = statusInput;
      }
    });
    if (!rows.length) return false;
    if (invalid && options.focus) {
      invalid.reportValidity();
      invalid.focus();
    }
    return !invalid;
  }

  function isOfertasPersonalizadasRule(regra) {
    return Boolean(regra && (
      ((regra.camposEntrada || []).some((field) => field.nome === "baseClientesAtivos") &&
        (regra.camposEntrada || []).some((field) => field.nome === "clientesComOfertaPersonalizada")) ||
      ((regra.camposEntrada || []).some((field) => field.nome === "baseClientesAtivosCompetencia") &&
        (regra.camposEntrada || []).some((field) => field.nome === "clientesUnicosComOfertaPersonalizadaCompetencia"))
    ));
  }

  function isOfertasPersonalizadasIndicator(indicador, regra) {
    return Boolean(indicador && indicador.id === 1) || isOfertasPersonalizadasRule(regra);
  }

  function shouldHideGoalAchievementFields(indicador, regra) {
    if (isIeoRule(regra)) return false;
    if (regra?.tipoCalculo === "participacao_ecossistema_com_cenarios") return false;
    if (regra?.tipoCalculo === "incremento_rede_loterica_base_2025") return false;
    if (["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)) return false;
    if (isOfertasPersonalizadasIndicator(indicador, regra)) return false;
    if (regra?.tipoCalculo === "melhorias_acumuladas") return false;
    if (regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto") return false;
    return usesAutomaticCalculation(indicador, regra) && regra && (regra.unidadeMedida === "percentual" || regra.parametrosCalculo?.quantoMenorMelhor);
  }

  function fillFilters(lancamentos) {
    const selectedIndicator = document.querySelector('[data-filter="indicador"]')?.value || "";
    const monthSource = selectedIndicator
      ? lancamentos.filter((item) => String(item.indicadorId) === String(selectedIndicator))
      : lancamentos;
    const options = {
      mes: ["Todos", ...unique(monthSource.map((item) => launchMonthName(item)))].map((value) => ({ value, label: value })),
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
      (values.mes === "Todos" || launchMonthName(item) === values.mes) &&
      (values.status === "Todos" || item.status === values.status) &&
      (!values.indicador || String(item.indicadorId) === String(values.indicador))
    ));
  }

  function getFilteredLaunches() {
    const filterEntries = [...document.querySelectorAll("[data-filter]")]
      .map((select) => [select.dataset.filter, select.value]);
    const values = Object.fromEntries(filterEntries);
    return filterLaunches(state.lancamentos, values);
  }

  function renderTable(lancamentos) {
    const target = document.getElementById("lancamentosTable");
    const porId = getIndicatorMap();
    if (!lancamentos.length) {
      target.innerHTML = '<tr><td colspan="7">Nenhum lançamento encontrado para o escopo e filtros selecionados.</td></tr>';
      return;
    }

    target.innerHTML = lancamentos.slice(0, 100).map((item) => {
      const indicador = porId[item.indicadorId];
      const regra = indicador ? getRule(indicador) : null;
      const actionLabel = item.status === "Devolvido para ajuste"
        ? "Editar"
        : isEditable(item)
          ? "Preencher"
          : "Visualizar";
      const tableCalculation = ["nota_pesquisa_nps", "iniciativas_apoiadas", "execucao_acoes_propostas", "lucro_recorrente_mensal", "razao_canais_digitais"].includes(regra?.tipoCalculo)
        ? IndicatorFormulas.calcularIndicador(
          indicador,
          regra,
          item,
          state.lancamentos.filter((candidate) => (
            Number(candidate.indicadorId) === Number(item.indicadorId) &&
            Number(candidate.ano) === Number(item.ano) &&
            Number(candidate.mes) <= Number(item.mes)
          ))
        )
        : null;
      const tablePerformance = getLaunchListPerformance(regra, item, tableCalculation);
      const situacao = Situations.normalizarSituacao(
        tableCalculation?.situacao ||
        item.situacaoCalculada ||
        getCalculatedSituation(tablePerformance.percentual)
      );
      return `
        <tr>
          <td>${escapeHtml(indicador ? indicador.indicador : item.indicadorId)}</td>
          <td>${escapeHtml(launchMonthName(item))}/${escapeHtml(item.ano)}</td>
          <td>${escapeHtml(formatDisplayMeta(regra, item))}</td>
          <td>${Calculations.formatarValor(tablePerformance.resultado, regra && regra.unidadeMedida)}</td>
          <td>${escapeHtml(situacao)}</td>
          <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td><button class="secondary-action table-action" type="button" data-id="${item.id}">${actionLabel}</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderReference(indicador, lancamento, regra) {
    const metodologiaIeo = isIeoRule(regra)
      ? window.IeoRecorrente?.getMetodologiaIeoPorCompetencia?.(lancamento)
      : null;
    document.getElementById("launchReference").innerHTML = [
      ["Plano", indicador.plano],
      ["Pilar", indicador.pilar],
      ["Periodicidade", indicador.periodicidade],
      ["Unidade apuradora", indicador.unidadeApuradora || "Não informado"],
      ["Diretoria responsável", indicador.diretoriaResponsavel || "Não informado"],
      ["Tipo de cálculo", regra.tipoCalculo],
      ["Consolidação anual", regra.tipoConsolidacao],
      ["Exige evidência", regra.exigeEvidencia ? "Sim" : "Não"],
      ["Meta anual", indicador.metaAnualDescricao, true],
      ...(metodologiaIeo ? [
        ["Metodologia vigente", metodologiaIeo.descricao, true],
        ["Fórmula vigente", metodologiaIeo.formula, true]
      ] : []),
      ["Regra", regra.aviso || "Regra específica configurada.", true],
      ["Status atual", lancamento.status, true]
    ].map(([label, value, full]) => `
      <article class="detail-item ${full ? "full-span" : ""}">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
  }

  function setFormDisabled(disabled) {
    [
      "launchRealizado",
      "launchPercentualManual",
      "launchObservacaoArea",
      "launchEvidenceReference",
      "launchEvidenceFile",
      "launchEvidenceDescription",
      "addEvidenceButton",
      "saveDraftButton",
      "sendApprovalButton",
      "clearLaunchButton"
    ].forEach((id) => {
      document.getElementById(id).disabled = disabled;
    });
    document.querySelectorAll(".dynamic-entry-field, .dynamic-entry-toggle, .rgf-entry-field, [data-add-rgf-element], [data-remove-rgf-element]").forEach((input) => {
      input.disabled = disabled;
    });
  }

  function enforceRuleFieldState(indicador, regra, disabled) {
    const automatic = usesAutomaticCalculation(indicador, regra);
    const manual = isManual(indicador);
    const hideAtingimentoFields = shouldHideGoalAchievementFields(indicador, regra);
    const calculatedFields = [
      "launchMeta",
      "launchResultadoMensal",
      "launchPercentualCalculado",
      "launchResultadoAcumulado",
      "launchPercentualAcumulado",
      "launchSituacaoCalculada"
    ];

    document.getElementById("realizadoWrapper").hidden = automatic;
    document.getElementById("manualPercentWrapper").hidden = !manual;
    document.getElementById("percentualMensalWrapper").hidden = hideAtingimentoFields;
    document.getElementById("percentualAnualWrapper").hidden = hideAtingimentoFields;
    document.getElementById("resultadoAnualWrapper").hidden = false;
    document.getElementById("situacaoCalculadaWrapper").hidden = !automatic;
    if (isIeoRule(regra)) {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("percentualAnualWrapper").hidden = true;
      document.getElementById("resultadoAnualWrapper").hidden = isIeoCaCompetence(regra);
    }
    if (regra?.tipoCalculo === "cobertura_capacitacao") {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("resultadoAnualWrapper").hidden = true;
      document.getElementById("percentualAnualWrapper").hidden = true;
    }
    if (regra?.tipoCalculo === "melhorias_acumuladas") {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("resultadoAnualWrapper").hidden = true;
      document.getElementById("percentualAnualWrapper").hidden = true;
    }
    if (regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto") {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("resultadoAnualWrapper").hidden = true;
      document.getElementById("percentualAnualWrapper").hidden = true;
    }

    document.getElementById("launchResultadoMensalLabel").textContent = regra?.tipoCalculo === "marco_projeto_percentual"
      ? "Resultado oficial da competência"
      : isIeoRule(regra)
      ? "IEO calculado da competência"
      : regra?.tipoCalculo === "nota_pesquisa_nps"
        ? "Resultado NPS calculado"
      : regra?.tipoCalculo === "melhorias_acumuladas"
        ? "Resultado acumulado"
      : regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto"
        ? "Evolução oficial do projeto"
      : regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
        ? "Incremento percentual"
      : ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)
        ? "Indice 2026/2025"
      : "Resultado da competência";
    document.getElementById("launchPercentualCalculadoLabel").textContent = regra?.tipoCalculo === "marco_projeto_percentual"
      ? "Atingimento oficial"
      : isIeoRule(regra)
      ? "% atingido"
      : regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
        ? "% atingido"
      : ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)
        ? "% atingido da meta"
      : "% da meta atingida";
    document.getElementById("launchResultadoAcumuladoLabel").textContent = isIeoRule(regra)
      ? "Posição acumulada até a competência"
      : regra?.tipoCalculo === "lucro_recorrente_mensal"
        ? "Resultado acumulado no ano"
      : regra?.tipoCalculo === "plano_acao_por_elementos"
        ? "Resultado acumulado no ano"
      : regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
        ? "Incremento oficial do indicador"
      : ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)
        ? "Indice acumulado 2026/2025"
      : isOfertasPersonalizadasIndicator(indicador, regra)
        ? "Resultado oficial do indicador"
      : "Resultado oficial anual";
    document.getElementById("launchPercentualAcumuladoLabel").textContent = regra?.tipoCalculo === "lucro_recorrente_mensal"
      ? "% da meta acumulada"
      : regra?.tipoCalculo === "plano_acao_por_elementos"
        ? "% da meta anual"
      : "% da meta atingida anual";
    document.getElementById("launchSituacaoCalculadaLabel").textContent = regra?.tipoCalculo === "marco_projeto_percentual"
      ? "Situação oficial"
      : isIeoRule(regra)
      ? "Situação da competência"
      : "Situação";

    const realizedInput = document.getElementById("launchRealizado");
    realizedInput.readOnly = automatic;
    realizedInput.disabled = disabled || automatic;

    const manualPercentInput = document.getElementById("launchPercentualManual");
    manualPercentInput.readOnly = !manual;
    manualPercentInput.disabled = disabled || !manual;

    calculatedFields.forEach((id) => {
      const input = document.getElementById(id);
      input.readOnly = true;
      input.disabled = false;
    });
    updateCapacitacaoPositionFields(regra, getSelectedLaunch());
    updateAprimoramentoPositionFields(regra, getSelectedLaunch());
    updateNpsPositionFields(regra, getSelectedLaunch());
  }

  function getCalculatedSituation(percentualAtingido) {
    const percentual = toNumberOrNull(percentualAtingido);
    if (percentual === null) return "Sem dados";
    if (percentual >= 1) return "Atingido";
    return "Abaixo da meta";
  }

  function renderDynamicFields(lancamento, regra) {
    const metodologiaIeo = isIeoRule(regra)
      ? window.IeoRecorrente?.getMetodologiaIeoPorCompetencia?.(lancamento)
      : null;
    const camposIeo = isIeoRule(regra)
      ? window.IeoRecorrente?.getCamposEntrada?.(lancamento) || regra.camposEntrada || []
      : null;
    const regraCompetencia = camposIeo ? { ...regra, camposEntrada: camposIeo } : regra;
    const values = getEntryValuesFromLaunch(lancamento, regraCompetencia);
    document.getElementById("realizadoWrapper").hidden = hasSpecificInputRule(regra);
    if (isIeoRule(regra)) {
      const metodologiaCa = metodologiaIeo?.codigo === "ca_agosto_2026";
      const mainFields = camposIeo.filter((field) => field.nome !== "ieoApuradoInformado");
      const directChecked = values.ieoApuradoInformado !== "" && values.ieoApuradoInformado !== null && values.ieoApuradoInformado !== undefined;
      const admin = canAdjustOfficialPerformance();
      document.getElementById("dynamicInputFields").innerHTML = `
        ${metodologiaCa ? `
          <p class="notice full-span"><strong>Metodologia vigente a partir de agosto/2026</strong> — aprovada pelo Conselho de Administração.</p>
        ` : ""}
        ${mainFields.map((field) => renderEntryInput(field, values[field.nome] ?? "")).join("")}
        ${!metodologiaCa ? `
          <label class="full-span">
            <input id="ieoDirectToggle" class="dynamic-entry-toggle" type="checkbox" ${directChecked ? "checked" : ""}>
            Informar IEO apurado diretamente pela unidade?
          </label>
          <div id="ieoDirectFieldWrapper" class="full-span" ${directChecked ? "" : "hidden"}>
            <p class="notice">Use este campo somente para compatibilidade e conferência da metodologia histórica.</p>
            ${renderEntryInput(
              { nome: "ieoApuradoInformado", rotulo: "IEO apurado pela unidade", tipo: "percentual", obrigatorio: false },
              values.ieoApuradoInformado ?? "",
              directChecked ? "" : "disabled"
            )}
          </div>
        ` : ""}
        ${admin && !metodologiaCa ? `
          <div class="full-span">
            <p class="eyebrow">Ajuste de desempenho oficial</p>
            <p class="notice">Use apenas para reproduzir desempenho oficial já informado ao Conselho de Administração.</p>
            ${renderEntryInput(
              { nome: "percentualAtingidoOficialInformado", rotulo: "% atingido oficial informado", tipo: "percentual", obrigatorio: false },
              values.percentualAtingidoOficialInformado ?? ""
            )}
            <label>Observação do ajuste oficial
              <textarea class="dynamic-entry-field" data-entry-field="observacaoAjusteOficial" data-entry-type="texto" rows="3">${escapeHtml((lancamento.camposEntrada || {}).observacaoAjusteOficial || "")}</textarea>
            </label>
          </div>
        ` : ""}
      `;
      updateIeoOptionalVisibility();
      return;
    }
    if (isRgfElementsRule(regra)) {
      document.getElementById("dynamicInputFields").innerHTML = renderRgfElementsFields(lancamento, regra);
      return;
    }
    const visibleFields = window.DocumentationFields
      ? DocumentationFields.visibleInputFields(regra)
      : (regra.camposEntrada || []);
    document.getElementById("dynamicInputFields").innerHTML = visibleFields.map((field) => `
      ${renderEntryInput(field, values[field.nome] ?? "")}
    `).join("");
    updateCapacitacaoPositionFields(regra, lancamento);
    updateAprimoramentoPositionFields(regra, lancamento);
    updateNpsPositionFields(regra, lancamento);
    updateSocioambientalInitiativeFields(regra);
    updateEcossistemaCurveFields(regra, lancamento);
    updateRedeLotericaCurveFields(regra, lancamento);
  }

  function updateCapacitacaoPositionFields(regra, lancamento) {
    if (regra?.tipoCalculo !== "cobertura_capacitacao") return;
    const typeInput = document.querySelector('[data-entry-field="tipoPosicaoCapacitacao"]');
    const type = typeInput?.value || "";
    const isTracking = type === "acompanhamento";
    const isQuantitative = type === "apuracao_quantitativa";
    const modeInput = document.querySelector('[data-entry-field="modoResultadoCapacitacao"]');
    const resultMode = modeInput?.value || "calculado";
    const isOfficial = isQuantitative && resultMode === "oficial_informado";
    const visibleFields = new Set([
      "tipoPosicaoCapacitacao",
      ...(isTracking ? ["acoesAcompanhamentoCapacitacao"] : []),
      ...(isQuantitative ? [
        "modoResultadoCapacitacao",
        ...(isOfficial
          ? ["resultadoOficialInformadoCapacitacao", "percentualAtingidoOficialCapacitacao"]
          : ["publicoAlvoElegivelCapacitacao", "empregadosCapacitadosCapacitacao"]),
        "quantidadeCursosMinimaCapacitacao",
        "cursosConsideradosCapacitacao"
      ] : []),
      ...((isTracking || isQuantitative)
        ? ["dataBaseApuracaoCapacitacao", "fonteEvidenciaCapacitacao", "observacaoArea"]
        : [])
    ]);
    document.querySelectorAll("[data-entry-wrapper]").forEach((wrapper) => {
      const fieldName = wrapper.dataset.entryWrapper;
      const visible = visibleFields.has(fieldName);
      wrapper.hidden = !visible;
      const input = wrapper.querySelector(".dynamic-entry-field");
      if (input) input.disabled = !visible || !isEditable(lancamento);
    });

    const quantityInput = document.querySelector('[data-entry-field="quantidadeCursosMinimaCapacitacao"]');
    const trimestre = lancamento?.trimestre || `${Math.ceil(Number(lancamento?.mes) / 3)}TRI/${lancamento?.ano || 2026}`;
    const criterion = regra.parametrosCalculo?.curvaTrimestralCursos?.[trimestre] || {};
    if (quantityInput) {
      quantityInput.value = criterion.quantidadeCursosMinima ?? "";
      quantityInput.readOnly = true;
    }
  }

  function updateAprimoramentoPositionFields(regra, lancamento) {
    if (regra?.tipoCalculo !== "melhorias_acumuladas") return;
    const type = document.querySelector('[data-entry-field="tipoPosicaoAprimoramento"]')?.value || "";
    const quantitative = type === "fechamento_quantitativo";
    const incrementWrapper = document.querySelector('[data-entry-wrapper="melhoriasImplementadasMes"]');
    const positionWrapper = document.querySelector('[data-entry-wrapper="melhoriasImplementadasAcumuladas"]');
    if (incrementWrapper) {
      incrementWrapper.hidden = !quantitative;
      const input = incrementWrapper.querySelector(".dynamic-entry-field");
      if (input) input.disabled = !quantitative || !isEditable(lancamento);
    }
    if (positionWrapper) {
      positionWrapper.hidden = !quantitative;
      const input = positionWrapper.querySelector(".dynamic-entry-field");
      if (input) {
        input.readOnly = true;
        input.disabled = true;
      }
    }
  }

  function updateNpsPositionFields(regra, lancamento) {
    if (regra?.tipoCalculo !== "nota_pesquisa_nps") return;
    const type = String(document.querySelector('[data-entry-field="tipoPosicaoNPS"]')?.value || "");
    const tracking = type.startsWith("Acompanhamento") || type === "Revisão metodológica";
    const visibleFields = new Set([
      "tipoPosicaoNPS",
      "metaReferenciaCompetenciaNPS",
      ...(!tracking ? ["percentualPromotores", "percentualDetratores", "npsApurado", "dataBasePesquisaNPS"] : [])
    ]);
    document.querySelectorAll("[data-entry-wrapper]").forEach((wrapper) => {
      const fieldName = wrapper.dataset.entryWrapper;
      const visible = visibleFields.has(fieldName);
      wrapper.hidden = !visible;
      const input = wrapper.querySelector(".dynamic-entry-field");
      if (input) input.disabled = !visible || !isEditable(lancamento);
    });
  }

  function updateSocioambientalInitiativeFields(regra) {
    if (regra?.tipoCalculo !== "iniciativas_apoiadas") return;
    const statusField = regra.parametrosCalculo?.campoStatus || "statusIniciativaSocioambiental";
    const nameField = regra.parametrosCalculo?.campoNome || "nomeIniciativaSocioambiental";
    const dateField = regra.parametrosCalculo?.campoDataApoio || "dataApoioIniciativa";
    const allowDocumentedPeriod = regra.parametrosCalculo?.permitirPeriodoNaDescricaoSemDataPontual === true;
    const completedStatus = regra.parametrosCalculo?.statusQueConta || "Apoiada/realizada";
    const completed = document.querySelector(`[data-entry-field="${statusField}"]`)?.value === completedStatus;
    [nameField, dateField].forEach((fieldName) => {
      const input = document.querySelector(`[data-entry-field="${fieldName}"]`);
      if (input) input.required = completed && !(fieldName === dateField && allowDocumentedPeriod);
    });
    if (!completed) clearSocioambientalValidation(regra);
  }

  function socioambientalRequiredFieldState(regra, values = {}) {
    if (regra?.tipoCalculo !== "iniciativas_apoiadas") {
      return { applies: false, missing: [], message: "" };
    }
    const statusField = regra.parametrosCalculo?.campoStatus || "statusIniciativaSocioambiental";
    const nameField = regra.parametrosCalculo?.campoNome || "nomeIniciativaSocioambiental";
    const dateField = regra.parametrosCalculo?.campoDataApoio || "dataApoioIniciativa";
    const descriptionField = regra.parametrosCalculo?.campoDescricao || "descricaoAndamentoSocioambiental";
    const completedStatus = regra.parametrosCalculo?.statusQueConta || "Apoiada/realizada";
    if (values[statusField] !== completedStatus) {
      return { applies: false, missing: [], message: "" };
    }

    const periodDocumentedWithoutPointDate = regra.parametrosCalculo?.permitirPeriodoNaDescricaoSemDataPontual === true
      && String(values[descriptionField] || "").trim();
    const requiredFields = periodDocumentedWithoutPointDate ? [nameField] : [nameField, dateField];
    const missing = requiredFields.filter((fieldName) => !String(values[fieldName] || "").trim());
    let message = "";
    if (missing.length === 2) {
      message = "Para registrar uma iniciativa como Apoiada/realizada, preencha:\n• Nome da iniciativa\n• Data de apoio/realização";
    } else if (missing[0] === nameField) {
      message = "Informe o nome da iniciativa apoiada/realizada.";
    } else if (missing[0] === dateField) {
      message = "Informe a data de apoio/realização da iniciativa.";
    }
    return { applies: true, missing, message };
  }

  function setSocioambientalFieldValidation(fieldName, invalid) {
    const input = document.querySelector(`[data-entry-field="${fieldName}"]`);
    const wrapper = document.querySelector(`[data-entry-wrapper="${fieldName}"]`);
    if (!input || !wrapper) return;
    const messageId = `entryValidation-${fieldName}`;
    let message = wrapper.querySelector(`[data-entry-validation="${fieldName}"]`);
    input.classList.toggle("is-validation-invalid", invalid);
    wrapper.classList.toggle("has-validation-error", invalid);
    if (invalid) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", messageId);
      if (!message) {
        message = document.createElement("small");
        message.id = messageId;
        message.className = "entry-validation-message";
        message.dataset.entryValidation = fieldName;
        message.textContent = "Campo obrigatório para iniciativa apoiada/realizada.";
        wrapper.appendChild(message);
      }
      return;
    }
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    message?.remove();
  }

  function clearSocioambientalValidation(regra = null) {
    const fields = regra?.tipoCalculo === "iniciativas_apoiadas"
      ? [
        regra.parametrosCalculo?.campoNome || "nomeIniciativaSocioambiental",
        regra.parametrosCalculo?.campoDataApoio || "dataApoioIniciativa"
      ]
      : ["nomeIniciativaSocioambiental", "dataApoioIniciativa"];
    fields.forEach((fieldName) => setSocioambientalFieldValidation(fieldName, false));
    window.ActionFeedback?.clear("launchValidationFeedback");
    socioambientalValidationActive = false;
  }

  function validateSocioambientalRequiredFields(regra, options = {}) {
    if (regra?.tipoCalculo !== "iniciativas_apoiadas") return true;
    const values = collectEntryValues();
    const validation = socioambientalRequiredFieldState(regra, values);
    const nameField = regra.parametrosCalculo?.campoNome || "nomeIniciativaSocioambiental";
    const dateField = regra.parametrosCalculo?.campoDataApoio || "dataApoioIniciativa";
    [nameField, dateField].forEach((fieldName) => {
      setSocioambientalFieldValidation(fieldName, validation.missing.includes(fieldName));
    });
    if (!validation.applies || !validation.missing.length) {
      window.ActionFeedback?.clear("launchValidationFeedback");
      socioambientalValidationActive = false;
      return true;
    }

    socioambientalValidationActive = true;
    window.ActionFeedback?.show("launchValidationFeedback", validation.message, "error");
    if (options.focus) {
      const firstInvalid = document.querySelector(`[data-entry-field="${validation.missing[0]}"]`);
      firstInvalid?.focus({ preventScroll: true });
      firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return false;
  }

  function updateEcossistemaCurveFields(regra, lancamento) {
    if (regra?.tipoCalculo !== "participacao_ecossistema_com_cenarios") return;
    const scenarioInput = document.querySelector('[data-entry-field="cenarioApuracaoEcossistema"]');
    const referenceInput = document.querySelector('[data-entry-field="referencia2025Trimestre"]');
    const targetInput = document.querySelector('[data-entry-field="metaTrimestral2026"]');
    const curve = getEcossistemaCurveForLaunch(regra, lancamento, scenarioInput?.value);
    if (referenceInput) referenceInput.value = curve?.referencia2025 ?? "";
    if (targetInput) targetInput.value = curve?.meta2026 ?? "";
    const metaInput = document.getElementById("launchMeta");
    if (metaInput && curve) metaInput.value = Calculations.formatarValor(curve.meta2026 / 100, regra.unidadeMedida);
  }

  function updateRedeLotericaCurveFields(regra, lancamento) {
    if (regra?.tipoCalculo !== "incremento_rede_loterica_base_2025") return;
    const targetInput = document.querySelector('[data-entry-field="metaTrimestral"]');
    const curve = getRedeLotericaCurveForLaunch(regra, lancamento);
    if (targetInput) targetInput.value = curve?.metaIncremento ?? "";
    const metaInput = document.getElementById("launchMeta");
    if (metaInput && curve) metaInput.value = Calculations.formatarValor(curve.metaIncremento / 100, regra.unidadeMedida);
  }

  function updateIeoOptionalVisibility() {
    const toggle = document.getElementById("ieoDirectToggle");
    const wrapper = document.getElementById("ieoDirectFieldWrapper");
    if (!toggle || !wrapper) return;
    const input = wrapper.querySelector("[data-entry-field='ieoApuradoInformado']");
    wrapper.hidden = !toggle.checked;
    if (input) {
      input.disabled = !toggle.checked;
      if (!toggle.checked) input.value = "";
    }
  }

  function quarterLabel(lancamento) {
    const informed = String(lancamento?.trimestre || "").match(/([1-4])\s*TRI/i);
    if (informed) return `${informed[1]}TRI`;
    const month = Number(lancamento?.mes);
    return Number.isInteger(month) && month >= 1 && month <= 12 ? `${Math.ceil(month / 3)}TRI` : "trimestre";
  }

  function quarterlyMetaDetail(resultado, regra, lancamento) {
    if (resultado?.metaTrimestral === undefined) return null;
    if (regra?.tipoCalculo === "investimento_socioambiental") return null;
    if (regra?.tipoCalculo === "marco_projeto_percentual") return null;
    const value = resultado.metaTrimestral;
    if (regra?.tipoCalculo === "execucao_acoes_propostas") {
      return ["Meta trimestral", Calculations.formatarPercentual(resultado.metaPercentualTrimestral)];
    }
    if (regra?.tipoCalculo === "plano_acao_por_elementos") {
      const formatted = Calculations.formatarValor(value, "quantidade");
      const suffix = Number(value) === 1 ? "elemento acumulado" : "elementos acumulados";
      return [`Meta do ${quarterLabel(lancamento)}`, `${formatted} ${suffix}`];
    }

    const unit = resultado.metaTrimestralUnidadeMedida || resultado.unidadeMedida || regra?.unidadeMedida || "numero";
    const label = regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
      ? "Meta trimestral de incremento"
      : "Meta trimestral";
    const formatted = unit === "percentual"
      ? Calculations.formatarPercentual(value)
      : Calculations.formatarValor(value, unit);
    return [label, formatted];
  }

  function renderFormulaDetails(resultado, regra, lancamento) {
    const wrapper = document.getElementById("formulaDetailsWrapper");
    const target = document.getElementById("formulaDetails");
    const details = [];
    const metodologiaCa = isIeoCaCompetence(regra, lancamento);

    if (regra?.tipoCalculo === "razao_canais_digitais") {
      indicator08CalculatedDetails(resultado).forEach((detail) => details.push(detail));
    }

    if (regra?.tipoCalculo === "marco_projeto_percentual") {
      const memoria = lancamento?.camposEntrada || {};
      const fechamentoTrimestral = memoria.tipoPosicaoTIC === "fechamento_trimestral";
      const tipoPosicao = fechamentoTrimestral
        ? "Fechamento trimestral"
        : "Acompanhamento do trimestre";
      details.push(["Tipo de posição", tipoPosicao]);
      if (memoria.metaReferenciaTrimestre !== null && memoria.metaReferenciaTrimestre !== undefined) {
        details.push(["Meta do fechamento trimestral", Calculations.formatarPercentual(memoria.metaReferenciaTrimestre)]);
      }
      if (!fechamentoTrimestral) details.push(["Avaliação oficial", "Posição oficial somente no fechamento"]);
      if (memoria.fonteAcompanhamentoTIC) details.push(["Fonte de acompanhamento", memoria.fonteAcompanhamentoTIC]);
      if (memoria.fonteFechamentoTIC) details.push(["Fonte do fechamento", memoria.fonteFechamentoTIC]);
      if (memoria.metaPlanilhaTIC !== null && memoria.metaPlanilhaTIC !== undefined) {
        details.push(["Memória da planilha — meta", Calculations.formatarPercentual(memoria.metaPlanilhaTIC)]);
      }
      if (memoria.realizadoPlanilhaTIC !== null && memoria.realizadoPlanilhaTIC !== undefined) {
        details.push(["Memória da planilha — realizado", Calculations.formatarPercentual(memoria.realizadoPlanilhaTIC)]);
      }
      if (memoria.atingimentoPlanilhaTIC !== null && memoria.atingimentoPlanilhaTIC !== undefined) {
        details.push(["Memória da planilha — atingimento", Calculations.formatarPercentual(memoria.atingimentoPlanilhaTIC)]);
      }
      if (memoria.descricaoPlanilhaTIC) details.push(["Referência da planilha / memória de acompanhamento", memoria.descricaoPlanilhaTIC]);
    }

    if (regra?.tipoCalculo === "melhorias_acumuladas") {
      const memoria = lancamento?.camposEntrada || {};
      const fechamento = IndicatorFormulas.resolverTipoPosicaoAprimoramento(lancamento) === "fechamento_quantitativo";
      details.push(["Tipo de posição", fechamento ? "Fechamento trimestral" : "Acompanhamento do trimestre"]);
      if (!fechamento) details.push(["Avaliação oficial", "Posição oficial somente em MAR, JUN, SET e DEZ"]);
      if (memoria.fonteFechamentoAprimoramento) details.push(["Fonte do fechamento", memoria.fonteFechamentoAprimoramento]);
      if (memoria.fontePlanilhaAprimoramento) details.push(["Fonte da memória mensal", memoria.fontePlanilhaAprimoramento]);
      if (memoria.metaPlanilhaAprimoramento !== null && memoria.metaPlanilhaAprimoramento !== undefined) {
        details.push(["Memória da planilha — meta", Calculations.formatarPercentual(memoria.metaPlanilhaAprimoramento)]);
      }
      if (memoria.realizadoPlanilhaAprimoramento !== null && memoria.realizadoPlanilhaAprimoramento !== undefined) {
        details.push(["Memória da planilha — realizado", Calculations.formatarPercentual(memoria.realizadoPlanilhaAprimoramento)]);
      }
      if (memoria.atingimentoPlanilhaAprimoramento !== null && memoria.atingimentoPlanilhaAprimoramento !== undefined) {
        details.push(["Memória da planilha — atingimento", Calculations.formatarPercentual(memoria.atingimentoPlanilhaAprimoramento)]);
      }
      if (memoria.descricaoPlanilhaAprimoramento) details.push(["Referência da planilha / memória documental", memoria.descricaoPlanilhaAprimoramento]);
    }

    if (regra?.tipoCalculo === "ggr_formula") {
      const memoria = lancamento?.camposEntrada || {};
      const fechamento = resultado.tipoPosicaoGGR === "fechamento_trimestral";
      details.push(["Tipo da posição", fechamento ? "Fechamento trimestral" : "Acompanhamento"]);
      if (resultado.ggrAcumuladoDocumental) {
        details.push(["Natureza do realizado", "Posição acumulada documental; não somar com competências anteriores"]);
      }
      if (memoria.fonteResultadoGGR) details.push(["Fonte do resultado", memoria.fonteResultadoGGR]);
      if (memoria.metaPlanilhaGGR !== null && memoria.metaPlanilhaGGR !== undefined) {
        details.push(["Memória da planilha — meta", Calculations.formatarValor(memoria.metaPlanilhaGGR, "moeda")]);
      }
      if (memoria.atingimentoPlanilhaGGR !== null && memoria.atingimentoPlanilhaGGR !== undefined) {
        details.push(["Memória da planilha — atingimento", Calculations.formatarPercentual(memoria.atingimentoPlanilhaGGR)]);
      }
      if (memoria.metaOficialFechamentoGGR !== null && memoria.metaOficialFechamentoGGR !== undefined) {
        details.push(["Meta oficial do fechamento", Calculations.formatarValor(memoria.metaOficialFechamentoGGR, "moeda")]);
      }
      if (memoria.atingimentoOficialGGR !== null && memoria.atingimentoOficialGGR !== undefined) {
        details.push(["Atingimento oficial do fechamento", Calculations.formatarPercentual(memoria.atingimentoOficialGGR)]);
      }
      if (memoria.fonteOficialGGR) details.push(["Fonte oficial do fechamento", memoria.fonteOficialGGR]);
    }

    if (resultado.modoResultadoCapacitacao === "oficial_informado") {
      details.push(["Modo do resultado", "Resultado oficial informado"]);
      details.push(["Resultado oficial", Calculations.formatarPercentual(resultado.resultadoOficialInformadoCapacitacao)]);
      details.push(["Atingimento oficial", Calculations.formatarPercentual(resultado.percentualAtingidoOficialCapacitacao)]);
      if (resultado.quantidadeCursosMinimaCapacitacao !== null && resultado.quantidadeCursosMinimaCapacitacao !== undefined) {
        details.push(["Critério trimestral", `${Calculations.formatarValor(resultado.quantidadeCursosMinimaCapacitacao, "quantidade")} cursos acumulados`]);
      }
      (resultado.componentesResultadoCapacitacao || []).forEach((componente) => {
        const curso = String(componente?.curso || "Componente");
        const capacitados = toNumberOrNull(componente?.empregadosCapacitados);
        const elegiveis = toNumberOrNull(componente?.publicoAlvoElegivel);
        const valor = capacitados !== null && elegiveis !== null
          ? `${Calculations.formatarValor(capacitados, "quantidade")} de ${Calculations.formatarValor(elegiveis, "quantidade")} empregados elegíveis`
          : "Componente documental sem memória de cálculo agregada";
        details.push([`Componente — ${curso}`, valor]);
      });
    }

    if (resultado.descricaoMetodologiaIeo !== undefined) {
      details.push(["Metodologia vigente", resultado.descricaoMetodologiaIeo]);
    }
    if (resultado.formulaVigenteIeo !== undefined) {
      details.push(["Fórmula vigente", resultado.formulaVigenteIeo]);
    }
    if (resultado.numeradorIeo !== undefined) {
      details.push(["Numerador do IEO", Calculations.formatarValor(resultado.numeradorIeo, "moeda")]);
    }
    if (resultado.denominadorIeo !== undefined) {
      details.push(["Denominador do IEO", Calculations.formatarValor(resultado.denominadorIeo, "moeda")]);
    }
    if (resultado.origemNps === "componentes_formula") {
      details.push(["Percentual de promotores", Calculations.formatarPercentual(resultado.percentualPromotores)]);
      details.push(["Percentual de detratores", Calculations.formatarPercentual(resultado.percentualDetratores)]);
      details.push(["Fórmula do NPS", "Percentual de promotores − percentual de detratores"]);
      details.push(["NPS calculado", Calculations.formatarValor(resultado.npsCalculado, "pontos")]);
    }

    if (resultado.cenarioApuracaoEcossistemaLabel !== undefined) {
      details.push(["Cenário de apuração", resultado.cenarioApuracaoEcossistemaLabel]);
    }
    if (resultado.referencia2025Trimestre !== undefined) {
      details.push(["Referência 2025 do trimestre", Calculations.formatarPercentual(resultado.referencia2025Trimestre)]);
    }
    if (resultado.metaTrimestral2026 !== undefined) {
      details.push(["Meta trimestral 2026", Calculations.formatarPercentual(resultado.metaTrimestral2026)]);
    }
    if (resultado.arrecadacaoViaEcossistema !== undefined) {
      details.push(["Arrecadação via ecossistema", Calculations.formatarValor(resultado.arrecadacaoViaEcossistema, "moeda")]);
    }
    if (resultado.arrecadacaoTotal !== undefined) {
      details.push(["Arrecadação total", Calculations.formatarValor(resultado.arrecadacaoTotal, "moeda")]);
    }
    if (resultado.arrecadacaoRedeLoterica2025 !== undefined) {
      details.push(["Arrecadação Rede Lotérica 2025", Calculations.formatarValor(resultado.arrecadacaoRedeLoterica2025, "moeda")]);
    }
    if (resultado.arrecadacaoRedeLoterica2026 !== undefined) {
      details.push(["Arrecadação Rede Lotérica 2026", Calculations.formatarValor(resultado.arrecadacaoRedeLoterica2026, "moeda")]);
    }
    if (resultado.indiceRedeLoterica !== undefined) {
      details.push(["Índice 2026/2025", Calculations.formatarPercentual(resultado.indiceRedeLoterica)]);
    }
    if (resultado.incrementoRedeLoterica !== undefined) {
      details.push(["Incremento percentual", Calculations.formatarPercentual(resultado.incrementoRedeLoterica)]);
    }
    if (regra?.tipoCalculo === "investimento_socioambiental") {
      details.push(["Lucro líquido de referência", Calculations.formatarValor(resultado.lucroLiquidoReferencia, "moeda")]);
      details.push(["Meta percentual", Calculations.formatarPercentual(resultado.metaPercentual, 2, 2)]);
      details.push(["Meta financeira", Calculations.formatarValor(resultado.metaFinanceira, "moeda")]);
      details.push(["Resultado percentual oficial", Calculations.formatarPercentual(resultado.resultadoPercentualOficial, 5, 5)]);
      details.push(["Realizado financeiro", Calculations.formatarValor(resultado.realizadoFinanceiro, "moeda")]);
      details.push(["% da meta atingida", Calculations.formatarPercentual(resultado.percentualAtingimento, 2, 2)]);
      details.push(["Situação", resultado.situacao || "-"]);
    }
    const quarterlyMeta = quarterlyMetaDetail(resultado, regra, lancamento);
    if (quarterlyMeta) details.push(quarterlyMeta);
    if (regra?.tipoCalculo === "execucao_acoes_propostas") {
      const metaQuantidade = resultado.metaAcoesRealizadasAcumuladas;
      const realizadas = resultado.acoesRealizadasAcumuladas;
      const total = resultado.totalAcoesPropostasVisibilidade;
      details.push(["Meta em quantidade", `${Calculations.formatarValor(metaQuantidade, "quantidade")} ${Number(metaQuantidade) === 1 ? "ação" : "ações"}`]);
      details.push(["Ações realizadas acumuladas", `${Calculations.formatarValor(realizadas, "quantidade")} ${Number(realizadas) === 1 ? "ação" : "ações"}`]);
      details.push(["Total de ações propostas", Calculations.formatarValor(total, "quantidade")]);
      details.push(["Execução anual", Calculations.formatarPercentual(resultado.resultadoPercentualVisibilidade)]);
      details.push(["% da meta atingida", Calculations.formatarPercentual(resultado.percentualAtingidoMensal)]);
      details.push(["Situação", resultado.situacao || "-"]);
    }
    if (resultado.baseReferencia2025Periodo !== undefined) {
      details.push(["Base 2025 equivalente", Calculations.formatarValor(resultado.baseReferencia2025Periodo, "moeda")]);
    } else if (resultado.resultadoReferencia2025 !== undefined) {
      details.push(["Resultado referência 2025", Calculations.formatarPercentual(resultado.resultadoReferencia2025)]);
    }
    if (resultado.realizado2026Periodo !== undefined) {
      details.push(["Arrecadação 2026 no período", Calculations.formatarValor(resultado.realizado2026Periodo, "moeda")]);
    }
    if (resultado.metaCalculada2026 !== undefined) {
      details.push(["Meta calculada 2026", Calculations.formatarValor(resultado.metaCalculada2026, resultado.metaCalculadaUnidadeMedida || "percentual")]);
    }
    if (resultado.indiceEmRelacaoA2025 !== undefined) {
      details.push(["Índice 2026/2025", Calculations.formatarPercentual(resultado.indiceEmRelacaoA2025)]);
    }
    if (resultado.crescimentoVs2025 !== undefined) {
      details.push(["Crescimento em relação a 2025", Calculations.formatarPercentual(resultado.crescimentoVs2025)]);
    }

    if (resultado.totalMelhoriasPlano2026 !== undefined) {
      details.push(["Base de melhorias mapeadas", Calculations.formatarInteiroBR(resultado.totalMelhoriasPlano2026)]);
    }
    if (resultado.melhoriasImplementadasAcumuladasAnterior !== undefined) {
      details.push(["Posição acumulada anterior", Calculations.formatarInteiroBR(resultado.melhoriasImplementadasAcumuladasAnterior)]);
    }
    if (resultado.novasMelhoriasPeriodo !== undefined && resultado.novasMelhoriasPeriodo !== null) {
      details.push(["Novas melhorias no período", Calculations.formatarInteiroBR(resultado.novasMelhoriasPeriodo)]);
    }
    if (resultado.metaMinimaMelhoriasAno !== undefined) {
      details.push(["Meta anual de melhorias", resultado.metaMinimaMelhoriasAno]);
    }
    if (resultado.melhoriasEntreguesAcumuladas !== undefined) {
      details.push(["Posição acumulada oficial", Calculations.formatarInteiroBR(resultado.melhoriasEntreguesAcumuladas)]);
    }
    if (resultado.metaQuantidadeTrimestral !== undefined && resultado.metaQuantidadeTrimestral !== null) {
      details.push(["Quantidade-meta acumulada", Calculations.formatarInteiroBR(resultado.metaQuantidadeTrimestral)]);
    }
    if (resultado.percentualMetaAnualAtingida !== undefined) {
      details.push(["% da meta anual atingida", Calculations.formatarPercentual(resultado.percentualMetaAnualAtingida)]);
    }
    if (resultado.metaReferenciaMensal !== undefined) {
      details.push([
        metodologiaCa ? "Meta de referência" : regra?.tipoCalculo === "lucro_recorrente_mensal" ? "Meta da competência" : "Meta mensal de referência",
        Calculations.formatarValor(resultado.metaReferenciaMensal, resultado.unidadeMedida)
      ]);
    }
    if (resultado.percentualMetaMensal !== undefined) {
      details.push([metodologiaCa ? "% da meta" : "% da meta mensal", Calculations.formatarPercentual(resultado.percentualMetaMensal)]);
    }
    if (resultado.metaAcumulada !== undefined && !metodologiaCa) {
      details.push([
        regra?.tipoCalculo === "lucro_recorrente_mensal" ? "Meta acumulada até a competência" : "Meta acumulada",
        Calculations.formatarValor(resultado.metaAcumulada, resultado.unidadeMedida)
      ]);
    }
    if (resultado.realizadoAcumulado !== undefined) {
      details.push([
        regra?.tipoCalculo === "lucro_recorrente_mensal" ? "Resultado acumulado até a competência" : "Realizado acumulado",
        Calculations.formatarValor(resultado.realizadoAcumulado, resultado.unidadeMedida)
      ]);
    }
    if (resultado.percentualMetaAcumulada !== undefined && !metodologiaCa) {
      details.push(["% atingido acumulado", Calculations.formatarPercentual(resultado.percentualMetaAcumulada)]);
    }
    if (resultado.percentualMetaAnual !== undefined) {
      details.push(["Avanço sobre a meta anual", Calculations.formatarPercentual(resultado.percentualMetaAnual)]);
    }
    if (resultado.pixAcumulado !== undefined) {
      details.push(["Arrecadação PIX acumulada", Calculations.formatarValor(resultado.pixAcumulado, "moeda")]);
    }
    if (resultado.canaisEletronicosAcumulado !== undefined) {
      details.push(["Arrecadação total dos canais eletrônicos", Calculations.formatarValor(resultado.canaisEletronicosAcumulado, "moeda")]);
    }
    if (resultado.produtosLoteriasAcumulado !== undefined) {
      details.push(["Arrecadação total dos produtos de loterias", Calculations.formatarValor(resultado.produtosLoteriasAcumulado, "moeda")]);
    }
    if (resultado.resultadoCalculado !== undefined) {
      details.push(["Resultado percentual calculado", Calculations.formatarPercentual(resultado.resultadoCalculado)]);
    }
    if (resultado.detalhesMetaMensal) {
      details.push(["Detalhes da Meta Mensal", resultado.detalhesMetaMensal]);
    }

    wrapper.hidden = !details.length;
    target.innerHTML = details.map(([label, value]) => `
      <article class="detail-item">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
  }

  function indicator08CalculatedDetails(resultado) {
    const accumulatedResult = toNumberOrNull(
      resultado?.resultadoAcumulado ?? resultado?.resultadoOficialAnual ?? resultado?.resultadoCalculadoAcumulado
    );
    const target = toNumberOrNull(resultado?.metaReferencia);
    const technicalPerformance = toNumberOrNull(
      resultado?.percentualAtingidoAnual ?? resultado?.percentualAtingidoAcumulado
    ) ?? (accumulatedResult !== null && target !== null && target > 0 ? accumulatedResult / target : null);
    const documentedResult = toNumberOrNull(resultado?.resultadoAcumuladoDocumental);
    const documentedPerformance = toNumberOrNull(resultado?.percentualAtingidoOficialDocumental);
    return [
      ["Atingimento técnico", Calculations.formatarPercentual(technicalPerformance, 2, 2)],
      ["Resultado acumulado documental", documentedResult === null ? "-" : Calculations.formatarPercentual(documentedResult, 2, 2)],
      ["Atingimento oficial documental", documentedPerformance === null ? "-" : Calculations.formatarPercentual(documentedPerformance, 2, 2)]
    ];
  }

  function renderEditor() {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    const regra = indicador && getRule(indicador);
    const panel = document.getElementById("launchEditorPanel");
    if (!lancamento || !indicador || !regra) {
      panel.hidden = true;
      return;
    }

    clearSocioambientalValidation();
    panel.hidden = false;
    document.getElementById("launchEditorTitle").textContent = `${indicador.indicador} - ${launchMonthName(lancamento)}/${lancamento.ano}`;
    document.getElementById("launchStatusBadge").textContent = lancamento.status;
    document.getElementById("launchStatusBadge").className = `badge ${badgeClass(lancamento.status)}`;
    renderReference(indicador, lancamento, regra);
    renderDynamicFields(lancamento, regra);

    document.getElementById("launchId").value = lancamento.id;
    document.getElementById("launchMetaLabel").textContent = getMetaLabel(regra);
    document.getElementById("launchMeta").value = formatDisplayMeta(regra, lancamento);
    document.getElementById("launchRealizado").value = lancamento.realizadoMensal ?? "";
    document.getElementById("launchPercentualManual").value = lancamento.percentualManual ?? lancamento.percentualAtingido ?? "";
    const documentation = window.DocumentationFields
      ? DocumentationFields.resolve(regra, lancamento)
      : {
        observation: lancamento.observacaoArea || "",
        reference: lancamento.referenciaEvidencia || lancamento.linkEvidencia || ""
      };
    document.getElementById("launchObservacaoArea").value = documentation.observation;
    document.getElementById("launchEvidenceReference").value = documentation.reference;
    document.getElementById("launchMetrica").value = isIeoRule(regra)
      ? window.IeoRecorrente?.getMetodologiaIeoPorCompetencia?.(lancamento)?.formula || indicador.metrica || ""
      : indicador.metrica || "";
    document.getElementById("manualPercentWrapper").hidden = !isManual(indicador);
    document.getElementById("evidenceRequirementText").textContent = regra.exigeEvidencia
      ? "Arquivo obrigatório para envio"
      : "Opcional";
    const legacyJustification = document.getElementById("legacyLaunchJustification");
    const legacyText = String(lancamento.justificativa || "").trim();
    legacyJustification.hidden = !legacyText;
    document.getElementById("legacyLaunchJustificationText").textContent = legacyText;
    renderEvidenceList(lancamento);
    renderPendingEvidenceStatus();
    loadEvidenceList(lancamento.id).catch((error) => showMessage(error.message, "warning"));

    updateCalculatedPreview();
    const disabled = !isEditable(lancamento);
    setFormDisabled(disabled);
    enforceRuleFieldState(indicador, regra, disabled);
    document.getElementById("sendApprovalButton").textContent =
      lancamento.status === "Devolvido para ajuste" ? "Reenviar para homologação" : "Enviar para homologação";
    const requestButton = document.getElementById("requestReopenButton");
    requestButton.hidden = true;
    requestButton.disabled = true;

    if (!isEditable(lancamento)) {
      const mutationPolicy = launchMutationPolicy(lancamento);
      showMessage(mutationPolicy.mensagem || `Lançamento com status "${lancamento.status}" está bloqueado para edição.`, "warning");
    } else if (lancamento.revisaoMoedaPendente) {
      showMessage("Este lançamento possui valor monetário antigo possivelmente reduzido. Confira e informe novamente os valores completos antes de salvar.", "warning");
    }
  }

  function collectEntryValues() {
    const values = {};
    document.querySelectorAll(".dynamic-entry-field").forEach((input) => {
      if (input.disabled) return;
      const type = input.dataset.entryType || "numero";
      values[input.dataset.entryField] = parseEntryValue(type, input.value);
    });
    const selectedLaunch = getSelectedLaunch();
    const selectedIndicator = selectedLaunch && getIndicatorMap()[selectedLaunch.indicadorId];
    if (selectedIndicator && isRgfElementsRule(getRule(selectedIndicator))) {
      values.elementosRGFAtendidos = collectRgfRows();
    }
    return values;
  }

  function parseEntryValue(type, value) {
    if (value === "") return "";
    if (type === "numero") return toNumberOrNull(value);
    if (type === "inteiro") return Calculations.parseInteiroBR(value);
    if (type === "moeda") return CurrencyBR.parseMoedaBR(value);
    if (type === "percentual") return normalizarPercentual(value);
    return String(value).trim();
  }

  function updateCapacidadeTicPercentual(marcoSelecionado) {
    const lancamento = getSelectedLaunch();
    if (!lancamento) return;
    const indicador = state.indicadores.find((item) => item.id === lancamento.indicadorId);
    const regra = getRule(indicador);
    const marcos = regra?.parametrosCalculo?.marcosCapacidadeTIC || [];
    const marco = marcos.find((item) => item.label === marcoSelecionado);
    const percentualInput = document.querySelector('[data-entry-field="percentualRealizadoTIC"]');
    if (!marco || !percentualInput) return;
    percentualInput.value = Number(marco.percentual) * 100;
  }

  function calculateLaunchValues(lancamento, indicador) {
    const regra = getRule(indicador);
    const collectedFields = {
      ...(lancamento.camposEntrada || {}),
      ...collectEntryValues()
    };
    const camposEntrada = window.DocumentationFields
      ? DocumentationFields.preserveLegacyFields(regra, lancamento, collectedFields)
      : collectedFields;
    const ieoDirectToggle = document.getElementById("ieoDirectToggle");
    if (isIeoRule(regra) && ieoDirectToggle && !ieoDirectToggle.checked) {
      camposEntrada.ieoApuradoInformado = "";
    }
    if (isIeoRule(regra) && !canAdjustOfficialPerformance()) {
      camposEntrada.percentualAtingidoOficialInformado = (lancamento.camposEntrada || {}).percentualAtingidoOficialInformado ?? "";
      camposEntrada.observacaoAjusteOficial = (lancamento.camposEntrada || {}).observacaoAjusteOficial ?? "";
    }
    const automatic = usesAutomaticCalculation(indicador, regra);
    const manual = isManual(indicador);
    const realizado = automatic ? null : camposEntrada.realizadoMensal ?? toNumberOrNull(document.getElementById("launchRealizado").value);
    const percentualManual = manual ? toNumberOrNull(document.getElementById("launchPercentualManual").value) : null;
    if (manual && percentualManual !== null) {
      camposEntrada.percentualManual = percentualManual;
    }
    const lancamentoComEntrada = {
      ...lancamento,
      camposEntrada,
      realizadoMensal: realizado,
      percentualManual
    };
    const simulatedLaunches = state.lancamentos.map((item) => {
      if (item.id !== lancamento.id) return item;
      return lancamentoComEntrada;
    });
    const lancamentosDoIndicador = simulatedLaunches
      .filter((item) => item.indicadorId === indicador.id && item.ano === lancamento.ano && item.mes <= lancamento.mes)
      .sort((a, b) => a.mes - b.mes);
    const resultado = IndicatorFormulas.calcularIndicador(indicador, regra, lancamentoComEntrada, lancamentosDoIndicador);
    if (regra?.tipoCalculo === "nota_pesquisa_nps") {
      const hasPromoters = camposEntrada.percentualPromotores !== "" && camposEntrada.percentualPromotores !== null && camposEntrada.percentualPromotores !== undefined;
      const hasDetractors = camposEntrada.percentualDetratores !== "" && camposEntrada.percentualDetratores !== null && camposEntrada.percentualDetratores !== undefined;
      const calculatedInput = document.querySelector('[data-entry-field="npsApurado"]');
      if (resultado.origemNps === "componentes_formula") {
        camposEntrada.npsApurado = resultado.npsCalculado;
        if (calculatedInput) calculatedInput.value = String(Math.round(resultado.npsCalculado * 1000000) / 1000000);
      } else if (hasPromoters || hasDetractors) {
        camposEntrada.npsApurado = "";
        if (calculatedInput) calculatedInput.value = "";
      }
    }
    const realizadoCalculado = automatic ? resultado.resultadoMensal : realizado;

    return {
      realizado: realizadoCalculado,
      percentualManual,
      camposEntrada,
      regra,
      resultado
    };
  }

  function updateCalculatedPreview() {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    if (!lancamento || !indicador) return null;

    const result = calculateLaunchValues(lancamento, indicador);
    const hideAtingimentoFields = shouldHideGoalAchievementFields(indicador, result.regra);
    document.getElementById("percentualMensalWrapper").hidden = hideAtingimentoFields;
    document.getElementById("percentualAnualWrapper").hidden = hideAtingimentoFields;
    document.getElementById("resultadoAnualWrapper").hidden = false;
    document.getElementById("realizadoWrapper").hidden = usesAutomaticCalculation(indicador, result.regra);
    document.getElementById("manualPercentWrapper").hidden = !isManual(indicador);
    document.getElementById("situacaoCalculadaWrapper").hidden = !usesAutomaticCalculation(indicador, result.regra);
    if (isIeoRule(result.regra)) {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("percentualAnualWrapper").hidden = true;
      document.getElementById("resultadoAnualWrapper").hidden = isIeoCaCompetence(result.regra, lancamento);
      document.getElementById("launchPercentualCalculadoLabel").textContent = "% atingido";
    }
    if (result.regra?.tipoCalculo === "cobertura_capacitacao") {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("resultadoAnualWrapper").hidden = true;
      document.getElementById("percentualAnualWrapper").hidden = true;
    }
    if (result.regra?.tipoCalculo === "melhorias_acumuladas") {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("resultadoAnualWrapper").hidden = true;
      document.getElementById("percentualAnualWrapper").hidden = true;
      const accumulatedInput = document.querySelector('[data-entry-field="melhoriasImplementadasAcumuladas"]');
      if (accumulatedInput) {
        accumulatedInput.value = result.resultado.melhoriasImplementadasAcumuladas === null || result.resultado.melhoriasImplementadasAcumuladas === undefined
          ? ""
          : Calculations.formatarInteiroBR(result.resultado.melhoriasImplementadasAcumuladas);
      }
    }
    if (result.regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto") {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("resultadoAnualWrapper").hidden = true;
      document.getElementById("percentualAnualWrapper").hidden = true;
    }
    document.getElementById("launchResultadoMensal").value = result.resultado.resultadoMensalFormatado || Calculations.formatarValor(result.resultado.resultadoMensal, result.resultado.unidadeMedida);
    document.getElementById("launchPercentualCalculado").value = isIeoRule(result.regra) && result.resultado.percentualAtingidoMensal === null
      ? "Sem cálculo"
      : result.resultado.percentualAtingidoMensalFormatado || Calculations.formatarPercentual(result.resultado.percentualAtingidoMensal);
    document.getElementById("launchResultadoAcumulado").value = result.resultado.resultadoOficialAnualFormatado || Calculations.formatarValor(result.resultado.resultadoOficialAnual, result.resultado.unidadeMedida);
    document.getElementById("launchPercentualAcumulado").value = result.resultado.percentualAtingidoAnualFormatado || Calculations.formatarPercentual(result.resultado.percentualAtingidoAnual);
    document.getElementById("launchSituacaoCalculada").value = Situations.normalizarSituacao(result.resultado.situacao || getCalculatedSituation(result.resultado.percentualAtingidoAnual ?? result.resultado.percentualAtingidoMensal));
    if (result.resultado.erro) {
      document.getElementById("launchResultadoMensal").value = "-";
      document.getElementById("launchPercentualCalculado").value = "-";
      document.getElementById("launchResultadoAcumulado").value = "-";
      document.getElementById("launchPercentualAcumulado").value = "-";
      document.getElementById("launchSituacaoCalculada").value = result.regra?.tipoCalculo === "marco_projeto_percentual"
        ? "Sem avaliação"
        : "Sem cálculo";
    }
    renderFormulaDetails(result.resultado, result.regra, lancamento);
    return result;
  }

  function validateLaunch(indicador, action, options = {}) {
    const regra = getRule(indicador);
    const observacaoArea = document.getElementById("launchObservacaoArea").value.trim();
    const percentualManual = document.getElementById("launchPercentualManual").value;
    const result = updateCalculatedPreview();
    const invalidIntegerInput = [...document.querySelectorAll('[data-entry-type="inteiro"]')]
      .find((input) => input.value.trim() !== "" && Calculations.parseInteiroBR(input.value) === null);
    if (invalidIntegerInput) {
      invalidIntegerInput.setCustomValidity("Informe uma quantidade inteira não negativa, sem casas decimais.");
      invalidIntegerInput.reportValidity();
      invalidIntegerInput.focus();
      showMessage("Corrija a quantidade informada: use apenas números inteiros não negativos.", "warning");
      return false;
    }

    if (!validateRgfRows(regra, { focus: true })) {
      showMessage("Informe elemento e status sem duplicidades para cada linha RGF/WLA.", "warning");
      return false;
    }

    if (!validateSocioambientalRequiredFields(regra, { focus: true })) return false;

    if (action === "send" && regra.tipoCalculo === "cobertura_capacitacao") {
      const tipoPosicao = IndicatorFormulas.resolverTipoPosicaoCapacitacao({
        ...getSelectedLaunch(),
        camposEntrada: result.camposEntrada
      });
      if (!tipoPosicao) {
        showMessage("Selecione o tipo da posição antes de enviar para homologação.", "warning");
        return false;
      }
      if (tipoPosicao === "acompanhamento" && !String(result.camposEntrada.acoesAcompanhamentoCapacitacao || "").trim()) {
        showMessage("Informe as ações realizadas ou o andamento antes de enviar para homologação.", "warning");
        return false;
      }
      if (tipoPosicao === "apuracao_quantitativa") {
        const modoResultado = IndicatorFormulas.resolverModoResultadoCapacitacao({ camposEntrada: result.camposEntrada });
        const possuiResultadoValido = result.resultado.statusCalculo === "calculado" && !result.resultado.erro;
        if (!possuiResultadoValido) {
          showMessage(
            modoResultado === "oficial_informado"
              ? "Informe o resultado e o percentual atingido oficiais antes de enviar para homologação."
              : "Informe o público-alvo elegível e os empregados capacitados antes de enviar para homologação.",
            "warning"
          );
          return false;
        }
      }
    }

    if (regra.tipoCalculo === "melhorias_acumuladas") {
      const tipoPosicao = IndicatorFormulas.resolverTipoPosicaoAprimoramento({
        ...getSelectedLaunch(),
        camposEntrada: result.camposEntrada
      });
      if (action === "send" && !tipoPosicao) {
        showMessage("Selecione o tipo da posição antes de enviar para homologação.", "warning");
        return false;
      }
      if (tipoPosicao === "fechamento_quantitativo" && result.resultado.statusCalculo !== "calculado") {
        showMessage(result.resultado.mensagem || "Informe as melhorias implementadas no período para o fechamento quantitativo.", "warning");
        return false;
      }
    }

    if (action === "send" && regra.tipoCalculo === "nota_pesquisa_nps") {
      const type = String(result.camposEntrada.tipoPosicaoNPS || "");
      const tracking = type.startsWith("Acompanhamento") || type === "Revisão metodológica";
      if (!tracking && result.resultado.statusCalculo !== "calculado") {
        showMessage(result.resultado.mensagem || "Informe os percentuais de promotores e detratores para calcular o NPS.", "warning");
        return false;
      }
      if (!tracking && !String(result.camposEntrada.dataBasePesquisaNPS || "").trim()) {
        showMessage("Informe a data-base da pesquisa antes de enviar para homologação.", "warning");
        return false;
      }
    }

    if (
      action === "send" &&
      regra.tipoCalculo === "razao_pix" &&
      !(
        result.camposEntrada[regra.parametrosCalculo?.campoNumeradorAcumulado || "arrecadacaoPixAcumuladaCompetencia"] &&
        result.camposEntrada[regra.parametrosCalculo?.campoDenominadorAcumulado || "arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia"]
      ) &&
      !(
        result.camposEntrada[regra.parametrosCalculo?.campoResultadoOficial || "resultadoOficialPix"] &&
        result.camposEntrada[regra.parametrosCalculo?.campoPercentualAtingidoOficial || "percentualAtingidoOficialPix"]
      )
    ) {
      showMessage("Informe os componentes acumulados exatos ou o resultado e o atingimento documentais antes de enviar para homologação.", "warning");
      return false;
    }
    if (
      action === "send" &&
      regra.tipoCalculo === "razao_canais_digitais" &&
      !(
        result.camposEntrada[regra.parametrosCalculo?.campoNumerador || "arrecadacaoCanaisEletronicosMes"] &&
        result.camposEntrada[regra.parametrosCalculo?.campoDenominador || "arrecadacaoTotalProdutosLoteriasMes"]
      ) &&
      !result.camposEntrada[regra.parametrosCalculo?.campoResultadoAcumuladoDocumental || "resultadoAcumuladoDocumentalCanaisDigitais"]
    ) {
      showMessage("Informe os componentes mensais ou a posição acumulada documental antes de enviar para homologação.", "warning");
      return false;
    }
    if (
      action === "send" &&
      isIeoRule(regra) &&
      (result.resultado.resultadoMensal === null || result.resultado.resultadoMensal === undefined)
    ) {
      const metodologia = window.IeoRecorrente?.getMetodologiaIeoPorCompetencia?.(getSelectedLaunch());
      showMessage(
        metodologia?.codigo === "ca_agosto_2026"
          ? "Informe Despesas Gerais e Administrativas, Serviços de Pagamentos, Outras Despesas Operacionais, Receitas Operacionais e Despesas de Tributos para calcular o IEO antes de enviar."
          : "Informe despesa de pessoal, despesas administrativas e receitas líquidas para calcular o IEO antes de enviar.",
        "warning"
      );
      return false;
    }

    if (result && result.resultado.erro) {
      showMessage(result.resultado.mensagem, "warning");
      return false;
    }

    if (isManual(indicador)) {
      if (percentualManual === "") {
        showMessage("Indicadores manuais ou qualitativos exigem percentual manual.", "warning");
        return false;
      }
      if (!observacaoArea) {
        showMessage("Indicadores manuais ou qualitativos exigem observação da área.", "warning");
        return false;
      }
    }

    if (regra.exigeJustificativa && !observacaoArea) {
      showMessage("Observação da área obrigatória para este indicador.", "warning");
      return false;
    }

    const pendingEvidenceAllowed = options.allowPendingEvidence && Boolean(pendingEvidenceFile());
    if (action === "send" && regra.exigeEvidencia && !evidenceItems(getSelectedLaunch().id).length && !pendingEvidenceAllowed) {
      showMessage("Anexe pelo menos um arquivo antes de enviar para homologação.", "warning");
      return false;
    }

    return true;
  }

  async function persistLaunch(action) {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    if (!lancamento || !indicador || !isEditable(lancamento)) return;
    if (state.evidenceOperationInProgress) return;
    clearActionFeedback();
    setEvidenceOperationBusy(true);
    let evidenceUploaded = false;
    try {
      let correctionReason = "";
      const requiresRetification = unresolvedReopenCycle(lancamento);
      const transactional = requiresTransactionalPersistence(lancamento);
      if (requiresRetification) {
        correctionReason = String(window.prompt("Informe a justificativa da retifica\u00e7\u00e3o:") || "").trim();
        if (!correctionReason) {
          showActionFeedback("A justificativa da retifica\u00e7\u00e3o \u00e9 obrigat\u00f3ria.", "warning");
          return;
        }
      }
      if (action === "send") {
        await loadEvidenceList(lancamento.id, true);
      }
      if (!validateLaunch(indicador, action, { allowPendingEvidence: true })) return;

      if (pendingEvidenceFile()) {
        try {
          const upload = await uploadPendingEvidence(lancamento);
          evidenceUploaded = upload.uploaded;
        } catch (uploadError) {
          if (action === "send") {
            showActionFeedback(`Não foi possível anexar a evidência. O lançamento não foi enviado para homologação. ${uploadError.message}`, "error");
            return;
          }
          await saveLaunchData(action, lancamento, indicador, { transactional, requiresRetification, correctionReason });
          showActionFeedback(`Rascunho salvo, mas não foi possível anexar a evidência. O arquivo continua selecionado para nova tentativa. ${uploadError.message}`, "warning");
          return;
        }
      }

      if (!validateLaunch(indicador, action)) return;
      await saveLaunchData(action, lancamento, indicador, { transactional, requiresRetification, correctionReason });
      if (action === "send") {
        showActionFeedback("Lançamento enviado para homologação com sucesso.");
      } else {
        showActionFeedback("Rascunho salvo com sucesso.");
      }
    } catch (error) {
      const fallback = action === "send"
        ? "Não foi possível enviar para homologação."
        : "Não foi possível salvar o rascunho.";
      const detail = String(error.message || "").trim().replace(/[.\s]+$/, "");
      showActionFeedback(
        evidenceUploaded
          ? `Evidência anexada, mas não foi possível salvar o lançamento${detail ? `: ${detail}` : ""}.`
          : detail ? `${fallback.replace(/\.$/, "")}: ${detail}.` : fallback,
        "error"
      );
    } finally {
      setEvidenceOperationBusy(false);
    }
  }

  async function saveLaunchData(action, lancamento, indicador, persistenceOptions = {}) {
    const calculation = updateCalculatedPreview();
    const canaisDigitais = calculation.regra?.tipoCalculo === "razao_canais_digitais";
    const now = new Date().toISOString();
    const updated = {
      ...lancamento,
      camposEntrada: calculation.camposEntrada,
      resultadoMensal: calculation.resultado.resultadoMensal,
      realizadoMensal: calculation.realizado,
      percentualManual: isManual(indicador) ? calculation.percentualManual : null,
      percentualAtingido: canaisDigitais
        ? calculation.resultado.percentualAtingidoAnual ?? calculation.resultado.percentualAtingidoAcumulado
        : calculation.resultado.percentualAtingidoMensal,
      percentualAtingidoMensal: calculation.resultado.percentualAtingidoMensal,
      resultadoAcumulado: calculation.resultado.resultadoAcumulado,
      percentualAtingidoAcumulado: calculation.resultado.percentualAtingidoAcumulado,
      percentualAtingidoAnual: calculation.resultado.percentualAtingidoAnual,
      resultadoOficialAnual: calculation.resultado.resultadoOficialAnual,
      ...(isIeoRule(calculation.regra) ? {
        metaReferencia: calculation.resultado.metaReferenciaMensal,
        metaMensal: calculation.resultado.metaReferenciaMensal
      } : {}),
      ...(calculation.regra?.tipoCalculo === "lucro_recorrente_mensal" ? {
        metaReferencia: calculation.resultado.metaReferenciaMensal,
        metaMensal: calculation.resultado.metaReferenciaMensal
      } : {}),
      ...(canaisDigitais ? {
        metaReferencia: calculation.resultado.metaReferencia,
        metaMensal: calculation.resultado.metaReferencia
      } : {}),
      situacaoCalculada: Situations.normalizarSituacao(calculation.resultado.situacao || getCalculatedSituation(calculation.resultado.percentualAtingidoAnual ?? calculation.resultado.percentualAtingidoMensal)),
      status: action === "send" ? "Enviado para homologação" : "Em preenchimento",
      observacaoArea: document.getElementById("launchObservacaoArea").value.trim(),
      referenciaEvidencia: document.getElementById("launchEvidenceReference").value.trim(),
      preenchidoPor: state.user.matricula,
      usuarioResponsavel: state.user.matricula,
      dataPreenchimento: now.slice(0, 10),
      statusCalculo: calculation.resultado.statusCalculo,
      mensagemCalculo: calculation.resultado.mensagem,
      revisaoMoedaPendente: false
    };

    const previousLaunches = state.lancamentos;
    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? updated : { ...item });
    recomputeAccumulatedForIndicator(indicador.id, updated.ano);
    const previousById = new Map(previousLaunches.map((item) => [item.id, item]));
    const changedLaunches = state.lancamentos.filter((item) => (
      item.id === updated.id || JSON.stringify(item) !== JSON.stringify(previousById.get(item.id))
    ));
    let saved;
    try {
      saved = await CentralPersistence.persistLaunchAction(action, changedLaunches, updated.id, persistenceOptions);
    } catch (error) {
      state.lancamentos = previousLaunches;
      throw error;
    }
    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? { ...item, ...saved } : item);
    state.data.lancamentos = mergeScopedLaunches();

    refresh();
    state.selectedId = updated.id;
    renderEditor();
    return saved;
  }

  function recomputeAccumulatedForIndicator(indicadorId, ano) {
    const indicador = getIndicatorMap()[indicadorId];
    const regra = getRule(indicador);
    if (regra?.tipoCalculo === "cobertura_capacitacao") return;
    const ordered = state.lancamentos
      .filter((item) => item.indicadorId === indicadorId && item.ano === ano)
      .sort((a, b) => a.mes - b.mes);

    ordered.forEach((lancamento) => {
      const ateMes = ordered.filter((item) => item.mes <= lancamento.mes);
      const resultado = IndicatorFormulas.calcularIndicador(indicador, regra, lancamento, ateMes);
      if (!resultado.erro) {
        const canaisDigitais = regra?.tipoCalculo === "razao_canais_digitais";
        lancamento.resultadoMensal = resultado.resultadoMensal;
        lancamento.percentualAtingido = canaisDigitais
          ? resultado.percentualAtingidoAnual ?? resultado.percentualAtingidoAcumulado
          : resultado.percentualAtingidoMensal;
        lancamento.percentualAtingidoMensal = resultado.percentualAtingidoMensal;
        lancamento.resultadoAcumulado = resultado.resultadoAcumulado;
        lancamento.percentualAtingidoAcumulado = resultado.percentualAtingidoAcumulado;
        lancamento.percentualAtingidoAnual = resultado.percentualAtingidoAnual;
        lancamento.resultadoOficialAnual = resultado.resultadoOficialAnual;
        lancamento.situacaoCalculada = Situations.normalizarSituacao(resultado.situacao || getCalculatedSituation(resultado.percentualAtingidoAnual ?? resultado.percentualAtingidoMensal));
      }
    });
  }

  function mergeScopedLaunches() {
    const scopedIds = new Set(state.lancamentos.map((item) => item.id));
    return state.data.lancamentos.map((item) => (
      scopedIds.has(item.id) ? state.lancamentos.find((updated) => updated.id === item.id) : item
    ));
  }

  function clearForm() {
    const lancamento = getSelectedLaunch();
    if (!lancamento || !isEditable(lancamento)) return;
    document.getElementById("launchRealizado").value = "";
    document.getElementById("launchPercentualManual").value = "";
    document.getElementById("launchObservacaoArea").value = "";
    document.getElementById("launchEvidenceReference").value = "";
    document.getElementById("launchEvidenceFile").value = "";
    document.getElementById("launchEvidenceDescription").value = "";
    document.querySelectorAll(".dynamic-entry-field").forEach((input) => {
      input.value = "";
    });
    if (isRgfElementsRule(getRule(getIndicatorMap()[lancamento.indicadorId]))) {
      const list = document.querySelector(".rgf-elements-list");
      if (list) list.innerHTML = renderRgfRow({ elemento: "", status: "", acao: "", data: "", evidencia: "" }, getRule(getIndicatorMap()[lancamento.indicadorId]));
    }
    clearSocioambientalValidation();
    const ieoDirectToggle = document.getElementById("ieoDirectToggle");
    if (ieoDirectToggle) {
      ieoDirectToggle.checked = false;
      if (!metodologiaCa) updateIeoOptionalVisibility();
    }
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    updateCapacitacaoPositionFields(getRule(indicador), lancamento);
    updateCalculatedPreview();
  }

  async function requestReopening() {
    const launch = getSelectedLaunch();
    if (!launch || launch.status !== "Homologado" || state.user.perfil !== "Unidade Apuradora") return;
    clearActionFeedback();
    try {
      const result = await evidenceApi("api/solicitacoes-reabertura", {
        method: "POST",
        body: JSON.stringify({
          action: "criar",
          lancamentoId: launch.id,
          indicadorId: launch.indicadorId,
          competencia: launch.competencia || `${launch.ano}-${String(launch.mes).padStart(2, "0")}`,
          tipoAjuste: "Correção de valor lançado",
          justificativa: "Solicitação de reabertura enviada pela ficha de lançamento."
        })
      });
      const updated = { ...launch, solicitacaoReabertura: result.solicitacao || result };
      state.lancamentos = state.lancamentos.map((item) => String(item.id) === String(updated.id) ? updated : item);
      state.data.lancamentos = state.data.lancamentos.map((item) => String(item.id) === String(updated.id) ? updated : item);
      renderEditor();
      showActionFeedback("Solicitação de reabertura enviada com sucesso.");
    } catch (error) {
      showActionFeedback(error.message || "Não foi possível solicitar a reabertura.", "error");
    }
  }

  function refresh() {
    fillFilters(state.lancamentos);
    renderTable(getFilteredLaunches());
  }

  function bindEvents() {
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        if (select.dataset.filter === "indicador") fillFilters(state.lancamentos);
        renderTable(getFilteredLaunches());
      });
    });

    document.getElementById("lancamentosTable").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button) return;
      state.selectedId = button.dataset.id;
      clearActionFeedback();
      await loadMutationPolicy(getSelectedLaunch());
      renderEditor();
      document.getElementById("launchEditorPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    ["launchRealizado", "launchPercentualManual"].forEach((id) => {
      document.getElementById(id).addEventListener("input", updateCalculatedPreview);
    });

    document.getElementById("dynamicInputFields").addEventListener("input", (event) => {
      if (event.target.dataset.entryType === "inteiro") formatIntegerEntryInput(event.target, event);
      updateCalculatedPreview();
      const lancamento = getSelectedLaunch();
      const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
      const regra = indicador && getRule(indicador);
      if (socioambientalValidationActive && regra?.tipoCalculo === "iniciativas_apoiadas") {
        validateSocioambientalRequiredFields(regra);
      }
    });
    document.getElementById("dynamicInputFields").addEventListener("click", (event) => {
      const lancamento = getSelectedLaunch();
      const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
      const regra = indicador && getRule(indicador);
      if (!isRgfElementsRule(regra) || !isEditable(lancamento)) return;
      if (event.target.closest("[data-add-rgf-element]")) {
        document.querySelector(".rgf-elements-list")?.insertAdjacentHTML(
          "beforeend",
          renderRgfRow({ elemento: "", status: "", acao: "", data: "", evidencia: "" }, regra)
        );
        return;
      }
      const removeButton = event.target.closest("[data-remove-rgf-element]");
      if (!removeButton) return;
      removeButton.closest("[data-rgf-row]")?.remove();
      const list = document.querySelector(".rgf-elements-list");
      if (list && !list.querySelector("[data-rgf-row]")) {
        list.insertAdjacentHTML("beforeend", renderRgfRow({ elemento: "", status: "", acao: "", data: "", evidencia: "" }, regra));
      }
      updateCalculatedPreview();
    });
    document.getElementById("dynamicInputFields").addEventListener("change", (event) => {
      if (event.target.id === "ieoDirectToggle") updateIeoOptionalVisibility();
      if (event.target.dataset.entryField === "marcoAlcancadoTIC") {
        updateCapacidadeTicPercentual(event.target.value);
      }
      if (["tipoPosicaoCapacitacao", "modoResultadoCapacitacao"].includes(event.target.dataset.entryField)) {
        const lancamento = getSelectedLaunch();
        const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
        updateCapacitacaoPositionFields(getRule(indicador), lancamento);
      }
      const lancamento = getSelectedLaunch();
      const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
      if (indicador) {
        const regra = getRule(indicador);
        if (event.target.dataset.entryField === "tipoPosicaoAprimoramento") updateAprimoramentoPositionFields(regra, lancamento);
        if (event.target.dataset.entryField === "tipoPosicaoNPS") updateNpsPositionFields(regra, lancamento);
        if (event.target.dataset.entryField === (regra.parametrosCalculo?.campoStatus || "statusIniciativaSocioambiental")) {
          updateSocioambientalInitiativeFields(regra);
          if (socioambientalValidationActive) validateSocioambientalRequiredFields(regra);
        }
        updateEcossistemaCurveFields(regra, lancamento);
        updateRedeLotericaCurveFields(regra, lancamento);
      }
      updateCalculatedPreview();
    });

    document.getElementById("saveDraftButton").addEventListener("click", () => persistLaunch("draft"));
    document.getElementById("sendApprovalButton").addEventListener("click", () => persistLaunch("send"));
    document.getElementById("addEvidenceButton").addEventListener("click", addEvidence);
    document.getElementById("launchEvidenceFile").addEventListener("change", () => renderPendingEvidenceStatus());
    document.getElementById("launchEvidenceList").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-remove-evidence]");
      if (button) removeEvidence(button.dataset.removeEvidence);
    });
    document.getElementById("requestReopenButton").addEventListener("click", requestReopening);
    document.getElementById("clearLaunchButton").addEventListener("click", clearForm);
    document.getElementById("closeLaunchButton").addEventListener("click", () => {
      state.selectedId = null;
      document.getElementById("launchEditorPanel").hidden = true;
    });
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicadores: Auth.filterIndicatorsByUser(data.indicadores, user),
      regras: data.regrasIndicadores || [],
      lancamentos: officialOperationalLaunches(
        Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
        data.indicadores
      ),
      mutationPolicies: {},
      evidenciasPorLancamento: {},
      evidenciasHistoricasPorLancamento: {},
      evidenceOperationInProgress: false,
      selectedId: null
    };

    document.getElementById("launchNotice").textContent =
      "Preencha os campos exigidos pela regra do indicador. O sistema usa a matriz de regras e o motor central de cálculo.";

    bindEvents();
    refresh();

    const requestedId = new URLSearchParams(window.location.search).get("lancamentoId");
    if (requestedId && state.lancamentos.some((item) => String(item.id) === requestedId)) {
      state.selectedId = requestedId;
      await loadMutationPolicy(getSelectedLaunch());
      renderEditor();
      document.getElementById("launchEditorPanel").scrollIntoView({ block: "start" });
    }
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.lancamentos = { init };
  window.__LAUNCHES_FILTER_TEST_INTERNALS__ = {
    indicatorFilterOptions,
    filterLaunches,
    officialOperationalLaunches,
    quarterLabel,
    quarterlyMetaDetail,
    getMetaLabel,
    getDisplayMeta,
    getLaunchListPerformance,
    formatDisplayMeta,
    formatEntryValue,
    parseEntryValue,
    usesDecimalPercentageEntry,
    isCanaisDigitaisDocumentalField,
    renderEntryInput,
    indicator08CalculatedDetails,
    socioambientalRequiredFieldState,
    normalizeRgfKey,
    rgfRowsFromLaunch,
    latestReopenCycleAction,
    unresolvedReopenCycle,
    requiresTransactionalPersistence
  };
})();
