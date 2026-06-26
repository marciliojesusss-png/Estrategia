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
  const CENTRAL_OPERATIONAL_KEYS = ["lancamentos", "homologacoes", "historico"];
  const OPERATIONAL_DATA_VERSION = "PERSISTENCIA-LOCAL-001";
  const OPERATIONAL_DATA_VERSION_KEY = "caixaLoterias:operationalDataVersion";
  const OPERATIONAL_DATA_SIGNATURE = "PERSISTENCIA-LOCAL-001:safe-migration";
  const OPERATIONAL_DATA_SIGNATURE_KEY = "caixaLoterias:operationalDataSignature";
  const JSON_DB_MIGRATION_PREFIX = "caixaLoterias:jsonDbMigrated:";
  const JSON_DB_LOCAL_BACKUP_PREFIX = "caixaLoterias:localBackupBeforeCentral:";
  const CENTRAL_BACKUP_PENDING_KEY = "caixaLoterias:centralBackupPending";
  const STORAGE_MODE_KEY = "caixaLoterias:storageMode";
  const TEXT_ENCODING_MIGRATION_KEY = "caixaLoterias:textEncodingMigration";
  const TEXT_ENCODING_MIGRATION_VERSION = "UTF8-PTBR-001";
  const CURRENCY_MIGRATION_KEY = "caixaLoterias:currencyMigration";
  const CURRENCY_MIGRATION_VERSION = "MOEDA-BR-001";
  const LEGACY_VERSION_KEY = "storageVersion";
  const INDICATOR_NAMES = [
    "Índice de Ofertas Personalizadas aos Clientes Ativos",
    "Índice de Satisfação de Clientes — NPS",
    "Índice de Clientes Ativos em Canais Digitais",
    "Aprimoramento da Experiência do Cliente",
    "Gross Gaming Revenue (GGR)",
    "IEO Recorrente (Índice de Eficiência Operacional Recorrente)",
    "Lucro Líquido Recorrente",
    "Vendas Provenientes de Canais Digitais",
    "Vendas com Meio de Pagamento PIX",
    "Share da Plataforma de Jogos",
    "Ampliar Capacidade de Desenvolvimento de Soluções de TIC",
    "Clima Organizacional (Pesquisa GPTW)",
    "Mulheres Chefes de Unidade e Gestoras",
    "Gestores Negros, Amarelos, Pardos ou Indígenas e/ou PcD",
    "Capacitação dos Empregados da CAIXA Loterias",
    "Apoio ao Desenvolvimento Socioambiental",
    "Repasse Social",
    "Princípios de Jogo Responsável (WLA)",
    "Incentivo Socioambiental",
    "Visibilidade dos Repasses Sociais das Loterias CAIXA",
    "Jogo Responsável 2026 (Capacitação e Disseminação)",
    "Arrecadação Gerada com o Ecossistema",
    "Participação da Rede Lotérica nos Negócios"
  ];
  const PILLAR_NAMES = [
    "Cliente no Centro",
    "Eficiência e Rentabilidade",
    "Tecnologia e Inovação",
    "Pessoas, Cultura e Agilidade",
    "Sustentabilidade e Cidadania",
    "Atuação em Ecossistema"
  ];
  const PIX_QUARTER_TARGETS = [0.61, 0.62, 0.63, 0.65];
  const CURRENCY_FIELD_NAMES = new Set([
    "ggrRealizadoMes",
    "lucroLiquidoRecorrenteAcumulado",
    "arrecadacaoCanaisEletronicosMes",
    "arrecadacaoTotalProdutosLoteriasMes",
    "arrecadacaoPixMes",
    "arrecadacaoTotalCanaisEletronicosMes",
    "pixAcumuladoTrimestre",
    "canaisAcumuladoTrimestre",
    "repasseSocialAcumulado",
    "valorInvestidoAcumulado",
    "lucroLiquidoBase",
    "arrecadacaoEcossistemaMes",
    "arrecadacaoTotalMes",
    "arrecadacaoEcossistema2025",
    "arrecadacaoTotal2025",
    "arrecadacaoRedeLotericaMes2026",
    "arrecadacaoRedeLotericaMes2025"
  ]);
  const CP1252_BYTES = {
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
    "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
    "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c,
    "ž": 0x9e, "Ÿ": 0x9f
  };
  const TEXT_REPLACEMENTS = [
    ["Efici\u003fncia", "Eficiência"], ["Inova\u003fo", "Inovação"], ["Atua\u003fo", "Atuação"],
    ["Mar\u003fo", "Março"], ["Estrat\u003fgico", "Estratégico"], ["Neg\u003fcios", "Negócios"],
    ["Relat\u003frio", "Relatório"], ["relat\u003frio", "relatório"], ["A\u003fo", "Ação"],
    ["a\u003fo", "ação"], ["Conclu\u003fda", "Concluída"], ["conclu\u003fdas", "concluídas"],
    ["l\u003fquido", "líquido"], ["Arrecada\u003fo", "Arrecadação"],
    ["eletr\u003fnicos", "eletrônicos"], ["lot\u003fricos", "lotéricos"],
    ["execu\u003fo", "execução"], ["Evid\u003fncia", "Evidência"], ["N\u003fmero", "Número"],
    ["M\u003fdia", "Média"], ["Refer\u003fncia", "Referência"], ["Gest\u003fo", "Gestão"],
    ["N\u003fo", "Não"], ["n\u003fo", "não"], ["m\u003fs", "mês"], ["M\u003fs", "Mês"]
  ];
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
  const writeQueues = {};
  let jsonDbAvailable = null;
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

  function jsonDbMigrationKey(key) {
    return `${JSON_DB_MIGRATION_PREFIX}${key}`;
  }

  function jsonDbLocalBackupKey(key) {
    return `${JSON_DB_LOCAL_BACKUP_PREFIX}${key}`;
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  function mojibakeScore(value) {
    return (String(value).match(/[ÃÂâ�]/g) || []).length;
  }

  function decodeCp1252Token(value) {
    const bytes = [];
    for (const character of value) {
      const code = character.codePointAt(0);
      if (CP1252_BYTES[character] !== undefined) {
        bytes.push(CP1252_BYTES[character]);
      } else if (code <= 0xff) {
        bytes.push(code);
      } else {
        return null;
      }
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
    } catch {
      return null;
    }
  }

  function corrigirTextoEncoding(value) {
    let corrected = String(value).replace(/[^ \t\r\n]+/gu, (token) => {
      let current = token;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const decoded = decodeCp1252Token(current);
        if (!decoded || mojibakeScore(decoded) >= mojibakeScore(current)) break;
        current = decoded;
      }
      return current;
    });
    TEXT_REPLACEMENTS.forEach(([broken, replacement]) => {
      corrected = corrected.replaceAll(broken, replacement);
    });
    return corrected;
  }

  function corrigirValorSalvo(value) {
    if (typeof value === "string") return corrigirTextoEncoding(value);
    if (Array.isArray(value)) return value.map(corrigirValorSalvo);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, corrigirValorSalvo(item)]));
    }
    return value;
  }

  function corrigirEncodingTextosSalvos() {
    if (localStorage.getItem(TEXT_ENCODING_MIGRATION_KEY) === TEXT_ENCODING_MIGRATION_VERSION) return;
    Object.keys(localStorage).forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw || (!key.startsWith("caixaLoterias:") && !DATA_FILES[key])) return;
      try {
        const parsed = JSON.parse(raw);
        const corrected = corrigirValorSalvo(parsed);
        const serialized = JSON.stringify(corrected);
        if (serialized !== raw) localStorage.setItem(key, serialized);
      } catch {
        const corrected = corrigirTextoEncoding(raw);
        if (corrected !== raw) localStorage.setItem(key, corrected);
      }
    });
    localStorage.setItem(TEXT_ENCODING_MIGRATION_KEY, TEXT_ENCODING_MIGRATION_VERSION);
  }

  function normalizarCamposMoeda(launch) {
    if (!launch) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    let revisaoMoedaPendente = launch.revisaoMoedaPendente === true;

    CURRENCY_FIELD_NAMES.forEach((field) => {
      const current = camposEntrada[field] ?? launch[field];
      if (current === null || current === undefined || current === "") return;

      const parsed = CurrencyBR.parseMoedaBR(current);
      if (parsed === null) {
        revisaoMoedaPendente = true;
        return;
      }

      camposEntrada[field] = parsed;
      if (Number(launch.indicadorId) === 9 && typeof current === "number" && current > 0 && current < 1000000) {
        revisaoMoedaPendente = true;
      }
    });

    return {
      ...launch,
      camposEntrada,
      ...(revisaoMoedaPendente ? { revisaoMoedaPendente: true } : {})
    };
  }

  function corrigirMoedasSalvas() {
    if (localStorage.getItem(CURRENCY_MIGRATION_KEY) === CURRENCY_MIGRATION_VERSION) return;
    [storageKey("lancamentos"), "lancamentos"].forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const launches = JSON.parse(raw);
        if (Array.isArray(launches)) {
          localStorage.setItem(key, JSON.stringify(launches.map(normalizarCamposMoeda)));
        }
      } catch {
        console.warn("Não foi possível migrar os campos monetários locais; os dados foram preservados.");
      }
    });
    localStorage.setItem(CURRENCY_MIGRATION_KEY, CURRENCY_MIGRATION_VERSION);
  }

  function getCanonicalPillar(indicatorId) {
    if (indicatorId <= 4) return PILLAR_NAMES[0];
    if (indicatorId <= 9) return PILLAR_NAMES[1];
    if (indicatorId <= 11) return PILLAR_NAMES[2];
    if (indicatorId <= 15) return PILLAR_NAMES[3];
    if (indicatorId <= 21) return PILLAR_NAMES[4];
    return PILLAR_NAMES[5];
  }

  async function checkJsonDb() {
    if (jsonDbAvailable !== null) return jsonDbAvailable;
    if (window.location.protocol === "file:") {
      jsonDbAvailable = false;
      localStorage.setItem(STORAGE_MODE_KEY, "local");
      return false;
    }
    try {
      const response = await fetch("api/health", { cache: "no-store" });
      jsonDbAvailable = response.ok;
    } catch {
      jsonDbAvailable = false;
    }
    localStorage.setItem(STORAGE_MODE_KEY, jsonDbAvailable ? "central" : "local");
    return jsonDbAvailable;
  }

  async function loadFromJsonDb(key) {
    if (!(await checkJsonDb())) return null;
    try {
      const response = await fetch(`api/data/${encodeURIComponent(key)}`, { cache: "no-store" });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.warn(`Banco JSON indisponível para leitura de ${key}; usando fallback.`, error);
      jsonDbAvailable = false;
      localStorage.setItem(STORAGE_MODE_KEY, "local");
      return null;
    }
  }

  async function saveToJsonDb(key, value) {
    if (!DATA_FILES[key] || !(await checkJsonDb())) return false;

    try {
      const response = await fetch(`api/data/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return true;
    } catch (error) {
      console.warn(`Não foi possível salvar ${key} no banco JSON. Dados preservados no localStorage.`, error);
      jsonDbAvailable = false;
      localStorage.setItem(STORAGE_MODE_KEY, "local");
      return false;
    }
  }

  function preserveLocalOperationalBackup(key, localValue, centralValue) {
    if (!OPERATIONAL_KEYS.includes(key) || localValue === null) return;
    const normalizedLocal = normalizeData(key, localValue);
    const normalizedCentral = normalizeData(key, centralValue);

    if (safeStringify(normalizedLocal) === safeStringify(normalizedCentral)) return;

    localStorage.setItem(jsonDbLocalBackupKey(key), JSON.stringify({
      key,
      createdAt: new Date().toISOString(),
      reason: "Dados locais divergentes preservados antes de assumir a base JSON central.",
      data: normalizedLocal
    }));
    localStorage.setItem(CENTRAL_BACKUP_PENDING_KEY, "true");
    console.warn(`Dados locais divergentes de ${key} foram preservados em backup local. A base JSON central foi mantida como fonte oficial.`);
  }

  function enqueueJsonDbWrite(key, value) {
    const snapshot = JSON.parse(JSON.stringify(value));
    const previousWrite = writeQueues[key] || Promise.resolve();
    const nextWrite = previousWrite
      .catch(() => false)
      .then(() => saveToJsonDb(key, snapshot));
    writeQueues[key] = nextWrite;
    return nextWrite;
  }

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

  function readLocalBackup(key) {
    const raw = localStorage.getItem(jsonDbLocalBackupKey(key));
    if (!raw) return null;
    try {
      const backup = JSON.parse(raw);
      return backup && backup.data !== undefined ? backup.data : null;
    } catch {
      return null;
    }
  }

  function hasAnyLocalBackup() {
    return CENTRAL_OPERATIONAL_KEYS.some((key) => localStorage.getItem(jsonDbLocalBackupKey(key)) !== null);
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
      localStorage.removeItem(jsonDbMigrationKey(key));
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
        competencia: `${ano}-${String(mes).padStart(2, "0")}`,
        trimestre: `${Math.ceil(mes / 3)}TRI/${ano}`,
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
    await Promise.all([
      saveLocal("lancamentos", lancamentos),
      saveLocal("homologacoes", []),
      saveLocal("historico", [])
    ]);
    return lancamentos;
  }

  function normalizeData(key, value) {
    value = corrigirValorSalvo(value);

    if (key === "indicadores" && Array.isArray(value)) {
      return value.map((indicator) => {
        const normalized = {
          ...indicator,
          indicador: INDICATOR_NAMES[Number(indicator.id) - 1] || indicator.indicador,
          pilar: getCanonicalPillar(Number(indicator.id)),
          periodicidade: indicator.periodicidade === "Não especificado" ? "Não especificada" : indicator.periodicidade
        };
        if (Number(indicator.id) === 8) {
          return {
            ...normalized,
            unidadeApuradora: "SUCOL",
            diretoriaResponsavel: "DICOT",
            metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais.",
            metrica: "(Arrecadação total nos canais eletrônicos) / (Arrecadação total dos produtos de loterias)",
            tipoCalculo: "razao_canais_digitais",
            unidadeMedida: "percentual"
          };
        }
        return Number(indicator.id) === 9 ? {
          ...normalized,
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico.",
          metrica: "(Arrecadação com o meio de pagamento PIX no ano corrente) / (Arrecadação total nos canais eletrônicos no ano corrente)",
          tipoCalculo: "razao_pix",
          unidadeMedida: "percentual"
        } : normalized;
      });
    }

    if (key === "regrasIndicadores" && Array.isArray(value)) {
      return value.map((rule) => {
        const normalizedFields = (rule.camposEntrada || []).map((field) => (
          CURRENCY_FIELD_NAMES.has(field.nome) ? { ...field, tipo: "moeda" } : field
        ));
        if (Number(rule.indicadorId) === 8) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[7],
            tipoCalculo: "razao_canais_digitais",
            tipoConsolidacao: "razao_acumulada_no_periodo",
            unidadeMedida: "percentual",
            metaAnualValor: 0.2805,
            parametrosCalculo: {
              campoNumerador: "arrecadacaoCanaisEletronicosMes",
              campoDenominador: "arrecadacaoTotalProdutosLoteriasMes",
              percentualReferencia2025: 0.2305,
              acrescimoMetaPontosPercentuais: 0.05,
              metaReferencia: 0.2805,
              metaTipo: "fixa_anual"
            },
            camposEntrada: [
              { nome: "arrecadacaoCanaisEletronicosMes", rotulo: "Arrecadação total nos canais eletrônicos no mês", tipo: "moeda", obrigatorio: true },
              { nome: "arrecadacaoTotalProdutosLoteriasMes", rotulo: "Arrecadação total dos produtos de loterias no mês", tipo: "moeda", obrigatorio: true }
            ],
            resultadoOficial: "razao_acumulada_homologada_no_periodo"
          };
        }
        return Number(rule.indicadorId) === 9 ? {
        ...rule,
        nome: INDICATOR_NAMES[8],
        tipoCalculo: "razao_pix",
        tipoConsolidacao: "razao_acumulada_no_ano",
        unidadeMedida: "percentual",
        metaAnualValor: 0.65,
        parametrosCalculo: {
          campoNumerador: "arrecadacaoPixMes",
          campoDenominador: "arrecadacaoTotalCanaisEletronicosMes",
          metasTrimestrais: {
            "1TRI/2026": 0.61,
            "2TRI/2026": 0.62,
            "3TRI/2026": 0.63,
            "4TRI/2026": 0.65
          },
          arredondamentoOficialCasasPercentuais: 0
        },
        camposEntrada: [
          { nome: "arrecadacaoPixMes", rotulo: "Arrecadação com PIX no mês", tipo: "moeda", obrigatorio: true },
          { nome: "arrecadacaoTotalCanaisEletronicosMes", rotulo: "Arrecadação total nos canais eletrônicos no mês", tipo: "moeda", obrigatorio: false }
        ],
        resultadoOficial: "razao_trimestral_arredondada_informe"
      } : {
        ...rule,
        nome: INDICATOR_NAMES[Number(rule.indicadorId) - 1] || rule.nome,
        camposEntrada: normalizedFields
      };
      });
    }

    if (key === "metas" && Array.isArray(value)) {
      return value.map((meta) => Number(meta.indicadorId) === 8 ? {
        ...meta,
        metaMensal: 0.2805,
        fonte: "meta_fixa_canais_digitais_2026"
      } : Number(meta.indicadorId) === 9 ? {
        ...meta,
        metaMensal: PIX_QUARTER_TARGETS[Math.ceil(Number(meta.mes) / 3) - 1]
      } : meta);
    }

    if (key === "pilares" && Array.isArray(value)) {
      return value.map((pillar) => ({
        ...pillar,
        nome: PILLAR_NAMES[Number(pillar.id) - 1] || pillar.nome
      }));
    }

    if (key === "lancamentos" && Array.isArray(value)) {
      return value.map((launch) => normalizarCamposMoeda({
        ...launch,
        pilar: getCanonicalPillar(Number(launch.indicadorId)),
        competencia: launch.competencia || `${launch.ano}-${String(launch.mes).padStart(2, "0")}`,
        trimestre: launch.trimestre || `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`,
        ...(Number(launch.indicadorId) === 9 ? {
          metaMensal: PIX_QUARTER_TARGETS[Math.ceil(Number(launch.mes) / 3) - 1],
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico."
        } : {}),
        ...(Number(launch.indicadorId) === 8 ? {
          unidadeApuradora: "SUCOL",
          diretoriaResponsavel: "DICOT",
          metaMensal: 0.2805,
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais."
        } : {})
      }));
    }

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
    corrigirEncodingTextosSalvos();
    corrigirMoedasSalvas();
    ensureOperationalDataVersion();

    if (cache[key]) {
      return cache[key];
    }

    const jsonDbValue = await loadFromJsonDb(key);
    if (jsonDbValue !== null) {
      const localValue = hasLocalData(key) ? readLocal(key) : null;
      cache[key] = normalizeData(key, jsonDbValue);
      preserveLocalOperationalBackup(key, localValue, cache[key]);
      localStorage.setItem(storageKey(key), JSON.stringify(cache[key]));
      localStorage.setItem(STORAGE_MODE_KEY, "central");
      if (OPERATIONAL_KEYS.includes(key)) {
        localStorage.setItem(jsonDbMigrationKey(key), "central");
      }
      if (key === "lancamentos") {
        console.log("Lançamentos carregados do banco JSON:", cache[key]);
      }
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
      await saveLocal("lancamentos", cache[key]);
      console.log("Lançamentos iniciais carregados e salvos no localStorage:", cache[key]);
      return cache[key];
    }
    if ((key === "homologacoes" || key === "historico") && !hasLocalData(key)) {
      await saveLocal(key, cache[key]);
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
    return saveLocal("lancamentos", lancamentos);
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
    return enqueueJsonDbWrite(key, value);
  }

  async function getStorageInfo() {
    const centralAvailable = await checkJsonDb();
    return {
      mode: centralAvailable ? "central" : "local",
      centralAvailable,
      hasPendingLocalBackup: localStorage.getItem(CENTRAL_BACKUP_PENDING_KEY) === "true",
      message: centralAvailable
        ? "Base central JSON ativa. As informaÃ§Ãµes sÃ£o compartilhadas entre perfis do Chrome neste computador."
        : "Base central JSON nÃ£o detectada. As informaÃ§Ãµes ficam apenas neste perfil do Chrome e nÃ£o aparecem em outros perfis."
    };
  }

  async function publicarDadosLocaisNaBaseCentral() {
    if (!(await checkJsonDb())) {
      throw new Error("Base central JSON nÃ£o detectada. Inicie o sistema pelo arquivo iniciar-banco-json.bat.");
    }

    const publishedKeys = [];
    for (const key of CENTRAL_OPERATIONAL_KEYS) {
      const source = readLocalBackup(key) || readLocal(key);
      if (source === null) continue;

      const normalized = normalizeData(key, source);
      const published = await enqueueJsonDbWrite(key, normalized);
      if (!published) {
        throw new Error(`NÃ£o foi possÃ­vel publicar ${key} na base central.`);
      }

      cache[key] = normalized;
      localStorage.setItem(storageKey(key), JSON.stringify(normalized));
      localStorage.setItem(jsonDbMigrationKey(key), "central");
      localStorage.removeItem(jsonDbLocalBackupKey(key));
      publishedKeys.push(key);
    }

    if (!hasAnyLocalBackup()) {
      localStorage.removeItem(CENTRAL_BACKUP_PENDING_KEY);
    }
    localStorage.setItem(STORAGE_MODE_KEY, "central");

    return {
      published: publishedKeys.length,
      keys: publishedKeys
    };
  }

  async function appendHistory(entry) {
    const historico = await loadJson("historico");
    const nextEntry = {
      id: historico.length ? Math.max(...historico.map((item) => Number(item.id) || 0)) + 1 : 1,
      dataHora: new Date().toISOString(),
      ...entry
    };
    const updated = [...historico, nextEntry];
    await saveLocal("historico", updated);
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
    localStorage.removeItem(TEXT_ENCODING_MIGRATION_KEY);
    localStorage.removeItem(CURRENCY_MIGRATION_KEY);
    localStorage.removeItem(CENTRAL_BACKUP_PENDING_KEY);
    localStorage.removeItem(STORAGE_MODE_KEY);
    OPERATIONAL_KEYS.forEach((key) => {
      localStorage.removeItem(jsonDbMigrationKey(key));
      localStorage.removeItem(jsonDbLocalBackupKey(key));
    });
  }

  corrigirEncodingTextosSalvos();
  corrigirMoedasSalvas();

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
    getStorageInfo,
    publicarDadosLocaisNaBaseCentral,
    gerarLancamentosLimpos,
    resetarBaseOperacionalGlobal,
    resetarDadosOperacionais,
    resetarLancamentosIniciais,
    corrigirEncodingTextosSalvos,
    corrigirMoedasSalvas
  };
})();
