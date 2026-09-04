const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {
  URLSearchParams,
  window: {
    __EXECUTIVE_SUMMARY_TEST__: true,
    devicePixelRatio: 1,
    location: { search: "" }
  },
  console,
  Intl,
  Date
};
context.window.window = context.window;
context.Calculations = {
  formatarPercentual(value) {
    if (value === null || value === undefined || value === "") return "-";
    return `${(Number(value) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
};
context.window.Calculations = context.Calculations;
context.Auth = {
  filterIndicatorsByUser(indicators, user) {
    if (user?.perfilCodigo === "unidade_apuradora") {
      return indicators.filter((item) => item.unidadeApuradora === user.unidadeApuradora);
    }
    if (user?.perfilCodigo === "homologador") {
      return indicators.filter((item) => item.diretoriaResponsavel === user.diretoriaResponsavel);
    }
    return indicators;
  }
};
context.window.Auth = context.Auth;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "indicator-periodicity.js"), "utf8"),
  context,
  { filename: "indicator-periodicity.js" }
);
context.window.IndicatorPeriodicity = context.IndicatorPeriodicity;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "executiveSummary.js"), "utf8"),
  context,
  { filename: "executiveSummary.js" }
);

const internals = context.window.ExecutiveSummaryInternals;
context.StrategicResults = {
  officialSituation(result) {
    return result.situacaoAtual || result.situacaoCalculada || (result.lancamento ? "Atingido" : "Sem dados");
  }
};
context.window.StrategicResults = context.StrategicResults;
context.Situations = { normalizarSituacao: (value) => value };
context.window.Situations = context.Situations;

function assertVariation(actual, expectedValue, expectedDirection) {
  assert.equal(actual.direction, expectedDirection);
  assert.ok(Math.abs(actual.value - expectedValue) < 0.000001);
}

assert.equal(internals.performanceToneByPercent(1.05), "verde");
assert.equal(internals.performanceToneByPercent(1), "verde");
assert.equal(internals.performanceToneByPercent(0.99), "amarelo");
assert.equal(internals.performanceToneByPercent(0.81), "amarelo");
assert.equal(internals.performanceToneByPercent(0.8), "vermelho");
assert.equal(internals.performanceToneByPercent(0.5), "vermelho");
assert.equal(internals.performanceToneByPercent(null), "cinza");
assert.equal(internals.performanceToneForResult({ situacaoAtual: "Em acompanhamento", percentualAtingido: 1 }), "amarelo");
assert.equal(internals.performanceToneForResult({ situacaoAtual: "Atingido", percentualAtingido: 1 }), "verde");
assert.equal(internals.summarySituationGroup("Em acompanhamento"), "acompanhamento");
assert.equal(internals.chartSituation({ situacaoAtual: "Em acompanhamento", lancamento: {} }), "Em acompanhamento");
assert.equal(internals.executiveCompetence({ competencia: "Março/2026", competenciaAtual: "Junho/2026" }), "Junho/2026");
assert.equal(internals.measurementReference({ regra: { tipoCalculo: "nota_pesquisa_anual" }, competenciaMedicaoCurta: "Mar/2026" }), "Mar/2026");
assert.equal(internals.measurementReference({ regra: { tipoCalculo: "nota_pesquisa_nps" }, competenciaMedicaoCurta: "Jun/2026" }), "Jun/2026");
assert.equal(internals.measurementReference({ regra: { tipoCalculo: "cobertura_capacitacao" }, competenciaMedicaoCurta: "Mar/2026" }), null);
const climateTotals = internals.aggregate([
  { situacaoAtual: "Em acompanhamento", statusAtual: "Homologado", lancamento: {} },
  { situacaoAtual: "Atingido", statusAtual: "Homologado", lancamento: {} }
]);
assert.equal(climateTotals.total, 2);
assert.equal(climateTotals.achieved, 1);
assert.equal(climateTotals.attention, 0);
assert.equal(climateTotals.tracking, 1);
assert.equal(climateTotals.noData, 0);

assertVariation(internals.performanceVariation(1.05, 1), 5, "up");
assertVariation(internals.performanceVariation(0.92, 0.96), -4, "down");
assertVariation(internals.performanceVariation(1, 1), 0, "flat");
assert.equal(internals.performanceVariation(1, null), null);
const lucroMaio = 114547512.59 / 94438480.16;
const lucroJunho = 108526486.50 / 106104677.05;
assertVariation(internals.performanceVariation(lucroJunho, lucroMaio), (lucroJunho - lucroMaio) * 100, "down");
assert.equal(internals.formatPerformanceVariation(internals.performanceVariation(lucroJunho, lucroMaio)), "▼ -19,0 p.p.");

assert.equal(internals.formatPerformanceVariation(internals.performanceVariation(1.05, 1)), "▲ +5,0 p.p.");
assert.equal(internals.formatPerformanceVariation(internals.performanceVariation(0.92, 0.96)), "▼ -4,0 p.p.");
assert.equal(internals.formatPerformanceVariation(internals.performanceVariation(1, 1)), "→ 0,0 p.p.");
assert.equal(internals.formatPerformanceVariation(null), "—");

assert.equal(internals.performancePercentLabel(1.04), "104% da meta");
assert.equal(internals.performancePercentLabel(null), "Sem percentual");
assert.equal(internals.performancePercentValue(1.04), "104%");
assert.equal(internals.performancePercentValue(null), "Sem percentual");
assert.equal(internals.performanceMapSize({ indicador: { numero: 23 } }, 22), "wide");
assert.equal(internals.performanceMapSize({ indicador: { numero: 22 } }, 21), "normal");
for (const id of [2, 5, 6, 7]) assert.equal(internals.isRvdIndicator({ id }), true);
for (const id of [1, 17]) assert.equal(internals.isRvdIndicator({ id }), false);
assert.match(internals.planBadgesMarkup({ id: 2, plano: "PEI" }), />PEI<.*>RVD</);
assert.doesNotMatch(internals.planBadgesMarkup({ id: 1, plano: "PEI" }), />RVD</);
assert.equal(internals.defaultViewScope({ perfilCodigo: "unidade_apuradora" }), "own");
assert.equal(internals.defaultViewScope({ perfilCodigo: "homologador" }), "own");
assert.equal(internals.defaultViewScope({ perfilCodigo: "administrador" }), "general");
assert.equal(internals.defaultViewScope({ perfilCodigo: "usuario_companhia" }), "general");
assert.equal(internals.indicatorDetailNavigationParams(12, "general").escopo, "geral");
assert.equal(internals.indicatorDetailNavigationParams(12, "own").escopo, "proprio");
assert.equal(internals.indicatorDetailNavigationParams(12, "general").origem, "resumo-executivo");
context.window.location.search = "?escopo=geral";
assert.equal(internals.requestedViewScope({ perfilCodigo: "homologador" }), "general");
context.window.location.search = "";
const scopeData = {
  indicadores: [
    { id: 1, ativo: true, unidadeApuradora: "SUCOL", diretoriaResponsavel: "DIFIR" },
    { id: 2, ativo: true, unidadeApuradora: "GERIN", diretoriaResponsavel: "DICOT" },
    { id: 3, ativo: false, unidadeApuradora: "SUCOL", diretoriaResponsavel: "DIFIR" }
  ],
  lancamentos: [
    { id: "L1", indicadorId: "1" },
    { id: "L2", indicadorId: 2 },
    { id: "L3", indicadorId: 3 }
  ]
};
const unitUser = { perfilCodigo: "unidade_apuradora", unidadeApuradora: "SUCOL" };
const ownCollections = internals.collectionsForViewScope(scopeData, unitUser, "own");
const generalCollections = internals.collectionsForViewScope(scopeData, unitUser, "general");
assert.deepEqual(Array.from(ownCollections.indicators, (item) => item.id), [1]);
assert.deepEqual(Array.from(ownCollections.launches, (item) => item.id), ["L1"]);
assert.deepEqual(Array.from(generalCollections.indicators, (item) => item.id), [1, 2]);
assert.deepEqual(Array.from(generalCollections.launches, (item) => item.id), ["L1", "L2"]);
const homologatorUser = { perfilCodigo: "homologador", diretoriaResponsavel: "DICOT" };
const homologatorCollections = internals.collectionsForViewScope(scopeData, homologatorUser, "own");
assert.deepEqual(Array.from(homologatorCollections.indicators, (item) => item.id), [2]);
assert.deepEqual(Array.from(homologatorCollections.launches, (item) => item.id), ["L2"]);
assert.equal(internals.isExpectedDeadlineCycle({ periodicidade: "Trimestral" }, { mes: 7 }), false);
assert.equal(internals.isExpectedDeadlineCycle({ periodicidade: "Trimestral" }, { mes: 9 }), true);
assert.equal(internals.isOperationalCompetenceRequired("mensal", 5), true);
assert.equal(internals.isOperationalCompetenceRequired("trimestral", 5), false);
assert.equal(internals.isOperationalCompetenceRequired("trimestral", 6), true);
assert.equal(internals.isOperationalCompetenceRequired("semestral", 5), false);
assert.equal(internals.isOperationalCompetenceRequired("semestral", 6), true);
assert.equal(internals.isOperationalCompetenceRequired("anual", 11), false);
assert.equal(internals.isOperationalCompetenceRequired("anual", 12), true);
assert.equal(internals.isExpectedDeadlineCycle({ periodicidade: "Não especificada" }, { mes: 7 }), true);
assert.equal(
  internals.shortIndicatorName({ indicador: "IEO Recorrente (Índice de Eficiência Operacional Recorrente)" }),
  "IEO"
);
assert.equal(
  internals.shortIndicatorName({ indicador: "Gross Gaming Revenue (GGR)" }),
  "GGR"
);
assert.equal(
  internals.shortIndicatorName({ indicador: "Índice de Satisfação de Clientes — NPS" }),
  "NPS"
);
assert.equal(
  internals.nomeIndicadorMapa({ indicador: "Vendas com Meio de Pagamento PIX" }),
  "Vendas Pix"
);
assert.equal(
  internals.nomeIndicadorMapa({ indicador: "Participação da Rede Lotérica nos Negócios da CAIXA Loterias" }),
  "Participação Rede Lotérica"
);
assert.equal(
  internals.nomeIndicadorMapa({ indicador: "Princípios de Jogo Responsável (WLA)" }),
  "Princípios de Jogo Responsável"
);

const executiveSource = fs.readFileSync(path.join(root, "assets", "js", "executiveSummary.js"), "utf8");
const executiveView = fs.readFileSync(path.join(root, "views", "frontend", "resumo-executivo.php"), "utf8");
assert.match(executiveSource, /Pesquisa: \$\{measurement\}/);
assert.match(executiveSource, /Medição: \$\{escapeHtml\(measurement\)\}/);
assert.match(executiveSource, /performanceToneForResult/);
assert.match(executiveView, /executiveSummary\.js\?v=NPS-VIGENCIA-001/);
assert.match(executiveView, /dashboard\.js\?v=NPS-FORMULA-001/);
assert.match(executiveView, /styles\.css\?v=CLIMA-EXECUTIVO-001/);
assert.equal(executiveSource, fs.readFileSync(path.join(root, "public", "assets", "js", "executiveSummary.js"), "utf8"));
assert.equal(
  fs.readFileSync(path.join(root, "assets", "css", "styles.css"), "utf8"),
  fs.readFileSync(path.join(root, "public", "assets", "css", "styles.css"), "utf8")
);

console.log("Testes do mapa de desempenho executivo OK");
