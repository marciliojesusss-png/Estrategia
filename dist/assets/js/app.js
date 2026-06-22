(function () {
  const NAV_ITEMS = [
    ["dashboard.html", "Dashboard", "dashboard"],
    ["indicadores.html", "Indicadores", "indicadores"],
    ["lancamentos.html", "Lançamentos", "lancamentos"],
    ["homologacao.html", "Homologação", "homologacao"],
    ["relatorios.html", "Relatórios", "relatorios"],
    ["administracao.html", "Administração", "administracao"]
  ];

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
      window.location.href = "dashboard.html";
    });
  }

  function renderShell(user, page) {
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
        scope ? `<div class="notice muted">${scope}</div>` : ""
      ].join("");
      content.insertAdjacentHTML("afterbegin", messages);
    }
  }

  async function initPage() {
    const page = document.body.dataset.page;

    if (page === "login") {
      await initLogin();
      return;
    }

    const user = Auth.requireAuth();
    if (!user) return;

    if (!Auth.canAccess(page, user)) {
      Auth.setFlashMessage(Auth.getDeniedMessage(page, user), "warning");
      window.location.href = "dashboard.html";
      return;
    }

    renderShell(user, page);

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
