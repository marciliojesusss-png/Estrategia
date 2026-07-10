(function () {
  function pageUrl(page) {
    const cleanPage = String(page).replace(/\.(html|php)$/i, "");
    if (cleanPage === "index") return "/";
    if (cleanPage === "homologacao") return "/homologacoes";
    return `/${cleanPage.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
  }

  window.AppRoutes = { page: pageUrl };

  const NAV_ITEMS = [
    [pageUrl("resumo-executivo"), "Resumo Executivo", "resumoExecutivo"],
    [pageUrl("visao-trimestral"), "Visão Trimestral", "visaoTrimestral"],
    [pageUrl("indicadores"), "Indicadores", "indicadores"],
    [pageUrl("lancamentos"), "Lançamentos", "lancamentos"],
    [pageUrl("homologacao"), "Homologação", "homologacao"],
    [pageUrl("relatorios"), "Relatórios", "relatorios"],
    [pageUrl("administracao"), "Configurações", "administracao"]
  ];

  function storageMessages(storageInfo) {
    if (!storageInfo) return [];
    const messages = [];
    if (storageInfo.mode === "validacao_local" || storageInfo.mode === "browser") {
      messages.push(`
        <details class="notice info storage-notice">
          <summary>
            <strong>Modo validação local ativo.</strong>
            <span>Dados salvos neste perfil do navegador.</span>
          </summary>
          <p>Contas/perfis diferentes do Google Chrome possuem armazenamentos locais separados. A base SQL versionada fica no arquivo <code>/database/indicadores.sqlite</code>.</p>
        </details>
      `);
    }
    if (storageInfo.mode === "browser") {
      messages.push(`
        <div class="notice info compact-notice">
          <strong>Armazenamento local do navegador ativo.</strong>
          As informacoes ficam salvas neste navegador automaticamente, sem iniciar servidor ou arquivo .bat.
        </div>
      `);
    }
    messages.push(`
      <div class="notice muted compact-notice sql-local-notice">
        <strong>Modo SQL local ativo.</strong>
        A base versionavel fica em <code>/database/indicadores.sqlite</code> e nao substitui o banco corporativo multiusuario.
      </div>
    `);
    return messages;
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

    header.innerHTML = `
      <div class="header-top">
        <div class="brand-block header-brand">
          <img class="brand-logo-caixa-loterias" src="/assets/img/caixa-loterias-logo-negativa.png?v=2" alt="CAIXA Loterias">
          <span class="brand-divider" aria-hidden="true"></span>
          <span class="brand-system-name">Indicadores Estratégicos</span>
        </div>
        <div class="header-actions">
          <span class="header-chip">${escapeHtml(user.nome)}</span>
          <span class="header-chip">${escapeHtml(user.perfil)}</span>
          <span class="header-chip">${escapeHtml(user.unidadeApuradora || user.diretoriaResponsavel || "Escopo geral")}</span>
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

    header.querySelector(".logout-button").addEventListener("click", Auth.logout);

    const content = document.querySelector(".content");
    if (content) {
      const flash = Auth.consumeFlashMessage();
      const showTechnicalNotices = Auth.isAdministrador(user.perfil);
      const messages = [
        flash ? `<div class="notice ${escapeHtml(flash.type || "info")}">${escapeHtml(flash.message)}</div>` : "",
        ...(showTechnicalNotices ? storageMessages(storageInfo) : []),
        showTechnicalNotices && scope ? `<div class="notice muted">${scope}</div>` : ""
      ].join("");
      content.insertAdjacentHTML("afterbegin", messages);
    }
  }

  async function initPage() {
    const page = document.body.dataset.page;
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
      const data = await DataStore.loadAll();
      await module.init({ data, user });
    }
    if (window.DataService?.initBaseValidacaoLocal) {
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
})();

