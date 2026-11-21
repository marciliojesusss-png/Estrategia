(function () {
  const appVersion = String(document.documentElement?.dataset?.appVersion || "").trim();
  window.APP_VERSION = appVersion;
  const THEME_STORAGE_KEY = "caixa-loterias-theme";
  const THEME_PREFERENCES = new Set(["dark", "light", "system"]);

  function normalizeThemePreference(value) {
    const preference = String(value || "").trim().toLowerCase();
    return THEME_PREFERENCES.has(preference) ? preference : "dark";
  }

  function storedThemePreference() {
    try {
      return normalizeThemePreference(window.localStorage?.getItem(THEME_STORAGE_KEY));
    } catch (_) {
      return "dark";
    }
  }

  function resolvedTheme(preference = storedThemePreference()) {
    const normalized = normalizeThemePreference(preference);
    if (normalized !== "system") return normalized;
    return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
  }

  function chartPalette(theme = resolvedTheme()) {
    return theme === "light"
      ? {
          text: "#40566d",
          legend: "#24384d",
          border: "rgba(67, 101, 133, 0.22)",
          grid: "rgba(67, 101, 133, 0.16)",
          tooltipBackground: "rgba(18, 43, 68, 0.97)",
          tooltipTitle: "#ffffff",
          tooltipBody: "#e8f1fa",
          tooltipBorder: "rgba(0, 102, 179, 0.42)"
        }
      : {
          text: "#afc4dd",
          legend: "#d7ecff",
          border: "rgba(59, 151, 255, 0.18)",
          grid: "rgba(140, 177, 214, 0.16)",
          tooltipBackground: "rgba(3, 17, 38, 0.95)",
          tooltipTitle: "#f5f9ff",
          tooltipBody: "#d7ecff",
          tooltipBorder: "rgba(49, 196, 255, 0.35)"
        };
  }

  function pageUrl(page, params) {
    const cleanPage = String(page).replace(/\.(html|php)$/i, "");
    const route = cleanPage === "index"
      ? "dashboard"
      : cleanPage === "homologacao"
        ? "homologacoes"
        : cleanPage.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    if (window.appUrl) return window.appUrl(route, params);
    const query = params ? `&${new URLSearchParams(params).toString()}` : "";
    return `${window.APP_BASE_PATH || ""}/index.php?route=${encodeURIComponent(route).replace(/%2F/g, "/")}${query}`;
  }

  window.AppRoutes = { page: pageUrl };

  const NAV_ITEMS = [
    [pageUrl("resumo-executivo"), "Resumo Executivo", "resumoExecutivo"],
    [pageUrl("visao-trimestral"), "Visão Trimestral", "visaoTrimestral"],
    [pageUrl("indicadores"), "Indicadores", "indicadores"],
    [pageUrl("lancamentos"), "Lançamentos", "lancamentos"],
    [pageUrl("iniciativas"), "Iniciativas Estratégicas", "iniciativas"],
    [pageUrl("homologacao"), "Homologação", "homologacao"],
    [pageUrl("iniciativas/homologacao"), "Homologação de Iniciativas", "iniciativasHomologacao"],
    [pageUrl("iniciativas/consolidacao-ca"), "Consolidação CA", "iniciativasConsolidacao"],
    [pageUrl("relatorios"), "Relatórios", "relatorios"],
    [pageUrl("administracao"), "Configurações", "administracao"],
    [pageUrl("auditoria"), "Auditoria", "auditoria"]
  ];

  function navigationLabel(label, key, user) {
    const profile = String(user?.perfilCodigo || "").trim().toLowerCase();
    const profileName = String(user?.perfil || "").trim();
    if (profile === "auditor_caixa") {
      if (key === "relatorios") return "Dossiê de Auditoria";
      if (key === "auditoria") return "Trilha de Auditoria";
      if (key === "lancamentos") return "Lançamentos (consulta)";
    }
    if (key === "lancamentos" && (["homologador", "consultor_diretoria"].includes(profile) || ["Diretoria Homologadora", "Consultor da Diretoria"].includes(profileName))) {
      return "Lançamentos (consulta)";
    }
    if (key === "homologacao" && (profile === "unidade_apuradora" || profileName === "Unidade Apuradora")) {
      return "Histórico de Homologações";
    }
    return label;
  }

  function storageMessages(storageInfo) {
    if (!storageInfo) return [];
    if (storageInfo.centralAvailable) return [];
    return [`
      <div class="notice danger compact-notice">
        <strong>SQL Server indisponível.</strong>
        A aplicação não utiliza fonte alternativa de dados.
      </div>
    `];
  }

  function renderLoginStorageNotice(storageInfo) {
    const target = document.querySelector(".login-panel .brand-block");
    if (!target) return;
    const messages = storageMessages(storageInfo);
    if (!messages.length) return;
    target.insertAdjacentHTML("afterend", messages.join(""));
  }

  function isActiveAdministrator(user) {
    const activeProfile = String(user?.perfilCodigo || user?.perfil || "").trim().toLowerCase();
    return activeProfile === "administrador";
  }

  function isIndependentInitiativePage(page) {
    return ["iniciativas", "iniciativasHomologacao", "iniciativasConsolidacao"].includes(page);
  }

  function shouldLoadStorageInfo(page, user) {
    return !isIndependentInitiativePage(page) && isActiveAdministrator(user);
  }

  function configureChartTheme(theme = resolvedTheme()) {
    if (!window.Chart) return;
    const palette = chartPalette(theme);
    Chart.defaults.color = palette.text;
    Chart.defaults.borderColor = palette.border;
    Chart.defaults.font.family = 'Inter, "Segoe UI", Arial, Helvetica, sans-serif';
    Chart.defaults.plugins.legend.labels.color = palette.legend;
    Chart.defaults.plugins.tooltip.backgroundColor = palette.tooltipBackground;
    Chart.defaults.plugins.tooltip.titleColor = palette.tooltipTitle;
    Chart.defaults.plugins.tooltip.bodyColor = palette.tooltipBody;
    Chart.defaults.plugins.tooltip.borderColor = palette.tooltipBorder;
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    Object.values(Chart.instances || {}).forEach((chart) => {
      if (chart.options?.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = palette.legend;
      if (chart.options?.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = palette.tooltipBackground;
        chart.options.plugins.tooltip.titleColor = palette.tooltipTitle;
        chart.options.plugins.tooltip.bodyColor = palette.tooltipBody;
        chart.options.plugins.tooltip.borderColor = palette.tooltipBorder;
      }
      Object.values(chart.options?.scales || {}).forEach((scale) => {
        if (scale.ticks) scale.ticks.color = palette.text;
        if (scale.grid) scale.grid.color = palette.grid;
      });
      chart.update("none");
    });
  }

  function applyTheme(preference, { persist = false, notify = false } = {}) {
    const normalized = normalizeThemePreference(preference);
    const theme = resolvedTheme(normalized);
    const root = document.documentElement;
    if (root?.dataset) {
      root.dataset.theme = theme;
      root.dataset.themePreference = normalized;
    }
    document.body?.classList?.toggle?.("theme-dark-blue", theme === "dark");
    document.body?.classList?.toggle?.("theme-light-institutional", theme === "light");
    if (persist) {
      try {
        window.localStorage?.setItem(THEME_STORAGE_KEY, normalized);
      } catch (_) {
        // A preferência visual continua válida durante a página atual.
      }
    }
    configureChartTheme(theme);
    if (notify && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("app:themechange", { detail: { preference: normalized, theme } }));
    }
    return { preference: normalized, theme };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderBrand(logoUrl) {
    const version = appVersion
      ? `<span class="system-version" aria-label="Versão ${escapeHtml(appVersion)}">v${escapeHtml(appVersion)}</span>`
      : "";
    return `
      <div class="brand-block header-brand">
        <img class="brand-logo-caixa-loterias" src="${logoUrl}" alt="CAIXA Loterias">
        <span class="brand-divider" aria-hidden="true"></span>
        <span class="brand-system">
          <span class="brand-system-name">Indicadores Estratégicos</span>
          ${version}
        </span>
      </div>`;
  }

  async function initLogin() {
    const usuarios = await DataStore.loadJson("usuarios");
    const select = document.getElementById("usuarioSelect");
    const perfilInput = document.getElementById("perfilInput");
    const unidadeInput = document.getElementById("unidadeInput");
    const diretoriaInput = document.getElementById("diretoriaInput");

    select.innerHTML = usuarios.map((usuario) => (
      `<option value="${escapeHtml(usuario.id)}">${escapeHtml(usuario.nome)}</option>`
    )).join("");

    function fillUser() {
      const user = usuarios.find((item) => item.id === select.value) || usuarios[0];
      perfilInput.value = user.perfil;
      unidadeInput.value = user.unidadeApuradora || "Todas";
      diretoriaInput.value = user.diretoriaResponsavel || "Todas";
    }

    select.addEventListener("change", fillUser);
    fillUser();

    document.getElementById("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const user = usuarios.find((item) => item.id === select.value);
      Auth.login(user);
      window.location.href = pageUrl("resumo-executivo");
    });
  }

  function renderShell(user, page, storageInfo) {
    const header = document.getElementById("appHeader");
    const nav = document.getElementById("appNav");
    const scope = Auth.getScopeDescription(user);
    header.className = "app-header";
    const navLinks = NAV_ITEMS
      .filter(([, , key]) => Auth.canAccess(key, user))
      .map(([href, label, key]) => (
        `<a class="nav-link ${key === page ? "active" : ""}" href="${href}">${escapeHtml(navigationLabel(label, key, user))}</a>`
      ))
      .join("");
    const logoUrl = window.assetUrl
      ? window.assetUrl("assets/img/caixa-loterias-logo-atual.png?v=2")
      : `${window.APP_BASE_PATH || ""}/assets/img/caixa-loterias-logo-atual.png?v=2`;
    const administratorOptions = Array.isArray(user.visoesAdministrador)
      ? user.visoesAdministrador.map((view) => `<option value="${escapeHtml(view.valor)}" ${view.valor === user.visaoAdministrador ? "selected" : ""}>${escapeHtml(view.rotulo)}</option>`).join("")
      : "";
    const administratorView = user.podeAlternarVisao ? `
      <form class="administrator-view-form" method="post" action="${escapeHtml(window.appUrl ? window.appUrl("alternar-visao") : pageUrl("alternar-visao"))}">
        <input type="hidden" name="_csrf_token" value="${escapeHtml(user.csrfToken || "")}">
        <label for="administratorViewSelect">Visualizar como</label>
        <select id="administratorViewSelect" name="visao" onchange="this.form.submit()">
          ${administratorOptions}
        </select>
      </form>` : "";
    const themePreference = storedThemePreference();
    const themeSelector = `
      <label class="theme-preference" for="themePreferenceSelect">
        <span>Tema</span>
        <select id="themePreferenceSelect" aria-label="Tema visual do sistema">
          <option value="dark" ${themePreference === "dark" ? "selected" : ""}>Azul Noturno</option>
          <option value="light" ${themePreference === "light" ? "selected" : ""}>Claro Institucional</option>
          <option value="system" ${themePreference === "system" ? "selected" : ""}>Automático</option>
        </select>
      </label>`;

    header.innerHTML = `
      <div class="header-top">
        ${renderBrand(logoUrl)}
        <div class="header-actions">
          <span class="header-chip">${escapeHtml(user.nome)}</span>
          <span class="header-chip">${escapeHtml(user.perfil)}</span>
          <span class="header-chip">${escapeHtml(user.unidadeApuradora || user.diretoriaResponsavel || "Escopo geral")}</span>
          ${administratorView}
          ${themeSelector}
          <button class="secondary-action logout-button btn-sair" type="button">Sair</button>
        </div>
      </div>
      <nav class="header-nav" aria-label="Navegação principal">
        ${navLinks}
      </nav>
    `;

    if (nav) {
      nav.hidden = true;
      nav.innerHTML = "";
    }

    header.querySelector(".logout-button").addEventListener("click", () => {
      if (window.LogoutModal) {
        window.LogoutModal.open();
        return;
      }
      window.location.href = window.appUrl ? window.appUrl("logout") : `${window.APP_BASE_PATH || ""}/index.php?route=logout`;
    });
    header.querySelector("#themePreferenceSelect")?.addEventListener("change", (event) => {
      applyTheme(event.target.value, { persist: true, notify: true });
    });

    const content = document.querySelector(".content");
    if (content) {
      const flash = Auth.consumeFlashMessage();
      const showTechnicalNotices = Auth.isAdministrador(user.perfil);
      const selectedView = Array.isArray(user.visoesAdministrador)
        ? user.visoesAdministrador.find((view) => view.valor === user.visaoAdministrador)
        : null;
      const simulatedView = user.podeAlternarVisao && user.visaoAdministrador !== "administrador" && selectedView
        ? `<div class="notice info">Visualizando como ${escapeHtml(selectedView.rotulo)}. Sua identidade de administrador permanece registrada nas ações e na auditoria.</div>`
        : "";
      const messages = [
        simulatedView,
        flash ? `<div class="notice ${escapeHtml(flash.type || "info")}">${escapeHtml(flash.message)}</div>` : "",
        ...(showTechnicalNotices ? storageMessages(storageInfo) : []),
        showTechnicalNotices && scope ? `<div class="notice muted">${scope}</div>` : ""
      ].join("");
      content.insertAdjacentHTML("afterbegin", messages);
    }
  }

  async function initPage() {
    const page = document.body.dataset.page;
    const centralExecutive = page === "resumoExecutivo";
    const independentInitiatives = isIndependentInitiativePage(page);
    const independentAudit = page === "auditoria";
    const independentReports = page === "relatorios";

    if (page === "login") {
      const storageInfo = await DataStore.getStorageInfo();
      await initLogin();
      renderLoginStorageNotice(storageInfo);
      return;
    }

    const user = Auth.requireAuth();
    if (!user) return;

    const institutionalIndicatorDetail = page === "indicadores" &&
      user.perfilCodigo === "usuario_companhia" &&
      new URLSearchParams(window.location.search).get("view") === "detalhe";

    if (!Auth.canAccess(page, user, { allowIndicatorDetail: true })) {
      Auth.setFlashMessage(Auth.getDeniedMessage(page, user), "warning");
      window.location.href = pageUrl("resumo-executivo");
      return;
    }

    const storageInfo = shouldLoadStorageInfo(page, user)
      ? await DataStore.getStorageInfo()
      : null;
    renderShell(user, page, storageInfo);

    const module = window.PageModules && window.PageModules[page];
    if (module) {
      if (institutionalIndicatorDetail) {
        await module.init({
          user,
          data: {
            indicadores: [], lancamentos: [], regrasIndicadores: [], historico: [],
            homologacoes: [], solicitacoesReabertura: [], planos: [], pilares: [],
            unidades: [], diretorias: []
          }
        });
      } else if (centralExecutive || independentInitiatives || independentAudit || independentReports) {
        await module.init({ user });
      } else {
        const data = await DataStore.loadAll();
        await module.init({ data, user });
      }
    }
    if (!centralExecutive && !independentInitiatives && !independentReports && window.DataService?.initBaseValidacaoLocal) {
      window.DataService.initBaseValidacaoLocal();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(storedThemePreference());
    const systemTheme = window.matchMedia?.("(prefers-color-scheme: light)");
    systemTheme?.addEventListener?.("change", () => {
      if (storedThemePreference() === "system") applyTheme("system", { notify: true });
    });
    initPage().catch((error) => {
      console.error(error);
      document.body.insertAdjacentHTML("afterbegin", `<div class="notice">Erro ao iniciar a página: ${escapeHtml(error.message)}</div>`);
    });
  });

  window.AppTheme = {
    apply: (preference) => applyTheme(preference, { persist: true, notify: true }),
    getPreference: storedThemePreference,
    getResolvedTheme: () => resolvedTheme(storedThemePreference())
  };
  window.__APP_HEADER_TEST_INTERNALS__ = {
    renderBrand,
    appVersion,
    normalizeThemePreference,
    resolvedTheme,
    chartPalette,
    applyTheme
  };
})();

