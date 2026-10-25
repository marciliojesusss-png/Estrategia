const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date, URLSearchParams };
context.window.window = context.window;
for (const file of ["currency.js", "indicator-periodicity.js", "calculations.js", "formulas.js", "quarterly.js", "dashboard.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  context.CurrencyBR = context.window.CurrencyBR;
  context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
  context.Calculations = context.window.Calculations;
  context.IndicatorFormulas = context.window.IndicatorFormulas;
}

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 23);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 23);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 23);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const formulas = context.window.IndicatorFormulas;

assert.equal(indicator.indicador, "Participação da Rede Lotérica nos Negócios da CAIXA Loterias");
assert.equal(indicator.tipoCalculo, "crescimento_rede_loterica_base_2025");
assert.equal(indicator.tipoConsolidacao, "acumulado_periodo_equivalente");
assert.equal(rule.tipoCalculo, "crescimento_rede_loterica_base_2025");
assert.equal(rule.tipoConsolidacao, "acumulado_periodo_equivalente");
assert.equal(rule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(
  bootstrap.metas.filter((item) => Number(item.indicadorId) === 23).sort((a, b) => a.mes - b.mes).map((item) => item.metaMensal),
  [1.005, 1.005, 1.005, 1.01, 1.01, 1.01, 1.015, 1.015, 1.015, 1.02, 1.02, 1.02]
);

function calculate(month) {
  return formulas.calcularIndicador(indicator, rule, byMonth[month], launches.filter((item) => Number(item.mes) <= month));
}

const monthlyExpected = [
  { month: 1, base: 1345843615.20, current: 1483427750.90, accumulatedBase: 1345843615.20, accumulatedCurrent: 1483427750.90, result: 1.102228917346800517, performance: 1.096745191389851261, situation: "Atingido", resultDisplay: "110,22%", performanceDisplay: "109,67%" },
  { month: 2, base: 1691450489.90, current: 1439543898.10, accumulatedBase: 3037294105.10, accumulatedCurrent: 2922971649.00, result: 0.962360426042365086, performance: 0.957572563226233916, situation: "Abaixo da meta", resultDisplay: "96,24%", performanceDisplay: "95,76%" },
  { month: 3, base: 1337016995.60, current: 1476242711.30, accumulatedBase: 4374311100.70, accumulatedCurrent: 4399214360.30, result: 1.005693070069025235, performance: 1.000689621959229090, situation: "Atingido", resultDisplay: "100,57%", performanceDisplay: "100,07%" },
  { month: 4, base: 1435038130.70, current: 1520757013.20, accumulatedBase: 5809349231.40, accumulatedCurrent: 5919971373.50, result: 1.019042088484210662, performance: 1.008952562855654121, situation: "Atingido", resultDisplay: "101,90%", performanceDisplay: "100,90%" },
  { month: 5, base: 1527837662.30, current: 1600397124.10, accumulatedBase: 7337186893.70, accumulatedCurrent: 7520368497.60, result: 1.024966190251646309, performance: 1.014818010150144860, situation: "Atingido", resultDisplay: "102,50%", performanceDisplay: "101,48%" },
  { month: 6, base: 1862564945.90, current: 1573326249.20, accumulatedBase: 9199751839.60, accumulatedCurrent: 9093694746.80, result: 0.988471744167763192, performance: 0.978684895215607121, situation: "Abaixo da meta", resultDisplay: "98,85%", performanceDisplay: "97,87%" },
  { month: 7, base: 1552114336.40, current: 1464165326.50, accumulatedBase: 10751866176.00, accumulatedCurrent: 10557860073.30, result: 0.981956053067973007, performance: 0.967444387259086706, situation: "Abaixo da meta", resultDisplay: "98,20%", performanceDisplay: "96,74%" },
  { month: 8, base: 1468593628.90, current: 1516647865.60, accumulatedBase: 12220459804.90, accumulatedCurrent: 12074507938.90, result: 0.988056761502420872, performance: 0.973454937440808741, situation: "Abaixo da meta", resultDisplay: "98,81%", performanceDisplay: "97,35%" }
];

for (const expected of monthlyExpected) {
  const launch = byMonth[expected.month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente, expected.base);
  assert.equal(launch.camposEntrada.arrecadacaoRedeLotericaMes2026, expected.current);
  const calculated = calculate(expected.month);
  assert.ok(Math.abs(calculated.baseReferencia2025Periodo - expected.accumulatedBase) < 0.005);
  assert.ok(Math.abs(calculated.realizado2026Periodo - expected.accumulatedCurrent) < 0.005);
  assert.ok(Math.abs(calculated.indiceEmRelacaoA2025 - expected.result) < 1e-12);
  assert.ok(Math.abs(calculated.percentualAtingidoTecnico - expected.performance) < 1e-12);
  assert.equal(calculated.situacao, expected.situation);
  assert.equal(context.Calculations.formatarPercentual(calculated.indiceEmRelacaoA2025, 2, 2), expected.resultDisplay);
  assert.equal(context.Calculations.formatarPercentual(calculated.percentualAtingidoTecnico, 2, 2), expected.performanceDisplay);
}

const march = calculate(3);
assert.equal(march.metaIndiceCrescimento, 1.005);
assert.ok(Math.abs(march.indiceEmRelacaoA2025 - 1.005693070069025235) < 1e-12);
assert.ok(Math.abs(march.percentualAtingidoTecnico - 1.000689621959229090) < 1e-12);
assert.equal(march.percentualAtingidoOficialRedeLoterica, 1.1386);
assert.equal(march.resultadoDocumentalRedeLoterica, 0.0057);
assert.equal(march.situacao, "Atingido");
assert.equal(context.Calculations.formatarPercentual(march.percentualAtingidoTecnico, 2, 2), "100,07%");
assert.equal(context.Calculations.formatarPercentual(march.percentualAtingidoOficialRedeLoterica, 2, 2), "113,86%");
assert.notEqual(context.Calculations.formatarPercentual(march.percentualAtingidoOficialRedeLoterica, 2, 2), "114,00%");

const june = calculate(6);
assert.ok(Math.abs(june.indiceEmRelacaoA2025 - 0.988471744167763192) < 1e-12);
assert.ok(Math.abs(june.percentualAtingidoTecnico - 0.978684895215607121) < 1e-12);
assert.equal(june.resultadoDocumentalRedeLoterica, 0.988);
assert.equal(june.percentualAtingidoOficialRedeLoterica, 0.9784);
assert.equal(june.situacao, "Abaixo da meta");
assert.equal(context.Calculations.formatarPercentual(june.indiceEmRelacaoA2025, 2, 2), "98,85%");
assert.equal(context.Calculations.formatarPercentual(june.percentualAtingidoTecnico, 2, 2), "97,87%");
assert.equal(context.Calculations.formatarPercentual(june.resultadoDocumentalRedeLoterica, 2, 2), "98,80%");
assert.equal(context.Calculations.formatarPercentual(june.percentualAtingidoOficialRedeLoterica, 2, 2), "97,84%");

const september = calculate(9);
assert.equal(september.indiceEmRelacaoA2025, 0.9816);
assert.ok(Math.abs(september.percentualAtingidoTecnico - 0.9670935960591134) < 1e-12);
assert.equal(september.percentualAtingidoOficialRedeLoterica, 0.9671);
assert.equal(september.situacao, "Abaixo da meta");

const december = calculate(12);
assert.equal(december.metaIndiceCrescimento, 1.02, "1.02 já é índice e nunca pode virar 2.02");
assert.equal(december.resultadoMensal, null);
assert.equal(december.percentualAtingidoMensal, null);
assert.equal(december.situacao, null);

const synthetic = formulas.calcularIndicador(indicator, rule, {
  ano: 2026, mes: 1, metaReferencia: 1.005,
  camposEntrada: { arrecadacaoRedeLoterica2025Acumulada: 100, arrecadacaoRedeLotericaAcumulada2026: 101 }
}, []);
assert.equal(synthetic.indiceEmRelacaoA2025, 1.01);
assert.ok(Math.abs(synthetic.percentualAtingidoTecnico - (1.01 / 1.005)) < 1e-12);

const monthly = [
  { ano: 2026, mes: 1, metaReferencia: 1.005, camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 100, arrecadacaoRedeLotericaMes2026: 102 } },
  { ano: 2026, mes: 2, metaReferencia: 1.005, camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 200, arrecadacaoRedeLotericaMes2026: 199 } },
  { ano: 2026, mes: 3, metaReferencia: 1.005, camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 300, arrecadacaoRedeLotericaMes2026: 304 } }
];
const accumulated = formulas.calcularIndicador(indicator, rule, monthly[2], monthly);
assert.equal(accumulated.indiceEmRelacaoA2025, 605 / 600);
assert.notEqual(accumulated.indiceEmRelacaoA2025, (1.02 + 0.995 + (304 / 300)) / 3);

const q1 = context.window.QuarterlyConsolidation.consolidarTrimestre(indicator, rule, launches, "1TRI/2026");
assert.equal(q1.statusTrimestre, "Parcial");
assert.equal(q1.mesesEsperados, 1);
assert.ok(Math.abs(q1.resultadoTecnicoTrimestral - 1.005693070069025235) < 1e-12);
assert.equal(q1.resultadoDocumentalTrimestral, 0.0057);
assert.equal(q1.desempenhoOficialDocumentalTrimestral, 1.1386);

for (const month of [9, 10, 11, 12]) {
  assert.equal(byMonth[month].camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente, undefined);
  assert.equal(byMonth[month].camposEntrada.arrecadacaoRedeLotericaMes2026, undefined);
}
for (const value of [3000000000, 3017079000]) {
  assert.equal(JSON.stringify(launches).includes(String(value)), false);
}
assert.equal(JSON.stringify(launches).includes("metaTrimestral"), false);

const dashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: bootstrap.indicadores,
  lancamentos: bootstrap.lancamentos,
  regras: bootstrap.regrasIndicadores
}).resultadosOficiais.find((item) => Number(item.indicador.id) === 23);
assert.equal(dashboard.possuiPosicaoOficial, false);
assert.equal(dashboard.resultado, null);

for (const source of ["dataStore.js", "formulas.js", "launches.js", "quarterly.js", "quarterlyView.js", "dashboard.js", "indicators.js"]) {
  const content = fs.readFileSync(path.join(root, "assets", "js", source), "utf8");
  assert.doesNotMatch(content, /incremento_rede_loterica_base_2025/);
}
assert.equal((bootstrap.homologacoes || []).filter((item) => [265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276].includes(Number(item.lancamentoId))).length, 0);
assert.equal((bootstrap.evidencias || []).filter((item) => [265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276].includes(Number(item.lancamentoId))).length, 0);

console.log("indicator23-regularization.test.js: OK");
