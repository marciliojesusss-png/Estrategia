const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {
  window: {
    __EXECUTIVE_SUMMARY_TEST__: true,
    devicePixelRatio: 1
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

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "executiveSummary.js"), "utf8"),
  context,
  { filename: "executiveSummary.js" }
);

const internals = context.window.ExecutiveSummaryInternals;

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

assertVariation(internals.performanceVariation(1.05, 1), 5, "up");
assertVariation(internals.performanceVariation(0.92, 0.96), -4, "down");
assertVariation(internals.performanceVariation(1, 1), 0, "flat");
assert.equal(internals.performanceVariation(1, null), null);

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
assert.equal(internals.isExpectedDeadlineCycle({ periodicidade: "Trimestral" }, { mes: 7 }), true);
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

console.log("Testes do mapa de desempenho executivo OK");
