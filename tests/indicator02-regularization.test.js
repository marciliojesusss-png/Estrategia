const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const data = loadBootstrapData(root);
const indicator = data.indicadores.find((item) => Number(item.id) === 2);
const rule = data.regrasIndicadores.find((item) => Number(item.indicadorId) === 2);
const launches = data.lancamentos.filter((item) => Number(item.indicadorId) === 2 && Number(item.ano) === 2026);
const historicalSnapshot = JSON.stringify(launches);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const targets = data.metas.filter((item) => Number(item.indicadorId) === 2 && Number(item.ano) === 2026).sort((a, b) => Number(a.mes) - Number(b.mes));

const context = {
  window: {}, console, Intl, Date, URLSearchParams,
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout, clearTimeout
};
context.window.window = context.window;
context.window.CAIXA_LOTERIAS_BOOTSTRAP_DATA = data;
for (const file of ["currency.js", "indicator-periodicity.js", "calculations.js", "formulas.js", "quarterly.js", "dashboard.js", "dataStore.js", "launches.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  for (const name of ["CurrencyBR", "IndicatorPeriodicity", "Calculations", "IndicatorFormulas", "QuarterlyConsolidation", "StrategicResults", "DataStore"]) {
    if (context.window[name]) context[name] = context.window[name];
    if (context[name]) context.window[name] = context[name];
  }
}

const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const periodicity = context.window.IndicatorPeriodicity;
const closeTo = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const calculate = (month) => formulas.calcularIndicador(indicator, rule, byMonth[month], launches.filter((item) => Number(item.mes) <= month));

assert.equal(indicator.plano, "PEI");
assert.equal(indicator.pilar, "Cliente no Centro");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.unidadeMedida, "pontos");
assert.equal(rule.tipoCalculo, "nota_pesquisa_nps");
assert.equal(rule.tipoConsolidacao, "resultado_pesquisa_ou_ultima_posicao");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(Object.values(rule.parametrosCalculo.referenciasPorCompetencia), [55, 55, 55, 58, 58, 60, 60, 60, 60, 60, 60, 60]);
assert.deepEqual(Array.from(rule.parametrosCalculo.contextoMetodologicoMeta58.aplicaCompetencias), ["2026-04", "2026-05"]);
assert.equal(rule.exigirHomologacaoTransacionalVersaoAtual, true);
assert.match(rule.parametrosCalculo.aprovacaoMeta60.documento, /0050\/2026/);
assert.equal(rule.parametrosCalculo.aprovacaoMeta60.data, "2026-08-06");
assert.deepEqual(targets.map((item) => item.metaMensal), [55, 55, 55, 58, 58, 60, 60, 60, 60, 60, 60, 60]);

assert.equal(periodicity.isTrackingMonth(indicator, 10), true, "OUT deve continuar operacionalmente permitido");
assert.equal(periodicity.isExpectedMonth(indicator, 10), true, "a periodicidade mensal do cadastro não pode bloquear OUT");

const march = calculate(3);
assert.equal(march.resultadoTecnicoNPS, 55);
assert.equal(march.metaTecnicaNPS, 55);
assert.equal(march.percentualAtingidoTecnicoNPS, 1);
assert.equal(march.resultadoDocumentalNPS, 55);
assert.equal(march.percentualAtingidoOficialNPS, 1);
assert.equal(march.situacao, "Atingido");
assert.equal(byMonth[3].camposEntrada.percentualPromotores, undefined);
for (const month of [1, 2, 3]) {
  assert.equal(byMonth[month].status, "Em preenchimento");
  assert.equal(byMonth[month].camposEntrada.homologadoDiretoriaHistorico, true);
  assert.equal(byMonth[month].camposEntrada.fonteHomologacaoHistorica, "Planilha 16.10");
}
for (const month of [4, 5]) {
  const tracking = calculate(month);
  assert.equal(byMonth[month].metaMensal, 58);
  assert.equal(byMonth[month].camposEntrada.metaReferenciaCompetenciaNPS, 58);
  assert.equal(tracking.resultadoTecnicoNPS, 55);
  closeTo(tracking.percentualAtingidoTecnicoNPS, 55 / 58);
  assert.equal(tracking.situacao, "Abaixo da meta");
}

const june = calculate(6);
closeTo(june.resultadoTecnicoNPS, 59.2);
assert.equal(june.metaTecnicaNPS, 60);
closeTo(june.percentualAtingidoTecnicoNPS, 59.2 / 60);
assert.equal(june.metaDocumentalNPS, 60);
assert.equal(june.resultadoDocumentalNPS, 59.2);
assert.equal(june.percentualAtingidoOficialNPS, 0.9866);
assert.equal(june.situacaoTecnicaNPS, "Abaixo da meta");
assert.equal(june.situacaoDocumentalNPS, "Abaixo da meta");
assert.equal(june.totalRespondentesNPS, 48003);
assert.equal(june.quantidadePromotoresNPS, 34863);
assert.equal(june.quantidadeNeutrosNPS, 6694);
assert.equal(june.quantidadeDetratoresNPS, 6446);
const juneListPerformance = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__.getLaunchListPerformance(rule, byMonth[6], june);
assert.equal(juneListPerformance.resultado, 59.2);
assert.equal(juneListPerformance.percentual, 0.9866);

const september = calculate(9);
assert.equal(september.tipoPosicaoNPS, "ultima_pesquisa_disponivel");
assert.equal(september.metaTecnicaNPS, 60);
assert.equal(september.resultadoDocumentalNPS, 59.2);
assert.equal(september.percentualAtingidoOficialNPS, 0.9866);
assert.equal(september.situacao, "Abaixo da meta");
for (const field of ["percentualPromotores", "percentualDetratores", "totalRespondentesNPS", "quantidadePromotoresNPS", "quantidadeNeutrosNPS", "quantidadeDetratoresNPS", "dataBasePesquisaNPS"]) {
  assert.equal(byMonth[9].camposEntrada[field], undefined, `SET não pode inventar ${field}`);
}
assert.match(byMonth[9].camposEntrada.observacaoArea, /OUT\/2026/);
for (const month of [7, 8]) {
  const tracking = calculate(month);
  assert.equal(byMonth[month].status, "Em preenchimento");
  assert.equal(byMonth[month].camposEntrada.tipoPosicaoNPS, "ultima_pesquisa_disponivel");
  assert.equal(tracking.resultadoTecnicoNPS, 59.2);
  closeTo(tracking.percentualAtingidoTecnicoNPS, 59.2 / 60);
}
assert.equal(byMonth[10].resultadoMensal, null);
assert.equal(byMonth[10].camposEntrada.resultadoDocumentalNPS, undefined);
assert.deepEqual([10, 11, 12].map((month) => byMonth[month].resultadoMensal), [null, null, null]);

const quarters = [1, 2, 3, 4].map((number) => quarterly.consolidarTrimestre(indicator, rule, launches, `${number}TRI/2026`));
assert.deepEqual(quarters.map((item) => item.metaTrimestral), [55, 60, 60, 60]);
assert.deepEqual(quarters.map((item) => item.resultadoTrimestral), [55, 59.2, 59.2, null]);
assert.deepEqual(quarters.map((item) => item.desempenhoTrimestral), [1, 0.9866, 0.9866, null]);
assert.equal(quarters[1].metaTecnicaTrimestral, 60);
closeTo(quarters[1].desempenhoTecnicoTrimestral, 59.2 / 60);
assert.equal(quarters[1].situacaoTecnicaTrimestral, "Abaixo da meta");
assert.equal(quarters[1].situacaoTrimestral, "Abaixo da meta");
assert.equal(quarters[2].semNovaPesquisaNps, true);
assert.equal(quarters[2].proximaApuracaoNps, "2026-10");
assert.match(quarters[2].fonteDocumentalTrimestral, /0078\/2026/);

const dashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator], regras: [rule], lancamentos: launches,
  homologacoes: [], historico: [], governancaHomologacaoAtual: []
}).resultadosOficiais[0];
assert.equal(dashboard.possuiPosicaoOficial, false, "status legado isolado não pode oficializar o NPS");
assert.equal(dashboard.resultado, null);
const indicator2LaunchIds = new Set(launches.map((item) => String(item.id)));
assert.equal((data.homologacoes || []).filter((item) => indicator2LaunchIds.has(String(item.lancamentoId))).length, 0);
assert.equal((data.evidencias || []).filter((item) => indicator2LaunchIds.has(String(item.lancamentoId))).length, 0);

const sqlCompatible = context.window.DataStore.resolveNpsLaunchState({
  ano: 2026, mes: 6, camposEntrada: { metaReferenciaCompetenciaNPS: 58 }
}, 58);
assert.equal(sqlCompatible.metaTecnicaNps, 60);
assert.equal(sqlCompatible.metaJsonNps, 58);
assert.equal(sqlCompatible.metaPersistidaNps, 58);
assert.equal(sqlCompatible.divergenciaMetaNps, true);

const aprilWithoutOfficialTarget = context.window.DataStore.resolveNpsLaunchState({
  ano: 2026, mes: 4, camposEntrada: { metaReferenciaCompetenciaNPS: 58 }
}, 58);
assert.equal(aprilWithoutOfficialTarget.metaTecnicaNps, 58);
assert.equal(aprilWithoutOfficialTarget.metaPersistidaNps, 58);
assert.equal(aprilWithoutOfficialTarget.divergenciaMetaNps, false);

const details = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__.indicator02CalculatedDetails(june, byMonth[6]);
assert.ok(details.some(([label, value]) => label.includes("Resultado técnico") && value.includes("pontos")));
assert.ok(details.some(([label, value]) => label.includes("Atingimento técnico") && value.includes("%")));
assert.ok(details.some(([label]) => label.includes("Fonte documental")));

const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
const npsLayout = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__.npsInterfaceLayout;
const expectedPrimaryFields = [
  "tipoPosicaoNPS",
  "metaReferenciaCompetenciaNPS",
  "percentualPromotores",
  "percentualDetratores",
  "npsApurado",
  "resultadoDocumentalNPS",
  "dataBasePesquisaNPS",
  "fontePesquisaNPS"
];
for (const type of ["Baseline", "ultima_pesquisa_disponivel", "Pesquisa oficial"]) {
  const layout = npsLayout(rule, { tipoPosicaoNPS: type });
  assert.deepEqual(Array.from(layout.primaryFields, (field) => field.nome), expectedPrimaryFields);
  assert.equal(layout.primaryFields.length, 8);
  assert.ok(layout.primaryFields.find((field) => field.nome === "tipoPosicaoNPS").opcoes.length > 0);
}

const emptyLayout = npsLayout(rule, { percentualPromotores: "", percentualDetratores: "" });
assert.equal(emptyLayout.calculatedNps, "");
assert.equal(emptyLayout.primaryFields.find((field) => field.nome === "percentualPromotores").placeholder, "Não informado");
assert.equal(emptyLayout.primaryFields.find((field) => field.nome === "percentualDetratores").placeholder, "Não informado");
assert.equal(emptyLayout.primaryFields.find((field) => field.nome === "npsApurado").placeholder, "—");
assert.equal(npsLayout(rule, { percentualPromotores: 0.7263, percentualDetratores: 0.1343 }).calculatedNps, 59.2);
assert.equal(npsLayout(rule, { percentualPromotores: "72,63", percentualDetratores: "13,43" }).calculatedNps, 59.2);

const memoryNames = Array.from(emptyLayout.memoryFields, (field) => field.nome);
for (const field of [
  "totalRespondentesNPS",
  "quantidadePromotoresNPS",
  "quantidadeNeutrosNPS",
  "quantidadeDetratoresNPS",
  "metaDocumentalNPS",
  "percentualAtingidoOficialNPS"
]) {
  assert.ok(memoryNames.includes(field), `${field} deve permanecer na memória de cálculo`);
}
assert.equal(september.origemNps, "ultima_pesquisa_documental");
assert.equal(september.resultadoOficialNPS, 59.2);
assert.match(launchesSource, /<details id="npsCalculationMemory"/);
assert.match(launchesSource, /<summary>Memória de cálculo<\/summary>/);
assert.match(launchesSource, /input\.dataset\.displayOnly === "true"/);

const approvalsSource = fs.readFileSync(path.join(root, "assets", "js", "approvals.js"), "utf8");
for (const label of [
  "Tipo da posição",
  "Meta da competência",
  "% Promotores",
  "% Detratores",
  "NPS calculado",
  "Resultado documental NPS",
  "Data-base da pesquisa",
  "Fonte documental"
]) {
  assert.ok(approvalsSource.includes(`["${label}"`), `${label} deve aparecer na conferência de homologação`);
}
assert.match(approvalsSource, /origemNps === "componentes_formula"/);
assert.match(fs.readFileSync(path.join(root, "views", "frontend", "lancamentos.php"), "utf8"), /INDICADOR06-CONFERENCIA-001/);
assert.match(fs.readFileSync(path.join(root, "views", "frontend", "homologacao.php"), "utf8"), /INDICADOR02-NPS-SIMPLIFICADO-001/);
assert.equal(JSON.stringify(launches), historicalSnapshot, "a organização visual não pode mutar lançamentos históricos");

console.log("Indicador 02: regra, histórico e interface NPS simplificada validados.");
