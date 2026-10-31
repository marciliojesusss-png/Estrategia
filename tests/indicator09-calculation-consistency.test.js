const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const formulaContext = { window: {}, console, Intl, Date };
formulaContext.window.window = formulaContext.window;

function loadFormulaScript(file) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    formulaContext,
    { filename: file }
  );
}

loadFormulaScript("currency.js");
formulaContext.CurrencyBR = formulaContext.window.CurrencyBR;
loadFormulaScript("formulas.js");

const calculations = {
  formatarPercentual(value) { return String(Number(value) * 100) + "%"; },
  formatarValor(value) { return value === null || value === undefined ? "-" : String(value); },
  resolverMetaPercentualAcoesPropostas() { return null; }
};
const listContext = {
  window: { PageModules: {}, Calculations: calculations },
  Calculations: calculations
};
vm.createContext(listContext);
const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
vm.runInContext(launchesSource, listContext);
const listInternals = listContext.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 9);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 9);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 9);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

function calculate(month, launch = byMonth[month]) {
  return formulaContext.window.IndicatorFormulas.calcularIndicador(
    indicator,
    rule,
    launch,
    launches.filter((item) => Number(item.mes) <= month)
  );
}

function assertClosing(month, expectedResult, expectedPerformance) {
  const calculation = calculate(month);
  const list = listInternals.getLaunchListPerformance(rule, byMonth[month], calculation);
  assert.equal(calculation.resultadoOficialAnual, expectedResult);
  assert.equal(calculation.percentualAtingidoAnual, expectedPerformance);
  assert.equal(calculation.situacao, "Atingido");
  assert.equal(list.resultado, expectedResult);
  assert.equal(list.percentual, expectedPerformance);
}

assertClosing(3, 0.67, 1.1009);
assertClosing(6, 0.6713, 1.0914);
assertClosing(9, 0.6764, 1.0737);
const september = calculate(9);
assert.ok(Math.abs(september.resultadoCalculado - (3538349227.36 / 5230842556.02)) <= 1e-12);
assert.equal(september.pixAcumulado, 3538349227.36);
assert.equal(september.canaisEletronicosAcumulado, 5230842556.02);
assert.equal(byMonth[9].camposEntrada.arrecadacaoPixAcumuladaCompetenciaAproximada, 3538000000);
assert.equal(Object.prototype.hasOwnProperty.call(byMonth[9].camposEntrada, "lacunaComponenteFinanceiroPix"), false);

const august = calculate(8);
const augustList = listInternals.getLaunchListPerformance(rule, byMonth[8], august);
assert.equal(august.situacao, "Em acompanhamento");
assert.equal(augustList.resultado, 0.675274);
assert.equal(augustList.percentual, august.percentualAtingidoAnual);

const decemberFixture = {
  ...byMonth[12],
  camposEntrada: {
    ...byMonth[12].camposEntrada,
    resultadoOficialPix: 0.66,
    percentualAtingidoOficialPix: 1.015
  }
};
const december = calculate(12, decemberFixture);
const decemberList = listInternals.getLaunchListPerformance(rule, decemberFixture, december);
assert.equal(december.resultadoCalculado, null);
assert.equal(december.resultadoOficialAnual, 0.66);
assert.equal(december.percentualAtingidoAnual, 1.015);
assert.equal(december.situacao, "Atingido", "DEZ deve ser tratado como fechamento");
assert.equal(decemberList.resultado, 0.66);
assert.equal(decemberList.percentual, 1.015);

assert.match(
  launchesSource,
  /const tableCalculation = \[[^\]]*"razao_pix"[^\]]*\]\.includes\(regra\?\.tipoCalculo\)/,
  "a listagem deve recalcular razao_pix"
);
assert.match(
  launchesSource,
  /const razaoAcumulada = \["razao_canais_digitais", "razao_pix"\]\.includes/,
  "o payload de salvamento deve persistir o atingimento anual de razao_pix"
);

console.log("indicator09-calculation-consistency.test.js: ok");
