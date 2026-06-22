(function () {
  const DATA_FILES = {
    usuarios: "data/usuarios.json",
    planos: "data/planos.json",
    pilares: "data/pilares.json",
    unidades: "data/unidades.json",
    diretorias: "data/diretorias.json",
    indicadores: "data/indicadores.json",
    metas: "data/metas-mensais.json",
    regrasIndicadores: "data/regras-indicadores.json",
    lancamentos: "data/lancamentos.json",
    homologacoes: "data/homologacoes.json",
    historico: "data/historico.json"
  };

  const OPERATIONAL_KEYS = ["lancamentos", "homologacoes", "historico", "dashboard", "relatorios"];
  const OPERATIONAL_DATA_VERSION = "PERSISTENCIA-LOCAL-001";
  const OPERATIONAL_DATA_VERSION_KEY = "caixaLoterias:operationalDataVersion";
  const OPERATIONAL_DATA_SIGNATURE = "PERSISTENCIA-LOCAL-001:safe-migration";
  const OPERATIONAL_DATA_SIGNATURE_KEY = "caixaLoterias:operationalDataSignature";
  const LEGACY_VERSION_KEY = "storageVersion";
  const OPERATIONAL_NULL_FIELDS = [
    "realizado",
    "realizadoMensal",
    "valorRealizado",
    "resultadoMensal",
    "percentualManual",
    "percentualAtingido",
    "percentualAtingidoMensal",
    "resultadoAcumulado",
    "percentualAcumulado",
    "resultadoOficialAnual",
    "percentualAtingidoAnual",
    "percentualAtingidoAcumulado"
  ];
  const OPERATIONAL_TEXT_FIELDS = [
    "justificativa",
    "observacaoArea",
    "observacaoDiretoria",
    "evidencia",
    "linkEvidencia",
    "arquivoEvidencia",
    "motivoDevolucao"
  ];
  const OPERATIONAL_USER_DATE_FIELDS = [
    "preenchidoPor",
    "dataPreenchimento",
    "enviadoPor",
    "dataEnvioHomologacao",
    "homologadoPor",
    "dataHomologacao",
    "devolvidoPor",
    "dataDevolucao"
  ];
  const cache = {};
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

  function storageKey(key) {
    return `caixaLoterias:${key}`;
  }

  const STORAGE_KEYS = {
    usuarios: storageKey("usuarios"),
    planos: storageKey("planos"),
    pilares: storageKey("pilares"),
    unidades: storageKey("unidades"),
    diretorias: storageKey("diretorias"),
    indicadores: storageKey("indicadores"),
    metas: storageKey("metas"),
    regrasIndicadores: storageKey("regrasIndicadores"),
    lancamentos: storageKey("lancamentos"),
    homologacoes: storageKey("homologacoes"),
    historico: storageKey("historico"),
    versao: OPERATIONAL_DATA_VERSION_KEY,
    assinatura: OPERATIONAL_DATA_SIGNATURE_KEY
  };

  function readLocal(key) {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Dados locais inválidos para ${key}; usando arquivo inicial.`, error);
      return null;
    }
  }

  function hasLocalData(key) {
    return localStorage.getItem(storageKey(key)) !== null;
  }

  function persistVersionMarkers() {
    localStorage.setItem(OPERATIONAL_DATA_VERSION_KEY, OPERATIONAL_DATA_VERSION);
    localStorage.setItem(OPERATIONAL_DATA_SIGNATURE_KEY, OPERATIONAL_DATA_SIGNATURE);
    localStorage.setItem(LEGACY_VERSION_KEY, OPERATIONAL_DATA_VERSION);
  }

  function resetarLancamentosIniciais() {
    const operationalPatterns = ["lancamento", "homolog", "historico", "dashboard", "relatorio", "ranking"];
    Object.keys(localStorage).forEach((key) => {
      const normalizedKey = key.toLowerCase();
      if (operationalPatterns.some((pattern) => normalizedKey.includes(pattern))) {
        localStorage.removeItem(key);
      }
    });

    OPERATIONAL_KEYS.forEach((key) => {
      localStorage.removeItem(storageKey(key));
      localStorage.removeItem(key);
      delete cache[key];
    });
    localStorage.removeItem("dashboardData");
    localStorage.removeItem("mockDashboardData");
    localStorage.removeItem("rankingMaiorAtingimento");
    localStorage.removeItem("rankingMenorAtingimento");
    persistVersionMarkers();
  }

  function ensureOperationalDataVersion() {
    if (
      localStorage.getItem(OPERATIONAL_DATA_VERSION_KEY) === OPERATIONAL_DATA_VERSION &&
      localStorage.getItem(OPERATIONAL_DATA_SIGNATURE_KEY) === OPERATIONAL_DATA_SIGNATURE
    ) {
      return;
    }
    console.info("Migração segura de armazenamento: preservando dados existentes no localStorage.");
    persistVersionMarkers();
  }

  function resetarDadosOperacionais(lancamentos) {
    if (!Array.isArray(lancamentos)) {
      return [];
    }

    return lancamentos.map((lancamento) => {
      const cleaned = {
        ...lancamento,
        status: "Não iniciado",
        camposEntrada: {}
      };

      OPERATIONAL_NULL_FIELDS.forEach((field) => {
        cleaned[field] = null;
      });
      OPERATIONAL_TEXT_FIELDS.forEach((field) => {
        cleaned[field] = "";
      });
      OPERATIONAL_USER_DATE_FIELDS.forEach((field) => {
        cleaned[field] = null;
      });

      return cleaned;
    });
  }

  function gerarLancamentosLimpos(indicadores, metas = [], ano = 2026) {
    const metasPorIndicadorMes = new Map(
      metas.map((meta) => [`${meta.indicadorId}:${meta.ano}:${meta.mes}`, meta])
    );
    let nextId = 1;

    return indicadores.flatMap((indicador) => MESES.map(([mes, nomeMes]) => {
      const meta = metasPorIndicadorMes.get(`${indicador.id}:${ano}:${mes}`) || {};
      return resetarDadosOperacionais([{
        id: nextId++,
        indicadorId: indicador.id,
        ano,
        mes,
        nomeMes: meta.nomeMes || nomeMes,
        plano: indicador.plano || "",
        pilar: indicador.pilar || "",
        unidadeApuradora: indicador.unidadeApuradora || "",
        diretoriaResponsavel: indicador.diretoriaResponsavel || "",
        metaMensal: meta.metaMensal ?? null,
        metaAnualDescricao: indicador.metaAnualDescricao || ""
      }])[0];
    }));
  }

  async function resetarBaseOperacionalGlobal() {
    resetarLancamentosIniciais();
    const indicadores = await loadJson("indicadores");
    const metas = await loadJson("metas");
    const lancamentos = gerarLancamentosLimpos(indicadores, metas);
    saveLocal("lancamentos", lancamentos);
    saveLocal("homologacoes", []);
    saveLocal("historico", []);
    return lancamentos;
  }

  function normalizeData(key, value) {
    if ((key === "homologacoes" || key === "historico") && Array.isArray(value)) {
      return value;
    }

    if (key !== "usuarios" || !Array.isArray(value)) {
      return value;
    }

    if (value.some((user) => user.id === "usuario-companhia")) {
      return value;
    }

    return [
      ...value,
      {
        id: "usuario-companhia",
        nome: "Usuário da Companhia",
        email: "usuario.companhia@caixaloterias.local",
        perfil: "Usuário Companhia",
        unidadeApuradora: "",
        diretoriaResponsavel: ""
      }
    ];
  }

  async function loadJson(key) {
    ensureOperationalDataVersion();

    if (cache[key]) {
      return cache[key];
    }

    if (hasLocalData(key)) {
      const parsedLocal = readLocal(key);
      if (!(key === "lancamentos" && Array.isArray(parsedLocal) && parsedLocal.length === 0) && parsedLocal !== null) {
        cache[key] = normalizeData(key, parsedLocal);
        if (key === "usuarios") {
          localStorage.setItem(storageKey(key), JSON.stringify(cache[key]));
        }
        if (key === "lancamentos") {
          console.log("Lançamentos carregados do localStorage:", cache[key]);
        }
        return cache[key];
      }
    }

    const response = await fetch(DATA_FILES[key]);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${DATA_FILES[key]}`);
    }

    cache[key] = normalizeData(key, await response.json());
    if (key === "lancamentos" && Array.isArray(cache[key]) && cache[key].length > 0) {
      saveLocal("lancamentos", cache[key]);
      console.log("Lançamentos iniciais carregados e salvos no localStorage:", cache[key]);
      return cache[key];
    }
    if ((key === "homologacoes" || key === "historico") && !hasLocalData(key)) {
      saveLocal(key, cache[key]);
      return cache[key];
    }
    if (key === "usuarios") {
      localStorage.setItem(storageKey(key), JSON.stringify(cache[key]));
    }
    return cache[key];
  }

  async function loadAll() {
    const entries = await Promise.all(
      Object.keys(DATA_FILES).map(async (key) => [key, await loadJson(key)])
    );
    return Object.fromEntries(entries);
  }

  async function getLancamentos() {
    return loadJson("lancamentos");
  }

  function salvarLancamentos(lancamentos) {
    saveLocal("lancamentos", lancamentos);
  }

  function carregarLancamentos() {
    const lancamentos = readLocal("lancamentos");
    return Array.isArray(lancamentos) ? lancamentos : [];
  }

  function saveLocal(key, value) {
    cache[key] = value;
    localStorage.setItem(storageKey(key), JSON.stringify(value));
    if (key === "lancamentos") {
      console.log("Lançamentos salvos:", value);
    }
  }

  async function appendHistory(entry) {
    const historico = await loadJson("historico");
    const nextEntry = {
      id: historico.length ? Math.max(...historico.map((item) => Number(item.id) || 0)) + 1 : 1,
      dataHora: new Date().toISOString(),
      ...entry
    };
    const updated = [...historico, nextEntry];
    saveLocal("historico", updated);
    return nextEntry;
  }

  function clearLocalData() {
    Object.keys(DATA_FILES).forEach((key) => {
      localStorage.removeItem(storageKey(key));
      delete cache[key];
    });
    localStorage.removeItem(OPERATIONAL_DATA_VERSION_KEY);
    localStorage.removeItem(OPERATIONAL_DATA_SIGNATURE_KEY);
    localStorage.removeItem(LEGACY_VERSION_KEY);
  }

  window.DataStore = {
    STORAGE_KEYS,
    loadJson,
    loadAll,
    saveLocal,
    salvarLancamentos,
    carregarLancamentos,
    appendHistory,
    clearLocalData,
    getLancamentos,
    gerarLancamentosLimpos,
    resetarBaseOperacionalGlobal,
    resetarDadosOperacionais,
    resetarLancamentosIniciais
  };
})();
