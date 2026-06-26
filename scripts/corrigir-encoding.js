const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const EXTENSIONS = new Set([".html", ".js", ".json", ".css", ".md", ".bat"]);
const SKIP_DIRS = new Set([".git", "dist", "node_modules"]);
const SKIP_FILES = new Set([
  path.resolve(__filename),
  path.join(ROOT, "assets", "js", "dataStore.js")
]);

const CP1252_REVERSE = new Map([
  ["€", 0x80], ["‚", 0x82], ["ƒ", 0x83], ["„", 0x84], ["…", 0x85],
  ["†", 0x86], ["‡", 0x87], ["ˆ", 0x88], ["‰", 0x89], ["Š", 0x8a],
  ["‹", 0x8b], ["Œ", 0x8c], ["Ž", 0x8e], ["‘", 0x91], ["’", 0x92],
  ["“", 0x93], ["”", 0x94], ["•", 0x95], ["–", 0x96], ["—", 0x97],
  ["˜", 0x98], ["™", 0x99], ["š", 0x9a], ["›", 0x9b], ["œ", 0x9c],
  ["ž", 0x9e], ["Ÿ", 0x9f]
]);

const TEXT_REPLACEMENTS = [
  ["Efici?ncia", "Eficiência"],
  ["Inova?o", "Inovação"],
  ["Atua?o", "Atuação"],
  ["per?odo", "período"],
  ["Per?odo", "Período"],
  ["apura?o", "apuração"],
  ["Apura?o", "Apuração"],
  ["situa?o", "situação"],
  ["Situa?o", "Situação"],
  ["N?o", "Não"],
  ["n?o", "não"],
  ["m?s", "mês"],
  ["M?s", "Mês"],
  ["Mar?o", "Março"],
  ["Estrat?gico", "Estratégico"],
  ["Neg?cios", "Negócios"],
  ["Relat?rio", "Relatório"],
  ["relat?rio", "relatório"],
  ["A?o", "Ação"],
  ["a?o", "ação"],
  ["Conclu?da", "Concluída"],
  ["conclu?das", "concluídas"],
  ["l?quido", "líquido"],
  ["Arrecada?o", "Arrecadação"],
  ["eletr?nicos", "eletrônicos"],
  ["lot?ricos", "lotéricos"],
  ["execu?o", "execução"],
  ["Evid?ncia", "Evidência"],
  ["N?mero", "Número"],
  ["M?dia", "Média"],
  ["Refer?ncia", "Referência"],
  ["Gest?o", "Gestão"]
];

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
  "ggrRealizadoMes", "lucroLiquidoRecorrenteAcumulado",
  "arrecadacaoCanaisEletronicosMes", "arrecadacaoTotalProdutosLoteriasMes",
  "arrecadacaoPixMes", "arrecadacaoTotalCanaisEletronicosMes",
  "repasseSocialAcumulado", "valorInvestidoAcumulado", "lucroLiquidoBase",
  "arrecadacaoEcossistemaMes", "arrecadacaoTotalMes",
  "arrecadacaoEcossistema2025", "arrecadacaoTotal2025",
  "arrecadacaoRedeLotericaMes2026", "arrecadacaoRedeLotericaMes2025"
]);

function cp1252ToUtf8(value) {
  const bytes = [];
  for (const character of value) {
    const code = character.codePointAt(0);
    if (CP1252_REVERSE.has(character)) {
      bytes.push(CP1252_REVERSE.get(character));
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

function mojibakeScore(value) {
  const markers = value.match(/[ÃÂâ�]/g) || [];
  return markers.length;
}

function repairToken(value) {
  let repaired = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const decoded = cp1252ToUtf8(repaired);
    if (!decoded || mojibakeScore(decoded) >= mojibakeScore(repaired)) break;
    repaired = decoded;
  }
  return repaired;
}

function repairText(value) {
  let repaired = value.replace(/[^ \t\r\n]+/gu, (token) => (
    mojibakeScore(token) ? repairToken(token) : token
  ));
  TEXT_REPLACEMENTS.forEach(([broken, correct]) => {
    repaired = repaired.replaceAll(broken, correct);
  });
  return repaired;
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return [];
      return listFiles(path.join(directory, entry.name));
    }
    const filePath = path.join(directory, entry.name);
    if (SKIP_FILES.has(path.resolve(filePath))) return [];
    return EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [filePath] : [];
  });
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

function repairFiles() {
  const changed = [];
  listFiles(ROOT).forEach((filePath) => {
    const original = fs.readFileSync(filePath, "utf8");
    const repaired = repairText(original);
    if (repaired !== original) {
      writeUtf8(filePath, repaired);
      changed.push(path.relative(ROOT, filePath));
    }
  });
  return changed;
}

function standardizeHtml() {
  fs.readdirSync(ROOT)
    .filter((name) => name.endsWith(".html"))
    .forEach((name) => {
      const filePath = path.join(ROOT, name);
      const original = fs.readFileSync(filePath, "utf8");
      const updated = original
        .replace(/<meta charset="utf-8">/gi, '<meta charset="UTF-8">')
        .replace(/(assets\/(?:css|js)\/[^"'?]+)\?v=[^"']+/g, "$1?v=RESPONSAVEIS-001");
      if (updated !== original) writeUtf8(filePath, updated);
    });
}

function updateCanonicalData() {
  const indicatorPath = path.join(ROOT, "data", "indicadores.json");
  const indicators = JSON.parse(fs.readFileSync(indicatorPath, "utf8"));
  indicators.forEach((indicator) => {
    indicator.indicador = INDICATOR_NAMES[indicator.id - 1] || indicator.indicador;
    const pillar = PILLAR_NAMES.find((name) => repairText(indicator.pilar) === name);
    if (pillar) indicator.pilar = pillar;
    if (indicator.periodicidade === "Não especificado") {
      indicator.periodicidade = "Não especificada";
    }
  });
  indicators[3].metaAnualDescricao = "Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline.";
  indicators[11].metaAnualDescricao = "Média geral ≥ 60";
  indicators[16].metaAnualDescricao = "≥ R$ 10,4 bilhões";
  Object.assign(indicators[7], {
    unidadeApuradora: "SUCOL",
    diretoriaResponsavel: "DICOT",
    metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais.",
    metrica: "(Arrecadação total nos canais eletrônicos) / (Arrecadação total dos produtos de loterias)",
    tipoCalculo: "razao_canais_digitais",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[8], {
    metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico.",
    metrica: "(Arrecadação com o meio de pagamento PIX no ano corrente) / (Arrecadação total nos canais eletrônicos no ano corrente)",
    tipoCalculo: "razao_pix",
    unidadeMedida: "percentual"
  });
  writeUtf8(indicatorPath, `${JSON.stringify(indicators, null, 2)}\n`);

  const pillarPath = path.join(ROOT, "data", "pilares.json");
  const pillars = JSON.parse(fs.readFileSync(pillarPath, "utf8"));
  pillars.forEach((pillar) => {
    pillar.nome = PILLAR_NAMES[pillar.id - 1] || pillar.nome;
  });
  writeUtf8(pillarPath, `${JSON.stringify(pillars, null, 2)}\n`);

  const rulesPath = path.join(ROOT, "data", "regras-indicadores.json");
  const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  rules.forEach((rule) => {
    rule.nome = INDICATOR_NAMES[rule.indicadorId - 1] || rule.nome;
    rule.camposEntrada = (rule.camposEntrada || []).map((field) => (
      CURRENCY_FIELD_NAMES.has(field.nome) ? { ...field, tipo: "moeda" } : field
    ));
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 8), {
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
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 9), {
    tipoCalculo: "razao_pix",
    tipoConsolidacao: "razao_acumulada_no_ano",
    unidadeMedida: "percentual",
    metaAnualValor: 0.65,
    parametrosCalculo: {
      campoNumerador: "arrecadacaoPixMes",
      campoDenominador: "arrecadacaoTotalCanaisEletronicosMes",
      metasTrimestrais: {
        "1TRI/2026": 0.61, "2TRI/2026": 0.62, "3TRI/2026": 0.63, "4TRI/2026": 0.65
      },
      arredondamentoOficialCasasPercentuais: 0
    },
    camposEntrada: [
      { nome: "arrecadacaoPixMes", rotulo: "Arrecadação com PIX no mês", tipo: "moeda", obrigatorio: true },
      { nome: "arrecadacaoTotalCanaisEletronicosMes", rotulo: "Arrecadação total nos canais eletrônicos no mês", tipo: "moeda", obrigatorio: false }
    ],
    resultadoOficial: "razao_trimestral_arredondada_informe"
  });
  writeUtf8(rulesPath, `${JSON.stringify(rules, null, 2)}\n`);

  const launchesPath = path.join(ROOT, "data", "lancamentos.json");
  const launches = JSON.parse(fs.readFileSync(launchesPath, "utf8"));
  const indicatorById = Object.fromEntries(indicators.map((indicator) => [indicator.id, indicator]));
  launches.forEach((launch) => {
    const indicator = indicatorById[launch.indicadorId];
    launch.competencia = launch.competencia || `${launch.ano}-${String(launch.mes).padStart(2, "0")}`;
    launch.trimestre = launch.trimestre || `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
    if (indicator) {
      launch.plano = indicator.plano;
      launch.pilar = indicator.pilar;
      launch.unidadeApuradora = indicator.unidadeApuradora;
      launch.diretoriaResponsavel = indicator.diretoriaResponsavel;
    }
    if (Number(launch.indicadorId) === 9) {
      launch.metaMensal = PIX_QUARTER_TARGETS[Math.ceil(Number(launch.mes) / 3) - 1];
      launch.metaAnualDescricao = indicators[8].metaAnualDescricao;
    }
    if (Number(launch.indicadorId) === 8) {
      launch.unidadeApuradora = "SUCOL";
      launch.diretoriaResponsavel = "DICOT";
      launch.metaMensal = 0.2805;
      launch.metaAnualDescricao = indicators[7].metaAnualDescricao;
    }
  });
  writeUtf8(launchesPath, `${JSON.stringify(launches, null, 2)}\n`);

  const goalsPath = path.join(ROOT, "data", "metas-mensais.json");
  const goals = JSON.parse(fs.readFileSync(goalsPath, "utf8"));
  goals.forEach((goal) => {
    if (Number(goal.indicadorId) === 9) {
      goal.metaMensal = PIX_QUARTER_TARGETS[Math.ceil(Number(goal.mes) / 3) - 1];
      goal.fonte = "curva_oficial_pix_2026";
    }
    if (Number(goal.indicadorId) === 8) {
      goal.metaMensal = 0.2805;
      goal.fonte = "meta_fixa_canais_digitais_2026";
    }
  });
  writeUtf8(goalsPath, `${JSON.stringify(goals, null, 2)}\n`);
}

const changed = repairFiles();
standardizeHtml();
updateCanonicalData();
console.log(`Encoding corrigido em ${changed.length} arquivo(s).`);
