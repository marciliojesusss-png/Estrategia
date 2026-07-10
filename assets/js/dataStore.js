(function () {
  const DATA_FILES = {
    usuarios: "usuarios",
    planos: "planos",
    pilares: "pilares",
    unidades: "unidades",
    diretorias: "diretorias",
    indicadores: "indicadores",
    metas: "metas",
    regrasIndicadores: "regrasIndicadores",
    lancamentos: "lancamentos",
    homologacoes: "homologacoes",
    solicitacoesReabertura: "solicitacoesReabertura",
    historico: "historico"
  };

  const OPERATIONAL_KEYS = ["lancamentos", "homologacoes", "solicitacoesReabertura", "historico", "dashboard", "relatorios"];
  const CENTRAL_OPERATIONAL_KEYS = ["lancamentos", "homologacoes", "solicitacoesReabertura", "historico"];
  const OPERATIONAL_DATA_VERSION = "SQLITE-SEED-2026-06-29-001";
  const OPERATIONAL_DATA_VERSION_KEY = "caixaLoterias:operationalDataVersion";
  const OPERATIONAL_DATA_SIGNATURE = "SQLITE-SEED-2026-06-29-001:authoritative-seed";
  const OPERATIONAL_DATA_SIGNATURE_KEY = "caixaLoterias:operationalDataSignature";
  const JSON_DB_MIGRATION_PREFIX = "caixaLoterias:jsonDbMigrated:";
  const JSON_DB_LOCAL_BACKUP_PREFIX = "caixaLoterias:localBackupBeforeCentral:";
  const CENTRAL_BACKUP_PENDING_KEY = "caixaLoterias:centralBackupPending";
  const STORAGE_MODE_KEY = "caixaLoterias:storageMode";
  const VALIDATION_BASE_KEY = "central_indicadores_base_validacao";
  const LOCAL_JSON_DB_NAME = "caixaLoteriasJsonDb";
  const LOCAL_JSON_DB_VERSION = 1;
  const LOCAL_JSON_DB_STORE = "collections";
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
    "Participação da Rede Lotérica nos Negócios da CAIXA Loterias"
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
  const ECOSSISTEMA_CURVAS_2026 = {
    lotex: {
      "1TRI": { referencia2025: 0.90, meta2026: 0.99 },
      "2TRI": { referencia2025: 0.78, meta2026: 0.86 },
      "3TRI": { referencia2025: 0.74, meta2026: 0.81 },
      "4TRI": { referencia2025: 0.65, meta2026: 0.72 }
    },
    lotex_marketplace: {
      "1TRI": { referencia2025: 3.42, meta2026: 3.76 },
      "2TRI": { referencia2025: 3.27, meta2026: 3.60 },
      "3TRI": { referencia2025: 3.32, meta2026: 3.65 },
      "4TRI": { referencia2025: 3.46, meta2026: 3.80 }
    }
  };
  const ECOSSISTEMA_CENARIOS = [
    { value: "lotex", label: "Lotex" },
    { value: "lotex_marketplace", label: "Lotex + Marketplace" }
  ];
  const REDE_LOTERICA_CURVA_INCREMENTO_2026 = {
    "1TRI": { metaIncremento: 0.50 },
    "2TRI": { metaIncremento: 1.00 },
    "3TRI": { metaIncremento: 1.50 },
    "4TRI": { metaIncremento: 2.00 }
  };
  const APRIMORAMENTO_CURVA_TRIMESTRAL_2026 = {
    "1TRI/2026": { metaPercentual: 0.0454, metaQuantidadeAcumulada: 1 },
    "2TRI/2026": { metaPercentual: 0.1364, metaQuantidadeAcumulada: 3 },
    "3TRI/2026": { metaPercentual: 0.1818, metaQuantidadeAcumulada: 4 },
    "4TRI/2026": { metaPercentual: 0.25, metaQuantidadeAcumulada: 6 }
  };
  const CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026 = {
    "1TRI/2026": { metaPercentual: 0.35, marcoEsperado: "Realização de Consulta Pública de Informações - RFI" },
    "2TRI/2026": { metaPercentual: 0.70, marcoEsperado: "Realização de Consulta Pública de Propostas - RFP" },
    "3TRI/2026": { metaPercentual: 0.85, marcoEsperado: "Iniciação da Fase Seleção" },
    "4TRI/2026": { metaPercentual: 1.00, marcoEsperado: "Contrato assinado com fornecedor" }
  };
  const CAPACIDADE_TIC_MARCOS = [
    { label: "Não iniciado", percentual: 0 },
    { label: "Consulta Pública de Informações - RFI realizada", percentual: 0.35 },
    { label: "Consulta Pública de Propostas - RFP realizada", percentual: 0.70 },
    { label: "Fase de Seleção iniciada", percentual: 0.85 },
    { label: "Contrato assinado com fornecedor", percentual: 1.00 }
  ];
  const PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026 = {
    "1TRI/2026": { metaElementosAcumulados: 1 },
    "2TRI/2026": { metaElementosAcumulados: 2 },
    "3TRI/2026": { metaElementosAcumulados: 5 },
    "4TRI/2026": { metaElementosAcumulados: 10 }
  };
  const ELEMENTOS_JOGO_RESPONSAVEL = [
    "Pesquisa",
    "Programa para empregados",
    "Programa para revendedores",
    "Desenho para jogos",
    "Canais de jogos remotos",
    "Publicidade, comunicação e marketing",
    "Educação do jogador",
    "Orientação ao jogador para tratamento",
    "Envolvimento das partes interessadas",
    "Relatório de medições e riscos"
  ];
  const STATUS_ACAO_JOGO_RESPONSAVEL = [
    "Não iniciada",
    "Em andamento",
    "Concluída",
    "Homologada",
    "Cancelada"
  ];
  const STATUS_PROJETO_PLATAFORMA_JOGOS = [
    "Não iniciado",
    "Em planejamento",
    "Em andamento",
    "Piloto/MVP em desenvolvimento",
    "Piloto/MVP concluído",
    "Cancelado"
  ];
  const MARCOS_PLATAFORMA_JOGOS_2026 = [
    { label: "Não iniciado", percentualReferencia: 0 },
    { label: "Equipe do projeto alocada", percentualReferencia: null },
    { label: "Kickoff realizado", percentualReferencia: null },
    { label: "Sprints iniciais executadas", percentualReferencia: null },
    { label: "Arquitetura do sistema em definição", percentualReferencia: null },
    { label: "Ambiente tecnológico criado", percentualReferencia: null },
    { label: "Acessos concedidos", percentualReferencia: null },
    { label: "Funcionalidade negocial definida", percentualReferencia: null },
    { label: "Piloto/MVP concluído", percentualReferencia: 1 }
  ];
  const APOIO_SOCIOAMBIENTAL_CURVA_2026 = {
    "1TRI/2026": {
      metaPercentual: 0,
      metaQuantidadeAcumulada: 0,
      marcoEsperado: "Sem meta de entrega no período; projetos em prospecção e estruturação"
    },
    "2TRI/2026": {
      metaPercentual: 0.50,
      metaQuantidadeAcumulada: 1,
      marcoEsperado: "1ª iniciativa realizada"
    },
    "3TRI/2026": {
      metaPercentual: 0.50,
      metaQuantidadeAcumulada: 1,
      marcoEsperado: "Manutenção do acumulado de 50%, considerando a meta do 2TRI"
    },
    "4TRI/2026": {
      metaPercentual: 1.00,
      metaQuantidadeAcumulada: 2,
      marcoEsperado: "2ª iniciativa realizada"
    }
  };
  const STATUS_INICIATIVA_SOCIOAMBIENTAL = [
    "Não iniciada",
    "Em prospecção",
    "Em estruturação",
    "Em rito de governança",
    "Apoiada/realizada",
    "Cancelada"
  ];
  const VISIBILIDADE_REPASSES_CURVA_2026 = {
    "1TRI/2026": {
      metaPercentual: 0,
      metaAcoesRealizadasAcumuladas: 0,
      marcoEsperado: "Sem meta de entrega no período; relatório em elaboração/homologação"
    },
    "2TRI/2026": {
      metaPercentual: 0.50,
      metaAcoesRealizadasAcumuladas: 1,
      marcoEsperado: "Publicar relatório institucional \"A Sorte em Números — 2025\""
    },
    "3TRI/2026": {
      metaPercentual: 0.50,
      metaAcoesRealizadasAcumuladas: 1,
      marcoEsperado: "Sem nova meta no período; acumulado de 50% considerando a meta do 2TRI"
    },
    "4TRI/2026": {
      metaPercentual: 1.00,
      metaAcoesRealizadasAcumuladas: 2,
      marcoEsperado: "Realizar campanha publicitária exclusiva sobre repasse social das Loterias CAIXA"
    }
  };
  const ACOES_VISIBILIDADE_REPASSES_2026 = [
    {
      id: "relatorio_sorte_em_numeros_2025",
      nome: "Publicar relatório institucional \"A Sorte em Números — 2025\"",
      semestrePrevisto: "1º semestre/2026",
      pesoPercentual: 0.50
    },
    {
      id: "campanha_repasses_sociais",
      nome: "Realizar campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA",
      semestrePrevisto: "2º semestre/2026",
      pesoPercentual: 0.50
    }
  ];
  const STATUS_ACAO_VISIBILIDADE = [
    "Não iniciada",
    "Em planejamento",
    "Em elaboração",
    "Em homologação",
    "Publicada/realizada",
    "Cancelada"
  ];
  const GGR_META_ACUMULADA_2026 = {
    "2026-01": 1056593039,
    "2026-02": 1997659493,
    "2026-03": 3070246140.78,
    "2026-04": 4193018947,
    "2026-05": 5285128208,
    "2026-06": 6512131485,
    "2026-07": 7644597006,
    "2026-08": 8771034927,
    "2026-09": 10271204884,
    "2026-10": 11442642920,
    "2026-11": 12525118608,
    "2026-12": 15600000000
  };
  const IEO_META_ACUMULADA_2026 = {
    "2026-01": null,
    "2026-02": null,
    "2026-03": 0.1441,
    "2026-04": null,
    "2026-05": null,
    "2026-06": null,
    "2026-07": null,
    "2026-08": null,
    "2026-09": null,
    "2026-10": null,
    "2026-11": null,
    "2026-12": 0.1403
  };
  const REPASSE_SOCIAL_META_ACUMULADA_2026 = {
    "2026-01": 737118539.30,
    "2026-02": 1394613495.00,
    "2026-03": 2142991572.00,
    "2026-04": 2926098294.00,
    "2026-05": 3688125380.00,
    "2026-06": 4545104157.00,
    "2026-07": 5335136943.00,
    "2026-08": 6121095220.00,
    "2026-09": 7165115749.00,
    "2026-10": 7982318714.00,
    "2026-11": 8738217864.00,
    "2026-12": 10452751135.00
  };
  const LUCRO_LIQUIDO_META_ACUMULADA_2026 = {
    "2026-01": 89555555.56,
    "2026-02": 179111111.11,
    "2026-03": 268666666.67,
    "2026-04": null,
    "2026-05": null,
    "2026-06": null,
    "2026-07": null,
    "2026-08": null,
    "2026-09": null,
    "2026-10": null,
    "2026-11": null,
    "2026-12": 1209000000
  };
  const CURRENCY_FIELD_NAMES = new Set([
    "ggrRealizadoMes",
    "arrecadacaoTotalMes",
    "premiosAPagarMes",
    "despesaPessoalMes",
    "despesasAdministrativasMes",
    "receitasLiquidasMes",
    "lucroLiquidoRecorrenteAcumulado",
    "arrecadacaoCanaisEletronicosMes",
    "arrecadacaoTotalProdutosLoteriasMes",
    "arrecadacaoPixMes",
    "arrecadacaoTotalCanaisEletronicosMes",
    "pixAcumuladoTrimestre",
    "canaisAcumuladoTrimestre",
    "repasseSocialAcumulado",
    "repasseSocialAcumuladoCompetencia",
    "valorInvestidoAcumulado",
    "valorInvestidoMes",
    "valorInvestidoAcumuladoCompetencia",
    "lucroLiquidoBase",
    "arrecadacaoEcossistemaMes",
    "arrecadacaoEcossistemaMes2026",
    "arrecadacaoEcossistemaAcumulada2026",
    "arrecadacaoEcossistema2025PeriodoEquivalente",
    "arrecadacaoEcossistema2025Acumulada",
    "arrecadacaoEcossistema2026PeriodoAtual",
    "arrecadacaoEcossistema2025",
    "arrecadacaoTotal2025",
    "arrecadacaoRedeLotericaMes2026",
    "arrecadacaoRedeLotericaMes2025",
    "arrecadacaoRedeLotericaAcumulada2026",
    "arrecadacaoRedeLoterica2026PeriodoAtual",
    "arrecadacaoRedeLoterica2025PeriodoEquivalente",
    "arrecadacaoRedeLoterica2025Acumulada",
    "arrecadacaoTotalLoteriasPeriodo"
  ]);
  const CP1252_BYTES = {
    "€": 0x80, "‚": 0x82, "Æ’": 0x83, "„": 0x84, "…": 0x85,
    "†": 0x86, "‡": 0x87, "Ë†": 0x88, "‰": 0x89, "Å ": 0x8a,
    "‹": 0x8b, "Å’": 0x8c, "Å½": 0x8e, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "Ëœ": 0x98, "™": 0x99, "Å¡": 0x9a, "›": 0x9b, "Å“": 0x9c,
    "Å¾": 0x9e, "Å¸": 0x9f
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
    ["N\u003fo", "Não"], ["n\u003fo", "não"], ["m\u003fs", "mês"], ["M\u003fs", "Mês"],
    ["≥", "≥"], ["≤", "≤"]
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
  let localJsonDbPromise = null;
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
  const NPS_REFERENCIAS_2026 = {
    "2026-03": 55
  };
  const TIPOS_POSICAO_NPS = [
    "Baseline",
    "Acompanhamento",
    "Pesquisa oficial",
    "Revisão metodológica",
    "Fechamento anual"
  ];
  const TIPOS_POSICAO_CLIMA = [
    "Acompanhamento",
    "Plano de ação",
    "Pesquisa oficial",
    "Revisão metodológica",
    "Fechamento anual"
  ];
  const CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026 = {
    "1TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 1,
      descricao: "90% do público-alvo com 01 curso concluído: Curso de Jogo Responsável"
    },
    "2TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 2,
      descricao: "90% do público-alvo com 02 cursos concluídos acumulados"
    },
    "3TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 4,
      descricao: "90% do público-alvo com 04 cursos concluídos acumulados"
    },
    "4TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 5,
      descricao: "90% do público-alvo com 05 cursos concluídos acumulados"
    }
  };
  const JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026 = {
    "1TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 1,
      descricao: "90% do público-alvo com pelo menos 1 ação de disseminação de Jogo Responsável concluída"
    },
    "2TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 2,
      descricao: "90% do público-alvo com pelo menos 2 iniciativas de Jogo Responsável concluídas"
    },
    "3TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 2,
      descricao: "90% do público-alvo com pelo menos 2 iniciativas de Jogo Responsável concluídas"
    },
    "4TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 2,
      descricao: "90% do público-alvo com pelo menos 2 iniciativas de Jogo Responsável concluídas"
    }
  };
  const INCENTIVO_SOCIOAMBIENTAL_CURVA_2026 = {
    "1TRI/2026": {
      metaPercentualLucro: 0,
      metaValorAcumulado: 0,
      marcoEsperado: "Sem meta de investimento no período; projetos em prospecção e estruturação"
    },
    "2TRI/2026": {
      metaPercentualLucro: 0.0005,
      metaValorAcumulado: 652700,
      marcoEsperado: "Investimento acumulado de 0,05% do lucro líquido de referência"
    },
    "3TRI/2026": {
      metaPercentualLucro: 0.0010,
      metaValorAcumulado: 1305400,
      marcoEsperado: "Investimento acumulado de 0,10% do lucro líquido de referência"
    },
    "4TRI/2026": {
      metaPercentualLucro: 0.0033,
      metaValorAcumulado: 4307900,
      marcoEsperado: "Investimento acumulado de 0,33% do lucro líquido de referência"
    }
  };
  const STATUS_INCENTIVO_SOCIOAMBIENTAL = [
    "Não iniciado",
    "Em prospecção",
    "Em estruturação",
    "Em rito de governança",
    "Aprovado",
    "Investimento realizado",
    "Cancelado"
  ];

  function storageKey(key) {
    return `caixaLoterias:${key}`;
  }

  function isPhpBackend() {
    return typeof window !== "undefined" &&
      window.location?.protocol?.startsWith("http") &&
      Boolean(window.CAIXA_LOTERIAS_AUTH_USER);
  }

  async function phpApiFetch(path, options = {}) {
    const csrfToken = window.Auth?.getCurrentUser?.()?.csrfToken || window.CAIXA_LOTERIAS_AUTH_USER?.csrfToken || "";
    const response = await fetch(path, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(options.headers || {})
      },
      ...options
    });
    if (!response.ok) {
      throw new Error(`API PHP indisponível (${response.status}).`);
    }
    return response.json();
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
    solicitacoesReabertura: storageKey("solicitacoesReabertura"),
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

  function getBootstrapData(key) {
    const bootstrap = window.CAIXA_LOTERIAS_BOOTSTRAP_DATA;
    if (!bootstrap || bootstrap[key] === undefined) return null;
    return JSON.parse(JSON.stringify(bootstrap[key]));
  }

  function createValidationMetadata() {
    return {
      sistema: "Central de Indicadores Estratégicos",
      empresa: "CAIXA Loterias",
      modo: "validacao_local",
      versaoBase: "1.0",
      dataAtualizacao: new Date().toISOString(),
      anoReferencia: 2026
    };
  }

  function readValidationBase() {
    const raw = localStorage.getItem(VALIDATION_BASE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Base de validação local inválida; usando coleções locais.", error);
      return null;
    }
  }

  function writeValidationBase(base) {
    const normalized = {
      metadata: {
        ...createValidationMetadata(),
        ...(base?.metadata || {}),
        dataAtualizacao: new Date().toISOString()
      },
      ...base
    };
    localStorage.setItem(VALIDATION_BASE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function readValidationCollection(key) {
    const base = readValidationBase();
    if (!base || base[key] === undefined) return null;
    return base[key];
  }

  function syncValidationCollection(key, value) {
    if (!DATA_FILES[key]) return;
    const base = readValidationBase() || { metadata: createValidationMetadata() };
    base[key] = value;
    writeValidationBase(base);
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function openLocalJsonDb() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    if (localJsonDbPromise) return localJsonDbPromise;

    localJsonDbPromise = new Promise((resolve) => {
      const request = indexedDB.open(LOCAL_JSON_DB_NAME, LOCAL_JSON_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LOCAL_JSON_DB_STORE)) {
          db.createObjectStore(LOCAL_JSON_DB_STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("Armazenamento local IndexedDB indisponivel; usando localStorage.");
        resolve(null);
      };
      request.onblocked = () => {
        console.warn("Armazenamento local bloqueado por outra aba; usando localStorage nesta execucao.");
        resolve(null);
      };
    });

    return localJsonDbPromise;
  }

  async function readLocalJsonDb(key) {
    const localValue = readLocal(key);
    if (localValue !== null) return localValue;

    try {
      const db = await openLocalJsonDb();
      if (!db) return null;
      const transaction = db.transaction(LOCAL_JSON_DB_STORE, "readonly");
      const record = await requestToPromise(transaction.objectStore(LOCAL_JSON_DB_STORE).get(key));
      if (!record || record.value === undefined) return null;
      localStorage.setItem(storageKey(key), JSON.stringify(record.value));
      return record.value;
    } catch (error) {
      console.warn(`Nao foi possivel ler ${key} do armazenamento local.`, error);
      return null;
    }
  }

  async function writeLocalJsonDb(key, value) {
    localStorage.setItem(storageKey(key), JSON.stringify(value));

    try {
      const db = await openLocalJsonDb();
      if (!db) return false;
      const transaction = db.transaction(LOCAL_JSON_DB_STORE, "readwrite");
      await requestToPromise(transaction.objectStore(LOCAL_JSON_DB_STORE).put({
        key,
        value: JSON.parse(JSON.stringify(value)),
        updatedAt: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.warn(`Nao foi possivel salvar ${key} no armazenamento local IndexedDB; localStorage foi mantido.`, error);
      return false;
    }
  }

  async function deleteLocalJsonDbKey(key) {
    try {
      const db = await openLocalJsonDb();
      if (!db) return;
      const transaction = db.transaction(LOCAL_JSON_DB_STORE, "readwrite");
      await requestToPromise(transaction.objectStore(LOCAL_JSON_DB_STORE).delete(key));
    } catch (error) {
      console.warn(`Nao foi possivel remover ${key} do armazenamento local.`, error);
    }
  }

  async function clearLocalJsonDb() {
    try {
      const db = await openLocalJsonDb();
      if (!db) return;
      const transaction = db.transaction(LOCAL_JSON_DB_STORE, "readwrite");
      await requestToPromise(transaction.objectStore(LOCAL_JSON_DB_STORE).clear());
    } catch (error) {
      console.warn("Nao foi possivel limpar o armazenamento local IndexedDB.", error);
    }
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  function mojibakeScore(value) {
    return (String(value).match(/[\u00c3\u00c2\u00e2\ufffd]/g) || []).length;
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
        console.warn("Nao foi possivel migrar os campos monetarios locais; os dados foram preservados.");
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

  function getLucroLiquidoMetaAcumulada(ano, mes) {
    return LUCRO_LIQUIDO_META_ACUMULADA_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getNpsMetaReferencia(ano, mes) {
    const key = `${ano}-${String(mes).padStart(2, "0")}`;
    return NPS_REFERENCIAS_2026[key] ?? 58;
  }

  function getGgrMetaAcumulada(ano, mes) {
    return GGR_META_ACUMULADA_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getIeoMetaAcumulada(ano, mes) {
    const key = `${ano}-${String(mes).padStart(2, "0")}`;
    return Object.prototype.hasOwnProperty.call(IEO_META_ACUMULADA_2026, key) ? IEO_META_ACUMULADA_2026[key] : null;
  }

  function getRepasseSocialMetaAcumulada(ano, mes) {
    return REPASSE_SOCIAL_META_ACUMULADA_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getAprimoramentoMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return APRIMORAMENTO_CURVA_TRIMESTRAL_2026[trimestre]?.metaPercentual ?? null;
  }

  function getCapacidadeTicMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026[trimestre]?.metaPercentual ?? null;
  }

  function getPrincipiosJogoResponsavelMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026[trimestre]?.metaElementosAcumulados ?? null;
  }

  function getApoioSocioambientalMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return APOIO_SOCIOAMBIENTAL_CURVA_2026[trimestre]?.metaQuantidadeAcumulada ?? null;
  }

  function getCapacitacaoEmpregadosMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026[trimestre]?.metaCobertura ?? null;
  }

  function getJogoResponsavelCapacitacaoMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026[trimestre]?.metaCobertura ?? null;
  }

  function getIncentivoSocioambientalMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return INCENTIVO_SOCIOAMBIENTAL_CURVA_2026[trimestre]?.metaValorAcumulado ?? null;
  }

  function getVisibilidadeRepassesMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return VISIBILIDADE_REPASSES_CURVA_2026[trimestre]?.metaAcoesRealizadasAcumuladas ?? null;
  }

  function getEcossistemaMetaTrimestral(ano, mes, cenario = "lotex_marketplace") {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI`;
    const metaPontosPercentuais = ECOSSISTEMA_CURVAS_2026[cenario]?.[trimestre]?.meta2026;
    return metaPontosPercentuais === undefined ? null : metaPontosPercentuais / 100;
  }

  function getRedeLotericaMetaIncrementoTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI`;
    const metaPontosPercentuais = REDE_LOTERICA_CURVA_INCREMENTO_2026[trimestre]?.metaIncremento;
    return metaPontosPercentuais === undefined ? null : metaPontosPercentuais / 100;
  }

  function migrarCampoGgrLegado(launch) {
    if (Number(launch?.indicadorId) !== 5) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.ggrRealizadoMes !== undefined && camposEntrada.ggrRealizadoMesMigrado === undefined) {
      camposEntrada.ggrRealizadoMesMigrado = camposEntrada.ggrRealizadoMes;
      delete camposEntrada.ggrRealizadoMes;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoRepasseSocialLegado(launch) {
    if (Number(launch?.indicadorId) !== 17) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.repasseSocialAcumulado !== undefined && camposEntrada.repasseSocialAcumuladoCompetencia === undefined) {
      camposEntrada.repasseSocialAcumuladoCompetencia = camposEntrada.repasseSocialAcumulado;
      camposEntrada.repasseSocialAcumuladoMigrado = camposEntrada.repasseSocialAcumulado;
      delete camposEntrada.repasseSocialAcumulado;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoEcossistemaLegado(launch) {
    if (Number(launch?.indicadorId) !== 22) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.arrecadacaoEcossistemaMes !== undefined && camposEntrada.arrecadacaoEcossistemaMes2026 === undefined) {
      camposEntrada.arrecadacaoEcossistemaMes2026 = camposEntrada.arrecadacaoEcossistemaMes;
      camposEntrada.arrecadacaoEcossistemaMesMigrado = camposEntrada.arrecadacaoEcossistemaMes;
      delete camposEntrada.arrecadacaoEcossistemaMes;
    }
    if (camposEntrada.arrecadacaoViaEcossistema === undefined && camposEntrada.arrecadacaoEcossistemaMes2026 !== undefined) {
      camposEntrada.arrecadacaoViaEcossistema = camposEntrada.arrecadacaoEcossistemaMes2026;
    }
    if (camposEntrada.cenarioApuracaoEcossistema === undefined) {
      camposEntrada.cenarioApuracaoEcossistema = "lotex_marketplace";
    }
    if (camposEntrada.arrecadacaoEcossistema2025 !== undefined && camposEntrada.arrecadacaoEcossistema2025PeriodoEquivalente === undefined) {
      camposEntrada.arrecadacaoEcossistema2025PeriodoEquivalente = camposEntrada.arrecadacaoEcossistema2025;
      camposEntrada.arrecadacaoEcossistema2025Migrado = camposEntrada.arrecadacaoEcossistema2025;
      delete camposEntrada.arrecadacaoEcossistema2025;
    }
    if (camposEntrada.arrecadacaoEcossistema2026PeriodoAtual !== undefined && camposEntrada.arrecadacaoEcossistemaAcumulada2026 === undefined) {
      camposEntrada.arrecadacaoEcossistemaAcumulada2026 = camposEntrada.arrecadacaoEcossistema2026PeriodoAtual;
      camposEntrada.arrecadacaoEcossistema2026PeriodoAtualMigrado = camposEntrada.arrecadacaoEcossistema2026PeriodoAtual;
      delete camposEntrada.arrecadacaoEcossistema2026PeriodoAtual;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoRedeLotericaLegado(launch) {
    if (Number(launch?.indicadorId) !== 23) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.arrecadacaoRedeLotericaMes2025 !== undefined && camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente === undefined) {
      camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente = camposEntrada.arrecadacaoRedeLotericaMes2025;
      camposEntrada.arrecadacaoRedeLotericaMes2025Migrado = camposEntrada.arrecadacaoRedeLotericaMes2025;
      delete camposEntrada.arrecadacaoRedeLotericaMes2025;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2025 === undefined && camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente !== undefined) {
      camposEntrada.arrecadacaoRedeLoterica2025 = camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2026 === undefined && camposEntrada.arrecadacaoRedeLotericaMes2026 !== undefined) {
      camposEntrada.arrecadacaoRedeLoterica2026 = camposEntrada.arrecadacaoRedeLotericaMes2026;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual !== undefined && camposEntrada.arrecadacaoRedeLotericaAcumulada2026 === undefined) {
      camposEntrada.arrecadacaoRedeLotericaAcumulada2026 = camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual;
      camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtualMigrado = camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2026 === undefined && camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual !== undefined) {
      camposEntrada.arrecadacaoRedeLoterica2026 = camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoOfertasLegado(launch) {
    if (Number(launch?.indicadorId) !== 1) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.baseClientesAtivos !== undefined && camposEntrada.baseClientesAtivosCompetencia === undefined) {
      camposEntrada.baseClientesAtivosCompetencia = camposEntrada.baseClientesAtivos;
      camposEntrada.baseClientesAtivosMigrado = camposEntrada.baseClientesAtivos;
      delete camposEntrada.baseClientesAtivos;
    }
    if (camposEntrada.clientesComOfertaPersonalizada !== undefined && camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia === undefined) {
      camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia = camposEntrada.clientesComOfertaPersonalizada;
      camposEntrada.clientesComOfertaPersonalizadaMigrado = camposEntrada.clientesComOfertaPersonalizada;
      delete camposEntrada.clientesComOfertaPersonalizada;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoNpsLegado(launch) {
    if (Number(launch?.indicadorId) !== 2) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.npsRealizado !== undefined && camposEntrada.npsApurado === undefined) {
      camposEntrada.npsApurado = camposEntrada.npsRealizado;
      camposEntrada.npsRealizadoMigrado = camposEntrada.npsRealizado;
      delete camposEntrada.npsRealizado;
    }
    if (camposEntrada.dataPesquisa !== undefined && camposEntrada.dataBasePesquisaNPS === undefined) {
      camposEntrada.dataBasePesquisaNPS = camposEntrada.dataPesquisa;
      camposEntrada.dataPesquisaMigrado = camposEntrada.dataPesquisa;
      delete camposEntrada.dataPesquisa;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBasePesquisaNPS === undefined) {
      camposEntrada.dataBasePesquisaNPS = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    if (camposEntrada.relatorioPesquisa !== undefined && camposEntrada.fontePesquisaNPS === undefined) {
      camposEntrada.fontePesquisaNPS = camposEntrada.relatorioPesquisa;
      camposEntrada.relatorioPesquisaMigrado = camposEntrada.relatorioPesquisa;
      delete camposEntrada.relatorioPesquisa;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoClimaLegado(launch) {
    if (Number(launch?.indicadorId) !== 12) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.mediaGeralGPTW !== undefined && camposEntrada.notaClimaApurada === undefined) {
      camposEntrada.notaClimaApurada = camposEntrada.mediaGeralGPTW;
      camposEntrada.mediaGeralGPTWMigrado = camposEntrada.mediaGeralGPTW;
      delete camposEntrada.mediaGeralGPTW;
    }
    if (camposEntrada.dataPesquisa !== undefined && camposEntrada.dataBasePesquisaClima === undefined) {
      camposEntrada.dataBasePesquisaClima = camposEntrada.dataPesquisa;
      camposEntrada.dataPesquisaMigrado = camposEntrada.dataPesquisa;
      delete camposEntrada.dataPesquisa;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBasePesquisaClima === undefined) {
      camposEntrada.dataBasePesquisaClima = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    if (camposEntrada.relatorioGPTW !== undefined && camposEntrada.fonteEvidenciaClima === undefined) {
      camposEntrada.fonteEvidenciaClima = camposEntrada.relatorioGPTW;
      camposEntrada.relatorioGPTWMigrado = camposEntrada.relatorioGPTW;
      delete camposEntrada.relatorioGPTW;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoCapacitacaoLegado(launch) {
    if (Number(launch?.indicadorId) !== 15) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.empregadosElegiveisMes !== undefined && camposEntrada.publicoAlvoElegivelCapacitacao === undefined) {
      camposEntrada.publicoAlvoElegivelCapacitacao = camposEntrada.empregadosElegiveisMes;
      camposEntrada.empregadosElegiveisMesMigrado = camposEntrada.empregadosElegiveisMes;
      delete camposEntrada.empregadosElegiveisMes;
    }
    if (camposEntrada.empregadosCapacitadosMes !== undefined && camposEntrada.empregadosCapacitadosCapacitacao === undefined) {
      camposEntrada.empregadosCapacitadosCapacitacao = camposEntrada.empregadosCapacitadosMes;
      camposEntrada.empregadosCapacitadosMesMigrado = camposEntrada.empregadosCapacitadosMes;
      delete camposEntrada.empregadosCapacitadosMes;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBaseApuracaoCapacitacao === undefined) {
      camposEntrada.dataBaseApuracaoCapacitacao = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoJogoResponsavelCapacitacaoLegado(launch) {
    if (Number(launch?.indicadorId) !== 21) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.empregadosElegiveisMes !== undefined && camposEntrada.publicoAlvoElegivelJR === undefined) {
      camposEntrada.publicoAlvoElegivelJR = camposEntrada.empregadosElegiveisMes;
      camposEntrada.empregadosElegiveisMesMigrado = camposEntrada.empregadosElegiveisMes;
      delete camposEntrada.empregadosElegiveisMes;
    }
    if (camposEntrada.empregadosComDuasIniciativasConcluidas !== undefined && camposEntrada.empregadosCapacitadosJR === undefined) {
      camposEntrada.empregadosCapacitadosJR = camposEntrada.empregadosComDuasIniciativasConcluidas;
      camposEntrada.empregadosComDuasIniciativasConcluidasMigrado = camposEntrada.empregadosComDuasIniciativasConcluidas;
      delete camposEntrada.empregadosComDuasIniciativasConcluidas;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBaseApuracaoJR === undefined) {
      camposEntrada.dataBaseApuracaoJR = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    if (camposEntrada.evidencia !== undefined && camposEntrada.fonteEvidenciaJR === undefined) {
      camposEntrada.fonteEvidenciaJR = camposEntrada.evidencia;
      camposEntrada.evidenciaMigrada = camposEntrada.evidencia;
      delete camposEntrada.evidencia;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoIncentivoSocioambientalLegado(launch) {
    if (Number(launch?.indicadorId) !== 19) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.valorInvestidoAcumulado !== undefined && camposEntrada.valorInvestidoAcumuladoCompetencia === undefined) {
      camposEntrada.valorInvestidoAcumuladoCompetencia = camposEntrada.valorInvestidoAcumulado;
      camposEntrada.valorInvestidoAcumuladoMigrado = camposEntrada.valorInvestidoAcumulado;
      delete camposEntrada.valorInvestidoAcumulado;
    }
    if (camposEntrada.statusAcao !== undefined && camposEntrada.statusProjetoIncentivoSocioambiental === undefined) {
      camposEntrada.statusProjetoIncentivoSocioambiental = camposEntrada.statusAcao;
      camposEntrada.statusAcaoMigrado = camposEntrada.statusAcao;
      delete camposEntrada.statusAcao;
    }
    if (camposEntrada.evidencia !== undefined && camposEntrada.evidenciaIncentivoSocioambiental === undefined) {
      camposEntrada.evidenciaIncentivoSocioambiental = camposEntrada.evidencia;
      camposEntrada.evidenciaMigrada = camposEntrada.evidencia;
      delete camposEntrada.evidencia;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoAprimoramentoLegado(launch) {
    if (Number(launch?.indicadorId) !== 4) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.melhoriasEntreguesMes !== undefined && camposEntrada.melhoriasImplementadasMes === undefined) {
      camposEntrada.melhoriasImplementadasMes = camposEntrada.melhoriasEntreguesMes;
      camposEntrada.melhoriasEntreguesMesMigrado = camposEntrada.melhoriasEntreguesMes;
      delete camposEntrada.melhoriasEntreguesMes;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoPlataformaJogosLegado(launch) {
    if (Number(launch?.indicadorId) !== 10) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.etapaAtualProjeto !== undefined && camposEntrada.marcoAtualPlataformaJogos === undefined) {
      camposEntrada.marcoAtualPlataformaJogos = camposEntrada.etapaAtualProjeto;
      camposEntrada.etapaAtualProjetoMigrado = camposEntrada.etapaAtualProjeto;
      delete camposEntrada.etapaAtualProjeto;
    }
    if (camposEntrada.evidenciaEntrega !== undefined && camposEntrada.evidenciaPlataformaJogos === undefined) {
      camposEntrada.evidenciaPlataformaJogos = camposEntrada.evidenciaEntrega;
      camposEntrada.evidenciaEntregaMigrado = camposEntrada.evidenciaEntrega;
      delete camposEntrada.evidenciaEntrega;
    }
    if (camposEntrada.percentualExecucao !== undefined && camposEntrada.percentualExecucaoMigrado === undefined) {
      camposEntrada.percentualExecucaoMigrado = camposEntrada.percentualExecucao;
      delete camposEntrada.percentualExecucao;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoCapacidadeTicLegado(launch) {
    if (Number(launch?.indicadorId) !== 11) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.etapaAtual !== undefined && camposEntrada.marcoAlcancadoTIC === undefined) {
      camposEntrada.marcoAlcancadoTIC = camposEntrada.etapaAtual;
      camposEntrada.etapaAtualMigrado = camposEntrada.etapaAtual;
      delete camposEntrada.etapaAtual;
    }
    if (camposEntrada.percentualExecucao !== undefined && camposEntrada.percentualRealizadoTIC === undefined) {
      camposEntrada.percentualRealizadoTIC = camposEntrada.percentualExecucao;
      camposEntrada.percentualExecucaoMigrado = camposEntrada.percentualExecucao;
      delete camposEntrada.percentualExecucao;
    }
    if (camposEntrada.numeroProcesso !== undefined && camposEntrada.descricaoAndamentoTIC === undefined) {
      camposEntrada.descricaoAndamentoTIC = camposEntrada.numeroProcesso;
      camposEntrada.numeroProcessoMigrado = camposEntrada.numeroProcesso;
      delete camposEntrada.numeroProcesso;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoPrincipiosJogoResponsavelLegado(launch) {
    if (Number(launch?.indicadorId) !== 18) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.acaoMelhoria !== undefined && camposEntrada.acaoExecutada === undefined) {
      camposEntrada.acaoExecutada = camposEntrada.acaoMelhoria;
      camposEntrada.acaoMelhoriaMigrado = camposEntrada.acaoMelhoria;
      delete camposEntrada.acaoMelhoria;
    }
    if (camposEntrada.dataExecucao !== undefined && camposEntrada.dataConclusao === undefined) {
      camposEntrada.dataConclusao = camposEntrada.dataExecucao;
      camposEntrada.dataExecucaoMigrado = camposEntrada.dataExecucao;
      delete camposEntrada.dataExecucao;
    }
    if (camposEntrada.elementosExecutadosAcumulado !== undefined && camposEntrada.elementosExecutadosAcumuladoMigrado === undefined) {
      camposEntrada.elementosExecutadosAcumuladoMigrado = camposEntrada.elementosExecutadosAcumulado;
      delete camposEntrada.elementosExecutadosAcumulado;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoApoioSocioambientalLegado(launch) {
    if (Number(launch?.indicadorId) !== 16) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.nomeIniciativa !== undefined && camposEntrada.nomeIniciativaSocioambiental === undefined) {
      camposEntrada.nomeIniciativaSocioambiental = camposEntrada.nomeIniciativa;
      camposEntrada.nomeIniciativaMigrado = camposEntrada.nomeIniciativa;
      delete camposEntrada.nomeIniciativa;
    }
    if (camposEntrada.dataApoio !== undefined && camposEntrada.dataApoioIniciativa === undefined) {
      camposEntrada.dataApoioIniciativa = camposEntrada.dataApoio;
      camposEntrada.dataApoioMigrado = camposEntrada.dataApoio;
      delete camposEntrada.dataApoio;
    }
    if (camposEntrada.quantidadeIniciativasApoiadasMes !== undefined && camposEntrada.quantidadeIniciativasApoiadasMesMigrado === undefined) {
      camposEntrada.quantidadeIniciativasApoiadasMesMigrado = camposEntrada.quantidadeIniciativasApoiadasMes;
      delete camposEntrada.quantidadeIniciativasApoiadasMes;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoVisibilidadeRepassesLegado(launch) {
    if (Number(launch?.indicadorId) !== 20) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.statusAcao !== undefined && camposEntrada.statusAcaoVisibilidade === undefined) {
      camposEntrada.statusAcaoVisibilidade = camposEntrada.statusAcao;
      camposEntrada.statusAcaoMigrado = camposEntrada.statusAcao;
      delete camposEntrada.statusAcao;
    }
    if (camposEntrada.evidencia !== undefined && camposEntrada.evidenciaVisibilidade === undefined) {
      camposEntrada.evidenciaVisibilidade = camposEntrada.evidencia;
      camposEntrada.evidenciaMigrada = camposEntrada.evidencia;
      delete camposEntrada.evidencia;
    }
    if (camposEntrada.totalAcoesPropostas !== undefined && camposEntrada.totalAcoesPropostasMigrado === undefined) {
      camposEntrada.totalAcoesPropostasMigrado = camposEntrada.totalAcoesPropostas;
      delete camposEntrada.totalAcoesPropostas;
    }
    if (camposEntrada.totalAcoesRealizadas !== undefined && camposEntrada.totalAcoesRealizadasMigrado === undefined) {
      camposEntrada.totalAcoesRealizadasMigrado = camposEntrada.totalAcoesRealizadas;
      delete camposEntrada.totalAcoesRealizadas;
    }
    return { ...launch, camposEntrada };
  }

  async function checkJsonDb() {
    if (!isPhpBackend()) {
      jsonDbAvailable = false;
      localStorage.setItem(STORAGE_MODE_KEY, "sql_local");
      return false;
    }

    try {
      const payload = await phpApiFetch("/api/database.php?ping=1");
      jsonDbAvailable = payload?.ok === true;
      localStorage.setItem(STORAGE_MODE_KEY, jsonDbAvailable ? "php_sqlite_local" : "sql_local");
      return jsonDbAvailable;
    } catch (error) {
      console.warn("Backend PHP/SQLite indisponível; usando armazenamento local do navegador.", error);
      jsonDbAvailable = false;
      localStorage.setItem(STORAGE_MODE_KEY, "browser");
      return false;
    }
  }

  async function loadFromJsonDb(key) {
    if (!(await checkJsonDb())) return null;
    return phpApiFetch(`/api/database.php?collection=${encodeURIComponent(key)}`);
  }

  async function saveToJsonDb(key, value) {
    if (!(await checkJsonDb())) return false;
    const payload = await phpApiFetch("/api/database.php", {
      method: "POST",
      body: JSON.stringify({ key, value })
    });
    return payload?.ok === true;
  }

  function preserveLocalOperationalBackup(key, localValue, centralValue) {
    if (!OPERATIONAL_KEYS.includes(key) || localValue === null) return;
    const normalizedLocal = normalizeData(key, localValue);
    const normalizedCentral = normalizeData(key, centralValue);

    if (safeStringify(normalizedLocal) === safeStringify(normalizedCentral)) return;

    localStorage.setItem(jsonDbLocalBackupKey(key), JSON.stringify({
      key,
      createdAt: new Date().toISOString(),
      reason: "Dados locais divergentes preservados antes de atualizar a base de validacao.",
      data: normalizedLocal
    }));
    localStorage.setItem(CENTRAL_BACKUP_PENDING_KEY, "true");
    console.warn(`Dados locais divergentes de ${key} foram preservados em copia local de seguranca.`);
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
      console.warn(`Dados locais invalidos para ${key}; usando arquivo inicial.`, error);
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

  async function resetarLancamentosIniciais() {
    const operationalPatterns = ["lancamento", "homolog", "historico", "dashboard", "relatorio", "ranking"];
    Object.keys(localStorage).forEach((key) => {
      const normalizedKey = key.toLowerCase();
      if (operationalPatterns.some((pattern) => normalizedKey.includes(pattern))) {
        localStorage.removeItem(key);
      }
    });

    await Promise.all(OPERATIONAL_KEYS.map((key) => {
      localStorage.removeItem(storageKey(key));
      localStorage.removeItem(key);
      localStorage.removeItem(jsonDbMigrationKey(key));
      delete cache[key];
      return deleteLocalJsonDbKey(key);
    }));
    localStorage.removeItem("dashboardData");
    localStorage.removeItem("mockDashboardData");
    localStorage.removeItem("rankingMaiorAtingimento");
    localStorage.removeItem("rankingMenorAtingimento");
    persistVersionMarkers();
  }

  async function ensureOperationalDataVersion() {
    if (
      localStorage.getItem(OPERATIONAL_DATA_VERSION_KEY) === OPERATIONAL_DATA_VERSION &&
      localStorage.getItem(OPERATIONAL_DATA_SIGNATURE_KEY) === OPERATIONAL_DATA_SIGNATURE
    ) {
      return;
    }
    console.info("Atualizando armazenamento local para a base SQL versionada do projeto.");
    Object.keys(DATA_FILES).forEach((key) => {
      localStorage.removeItem(storageKey(key));
      localStorage.removeItem(key);
      delete cache[key];
    });
    localStorage.removeItem(VALIDATION_BASE_KEY);
    localStorage.removeItem(STORAGE_MODE_KEY);
    localStorage.removeItem(CENTRAL_BACKUP_PENDING_KEY);
    OPERATIONAL_KEYS.forEach((key) => {
      localStorage.removeItem(jsonDbMigrationKey(key));
      localStorage.removeItem(jsonDbLocalBackupKey(key));
    });
    await clearLocalJsonDb();
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

  function completarLancamentosAusentes(lancamentos, indicadores, metas = [], ano = 2026) {
    if (!Array.isArray(lancamentos) || !Array.isArray(indicadores)) return lancamentos;

    const existentes = new Set(lancamentos.map((item) => (
      `${Number(item.indicadorId)}:${Number(item.ano)}:${Number(item.mes)}`
    )));
    const metasPorIndicadorMes = new Map(
      (metas || []).map((meta) => [`${Number(meta.indicadorId)}:${Number(meta.ano)}:${Number(meta.mes)}`, meta])
    );
    let nextId = lancamentos.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const ausentes = [];

    indicadores
      .filter((indicador) => indicador && indicador.ativo !== false)
      .forEach((indicador) => {
        MESES.forEach(([mes, nomeMes]) => {
          const key = `${Number(indicador.id)}:${ano}:${mes}`;
          if (existentes.has(key)) return;
          const meta = metasPorIndicadorMes.get(key) || {};
          ausentes.push(resetarDadosOperacionais([{
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
          }])[0]);
          existentes.add(key);
        });
      });

    return ausentes.length ? [...lancamentos, ...ausentes] : lancamentos;
  }

  async function resetarBaseOperacionalGlobal() {
    await resetarLancamentosIniciais();
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

  function normalizarSituacaoLancamento(launch) {
    return window.Situations ? Situations.normalizarLancamento(launch) : launch;
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
        if (Number(indicator.id) === 1) {
          return {
            ...normalized,
            tipoCalculo: "percentual_direto",
            unidadeMedida: "percentual",
            metaAnualDescricao: "≥ 10%",
            metrica: "Clientes únicos com oferta personalizada / Base de clientes ativos identificáveis"
          };
        }
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
        if (Number(indicator.id) === 4) {
          return {
            ...normalized,
            tipoCalculo: "melhorias_acumuladas",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline.",
            metrica: "Melhorias implementadas acumuladas / 22 melhorias mapeadas no plano de trabalho"
          };
        }
        if (Number(indicator.id) === 5) {
          return {
            ...normalized,
            tipoCalculo: "ggr_formula",
            unidadeMedida: "moeda",
            metaAnualDescricao: "≥ R$ 15,6 bilhões",
            metrica: "GGR = Arrecadação total - Prêmios a pagar"
          };
        }
        if (Number(indicator.id) === 6) {
          return {
            ...normalized,
            tipoCalculo: "indice_inverso",
            unidadeMedida: "percentual",
            metaAnualDescricao: "≤ 14,03%",
            metrica: "((Despesa de pessoal + Despesas Administrativas) / Receitas Líquidas) × 100"
          };
        }
        if (Number(indicator.id) === 2) {
          return {
            ...normalized,
            tipoCalculo: "nota_pesquisa_nps",
            unidadeMedida: "pontos",
            metaAnualDescricao: "Meta anual correta: NPS 58",
            metrica: "NPS = % promotores - % detratores. Baseline 55; referência 70; redução esperada do gap 20%."
          };
        }
        if (Number(indicator.id) === 17) {
          return {
            ...normalized,
            tipoCalculo: "valor_financeiro_acumulado",
            unidadeMedida: "moeda",
            metaAnualDescricao: "≥ R$ 10,4 bilhões",
            metrica: "Repasse social acumulado até a competência"
          };
        }
        if (Number(indicator.id) === 11) {
          return {
            ...normalized,
            tipoCalculo: "marco_projeto_percentual",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026.",
            metrica: "Avanço por marcos trimestrais de contratação/parceria de TIC"
          };
        }
        if (Number(indicator.id) === 12) {
          return {
            ...normalized,
            unidadeApuradora: "GERIN",
            diretoriaResponsavel: "DILOT",
            tipoCalculo: "nota_pesquisa_anual",
            unidadeMedida: "pontos",
            metaAnualDescricao: "Média geral ≥ 60",
            metrica: "Resultado da média geral da pesquisa de clima para o ano de 2026"
          };
        }
        if (Number(indicator.id) === 15) {
          return {
            ...normalized,
            unidadeApuradora: "GERIN",
            diretoriaResponsavel: "DILOT",
            tipoCalculo: "cobertura_capacitacao",
            unidadeMedida: "percentual",
            metaAnualDescricao: "≥ 90%",
            metrica: "Empregados capacitados no critério trimestral / Público-alvo elegível"
          };
        }
        if (Number(indicator.id) === 21) {
          return {
            ...normalized,
            tipoCalculo: "cobertura_capacitacao_jogo_responsavel",
            unidadeMedida: "percentual",
            metaAnualDescricao: "≥ 90% do público-alvo capacitado em pelo menos 2 iniciativas de Jogo Responsável",
            metrica: "Empregados elegíveis com a quantidade mínima de iniciativas concluídas / Público-alvo elegível"
          };
        }
        if (Number(indicator.id) === 10) {
          return {
            ...normalized,
            tipoCalculo: "projeto_marco_entrega",
            unidadeMedida: "marco",
            metaAnualDescricao: "Piloto ou MVP da Plataforma de Jogos",
            metrica: "Referência futura: (GGR da CAIXA Loterias) / (Total de GGR do Mercado) x 100. Aplicável após implementação da plataforma e disponibilidade de dados oficiais de mercado."
          };
        }
        if (Number(indicator.id) === 18) {
          return {
            ...normalized,
            tipoCalculo: "plano_acao_por_elementos",
            unidadeMedida: "quantidade",
            metaAnualDescricao: "Nível 3 RGF-WLA - Executar ações de melhoria para os 10 elementos.",
            metrica: "Quantidade de elementos RGF-WLA únicos atendidos por ações concluídas ou homologadas"
          };
        }
        if (Number(indicator.id) === 16) {
          return {
            ...normalized,
            tipoCalculo: "iniciativas_apoiadas",
            unidadeMedida: "quantidade",
            metaAnualDescricao: "02 iniciativas apoiadas",
            metrica: "Quantidade de iniciativas socioambientais únicas com status Apoiada/realizada"
          };
        }
        if (Number(indicator.id) === 19) {
          return {
            ...normalized,
            tipoCalculo: "investimento_socioambiental",
            unidadeMedida: "moeda",
            metaAnualDescricao: "0,33% do Lucro Líquido do ano (R$ 4.307.900,00 estimados)",
            metrica: "Valor investido em iniciativas com impacto socioambiental"
          };
        }
        if (Number(indicator.id) === 20) {
          return {
            ...normalized,
            tipoCalculo: "execucao_acoes_propostas",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Implantar 100% das ações propostas",
            metrica: "Ações propostas publicadas/realizadas / 2 ações propostas em 2026"
          };
        }
        if (Number(indicator.id) === 22) {
          return {
            ...normalized,
            tipoCalculo: "participacao_ecossistema_com_cenarios",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Ano 2026: ≥ 10% em relação ao exercício de 2025",
            metrica: "(Arrecadação via ecossistema / Arrecadação total) × 100",
            conceito: "Este indicador mede a proporção da arrecadação total obtida por meio de soluções ou produtos desenvolvidos e/ou distribuídos através de plataformas contratadas, parcerias estratégicas, parcerias do mercado, parcerias com empresas do Conglomerado, startups, CPSI, novos canais de distribuição e demais iniciativas aderentes ao pilar Atuação em Ecossistema.",
            observacaoMetodologica: "A projeção de 2026 considerou inicialmente a parceria para comercialização da Lotex e inclui Apostas de Quota Fixa a partir de 2026. O informe do 1TRI26 também apresenta cenário complementar com a ferramenta Marketplace, aderente ao pilar Atuação em Ecossistema.",
            cenarioOficialResumoExecutivo: "lotex_marketplace"
          };
        }
        if (Number(indicator.id) === 23) {
          return {
            ...normalized,
            indicador: INDICATOR_NAMES[22],
            tipoCalculo: "incremento_rede_loterica_base_2025",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Meta anual: 2,00% de incremento",
            metrica: "Fórmula oficial: Arrecadação Rede Lotérica 2026 / Arrecadação Rede Lotérica 2025 × 100. Resultado exibido: incremento percentual (índice 2026/2025 menos 100).",
            conceito: "Este indicador tem o objetivo de mensurar o crescimento da arrecadação de loterias na Rede Lotérica.",
            observacaoMetodologica: "Embora a fórmula oficial calcule a razão entre a arrecadação de 2026 e a arrecadação de 2025, a apresentação do indicador deve considerar o incremento percentual, ou seja, o índice 2026/2025 menos 100."
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
        if (Number(rule.indicadorId) === 1) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[0],
            tipoCalculo: "percentual_direto",
            tipoConsolidacao: "acumulado_por_competencia",
            unidadeMedida: "percentual",
            metaAnualValor: 0.10,
            parametrosCalculo: {
              numeradorCampo: "clientesUnicosComOfertaPersonalizadaCompetencia",
              denominadorCampo: "baseClientesAtivosCompetencia",
              metaReferencia: 0.10,
              metaTipo: "fixa",
              sentidoMeta: "quanto_maior_melhor",
              validarNumeradorAteDenominador: false
            },
            camposEntrada: [
              { nome: "baseClientesAtivosCompetencia", rotulo: "Base de clientes ativos identificáveis da competência", tipo: "numero", obrigatorio: true },
              { nome: "clientesUnicosComOfertaPersonalizadaCompetencia", rotulo: "Clientes únicos com oferta personalizada até a competência", tipo: "numero", obrigatorio: true }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 2) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[1],
            tipoCalculo: "nota_pesquisa_nps",
            tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
            unidadeMedida: "pontos",
            metaAnualValor: 58,
            parametrosCalculo: {
              campoTipoPosicao: "tipoPosicaoNPS",
              campoMetaReferencia: "metaReferenciaCompetenciaNPS",
              campoNps: "npsApurado",
              campoPromotores: "percentualPromotores",
              campoDetratores: "percentualDetratores",
              campoDataBase: "dataBasePesquisaNPS",
              campoFonte: "fontePesquisaNPS",
              metaTipo: "baseline_com_meta_anual_corrigida",
              baselineNPS: 55,
              notaReferenciaNPS: 70,
              percentualReducaoGap: 0.20,
              metaAnualMetodologica: 58,
              referenciasPorCompetencia: NPS_REFERENCIAS_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "tipoPosicaoNPS", rotulo: "Tipo da posição", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_NPS },
              { nome: "metaReferenciaCompetenciaNPS", rotulo: "Meta de referência da competência", tipo: "numero", obrigatorio: false },
              { nome: "npsApurado", rotulo: "NPS apurado na pesquisa", tipo: "numero", obrigatorio: false },
              { nome: "percentualPromotores", rotulo: "Percentual de promotores", tipo: "percentual", obrigatorio: false },
              { nome: "percentualDetratores", rotulo: "Percentual de detratores", tipo: "percentual", obrigatorio: false },
              { nome: "dataBasePesquisaNPS", rotulo: "Data-base da pesquisa", tipo: "data", obrigatorio: false },
              { nome: "fontePesquisaNPS", rotulo: "Fonte/evidência da pesquisa", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "npsApurado",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "resultado_pesquisa_ou_ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 4) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[3],
            tipoCalculo: "melhorias_acumuladas",
            tipoConsolidacao: "quantidade_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.25,
            parametrosCalculo: {
              campoValor: "melhoriasImplementadasMes",
              campoValorLegado: "melhoriasEntreguesMes",
              totalMelhoriasPlano2026: 22,
              metaPercentualAnualAprimoramento: 0.25,
              metaMinimaMelhoriasAno: 6,
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: APRIMORAMENTO_CURVA_TRIMESTRAL_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "melhoriasImplementadasMes", rotulo: "Quantidade de melhorias implementadas no mês", tipo: "numero", obrigatorio: true },
              { nome: "descricaoMelhoriasMes", rotulo: "Descrição da melhoria implementada", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaMelhoriasMes", rotulo: "Evidência da melhoria", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "curva_trimestral_acumulada"
          };
        }
        if (Number(rule.indicadorId) === 10) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[9],
            tipoCalculo: "projeto_marco_entrega",
            tipoConsolidacao: "ultima_posicao_trimestral",
            unidadeMedida: "marco",
            metaAnualValor: null,
            parametrosCalculo: {
              campoMarco: "marcoAtualPlataformaJogos",
              campoStatus: "statusProjetoPlataformaJogos",
              metaTipo: "marco_anual",
              sentidoMeta: "marco_concluido",
              metaAnualMarco: "Piloto/MVP da Plataforma de Jogos",
              marcoConcluido: "Piloto/MVP concluído",
              statusConcluido: "Piloto/MVP concluído",
              marcosPlataformaJogos2026: MARCOS_PLATAFORMA_JOGOS_2026,
              statusProjetoPlataformaJogos: STATUS_PROJETO_PLATAFORMA_JOGOS
            },
            camposEntrada: [
              { nome: "marcoAtualPlataformaJogos", rotulo: "Marco/etapa atual do projeto", tipo: "selecao", obrigatorio: true, opcoes: MARCOS_PLATAFORMA_JOGOS_2026 },
              { nome: "statusProjetoPlataformaJogos", rotulo: "Status do projeto", tipo: "selecao", obrigatorio: true, opcoes: STATUS_PROJETO_PLATAFORMA_JOGOS },
              { nome: "descricaoAndamentoPlataformaJogos", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaPlataformaJogos", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "marcoAtual",
            campoPercentualAtingido: null,
            resultadoOficial: "ultima_posicao_trimestral"
          };
        }
        if (Number(rule.indicadorId) === 11) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[10],
            tipoCalculo: "marco_projeto_percentual",
            tipoConsolidacao: "ultima_posicao_trimestral",
            unidadeMedida: "percentual",
            metaAnualValor: 1,
            parametrosCalculo: {
              campoStatus: "marcoAlcancadoTIC",
              campoPercentual: "percentualRealizadoTIC",
              metaTipo: "curva_trimestral_percentual",
              curvaTrimestralPercentual: CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026,
              marcosCapacidadeTIC: CAPACIDADE_TIC_MARCOS,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "marcoAlcancadoTIC", rotulo: "Marco alcançado", tipo: "selecao", obrigatorio: true, opcoes: CAPACIDADE_TIC_MARCOS },
              { nome: "percentualRealizadoTIC", rotulo: "Percentual realizado", tipo: "percentual", obrigatorio: false },
              { nome: "descricaoAndamentoTIC", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaTIC", rotulo: "Evidência", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_trimestral"
          };
        }
        if (Number(rule.indicadorId) === 12) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[11],
            tipoCalculo: "nota_pesquisa_anual",
            tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
            unidadeMedida: "pontos",
            metaAnualValor: 60,
            parametrosCalculo: {
              campoTipoPosicao: "tipoPosicaoClima",
              campoMetaReferencia: "metaReferenciaClima",
              campoNota: "notaClimaApurada",
              campoDataBase: "dataBasePesquisaClima",
              campoFonte: "fonteEvidenciaClima",
              metaTipo: "fixa_anual",
              metaReferencia: 60,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "tipoPosicaoClima", rotulo: "Tipo da posição", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_CLIMA },
              { nome: "metaReferenciaClima", rotulo: "Meta de referência", tipo: "numero", obrigatorio: false },
              { nome: "notaClimaApurada", rotulo: "Nota/média geral apurada", tipo: "numero", obrigatorio: false },
              { nome: "dataBasePesquisaClima", rotulo: "Data-base da pesquisa", tipo: "data", obrigatorio: false },
              { nome: "acoesRealizadasClima", rotulo: "Ações realizadas no período", tipo: "texto", obrigatorio: false },
              { nome: "descricaoAndamentoClima", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "fonteEvidenciaClima", rotulo: "Fonte/evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "notaClimaApurada",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "resultado_pesquisa_ou_ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 5) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[4],
            tipoCalculo: "ggr_formula",
            tipoConsolidacao: "acumulado_por_soma_mensal",
            unidadeMedida: "moeda",
            metaAnualValor: 15600000000,
            parametrosCalculo: {
              campoArrecadacao: "arrecadacaoTotalMes",
              campoPremios: "premiosAPagarMes",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: GGR_META_ACUMULADA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "arrecadacaoTotalMes", rotulo: "Arrecadação total no mês", tipo: "moeda", obrigatorio: true },
              { nome: "premiosAPagarMes", rotulo: "Prêmios a pagar no mês", tipo: "moeda", obrigatorio: true }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ggr_acumulado_por_curva"
          };
        }
        if (Number(rule.indicadorId) === 6) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[5],
            tipoCalculo: "indice_inverso",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.1403,
            parametrosCalculo: {
              campoDespesaPessoal: "despesaPessoalMes",
              campoDespesasAdministrativas: "despesasAdministrativasMes",
              campoReceitasLiquidas: "receitasLiquidasMes",
              campoIeoInformado: "ieoApuradoInformado",
              campoPercentualOficial: "percentualAtingidoOficialInformado",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: IEO_META_ACUMULADA_2026,
              sentidoMeta: "quanto_menor_melhor"
            },
            camposEntrada: [
              { nome: "despesaPessoalMes", rotulo: "Despesa de pessoal", tipo: "moeda", obrigatorio: false },
              { nome: "despesasAdministrativasMes", rotulo: "Despesas administrativas", tipo: "moeda", obrigatorio: false },
              { nome: "receitasLiquidasMes", rotulo: "Receitas líquidas", tipo: "moeda", obrigatorio: false },
              { nome: "ieoApuradoInformado", rotulo: "IEO apurado pela unidade", tipo: "percentual", obrigatorio: false },
              { nome: "percentualAtingidoOficialInformado", rotulo: "% atingido oficial informado", tipo: "percentual", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
        }
        if (Number(rule.indicadorId) === 7) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[6],
            tipoCalculo: "valor_financeiro_acumulado",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "moeda",
            metaAnualValor: 1209000000,
            parametrosCalculo: {
              ...(rule.parametrosCalculo || {}),
              valorAcumuladoCampo: "lucroLiquidoRecorrenteAcumulado",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: LUCRO_LIQUIDO_META_ACUMULADA_2026
            },
            camposEntrada: [{
              nome: "lucroLiquidoRecorrenteAcumulado",
              rotulo: "Lucro líquido recorrente acumulado até a competência",
              tipo: "moeda",
              obrigatorio: true
            }],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
        }
        if (Number(rule.indicadorId) === 16) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[15],
            tipoCalculo: "iniciativas_apoiadas",
            tipoConsolidacao: "iniciativas_acumuladas",
            unidadeMedida: "quantidade",
            metaAnualValor: 2,
            parametrosCalculo: {
              campoNome: "nomeIniciativaSocioambiental",
              campoStatus: "statusIniciativaSocioambiental",
              statusQueConta: "Apoiada/realizada",
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: APOIO_SOCIOAMBIENTAL_CURVA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "nomeIniciativaSocioambiental", rotulo: "Nome da iniciativa", tipo: "texto", obrigatorio: true },
              { nome: "tipoIniciativaSocioambiental", rotulo: "Tipo da iniciativa", tipo: "texto", obrigatorio: false },
              { nome: "statusIniciativaSocioambiental", rotulo: "Status da iniciativa", tipo: "selecao", obrigatorio: true, opcoes: STATUS_INICIATIVA_SOCIOAMBIENTAL },
              { nome: "dataApoioIniciativa", rotulo: "Data de apoio/realização", tipo: "data", obrigatorio: false },
              { nome: "descricaoAndamentoSocioambiental", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaIniciativaSocioambiental", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "iniciativasApoiadasAcumuladas",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "iniciativas_acumuladas_homologadas"
          };
        }
        if (Number(rule.indicadorId) === 17) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[16],
            tipoCalculo: "valor_financeiro_acumulado",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "moeda",
            metaAnualValor: 10400000000,
            parametrosCalculo: {
              valorAcumuladoCampo: "repasseSocialAcumuladoCompetencia",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: REPASSE_SOCIAL_META_ACUMULADA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [{
              nome: "repasseSocialAcumuladoCompetencia",
              rotulo: "Repasse social acumulado até a competência",
              tipo: "moeda",
              obrigatorio: true
            }],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
        }
        if (Number(rule.indicadorId) === 18) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[17],
            tipoCalculo: "plano_acao_por_elementos",
            tipoConsolidacao: "elementos_acumulados",
            unidadeMedida: "quantidade",
            metaAnualValor: 10,
            parametrosCalculo: {
              campoElemento: "elementoRGF",
              campoStatus: "statusAcao",
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026,
              elementosJogoResponsavel: ELEMENTOS_JOGO_RESPONSAVEL,
              statusQueContam: ["Concluída", "Homologada"],
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "elementoRGF", rotulo: "Elemento RGF-WLA atendido", tipo: "selecao", obrigatorio: true, opcoes: ELEMENTOS_JOGO_RESPONSAVEL },
              { nome: "acaoExecutada", rotulo: "Ação executada", tipo: "texto", obrigatorio: true },
              { nome: "descricaoAcao", rotulo: "Descrição da ação", tipo: "texto", obrigatorio: false },
              { nome: "statusAcao", rotulo: "Status da ação", tipo: "selecao", obrigatorio: true, opcoes: STATUS_ACAO_JOGO_RESPONSAVEL },
              { nome: "dataConclusao", rotulo: "Data de conclusão", tipo: "data", obrigatorio: false },
              { nome: "evidenciaAcao", rotulo: "Evidência", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "elementosAtendidosAcumulados",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "elementos_acumulados_homologados"
          };
        }
        if (Number(rule.indicadorId) === 15) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[14],
            tipoCalculo: "cobertura_capacitacao",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.90,
            parametrosCalculo: {
              campoPublicoAlvo: "publicoAlvoElegivelCapacitacao",
              campoCapacitados: "empregadosCapacitadosCapacitacao",
              campoQuantidadeCursos: "quantidadeCursosMinimaCapacitacao",
              campoCursosConsiderados: "cursosConsideradosCapacitacao",
              campoDataBase: "dataBaseApuracaoCapacitacao",
              campoFonte: "fonteEvidenciaCapacitacao",
              metaTipo: "curva_trimestral_quantidade_cursos",
              metaCobertura: 0.90,
              curvaTrimestralCursos: CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "publicoAlvoElegivelCapacitacao", rotulo: "Público-alvo elegível", tipo: "numero", obrigatorio: true },
              { nome: "empregadosCapacitadosCapacitacao", rotulo: "Empregados capacitados no critério do trimestre", tipo: "numero", obrigatorio: true },
              { nome: "quantidadeCursosMinimaCapacitacao", rotulo: "Quantidade mínima de cursos exigida", tipo: "numero", obrigatorio: false },
              { nome: "cursosConsideradosCapacitacao", rotulo: "Curso(s)/trilha considerada", tipo: "texto", obrigatorio: false },
              { nome: "dataBaseApuracaoCapacitacao", rotulo: "Data-base da apuração", tipo: "data", obrigatorio: false },
              { nome: "fonteEvidenciaCapacitacao", rotulo: "Fonte/evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
        }
        if (Number(rule.indicadorId) === 21) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[20],
            tipoCalculo: "cobertura_capacitacao_jogo_responsavel",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.90,
            parametrosCalculo: {
              campoPublicoAlvo: "publicoAlvoElegivelJR",
              campoCapacitados: "empregadosCapacitadosJR",
              campoQuantidadeMinima: "quantidadeMinimaIniciativasJR",
              campoIniciativas: "iniciativasConsideradasJR",
              campoDataBase: "dataBaseApuracaoJR",
              campoFonte: "fonteEvidenciaJR",
              metaTipo: "cobertura_com_quantidade_minima_de_iniciativas",
              metaCobertura: 0.90,
              quantidadeMinimaIniciativasAnual: 2,
              curvaJogoResponsavel2026: JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "publicoAlvoElegivelJR", rotulo: "Público-alvo elegível", tipo: "numero", obrigatorio: true },
              { nome: "empregadosCapacitadosJR", rotulo: "Empregados capacitados no critério do período", tipo: "numero", obrigatorio: true },
              { nome: "quantidadeMinimaIniciativasJR", rotulo: "Quantidade mínima de iniciativas exigida", tipo: "numero", obrigatorio: false },
              { nome: "iniciativasConsideradasJR", rotulo: "Iniciativas consideradas", tipo: "texto", obrigatorio: false },
              { nome: "dataBaseApuracaoJR", rotulo: "Data-base da apuração", tipo: "data", obrigatorio: false },
              { nome: "fonteEvidenciaJR", rotulo: "Fonte/evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 22) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[21],
            tipoCalculo: "participacao_ecossistema_com_cenarios",
            tipoConsolidacao: "ultima_posicao",
            unidadeMedida: "percentual",
            metaAnualValor: 0.10,
            parametrosCalculo: {
              campoCenario: "cenarioApuracaoEcossistema",
              campoNumerador: "arrecadacaoViaEcossistema",
              campoNumeradorLegado: "arrecadacaoEcossistemaMes2026",
              campoDenominador: "arrecadacaoTotal",
              metaTipo: "curva_trimestral_cenario",
              sentidoMeta: "quanto_maior_melhor",
              cenarioOficialResumoExecutivo: "lotex_marketplace",
              cenarios: ECOSSISTEMA_CENARIOS,
              curvasCenarios: ECOSSISTEMA_CURVAS_2026
            },
            camposEntrada: [
              { nome: "cenarioApuracaoEcossistema", rotulo: "Cenário de apuração", tipo: "selecao", obrigatorio: true, opcoes: ECOSSISTEMA_CENARIOS },
              { nome: "arrecadacaoViaEcossistema", rotulo: "Arrecadação via ecossistema no período", tipo: "moeda", obrigatorio: true },
              { nome: "arrecadacaoTotal", rotulo: "Arrecadação total no período", tipo: "moeda", obrigatorio: true },
              { nome: "referencia2025Trimestre", rotulo: "Referência 2025 do trimestre (%)", tipo: "numero", obrigatorio: false, somenteLeitura: true },
              { nome: "metaTrimestral2026", rotulo: "Meta trimestral 2026 (%)", tipo: "numero", obrigatorio: false, somenteLeitura: true }
            ],
            campoResultadoPrincipal: "resultadoCalculado",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 23) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[22],
            tipoCalculo: "incremento_rede_loterica_base_2025",
            tipoConsolidacao: "ultima_posicao",
            unidadeMedida: "percentual",
            metaAnualValor: 0.02,
            parametrosCalculo: {
              campoValor2026: "arrecadacaoRedeLoterica2026",
              campoValor2026Mes: "arrecadacaoRedeLotericaMes2026",
              campoValor2026Acumulado: "arrecadacaoRedeLotericaAcumulada2026",
              campoValor2026PeriodoAtual: "arrecadacaoRedeLoterica2026PeriodoAtual",
              campoBase2025: "arrecadacaoRedeLoterica2025",
              campoBase2025PeriodoEquivalente: "arrecadacaoRedeLoterica2025PeriodoEquivalente",
              campoBase2025Acumulada: "arrecadacaoRedeLoterica2025Acumulada",
              campoBase2025PeriodoAtual: "arrecadacaoRedeLoterica2025PeriodoEquivalente",
              campoNumerador: "arrecadacaoRedeLoterica2026",
              campoNumeradorLegado: "arrecadacaoRedeLotericaMes2026",
              campoNumerador2025: "arrecadacaoRedeLoterica2025",
              campoNumerador2025Legado: "arrecadacaoRedeLotericaMes2025",
              metaTipo: "curva_trimestral_incremento",
              curvaIncrementoTrimestral: REDE_LOTERICA_CURVA_INCREMENTO_2026,
              metaIncrementoAnual: 0.02,
              indiceAnualEquivalente: 1.02,
              sentidoMeta: "quanto_maior_melhor",
              mensagemBaseInsuficiente: "Dados insuficientes: informe a arrecadação da Rede Lotérica em 2025 para o período equivalente.",
              mensagemRealizadoInsuficiente: "Arrecadação da Rede Lotérica 2026 deve ser informada e não pode ser negativa."
            },
            camposEntrada: [
              { nome: "arrecadacaoRedeLoterica2025", rotulo: "Arrecadação da Rede Lotérica em 2025 no período equivalente", tipo: "moeda", obrigatorio: true },
              { nome: "arrecadacaoRedeLoterica2026", rotulo: "Arrecadação da Rede Lotérica em 2026 no período", tipo: "moeda", obrigatorio: true },
              { nome: "metaTrimestral", rotulo: "Meta trimestral de incremento (%)", tipo: "numero", obrigatorio: false, somenteLeitura: true }
            ],
            campoResultadoPrincipal: "incrementoRedeLoterica",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 19) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[18],
            tipoCalculo: "investimento_socioambiental",
            tipoConsolidacao: "valor_acumulado",
            unidadeMedida: "moeda",
            metaAnualValor: 4307900,
            parametrosCalculo: {
              campoNome: "nomeProjetoIncentivoSocioambiental",
              campoTipo: "tipoIncentivoSocioambiental",
              campoStatus: "statusProjetoIncentivoSocioambiental",
              campoValorMes: "valorInvestidoMes",
              campoValorAcumulado: "valorInvestidoAcumuladoCompetencia",
              campoDataInvestimento: "dataInvestimentoSocioambiental",
              campoDescricao: "descricaoAndamentoIncentivoSocioambiental",
              campoEvidencia: "evidenciaIncentivoSocioambiental",
              statusQueConta: "Investimento realizado",
              metaTipo: "curva_trimestral_acumulada",
              lucroLiquidoReferencia: 1305400000,
              percentualMetaAnual: 0.0033,
              curvaTrimestralAcumulada: INCENTIVO_SOCIOAMBIENTAL_CURVA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "nomeProjetoIncentivoSocioambiental", rotulo: "Nome do projeto/iniciativa", tipo: "texto", obrigatorio: true },
              { nome: "tipoIncentivoSocioambiental", rotulo: "Tipo de incentivo/patrocínio", tipo: "texto", obrigatorio: false },
              { nome: "statusProjetoIncentivoSocioambiental", rotulo: "Status do projeto", tipo: "selecao", obrigatorio: true, opcoes: STATUS_INCENTIVO_SOCIOAMBIENTAL },
              { nome: "valorInvestidoMes", rotulo: "Valor investido no mês", tipo: "moeda", obrigatorio: false },
              { nome: "valorInvestidoAcumuladoCompetencia", rotulo: "Valor investido acumulado até a competência", tipo: "moeda", obrigatorio: false },
              { nome: "dataInvestimentoSocioambiental", rotulo: "Data do investimento", tipo: "data", obrigatorio: false },
              { nome: "descricaoAndamentoIncentivoSocioambiental", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaIncentivoSocioambiental", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "valorInvestidoAcumuladoCompetencia",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "valor_acumulado_homologado"
          };
        }
        if (Number(rule.indicadorId) === 20) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[19],
            tipoCalculo: "execucao_acoes_propostas",
            tipoConsolidacao: "acoes_realizadas_acumuladas",
            unidadeMedida: "percentual",
            metaAnualValor: 1,
            parametrosCalculo: {
              campoAcao: "acaoPropostaVisibilidade",
              campoStatus: "statusAcaoVisibilidade",
              campoEtapa: "etapaAtualVisibilidade",
              campoDescricao: "descricaoAndamentoVisibilidade",
              campoDataConclusao: "dataConclusaoVisibilidade",
              campoEvidencia: "evidenciaVisibilidade",
              statusQueConta: "Publicada/realizada",
              totalAcoesPropostas: 2,
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: VISIBILIDADE_REPASSES_CURVA_2026,
              acoesPropostasVisibilidade: ACOES_VISIBILIDADE_REPASSES_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "acaoPropostaVisibilidade", rotulo: "Ação proposta", tipo: "selecao", obrigatorio: true, opcoes: ACOES_VISIBILIDADE_REPASSES_2026 },
              { nome: "statusAcaoVisibilidade", rotulo: "Status da ação", tipo: "selecao", obrigatorio: true, opcoes: STATUS_ACAO_VISIBILIDADE },
              { nome: "etapaAtualVisibilidade", rotulo: "Etapa atual", tipo: "texto", obrigatorio: false },
              { nome: "descricaoAndamentoVisibilidade", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "dataConclusaoVisibilidade", rotulo: "Data de conclusão/publicação", tipo: "data", obrigatorio: false },
              { nome: "evidenciaVisibilidade", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "acoes_realizadas_acumuladas_homologadas"
          };
        }
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
      } : Number(meta.indicadorId) === 1 ? {
        ...meta,
        metaMensal: 0.10,
        fonte: "meta_fixa_ofertas_personalizadas_2026"
      } : Number(meta.indicadorId) === 2 ? {
        ...meta,
        metaMensal: getNpsMetaReferencia(meta.ano, meta.mes),
        fonte: "baseline_meta_anual_nps_2026"
      } : Number(meta.indicadorId) === 4 ? {
        ...meta,
        metaMensal: getAprimoramentoMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_aprimoramento_experiencia_2026"
      } : Number(meta.indicadorId) === 10 ? {
        ...meta,
        metaMensal: null,
        fonte: "marco_anual_plataforma_jogos_2026"
      } : Number(meta.indicadorId) === 11 ? {
        ...meta,
        metaMensal: getCapacidadeTicMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_capacidade_tic_2026"
      } : Number(meta.indicadorId) === 12 ? {
        ...meta,
        metaMensal: 60,
        fonte: "meta_fixa_clima_organizacional_2026"
      } : Number(meta.indicadorId) === 18 ? {
        ...meta,
        metaMensal: getPrincipiosJogoResponsavelMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_principios_jogo_responsavel_2026"
      } : Number(meta.indicadorId) === 16 ? {
        ...meta,
        metaMensal: getApoioSocioambientalMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_apoio_socioambiental_2026"
      } : Number(meta.indicadorId) === 15 ? {
        ...meta,
        metaMensal: getCapacitacaoEmpregadosMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_capacitacao_empregados_2026"
      } : Number(meta.indicadorId) === 21 ? {
        ...meta,
        metaMensal: getJogoResponsavelCapacitacaoMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_jogo_responsavel_capacitacao_2026"
      } : Number(meta.indicadorId) === 22 ? {
        ...meta,
        metaMensal: getEcossistemaMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_ecossistema_lotex_marketplace_2026"
      } : Number(meta.indicadorId) === 23 ? {
        ...meta,
        metaMensal: getRedeLotericaMetaIncrementoTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_incremento_rede_loterica_2026"
      } : Number(meta.indicadorId) === 5 ? {
        ...meta,
        metaMensal: getGgrMetaAcumulada(meta.ano, meta.mes),
        fonte: "curva_acumulada_ggr_2026"
      } : Number(meta.indicadorId) === 6 ? {
        ...meta,
        metaMensal: getIeoMetaAcumulada(meta.ano, meta.mes),
        fonte: "curva_acumulada_ieo_2026"
      } : Number(meta.indicadorId) === 17 ? {
        ...meta,
        metaMensal: getRepasseSocialMetaAcumulada(meta.ano, meta.mes),
        fonte: "curva_acumulada_repasse_social_2026"
      } : Number(meta.indicadorId) === 19 ? {
        ...meta,
        metaMensal: getIncentivoSocioambientalMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_incentivo_socioambiental_2026"
      } : Number(meta.indicadorId) === 20 ? {
        ...meta,
        metaMensal: getVisibilidadeRepassesMetaTrimestral(meta.ano, meta.mes),
        fonte: "curva_trimestral_visibilidade_repasses_2026"
      } : Number(meta.indicadorId) === 9 ? {
        ...meta,
        metaMensal: PIX_QUARTER_TARGETS[Math.ceil(Number(meta.mes) / 3) - 1]
      } : Number(meta.indicadorId) === 7 ? {
        ...meta,
        metaMensal: getLucroLiquidoMetaAcumulada(meta.ano, meta.mes),
        fonte: "curva_lucro_liquido_recorrente_2026"
      } : meta);
    }

    if (key === "pilares" && Array.isArray(value)) {
      return value.map((pillar) => ({
        ...pillar,
        nome: PILLAR_NAMES[Number(pillar.id) - 1] || pillar.nome
      }));
    }

    if (key === "lancamentos" && Array.isArray(value)) {
      return value.map((launch) => normalizarSituacaoLancamento(normalizarCamposMoeda(migrarCampoJogoResponsavelCapacitacaoLegado(migrarCampoVisibilidadeRepassesLegado(migrarCampoIncentivoSocioambientalLegado(migrarCampoApoioSocioambientalLegado(migrarCampoPrincipiosJogoResponsavelLegado(migrarCampoCapacidadeTicLegado(migrarCampoPlataformaJogosLegado(migrarCampoAprimoramentoLegado(migrarCampoCapacitacaoLegado(migrarCampoClimaLegado(migrarCampoNpsLegado(migrarCampoOfertasLegado(migrarCampoRedeLotericaLegado(migrarCampoEcossistemaLegado(migrarCampoRepasseSocialLegado(migrarCampoGgrLegado({
        ...launch,
        pilar: getCanonicalPillar(Number(launch.indicadorId)),
        competencia: launch.competencia || `${launch.ano}-${String(launch.mes).padStart(2, "0")}`,
        trimestre: launch.trimestre || `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`,
        ...(Number(launch.indicadorId) === 9 ? {
          metaMensal: PIX_QUARTER_TARGETS[Math.ceil(Number(launch.mes) / 3) - 1],
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico."
        } : {}),
        ...(Number(launch.indicadorId) === 1 ? {
          metaMensal: 0.10,
          metaAnualDescricao: "≥ 10%"
        } : {}),
        ...(Number(launch.indicadorId) === 2 ? {
          metaMensal: getNpsMetaReferencia(launch.ano, launch.mes),
          metaAnualDescricao: "Meta anual correta: NPS 58"
        } : {}),
        ...(Number(launch.indicadorId) === 4 ? {
          metaMensal: getAprimoramentoMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline."
        } : {}),
        ...(Number(launch.indicadorId) === 10 ? {
          metaMensal: null,
          metaAnualDescricao: "Piloto ou MVP da Plataforma de Jogos"
        } : {}),
        ...(Number(launch.indicadorId) === 11 ? {
          metaMensal: getCapacidadeTicMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026."
        } : {}),
        ...(Number(launch.indicadorId) === 12 ? {
          unidadeApuradora: "GERIN",
          diretoriaResponsavel: "DILOT",
          metaMensal: 60,
          metaAnualDescricao: "Média geral ≥ 60"
        } : {}),
        ...(Number(launch.indicadorId) === 15 ? {
          unidadeApuradora: "GERIN",
          diretoriaResponsavel: "DILOT",
          metaMensal: getCapacitacaoEmpregadosMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "≥ 90%"
        } : {}),
        ...(Number(launch.indicadorId) === 18 ? {
          metaMensal: getPrincipiosJogoResponsavelMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Nível 3 RGF-WLA - Executar ações de melhoria para os 10 elementos."
        } : {}),
        ...(Number(launch.indicadorId) === 16 ? {
          metaMensal: getApoioSocioambientalMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "02 iniciativas apoiadas"
        } : {}),
        ...(Number(launch.indicadorId) === 5 ? {
          metaMensal: getGgrMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "≥ R$ 15,6 bilhões"
        } : {}),
        ...(Number(launch.indicadorId) === 6 ? {
          metaMensal: getIeoMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "≤ 14,03%"
        } : {}),
        ...(Number(launch.indicadorId) === 7 ? {
          metaMensal: getLucroLiquidoMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "R$ 1,209 bilhão"
        } : {}),
        ...(Number(launch.indicadorId) === 17 ? {
          metaMensal: getRepasseSocialMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "≥ R$ 10,4 bilhões"
        } : {}),
        ...(Number(launch.indicadorId) === 19 ? {
          metaMensal: getIncentivoSocioambientalMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "0,33% do Lucro Líquido do ano (R$ 4.307.900,00 estimados)"
        } : {}),
        ...(Number(launch.indicadorId) === 20 ? {
          metaMensal: getVisibilidadeRepassesMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Implantar 100% das ações propostas"
        } : {}),
        ...(Number(launch.indicadorId) === 21 ? {
          metaMensal: getJogoResponsavelCapacitacaoMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "≥ 90% do público-alvo capacitado em pelo menos 2 iniciativas de Jogo Responsável"
        } : {}),
        ...(Number(launch.indicadorId) === 22 ? {
          metaMensal: getEcossistemaMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Ano 2026: ≥ 10% em relação ao exercício de 2025"
        } : {}),
        ...(Number(launch.indicadorId) === 23 ? {
          metaMensal: getRedeLotericaMetaIncrementoTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Meta anual: 2,00% de incremento"
        } : {}),
        ...(Number(launch.indicadorId) === 8 ? {
          unidadeApuradora: "SUCOL",
          diretoriaResponsavel: "DICOT",
          metaMensal: 0.2805,
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais."
        } : {})
      })))))))))))))))))));
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
    await ensureOperationalDataVersion();

    if (cache[key]) {
      return cache[key];
    }

    const validationValue = readValidationCollection(key);
    if (!isPhpBackend() && validationValue !== null) {
      cache[key] = normalizeData(key, validationValue);
      localStorage.setItem(storageKey(key), JSON.stringify(cache[key]));
      localStorage.setItem(STORAGE_MODE_KEY, "validacao_local");
      return cache[key];
    }

    const jsonDbValue = await loadFromJsonDb(key);
    if (jsonDbValue !== null) {
      const localValue = hasLocalData(key) ? readLocal(key) : null;
      cache[key] = normalizeData(key, jsonDbValue);
      preserveLocalOperationalBackup(key, localValue, cache[key]);
      localStorage.setItem(storageKey(key), JSON.stringify(cache[key]));
      localStorage.setItem(STORAGE_MODE_KEY, "php_sqlite_local");
      if (OPERATIONAL_KEYS.includes(key)) {
        localStorage.setItem(jsonDbMigrationKey(key), "php_sqlite_local");
      }
      if (key === "lancamentos") {
        console.log("Lancamentos carregados do backend PHP/SQLite:", cache[key]);
      }
      return cache[key];
    }

    const parsedLocal = await readLocalJsonDb(key);
    if (parsedLocal !== null) {
      if (!(key === "lancamentos" && Array.isArray(parsedLocal) && parsedLocal.length === 0)) {
        cache[key] = normalizeData(key, parsedLocal);
        if (key === "usuarios") {
          localStorage.setItem(storageKey(key), JSON.stringify(cache[key]));
        }
        if (key === "lancamentos") {
          console.log("Lancamentos carregados do armazenamento local:", cache[key]);
        }
        return cache[key];
      }
    }

    const initialData = getBootstrapData(key);
    if (key === "solicitacoesReabertura" && initialData === null) {
      cache[key] = [];
      await saveLocal(key, cache[key]);
      return cache[key];
    }
    if (initialData === null) {
      throw new Error(`Nao foi possivel carregar a semente local ${DATA_FILES[key]}`);
    }

    cache[key] = normalizeData(key, initialData);
    if (key === "lancamentos" && Array.isArray(cache[key]) && cache[key].length > 0) {
      await saveLocal("lancamentos", cache[key]);
      console.log("Lancamentos iniciais carregados e salvos no localStorage:", cache[key]);
      return cache[key];
    }
    if ((key === "homologacoes" || key === "solicitacoesReabertura" || key === "historico") && !hasLocalData(key)) {
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
    const data = Object.fromEntries(entries);
    const lancamentosCompletos = completarLancamentosAusentes(data.lancamentos, data.indicadores, data.metas);
    if (lancamentosCompletos !== data.lancamentos) {
      data.lancamentos = normalizeData("lancamentos", lancamentosCompletos);
      await saveLocal("lancamentos", data.lancamentos);
    }
    return data;
  }

  async function carregarBaseValidacaoCompleta() {
    const data = await loadAll();
    const base = {
      metadata: createValidationMetadata(),
      ...data
    };
    writeValidationBase(base);
    return base;
  }

  async function salvarBaseValidacaoCompleta(base) {
    if (!base || typeof base !== "object") {
      throw new Error("Base de validação inválida.");
    }

    const normalizedBase = {
      metadata: {
        ...createValidationMetadata(),
        ...(base.metadata || {})
      }
    };

    Object.keys(DATA_FILES).forEach((key) => {
      const value = base[key] !== undefined ? base[key] : getBootstrapData(key);
      normalizedBase[key] = normalizeData(key, value || []);
      cache[key] = normalizedBase[key];
      localStorage.setItem(storageKey(key), JSON.stringify(normalizedBase[key]));
      writeLocalJsonDb(key, normalizedBase[key]);
      enqueueJsonDbWrite(key, normalizedBase[key]);
    });

    writeValidationBase(normalizedBase);
    localStorage.setItem(STORAGE_MODE_KEY, "validacao_local");
    return normalizedBase;
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
    if (key === "lancamentos" && Array.isArray(value)) {
      value = value.map(normalizarSituacaoLancamento);
    }
    cache[key] = value;
    syncValidationCollection(key, value);
    if (key === "lancamentos") {
      console.log("Lancamentos salvos:", value);
    }
    return Promise.all([
      writeLocalJsonDb(key, value),
      enqueueJsonDbWrite(key, value)
    ]).then(([, centralSaved]) => centralSaved);
  }

  async function getStorageInfo() {
    const centralAvailable = await checkJsonDb();
    if (!centralAvailable) {
      localStorage.removeItem(CENTRAL_BACKUP_PENDING_KEY);
    }
    return {
      mode: centralAvailable ? "php_sqlite_local" : readValidationBase() ? "validacao_local" : "browser",
      centralAvailable,
      localDatabase: centralAvailable ? "PHP/SQLite" : "IndexedDB/localStorage",
      hasPendingLocalBackup: centralAvailable && localStorage.getItem(CENTRAL_BACKUP_PENDING_KEY) === "true",
      message: centralAvailable
        ? "Backend PHP + SQLite local ativo."
        : readValidationBase()
        ? "Modo validação local ativo. Os dados são salvos automaticamente neste perfil do navegador."
        : "Armazenamento local do navegador ativo. Nao e necessario iniciar servidor ou arquivo .bat."
    };
  }

  async function publicarDadosLocaisNaBaseCentral() {
    if (!(await checkJsonDb())) {
      throw new Error("Publicacao em base JSON foi desativada. Use o SQLite local versionado.");
    }

    const publishedKeys = [];
    for (const key of CENTRAL_OPERATIONAL_KEYS) {
      const source = readLocalBackup(key) || readLocal(key);
      if (source === null) continue;

      const normalized = normalizeData(key, source);
      const published = await enqueueJsonDbWrite(key, normalized);
      if (!published) {
        throw new Error(`Nao foi possivel publicar ${key} na base central.`);
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
    clearLocalJsonDb();
    localStorage.removeItem(OPERATIONAL_DATA_VERSION_KEY);
    localStorage.removeItem(OPERATIONAL_DATA_SIGNATURE_KEY);
    localStorage.removeItem(LEGACY_VERSION_KEY);
    localStorage.removeItem(TEXT_ENCODING_MIGRATION_KEY);
    localStorage.removeItem(CURRENCY_MIGRATION_KEY);
    localStorage.removeItem(CENTRAL_BACKUP_PENDING_KEY);
    localStorage.removeItem(STORAGE_MODE_KEY);
    localStorage.removeItem(VALIDATION_BASE_KEY);
    OPERATIONAL_KEYS.forEach((key) => {
      localStorage.removeItem(jsonDbMigrationKey(key));
      localStorage.removeItem(jsonDbLocalBackupKey(key));
    });
  }

  corrigirEncodingTextosSalvos();
  corrigirMoedasSalvas();

  window.DataStore = {
    STORAGE_KEYS,
    VALIDATION_BASE_KEY,
    loadJson,
    loadAll,
    carregarBaseValidacaoCompleta,
    salvarBaseValidacaoCompleta,
    saveLocal,
    salvarLancamentos,
    carregarLancamentos,
    appendHistory,
    clearLocalData,
    getLancamentos,
    getStorageInfo,
    publicarDadosLocaisNaBaseCentral,
    gerarLancamentosLimpos,
    completarLancamentosAusentes,
    resetarBaseOperacionalGlobal,
    resetarDadosOperacionais,
    resetarLancamentosIniciais,
    corrigirEncodingTextosSalvos,
    corrigirMoedasSalvas
  };
})();

