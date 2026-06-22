(function () {
  const TIPOS_CALCULO = [
    "percentual_direto",
    "percentual_inverso",
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
      ["Métrica/Fórmula de referência", indicador.metrica, true]
    ].map(([label, value, full]) => `
      <article class="detail-item ${full ? "full-span" : ""}">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
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
    DataStore.saveLocal("indicadores", state.indicadores);
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
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.indicadores = { init };
})();
