(function () {
  const NAV_ITEMS = [
    ["resumo-executivo.html", "Resumo Executivo", "resumoExecutivo"],
    ["visao-trimestral.html", "Visão Trimestral", "visaoTrimestral"],
    ["indicadores.html", "Indicadores", "indicadores"],
    ["lancamentos.html", "Lançamentos", "lancamentos"],
    ["homologacao.html", "Homologação", "homologacao"],
    ["relatorios.html", "Relatórios", "relatorios"],
    ["administracao.html", "Configurações", "administracao"]
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

  async function initLogin() {
    const usuarios = await DataStore.loadJson("usuarios");
    const select = document.getElementById("usuarioSelect");
    const perfilInput = document.getElementById("perfilInput");
    const unidadeInput = document.getElementById("unidadeInput");
    const diretoriaInput = document.getElementById("diretoriaInput");

    select.innerHTML = usuarios.map((usuario) => (
      `<option value="${usuario.id}">${usuario.nome}</option>`
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
      window.location.href = "resumo-executivo.html";
    });
  }

  function renderShell(user, page, storageInfo) {
    const header = document.getElementById("appHeader");
    const nav = document.getElementById("appNav");
    const scope = Auth.getScopeDescription(user);
    const navLinks = NAV_ITEMS
      .filter(([, , key]) => Auth.canAccess(key, user))
      .map(([href, label, key]) => (
        `<a class="nav-link ${key === page ? "active" : ""}" href="${href}">${label}</a>`
      ))
      .join("");

    header.innerHTML = `
      <div class="brand-block">
        <span class="brand-mark">CL</span>
        <div>
          <p class="eyebrow">CAIXA Loterias</p>
          <strong>Indicadores Estratégicos</strong>
        </div>
      </div>
      <button class="topbar-menu-toggle" type="button" aria-expanded="false" aria-controls="topbarNav">Menu</button>
      <nav id="topbarNav" class="topbar-nav" aria-label="Navegação principal">
        ${navLinks}
        <button class="secondary-action logout-button" type="button">Sair</button>
      </nav>
      <div class="user-chip">
        <span>${user.nome}</span>
        <span>${user.perfil}</span>
        <span>${user.unidadeApuradora || user.diretoriaResponsavel || "Escopo geral"}</span>
      </div>
    `;

    if (nav) {
      nav.hidden = true;
      nav.innerHTML = "";
    }

    header.querySelector(".logout-button").addEventListener("click", Auth.logout);
    const menuToggle = header.querySelector(".topbar-menu-toggle");
    const topbarNav = header.querySelector("#topbarNav");
    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!expanded));
      topbarNav.classList.toggle("is-open", !expanded);
    });

    const content = document.querySelector(".content");
    if (content) {
      const flash = Auth.consumeFlashMessage();
      const messages = [
        flash ? `<div class="notice ${flash.type || "info"}">${flash.message}</div>` : "",
        ...storageMessages(storageInfo),
        scope ? `<div class="notice muted">${scope}</div>` : ""
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

    if (!Auth.canAccess(page, user)) {
      Auth.setFlashMessage(Auth.getDeniedMessage(page, user), "warning");
      window.location.href = "resumo-executivo.html";
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
    initPage().catch((error) => {
      console.error(error);
      document.body.insertAdjacentHTML("afterbegin", `<div class="notice">Erro ao iniciar a página: ${error.message}</div>`);
    });
  });
})();

