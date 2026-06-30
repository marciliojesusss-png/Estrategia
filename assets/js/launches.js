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
    return lancamento && (EDITABLE_STATUSES.includes(lancamento.status) || lancamento.revisaoMoedaPendente === true);
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
    return regra?.tipoCalculo === "indice_inverso" && regra?.indicadorId === 6;
  }

  function canAdjustOfficialPerformance() {
    return ["Administrador", "GERIN"].includes(state.user?.perfil);
  }

  function getMetaLabel(regra) {
    if (regra?.tipoCalculo === "participacao_ecossistema_com_cenarios") return "Meta trimestral 2026";
    if (regra?.tipoCalculo === "incremento_rede_loterica_base_2025") return "Meta trimestral de incremento";
    if (regra?.tipoCalculo === "crescimento_comparado_base_2025") return "Meta em indice (110% da base 2025)";
    if (regra?.tipoCalculo === "crescimento_rede_loterica_base_2025") return "Meta em indice (102% da base 2025)";
    if (isIeoRule(regra)) return "Meta de referência da competência";
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

  function getDisplayMeta(regra, lancamento) {
    if (regra?.tipoCalculo === "participacao_ecossistema_com_cenarios") {
      const curve = getEcossistemaCurveForLaunch(regra, lancamento, lancamento?.camposEntrada?.cenarioApuracaoEcossistema);
      return curve ? curve.meta2026 / 100 : lancamento.metaMensal ?? regra?.metaAnualValor;
    }
    if (regra?.tipoCalculo === "incremento_rede_loterica_base_2025") {
      const curve = getRedeLotericaCurveForLaunch(regra, lancamento);
      return curve ? curve.metaIncremento / 100 : lancamento.metaMensal ?? regra?.metaAnualValor;
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

  function formatDisplayMeta(regra, lancamento) {
    const meta = getDisplayMeta(regra, lancamento);
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
    return values;
  }

  function formatEntryValue(field, value) {
    if (field.tipo === "moeda" && value !== "") return CurrencyBR.formatarMoedaBR(value).replace(/^R\$\s?/, "");
    return value ?? "";
  }

  function renderEntryInput(field, value, extra = "") {
    if (field.tipo === "selecao") {
      const options = field.opcoes || [];
      return `
        <label>${escapeHtml(field.rotulo || field.nome)}
          <select
            class="dynamic-entry-field"
            data-entry-field="${escapeHtml(field.nome)}"
            data-entry-type="texto"
            ${field.obrigatorio ? "required" : ""}
            ${extra}
          >
            ${options.map((option) => {
              const label = typeof option === "string" ? option : option.label;
              const optionValue = typeof option === "string" ? option : option.value ?? option.id ?? option.label;
              const selected = [optionValue, label].some((candidate) => String(value || "") === String(candidate));
              return `<option value="${escapeHtml(optionValue)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
            }).join("")}
          </select>
        </label>
      `;
    }
    return `
      <label>${escapeHtml(field.rotulo || field.nome)}
        <input
          class="dynamic-entry-field"
          data-entry-field="${escapeHtml(field.nome)}"
          data-entry-type="${escapeHtml(field.tipo || "numero")}"
          type="${field.tipo === "texto" || field.tipo === "moeda" ? "text" : field.tipo === "data" ? "date" : "number"}"
          ${field.tipo === "moeda" ? "inputmode=\"decimal\" placeholder=\"0,00\"" : field.tipo === "texto" || field.tipo === "data" ? "" : "step=\"any\""}
          value="${escapeHtml(formatEntryValue(field, value))}"
          ${field.obrigatorio ? "required" : ""}
          ${field.somenteLeitura ? "readonly" : ""}
          ${extra}
        >
      </label>
    `;
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
      const actionLabel = item.status === "Devolvido para ajuste"
        ? "Editar"
        : isEditable(item)
          ? "Preencher"
          : "Visualizar";
      const resultadoMensal = item.resultadoMensal ?? item.realizadoMensal;
      const situacao = item.situacaoCalculada || getCalculatedSituation(item.percentualAtingido ?? item.percentualAtingidoMensal);
      return `
        <tr>
          <td>${escapeHtml(indicador ? indicador.indicador : item.indicadorId)}</td>
          <td>${escapeHtml(item.nomeMes)}/${escapeHtml(item.ano)}</td>
          <td>${escapeHtml(formatDisplayMeta(regra, item))}</td>
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
    document.querySelectorAll(".dynamic-entry-field, .dynamic-entry-toggle").forEach((input) => {
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
    if (isIeoRule(regra)) {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("percentualAnualWrapper").hidden = true;
    }

    document.getElementById("launchResultadoMensalLabel").textContent = isIeoRule(regra)
      ? "IEO calculado da competência"
      : regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
        ? "Incremento percentual"
      : ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)
        ? "Indice 2026/2025"
      : isOfertasPersonalizadasIndicator(indicador, regra)
        ? "Resultado da competência"
      : "Resultado mensal";
    document.getElementById("launchPercentualCalculadoLabel").textContent = isIeoRule(regra)
      ? "% atingido"
      : regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
        ? "% atingido"
      : ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)
        ? "% atingido da meta"
      : "% da meta atingida mensal";
    document.getElementById("launchResultadoAcumuladoLabel").textContent = isIeoRule(regra)
      ? "Posição acumulada até a competência"
      : regra?.tipoCalculo === "incremento_rede_loterica_base_2025"
        ? "Incremento oficial do indicador"
      : ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo)
        ? "Indice acumulado 2026/2025"
      : isOfertasPersonalizadasIndicator(indicador, regra)
        ? "Resultado oficial do indicador"
      : "Resultado oficial anual";
    document.getElementById("launchSituacaoCalculadaLabel").textContent = isIeoRule(regra)
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
    if (isIeoRule(regra)) {
      const mainFields = [
        { nome: "despesaPessoalMes", rotulo: "Despesa de pessoal", tipo: "moeda", obrigatorio: true },
        { nome: "despesasAdministrativasMes", rotulo: "Despesas administrativas", tipo: "moeda", obrigatorio: true },
        { nome: "receitasLiquidasMes", rotulo: "Receitas líquidas", tipo: "moeda", obrigatorio: true }
      ];
      const directChecked = values.ieoApuradoInformado !== "" && values.ieoApuradoInformado !== null && values.ieoApuradoInformado !== undefined;
      const admin = canAdjustOfficialPerformance();
      document.getElementById("dynamicInputFields").innerHTML = `
        ${mainFields.map((field) => renderEntryInput(field, values[field.nome] ?? "")).join("")}
        <label class="full-span">
          <input id="ieoDirectToggle" class="dynamic-entry-toggle" type="checkbox" ${directChecked ? "checked" : ""}>
          Informar IEO apurado diretamente pela unidade?
        </label>
        <div id="ieoDirectFieldWrapper" class="full-span" ${directChecked ? "" : "hidden"}>
          <p class="notice">Use este campo apenas quando a unidade responsável possuir o índice oficial já apurado e validado.</p>
          ${renderEntryInput(
            { nome: "ieoApuradoInformado", rotulo: "IEO apurado pela unidade", tipo: "percentual", obrigatorio: false },
            values.ieoApuradoInformado ?? "",
            directChecked ? "" : "disabled"
          )}
        </div>
        ${admin ? `
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
    document.getElementById("dynamicInputFields").innerHTML = (regra.camposEntrada || []).map((field) => `
      ${renderEntryInput(field, values[field.nome] ?? "")}
    `).join("");
    updateEcossistemaCurveFields(regra, lancamento);
    updateRedeLotericaCurveFields(regra, lancamento);
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

  function renderFormulaDetails(resultado) {
    const wrapper = document.getElementById("formulaDetailsWrapper");
    const target = document.getElementById("formulaDetails");
    const details = [];

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
    if (resultado.metaTrimestral !== undefined) {
      details.push(["Meta trimestral de incremento", Calculations.formatarPercentual(resultado.metaTrimestral)]);
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
      details.push(["Meta mensal de referência", Calculations.formatarValor(resultado.metaReferenciaMensal, resultado.unidadeMedida)]);
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
    document.getElementById("launchMeta").value = formatDisplayMeta(regra, lancamento);
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
    document.getElementById("sendApprovalButton").textContent =
      lancamento.status === "Devolvido para ajuste" ? "Reenviar para homologação" : "Enviar para homologação";
    const requestButton = document.getElementById("requestReopenButton");
    requestButton.hidden = !(lancamento.status === "Homologado" && state.user.perfil === "Unidade Apuradora");
    requestButton.disabled = Boolean(lancamento.solicitacaoReabertura?.status === "Pendente");
    requestButton.textContent = requestButton.disabled ? "Reabertura solicitada" : "Solicitar reabertura";

    if (!isEditable(lancamento)) {
      showMessage(`Lançamento com status "${lancamento.status}" está bloqueado para edição.`, "warning");
    } else if (lancamento.revisaoMoedaPendente) {
      showMessage("Este lançamento possui valor monetário antigo possivelmente reduzido. Confira e informe novamente os valores completos antes de salvar.", "warning");
    }
  }

  function collectEntryValues() {
    const values = {};
    document.querySelectorAll(".dynamic-entry-field").forEach((input) => {
      if (input.disabled) return;
      const type = input.dataset.entryType || "numero";
      if (type === "numero") {
        values[input.dataset.entryField] = input.value === "" ? "" : toNumberOrNull(input.value);
        return;
      }
      if (type === "moeda") {
        values[input.dataset.entryField] = input.value === "" ? "" : CurrencyBR.parseMoedaBR(input.value);
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
    const camposEntrada = {
      ...(lancamento.camposEntrada || {}),
      ...collectEntryValues()
    };
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
    if (isIeoRule(result.regra)) {
      document.getElementById("percentualMensalWrapper").hidden = false;
      document.getElementById("percentualAnualWrapper").hidden = true;
      document.getElementById("launchPercentualCalculadoLabel").textContent = "% atingido";
    }
    document.getElementById("launchResultadoMensal").value = result.resultado.resultadoMensalFormatado || Calculations.formatarValor(result.resultado.resultadoMensal, result.resultado.unidadeMedida);
    document.getElementById("launchPercentualCalculado").value = isIeoRule(result.regra) && result.resultado.percentualAtingidoMensal === null
      ? "Sem cálculo"
      : result.resultado.percentualAtingidoMensalFormatado || Calculations.formatarPercentual(result.resultado.percentualAtingidoMensal);
    document.getElementById("launchResultadoAcumulado").value = result.resultado.resultadoOficialAnualFormatado || Calculations.formatarValor(result.resultado.resultadoOficialAnual, result.resultado.unidadeMedida);
    document.getElementById("launchPercentualAcumulado").value = result.resultado.percentualAtingidoAnualFormatado || Calculations.formatarPercentual(result.resultado.percentualAtingidoAnual);
    document.getElementById("launchSituacaoCalculada").value = result.resultado.situacao || getCalculatedSituation(result.resultado.percentualAtingidoAnual ?? result.resultado.percentualAtingidoMensal);
    if (result.resultado.erro) {
      document.getElementById("launchResultadoMensal").value = "-";
      document.getElementById("launchPercentualCalculado").value = "-";
      document.getElementById("launchResultadoAcumulado").value = "-";
      document.getElementById("launchPercentualAcumulado").value = "-";
      document.getElementById("launchSituacaoCalculada").value = "Sem cálculo";
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

    if (
      action === "send" &&
      regra.tipoCalculo === "razao_pix" &&
      !result.camposEntrada.arrecadacaoTotalCanaisEletronicosMes
    ) {
      showMessage("Informe a arrecadação total nos canais eletrônicos antes de enviar para homologação.", "warning");
      return false;
    }
    if (
      action === "send" &&
      regra.tipoCalculo === "razao_canais_digitais" &&
      !result.camposEntrada.arrecadacaoTotalProdutosLoteriasMes
    ) {
      showMessage("Informe a arrecadação total dos produtos de loterias antes de enviar para homologação.", "warning");
      return false;
    }
    if (
      action === "send" &&
      isIeoRule(regra) &&
      (result.resultado.resultadoMensal === null || result.resultado.resultadoMensal === undefined)
    ) {
      showMessage("Informe despesa de pessoal, despesas administrativas e receitas líquidas para calcular o IEO antes de enviar.", "warning");
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
      mensagemCalculo: calculation.resultado.mensagem,
      revisaoMoedaPendente: false
    };

    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? updated : item);
    recomputeAccumulatedForIndicator(indicador.id, updated.ano);
    const mergedLaunches = mergeScopedLaunches();
    state.data.lancamentos = mergedLaunches;
    await DataStore.salvarLancamentos(mergedLaunches);
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
    const ieoDirectToggle = document.getElementById("ieoDirectToggle");
    if (ieoDirectToggle) {
      ieoDirectToggle.checked = false;
      updateIeoOptionalVisibility();
    }
    updateCalculatedPreview();
  }

  async function requestReopening() {
    const launch = getSelectedLaunch();
    if (!launch || launch.status !== "Homologado" || state.user.perfil !== "Unidade Apuradora") return;
    const updated = {
      ...launch,
      solicitacaoReabertura: {
        status: "Pendente",
        solicitadaPor: state.user.email || state.user.nome,
        dataSolicitacao: new Date().toISOString()
      }
    };
    state.lancamentos = state.lancamentos.map((item) => item.id === updated.id ? updated : item);
    const mergedLaunches = mergeScopedLaunches();
    state.data.lancamentos = mergedLaunches;
    await DataStore.salvarLancamentos(mergedLaunches);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: "solicitacao_reabertura_lancamento",
      entidade: "lancamentos",
      registroId: updated.id,
      valorAnterior: launch.solicitacaoReabertura || null,
      valorNovo: updated.solicitacaoReabertura
    });
    showMessage("Solicitação de reabertura registrada para análise da diretoria.", "info");
    renderEditor();
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
    document.getElementById("dynamicInputFields").addEventListener("change", (event) => {
      if (event.target.id === "ieoDirectToggle") updateIeoOptionalVisibility();
      if (event.target.dataset.entryField === "marcoAlcancadoTIC") {
        updateCapacidadeTicPercentual(event.target.value);
      }
      const lancamento = getSelectedLaunch();
      const indicador = lancamento && getIndicatorMap()[lancamento.indicadorId];
      if (indicador) {
        const regra = getRule(indicador);
        updateEcossistemaCurveFields(regra, lancamento);
        updateRedeLotericaCurveFields(regra, lancamento);
      }
      updateCalculatedPreview();
    });

    document.getElementById("saveDraftButton").addEventListener("click", () => persistLaunch("draft"));
    document.getElementById("sendApprovalButton").addEventListener("click", () => persistLaunch("send"));
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
      lancamentos: Auth.filterLaunchesByUser(data.lancamentos, data.indicadores, user),
      selectedId: null
    };

    document.getElementById("launchNotice").textContent =
      "Preencha os campos exigidos pela regra do indicador. O sistema usa a matriz de regras e o motor central de cálculo.";

    bindEvents();
    refresh();

    const requestedId = Number(new URLSearchParams(window.location.search).get("lancamentoId"));
    if (requestedId && state.lancamentos.some((item) => item.id === requestedId)) {
      state.selectedId = requestedId;
      renderEditor();
      document.getElementById("launchEditorPanel").scrollIntoView({ block: "start" });
    }
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.lancamentos = { init };
})();
