const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const formulasSource = fs.readFileSync(path.join(root, "assets", "js", "formulas.js"), "utf8");
const dataStoreSource = fs.readFileSync(path.join(root, "assets", "js", "dataStore.js"), "utf8");
const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 22);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 22);
const metas = bootstrap.metas.filter((item) => Number(item.indicadorId) === 22).sort((a, b) => a.mes - b.mes);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 22).sort((a, b) => a.mes - b.mes);

global.CurrencyBR = require(path.join(root, "assets", "js", "currency.js"));
const formulas = require(path.join(root, "assets", "js", "formulas.js"));

function closeTo(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deveria ser aproximadamente ${expected}`);
}

assert.match(formulasSource, /metaReferencia:\s*metaTecnica2026/);
assert.doesNotMatch(formulasSource, /metaReferencia:\s*hasDocument\s*\?\s*values\.metaDocumental/);
assert.match(dataStoreSource, /function getEcossistemaMetaCompetencia\(ano, mes\)\s*\{\s*return getEcossistemaMetaTecnica\(ano, mes\);\s*\}/);

assert.equal(indicator.tipoCalculo, "participacao_ecossistema_lotex");
assert.equal(indicator.tipoConsolidacao, "ultima_posicao_acumulada");
assert.equal(indicator.periodicidade, "Mensal");
assert.equal(rule.tipoCalculo, "participacao_ecossistema_lotex");
assert.equal(rule.metaAnualValor, null);
assert.deepEqual(rule.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.equal(rule.parametrosCalculo.cenarioOficial, "lotex");
assert.equal(rule.parametrosCalculo.cenarioOficialResumoExecutivo, "lotex");
assert.equal(rule.parametrosCalculo.marketplaceAplicaAoCalculo, false);
assert.equal(rule.parametrosCalculo.permiteAcompanhamentoMensal, true);
assert.equal(rule.exigirHomologacaoTransacionalVersaoAtual, true);
assert.equal(rule.parametrosCalculo.historicoRevisao.aplicaAoCalculo, false);
assert.equal(metas.length, 12);
assert.deepEqual(metas.slice(3).map((item) => item.id), [241, 242, 243, 244, 245, 246, 247, 248, 249]);
assert.equal(new Set(bootstrap.metas.map((item) => item.id)).size, bootstrap.metas.length, "IDs de metas devem ser únicos");
assert.equal(launches.length, 12);

const expected2025 = [
  [1683348694.70, 18372000.00], [3825271538.60, 41002000.00],
  [5504494123.70, 49752400.00], [7311446900.40, 64680800.00],
  [9239173439.20, 77936800.00], [11569679632.60, 89935200.00],
  [13555540052.00, 105266400.00], [15436581916.40, 119416800.00],
  [17998386148.80, 133276716.00], [20122961323.00, 148573820.75],
  [21913607953.15, 162745531.00], [26612476457.00, 173831435.50]
];
const expected2026 = [
  [2030288935.15, 13719322.25], [3984905576.50, 26620128.00],
  [5966912490.55, 39819048.75], [8003703396.75, 51968448.25],
  [10133231872.35, 63966773.50], [12191958306.55, 74144913.25],
  [14157139768.80, 87677530.50], [16122321231.05, 101554152.00]
];

launches.forEach((launch, index) => {
  const result = formulas.calcularIndicador(indicator, rule, launch, launches.slice(0, index + 1));
  assert.equal(result.erro, undefined, `Competência ${launch.competencia} não deveria falhar: ${result.mensagem}`);
  closeTo(result.referenciaLotex2025, expected2025[index][1] / expected2025[index][0]);
  closeTo(result.fatorMetaVigente, launch.mes <= 7 ? 1.10 : 1.01);
  closeTo(result.metaTecnica2026, (expected2025[index][1] / expected2025[index][0]) * (launch.mes <= 7 ? 1.10 : 1.01));
  closeTo(metas[index].metaMensal, result.metaTecnica2026);
  assert.equal(result.cenarioApuracaoEcossistema, "lotex");
  assert.equal(result.marketplaceAplicaAoCalculo, false);
  assert.equal(result.resultadoOficialAnual, null, "Resultado anual não pode duplicar a posição mensal");
  if (index < 8) closeTo(result.resultadoTecnicoLotex, expected2026[index][1] / expected2026[index][0]);
});
assert.deepEqual(launches.map((item) => item.status), [
  "Em preenchimento", "Em preenchimento", "Em preenchimento",
  "Em preenchimento", "Em preenchimento", "Em preenchimento",
  "Em preenchimento", "Em preenchimento", "Em preenchimento",
  "Não iniciado", "Não iniciado", "Não iniciado"
]);

assert.equal(launches[6].camposEntrada.fatorMetaVigente, undefined, "O fator é derivado, não persistido artificialmente no bootstrap");
assert.equal(formulas.calcularIndicador(indicator, rule, launches[6], []).fatorMetaVigente, 1.10);
assert.equal(formulas.calcularIndicador(indicator, rule, launches[7], []).fatorMetaVigente, 1.01);

const january = formulas.calcularIndicador(indicator, rule, launches[0], []);
const januaryWithDifferentMarketplace = formulas.calcularIndicador(indicator, rule, {
  ...launches[0],
  camposEntrada: { ...launches[0].camposEntrada, arrEcoMarketplace2026: 999999999999.99 }
}, []);
closeTo(january.resultadoTecnicoLotex, januaryWithDifferentMarketplace.resultadoTecnicoLotex);
closeTo(january.atingimentoTecnicoLotex, januaryWithDifferentMarketplace.atingimentoTecnicoLotex);

const march = formulas.calcularIndicador(indicator, rule, launches[2], []);
closeTo(march.metaReferencia, 0.009942355967711213);
assert.equal(march.metaOficialDocumental, 0.0099);
closeTo(march.resultadoTecnicoLotex, 0.006673308652181973);
assert.equal(march.resultadoOficialDocumental, 0.0067);
assert.equal(march.percentualAtingidoOficialDocumental, 0.6712);
assert.equal(march.situacao, "Abaixo da meta");
const june = formulas.calcularIndicador(indicator, rule, launches[5], []);
closeTo(june.metaReferencia, 0.008550687930999193);
assert.equal(june.metaOficialDocumental, 0.0086);
closeTo(june.resultadoTecnicoLotex, 0.006081460532076002);
assert.equal(june.resultadoOficialDocumental, 0.0061);
assert.equal(june.percentualAtingidoOficialDocumental, 0.7112);
const september = formulas.calcularIndicador(indicator, rule, launches[8], []);
closeTo(september.metaReferencia, 0.007478975172947646);
assert.equal(september.metaOficialDocumental, 0.0075);
assert.equal(september.resultadoTecnicoLotex, null);
assert.equal(september.resultadoOficialDocumental, 0.006);
assert.equal(september.percentualAtingidoOficialDocumental, 0.8);
assert.equal(september.situacao, "Abaixo da meta");
const december = formulas.calcularIndicador(indicator, rule, launches[11], []);
assert.equal(december.resultadoMensal, null);
assert.equal(december.percentualAtingidoMensal, null);
assert.equal(december.situacao, null);

const legacyCombined = formulas.calcularIndicador(indicator, {
  indicadorId: 22,
  tipoCalculo: "participacao_ecossistema_com_cenarios",
  unidadeMedida: "percentual",
  parametrosCalculo: { cenarioOficialResumoExecutivo: "lotex" },
  camposEntrada: []
}, {
  ano: 2026,
  mes: 3,
  camposEntrada: { cenarioApuracaoEcossistema: "lotex_marketplace", arrecadacaoViaEcossistema: 242284531.14, arrecadacaoTotal: 5966912490.55 }
}, []);
assert.equal(legacyCombined.erro, true);

const context = { window: {}, console, URLSearchParams, Intl, Date };
context.window.window = context.window;
context.window.IndicatorFormulas = formulas;
context.IndicatorFormulas = formulas;
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "dashboard.js"), "utf8"), context, { filename: "dashboard.js" });
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "quarterly.js"), "utf8"), context, { filename: "quarterly.js" });

const officialLaunches = [launches[2], launches[5], launches[8]].map((item) => ({ ...item, status: "Homologado" }));
const withoutTransactionalGovernance = context.window.StrategicResults.calcularDashboard({ indicadores: [indicator], regras: [rule], lancamentos: officialLaunches }).resultadosOficiais[0];
assert.equal(withoutTransactionalGovernance.possuiPosicaoOficial, false);
assert.equal(withoutTransactionalGovernance.lancamento, null);
const governance = officialLaunches.map((item) => ({ lancamentoId: item.id, versao: item.versaoAtual || 1 }));
const dashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator], regras: [rule], lancamentos: officialLaunches, governancaHomologacaoAtual: governance
}).resultadosOficiais[0];
assert.equal(dashboard.lancamento.mes, 9);
assert.equal(dashboard.meta, 0.0075);
assert.equal(dashboard.resultado, 0.006);
assert.equal(dashboard.percentualAtingido, 0.8);
assert.equal(context.window.StrategicResults.officialSituation(dashboard), "Abaixo da meta");

const quarters = context.window.QuarterlyConsolidation.consolidarAno(indicator, rule, officialLaunches, 2026);
assert.deepEqual(Array.from(quarters, (item) => item.metaTrimestral), [0.0099, 0.0086, 0.0075, 0.0066]);
assert.deepEqual(Array.from(quarters.slice(0, 3), (item) => item.resultadoTrimestral), [0.0067, 0.0061, 0.006]);
assert.deepEqual(Array.from(quarters.slice(0, 3), (item) => item.desempenhoTrimestral), [0.6712, 0.7112, 0.8]);
assert.equal(quarters[3].resultadoTrimestral, null);

console.log("Indicador 22: código, vigências, Lotex exclusivo, dashboard e visão trimestral validados.");

