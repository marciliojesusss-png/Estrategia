(function () {
  const SESSION_KEY = "central_indicadores_usuario_atual";
  const PROFILE_KEY = "central_indicadores_perfil_atual";
  const PERMISSIONS_KEY = "central_indicadores_permissoes_atual";
  const FLASH_KEY = "caixaLoterias:mensagemSistema";

  const PAGE_ACCESS = {
    resumoExecutivo: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestao", "Consulta/Gest\u00e3o", "Usuario Companhia", "Usu\u00e1rio Companhia"],
    visaoTrimestral: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestao", "Consulta/Gest\u00e3o", "Usuario Companhia", "Usu\u00e1rio Companhia"],
    indicadores: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestao", "Consulta/Gest\u00e3o", "Usuario Companhia", "Usu\u00e1rio Companhia"],
    lancamentos: ["Administrador", "Unidade Apuradora"],
    homologacao: ["Administrador", "Diretoria Homologadora"],
    relatorios: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestao", "Consulta/Gest\u00e3o", "Usuario Companhia", "Usu\u00e1rio Companhia"],
    administracao: ["Administrador"]
  };
  const USER_COMPANY_ALLOWED_PAGES = ["resumoExecutivo", "visaoTrimestral"];

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isUsuarioCompanhia(perfil) {
    const value = normalizeText(perfil).replace(/\s+/g, " ");
    return value === "usuario da companhia" ||
      value === "usuario companhia" ||
      value === "usuario_companhia" ||
      value === "consulta institucional";
  }

  function isAdministrador(perfil) {
    const value = normalizeText(perfil).replace(/\s+/g, " ");
    return value === "administrador" ||
      value === "admin" ||
      value === "administrador_sistema";
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function login(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(PROFILE_KEY, user.perfil || "");
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(getAllowedPages(user)));
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    window.location.href = window.AppRoutes ? window.AppRoutes.page("index") : "index.html";
  }

  function requireAuth() {
    const user = getCurrentUser();
    if (!user && document.body.dataset.page !== "login") {
      window.location.href = window.AppRoutes ? window.AppRoutes.page("index") : "index.html";
      return null;
    }
    return user;
  }

  function canAccess(page, user, options = {}) {
    if (!user) {
      return page === "login";
    }

    if (isAdministrador(user.perfil)) {
      return Object.prototype.hasOwnProperty.call(PAGE_ACCESS, page);
    }

    if (isUsuarioCompanhia(user.perfil)) {
      if (options.allowIndicatorDetail && page === "indicadores") {
        const params = new URLSearchParams(window.location.search);
        return params.has("indicadorId") || params.has("id");
      }
      return USER_COMPANY_ALLOWED_PAGES.includes(page);
    }

    return (PAGE_ACCESS[page] || []).includes(user.perfil);
  }

  function getAllowedPages(user) {
    return Object.keys(PAGE_ACCESS).filter((page) => canAccess(page, user));
  }

  function setFlashMessage(message, type = "info") {
    localStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
  }

  function consumeFlashMessage() {
    const raw = localStorage.getItem(FLASH_KEY);
    if (!raw) return null;
    localStorage.removeItem(FLASH_KEY);
    return JSON.parse(raw);
  }

  function normalizeScopeValue(value) {
    return String(value || "")
      .replace(/^Unidade\s+/i, "")
      .replace(/^Diretoria\s+/i, "")
      .trim()
      .toUpperCase();
  }

  function isBroadProfile(profile) {
    return ["Administrador", "Consulta/Gestao", "Consulta/Gest\u00e3o", "Usuario Companhia", "Usu\u00e1rio Companhia"].includes(profile);
  }

  function indicatorUnit(indicator) {
    return indicator?.unidadeApuradora ?? indicator?.unidade_apuradora ?? "";
  }

  function indicatorDirectory(indicator) {
    return indicator?.diretoriaResponsavel ?? indicator?.diretoria_responsavel ?? "";
  }

  function userUnit(user) {
    return user?.unidadeApuradora ?? user?.unidade ?? user?.unidade_apuradora ?? "";
  }

  function userDirectory(user) {
    return user?.diretoriaResponsavel ?? user?.diretoria ?? user?.diretoria_responsavel ?? "";
  }

  function filterIndicatorsByUser(indicadores, user) {
    if (!user || isBroadProfile(user.perfil)) {
      return indicadores;
    }

    if (user.perfil === "Unidade Apuradora") {
      const unidade = normalizeScopeValue(userUnit(user));
      return indicadores.filter((item) => normalizeScopeValue(indicatorUnit(item)) === unidade);
    }

    if (user.perfil === "Diretoria Homologadora") {
      const diretoria = normalizeScopeValue(userDirectory(user));
      return indicadores.filter((item) => normalizeScopeValue(indicatorDirectory(item)) === diretoria);
    }

    return indicadores;
  }

  function filterLaunchesByUser(lancamentos, indicadores, user) {
    const scopedIndicators = filterIndicatorsByUser(indicadores, user);
    const indicatorIds = new Set(scopedIndicators.map((item) => String(item.id)));
    return lancamentos.filter((item) => indicatorIds.has(String(item.indicadorId)));
  }

  function getScopeDescription(user) {
    if (!user) return "";
    if (isAdministrador(user.perfil)) {
      return "Perfil administrador: visualiza\u00e7\u00e3o completa dos indicadores e par\u00e2metros.";
    }
    if (["Consulta/Gestao", "Consulta/Gest\u00e3o"].includes(user.perfil)) {
      return "Perfil consulta/gest\u00e3o: visualiza\u00e7\u00e3o geral sem a\u00e7\u00f5es de edi\u00e7\u00e3o ou homologa\u00e7\u00e3o.";
    }
    if (isUsuarioCompanhia(user.perfil)) {
      return "Perfil usu\u00e1rio da companhia: consulta institucional, sem preenchimento, homologa\u00e7\u00e3o ou administra\u00e7\u00e3o.";
    }
    if (user.perfil === "Unidade Apuradora") {
      return `Perfil unidade apuradora: dados restritos \u00e0 unidade ${normalizeScopeValue(userUnit(user)) || "n\u00e3o informada"}.`;
    }
    if (user.perfil === "Diretoria Homologadora") {
      return `Perfil diretoria homologadora: dados restritos \u00e0 diretoria ${normalizeScopeValue(userDirectory(user)) || "n\u00e3o informada"}.`;
    }
    return "Perfil sem escopo definido.";
  }

  function getDeniedMessage(page, user) {
    const labels = {
      lancamentos: "Lancamento Mensal",
      homologacao: "Homologa\u00e7\u00e3o",
      relatorios: "Relat\u00f3rios",
      administracao: "Configura\u00e7\u00f5es"
    };
    if (isUsuarioCompanhia(user?.perfil)) {
      return "Seu perfil possui acesso apenas \u00e0s vis\u00f5es consolidadas.";
    }
    return `${user.perfil} n\u00e3o possui acesso \u00e0 tela ${labels[page] || page}.`;
  }

  window.Auth = {
    getCurrentUser,
    login,
    logout,
    requireAuth,
    canAccess,
    isUsuarioCompanhia,
    isAdministrador,
    getAllowedPages,
    setFlashMessage,
    consumeFlashMessage,
    filterIndicatorsByUser,
    filterLaunchesByUser,
    getScopeDescription,
    getDeniedMessage
  };
})();
