const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = {
  window: {
    PageModules: {},
    DataStore: {
      resolveMeta(indicatorId, year, month, metas, fallback) {
        const configured = (metas || []).find((item) => (
          Number(item.indicadorId) === Number(indicatorId) &&
          Number(item.ano) === Number(year) &&
          Number(item.mes) === Number(month)
        ));
        return configured?.metaMensal ?? fallback;
      }
    }
  },
  console,
  Intl,
  Date
};
context.window.window = context.window;

for (const file of ["currency.js", "calculations.js", "formulas.js", "launches.js"]) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
  if (file === "calculations.js") context.Calculations = context.window.Calculations;
  if (file === "formulas.js") context.IndicatorFormulas = context.window.IndicatorFormulas;
}

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 20);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 20);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 20);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const internals = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

const fallbackRule = {
  tipoCalculo: "execucao_acoes_propostas",
  parametrosCalculo: {
    totalAcoesPropostas: 4,
    curvaTrimestralAcumulada: {
      "2TRI/2026": { metaAcoesRealizadasAcumuladas: 1 }
    }
  }
};
assert.equal(
  context.window.Calculations.resolverMetaPercentualAcoesPropostas(fallbackRule, { trimestre: "2TRI/2026" }),
  0.25,
  "o fallback deve dividir pela quantidade configurada, sem hardcode de duas ações"
);

const expectedDisplay = new Map([
  [1, "0%"], [2, "0%"], [3, "0%"],
  [4, "50%"], [5, "50%"], [6, "50%"],
  [7, "50%"], [8, "50%"], [9, "50%"],
  [10, "100%"], [11, "100%"], [12, "100%"]
]);

for (const [month, expected] of expectedDisplay) {
  assert.equal(
    internals.formatDisplayMeta(rule, byMonth[month], bootstrap.metas),
    expected,
    `meta visual incorreta no mês ${month}`
  );
}
assert.equal(internals.formatDisplayMeta(rule, byMonth[3], bootstrap.metas), "0%");
assert.equal(internals.formatDisplayMeta(rule, byMonth[4], bootstrap.metas), "50%");
assert.equal(internals.formatDisplayMeta(rule, byMonth[6], bootstrap.metas), "50%");
assert.equal(internals.formatDisplayMeta(rule, byMonth[9], bootstrap.metas), "50%");
assert.equal(internals.formatDisplayMeta(rule, byMonth[10], bootstrap.metas), "100%");
assert.equal(internals.formatDisplayMeta(rule, byMonth[12], bootstrap.metas), "100%");
assert.ok(!Array.from(expectedDisplay.values()).includes("200%"));
assert.ok([4, 5, 6, 7, 8, 9].every((month) => (
  internals.formatDisplayMeta(rule, byMonth[month], bootstrap.metas) !== "100%"
)));

assert.deepEqual(
  bootstrap.metas
    .filter((item) => Number(item.indicadorId) === 20 && Number(item.ano) === 2026)
    .sort((a, b) => Number(a.mes) - Number(b.mes))
    .map((item) => Number(item.metaMensal)),
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2],
  "a curva quantitativa interna deve permanecer 0/1/2"
);

const septemberResult = context.window.IndicatorFormulas.calcularIndicador(
  indicator,
  rule,
  byMonth[9],
  launches.filter((item) => Number(item.mes) <= 9)
);
assert.equal(septemberResult.metaAcoesRealizadasAcumuladas, 1);
assert.equal(septemberResult.acoesRealizadasAcumuladas, 1);
assert.equal(septemberResult.resultadoOficialAnual, 0.5);
assert.equal(septemberResult.percentualAtingidoMensal, 1);
assert.equal(septemberResult.situacao, "Atingido");
assert.equal(byMonth[12].metaMensal, 2);
assert.equal(byMonth[12].resultadoMensal, null);
assert.equal(byMonth[12].percentualAtingido, null);

for (const file of ["calculations.js", "launches.js", "approvals.js", "quarterlyView.js", "indicators.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`
  );
}

const approvalsSource = fs.readFileSync(path.join(root, "assets", "js", "approvals.js"), "utf8");
const quarterlySource = fs.readFileSync(path.join(root, "assets", "js", "quarterlyView.js"), "utf8");
const indicatorsSource = fs.readFileSync(path.join(root, "assets", "js", "indicators.js"), "utf8");
assert.match(approvalsSource, /resolverMetaPercentualAcoesPropostas/);
assert.match(quarterlySource, /resolverMetaPercentualAcoesPropostas/);
assert.match(indicatorsSource, /resolverMetaPercentualAcoesPropostas/);

console.log("indicator20-meta-presentation.test.js: OK");
