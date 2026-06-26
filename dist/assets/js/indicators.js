(function () {
  const TIPOS_CALCULO = [
    "percentual_direto",
    "percentual_inverso",
    "razao_canais_digitais",
    "razao_pix",
    "valor_acumulado",
    "media_percentual",
    "projeto_percentual",
    "projeto_binario",
    "manual_homologado",
    "qualitativo",
    "personalizado"
  ];

  const UNIDADES_MEDIDA = ["percentual", "moeda", "numero", "texto"];

  let state = {
    data: null,
    user: null,
    indicadores: [],
    selectedId: null,
    editMode: false
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

  function canEdit() {
    return state.user && state.user.perfil === "Administrador";
  }

  function showMessage(message, type = "info") {
    const target = document.getElementById("indicatorMessage");
    target.className = `notice ${type}`;
    target.textContent = message;
    target.hidden = false;
  }

  function scopedIndicators() {
    return Auth.filterIndicatorsByUser(state.indicadores, state.user);
  }

  function fillOptions(select, values, selectedValue, includeEmpty = false) {
    const options = includeEmpty ? ["", ...values] : values;
    select.innerHTML = options.map((value) => {
      const label = value || "Não informado";
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }).join("");
    select.value = selectedValue || "";
  }

  function fillFilters(indicadores) {
    const values = {
      plano: ["Todos", ...unique(indicadores.map((item) => item.plano))],
      pilar: ["Todos", ...unique(indicadores.map((item) => item.pilar))],
      unidade: ["Todos", ...unique(indicadores.map((item) => item.unidadeApuradora))],
      diretoria: ["Todos", ...unique(indicadores.map((item) => item.diretoriaResponsavel))]
    };

    document.querySelectorAll("[data-filter]").forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = values[select.dataset.filter].map((value) => `<option>${escapeHtml(value)}</option>`).join("");
      if (values[select.dataset.filter].includes(currentValue)) {
        select.value = currentValue;
      }
      if (state.user.perfil === "Unidade Apuradora" && select.dataset.filter === "unidade") {
        select.value = state.user.unidadeApuradora || "Todos";
        select.disabled = true;
      }
      if (state.user.perfil === "Diretoria Homologadora" && select.dataset.filter === "diretoria") {
        select.value = state.user.diretoriaResponsavel || "Todos";
        select.disabled = true;
      }
    });
  }

  function getFilteredIndicators() {
    const indicadores = scopedIndicators();
    const values = Object.fromEntries(
      [...document.querySelectorAll("[data-filter]")].map((select) => [select.dataset.filter, select.value])
    );

    return indicadores.filter((item) => (
      (values.plano === "Todos" || item.plano === values.plano) &&
      (values.pilar === "Todos" || item.pilar === values.pilar) &&
      (values.unidade === "Todos" || item.unidadeApuradora === values.unidade) &&
      (values.diretoria === "Todos" || item.diretoriaResponsavel === values.diretoria)
    ));
  }

  function renderTable(indicadores) {
    const target = document.getElementById("indicadoresTable");
    document.getElementById("indicatorCount").textContent = `${indicadores.length} indicador(es) exibido(s)`;

    if (!indicadores.length) {
      target.innerHTML = '<tr><td colspan="8">Nenhum indicador encontrado para os filtros selecionados.</td></tr>';
      return;
    }

    target.innerHTML = indicadores.map((item) => `
      <tr>
        <td>${escapeHtml(item.numero)}</td>
        <td><strong>${escapeHtml(item.indicador)}</strong><br><small>${escapeHtml(item.metaAnualDescricao)}</small></td>
        <td>${escapeHtml(item.plano)}</td>
        <td>${escapeHtml(item.pilar)}</td>
        <td>${escapeHtml(item.unidadeApuradora || "Não informado")}</td>
        <td>${escapeHtml(item.diretoriaResponsavel || "Não informado")}</td>
        <td><span class="badge info">${escapeHtml(item.tipoCalculo)}</span></td>
        <td>
          <div class="row-actions">
            <button class="secondary-action table-action" type="button" data-action="view" data-id="${item.id}">Ver</button>
            ${canEdit() ? `<button class="secondary-action table-action" type="button" data-action="edit" data-id="${item.id}">Editar</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderDetail(indicador) {
    const panel = document.getElementById("indicatorDetailPanel");
    const readOnly = document.getElementById("indicatorReadOnly");
    const form = document.getElementById("indicatorForm");

    if (!indicador) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    document.getElementById("detailTitle").textContent = indicador.indicador;
    document.getElementById("detailBadge").textContent = indicador.ativo ? "Ativo" : "Inativo";

    readOnly.hidden = state.editMode;
    document.getElementById("indicatorTracking").hidden = state.editMode;
    form.hidden = !state.editMode;

    if (state.editMode) {
      fillForm(indicador);
      return;
    }

    readOnly.innerHTML = [
      ["Número", indicador.numero],
      ["Plano", indicador.plano],
      ["Pilar estratégico", indicador.pilar],
      ["Periodicidade", indicador.periodicidade],
      ["Unidade apuradora", indicador.unidadeApuradora || "Não informado"],
      ["Diretoria responsável", indicador.diretoriaResponsavel || "Não informado"],
      ["Tipo de cálculo", indicador.tipoCalculo],
      ["Unidade de medida", indicador.unidadeMedida],
      ["Meta anual", indicador.metaAnualDescricao, true],
      ["Métrica/Fórmula de referência", indicador.metrica, true],
      ...(Number(indicador.id) === 8 ? [[
        "Observação de acompanhamento",
        "A meta de 28,05% corresponde ao percentual de referência de 2025, de 23,05%, acrescido de 5 pontos percentuais, conforme informe de acompanhamento. O resultado mensal, trimestral e anual é calculado pela razão entre a arrecadação dos canais eletrônicos e a arrecadação total dos produtos de loterias no período.",
        true
      ]] : [])
    ].map(([label, value, full]) => `
      <article class="detail-item ${full ? "full-span" : ""}">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
    renderIndicatorTracking(indicador);
  }

  function getRule(indicador) {
    return IndicatorFormulas.obterRegra(indicador, state.data.regrasIndicadores || []);
  }

  function formatPerformance(value, rule) {
    if (rule?.tipoCalculo !== "razao_canais_digitais") return Calculations.formatarPercentual(value);
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
    return `${(Number(value) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }

  function monthlyAction(lancamento) {
    if (!lancamento) return "-";
    const page = ["Enviado para homologação", "Homologado"].includes(lancamento.status) &&
      ["Administrador", "Diretoria Homologadora"].includes(state.user.perfil)
      ? "homologacao.html"
      : "lancamentos.html";
    return `<a class="secondary-action table-action dashboard-action" href="${page}?lancamentoId=${lancamento.id}">Visualizar</a>`;
  }

  function renderIndicatorTracking(indicador) {
    const regra = getRule(indicador);
    const isPix = Number(indicador.id) === 9;
    const isDigitalChannels = Number(indicador.id) === 8;
    const launches = state.data.lancamentos
      .filter((item) => item.indicadorId === indicador.id && Number(item.ano) === 2026)
      .sort((a, b) => Number(a.mes) - Number(b.mes));
    const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

    document.getElementById("indicatorMonthlyHeader").innerHTML = isPix ? `
      <th>Mês</th>
      <th>Arrecadação com PIX no mês</th>
      <th>Arrecadação total nos canais eletrônicos</th>
      <th>Resultado mensal</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isDigitalChannels ? `
      <th>Mês</th>
      <th>Arrecadação total nos canais eletrônicos</th>
      <th>Arrecadação total dos produtos de loterias</th>
      <th>Resultado mensal</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : `
      <th>Mês</th>
      <th>Meta mensal/referência</th>
      <th>Realizado mensal</th>
      <th>Resultado mensal</th>
      <th>Status mensal</th>
      <th>Ação</th>
    `;

    document.getElementById("indicatorMonthlyComposition").innerHTML = QuarterlyConsolidation.MONTHS.map(([month, name]) => {
      const launch = byMonth[month];
      const digitalNumerator = Calculations.parseMoedaBR(launch?.camposEntrada?.arrecadacaoCanaisEletronicosMes);
      const digitalDenominator = Calculations.parseMoedaBR(launch?.camposEntrada?.arrecadacaoTotalProdutosLoteriasMes);
      const result = isDigitalChannels
        ? digitalDenominator > 0 && digitalNumerator !== null ? digitalNumerator / digitalDenominator : null
        : launch?.resultadoMensal ?? launch?.realizadoMensal;
      return `
        <tr>
          <td>${name}/2026</td>
          <td>${isPix
            ? Calculations.formatarValor(launch?.camposEntrada?.arrecadacaoPixMes, "moeda")
            : isDigitalChannels
              ? Calculations.formatarValor(launch?.camposEntrada?.arrecadacaoCanaisEletronicosMes, "moeda")
              : Calculations.formatarValor(launch?.metaMensal ?? regra.metaAnualValor, regra.unidadeMedida)}</td>
          <td>${isPix
            ? Calculations.formatarValor(launch?.camposEntrada?.arrecadacaoTotalCanaisEletronicosMes, "moeda")
            : isDigitalChannels
              ? Calculations.formatarValor(launch?.camposEntrada?.arrecadacaoTotalProdutosLoteriasMes, "moeda")
              : Calculations.formatarValor(launch?.realizadoMensal, regra.unidadeMedida)}</td>
          <td>${Calculations.formatarValor(result, regra.unidadeMedida)}</td>
          <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
          <td>${monthlyAction(launch)}</td>
        </tr>
      `;
    }).join("");

    const quarters = QuarterlyConsolidation.consolidarAno(indicador, regra, launches, 2026);
    document.getElementById("indicatorQuarterlyComposition").innerHTML = quarters.map((quarter) => `
      <tr>
        <td>
          <strong>${quarter.trimestre}</strong>
          <small class="quarter-message">${escapeHtml(quarter.mensagem)}</small>
        </td>
        <td>${quarter.mesesHomologados} de ${quarter.mesesEsperados}</td>
        <td>${Calculations.formatarValor(quarter.metaTrimestral, regra.unidadeMedida)}</td>
        <td>
          ${Calculations.formatarValor(quarter.resultadoCalculadoTrimestral, regra.unidadeMedida)}
          ${isPix && quarter.pixAcumuladoTrimestre != null
            ? `<small class="quarter-message">PIX: ${Calculations.formatarMoedaBR(quarter.pixAcumuladoTrimestre)}<br>Canais: ${Calculations.formatarMoedaBR(quarter.canaisAcumuladoTrimestre)}</small>`
            : isDigitalChannels && quarter.canaisDigitaisAcumuladoTrimestre != null
              ? `<small class="quarter-message">Canais eletrônicos: ${Calculations.formatarMoedaBR(quarter.canaisDigitaisAcumuladoTrimestre)}<br>Produtos de loterias: ${Calculations.formatarMoedaBR(quarter.produtosLoteriasAcumuladoTrimestre)}</small>`
            : ""}
        </td>
        <td>${Calculations.formatarValor(quarter.resultadoOficialApresentado, regra.unidadeMedida)}</td>
        <td>${formatPerformance(quarter.desempenhoTrimestral, regra)}</td>
        <td>${escapeHtml(quarter.situacaoTrimestral)}</td>
        <td><span class="badge ${quarter.statusTrimestre === "Fechado" ? "ok" : quarter.statusTrimestre === "Parcial" ? "warn" : "info"}">${quarter.statusTrimestre}</span></td>
      </tr>
    `).join("");
  }

  function fillForm(indicador) {
    const form = document.getElementById("indicatorForm");
    form.reset();

    document.getElementById("indicatorId").value = indicador.id;
    document.getElementById("fieldNumero").value = indicador.numero;
    document.getElementById("fieldIndicador").value = indicador.indicador;
    document.getElementById("fieldPeriodicidade").value = indicador.periodicidade;
    document.getElementById("fieldMetaAnual").value = indicador.metaAnualDescricao;
    document.getElementById("fieldMetrica").value = indicador.metrica;
    document.getElementById("fieldAtivo").value = String(Boolean(indicador.ativo));

    fillOptions(document.getElementById("fieldPlano"), state.data.planos.map((item) => item.sigla), indicador.plano);
    fillOptions(document.getElementById("fieldPilar"), state.data.pilares.map((item) => item.nome), indicador.pilar);
    fillOptions(document.getElementById("fieldUnidade"), state.data.unidades.map((item) => item.sigla), indicador.unidadeApuradora, true);
    fillOptions(document.getElementById("fieldDiretoria"), state.data.diretorias.map((item) => item.sigla), indicador.diretoriaResponsavel, true);
    fillOptions(document.getElementById("fieldTipoCalculo"), TIPOS_CALCULO, indicador.tipoCalculo);
    fillOptions(document.getElementById("fieldUnidadeMedida"), UNIDADES_MEDIDA, indicador.unidadeMedida);
  }

  function getSelectedIndicator() {
    return state.indicadores.find((item) => item.id === state.selectedId);
  }

  function refresh() {
    const visible = scopedIndicators();
    fillFilters(visible);
    const filtered = getFilteredIndicators();
    renderTable(filtered);

    if (state.selectedId && !visible.some((item) => item.id === state.selectedId)) {
      state.selectedId = null;
      state.editMode = false;
    }

    renderDetail(getSelectedIndicator());
  }

  async function saveIndicator(event) {
    event.preventDefault();
    const id = Number(document.getElementById("indicatorId").value);
    const original = state.indicadores.find((item) => item.id === id);
    if (!original) return;

    const numero = Number(document.getElementById("fieldNumero").value);
    const duplicate = state.indicadores.find((item) => item.id !== id && Number(item.numero) === numero);
    if (duplicate) {
      showMessage(`Já existe indicador com o número ${numero}.`, "warning");
      return;
    }

    const updated = {
      ...original,
      numero,
      indicador: document.getElementById("fieldIndicador").value.trim(),
      plano: document.getElementById("fieldPlano").value,
      pilar: document.getElementById("fieldPilar").value,
      periodicidade: document.getElementById("fieldPeriodicidade").value.trim(),
      unidadeApuradora: document.getElementById("fieldUnidade").value,
      diretoriaResponsavel: document.getElementById("fieldDiretoria").value,
      tipoCalculo: document.getElementById("fieldTipoCalculo").value,
      unidadeMedida: document.getElementById("fieldUnidadeMedida").value,
      ativo: document.getElementById("fieldAtivo").value === "true",
      metaAnualDescricao: document.getElementById("fieldMetaAnual").value.trim(),
      metrica: document.getElementById("fieldMetrica").value.trim()
    };

    state.indicadores = state.indicadores.map((item) => item.id === id ? updated : item);
    await DataStore.saveLocal("indicadores", state.indicadores);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: "alteracao_indicador",
      entidade: "indicadores",
      registroId: id,
      valorAnterior: original,
      valorNovo: updated
    });

    state.editMode = false;
    showMessage("Cadastro do indicador salvo em armazenamento local.", "info");
    refresh();
  }

  function bindEvents() {
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", refresh);
    });

    document.getElementById("indicadoresTable").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      state.selectedId = Number(button.dataset.id);
      state.editMode = button.dataset.action === "edit" && canEdit();
      renderDetail(getSelectedIndicator());
      document.getElementById("indicatorDetailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("indicatorForm").addEventListener("submit", saveIndicator);

    document.getElementById("cancelIndicatorEdit").addEventListener("click", () => {
      state.editMode = false;
      renderDetail(getSelectedIndicator());
    });

    document.getElementById("resetIndicatorData").addEventListener("click", () => {
      const confirmed = window.confirm("Restaurar os indicadores originais da planilha? Alterações locais de cadastro serão descartadas.");
      if (!confirmed) return;
      localStorage.removeItem("caixaLoterias:indicadores");
      window.location.reload();
    });
  }

  async function init({ data, user }) {
    state = {
      data,
      user,
      indicadores: data.indicadores,
      selectedId: null,
      editMode: false
    };

    document.querySelectorAll(".admin-only").forEach((element) => {
      element.hidden = !canEdit();
    });

    bindEvents();
    refresh();

    const requestedId = Number(new URLSearchParams(window.location.search).get("indicadorId"));
    if (requestedId && state.indicadores.some((item) => item.id === requestedId)) {
      state.selectedId = requestedId;
      renderDetail(getSelectedIndicator());
      document.getElementById("indicatorDetailPanel").scrollIntoView({ block: "start" });
    }
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.indicadores = { init };
})();
