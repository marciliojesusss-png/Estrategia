(function () {
  const TIPOS_CALCULO = [
    ["percentual_direto", "Quanto maior o realizado em relação à meta, melhor."],
    ["percentual_inverso", "Quanto menor o realizado em relação à meta, melhor."],
    ["razao_canais_digitais", "Razão acumulada entre canais eletrônicos e produtos de loterias."],
    ["razao_pix", "Razão entre arrecadação PIX e arrecadação total dos canais eletrônicos."],
    ["valor_acumulado", "Resultado anual pela soma dos realizados contra soma das metas."],
    ["media_percentual", "Resultado anual pela média dos percentuais mensais."],
    ["projeto_percentual", "Percentual de execução do projeto informado como realizado."],
    ["projeto_marco_entrega", "Acompanhamento de marco de projeto sem desempenho percentual oficial."],
    ["nota_pesquisa_nps", "Nota de pesquisa NPS com referência por competência e meta anual metodológica."],
    ["nota_pesquisa_anual", "Nota de pesquisa anual com acompanhamento de posições, ações e evidências."],
    ["cobertura_capacitacao", "Cobertura de capacitação por público-alvo elegível e critério trimestral de cursos."],
    ["investimento_socioambiental", "Investimento acumulado em projetos socioambientais com curva trimestral em moeda."],
    ["execucao_acoes_propostas", "Execução de ações propostas com contagem acumulada por curva trimestral."],
    ["projeto_binario", "Entrega binária: 0 não entregue, 1 entregue."],
    ["manual_homologado", "Percentual informado manualmente com justificativa obrigatória."],
    ["qualitativo", "Avaliação qualitativa ou textual."],
    ["personalizado", "Regra específica definida individualmente."]
  ];

  const MESES = [
    [1, "Janeiro"],
    [2, "Fevereiro"],
    [3, "Março"],
    [4, "Abril"],
    [5, "Maio"],
    [6, "Junho"],
    [7, "Julho"],
    [8, "Agosto"],
    [9, "Setembro"],
    [10, "Outubro"],
    [11, "Novembro"],
    [12, "Dezembro"]
  ];

  const MODULE_TITLES = {
    acessos: "Acessos corporativos",
    usuarios: "Usuários simulados",
    planos: "Planos",
    pilares: "Pilares estratégicos",
    unidades: "Unidades apuradoras",
    diretorias: "Diretorias responsáveis",
    indicadores: "Indicadores",
    metas: "Metas mensais",
    tiposCalculo: "Tipos de cálculo",
    reabertura: "Reabertura de lançamento",
    solicitacoesReabertura: "Solicitações de Reabertura",
    historico: "Histórico de alterações"
  };

  let state = {
    data: null,
    user: null,
    module: "acessos",
    editingId: null,
    accessUsers: null,
    accessStorage: null,
    accessStorageWarned: false,
    loadingAccessUsers: false
  };

  const ACCESS_PROFILE_OPTIONS = [
    ["usuario_companhia", "Usuário Companhia"],
    ["unidade_apuradora", "Unidade Apuradora"],
    ["homologador", "Diretoria Homologadora"],
    ["administrador", "Administrador"]
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMessage(message, type = "info") {
    const target = document.getElementById("adminMessage");
    target.className = `notice ${type}`;
    target.textContent = message;
    target.hidden = false;
  }

  async function adminApi(path, options = {}) {
    const response = await fetch(path, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `Falha na API (${response.status}).`);
    }
    return payload;
  }

  async function loadAccessUsers() {
    if (state.loadingAccessUsers) return;
    state.loadingAccessUsers = true;
    try {
      const payload = await adminApi("/api/usuarios-acesso.php");
      state.accessStorage = payload.storage || null;
      state.accessUsers = payload.usuarios || [];
      if (state.accessStorage && state.accessStorage.driver !== "sqlsrv" && !state.accessStorageWarned) {
        showMessage("Aba Acessos usando SQLite local. O SQL Server nao sera alterado neste modo.", "warning");
        state.accessStorageWarned = true;
      }
    } catch (error) {
      state.accessUsers = [];
      showMessage(error.message || "Nao foi possivel carregar os acessos.", "warning");
    } finally {
      state.loadingAccessUsers = false;
    }
  }

  async function saveAccessUser(payload) {
    const response = await adminApi("/api/usuarios-acesso.php", {
      method: payload.id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    state.accessStorage = response.storage || state.accessStorage;
    state.accessUsers = response.usuarios || [];
  }

  function nextNumericId(items) {
    return items.length ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1 : 1;
  }

  function slug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function renderCards() {
    const items = [
      ["Acessos corporativos", state.accessUsers ? state.accessUsers.length : "-"],
      ["Usuários simulados", state.data.usuarios.length],
      ["Planos", state.data.planos.length],
      ["Pilares", state.data.pilares.length],
      ["Unidades apuradoras", state.data.unidades.length],
      ["Diretorias responsáveis", state.data.diretorias.length],
      ["Indicadores", state.data.indicadores.length],
      ["Metas mensais", state.data.metas.length],
      ["Lançamentos", state.data.lancamentos.length],
      ["Solicitações pendentes", (state.data.solicitacoesReabertura || []).filter((item) => item.statusSolicitacao === "Pendente").length],
      ["Solicitações aprovadas", (state.data.solicitacoesReabertura || []).filter((item) => item.statusSolicitacao === "Aprovada").length],
      ["Solicitações negadas", (state.data.solicitacoesReabertura || []).filter((item) => item.statusSolicitacao === "Negada").length],
      ["Histórico", state.data.historico.length]
    ];

    document.getElementById("adminGrid").innerHTML = items.map(([label, value]) => (
      `<article class="admin-tile"><strong>${value}</strong><span>${escapeHtml(label)}</span></article>`
    )).join("");
  }

  function renderConfigurationInfo() {
    const target = document.getElementById("configurationLocalInfo");
    if (!target) return;
    const allowedPages = Auth.getAllowedPages(state.user)
      .filter((page) => page !== "dashboard")
      .map((page) => ({
        resumoExecutivo: "Resumo Executivo",
        visaoTrimestral: "Visão Trimestral",
        indicadores: "Indicadores",
        lancamentos: "Lançamentos",
        homologacao: "Homologação",
        relatorios: "Relatórios",
        administracao: "Configurações"
      }[page] || page));
    const modeLabel = state.storageInfo?.mode === "validacao_local"
      ? "Validação local"
      : state.storageInfo?.mode === "central"
        ? "SQL local"
        : "Navegador local";

    target.innerHTML = [
      ["Modo de armazenamento", modeLabel],
      ["Perfil atual", state.user?.perfil || "-"],
      ["Usuário simulado", state.user?.nome || "-"],
      ["Escopo", state.user?.unidadeApuradora || state.user?.diretoriaResponsavel || "Geral"],
      ["Permissões", allowedPages.join(", ") || "-"],
      ["Chave da base local", DataStore.VALIDATION_BASE_KEY]
    ].map(([label, value]) => `
      <article class="detail-item">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
  }

  function setModule(module) {
    state.module = module;
    state.editingId = null;
    document.getElementById("adminModuleTitle").textContent = MODULE_TITLES[module];
    document.querySelectorAll("[data-admin-module]").forEach((button) => {
      button.classList.toggle("active", button.dataset.adminModule === module);
    });
    document.getElementById("adminForm").hidden = true;
    document.getElementById("adminNewButton").hidden = !["acessos", "usuarios", "planos", "pilares", "unidades", "diretorias", "metas"].includes(module);
    renderModule();
  }

  function table(head, rows) {
    document.getElementById("adminTableHead").innerHTML = `<tr>${head.map((item) => `<th>${escapeHtml(item)}</th>`).join("")}</tr>`;
    document.getElementById("adminTableBody").innerHTML = rows.length
      ? rows.join("")
      : `<tr><td colspan="${head.length}">Nenhum registro encontrado.</td></tr>`;
  }

  function options(values, selected = "", emptyLabel = null) {
    const list = emptyLabel === null ? values : [["", emptyLabel], ...values];
    return list.map(([value, label]) => (
      `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`
    )).join("");
  }

  function field(fieldConfig, value = "") {
    const id = `adminField_${fieldConfig.key}`;
    if (fieldConfig.type === "select") {
      return `
        <label>${escapeHtml(fieldConfig.label)}
          <select id="${id}" name="${fieldConfig.key}" ${fieldConfig.required ? "required" : ""}>
            ${options(fieldConfig.options(), value, fieldConfig.emptyLabel)}
          </select>
        </label>
      `;
    }
    return `
      <label>${escapeHtml(fieldConfig.label)}
        <input id="${id}" name="${fieldConfig.key}" type="${fieldConfig.type || "text"}" value="${escapeHtml(value)}" ${fieldConfig.required ? "required" : ""}>
      </label>
    `;
  }

  function accessProfileLabel(profile) {
    return ACCESS_PROFILE_OPTIONS.find(([value]) => value === profile)?.[1] || profile || "-";
  }

  function accessStorageLabel() {
    if (!state.accessStorage) return "banco ativo";
    return state.accessStorage.driver === "sqlsrv"
      ? `SQL Server (${state.accessStorage.database || "Estrategia"})`
      : "SQLite local";
  }

  function renderAccessUsers() {
    if (state.accessUsers === null) {
      table(["Matrícula", "Nome", "Perfil", "Unidade", "Diretoria", "Status", "Ações"], [
        `<tr><td colspan="7">Carregando acessos corporativos...</td></tr>`
      ]);
      loadAccessUsers().then(() => {
        renderCards();
        renderAccessUsers();
      });
      return;
    }

    const rows = state.accessUsers.map((item) => `
      <tr>
        <td>${escapeHtml(item.matricula)}</td>
        <td>${escapeHtml(item.nome)}</td>
        <td>${escapeHtml(accessProfileLabel(item.perfil))}</td>
        <td>${escapeHtml(item.unidadeApuradora || item.sgUnidade || "-")}</td>
        <td>${escapeHtml(item.diretoriaResponsavel || "-")}</td>
        <td><span class="badge ${item.ativo ? "ok" : "danger"}">${item.ativo ? "Ativo" : "Inativo"}</span></td>
        <td><button class="secondary-action table-action" type="button" data-edit-access="${escapeHtml(item.id)}">Editar</button></td>
      </tr>
    `);

    table(["Matrícula", "Nome", "Perfil", "Unidade", "Diretoria", "Status", "Ações"], rows);
  }

  function openAccessForm(item = null) {
    const form = document.getElementById("adminForm");
    const source = item || {
      id: "",
      matricula: "",
      nome: "",
      email: "",
      sgUnidade: "",
      noUnidade: "",
      perfil: "usuario_companhia",
      unidadeApuradora: "",
      diretoriaResponsavel: "",
      ativo: true
    };

    form.innerHTML = `
      <input type="hidden" name="id" value="${escapeHtml(source.id || "")}">
      <label>Matrícula
        <input name="matricula" value="${escapeHtml(source.matricula || "")}" required>
      </label>
      <label>Nome
        <input name="nome" value="${escapeHtml(source.nome || "")}" required>
      </label>
      <label>E-mail
        <input name="email" type="email" value="${escapeHtml(source.email || "")}">
      </label>
      <label>Perfil
        <select name="perfil" required>
          ${options(ACCESS_PROFILE_OPTIONS, source.perfil || "usuario_companhia")}
        </select>
      </label>
      <label>Sigla da unidade
        <input name="sgUnidade" value="${escapeHtml(source.sgUnidade || "")}">
      </label>
      <label>Nome da unidade
        <input name="noUnidade" value="${escapeHtml(source.noUnidade || "")}">
      </label>
      <label>Unidade apuradora
        <input name="unidadeApuradora" value="${escapeHtml(source.unidadeApuradora || "")}">
      </label>
      <label>Diretoria responsável
        <input name="diretoriaResponsavel" value="${escapeHtml(source.diretoriaResponsavel || "")}">
      </label>
      <label>Status
        <select name="ativo" required>
          ${options([["true", "Ativo"], ["false", "Inativo"]], String(source.ativo !== false))}
        </select>
      </label>
      <div class="form-actions full-span">
        <button class="primary-action" type="submit">Salvar acesso</button>
        <button id="adminCancelForm" class="secondary-action" type="button">Cancelar</button>
      </div>
    `;
    form.hidden = false;
    state.editingId = item ? item.id : null;
  }

  async function saveAccessForm(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
      ...values,
      id: values.id ? Number(values.id) : 0,
      ativo: values.ativo === "true"
    };

    try {
      await saveAccessUser(payload);
      showMessage(`Acesso salvo em usuarios_acesso no ${accessStorageLabel()}.`);
      document.getElementById("adminForm").hidden = true;
      renderCards();
      renderAccessUsers();
    } catch (error) {
      showMessage(error.message || "Nao foi possivel salvar o acesso.", "warning");
    }
  }

  function simpleConfig(module) {
    const activeOptions = () => [["true", "Ativo"], ["false", "Inativo"]];
    const configs = {
      usuarios: {
        key: "usuarios",
        idType: "text",
        fields: [
          { key: "id", label: "ID", required: true },
          { key: "nome", label: "Nome", required: true },
          { key: "email", label: "E-mail", type: "email", required: true },
          { key: "perfil", label: "Perfil", type: "select", required: true, options: () => [["Administrador", "Administrador"], ["Unidade Apuradora", "Unidade Apuradora"], ["Diretoria Homologadora", "Diretoria Homologadora"], ["Consulta/Gestão", "Consulta/Gestão"], ["Usuário Companhia", "Usuário Companhia"]] },
          { key: "unidadeApuradora", label: "Unidade apuradora", type: "select", options: () => state.data.unidades.map((item) => [item.sigla, item.sigla]), emptyLabel: "Todas" },
          { key: "diretoriaResponsavel", label: "Diretoria responsável", type: "select", options: () => state.data.diretorias.map((item) => [item.sigla, item.sigla]), emptyLabel: "Todas" }
        ],
        columns: [["id", "ID"], ["nome", "Nome"], ["perfil", "Perfil"], ["unidadeApuradora", "Unidade"], ["diretoriaResponsavel", "Diretoria"]]
      },
      planos: {
        key: "planos",
        idType: "text",
        fields: [
          { key: "id", label: "ID", required: true },
          { key: "sigla", label: "Sigla", required: true },
          { key: "nome", label: "Nome", required: true }
        ],
        columns: [["id", "ID"], ["sigla", "Sigla"], ["nome", "Nome"]]
      },
      pilares: {
        key: "pilares",
        idType: "number",
        fields: [
          { key: "id", label: "ID", type: "number", required: true },
          { key: "nome", label: "Nome", required: true },
          { key: "ativo", label: "Status", type: "select", required: true, options: activeOptions }
        ],
        columns: [["id", "ID"], ["nome", "Nome"], ["ativo", "Ativo"]]
      },
      unidades: {
        key: "unidades",
        idType: "text",
        fields: [
          { key: "id", label: "ID", required: true },
          { key: "sigla", label: "Sigla", required: true },
          { key: "nome", label: "Nome", required: true },
          { key: "ativo", label: "Status", type: "select", required: true, options: activeOptions }
        ],
        columns: [["id", "ID"], ["sigla", "Sigla"], ["nome", "Nome"], ["ativo", "Ativo"]]
      },
      diretorias: {
        key: "diretorias",
        idType: "text",
        fields: [
          { key: "id", label: "ID", required: true },
          { key: "sigla", label: "Sigla", required: true },
          { key: "nome", label: "Nome", required: true },
          { key: "ativo", label: "Status", type: "select", required: true, options: activeOptions }
        ],
        columns: [["id", "ID"], ["sigla", "Sigla"], ["nome", "Nome"], ["ativo", "Ativo"]]
      }
    };
    return configs[module];
  }

  function renderSimpleModule(module) {
    const config = simpleConfig(module);
    const rows = state.data[config.key].map((item) => `
      <tr>
        ${config.columns.map(([key]) => `<td>${escapeHtml(item[key] === true ? "Sim" : item[key] === false ? "Não" : item[key] || "-")}</td>`).join("")}
        <td><button class="secondary-action table-action" type="button" data-edit-simple="${escapeHtml(item.id)}">Editar</button></td>
      </tr>
    `);
    table([...config.columns.map(([, label]) => label), "Ações"], rows);
  }

  function openSimpleForm(module, item = null) {
    const config = simpleConfig(module);
    const form = document.getElementById("adminForm");
    const defaults = {};
    if (!item) {
      if (config.idType === "number") defaults.id = nextNumericId(state.data[config.key]);
      if (config.idType === "text") defaults.id = "";
      defaults.ativo = true;
    }
    const source = item || defaults;
    form.innerHTML = config.fields.map((itemConfig) => {
      let value = source[itemConfig.key] ?? "";
      if (itemConfig.key === "ativo") value = String(value !== false);
      return field(itemConfig, value);
    }).join("") + `
      <div class="form-actions full-span">
        <button class="primary-action" type="submit">Salvar</button>
        <button id="adminCancelForm" class="secondary-action" type="button">Cancelar</button>
      </div>
    `;
    form.hidden = false;
    state.editingId = item ? item.id : null;
  }

  async function saveSimpleForm(event) {
    event.preventDefault();
    const config = simpleConfig(state.module);
    if (!config) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    let id = config.idType === "number" ? Number(formData.id) : formData.id.trim();
    if (config.idType === "text" && !id) {
      id = slug(formData.sigla || formData.email || formData.nome);
    }
    const existing = state.data[config.key].find((item) => item.id === id && item.id !== state.editingId);
    if (existing) {
      showMessage(`Já existe registro com ID ${id}.`, "warning");
      return;
    }

    const record = { ...formData, id };
    if ("ativo" in record) record.ativo = record.ativo === "true";
    if (state.module === "unidades" || state.module === "diretorias") {
      record.id = record.id || slug(record.sigla);
      record.sigla = String(record.sigla || "").toUpperCase();
    }
    if (state.module === "planos") {
      record.sigla = String(record.sigla || "").toUpperCase();
    }

    const original = state.editingId === null ? null : state.data[config.key].find((item) => item.id === state.editingId);
    state.data[config.key] = state.editingId === null
      ? [...state.data[config.key], record]
      : state.data[config.key].map((item) => item.id === state.editingId ? record : item);
    await DataStore.saveLocal(config.key, state.data[config.key]);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: state.editingId === null ? `criacao_${config.key}` : `alteracao_${config.key}`,
      entidade: config.key,
      registroId: record.id,
      valorAnterior: original,
      valorNovo: record
    });
    state.data.historico = await DataStore.loadJson("historico");
    showMessage("Registro salvo em armazenamento local.");
    document.getElementById("adminForm").hidden = true;
    renderCards();
    renderModule();
  }

  function renderIndicadores() {
    const rows = state.data.indicadores.map((item) => `
      <tr>
        <td>${escapeHtml(item.numero)}</td>
        <td>${escapeHtml(item.indicador)}</td>
        <td>${escapeHtml(item.plano)}</td>
        <td>${escapeHtml(item.pilar)}</td>
        <td>${escapeHtml(item.unidadeApuradora || "Não informado")}</td>
        <td>${escapeHtml(item.diretoriaResponsavel || "Não informado")}</td>
        <td>${escapeHtml(item.tipoCalculo)}</td>
        <td>${escapeHtml(item.ativo ? "Ativo" : "Inativo")}</td>
      </tr>
    `);
    table(["Nº", "Indicador", "Plano", "Pilar", "Unidade", "Diretoria", "Tipo", "Status"], rows);
  }

  function renderMetas() {
    const porId = Object.fromEntries(state.data.indicadores.map((item) => [item.id, item]));
    const rows = state.data.metas.map((item) => {
      const indicador = porId[item.indicadorId];
      return `
        <tr>
          <td>${escapeHtml(indicador ? `${indicador.numero}. ${indicador.indicador}` : item.indicadorId)}</td>
          <td>${escapeHtml(item.ano)}</td>
          <td>${escapeHtml(item.nomeMes)}</td>
          <td>${escapeHtml(item.metaMensal ?? "-")}</td>
          <td><button class="secondary-action table-action" type="button" data-edit-meta="${item.id}">Editar</button></td>
        </tr>
      `;
    });
    table(["Indicador", "Ano", "Mês", "Meta mensal", "Ações"], rows);
  }

  function openMetaForm(meta = null) {
    const form = document.getElementById("adminForm");
    const source = meta || { id: nextNumericId(state.data.metas), indicadorId: state.data.indicadores[0]?.id || "", ano: 2026, mes: 1, nomeMes: "Janeiro", metaMensal: "" };
    form.innerHTML = `
      <input type="hidden" name="id" value="${escapeHtml(source.id)}">
      <label>Indicador
        <select name="indicadorId" required>
          ${options(state.data.indicadores.map((item) => [item.id, `${item.numero}. ${item.indicador}`]), source.indicadorId)}
        </select>
      </label>
      <label>Ano <input name="ano" type="number" value="${escapeHtml(source.ano)}" required></label>
      <label>Mês
        <select name="mes" required>${options(MESES, source.mes)}</select>
      </label>
      <label>Meta mensal <input name="metaMensal" type="number" step="any" value="${escapeHtml(source.metaMensal ?? "")}"></label>
      <div class="form-actions full-span">
        <button class="primary-action" type="submit">Salvar meta</button>
        <button id="adminCancelForm" class="secondary-action" type="button">Cancelar</button>
      </div>
    `;
    form.hidden = false;
    state.editingId = meta ? meta.id : null;
  }

  async function saveMetaForm(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const mes = Number(values.mes);
    const record = {
      id: Number(values.id),
      indicadorId: Number(values.indicadorId),
      ano: Number(values.ano),
      mes,
      nomeMes: MESES.find(([value]) => value === mes)?.[1] || "",
      metaMensal: values.metaMensal === "" ? null : Number(values.metaMensal),
      fonte: "admin_local"
    };
    const original = state.editingId === null ? null : state.data.metas.find((item) => item.id === state.editingId);
    state.data.metas = state.editingId === null
      ? [...state.data.metas, record]
      : state.data.metas.map((item) => item.id === state.editingId ? record : item);
    await DataStore.saveLocal("metas", state.data.metas);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: state.editingId === null ? "criacao_meta" : "alteracao_meta",
      entidade: "metas",
      registroId: record.id,
      valorAnterior: original,
      valorNovo: record
    });
    state.data.historico = await DataStore.loadJson("historico");
    showMessage("Meta salva em armazenamento local.");
    document.getElementById("adminForm").hidden = true;
    renderCards();
    renderModule();
  }

  function renderTiposCalculo() {
    const rows = TIPOS_CALCULO.map(([tipo, descricao]) => `
      <tr>
        <td><span class="badge info">${escapeHtml(tipo)}</span></td>
        <td>${escapeHtml(descricao)}</td>
      </tr>
    `);
    table(["Tipo", "Descrição"], rows);
  }

  function renderReabertura() {
    const porId = Object.fromEntries(state.data.indicadores.map((item) => [item.id, item]));
    const homologados = state.data.lancamentos.filter((item) => item.status === "Homologado");
    const rows = homologados.map((item) => {
      const indicador = porId[item.indicadorId];
      return `
        <tr>
          <td>${escapeHtml(indicador ? `${indicador.numero}. ${indicador.indicador}` : item.indicadorId)}</td>
          <td>${escapeHtml(item.nomeMes)}/${escapeHtml(item.ano)}</td>
          <td>${escapeHtml(indicador ? indicador.unidadeApuradora || "Não informado" : "-")}</td>
          <td>${escapeHtml(indicador ? indicador.diretoriaResponsavel || "Não informado" : "-")}</td>
          <td>${escapeHtml(item.dataHomologacao || "-")}</td>
          <td><button class="secondary-action table-action" type="button" data-reopen="${item.id}">Reabrir</button></td>
        </tr>
      `;
    });
    table(["Indicador", "Mês/Ano", "Unidade", "Diretoria", "Homologado em", "Ações"], rows);
  }

  async function reopenLaunch(id) {
    const launch = state.data.lancamentos.find((item) => item.id === id);
    if (!launch || launch.status !== "Homologado") return;
    const original = { ...launch };
    const updated = {
      ...launch,
      status: "Reaberto",
      homologadoPor: "",
      dataHomologacao: "",
      observacaoDiretoria: `${launch.observacaoDiretoria || ""}`.trim(),
      solicitacaoReabertura: launch.solicitacaoReabertura
        ? { ...launch.solicitacaoReabertura, status: "Atendida", dataAtendimento: new Date().toISOString() }
        : null
    };
    state.data.lancamentos = state.data.lancamentos.map((item) => item.id === id ? updated : item);
    state.data.homologacoes = state.data.homologacoes.map((item) => (
      item.lancamentoId === id ? { ...item, status: "Reaberto", observacaoDiretoria: updated.observacaoDiretoria } : item
    ));
    await Promise.all([
      DataStore.salvarLancamentos(state.data.lancamentos),
      DataStore.saveLocal("homologacoes", state.data.homologacoes)
    ]);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: "reabertura_lancamento",
      entidade: "lancamentos",
      registroId: id,
      valorAnterior: original,
      valorNovo: updated
    });
    state.data.historico = await DataStore.loadJson("historico");
    showMessage("Lançamento reaberto para ajuste.");
    renderCards();
    renderModule();
  }

  function renderSolicitacoesReabertura() {
    const porIndicador = Object.fromEntries(state.data.indicadores.map((item) => [String(item.id), item]));
    const rows = (state.data.solicitacoesReabertura || []).map((item) => {
      const indicador = porIndicador[String(item.indicadorId)];
      const statusClass = item.statusSolicitacao === "Aprovada" ? "ok" : item.statusSolicitacao === "Negada" ? "danger" : "warn";
      const actions = item.statusSolicitacao === "Pendente"
        ? `
          <button class="secondary-action table-action" type="button" data-view-reopen-request="${item.id}">Visualizar</button>
          <button class="primary-action table-action" type="button" data-approve-reopen-request="${item.id}">Aprovar e reabrir</button>
          <button class="secondary-action table-action" type="button" data-deny-reopen-request="${item.id}">Negar</button>
        `
        : `<button class="secondary-action table-action" type="button" data-view-reopen-request="${item.id}">Visualizar</button>`;
      return `
        <tr>
          <td>${escapeHtml(indicador ? `${indicador.numero}. ${indicador.indicador}` : item.indicadorId)}</td>
          <td>${escapeHtml(item.competencia || "-")}</td>
          <td>${escapeHtml(item.solicitanteUsuario || "-")}</td>
          <td>${escapeHtml(item.solicitantePerfil || "-")}</td>
          <td>${escapeHtml(item.tipoAjuste || "-")}</td>
          <td>${escapeHtml(item.justificativa || "-")}</td>
          <td>${item.dataSolicitacao ? new Date(item.dataSolicitacao).toLocaleString("pt-BR") : "-"}</td>
          <td><span class="badge ${statusClass}">${escapeHtml(item.statusSolicitacao || "-")}</span></td>
          <td><div class="row-actions">${actions}</div></td>
        </tr>
      `;
    });
    table(["Indicador", "Competência", "Solicitante", "Perfil", "Tipo de ajuste", "Justificativa", "Data", "Status", "Ações"], rows);
  }

  function viewReopenRequest(id) {
    const item = (state.data.solicitacoesReabertura || []).find((request) => request.id === id);
    if (!item) return;
    window.alert([
      "Solicitação de Reabertura",
      `Indicador: ${item.indicadorId}`,
      `Competência: ${item.competencia || "-"}`,
      `Solicitante: ${item.solicitanteUsuario || "-"}`,
      `Tipo de ajuste: ${item.tipoAjuste || "-"}`,
      `Justificativa: ${item.justificativa || "-"}`,
      `Observação: ${item.observacaoComplementar || "-"}`,
      `Status: ${item.statusSolicitacao || "-"}`
    ].join("\n"));
  }

  async function decideReopenRequest(id, decision) {
    const request = (state.data.solicitacoesReabertura || []).find((item) => item.id === id);
    if (!request || request.statusSolicitacao !== "Pendente") return;
    const label = decision === "approve" ? "aprovação" : "negativa";
    const justificativaDecisao = window.prompt(`Informe a justificativa da ${label}:`);
    if (!justificativaDecisao || !justificativaDecisao.trim()) {
      showMessage("A justificativa da decisão do Administrador é obrigatória.", "warning");
      return;
    }

    const now = new Date().toISOString();
    const originalRequest = { ...request };
    const updatedRequest = {
      ...request,
      statusSolicitacao: decision === "approve" ? "Aprovada" : "Negada",
      administradorResponsavel: state.user.email || state.user.nome,
      decisaoAdministrador: decision === "approve" ? "Aprovar e reabrir" : "Negar",
      justificativaDecisao: justificativaDecisao.trim(),
      dataDecisao: now,
      updatedAt: now
    };

    let updatedLaunch = null;
    if (decision === "approve") {
      const launch = state.data.lancamentos.find((item) => String(item.id) === String(request.lancamentoId));
      if (!launch || launch.status !== "Homologado") {
        showMessage("Lançamento homologado não encontrado para reabertura.", "warning");
        return;
      }
      updatedLaunch = {
        ...launch,
        status: "Reaberto",
        homologadoPor: "",
        dataHomologacao: "",
        reabertoPor: state.user.email || state.user.nome,
        dataReabertura: now,
        solicitacaoReabertura: {
          ...(launch.solicitacaoReabertura || {}),
          status: "Atendida",
          solicitacaoId: request.id,
          dataAtendimento: now
        }
      };
      state.data.lancamentos = state.data.lancamentos.map((item) => String(item.id) === String(updatedLaunch.id) ? updatedLaunch : item);
    }

    state.data.solicitacoesReabertura = (state.data.solicitacoesReabertura || []).map((item) => item.id === id ? updatedRequest : item);
    await Promise.all([
      DataStore.saveLocal("solicitacoesReabertura", state.data.solicitacoesReabertura),
      decision === "approve" ? DataStore.salvarLancamentos(state.data.lancamentos) : Promise.resolve()
    ]);
    await DataStore.appendHistory({
      usuario: state.user.email || state.user.nome,
      acao: decision === "approve" ? "solicitacao_reabertura_aprovada" : "solicitacao_reabertura_negada",
      descricao: decision === "approve"
        ? "Solicitação aprovada pelo Administrador e lançamento reaberto para edição."
        : "Solicitação de reabertura negada pelo Administrador.",
      entidade: "solicitacoes_reabertura",
      registroId: id,
      valorAnterior: originalRequest,
      valorNovo: { solicitacao: updatedRequest, lancamento: updatedLaunch }
    });
    state.data.historico = await DataStore.loadJson("historico");
    showMessage(
      decision === "approve"
        ? "Solicitação aprovada. O lançamento foi reaberto para edição."
        : "Solicitação negada. O lançamento permanece homologado.",
      "info"
    );
    renderCards();
    renderModule();
  }

  async function resetOperationalData() {
    state.data.lancamentos = await DataStore.resetarBaseOperacionalGlobal();
    state.data.homologacoes = await DataStore.loadJson("homologacoes");
    state.data.historico = await DataStore.loadJson("historico");
    showMessage("Lançamentos, homologações e histórico foram reiniciados. Cadastros, metas e regras foram preservados.");
    renderCards();
    renderModule();
  }

  function renderHistorico() {
    const rows = [...state.data.historico].reverse().slice(0, 200).map((item) => `
      <tr>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.dataHora || "-")}</td>
        <td>${escapeHtml(item.usuario || "-")}</td>
        <td>${escapeHtml(item.acao || "-")}</td>
        <td>${escapeHtml(item.entidade || "-")}</td>
        <td>${escapeHtml(item.registroId || "-")}</td>
      </tr>
    `);
    table(["ID", "Data/Hora", "Usuário", "Ação", "Entidade", "Registro"], rows);
  }

  function renderModule() {
    if (state.module === "acessos") {
      renderAccessUsers();
      return;
    }
    if (["usuarios", "planos", "pilares", "unidades", "diretorias"].includes(state.module)) {
      renderSimpleModule(state.module);
      return;
    }
    if (state.module === "indicadores") renderIndicadores();
    if (state.module === "metas") renderMetas();
    if (state.module === "tiposCalculo") renderTiposCalculo();
    if (state.module === "reabertura") renderReabertura();
    if (state.module === "solicitacoesReabertura") renderSolicitacoesReabertura();
    if (state.module === "historico") renderHistorico();
  }

  function bindEvents() {
    document.querySelectorAll("[data-admin-module]").forEach((button) => {
      button.addEventListener("click", () => setModule(button.dataset.adminModule));
    });

    document.getElementById("adminNewButton").addEventListener("click", () => {
      if (state.module === "acessos") {
        openAccessForm();
        return;
      }
      if (state.module === "metas") {
        openMetaForm();
        return;
      }
      openSimpleForm(state.module);
    });

    document.getElementById("resetOperationalDataButton").addEventListener("click", () => {
      const confirmed = window.confirm("Reiniciar todos os lançamentos para Não iniciado e limpar homologações/histórico locais?");
      if (confirmed) resetOperationalData();
    });

    document.getElementById("adminForm").addEventListener("submit", (event) => {
      if (state.module === "acessos") {
        saveAccessForm(event);
        return;
      }
      if (state.module === "metas") {
        saveMetaForm(event);
        return;
      }
      saveSimpleForm(event);
    });

    document.getElementById("adminForm").addEventListener("click", (event) => {
      if (event.target.id === "adminCancelForm") {
        document.getElementById("adminForm").hidden = true;
      }
    });

    document.getElementById("adminTableBody").addEventListener("click", (event) => {
      const accessButton = event.target.closest("[data-edit-access]");
      if (accessButton) {
        const item = (state.accessUsers || []).find((record) => String(record.id) === String(accessButton.dataset.editAccess));
        if (item) openAccessForm(item);
        return;
      }

      const simpleButton = event.target.closest("[data-edit-simple]");
      if (simpleButton) {
        const config = simpleConfig(state.module);
        const id = config.idType === "number" ? Number(simpleButton.dataset.editSimple) : simpleButton.dataset.editSimple;
        const item = state.data[config.key].find((record) => record.id === id);
        openSimpleForm(state.module, item);
        return;
      }

      const metaButton = event.target.closest("[data-edit-meta]");
      if (metaButton) {
        const meta = state.data.metas.find((item) => item.id === Number(metaButton.dataset.editMeta));
        openMetaForm(meta);
        return;
      }

      const reopenButton = event.target.closest("[data-reopen]");
      if (reopenButton) {
        const confirmed = window.confirm("Reabrir este lançamento homologado para ajuste?");
        if (confirmed) reopenLaunch(Number(reopenButton.dataset.reopen));
        return;
      }

      const viewReopenRequestButton = event.target.closest("[data-view-reopen-request]");
      if (viewReopenRequestButton) {
        viewReopenRequest(viewReopenRequestButton.dataset.viewReopenRequest);
        return;
      }

      const approveReopenRequestButton = event.target.closest("[data-approve-reopen-request]");
      if (approveReopenRequestButton) {
        decideReopenRequest(approveReopenRequestButton.dataset.approveReopenRequest, "approve");
        return;
      }

      const denyReopenRequestButton = event.target.closest("[data-deny-reopen-request]");
      if (denyReopenRequestButton) {
        decideReopenRequest(denyReopenRequestButton.dataset.denyReopenRequest, "deny");
      }
    });
  }

  async function init({ data, user }) {
    const storageInfo = await DataStore.getStorageInfo();
    state = { data, user, storageInfo, module: "acessos", editingId: null, accessUsers: null, accessStorage: null, accessStorageWarned: false, loadingAccessUsers: false };
    state.data.solicitacoesReabertura = state.data.solicitacoesReabertura || [];
    renderConfigurationInfo();
    renderCards();
    bindEvents();
    setModule("acessos");
  }

  window.PageModules = window.PageModules || {};
  window.PageModules.administracao = { init };
})();
