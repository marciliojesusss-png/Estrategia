(function () {
  const EDITABLE_STATUSES = ["Não iniciado", "Em preenchimento", "Devolvido para ajuste", "Reaberto"];
  const MANUAL_TYPES = ["manual_homologado", "qualitativo"];

  let state = {
    data: null,
    user: null,
    indicadores: [],
    regras: [],
    lancamentos: [],
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
    const number = toNumberOrNull(value);
    return number === null ? null : number > 1 ? number / 100 : number;
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

  function getIndicatorMap() {
    return Object.fromEntries(state.indicadores.map((item) => [item.id, item]));
  }

  function getSelectedLaunch() {
    return state.lancamentos.find((item) => item.id === state.selectedId);
  }

  function isEditable(lancamento) {
    return lancamento && EDITABLE_STATUSES.includes(lancamento.status);
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

  function getMetaLabel(regra) {
    if (regra?.parametrosCalculo?.metaMensalFixa || regra?.parametrosCalculo?.metaMensalPix) {
      return "Meta mensal de referencia";
    }
    return regra && regra.tipoConsolidacao === "ultima_posicao"
      ? "Meta de referência mensal"
      : "Meta de referência";
  }

  function getRule(indicador) {
    return IndicatorFormulas.obterRegra(indicador, state.regras);
  }

  function getDisplayMeta(regra, lancamento) {
    return regra?.parametrosCalculo?.metaMensalFixa ??
      regra?.parametrosCalculo?.metaMensalPix ??
      regra?.parametrosCalculo?.metaMinimaMelhoriasAno ??
      regra?.parametrosCalculo?.metaReferencia ??
      lancamento.metaMensal ??
      regra?.metaAnualValor;
  }

  function getEntryValuesFromLaunch(lancamento, regra) {
    const saved = lancamento.camposEntrada || {};
    return Object.fromEntries((regra.camposEntrada || []).map((field) => {
      if (saved[field.nome] !== undefined) return [field.nome, saved[field.nome]];
      if (field.nome === "realizadoMensal" && !isOfertasPersonalizadasRule(regra)) return [field.nome, lancamento.realizadoMensal ?? ""];
      return [field.nome, ""];
    }));
  }

  function isOfertasPersonalizadasRule(regra) {
    return Boolean(regra && (regra.camposEntrada || []).some((field) => field.nome === "baseClientesAtivos") && (regra.camposEntrada || []).some((field) => field.nome === "clientesComOfertaPersonalizada"));
  }

  function isOfertasPersonalizadasIndicator(indicador, regra) {
    return Boolean(indicador && indicador.id === 1) || isOfertasPersonalizadasRule(regra);
  }

  function shouldHideGoalAchievementFields(indicador, regra) {
    if (isOfertasPersonalizadasIndicator(indicador, regra)) return true;
    return usesAutomaticCalculation(indicador, regra) && regra && (regra.unidadeMedida === "percentual" || regra.parametrosCalculo?.quantoMenorMelhor);
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
    const target = document.getElementById("lancamentosTable");
    const porId = getIndicatorMap();
    if (!lancamentos.length) {
      target.innerHTML = '<tr><td colspan="7">Nenhum lançamento encontrado para o escopo e filtros selecionados.</td></tr>';
      return;
    }

    target.innerHTML = lancamentos.slice(0, 100).map((item) => {
      const indicador = porId[item.indicadorId];
      const regra = indicador ? getRule(indicador) : null;
      const actionLabel = isEditable(item) ? "Preencher" : "Consultar";
      const resultadoMensal = item.resultadoMensal ?? item.realizadoMensal;
      const situacao = item.situacaoCalculada || getCalculatedSituation(item.percentualAtingido ?? item.percentualAtingidoMensal);
      return `
        <tr>
          <td>${escapeHtml(indicador ? indicador.indicador : item.indicadorId)}</td>
          <td>${escapeHtml(item.nomeMes)}/${escapeHtml(item.ano)}</td>
          <td>${Calculations.formatarValor(getDisplayMeta(regra, item), regra && regra.unidadeMedida)}</td>
          <td>${Calculations.formatarValor(resultadoMensal, regra && regra.unidadeMedida)}</td>
          <td>${escapeHtml(situacao)}</td>
          <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td><button class="secondary-action table-action" type="button" data-id="${item.id}">${actionLabel}</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderReference(indicador, lancamento, regra) {
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
      "launchJustificativa",
      "launchObservacaoArea",
      "launchEvidencia",
      "saveDraftButton",
      "sendApprovalButton",
      "clearLaunchButton"
    ].forEach((id) => {
      document.getElementById(id).disabled = disabled;
    });
    document.querySelectorAll(".dynamic-entry-field").forEach((input) => {
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
    document.getElementById("situacaoCalculadaWrapper").hidden = !automatic;

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
  }

  function getCalculatedSituation(percentualAtingido) {
    const percentual = toNumberOrNull(percentualAtingido);
    if (percentual === null) return "Sem dados";
    if (percentual >= 1) return "Atingido";
    if (percentual >= 0.8) return "Abaixo da meta";
    return "Critico";
  }

  function renderDynamicFields(lancamento, regra) {
    const values = getEntryValuesFromLaunch(lancamento, regra);
    document.getElementById("realizadoWrapper").hidden = hasSpecificInputRule(regra);
    document.getElementById("dynamicInputFields").innerHTML = (regra.camposEntrada || []).map((field) => `
      <label>${escapeHtml(field.rotulo || field.nome)}
        <input
          class="dynamic-entry-field"
          data-entry-field="${escapeHtml(field.nome)}"
          data-entry-type="${escapeHtml(field.tipo || "numero")}"
          type="${field.tipo === "texto" ? "text" : field.tipo === "data" ? "date" : "number"}"
          ${field.tipo === "texto" || field.tipo === "data" ? "" : "step=\"any\""}
          value="${escapeHtml(values[field.nome] ?? "")}"
          ${field.obrigatorio ? "required" : ""}
        >
      </label>
    `).join("");
  }

  function renderFormulaDetails(resultado) {
    const wrapper = document.getElementById("formulaDetailsWrapper");
    const target = document.getElementById("formulaDetails");
    const details = [];

    if (resultado.resultadoReferencia2025 !== undefined) {
      details.push(["Resultado referência 2025", Calculations.formatarPercentual(resultado.resultadoReferencia2025)]);
    }
    if (resultado.metaCalculada2026 !== undefined) {
      details.push(["Meta calculada 2026", Calculations.formatarPercentual(resultado.metaCalculada2026)]);
    }
    if (resultado.crescimentoVs2025 !== undefined) {
      details.push(["Crescimento em relação a 2025", Calculations.formatarPercentual(resultado.crescimentoVs2025)]);
    }

    if (resultado.totalMelhoriasPlano2026 !== undefined) {
      details.push(["Total de melhorias previstas no plano", resultado.totalMelhoriasPlano2026]);
    }
    if (resultado.metaMinimaMelhoriasAno !== undefined) {
      details.push(["Meta anual de melhorias", resultado.metaMinimaMelhoriasAno]);
    }
    if (resultado.melhoriasEntreguesAcumuladas !== undefined) {
      details.push(["Melhorias acumuladas no ano", resultado.melhoriasEntreguesAcumuladas]);
    }
    if (resultado.percentualMetaAnualAtingida !== undefined) {
      details.push(["% da meta anual atingida", Calculations.formatarPercentual(resultado.percentualMetaAnualAtingida)]);
    }
    if (resultado.metaReferenciaMensal !== undefined) {
      details.push(["Meta mensal de referencia", Calculations.formatarValor(resultado.metaReferenciaMensal, resultado.unidadeMedida)]);
    }
    if (resultado.percentualMetaMensal !== undefined) {
      details.push(["% da meta mensal", Calculations.formatarPercentual(resultado.percentualMetaMensal)]);
    }
    if (resultado.metaAcumulada !== undefined) {
      details.push(["Meta acumulada", Calculations.formatarValor(resultado.metaAcumulada, resultado.unidadeMedida)]);
    }
    if (resultado.realizadoAcumulado !== undefined) {
      details.push(["Realizado acumulado", Calculations.formatarValor(resultado.realizadoAcumulado, resultado.unidadeMedida)]);
    }
    if (resultado.percentualMetaAcumulada !== undefined) {
      details.push(["% atingido acumulado", Calculations.formatarPercentual(resultado.percentualMetaAcumulada)]);
    }
    if (resultado.percentualMetaAnual !== undefined) {
      details.push(["AvanÃ§o sobre a meta anual", Calculations.formatarPercentual(resultado.percentualMetaAnual)]);
    }

    wrapper.hidden = !details.length;
    target.innerHTML = details.map(([label, value]) => `
      <article class="detail-item">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
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

    panel.hidden = false;
    document.getElementById("launchEditorTitle").textContent = `${indicador.indicador} - ${lancamento.nomeMes}/${lancamento.ano}`;
    document.getElementById("launchStatusBadge").textContent = lancamento.status;
    document.getElementById("launchStatusBadge").className = `badge ${badgeClass(lancamento.status)}`;
    renderReference(indicador, lancamento, regra);
    renderDynamicFields(lancamento, regra);

    document.getElementById("launchId").value = lancamento.id;
    document.getElementById("launchMetaLabel").textContent = getMetaLabel(regra);
    document.getElementById("launchMeta").value = Calculations.formatarValor(getDisplayMeta(regra, lancamento), regra.unidadeMedida);
    document.getElementById("launchRealizado").value = lancamento.realizadoMensal ?? "";
    document.getElementById("launchPercentualManual").value = lancamento.percentualManual ?? lancamento.percentualAtingido ?? "";
    document.getElementById("launchJustificativa").value = lancamento.justificativa || "";
    document.getElementById("launchObservacaoArea").value = lancamento.observacaoArea || "";
    document.getElementById("launchEvidencia").value = lancamento.evidencia || "";
    document.getElementById("launchMetrica").value = indicador.metrica || "";
    document.getElementById("manualPercentWrapper").hidden = !isManual(indicador);
    document.getElementById("evidenceWrapper").hidden = !regra.exigeEvidencia;

    updateCalculatedPreview();
    const disabled = !isEditable(lancamento);
    setFormDisabled(disabled);
    enforceRuleFieldState(indicador, regra, disabled);

    if (!isEditable(lancamento)) {
      showMessage(`Lançamento com status "${lancamento.status}" está bloqueado para edição.`, "warning");
    }
  }

  function collectEntryValues() {
    const values = {};
    document.querySelectorAll(".dynamic-entry-field").forEach((input) => {
      const type = input.dataset.entryType || "numero";
      if (type === "numero") {
        values[input.dataset.entryField] = input.value === "" ? "" : toNumberOrNull(input.value);
        return;
      }
      if (type === "percentual") {
        values[input.dataset.entryField] = input.value === "" ? "" : normalizarPercentual(input.value);
        return;
      }
      values[input.dataset.entryField] = input.value.trim();
    });
    return values;
  }

  function calculateLaunchValues(lancamento, indicador) {
    const regra = getRule(indicador);
    const camposEntrada = collectEntryValues();
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
      percentualManual,
      justificativa: document.getElementById("launchJustificativa").value.trim()
    };
    const simulatedLaunches = state.lancamentos.map((item) => {
      if (item.id !== lancamento.id) return item;
      return lancamentoComEntrada;
    });
    const lancamentosDoIndicador = simulatedLaunches
      .filter((item) => item.indicadorId === indicador.id && item.ano === lancamento.ano && item.mes <= lancamento.mes)
      .sort((a, b) => a.mes - b.mes);
    const resultado = IndicatorFormulas.calcularIndicador(indicador, regra, lancamentoComEntrada, lancamentosDoIndicador);
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
    document.getElementById("realizadoWrapper").hidden = usesAutomaticCalculation(indicador, result.regra);
    document.getElementById("manualPercentWrapper").hidden = !isManual(indicador);
    document.getElementById("situacaoCalculadaWrapper").hidden = !usesAutomaticCalculation(indicador, result.regra);
    document.getElementById("launchResultadoMensal").value = result.resultado.resultadoMensalFormatado || Calculations.formatarValor(result.resultado.resultadoMensal, result.resultado.unidadeMedida);
    document.getElementById("launchPercentualCalculado").value = result.resultado.percentualAtingidoMensalFormatado || Calculations.formatarPercentual(result.resultado.percentualAtingidoMensal);
    document.getElementById("launchResultadoAcumulado").value = result.resultado.resultadoOficialAnualFormatado || Calculations.formatarValor(result.resultado.resultadoOficialAnual, result.resultado.unidadeMedida);
    document.getElementById("launchPercentualAcumulado").value = result.resultado.percentualAtingidoAnualFormatado || Calculations.formatarPercentual(result.resultado.percentualAtingidoAnual);
    document.getElementById("launchSituacaoCalculada").value = result.resultado.situacao || getCalculatedSituation(result.resultado.percentualAtingidoAnual ?? result.resultado.percentualAtingidoMensal);
    if (result.resultado.erro) {
      document.getElementById("launchResultadoMensal").value = "-";
      document.getElementById("launchPercentualCalculado").value = "-";
      document.getElementById("launchResultadoAcumulado").value = "-";
      document.getElementById("launchPercentualAcumulado").value = "-";
      document.getElementById("launchSituacaoCalculada").value = "Sem cÃ¡lculo";
    }
    renderFormulaDetails(result.resultado);
    return result;
  }

  function validateLaunch(indicador, action) {
    const regra = getRule(indicador);
    const justificativa = document.getElementById("launchJustificativa").value.trim();
    const observacaoArea = document.getElementById("launchObservacaoArea").value.trim();
    const evidencia = document.getElementById("launchEvidencia").value.trim();
    const percentualManual = document.getElementById("launchPercentualManual").value;
    const result = updateCalculatedPreview();

    if (result && result.resultado.erro) {
      showMessage(result.resultado.mensagem, "warning");
      return false;
    }

    if (isManual(indicador)) {
      if (percentualManual === "") {
        showMessage("Indicadores manuais ou qualitativos exigem percentual manual.", "warning");
        return false;
      }
      if (!justificativa || !observacaoArea) {
        showMessage("Indicadores manuais ou qualitativos exigem justificativa e observação da área.", "warning");
        return false;
      }
    }

    if (regra.exigeJustificativa && !justificativa) {
      showMessage("Justificativa obrigatória para este indicador.", "warning");
      return false;
    }

    if (regra.exigeEvidencia && !evidencia) {
      showMessage("Evidência obrigatória para este indicador.", "warning");
      return false;
    }

    return true;
  }

  async function persistLaunch(action) {
    const lancamento = getSelectedLaunch();
    const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
    if (!lancamento || !indicador || !isEditable(lancamento)) return;
    if (!validateLaunch(indicador, action)) return;

    const calculation = updateCalculatedPreview();
    const original = { ...lancamento };
    const now = new Date().toISOString();
    const updated = {
      ...lancamento,
      camposEntrada: calculation.camposEntrada,
      resultadoMensal: calculation.resultado.resultadoMensal,
      realizadoMensal: calculation.realizado,
      percentualManual: isManual(indicador) ? calculation.percentualManual : null,
      percentualAtingido: calculation.resultado.percentualAtingidoMensal,
      percentualAtingidoMensal: calculation.resultado.percentualAtingidoMensal,
      resultadoAcumulado: calculation.resultado.resultadoAcumulado,
      percentualAtingidoAcumulado: calculation.resultado.percentualAtingidoAcumulado,
      percentualAtingidoAnual: calculation.resultado.percentualAtingidoAnual,
      resultadoOficialAnual: calculation.resultado.resultadoOficialAnual,
      situacaoCalculada: calculation.resultado.situacao || getCalculatedSituation(calculation.resultado.percentualAtingidoAnual ?? calculation.resultado.percentualAtingidoMensal),
      status: action === "send" ? "Enviado para homologação" : "Em preenchimento",
      justificativa: document.getElementById("launchJustificativa").value.trim(),
      observacaoArea: document.getElementById("launchObservacaoArea").value.trim(),
      evidencia: document.getElementById("launchEvidencia").value.trim(),
      preenchidoPor: state.user.email || state.user.nome,
      dataPreenchimento: now.slice(0, 10),
      statusCalculo: calculation.resultado.statusCalculo,
      mensagemCalculo: calculation.resultado.mensagem
    };

    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? updated : item);
    recomputeAccumulatedForIndicator(indicador.id, updated.ano);
    const mergedLaunches = mergeScopedLaunches();
    state.data.lancamentos = mergedLaunches;
    DataStore.salvarLancamentos(mergedLaunches);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: action === "send" ? "envio_para_homologacao" : "salvar_rascunho_lancamento",
      entidade: "lancamentos",
      registroId: updated.id,
      valorAnterior: original,
      valorNovo: state.lancamentos.find((item) => item.id === updated.id)
    });

    showMessage(action === "send" ? "Lançamento enviado para homologação." : "Rascunho salvo com sucesso.", "info");
    refresh();
    state.selectedId = updated.id;
    renderEditor();
  }

  function recomputeAccumulatedForIndicator(indicadorId, ano) {
    const indicador = getIndicatorMap()[indicadorId];
    const regra = getRule(indicador);
    const ordered = state.lancamentos
      .filter((item) => item.indicadorId === indicadorId && item.ano === ano)
      .sort((a, b) => a.mes - b.mes);

    ordered.forEach((lancamento) => {
      const ateMes = ordered.filter((item) => item.mes <= lancamento.mes);
      const resultado = IndicatorFormulas.calcularIndicador(indicador, regra, lancamento, ateMes);
      if (!resultado.erro) {
        lancamento.resultadoMensal = resultado.resultadoMensal;
        lancamento.percentualAtingido = resultado.percentualAtingidoMensal;
        lancamento.percentualAtingidoMensal = resultado.percentualAtingidoMensal;
        lancamento.resultadoAcumulado = resultado.resultadoAcumulado;
        lancamento.percentualAtingidoAcumulado = resultado.percentualAtingidoAcumulado;
        lancamento.percentualAtingidoAnual = resultado.percentualAtingidoAnual;
        lancamento.resultadoOficialAnual = resultado.resultadoOficialAnual;
        lancamento.situacaoCalculada = resultado.situacao || getCalculatedSituation(resultado.percentualAtingidoAnual ?? resultado.percentualAtingidoMensal);
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
    document.getElementById("launchJustificativa").value = "";
    document.getElementById("launchObservacaoArea").value = "";
    document.getElementById("launchEvidencia").value = "";
    document.querySelectorAll(".dynamic-entry-field").forEach((input) => {
      input.value = "";
    });
    updateCalculatedPreview();
  }

  function refresh() {
    fillFilters(state.lancamentos);
    renderTable(getFilteredLaunches());
  }

  function bindEvents() {
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => renderTable(getFilteredLaunches()));
    });

    document.getElementById("lancamentosTable").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button) return;
      state.selectedId = Number(button.dataset.id);
      renderEditor();
      document.getElementById("launchEditorPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    ["launchRealizado", "launchPercentualManual"].forEach((id) => {
      document.getElementById(id).addEventListener("input", updateCalculatedPreview);
    });

    document.getElementById("dynamicInputFields").addEventListener("input", updateCalculatedPreview);

    document.getElementById("saveDraftButton").addEventListener("click", () => persistLaunch("draft"));
    document.getElementById("sendApprovalButton").addEventListener("click", () => persistLaunch("send"));
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
      lancamentos: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      selectedId: null
    };

    document.getElementById("launchNotice").textContent =
      "Preencha os campos exigidos pela regra do indicador. O sistema usa a matriz de regras e o motor central de cálculo.";

    bindEvents();
    refresh();
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.lancamentos = { init };
})();
