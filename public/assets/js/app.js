(function () {
  const appVersion = String(document.documentElement?.dataset?.appVersion || "").trim();
  window.APP_VERSION = appVersion;

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
    [pageUrl("homologacao"), "Homologação", "homologacao"],
    [pageUrl("relatorios"), "Relatórios", "relatorios"],
    [pageUrl("administracao"), "Configurações", "administracao"],
    [pageUrl("auditoria"), "Auditoria", "auditoria"]
  ];

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

  function configureChartTheme() {
    if (!window.Chart) return;
    Chart.defaults.color = "#afc4dd";
    Chart.defaults.borderColor = "rgba(59, 151, 255, 0.18)";
    Chart.defaults.font.family = 'Inter, "Segoe UI", Arial, Helvetica, sans-serif';
    Chart.defaults.plugins.legend.labels.color = "#d7ecff";
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(3, 17, 38, 0.95)";
    Chart.defaults.plugins.tooltip.titleColor = "#f5f9ff";
    Chart.defaults.plugins.tooltip.bodyColor = "#d7ecff";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(49, 196, 255, 0.35)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
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
        `<a class="nav-link ${key === page ? "active" : ""}" href="${href}">${label}</a>`
      ))
      .join("");
    const logoUrl = window.assetUrl
      ? window.assetUrl("assets/img/caixa-loterias-logo-negativa.png?v=2")
      : `${window.APP_BASE_PATH || ""}/assets/img/caixa-loterias-logo-negativa.png?v=2`;
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

    header.innerHTML = `
      <div class="header-top">
        ${renderBrand(logoUrl)}
        <div class="header-actions">
          <span class="header-chip">${escapeHtml(user.nome)}</span>
          <span class="header-chip">${escapeHtml(user.perfil)}</span>
          <span class="header-chip">${escapeHtml(user.unidadeApuradora || user.diretoriaResponsavel || "Escopo geral")}</span>
          ${administratorView}
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
    const storageInfo = await DataStore.getStorageInfo();

    if (page === "login") {
      await initLogin();
      renderLoginStorageNotice(storageInfo);
      return;
    }

    const user = Auth.requireAuth();
    if (!user) return;

    if (!Auth.canAccess(page, user, { allowIndicatorDetail: true })) {
      Auth.setFlashMessage(Auth.getDeniedMessage(page, user), "warning");
      window.location.href = pageUrl("resumo-executivo");
      return;
    }

    renderShell(user, page, storageInfo);

    const module = window.PageModules && window.PageModules[page];
    if (module) {
      if (centralExecutive) {
        await module.init({ user });
      } else {
        const data = await DataStore.loadAll();
        await module.init({ data, user });
      }
    }
    if (!centralExecutive && window.DataService?.initBaseValidacaoLocal) {
      window.DataService.initBaseValidacaoLocal();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("theme-dark-blue");
    configureChartTheme();
    initPage().catch((error) => {
      console.error(error);
      document.body.insertAdjacentHTML("afterbegin", `<div class="notice">Erro ao iniciar a página: ${escapeHtml(error.message)}</div>`);
    });
  });

  window.__APP_HEADER_TEST_INTERNALS__ = { renderBrand, appVersion };
})();

