(function () {
  const SESSION_KEY = "central_indicadores_usuario_atual";
  const PROFILE_KEY = "central_indicadores_perfil_atual";
  const PERMISSIONS_KEY = "central_indicadores_permissoes_atual";
  const FLASH_KEY = "caixaLoterias:mensagemSistema";

  const PAGE_ACCESS = {
    resumoExecutivo: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestão", "Usuário Companhia"],
    visaoTrimestral: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestão", "Usuário Companhia"],
    indicadores: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestão", "Usuário Companhia"],
    lancamentos: ["Administrador", "Unidade Apuradora"],
    homologacao: ["Administrador", "Diretoria Homologadora"],
    relatorios: ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestão", "Usuário Companhia"],
    administracao: ["Administrador"]
  };

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
    window.location.href = "index.html";
  }

  function requireAuth() {
    const user = getCurrentUser();
    if (!user && document.body.dataset.page !== "login") {
      window.location.href = "index.html";
      return null;
    }
    return user;
  }

  function canAccess(page, user) {
    if (!user) {
      return page === "login";
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

  function filterIndicatorsByUser(indicadores, user) {
    if (!user || ["Administrador", "Consulta/Gestão", "Usuário Companhia"].includes(user.perfil)) {
      return indicadores;
    }

    if (user.perfil === "Unidade Apuradora") {
      return indicadores.filter((item) => item.unidadeApuradora === user.unidadeApuradora);
    }

    if (user.perfil === "Diretoria Homologadora") {
      return indicadores.filter((item) => item.diretoriaResponsavel === user.diretoriaResponsavel);
    }

    return indicadores;
  }

  function filterLaunchesByUser(lancamentos, indicadores, user) {
    const scopedIndicators = filterIndicatorsByUser(indicadores, user);
    const indicatorIds = new Set(scopedIndicators.map((item) => item.id));
    return lancamentos.filter((item) => indicatorIds.has(item.indicadorId));
  }

  function getScopeDescription(user) {
    if (!user) return "";
    if (user.perfil === "Administrador") {
      return "Perfil administrador: visualização completa dos indicadores e parâmetros.";
    }
    if (user.perfil === "Consulta/Gestão") {
      return "Perfil consulta/gestão: visualização geral sem ações de edição ou homologação.";
    }
    if (user.perfil === "Usuário Companhia") {
      return "Perfil usuário da companhia: consulta institucional, sem preenchimento, homologação ou administração.";
    }
    if (user.perfil === "Unidade Apuradora") {
      return `Perfil unidade apuradora: dados restritos à unidade ${user.unidadeApuradora || "não informada"}.`;
    }
    if (user.perfil === "Diretoria Homologadora") {
      return `Perfil diretoria homologadora: dados restritos à diretoria ${user.diretoriaResponsavel || "não informada"}.`;
    }
    return "Perfil sem escopo definido.";
  }

  function getDeniedMessage(page, user) {
    const labels = {
      lancamentos: "Lançamento Mensal",
      homologacao: "Homologação",
      relatorios: "Relatórios",
      administracao: "Configurações"
    };
    return `${user.perfil} não possui acesso à tela ${labels[page] || page}.`;
  }

  window.Auth = {
    getCurrentUser,
    login,
    logout,
    requireAuth,
    canAccess,
    getAllowedPages,
    setFlashMessage,
    consumeFlashMessage,
    filterIndicatorsByUser,
    filterLaunchesByUser,
    getScopeDescription,
    getDeniedMessage
  };
})();
