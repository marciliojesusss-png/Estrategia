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
  if (context.IndicatorPeriodicity) context.window.IndicatorPeriodicity = context.IndicatorPeriodicity;
  else context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
  context.Calculations = context.window.Calculations;
  context.IndicatorFormulas = context.window.IndicatorFormulas;
}

const data = loadBootstrapData(root);
const indicator = data.indicadores.find((item) => Number(item.id) === 1);
const rule = data.regrasIndicadores.find((item) => Number(item.indicadorId) === 1);
const launches = data.lancamentos.filter((item) => Number(item.indicadorId) === 1);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const formulas = context.window.IndicatorFormulas;
const periodicity = context.window.IndicatorPeriodicity;

assert.equal(rule.metaAnualValor, 0.10);
assert.equal(rule.tipoCalculo, "percentual_direto");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_trimestral");
assert.equal(rule.parametrosCalculo.validarNumeradorAteDenominador, false);
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.equal(periodicity.isTrackingMonth(indicator, 1), true);
assert.equal(periodicity.isExpectedMonth(indicator, 1), false);
assert.equal(periodicity.isExpectedMonth(indicator, 3), true);

function calculate(month) {
  return formulas.calcularIndicador(indicator, rule, byMonth[month], launches.filter((item) => Number(item.mes) <= month));
}

const march = calculate(3);
assert.ok(Math.abs(march.resultadoTecnicoOfertasPersonalizadas - 1241587 / 2773599) < 1e-14);
assert.ok(Math.abs(march.percentualAtingidoTecnicoOfertasPersonalizadas - (1241587 / 2773599) / 0.10) < 1e-13);
assert.equal(march.resultadoDocumentalOfertasPersonalizadas, 0.4476);
assert.equal(march.percentualAtingidoOficialOfertasPersonalizadas, 4.4764);
assert.equal(context.window.Calculations.formatarPercentual(march.resultadoOficialAnual, 2, 2), "44,76%");
assert.equal(context.window.Calculations.formatarPercentual(march.percentualAtingidoAnual, 2, 2), "447,64%");
assert.notEqual(march.resultadoOficialAnual, 0.2302, "a posição histórica mensal não pode substituir o fechamento oficial");

const june = calculate(6);
assert.ok(Math.abs(june.resultadoTecnicoOfertasPersonalizadas - 2371981 / 3018556) < 1e-14);
assert.equal(june.resultadoDocumentalOfertasPersonalizadas, 0.7858);
assert.equal(june.percentualAtingidoOficialOfertasPersonalizadas, 7.858);
assert.equal(context.window.Calculations.formatarPercentual(june.resultadoOficialAnual, 2, 2), "78,58%");
assert.equal(context.window.Calculations.formatarPercentual(june.percentualAtingidoAnual, 1, 1), "785,8%");

const september = calculate(9);
assert.equal(september.resultadoTecnicoOfertasPersonalizadas, null);
assert.equal(september.percentualAtingidoTecnicoOfertasPersonalizadas, null);
assert.equal(september.resultadoOficialAnual, 0.8379);
assert.equal(september.percentualAtingidoAnual, 8.379);
assert.equal(september.situacao, "Atingido");
assert.equal(byMonth[9].camposEntrada.baseClientesAtivosCompetencia, undefined);
assert.equal(byMonth[9].camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia, undefined);

const december = calculate(12);
assert.equal(december.resultadoOficialAnual, null);
assert.equal(december.percentualAtingidoAnual, null);
assert.equal(december.situacao, null);

const january = calculate(1);
assert.equal(january.tipoPosicaoOfertasPersonalizadas, "acompanhamento");
assert.equal(january.situacao, "Em acompanhamento");

const quarters = [1, 2, 3, 4].map((number) => (
  context.window.QuarterlyConsolidation.consolidarTrimestre(indicator, rule, launches, `${number}TRI/2026`)
));
assert.deepEqual(quarters.map((item) => item.metaTrimestral), [0.1, 0.1, 0.1, 0.1]);
assert.deepEqual(quarters.map((item) => item.resultadoTrimestral), [0.4476, 0.7858, 0.8379, null]);
assert.deepEqual(quarters.map((item) => item.desempenhoTrimestral), [4.4764, 7.858, 8.379, null]);
assert.match(quarters[0].fonteDocumentalTrimestral, /0029\/2026/);
assert.match(quarters[1].fonteDocumentalTrimestral, /0056\/2026/);
assert.match(quarters[2].fonteDocumentalTrimestral, /0078\/2026/);

const dashboardWithoutTransaction = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator], lancamentos: launches, regras: [rule], homologacoes: [], historico: []
}).resultadosOficiais[0];
assert.equal(dashboardWithoutTransaction.possuiPosicaoOficial, false);
assert.equal(dashboardWithoutTransaction.resultado, null);

const dashboardWithCurrentTransaction = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  lancamentos: launches,
  regras: [rule],
  governancaHomologacaoAtual: [{ lancamentoId: 3, versao: 1 }]
}).resultadosOficiais[0];
assert.equal(dashboardWithCurrentTransaction.possuiPosicaoOficial, true);
assert.equal(dashboardWithCurrentTransaction.resultado, 0.4476);
assert.equal(dashboardWithCurrentTransaction.percentualAtingido, 4.4764);
assert.equal(context.window.StrategicResults.hasCurrentTransactionalHomologation(
  { id: 3, versaoAtual: 2 },
  { governancaHomologacaoAtual: [{ lancamentoId: 3, versao: 1 }] }
), false, "evento de versão anterior não pode promover a versão corrente");

assert.equal(data.homologacoes.some((item) => [3, 6, 9].includes(Number(item.lancamentoId))), false);
assert.equal(data.homologacoes.filter((item) => [1, 2].includes(Number(item.lancamentoId))).length, 2);

console.log("Indicador 01: modelagem, documentos, trimestral e governança validados.");
