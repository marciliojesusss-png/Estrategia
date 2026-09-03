(function () {
  const TIPOS_CALCULO = [
    "percentual_direto",
    "percentual_inverso",
    "razao_canais_digitais",
    "razao_pix",
    "valor_acumulado",
    "media_percentual",
    "projeto_percentual",
    "projeto_marco_entrega",
    "nota_pesquisa_nps",
    "nota_pesquisa_anual",
    "cobertura_capacitacao",
    "cobertura_capacitacao_jogo_responsavel",
    "execucao_acoes_propostas",
    "projeto_binario",
    "manual_homologado",
    "qualitativo",
    "personalizado"
  ];

  const UNIDADES_MEDIDA = ["percentual", "moeda", "numero", "texto", "marco", "pontos"];

  let state = {
    data: null,
    user: null,
    indicadores: [],
    selectedId: null,
    selectedLaunchId: null,
    editMode: false,
    institutionalDetail: null
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

  function launchDocumentation(regra, lancamento) {
    if (window.DocumentationFields) return DocumentationFields.resolve(regra, lancamento);
    return {
      reference: lancamento?.referenciaEvidencia || lancamento?.linkEvidencia || "",
      observation: lancamento?.observacaoArea || ""
    };
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isUsuarioCompanhiaProfile(perfil) {
    if (window.Auth?.isUsuarioCompanhia?.(perfil)) return true;
    const value = normalizeText(perfil).replace(/\s+/g, " ");
    return value === "usuario da companhia" ||
      value === "usuario companhia" ||
      value === "usuario_companhia" ||
      value === "consulta institucional" ||
      value === "consulta_institucional";
  }

  function requestedIndicatorId() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("id") || params.get("indicadorId"));
  }

  function requestedLaunchId() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("lancamentoId"));
  }

  function isRouteDetailMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") === "detalhe" || Boolean(params.get("id") || params.get("indicadorId") || params.get("lancamentoId"));
  }

  function requestedDetailScope() {
    return new URLSearchParams(window.location.search).get("escopo") === "geral" ? "geral" : "proprio";
  }

  function isGeneralDetailRequest() {
    const params = new URLSearchParams(window.location.search);
    return isRouteDetailMode() && params.get("origem") === "resumo-executivo" && requestedDetailScope() === "geral";
  }

  function detailBackTarget() {
    const params = new URLSearchParams(window.location.search);
    const origin = params.get("origem");
    const page = origin === "indicadores" ? "indicadores" : "resumo-executivo";
    const backParams = page === "resumo-executivo" && requestedDetailScope() === "geral"
      ? { escopo: "geral" }
      : undefined;
    return window.AppRoutes ? window.AppRoutes.page(page, backParams) : `/${page}${backParams ? "?escopo=geral" : ""}`;
  }

  async function loadInstitutionalDetail(indicatorId) {
    const baseTarget = typeof window.appUrl === "function"
      ? window.appUrl(`api/indicadores/${indicatorId}`)
      : `${window.APP_BASE_PATH || ""}/index.php?route=api/indicadores/${encodeURIComponent(indicatorId)}`;
    const target = `${baseTarget}${baseTarget.includes("?") ? "&" : "?"}escopo=geral`;
    const response = await window.fetch(target, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    const detailPayload = payload?.dados;
    const detail = window.LucroRecorrente?.normalizarDados({
      indicadores: detailPayload?.indicador ? [detailPayload.indicador] : [],
      regrasIndicadores: detailPayload?.regrasIndicadores || []
    }) || {};
    if (detailPayload) {
      detail.indicador = detail.indicadores?.[0] || detailPayload.indicador;
      detail.lancamentos = detailPayload.lancamentos;
      detail.consulta = detailPayload.consulta;
      detail.fonte = detailPayload.fonte;
    }
    if (!response.ok || payload?.sucesso === false || !detail?.indicador) {
      throw new Error(payload?.mensagem || "Não foi possível consultar o detalhe institucional.");
    }
    if (normalizeText(detail.fonte?.driver) !== "sqlsrv") {
      throw new Error("O detalhe institucional exige a fonte central SQL Server.");
    }
    if (detail.consulta?.escopo !== "geral") {
      throw new Error("O backend não confirmou o escopo institucional solicitado.");
    }
    return detail;
  }

  function mergeInstitutionalDetail(detail) {
    const indicatorId = Number(detail.indicador.id);
    const withoutIndicator = (state.indicadores || []).filter((item) => Number(item.id) !== indicatorId);
    const launches = (state.data.lancamentos || []).filter((item) => Number(item.indicadorId) !== indicatorId);
    const rules = (state.data.regrasIndicadores || []).filter((item) => Number(item.indicadorId) !== indicatorId);
    state.indicadores = [...withoutIndicator, detail.indicador];
    state.data = {
      ...state.data,
      indicadores: state.indicadores,
      lancamentos: [...launches, ...(detail.lancamentos || [])],
      regrasIndicadores: [...rules, ...(detail.regrasIndicadores || [])]
    };
    state.institutionalDetail = detail;
  }

  function isInstitutionalReadOnly() {
    return state.institutionalDetail?.consulta?.somenteLeitura === true;
  }

  function setIndicatorPageMode(indicador) {
    const detailMode = isRouteDetailMode() && Boolean(indicador);
    const eyebrow = document.getElementById("indicatorPageEyebrow");
    const title = document.getElementById("indicatorPageTitle");
    const description = document.getElementById("indicatorPageDescription");
    const filters = document.getElementById("indicatorCatalogFilters");
    const catalog = document.getElementById("indicatorCatalogPanel");
    const backButton = document.getElementById("backFromIndicatorDetail");

    if (eyebrow) eyebrow.textContent = detailMode ? "DETALHE DO INDICADOR" : "Cadastro e consulta";
    if (title) title.textContent = detailMode ? indicador.indicador : "Indicadores";
    if (description) {
      description.textContent = detailMode
        ? `Consulta metodológica, ${window.IndicatorPeriodicity?.compositionLabel(indicador).toLowerCase() || "composição mensal"} e histórico do indicador.`
        : "Catálogo metodológico dos indicadores estratégicos.";
    }
    if (filters) filters.hidden = detailMode;
    if (catalog) catalog.hidden = detailMode;
    if (backButton) backButton.hidden = !detailMode;
    document.body.classList.toggle("indicator-detail-mode", detailMode);
    document.title = detailMode ? `CAIXA Loterias | ${indicador.indicador}` : "CAIXA Loterias | Indicadores";
  }

  function canEdit() {
    return state.user && state.user.perfil === "Administrador" && !isInstitutionalReadOnly();
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
    const institutionalNotice = document.getElementById("indicatorInstitutionalNotice");
    setIndicatorPageMode(indicador);

    if (!indicador) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    if (institutionalNotice) institutionalNotice.hidden = !isInstitutionalReadOnly();
    document.getElementById("detailTitle").textContent = indicador.indicador;
    document.getElementById("detailBadge").textContent = indicador.ativo ? "Ativo" : "Inativo";

    readOnly.hidden = state.editMode;
    document.getElementById("indicatorTracking").hidden = state.editMode;
    document.getElementById("monthlyLaunchDetail").hidden = state.editMode || !state.selectedLaunchId;
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
      ...(Number(indicador.id) === 1 ? [[
        "Observacao de acompanhamento",
        "Este indicador mede a proporcao de clientes ativos identificaveis em canais eletronicos que receberam ofertas ou interacoes personalizadas. A unidade responsavel deve informar a base de clientes ativos identificaveis e a quantidade de clientes unicos alcancados por ofertas personalizadas ate a competencia. O sistema calcula automaticamente o percentual realizado.",
        true
      ]] : []),
      ...(Number(indicador.id) === 4 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha a implementacao de melhorias derivadas da pesquisa NPS de baseline. O plano de trabalho de 2026 possui 22 melhorias mapeadas. A meta anual corresponde a entrega de 6 melhorias, equivalente a 25% do plano. O resultado mensal e trimestral e calculado pela quantidade de melhorias implementadas e homologadas acumuladas no periodo.",
        true
      ]] : []),
      ...(Number(indicador.id) === 2 ? [[
        "Observacao de acompanhamento",
        "Considerando a baseline de 55 pontos e a diretriz de reducao de 20% do gap em relacao a nota de referencia 70, a meta correta para 2026 corresponde a NPS 58. O valor 55 representa a baseline e a referencia de acompanhamento do 1TRI/2026, nao a meta anual definitiva.",
        true
      ]] : []),
      ...(Number(indicador.id) === 12 ? [[
        "Observacao de acompanhamento",
        "Este indicador e apurado por pesquisa de clima organizacional. A meta anual e obter media geral igual ou superior a 60. Durante o exercicio, o sistema acompanha acoes preparatorias, planos de acao e posicoes de referencia. A efetividade sera avaliada apos a realizacao da nova pesquisa oficial.",
        true
      ]] : []),
      ...(Number(indicador.id) === 15 ? [[
        "Observacao de acompanhamento",
        "Este indicador mede a proporcao de dirigentes e empregados ativos com funcao, lotados na Companhia ha mais de 60 dias, que concluiram a quantidade minima de cursos exigida na Trilha de Desenvolvimento da CAIXA Loterias. A curva de 2026 considera 1 curso no 1TRI, 2 cursos no 2TRI, 4 cursos no 3TRI e 5 cursos no 4TRI, sempre com meta de cobertura de 90% do publico-alvo.",
        true
      ]] : []),
      ...(Number(indicador.id) === 21 ? [[
        "Observacao de acompanhamento",
        "Este indicador mede a cobertura de dirigentes e empregados ativos com funcao, lotados na Companhia ha mais de 60 dias, capacitados em iniciativas de disseminacao da cultura do Jogo Responsavel. A meta anual e atingir 90% do publico-alvo com pelo menos 2 iniciativas concluidas. No 1TRI/2026, a referencia considerada e 90% do publico-alvo com pelo menos 1 acao de disseminacao concluida.",
        true
      ]] : []),
      ...(Number(indicador.id) === 11 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha a ampliacao da capacidade de desenvolvimento de solucoes de TIC por meio de contratacao ou celebracao de parceria. A apuracao e realizada por marcos trimestrais: RFI, RFP, fase de selecao e contrato assinado. O percentual realizado decorre do marco alcancado e homologado.",
        true
      ]] : []),
      ...(Number(indicador.id) === 10 ? [[
        "Observacao de acompanhamento",
        "Em 2026, este indicador e acompanhado como marco de projeto, pois a meta do exercicio e a entrega de Piloto ou MVP da Plataforma de Jogos. A formula de share de mercado sera aplicavel futuramente, apos a implementacao da plataforma e disponibilidade de dados oficiais de GGR de mercado.",
        true
      ]] : []),
      ...(Number(indicador.id) === 5 ? [[
        "Observacao de acompanhamento",
        "Este indicador possui meta anual estrategica de >= R$ 15,6 bilhoes. A apuracao mensal e trimestral utiliza a curva acumulada de referencia por competencia. A unidade responsavel informa a arrecadacao total e os premios a pagar, e o sistema calcula automaticamente o GGR pela formula: Arrecadacao total menos premios a pagar.",
        true
      ]] : []),
      ...(Number(indicador.id) === 6 ? [[
        "Observacao de acompanhamento",
        "Este indicador possui regra inversa: quanto menor o indice, melhor o desempenho. A meta anual representa o limite maximo de eficiencia operacional recorrente. Assim, o indicador e considerado atingido quando o IEO realizado e menor ou igual a meta de referencia do periodo.",
        true
      ]] : []),      ...(Number(indicador.id) === 8 ? [[
        "Observação de acompanhamento",
        "A meta de 28,05% corresponde ao percentual de referência de 2025, de 23,05%, acrescido de 5 pontos percentuais, conforme informe de acompanhamento. O resultado mensal, trimestral e anual é calculado pela razão entre a arrecadação dos canais eletrônicos e a arrecadação total dos produtos de loterias no período.",
        true
      ]] : []),
      ...(Number(indicador.id) === 7 ? [[
        "Observacao de acompanhamento",
        "Este indicador é acompanhado mensalmente. A situação oficial de cada competência compara o lucro líquido recorrente realizado no mês com a meta mensal aprovada. O acumulado no ano permanece disponível apenas como informação gerencial secundária.",
        true
      ]] : []),
      ...(Number(indicador.id) === 17 ? [[
        "Observacao de acompanhamento",
        "Este indicador possui meta anual estrategica de >= R$ 10,4 bilhoes. A apuracao mensal e trimestral utiliza a curva acumulada por competencia. A unidade responsavel informa o valor acumulado de repasse social ate a competencia, e o sistema compara esse valor com a respectiva meta acumulada de referencia.",
        true
      ]] : []),
      ...(Number(indicador.id) === 18 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha a execucao de acoes de melhoria para os 10 elementos do RGF-WLA. O sistema conta elementos unicos atendidos, e nao a quantidade total de acoes. Um elemento e considerado atendido quando possui pelo menos uma acao concluida ou homologada com evidencia.",
        true
      ]] : []),
      ...(Number(indicador.id) === 16 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha o apoio a iniciativas com vocacao ao desenvolvimento socioambiental. A meta anual e apoiar 2 iniciativas. No 1TRI nao ha meta de entrega, pois os projetos encontram-se em fase de prospeccao e estruturacao. Apenas iniciativas com status Apoiada/realizada contam para o indicador.",
        true
      ]] : []),
      ...(Number(indicador.id) === 19 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha o valor investido em iniciativas de impacto socioambiental, considerando recursos previstos em leis de incentivo e/ou patrocinios. A meta anual e investir 0,33% do Lucro Liquido do ano. No 1TRI nao ha meta de investimento, pois os projetos encontram-se em fase de prospeccao e estruturacao. Apenas valores com status Investimento realizado contam para o indicador.",
        true
      ]] : []),
      ...(Number(indicador.id) === 20 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha a execucao de acoes institucionais de comunicacao e transparencia voltadas a visibilidade dos repasses sociais das Loterias CAIXA. Em 2026, as acoes propostas sao a publicacao do relatorio A Sorte em Numeros - 2025 e a realizacao de campanha publicitaria exclusiva sobre repasse social. No 1TRI, nao ha meta de publicacao, pois o relatorio encontra-se em elaboracao/homologacao. Apenas acoes com status Publicada/realizada contam para o indicador.",
        true
      ]] : []),
      ...(Number(indicador.id) === 22 ? [[
        "Observacao de acompanhamento",
        "Este indicador compara a arrecadacao gerada com o ecossistema em 2026 com a base equivalente de 2025. A meta e atingir ao menos 110% da base 2025 no mesmo periodo, sempre considerando competencias homologadas.",
        true
      ]] : []),
      ...(Number(indicador.id) === 23 ? [[
        "Observacao de acompanhamento",
        "Este indicador acompanha a arrecadacao gerada pela Rede Loterica em 2026, comparando o resultado com a base equivalente de 2025. A meta e obter incremento minimo de 2%, ou seja, alcancar pelo menos 102% da arrecadacao registrada no mesmo periodo do exercicio anterior. A comparacao deve sempre considerar periodos equivalentes.",
        true
      ]] : [])
    ].map(([label, value, full]) => `
      <article class="detail-item ${full ? "full-span" : ""}">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
    renderIndicatorTracking(indicador);
    renderLaunchDetail(indicador);
  }

  function getRule(indicador) {
    return IndicatorFormulas.obterRegra(indicador, state.data.regrasIndicadores || []);
  }

  function formatPerformance(value, rule) {
    if (rule?.tipoCalculo !== "razao_canais_digitais") return Calculations.formatarPercentual(value);
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
    return `${(Number(value) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }

  function indicatorDetailTarget(indicadorId, launchId = null) {
    const params = new URLSearchParams({
      view: "detalhe",
      id: String(indicadorId)
    });
    const current = new URLSearchParams(window.location.search);
    if (current.get("origem")) params.set("origem", current.get("origem"));
    if (current.get("escopo")) params.set("escopo", current.get("escopo"));
    if (launchId) params.set("lancamentoId", String(launchId));
    return window.AppRoutes ? window.AppRoutes.page("indicadores", params) : `/indicadores?${params.toString()}`;
  }

  function monthlyAction(lancamento) {
    if (!lancamento) return "-";
    return `<a class="secondary-action table-action dashboard-action" href="${indicatorDetailTarget(lancamento.indicadorId, lancamento.id)}">Visualizar</a>`;
  }

  function getSelectedLaunch() {
    if (!state.selectedLaunchId) return null;
    return (state.data.lancamentos || []).find((item) => Number(item.id) === Number(state.selectedLaunchId)) || null;
  }

  function formatEmpty(value, fallback = "-") {
    return value === null || value === undefined || value === "" ? fallback : value;
  }

  function humanizeFieldName(name) {
    return String(name || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  function formatInputValue(value, field = {}) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (field.tipo === "numero") return Calculations.formatarValor(value, "numero");
    if (field.tipo === "percentual") return Calculations.formatarValor(value, "percentual");
    if (field.tipo === "moeda") return Calculations.formatarValor(value, "moeda");
    if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function formatMeasureValue(value, unit) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "string" && Number.isNaN(Number(value))) return value;
    return Calculations.formatarValor(value, unit);
  }

  function launchCalculation(indicador, regra, lancamento) {
    if (!indicador || !regra || !lancamento) return null;
    const launches = (state.data.lancamentos || [])
      .filter((item) => (
        Number(item.indicadorId) === Number(indicador.id) &&
        Number(item.ano) === Number(lancamento.ano) &&
        Number(item.mes) <= Number(lancamento.mes)
      ))
      .sort((a, b) => Number(a.mes) - Number(b.mes));
    return calculateIndicatorForDisplay(indicador, regra, lancamento, launches);
  }

  function resolveMonthlyCalculation(calculated, launch) {
    return {
      resultadoMensal: calculated?.resultadoMensal ??
        calculated?.resultadoCalculado ??
        launch?.resultadoMensal ??
        launch?.resultadoCalculado ??
        launch?.resultadoOficialAnual ??
        launch?.resultadoOficial ??
        null,
      percentualAtingido: calculated?.percentualAtingidoMensal ??
        calculated?.percentualAtingido ??
        launch?.percentualAtingidoMensal ??
        launch?.percentualAtingido ??
        null,
      situacao: calculated?.situacao || launch?.situacaoCalculada || launch?.situacao || null
    };
  }

  function resolveAccumulatedCalculation(calculated, launch) {
    const monthly = resolveMonthlyCalculation(calculated, launch);
    return {
      metaReferencia: calculated?.metaAcumulada ??
        calculated?.metaReferenciaMensal ??
        calculated?.metaReferenciaPeriodo ??
        launch?.metaReferencia ??
        launch?.metaMensal ??
        null,
      resultadoAcumulado: calculated?.realizadoAcumulado ??
        calculated?.resultadoAcumulado ??
        calculated?.resultadoOficialAnual ??
        launch?.resultadoAcumulado ??
        launch?.resultadoOficialAnual ??
        launch?.resultadoOficial ??
        monthly.resultadoMensal,
      percentualAtingido: calculated?.percentualAtingidoAnual ??
        calculated?.percentualMetaAcumulada ??
        calculated?.percentualAtingidoAcumulado ??
        launch?.percentualAtingidoAnual ??
        launch?.percentualAtingidoAcumulado ??
        monthly.percentualAtingido,
      situacao: monthly.situacao
    };
  }

  function resolveAccumulatedGoalCalculation(calculated, launch) {
    const resolved = resolveAccumulatedCalculation(calculated, launch);
    const meta = Number(resolved.metaReferencia);
    const result = Number(resolved.resultadoAcumulado);
    if (!Number.isFinite(meta) || meta <= 0 || !Number.isFinite(result)) return resolved;
    const percent = result / meta;
    return {
      ...resolved,
      percentualAtingido: percent,
      situacao: percent >= 1 ? "Atingido" : "Abaixo da meta"
    };
  }

  function mergeCalculationForDisplay(calculated, launch) {
    if (!calculated && !launch) return null;
    const source = calculated || {};
    const monthly = resolveMonthlyCalculation(source, launch);
    const accumulated = resolveAccumulatedCalculation(source, launch);
    const metaReference = accumulated.metaReferencia;
    const annualPercent = source.percentualAtingidoAnual ??
      source.percentualAtingidoAcumulado ??
      launch?.percentualAtingidoAnual ??
      launch?.percentualAtingidoAcumulado ??
      monthly.percentualAtingido;

    return {
      ...source,
      resultadoMensal: source.resultadoMensal ?? monthly.resultadoMensal,
      resultadoCalculado: source.resultadoCalculado ?? monthly.resultadoMensal,
      resultadoAcumulado: source.resultadoAcumulado ?? accumulated.resultadoAcumulado,
      realizadoAcumulado: source.realizadoAcumulado ?? accumulated.resultadoAcumulado,
      resultadoOficialAnual: source.resultadoOficialAnual ??
        launch?.resultadoOficialAnual ??
        launch?.resultadoOficial ??
        accumulated.resultadoAcumulado,
      percentualAtingidoMensal: source.percentualAtingidoMensal ?? monthly.percentualAtingido,
      percentualAtingido: source.percentualAtingido ?? monthly.percentualAtingido,
      percentualAtingidoAcumulado: source.percentualAtingidoAcumulado ?? annualPercent,
      percentualAtingidoAnual: source.percentualAtingidoAnual ?? annualPercent,
      metaReferenciaMensal: source.metaReferenciaMensal ?? metaReference,
      metaAcumulada: source.metaAcumulada ?? metaReference,
      situacao: source.situacao || monthly.situacao
    };
  }

  function calculateIndicatorForDisplay(indicador, regra, launch, calculationScope) {
    if (!launch) return null;
    return mergeCalculationForDisplay(
      IndicatorFormulas.calcularIndicador(indicador, regra, launch, calculationScope),
      launch
    );
  }

  function resolveGrowthTrackingModes(regra) {
    const type = regra?.tipoCalculo || "";
    return {
      isEcossistemaScenario: type === "participacao_ecossistema_com_cenarios",
      isRedeLotericaIncrement: type === "incremento_rede_loterica_base_2025",
      isBase2025Growth: [
        "crescimento_comparado_base_2025",
        "crescimento_rede_loterica_base_2025"
      ].includes(type)
    };
  }

  function usesAccumulatedGoalCurve(regra) {
    return regra?.parametrosCalculo?.metaTipo === "curva_acumulada_por_competencia" ||
      regra?.tipoCalculo === "valor_financeiro_acumulado";
  }

  function launchBadge(status) {
    if (status === "Homologado") return "ok";
    if (status === "Devolvido para ajuste") return "danger";
    if (status === "Enviado para homologação") return "warn";
    return "info";
  }

  function resolveMonthlySituation(calculated, resolved) {
    if (resolved?.resultadoMensal == null && resolved?.percentualAtingido == null) return "Sem cálculo";
    return resolved?.situacao ||
      (calculated?.statusCalculo === "aguardando_dados" ? "Sem cálculo" : Calculations.calcularStatusDesempenho(resolved?.percentualAtingido));
  }

  function performanceBadge(situation) {
    const normalized = window.Situations ? Situations.normalizarSituacao(situation) : situation;
    if (normalized === "Atingido") return "ok";
    if (normalized === "Abaixo da meta" || normalized === "Atenção") return "warn";
    if (normalized === "Crítico") return "danger";
    return "info";
  }

  function launchDetailItem([label, value, full]) {
    return `
      <article class="detail-item ${full ? "full-span" : ""}">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(formatEmpty(value))}</p>
      </article>
    `;
  }

  function renderTextBlock(title, value, emptyText) {
    return `
      <article class="launch-detail-card">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(formatEmpty(value, emptyText))}</p>
      </article>
    `;
  }

  function renderInputData(indicador, regra, lancamento) {
    const campos = lancamento.camposEntrada || {};
    const fieldMap = Object.fromEntries([
      ...(regra?.camposEntradaLegados || []),
      ...(regra?.camposEntrada || [])
    ].map((field) => [field.nome, field]));
    const entries = Object.entries(campos)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => {
        const field = fieldMap[key] || {};
        return [field.rotulo || humanizeFieldName(key), formatInputValue(value, field)];
      });

    if (!entries.length) {
      return `
        <article class="launch-detail-card full-span">
          <h4>Dados informados pela unidade</h4>
          <p>Nenhum dado de entrada registrado.</p>
        </article>
      `;
    }

    return `
      <article class="launch-detail-card full-span">
        <h4>Dados informados pela unidade</h4>
        <div class="detail-grid launch-input-grid">
          ${entries.map(launchDetailItem).join("")}
        </div>
      </article>
    `;
  }

  function evidenceEntries(lancamento) {
    const entries = [];
    const add = (label, value) => {
      if (!value || entries.some((item) => item.value === value)) return;
      entries.push({ label, value });
    };
    add("Evidência", lancamento.evidencia);
    add("Arquivo", lancamento.arquivoEvidencia);
    add("Link", lancamento.linkEvidencia);
    Object.entries(lancamento.camposEntrada || {}).forEach(([key, value]) => {
      const normalized = normalizeText(key);
      if (normalized.includes("evidencia") || normalized.includes("fonte") || normalized.includes("arquivo") || normalized.includes("link")) {
        add(humanizeFieldName(key), value);
      }
    });
    return entries;
  }

  function renderEvidence(lancamento) {
    if (lancamento?.evidenciasRestritas) {
      return renderTextBlock(
        "Fonte/Evidência",
        "Existem evidências associadas. O acesso aos documentos permanece restrito ao escopo operacional autorizado.",
        "Existem evidências associadas."
      );
    }
    const entries = evidenceEntries(lancamento);
    if (!entries.length) {
      return renderTextBlock("Fonte/Evidência", "Nenhuma evidência anexada.", "Nenhuma evidência anexada.");
    }
    return `
      <article class="launch-detail-card">
        <h4>Fonte/Evidência</h4>
        <ul class="launch-detail-list">
          ${entries.map(({ label, value }) => {
            const text = String(value);
            const content = /^https?:\/\//i.test(text)
              ? `<a href="${escapeHtml(text)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`
              : escapeHtml(text);
            return `<li><strong>${escapeHtml(label)}:</strong> ${content}</li>`;
          }).join("")}
        </ul>
      </article>
    `;
  }

  function launchHistoryEntries(lancamento) {
    const historico = (state.data.historico || [])
      .filter((item) => (
        Number(item.lancamentoId) === Number(lancamento.id) ||
        (String(item.entidade || "").includes("lancamento") && Number(item.registroId) === Number(lancamento.id))
      ))
      .map((item) => ({
        action: item.acao || item.action || "Registro",
        user: item.usuario || item.user || "-",
        profile: item.perfil || item.profile || "-",
        date: item.dataHora || item.data || "",
        note: item.justificativa || item.observacao || item.valorNovo?.observacaoDiretoria || item.valorNovo?.justificativa || ""
      }));
    const homologacoes = (state.data.homologacoes || [])
      .filter((item) => Number(item.lancamentoId) === Number(lancamento.id))
      .map((item) => ({
        action: item.status || "Homologação",
        user: item.usuario || item.responsavel || item.homologadoPor || "-",
        profile: item.perfil || "Homologação",
        date: item.dataHora || item.dataHomologacao || item.dataAtualizacao || "",
        note: item.observacaoDiretoria || item.justificativa || ""
      }));
    const solicitacoes = (state.data.solicitacoesReabertura || [])
      .filter((item) => Number(item.lancamentoId) === Number(lancamento.id))
      .map((item) => ({
        action: `Solicitação de reabertura - ${item.statusSolicitacao || "Registrada"}`,
        user: item.solicitante || item.usuario || "-",
        profile: item.perfilSolicitante || item.perfil || "-",
        date: item.dataSolicitacao || item.dataHora || "",
        note: item.justificativa || item.justificativaDecisao || ""
      }));
    return [...historico, ...homologacoes, ...solicitacoes]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function renderHistory(lancamento) {
    if (isUsuarioCompanhiaProfile(state.user?.perfil)) return "";
    const entries = launchHistoryEntries(lancamento);
    if (!entries.length) {
      return renderTextBlock("Histórico de homologação", "Nenhum histórico registrado.", "Nenhum histórico registrado.");
    }
    return `
      <article class="launch-detail-card full-span">
        <h4>Histórico de homologação</h4>
        <ol class="launch-history-list">
          ${entries.map((item) => `
            <li>
              <strong>${escapeHtml(humanizeFieldName(item.action))}</strong>
              <span>${escapeHtml(item.date ? new Date(item.date).toLocaleString("pt-BR") : "-")}</span>
              <p>${escapeHtml(item.user)}${item.profile && item.profile !== "-" ? ` · ${escapeHtml(item.profile)}` : ""}</p>
              ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            </li>
          `).join("")}
        </ol>
      </article>
    `;
  }

  function renderLaunchDetail(indicador) {
    const panel = document.getElementById("monthlyLaunchDetail");
    const content = document.getElementById("monthlyLaunchDetailContent");
    const title = document.getElementById("monthlyLaunchDetailTitle");
    const subtitle = document.getElementById("monthlyLaunchDetailSubtitle");
    const lancamento = getSelectedLaunch();

    if (!panel || !content || !lancamento || !indicador || Number(lancamento.indicadorId) !== Number(indicador.id) || state.editMode) {
      if (panel) panel.hidden = true;
      return;
    }

    const regra = getRule(indicador);
    const calculated = launchCalculation(indicador, regra, lancamento) || {};
    const situation = calculated.situacao || lancamento.situacaoCalculada || Calculations.calcularStatusDesempenho(calculated.percentualAtingidoMensal ?? lancamento.percentualAtingido);
    const metaReferencia = calculated.metaReferenciaMensal ?? calculated.metaReferenciaPeriodo ?? calculated.metaAcumulada ?? lancamento.metaMensal ?? regra?.metaAnualValor;
    const resultadoCalculado = calculated.resultadoMensal ?? calculated.resultadoCalculado ?? lancamento.resultadoMensal ?? lancamento.realizadoMensal;
    const resultadoOficial = lancamento.status === "Homologado"
      ? resultadoCalculado
      : (calculated.resultadoOficial ?? lancamento.resultadoOficial ?? "-");
    const percent = calculated.percentualAtingidoMensal ?? calculated.percentualAtingido ?? lancamento.percentualAtingido;
    const isLucroRecorrente = Number(indicador.id) === 7 && regra?.tipoCalculo === "lucro_recorrente_mensal";
    const accumulatedBlock = isLucroRecorrente ? `
      <article class="launch-detail-card full-span">
        <h4>Acumulado no ano</h4>
        <div class="detail-grid">
          ${[
            ["Meta acumulada até a competência", formatMeasureValue(calculated.metaAcumulada, regra?.unidadeMedida)],
            ["Resultado acumulado até a competência", formatMeasureValue(calculated.resultadoAcumulado, regra?.unidadeMedida)]
          ].map(launchDetailItem).join("")}
        </div>
      </article>
    ` : "";

    panel.hidden = false;
    title.textContent = `${indicador.indicador} — ${lancamento.nomeMes}/${lancamento.ano}`;
    subtitle.textContent = "Informações prestadas pela unidade apuradora na competência selecionada.";
    content.innerHTML = `
      <article class="launch-detail-card full-span">
        <div class="detail-header compact">
          <div>
            <p class="eyebrow">Competência</p>
            <h4>${escapeHtml(lancamento.nomeMes)}/${escapeHtml(lancamento.ano)}</h4>
          </div>
          <span class="badge ${launchBadge(lancamento.status)}">${escapeHtml(lancamento.status || "Não iniciado")}</span>
        </div>
        <div class="detail-grid">
          ${[
            ["Indicador", indicador.indicador, true],
            ["Plano", indicador.plano],
            ["Pilar", indicador.pilar],
            ["Unidade apuradora", indicador.unidadeApuradora || "Não informado"],
            ["Diretoria responsável", indicador.diretoriaResponsavel || "Não informado"],
            ["Competência", `${lancamento.nomeMes}/${lancamento.ano}`],
            ["Situação", situation],
            [isLucroRecorrente ? "Meta da competência" : "Meta de referência", formatMeasureValue(metaReferencia, regra?.unidadeMedida)],
            [isLucroRecorrente ? "Resultado da competência" : "Resultado calculado", formatMeasureValue(resultadoCalculado, regra?.unidadeMedida)],
            ["Resultado oficial", resultadoOficial === "-" ? "-" : formatMeasureValue(resultadoOficial, regra?.unidadeMedida)],
            [isLucroRecorrente ? "% da meta atingida" : "% atingido", Calculations.formatarPercentual(percent)]
          ].map(launchDetailItem).join("")}
        </div>
      </article>
      ${accumulatedBlock}
      ${renderInputData(indicador, regra, lancamento)}
      ${renderTextBlock("Observação da área", lancamento.observacaoArea, "Sem observação registrada.")}
      ${renderTextBlock("Justificativa", lancamento.justificativa, "Sem justificativa registrada.")}
      ${renderEvidence(lancamento)}
      ${renderTextBlock("Observação da diretoria", lancamento.observacaoDiretoria, "Sem observação da diretoria registrada.")}
      ${renderHistory(lancamento)}
    `;
  }

  function monthlyColumnClass(label) {
    const text = normalizeText(label).replace(/\s+/g, " ");
    if (text === "acao" || text === "acoes") return "cell-action col-acao";
    if (text.includes("status")) return "cell-badge col-status badge-status";
    if (text.includes("situacao")) return "cell-badge col-situacao badge-situacao";
    if (text === "conta?") return "cell-badge col-numero-curto";
    if (
      text.includes("competencia") ||
      text === "mes" ||
      text.includes("mes/competencia")
    ) return "cell-compact col-competencia";
    if (
      text.includes("data-base") ||
      text.includes("data de")
    ) return "cell-compact col-data";
    if (
      text === "tipo" ||
      text.includes("tipo da") ||
      text === "cenario" ||
      text.includes("semestre previsto")
    ) return "cell-compact col-tipo-posicao";
    if (text.includes("%")) return "cell-valor col-percentual nowrap";
    if (text.includes("baseline") || text.includes("nps apurado")) return "cell-valor col-numero-curto";
    if (text.includes("meta")) return "cell-valor col-meta";
    if (
      text.includes("fonte") ||
      text.includes("evidencia")
    ) return "cell-texto-longo col-evidencia cell-evidencia";
    if (
      text.includes("observacao") ||
      text.includes("justificativa") ||
      text.includes("descricao") ||
      text.includes("criterio") ||
      text.includes("marco") ||
      text.includes("etapa") ||
      text.includes("acao principal") ||
      text.includes("acao proposta") ||
      text.includes("nome da") ||
      text.includes("projeto/iniciativa")
    ) return "cell-texto-longo col-observacao cell-observacao";
    if (
      text.includes("resultado") ||
      text.includes("arrecadacao") ||
      text.includes("premios") ||
      text.includes("valor") ||
      text.includes("despesa") ||
      text.includes("receita") ||
      text.includes("ggr") ||
      text.includes("ieo") ||
      text.includes("repasse") ||
      text.includes("indice") ||
      text.includes("incremento") ||
      text.includes("publico") ||
      text.includes("empregados") ||
      text.includes("cobertura") ||
      text.includes("melhorias")
    ) return "cell-valor col-valor";
    return "cell-texto col-valor";
  }

  function applyMonthlyTableLayout() {
    const header = document.getElementById("indicatorMonthlyHeader");
    const body = document.getElementById("indicatorMonthlyComposition");
    if (!header || !body) return;
    const table = header.closest("table");
    const wrapper = body.closest(".table-wrap");
    table?.classList.add("table-analitica", "table-composicao-mensal");
    wrapper?.classList.add("table-analitica-wrapper", "table-responsive", "table-composicao-wrapper");
    table?.style.setProperty("--monthly-column-count", header.children.length);
    [...header.children].forEach((cell, index) => {
      const columnClasses = monthlyColumnClass(cell.textContent).split(/\s+/).filter(Boolean);
      cell.classList.add("monthly-col", ...columnClasses);
      if (normalizeText(cell.textContent).trim() === "% atingido") {
        cell.classList.add("monthly-percent-attained-col");
      }
      body.querySelectorAll("tr").forEach((row) => {
        const rowCell = row.children[index];
        rowCell?.classList.add("monthly-col", ...columnClasses);
        if (normalizeText(cell.textContent).trim() === "% atingido") {
          rowCell?.classList.add("monthly-percent-attained-col");
        }
      });
    });
  }

  function renderIndicatorTracking(indicador) {
    const regra = getRule(indicador);
    const isPix = Number(indicador.id) === 9;
    const isOfertasPersonalizadas = Number(indicador.id) === 1;
    const isNps = Number(indicador.id) === 2;
    const isClimaOrganizacional = Number(indicador.id) === 12;
    const isCapacitacaoEmpregados = Number(indicador.id) === 15;
    const isCapacitacaoJogoResponsavel = Number(indicador.id) === 21;
    const isAprimoramentoExperiencia = Number(indicador.id) === 4;
    const isCapacidadeTic = Number(indicador.id) === 11;
    const isPlataformaJogos = Number(indicador.id) === 10;
    const isPrincipiosJogoResponsavel = Number(indicador.id) === 18;
    const isApoioSocioambiental = Number(indicador.id) === 16;
    const isIncentivoSocioambiental = Number(indicador.id) === 19;
    const isVisibilidadeRepasses = Number(indicador.id) === 20;
    const isDigitalChannels = Number(indicador.id) === 8;
    const isRedeLoterica = Number(indicador.id) === 23;
    const growthTrackingModes = resolveGrowthTrackingModes(regra);
    const isEcossistema = growthTrackingModes.isEcossistemaScenario;
    const isRedeLotericaIncremento = growthTrackingModes.isRedeLotericaIncrement;
    const isBase2025Growth = growthTrackingModes.isBase2025Growth;
    const isGgrFormula = regra?.tipoCalculo === "ggr_formula";
    const isIeoInverse = Number(indicador.id) === 6;
    const isLucroRecorrente = Number(indicador.id) === 7 && regra?.tipoCalculo === "lucro_recorrente_mensal";
    const isRepasseSocial = Number(indicador.id) === 17;
    const isAccumulatedGoalCurve = usesAccumulatedGoalCurve(regra);
    const launches = state.data.lancamentos
      .filter((item) => String(item.indicadorId) === String(indicador.id) && Number(item.ano) === 2026)
      .sort((a, b) => Number(a.mes) - Number(b.mes));
    const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
    const compositionMonths = QuarterlyConsolidation.MONTHS.filter(([month]) => (
      window.IndicatorPeriodicity?.isExpectedMonth(indicador, month) !== false
    ));
    const compositionEyebrow = document.getElementById("indicatorCompositionEyebrow");
    const compositionTitle = document.getElementById("indicatorCompositionTitle");
    if (compositionEyebrow) {
      compositionEyebrow.textContent = window.IndicatorPeriodicity?.compositionLabel(indicador) || "Composição mensal";
    }
    if (compositionTitle) {
      compositionTitle.textContent = window.IndicatorPeriodicity?.frequencyOf(indicador) === "mensal"
        ? "Competências de 2026"
        : "Posições oficiais de 2026";
    }

    function getCurveMeta(launch) {
      const key = launch?.competencia || `${launch?.ano}-${String(launch?.mes).padStart(2, "0")}`;
      const curve = regra?.parametrosCalculo?.metasAcumuladasPorCompetencia || {};
      return Object.prototype.hasOwnProperty.call(curve, key) && curve[key] !== null ? curve[key] : null;
    }

    function formatCurveMeta(launch) {
      const meta = getCurveMeta(launch);
      return meta === null ? "Pendente de curva orcamentaria" : Calculations.formatarValor(meta, regra.unidadeMedida);
    }

    function visibilidadeActionLabel(value) {
      const text = typeof value === "object" && value !== null ? String(value.id ?? value.nome ?? "") : String(value || "");
      const action = (regra?.parametrosCalculo?.acoesPropostasVisibilidade || []).find((item) => (
        item.id === text || item.nome === text
      ));
      return action?.nome || text || "-";
    }

    function visibilidadeActionSemester(value) {
      const text = typeof value === "object" && value !== null ? String(value.id ?? value.nome ?? "") : String(value || "");
      const action = (regra?.parametrosCalculo?.acoesPropostasVisibilidade || []).find((item) => (
        item.id === text || item.nome === text
      ));
      return action?.semestrePrevisto || "-";
    }

    document.getElementById("indicatorMonthlyHeader").innerHTML = isOfertasPersonalizadas ? `
      <th>Competência</th>
      <th>Base de clientes ativos identificáveis</th>
      <th>Clientes únicos com oferta personalizada</th>
      <th>Resultado da competência</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Status</th>
      <th>Ação</th>
    ` : isNps ? `
      <th>Competência</th>
      <th>Tipo da posição</th>
      <th>Baseline NPS</th>
      <th>Meta anual correta</th>
      <th>Meta de referência da competência</th>
      <th>NPS apurado</th>
      <th>Data-base</th>
      <th>Fonte/evidência</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Status</th>
      <th>Observação da área</th>
      <th>Ação</th>
    ` : isClimaOrganizacional ? `
      <th>Competência</th>
      <th>Tipo da posição</th>
      <th>Meta de referência</th>
      <th>Nota/média geral apurada</th>
      <th>Desempenho contra referência</th>
      <th>Situação da competência</th>
      <th>Ações realizadas no período</th>
      <th>Descrição do andamento</th>
      <th>Data-base da pesquisa</th>
      <th>Fonte/evidência</th>
      <th>Observação da área</th>
      <th>Status</th>
      <th>Ação</th>
    ` : (isCapacitacaoEmpregados || isCapacitacaoJogoResponsavel) ? `
      <th>Competência</th>
      <th>Meta de cobertura</th>
      <th>Critério do trimestre</th>
      <th>Público-alvo elegível</th>
      <th>Empregados capacitados</th>
      ${isCapacitacaoJogoResponsavel ? "<th>Iniciativas consideradas</th>" : ""}
      <th>Cobertura calculada</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Data-base</th>
      <th>Fonte/evidência</th>
      <th>Status</th>
      <th>Ação</th>
    ` : isAprimoramentoExperiencia ? `
      <th>Mês</th>
      <th>Melhorias implementadas no mês</th>
      <th>Descrição da melhoria</th>
      <th>Evidência</th>
      <th>Melhorias acumuladas</th>
      <th>Resultado acumulado</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isCapacidadeTic ? `
      <th>Mês/competência</th>
      <th>Meta trimestral</th>
      <th>Marco esperado</th>
      <th>Marco alcançado</th>
      <th>Percentual realizado</th>
      <th>Descrição</th>
      <th>Evidência</th>
      <th>Situação</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isPlataformaJogos ? `
      <th>Mês/competência</th>
      <th>Meta anual</th>
      <th>Marco/etapa atual</th>
      <th>Status do projeto</th>
      <th>Descrição do andamento</th>
      <th>Evidência</th>
      <th>Observação da área</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isPrincipiosJogoResponsavel ? `
      <th>Trimestre/competência</th>
      <th>Meta do trimestre</th>
      <th>Elemento RGF-WLA</th>
      <th>Status da ação</th>
      <th>Ação principal</th>
      <th>Data de conclusão</th>
      <th>Conta?</th>
      <th>Evidência</th>
      <th>Status da competência</th>
      <th>Ação</th>
    ` : isApoioSocioambiental ? `
      <th>Mês/competência</th>
      <th>Meta do trimestre</th>
      <th>Nome da iniciativa</th>
      <th>Tipo</th>
      <th>Status da iniciativa</th>
      <th>Data de apoio/realização</th>
      <th>Conta?</th>
      <th>Evidência</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isIncentivoSocioambiental ? `
      <th>Mês/competência</th>
      <th>Meta do trimestre</th>
      <th>Projeto/Iniciativa</th>
      <th>Tipo</th>
      <th>Status do projeto</th>
      <th>Valor investido no mês</th>
      <th>Valor acumulado</th>
      <th>Data do investimento</th>
      <th>Conta?</th>
      <th>Situação</th>
      <th>Evidência</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isVisibilidadeRepasses ? `
      <th>Mês/competência</th>
      <th>Meta do trimestre</th>
      <th>Ação proposta</th>
      <th>Semestre previsto</th>
      <th>Status da ação</th>
      <th>Etapa atual</th>
      <th>Resultado acumulado</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Data de conclusão/publicação</th>
      <th>Evidência</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isGgrFormula ? `
      <th>Mês</th>
      <th>Meta acumulada de referência</th>
      <th>Arrecadação total</th>
      <th>Prêmios a pagar</th>
      <th>GGR do mês</th>
      <th>GGR acumulado</th>
      <th>% atingido acumulado</th>
      <th>Situação</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isIeoInverse ? `
      <th>Mês</th>
      <th>Meta de referência da competência</th>
      <th>Despesa de pessoal</th>
      <th>Despesas administrativas</th>
      <th>Receitas líquidas</th>
      <th>IEO calculado da competência</th>
      <th>% atingido</th>
      <th>Situação da competência</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isLucroRecorrente ? `
      <th>Mês</th>
      <th>Meta da competência</th>
      <th>Resultado da competência</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isRepasseSocial ? `
      <th>Mês</th>
      <th>Meta acumulada de referência</th>
      <th>Repasse social acumulado até a competência</th>
      <th>% da meta acumulada atingida</th>
      <th>Situação da competência</th>
      <th>Status mensal</th>
      <th>Ação</th>
    ` : isEcossistema ? `
      <th>Competencia</th>
      <th>Cenario</th>
      <th>Referencia 2025</th>
      <th>Meta trimestral</th>
      <th>Arrecadacao via ecossistema</th>
      <th>Arrecadacao total</th>
      <th>Resultado</th>
      <th>% atingido</th>
      <th>Situacao</th>
      <th>Status</th>
      <th>Acao</th>
    ` : isRedeLotericaIncremento ? `
      <th>Competencia</th>
      <th>Base 2025 equivalente</th>
      <th>Arrecadacao Rede Loterica 2026</th>
      <th>Meta de incremento</th>
      <th>Indice 2026/2025</th>
      <th>Incremento</th>
      <th>% atingido</th>
      <th>Situacao</th>
      <th>Status</th>
      <th>Acao</th>
    ` : isBase2025Growth ? `
      <th>Competencia</th>
      <th>Base 2025 equivalente</th>
      <th>${isRedeLoterica ? "Arrecadacao Rede Loterica 2026" : "Arrecadacao 2026"}</th>
      <th>Meta 2026 calculada</th>
      <th>Indice 2026/2025</th>
      <th>Crescimento</th>
      <th>% atingido</th>
      <th>Situacao</th>
      <th>Status</th>
      <th>Acao</th>
    ` : isAccumulatedGoalCurve ? `
      <th>Mes</th>
      <th>Meta acumulada de referencia</th>
      <th>Realizado acumulado</th>
      <th>% atingido</th>
      <th>Situacao</th>
      <th>Status mensal</th>
      <th>Acao</th>
    ` : `
      <th>Mês</th>
      <th>Meta mensal/referência</th>
      <th>Resultado mensal</th>
      <th>% atingido</th>
      <th>Situação</th>
      <th>Status mensal</th>
      <th>Ação</th>
    `;

    document.getElementById("indicatorMonthlyComposition").innerHTML = compositionMonths.map(([month, name]) => {
      const launch = byMonth[month];
      const documentation = launchDocumentation(regra, launch);
      if (isOfertasPersonalizadas) {
        const calculationScope = launches.filter((item) => Number(item.mes) <= month);
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const resolved = resolveMonthlyCalculation(calculated, launch);
        const percent = resolved.percentualAtingido;
        const situation = resolved.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.baseClientesAtivosCompetencia, "numero")}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.clientesUnicosComOfertaPersonalizadaCompetencia, "numero")}</td>
            <td>${Calculations.formatarValor(resolved.resultadoMensal, "percentual")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isNps) {
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, launches.filter((item) => Number(item.mes) <= month))
          : null;
        const percent = calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${escapeHtml(launch?.camposEntrada?.tipoPosicaoNPS || "-")}</td>
            <td>${Calculations.formatarValor(calculated?.baselineNPS ?? regra?.parametrosCalculo?.baselineNPS, "pontos")}</td>
            <td>${Calculations.formatarValor(calculated?.metaAnualCorretaNPS ?? regra?.parametrosCalculo?.metaAnualMetodologica, "pontos")}</td>
            <td>${Calculations.formatarValor(calculated?.metaReferenciaPeriodo ?? launch?.metaMensal, "pontos")}</td>
            <td>${Calculations.formatarValor(calculated?.npsRealizado ?? calculated?.resultadoMensal, "pontos")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.dataBasePesquisaNPS || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${escapeHtml(documentation.observation || "-")}</td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isClimaOrganizacional) {
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, launches.filter((item) => Number(item.mes) <= month))
          : null;
        const percent = calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${escapeHtml(launch?.camposEntrada?.tipoPosicaoClima || "-")}</td>
            <td>${Calculations.formatarValor(calculated?.metaReferenciaClima ?? launch?.camposEntrada?.metaReferenciaClima ?? launch?.metaMensal, "pontos")}</td>
            <td>${Calculations.formatarValor(calculated?.notaClimaApurada ?? calculated?.resultadoMensal, "pontos")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td>${escapeHtml(launch?.camposEntrada?.acoesRealizadasClima || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.descricaoAndamentoClima || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.dataBasePesquisaClima || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td>${escapeHtml(documentation.observation || "-")}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isCapacitacaoEmpregados || isCapacitacaoJogoResponsavel) {
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, launches.filter((item) => Number(item.mes) <= month))
          : null;
        const percent = calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        const quarter = launch?.trimestre || `${Math.ceil(month / 3)}TRI/2026`;
        const curve = regra?.parametrosCalculo?.curvaTrimestralCursos || regra?.parametrosCalculo?.curvaJogoResponsavel2026 || {};
        const criterio = calculated?.criterioCapacitacao || curve[quarter]?.descricao || "-";
        const campoPublico = regra?.parametrosCalculo?.campoPublicoAlvo || "publicoAlvoElegivelCapacitacao";
        const campoCapacitados = regra?.parametrosCalculo?.campoCapacitados || "empregadosCapacitadosCapacitacao";
        const campoIniciativas = regra?.parametrosCalculo?.campoIniciativas || "iniciativasConsideradasJR";
        const campoDataBase = regra?.parametrosCalculo?.campoDataBase || "dataBaseApuracaoCapacitacao";
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(calculated?.metaCoberturaCapacitacao ?? launch?.metaMensal ?? regra?.metaAnualValor, "percentual")}</td>
            <td>${escapeHtml(criterio)}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.[campoPublico], "numero")}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.[campoCapacitados], "numero")}</td>
            ${isCapacitacaoJogoResponsavel ? `<td>${escapeHtml(launch?.camposEntrada?.[campoIniciativas] || "-")}</td>` : ""}
            <td>${Calculations.formatarValor(calculated?.resultadoMensal, "percentual")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td>${escapeHtml(launch?.camposEntrada?.[campoDataBase] || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isAprimoramentoExperiencia) {
        const calculationScope = launches.filter((item) => Number(item.mes) <= month && item.status === "Homologado");
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const percent = calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        const totalImprovements = Number(calculated?.totalMelhoriasPlano2026 ?? regra?.parametrosCalculo?.totalMelhoriasPlano2026);
        const accumulatedImprovements = calculated?.melhoriasImplementadasAcumuladas ??
          (Number.isFinite(totalImprovements) && calculated?.resultadoMensal != null
            ? Math.round(Number(calculated.resultadoMensal) * totalImprovements)
            : null);
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.melhoriasImplementadasMes, "numero")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.descricaoMelhoriasMes || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td>${Calculations.formatarValor(accumulatedImprovements, "numero")}</td>
            <td>${Calculations.formatarValor(calculated?.resultadoMensal, "percentual")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isCapacidadeTic) {
        const syntheticLaunch = launch || { ano: 2026, mes: month, trimestre: `${Math.ceil(month / 3)}TRI/2026` };
        const quarter = syntheticLaunch.trimestre || `${Math.ceil(month / 3)}TRI/2026`;
        const curve = regra?.parametrosCalculo?.curvaTrimestralPercentual || {};
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, launches.filter((item) => Number(item.mes) <= month))
          : null;
        const percent = calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(curve[quarter]?.metaPercentual, "percentual")}</td>
            <td>${escapeHtml(curve[quarter]?.marcoEsperado || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.marcoAlcancadoTIC || "-")}</td>
            <td>${Calculations.formatarValor(calculated?.resultadoMensal ?? launch?.camposEntrada?.percentualRealizadoTIC, "percentual")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.descricaoAndamentoTIC || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isPlataformaJogos) {
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${escapeHtml(launch?.metaAnualDescricao || indicador.metaAnualDescricao || "Piloto ou MVP da Plataforma de Jogos")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.marcoAtualPlataformaJogos || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.statusProjetoPlataformaJogos || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.descricaoAndamentoPlataformaJogos || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td>${escapeHtml(documentation.observation || "-")}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isPrincipiosJogoResponsavel) {
        const quarter = launch?.trimestre || `${Math.ceil(month / 3)}TRI/2026`;
        const curve = regra?.parametrosCalculo?.curvaTrimestralAcumulada || {};
        const status = launch?.camposEntrada?.statusAcao || "";
        const counts = ["Concluída", "Concluida", "Homologada"].includes(status);
        return `
          <tr>
            <td>${escapeHtml(window.IndicatorPeriodicity?.competenceLabel(indicador, launch || { ano: 2026, mes: month }, QuarterlyConsolidation.MONTHS) || `${name}/2026`)}</td>
            <td>${Calculations.formatarValor(curve[quarter]?.metaElementosAcumulados, "quantidade")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.elementoRGF || "-")}</td>
            <td>${escapeHtml(status || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.acaoExecutada || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.dataConclusao || "-")}</td>
            <td>${counts ? "Sim" : "Não"}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isApoioSocioambiental) {
        const quarter = launch?.trimestre || `${Math.ceil(month / 3)}TRI/2026`;
        const curve = regra?.parametrosCalculo?.curvaTrimestralAcumulada || {};
        const status = launch?.camposEntrada?.statusIniciativaSocioambiental || "";
        const counts = status === "Apoiada/realizada";
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(curve[quarter]?.metaQuantidadeAcumulada, "quantidade")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.nomeIniciativaSocioambiental || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.tipoIniciativaSocioambiental || "-")}</td>
            <td>${escapeHtml(status || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.dataApoioIniciativa || "-")}</td>
            <td>${counts ? "Sim" : "Não"}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isIncentivoSocioambiental) {
        const quarter = launch?.trimestre || `${Math.ceil(month / 3)}TRI/2026`;
        const curve = regra?.parametrosCalculo?.curvaTrimestralAcumulada || {};
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, launches.filter((item) => Number(item.mes) <= month && item.status === "Homologado"))
          : null;
        const status = launch?.camposEntrada?.statusProjetoIncentivoSocioambiental || "";
        const counts = status === "Investimento realizado";
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(calculated?.percentualAtingidoMensal ?? null));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(curve[quarter]?.metaValorAcumulado, "moeda")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.nomeProjetoIncentivoSocioambiental || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.tipoIncentivoSocioambiental || "-")}</td>
            <td>${escapeHtml(status || "-")}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.valorInvestidoMes, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.valorInvestidoAcumuladoAteCompetencia ?? launch?.camposEntrada?.valorInvestidoAcumuladoCompetencia ?? calculated?.resultadoMensal, "moeda")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.dataInvestimentoSocioambiental || "-")}</td>
            <td>${counts ? "Sim" : "Não"}</td>
            <td>${escapeHtml(situation)}</td>
            <td>${escapeHtml(documentation.reference || "-")}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isVisibilidadeRepasses) {
        const quarter = launch?.trimestre || `${Math.ceil(month / 3)}TRI/2026`;
        const curve = regra?.parametrosCalculo?.curvaTrimestralAcumulada || {};
        const calculationScope = launches.filter((item) => Number(item.mes) <= month && item.status === "Homologado");
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const status = launch?.camposEntrada?.statusAcaoVisibilidade || "";
        const counts = status === "Publicada/realizada";
        const percent = calculated?.percentualAtingidoMensal ?? null;
        const percentLabel = percent === null || percent === undefined ? "Não aplicável" : Calculations.formatarPercentual(percent);
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        const actionValue = launch?.camposEntrada?.acaoPropostaVisibilidade;
        const totalActions = Number(calculated?.totalAcoesPropostasVisibilidade ?? regra?.parametrosCalculo?.totalAcoesPropostas);
        const completedActions = calculated?.acoesRealizadasAcumuladas ??
          (Number.isFinite(totalActions) && calculated?.resultadoMensal != null
            ? Math.round(Number(calculated.resultadoMensal) * totalActions)
            : null);
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(curve[quarter]?.metaAcoesRealizadasAcumuladas, "quantidade")}</td>
            <td>${escapeHtml(visibilidadeActionLabel(actionValue))}</td>
            <td>${escapeHtml(visibilidadeActionSemester(actionValue))}</td>
            <td>${escapeHtml(status || "-")}</td>
            <td>${escapeHtml(launch?.camposEntrada?.etapaAtualVisibilidade || "-")}</td>
            <td>${Calculations.formatarValor(completedActions, "quantidade")} de ${Calculations.formatarValor(totalActions, "quantidade")}</td>
            <td>${escapeHtml(percentLabel)}</td>
            <td>${escapeHtml(situation)}</td>
            <td>${escapeHtml(launch?.camposEntrada?.dataConclusaoVisibilidade || "-")}</td>
            <td>${escapeHtml(documentation.reference || "-")}${counts ? "" : ""}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isGgrFormula) {
        const syntheticLaunch = launch || { ano: 2026, mes: month, competencia: `2026-${String(month).padStart(2, "0")}` };
        const calculationScope = launches.filter((item) => Number(item.mes) <= month);
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const percent = calculated?.percentualAtingidoAnual ?? calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        const percentLabel = percent === null || percent === undefined ? "Sem cálculo" : Calculations.formatarPercentual(percent);
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${escapeHtml(formatCurveMeta(syntheticLaunch))}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.arrecadacaoTotalMes, "moeda")}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.premiosAPagarMes, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.ggrCalculadoMes ?? calculated?.resultadoMensal, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.ggrAcumuladoAteCompetencia ?? calculated?.resultadoOficialAnual, "moeda")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isIeoInverse) {
        const syntheticLaunch = launch || { ano: 2026, mes: month, competencia: `2026-${String(month).padStart(2, "0")}` };
        const calculationScope = launches.filter((item) => Number(item.mes) <= month);
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const percent = calculated?.percentualAtingidoAnual ?? calculated?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        const percentLabel = percent === null || percent === undefined ? "Sem cálculo" : Calculations.formatarPercentual(percent);
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${escapeHtml(formatCurveMeta(syntheticLaunch))}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.despesaPessoalMes, "moeda")}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.despesasAdministrativasMes, "moeda")}</td>
            <td>${Calculations.formatarValor(launch?.camposEntrada?.receitasLiquidasMes, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.ieoRealizadoMes ?? calculated?.resultadoMensal, "percentual")}</td>
            <td>${escapeHtml(percentLabel)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isRepasseSocial) {
        const syntheticLaunch = launch || { ano: 2026, mes: month, competencia: `2026-${String(month).padStart(2, "0")}` };
        const calculationScope = launches.filter((item) => Number(item.mes) <= month);
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const resolved = resolveAccumulatedGoalCalculation(calculated, launch);
        const percent = resolved.percentualAtingido;
        const situation = resolved.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(resolved.metaReferencia ?? getCurveMeta(syntheticLaunch), "moeda")}</td>
            <td>${Calculations.formatarValor(resolved.resultadoAcumulado, "moeda")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isEcossistema) {
        const calculationScope = launches.filter((item) => Number(item.mes) <= month && item.status === "Homologado");
        const calculated = launch && launch.status === "Homologado"
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const percent = calculated?.percentualAtingidoMensal ?? calculated?.percentualAtingidoAnual ?? launch?.percentualAtingidoMensal ?? null;
        const situation = calculated?.situacao || launch?.situacaoCalculada || (calculated?.erro ? "Dados insuficientes" : Calculations.calcularStatusDesempenho(percent));
        const scenario = calculated?.cenarioApuracaoEcossistemaLabel ||
          (launch?.camposEntrada?.cenarioApuracaoEcossistema === "lotex" ? "Lotex" : launch?.camposEntrada?.cenarioApuracaoEcossistema ? "Lotex + Marketplace" : "-");
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${escapeHtml(scenario)}</td>
            <td>${Calculations.formatarPercentual(calculated?.referencia2025Trimestre)}</td>
            <td>${Calculations.formatarPercentual(calculated?.metaTrimestral2026 ?? launch?.metaMensal)}</td>
            <td>${Calculations.formatarValor(calculated?.arrecadacaoViaEcossistema ?? launch?.camposEntrada?.arrecadacaoViaEcossistema, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.arrecadacaoTotal ?? launch?.camposEntrada?.arrecadacaoTotal, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.resultadoCalculado ?? calculated?.resultadoMensal ?? launch?.resultadoMensal, "percentual")}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isRedeLotericaIncremento) {
        const calculationScope = launches.filter((item) => Number(item.mes) <= month && item.status === "Homologado");
        const calculated = launch && launch.status === "Homologado"
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const base2025 = calculated?.arrecadacaoRedeLoterica2025 ??
          launch?.camposEntrada?.arrecadacaoRedeLoterica2025 ??
          launch?.camposEntrada?.arrecadacaoRedeLoterica2025PeriodoEquivalente;
        const realizado2026 = calculated?.arrecadacaoRedeLoterica2026 ??
          launch?.camposEntrada?.arrecadacaoRedeLoterica2026 ??
          launch?.camposEntrada?.arrecadacaoRedeLotericaMes2026;
        const percent = calculated?.percentualAtingidoMensal ?? calculated?.percentualAtingidoAnual ?? null;
        const situation = calculated?.situacao || (calculated?.erro ? "Dados insuficientes" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(base2025, "moeda")}</td>
            <td>${Calculations.formatarValor(realizado2026, "moeda")}</td>
            <td>${Calculations.formatarPercentual(calculated?.metaTrimestral ?? launch?.metaMensal)}</td>
            <td>${Calculations.formatarPercentual(calculated?.indiceRedeLoterica)}</td>
            <td>${Calculations.formatarPercentual(calculated?.incrementoRedeLoterica ?? calculated?.resultadoMensal ?? launch?.resultadoMensal)}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isBase2025Growth) {
        const calculationScope = launches.filter((item) => Number(item.mes) <= month && item.status === "Homologado");
        const calculated = launch && launch.status === "Homologado"
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const base2025Field = isRedeLoterica
          ? "arrecadacaoRedeLoterica2025PeriodoEquivalente"
          : "arrecadacaoEcossistema2025PeriodoEquivalente";
        const legacyBase2025Field = isRedeLoterica
          ? "arrecadacaoRedeLotericaMes2025"
          : "arrecadacaoEcossistema2025";
        const realized2026Field = isRedeLoterica
          ? "arrecadacaoRedeLotericaMes2026"
          : "arrecadacaoEcossistemaMes2026";
        const legacyRealized2026Field = isRedeLoterica
          ? "arrecadacaoRedeLoterica2026PeriodoAtual"
          : "arrecadacaoEcossistemaMes";
        const base2025 = calculated?.baseReferencia2025Periodo ??
          launch?.camposEntrada?.[base2025Field] ??
          launch?.camposEntrada?.[legacyBase2025Field];
        const realizado2026 = calculated?.realizado2026Periodo ??
          launch?.camposEntrada?.[realized2026Field] ??
          launch?.camposEntrada?.[legacyRealized2026Field];
        const percent = calculated?.percentualAtingidoMensal ?? calculated?.percentualAtingidoAnual ?? null;
        const situation = calculated?.situacao || (calculated?.erro ? "Dados insuficientes" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${Calculations.formatarValor(base2025, "moeda")}</td>
            <td>${Calculations.formatarValor(realizado2026, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.metaCalculada2026, "moeda")}</td>
            <td>${Calculations.formatarValor(calculated?.indiceEmRelacaoA2025 ?? calculated?.resultadoMensal, "percentual")}</td>
            <td>${Calculations.formatarPercentual(calculated?.crescimentoVs2025)}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      if (isAccumulatedGoalCurve) {
        const syntheticLaunch = launch || { ano: 2026, mes: month, competencia: `2026-${String(month).padStart(2, "0")}` };
        const calculationScope = launches.filter((item) => Number(item.mes) <= month);
        const calculated = launch
          ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
          : null;
        const resolved = resolveAccumulatedGoalCalculation(calculated, launch);
        const accumulatedResult = resolved.resultadoAcumulado;
        const percent = resolved.percentualAtingido;
        const situation = resolved.situacao || (calculated?.statusCalculo === "aguardando_dados" ? "Sem calculo" : Calculations.calcularStatusDesempenho(percent));
        return `
          <tr>
            <td>${name}/2026</td>
            <td>${resolved.metaReferencia == null ? escapeHtml(formatCurveMeta(syntheticLaunch)) : Calculations.formatarValor(resolved.metaReferencia, regra.unidadeMedida)}</td>
            <td>${Calculations.formatarValor(accumulatedResult, regra.unidadeMedida)}</td>
            <td>${Calculations.formatarPercentual(percent)}</td>
            <td>${escapeHtml(situation)}</td>
            <td><span class="badge ${launch?.status === "Homologado" ? "ok" : launch?.status === "Devolvido para ajuste" ? "danger" : launch?.status === "Enviado para homologação" ? "warn" : "info"}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
            <td>${monthlyAction(launch)}</td>
          </tr>
        `;
      }
      const calculationScope = launches.filter((item) => Number(item.mes) <= month);
      const calculated = launch
        ? calculateIndicatorForDisplay(indicador, regra, launch, calculationScope)
        : null;
      const resolved = resolveMonthlyCalculation(calculated, launch);
      const metaReference = calculated?.metaReferenciaMensal ??
        calculated?.metaReferenciaPeriodo ??
        launch?.metaReferencia ??
        launch?.metaMensal ??
        regra.metaAnualValor;
      const situation = resolveMonthlySituation(calculated, resolved);
      return `
        <tr>
          <td>${name}/2026</td>
          <td>${Calculations.formatarValor(metaReference, regra.unidadeMedida)}</td>
          <td>${Calculations.formatarValor(resolved.resultadoMensal, regra.unidadeMedida)}</td>
          <td>${Calculations.formatarPercentual(resolved.percentualAtingido)}</td>
          <td><span class="badge ${performanceBadge(situation)}">${escapeHtml(situation)}</span></td>
          <td><span class="badge ${launchBadge(launch?.status)}">${escapeHtml(launch?.status || "Não iniciado")}</span></td>
          <td>${monthlyAction(launch)}</td>
        </tr>
      `;
    }).join("");
    applyMonthlyTableLayout();

    const quarters = QuarterlyConsolidation.consolidarAno(indicador, regra, launches, 2026);
    const quarterlyUnit = isBase2025Growth ? "moeda" : isVisibilidadeRepasses ? "quantidade" : regra.unidadeMedida;
    document.getElementById("indicatorQuarterlyComposition").innerHTML = quarters.map((quarter) => `
      <tr>
        <td>
          <strong>${quarter.trimestre}</strong>
          <small class="quarter-message">${escapeHtml(quarter.mensagem)}</small>
        </td>
        <td>${quarter.mesesHomologados} de ${quarter.mesesEsperados}</td>
        <td>${Calculations.formatarValor(quarter.metaTrimestral, quarterlyUnit)}</td>
        <td>
          ${Calculations.formatarValor(quarter.resultadoCalculadoTrimestral, quarterlyUnit)}
          ${isPix && quarter.pixAcumuladoTrimestre != null
            ? `<small class="quarter-message">PIX: ${Calculations.formatarMoedaBR(quarter.pixAcumuladoTrimestre)}<br>Canais: ${Calculations.formatarMoedaBR(quarter.canaisAcumuladoTrimestre)}</small>`
            : isDigitalChannels && quarter.canaisDigitaisAcumuladoTrimestre != null
              ? `<small class="quarter-message">Canais eletrônicos: ${Calculations.formatarMoedaBR(quarter.canaisDigitaisAcumuladoTrimestre)}<br>Produtos de loterias: ${Calculations.formatarMoedaBR(quarter.produtosLoteriasAcumuladoTrimestre)}</small>`
              : isVisibilidadeRepasses && quarter.dadosCalculados?.resultadoPercentualVisibilidade != null
                ? `<small class="quarter-message">Resultado: ${Calculations.formatarPercentual(quarter.dadosCalculados.resultadoPercentualVisibilidade)}</small>`
              : isEcossistema && quarter.dadosCalculados
                ? `<small class="quarter-message">Cenário: ${escapeHtml(quarter.cenarioEcossistemaLabel || "-")}<br>Referência 2025: ${Calculations.formatarPercentual(quarter.referencia2025EcossistemaTrimestre)}<br>Via ecossistema: ${Calculations.formatarMoedaBR(quarter.arrecadacaoViaEcossistemaTrimestre)}<br>Total: ${Calculations.formatarMoedaBR(quarter.arrecadacaoTotalEcossistemaTrimestre)}</small>`
              : isRedeLotericaIncremento && quarter.dadosCalculados
                ? `<small class="quarter-message">Base 2025: ${Calculations.formatarMoedaBR(quarter.baseReferenciaRedeLotericaTrimestre)}<br>Rede 2026: ${Calculations.formatarMoedaBR(quarter.arrecadacaoRedeLoterica2026Trimestre)}<br>Índice: ${Calculations.formatarPercentual(quarter.indiceRedeLotericaTrimestre)}</small>`
              : isBase2025Growth && quarter.baseReferencia2025Trimestre != null
                ? `<small class="quarter-message">Base 2025: ${Calculations.formatarMoedaBR(quarter.baseReferencia2025Trimestre)}<br>Indice: ${Calculations.formatarPercentual(quarter.indiceTrimestral)}<br>Crescimento: ${Calculations.formatarPercentual(quarter.crescimentoTrimestral)}</small>`
              : ""}
        </td>
        <td>${Calculations.formatarValor(quarter.resultadoOficialApresentado, quarterlyUnit)}</td>
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
    if (Number(state.institutionalDetail?.indicador?.id) === Number(state.selectedId)) {
      return state.institutionalDetail.indicador;
    }
    return state.indicadores.find((item) => Number(item.id) === Number(state.selectedId));
  }

  function refresh() {
    const visible = scopedIndicators();
    fillFilters(visible);
    const filtered = getFilteredIndicators();
    renderTable(filtered);

    const authorizedInstitutionalDetail = isRouteDetailMode() &&
      Number(state.institutionalDetail?.indicador?.id) === Number(state.selectedId);
    if (state.selectedId && !visible.some((item) => Number(item.id) === Number(state.selectedId)) && !authorizedInstitutionalDetail) {
      state.selectedId = null;
      state.selectedLaunchId = null;
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
    const persisted = await DataStore.saveLocal("indicadores", state.indicadores);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: "alteracao_indicador",
      entidade: "indicadores",
      registroId: id,
      valorAnterior: original,
      valorNovo: updated
    });

    state.editMode = false;
    showMessage(
      persisted ? "Cadastro do indicador salvo na base central." : "Cadastro do indicador salvo localmente. A base central nao foi alterada por esta tela.",
      persisted ? "info" : "warning"
    );
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
      state.selectedLaunchId = null;
      state.editMode = button.dataset.action === "edit" && canEdit();
      renderDetail(getSelectedIndicator());
      document.getElementById("indicatorDetailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("indicatorForm").addEventListener("submit", saveIndicator);

    document.getElementById("cancelIndicatorEdit").addEventListener("click", () => {
      state.editMode = false;
      renderDetail(getSelectedIndicator());
    });

    document.getElementById("backFromIndicatorDetail")?.addEventListener("click", () => {
      const origin = new URLSearchParams(window.location.search).get("origem");
      if (origin !== "resumo-executivo" && window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = detailBackTarget();
    });

    document.getElementById("backToIndicatorFromLaunch")?.addEventListener("click", () => {
      state.selectedLaunchId = null;
      const target = indicatorDetailTarget(state.selectedId);
      window.history.replaceState({}, "", target);
      renderDetail(getSelectedIndicator());
      document.getElementById("indicatorTracking")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      selectedLaunchId: null,
      editMode: false,
      institutionalDetail: null
    };

    const directRequestedId = requestedIndicatorId();
    let institutionalLoadError = "";
    if (directRequestedId && isGeneralDetailRequest()) {
      try {
        mergeInstitutionalDetail(await loadInstitutionalDetail(directRequestedId));
      } catch (error) {
        institutionalLoadError = error?.message || "Não foi possível consultar o detalhe institucional.";
      }
    }

    document.querySelectorAll(".admin-only").forEach((element) => {
      element.hidden = !canEdit();
    });

    bindEvents();
    refresh();

    const requestedLaunch = (state.data.lancamentos || []).find((item) => Number(item.id) === requestedLaunchId());
    const requestedId = requestedLaunch ? Number(requestedLaunch.indicadorId) : requestedIndicatorId();
    const requestedIndicatorAvailable = state.indicadores.some((item) => Number(item.id) === requestedId) ||
      Number(state.institutionalDetail?.indicador?.id) === requestedId;
    if (requestedId && requestedIndicatorAvailable && !institutionalLoadError) {
      state.selectedId = requestedId;
      state.selectedLaunchId = requestedLaunch ? Number(requestedLaunch.id) : null;
      renderDetail(getSelectedIndicator());
      document.getElementById(state.selectedLaunchId ? "monthlyLaunchDetail" : "indicatorDetailPanel").scrollIntoView({ block: "start" });
    } else if (isRouteDetailMode()) {
      showMessage(institutionalLoadError || "Indicador não encontrado ou indisponível para o perfil atual.", "warning");
      setIndicatorPageMode(null);
    }
  }

  window.PageModules = window.PageModules || {};
  if (window.__INDICATORS_TEST__) {
    window.IndicatorsInternals = {
      resolveMonthlyCalculation,
      resolveAccumulatedCalculation,
      resolveAccumulatedGoalCalculation,
      mergeCalculationForDisplay,
      resolveMonthlySituation,
      performanceBadge,
      requestedDetailScope,
      isGeneralDetailRequest,
      isInstitutionalReadOnly,
      resolveGrowthTrackingModes,
      usesAccumulatedGoalCurve,
      formatInputValue,
      renderInputData
    };
  }
  window.PageModules.indicadores = { init };
})();


