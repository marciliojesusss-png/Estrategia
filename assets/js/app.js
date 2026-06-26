(function () {
  const NAV_ITEMS = [
    ["resumo-executivo.html", "Resumo Executivo", "resumoExecutivo"],
    ["visao-trimestral.html", "Visão Trimestral", "visaoTrimestral"],
    ["dashboard.html", "Dashboard", "dashboard"],
    ["indicadores.html", "Indicadores", "indicadores"],
    ["lancamentos.html", "Lançamentos", "lancamentos"],
    ["homologacao.html", "Homologação", "homologacao"],
    ["relatorios.html", "Relatórios", "relatorios"],
    ["administracao.html", "Administração", "administracao"]
  ];

  function storageMessages(storageInfo) {
    if (!storageInfo) return [];
    const messages = [];
    if (storageInfo.mode === "local") {
      messages.push(`
        <div class="notice warning">
          <strong>Base central não detectada.</strong>
          As informações ficam salvas apenas neste perfil do Chrome. Para refletir em qualquer usuário/perfil, abra o sistema pelo servidor JSON: <code>iniciar-banco-json.bat</code>.
        </div>
      `);
    }
    if (storageInfo.hasPendingLocalBackup) {
      messages.push(`
        <div class="notice warning">
          Existem dados locais antigos diferentes da base central. Eles foram preservados como backup neste navegador, mas a base JSON central foi mantida como fonte oficial.
        </div>
      `);
    }
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

    header.innerHTML = `
      <div class="brand-block">
        <span class="brand-mark">CL</span>
        <div>
          <p class="eyebrow">CAIXA Loterias</p>
          <strong>Indicadores Estratégicos</strong>
        </div>
      </div>
      <div class="user-chip">
        <span>${user.nome}</span>
        <span>${user.perfil}</span>
        <span>${user.unidadeApuradora || user.diretoriaResponsavel || "Escopo geral"}</span>
      </div>
    `;

    nav.innerHTML = NAV_ITEMS
      .filter(([, , key]) => Auth.canAccess(key, user))
      .map(([href, label, key]) => (
        `<a class="nav-link ${key === page ? "active" : ""}" href="${href}">${label}</a>`
      ))
      .join("") + '<button class="secondary-action logout-button" type="button">Sair</button>';

    nav.querySelector(".logout-button").addEventListener("click", Auth.logout);

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
      window.location.href = "dashboard.html";
      return;
    }

    renderShell(user, page, storageInfo);

    const module = window.PageModules && window.PageModules[page];
    if (module) {
      const data = await DataStore.loadAll();
      await module.init({ data, user });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPage().catch((error) => {
      console.error(error);
      document.body.insertAdjacentHTML("afterbegin", `<div class="notice">Erro ao iniciar a página: ${error.message}</div>`);
    });
  });
})();
