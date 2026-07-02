(function () {
  const BASE_KEY = "central_indicadores_base_validacao";
  const VALID_STATUSES = new Set([
    "Nao iniciado",
    "N\u00e3o iniciado",
    "N\u00c3\u00a3o iniciado",
    "Rascunho",
    "Em preenchimento",
    "Enviado para homologa\u00e7\u00e3o",
    "Enviado para homologa\u00c3\u00a7\u00c3\u00a3o",
    "Homologado",
    "Devolvido para ajuste",
    "Reaberto",
    "Retificado",
    "Cancelado"
  ]);

  function metadata() {
    return {
      sistema: "Central de Indicadores Estrategicos",
      empresa: "CAIXA Loterias",
      modo: "validacao_local",
      versaoBase: "1.0",
      dataAtualizacao: new Date().toISOString(),
      anoReferencia: 2026
    };
  }

  function toValidationBase(data) {
    return {
      metadata: { ...metadata(), ...(data.metadata || {}) },
      indicadores: data.indicadores || [],
      lancamentos: data.lancamentos || [],
      homologacoes: data.homologacoes || [],
      retificacoes: data.retificacoes || [],
      evidencias: data.evidencias || [],
      auditoria: data.auditoria || data.historico || [],
      configuracoes: {
        planos: data.planos || data.configuracoes?.planos || [],
        pilares: data.pilares || data.configuracoes?.pilares || [],
        unidades: data.unidades || data.configuracoes?.unidades || [],
        diretorias: data.diretorias || data.configuracoes?.diretorias || [],
        metas: data.metas || data.configuracoes?.metas || [],
        regrasIndicadores: data.regrasIndicadores || data.configuracoes?.regrasIndicadores || []
      },
      usuariosValidacao: data.usuarios || data.usuariosValidacao || []
    };
  }

  function toStoreBase(base) {
    const config = base.configuracoes || {};
    return {
      metadata: { ...metadata(), ...(base.metadata || {}) },
      usuarios: base.usuarios || base.usuariosValidacao || [],
      planos: base.planos || config.planos || [],
      pilares: base.pilares || config.pilares || [],
      unidades: base.unidades || config.unidades || [],
      diretorias: base.diretorias || config.diretorias || [],
      indicadores: base.indicadores || [],
      metas: base.metas || config.metas || [],
      regrasIndicadores: base.regrasIndicadores || config.regrasIndicadores || [],
      lancamentos: base.lancamentos || [],
      homologacoes: base.homologacoes || [],
      historico: base.historico || base.auditoria || []
    };
  }

  async function carregarBaseValidacao() {
    const data = await window.DataStore.carregarBaseValidacaoCompleta();
    const base = toValidationBase(data);
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
    return base;
  }

  async function salvarBaseValidacao(base) {
    const saved = await window.DataStore.salvarBaseValidacaoCompleta(toStoreBase(base));
    const validationBase = toValidationBase(saved);
    localStorage.setItem(BASE_KEY, JSON.stringify(validationBase));
    return validationBase;
  }

  async function verificarIntegridadeBase(baseArg) {
    const base = baseArg || await carregarBaseValidacao();
    const alertas = [];
    const indicadores = base.indicadores || [];
    const lancamentos = base.lancamentos || [];
    const homologacoes = base.homologacoes || [];
    const indicatorIds = new Set(indicadores.map((item) => Number(item.id)));
    const numeros = new Map();

    if (indicadores.length !== 23) {
      alertas.push(`Foram encontrados ${indicadores.length} indicadores; esperado: 23.`);
    }

    indicadores.forEach((item) => {
      ["numero", "indicador", "plano", "pilar", "unidadeApuradora", "diretoriaResponsavel"].forEach((field) => {
        if (item[field] === undefined || item[field] === null || item[field] === "") {
          alertas.push(`Indicador ${item.id || "sem id"} sem ${field}.`);
        }
      });
      const numero = Number(item.numero);
      if (Number.isFinite(numero)) {
        if (numeros.has(numero)) alertas.push(`Indicador duplicado por numero: ${numero}.`);
        numeros.set(numero, item.id);
      }
    });

    lancamentos.forEach((item) => {
      if (!item.competencia) alertas.push(`Lancamento ${item.id || "sem id"} sem competencia.`);
      if (!indicatorIds.has(Number(item.indicadorId))) alertas.push(`Lancamento ${item.id || "sem id"} vinculado a indicador inexistente ${item.indicadorId}.`);
      if (item.status && !VALID_STATUSES.has(item.status)) alertas.push(`Lancamento ${item.id || "sem id"} com status invalido: ${item.status}.`);
    });

    homologacoes.forEach((item) => {
      if (!item.dataHomologacao && !item.dataHora && !item.data) alertas.push(`Homologacao ${item.id || "sem id"} sem data.`);
      if (!item.usuario && !item.homologadoPor && !item.devolvidoPor) alertas.push(`Homologacao ${item.id || "sem id"} sem usuario.`);
      if (!item.acao && !item.status) alertas.push(`Homologacao ${item.id || "sem id"} sem acao.`);
    });

    return {
      status: alertas.length ? "Foram encontrados alertas" : "Base integra",
      alertas
    };
  }

  async function limparDadosLocais(options = {}) {
    if (!options.skipConfirmation) {
      const confirmed = window.confirm("Limpar dados locais deste perfil do navegador?");
      if (!confirmed) return { cleared: false };
    }
    window.DataStore.clearLocalData();
    return { cleared: true };
  }

  function setStatus(message, type = "info") {
    const target = document.getElementById("baseValidacaoStatus");
    if (!target) return;
    target.className = `notice ${type}`;
    target.textContent = message;
    target.hidden = false;
  }

  function initBaseValidacaoLocal() {
    const root = document.getElementById("baseValidacaoLocal");

    if (root) {
      document.getElementById("checkBaseIntegrityButton")?.addEventListener("click", async () => {
        const result = await verificarIntegridadeBase();
        setStatus(result.alertas.length ? `${result.status}: ${result.alertas.join(" | ")}` : result.status, result.alertas.length ? "warning" : "info");
      });

      document.getElementById("clearLocalDataButton")?.addEventListener("click", async () => {
        const result = await limparDadosLocais();
        if (!result.cleared) {
          setStatus("Limpeza cancelada.", "warning");
          return;
        }
        setStatus("Dados locais limpos com sucesso. Recarregue a pagina para carregar a semente inicial.");
      });
    }

    window.DatabaseService?.initBancoDadosLocal?.();
  }

  window.DataService = {
    BASE_KEY,
    carregarBaseValidacao,
    salvarBaseValidacao,
    verificarIntegridadeBase,
    limparDadosLocais,
    initBaseValidacaoLocal
  };
})();
