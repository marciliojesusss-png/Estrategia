const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const data = loadBootstrapData(root);
const indicator = data.indicadores.find((item) => Number(item.id) === 3);
const rule = data.regrasIndicadores.find((item) => Number(item.indicadorId) === 3);
const launches = data.lancamentos.filter((item) => Number(item.indicadorId) === 3 && Number(item.ano) === 2026);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const targets = data.metas.filter((item) => Number(item.indicadorId) === 3 && Number(item.ano) === 2026).sort((a, b) => Number(a.mes) - Number(b.mes));

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
const closeTo = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const calculate = (month) => formulas.calcularIndicador(indicator, rule, byMonth[month], launches.filter((item) => Number(item.mes) <= month));

assert.equal(indicator.indicador, "Índice de Clientes Ativos em Canais Digitais");
assert.equal(indicator.plano, "PN");
assert.equal(indicator.pilar, "Cliente no Centro");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.periodicidade, "Mensal");
assert.equal(rule.tipoCalculo, "crescimento_media_mensal");
assert.equal(rule.tipoConsolidacao, "ultima_posicao");
assert.equal(rule.metaAnualValor, 0.28);
assert.equal(rule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.equal(rule.exigeEvidencia, true);
assert.equal(rule.exigeEvidenciaNosFechamentos, true);
assert.equal(rule.exigirHomologacaoTransacionalVersaoAtual, true);
assert.equal(rule.parametrosCalculo.permiteAcompanhamentoMensal, true);

const periodicity = context.window.IndicatorPeriodicity;
const launchInternals = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;
const currentEvidenceByMonth = { 3: true, 6: true };
const canSubmit = (month, hasCurrentEvidence = currentEvidenceByMonth[month] === true) =>
  !periodicity.requiresEvidence(indicator, rule, byMonth[month]) || hasCurrentEvidence;
for (const month of [1, 2, 4, 5, 7, 8, 10, 11]) {
  assert.equal(periodicity.requiresEvidence(indicator, rule, byMonth[month]), false, `mês ${month} é acompanhamento`);
  assert.equal(canSubmit(month, false), true, `mês ${month} não pode ser bloqueado apenas por falta de evidência`);
  assert.match(launchInternals.evidenceRequirementLabel(rule, byMonth[month], indicator), /Opcional/);
}
for (const month of [3, 6, 9, 12]) {
  assert.equal(periodicity.requiresEvidence(indicator, rule, byMonth[month]), true, `mês ${month} é fechamento`);
  assert.equal(canSubmit(month, false), false, `mês ${month} sem evidência atual deve ser bloqueado`);
  assert.equal(canSubmit(month, true), true, `mês ${month} com evidência atual deve estar apto`);
  assert.match(launchInternals.evidenceRequirementLabel(rule, byMonth[month], indicator), /obrigatório.*fechamento trimestral/);
}
for (const indicatorId of [1, 2, 8, 23]) {
  const regressionIndicator = data.indicadores.find((item) => Number(item.id) === indicatorId);
  const regressionRule = data.regrasIndicadores.find((item) => Number(item.indicadorId) === indicatorId);
  assert.equal(regressionRule.exigeEvidenciaNosFechamentos, undefined, `Indicador ${indicatorId} não deve receber a nova regra do Indicador 03`);
  assert.equal(periodicity.requiresEvidence(regressionIndicator, regressionRule, { ano: 2026, mes: 1 }), regressionRule.exigeEvidencia === true);
}

assert.equal(targets.length, 12);
assert.deepEqual(targets.map((item) => item.metaMensal), Array(12).fill(0.28));
assert.deepEqual(Object.values(rule.parametrosCalculo.metasCanonicasPorCompetencia), Array(12).fill(0.28));

const monthlyExpected = { 1: 0.8853, 2: 0.7615, 3: 0.7441, 4: 0.7046, 5: 0.7309, 6: 0.6216, 7: 0.5813, 8: 0.5534, 9: 0.527 };
for (const [month, expected] of Object.entries(monthlyExpected)) {
  const result = calculate(Number(month));
  assert.equal(result.resultadoOficialAnual, expected, `resultado documental incorreto no mês ${month}`);
  assert.equal(result.situacao, "Atingido");
}
for (const month of [10, 11, 12]) {
  const result = calculate(month);
  assert.equal(result.resultadoOficialAnual, null);
  assert.equal(result.percentualAtingidoAnual, null);
  assert.equal(byMonth[month].resultadoOficialAnual, null);
}

for (const month of [1, 2, 4, 5, 7, 8]) {
  assert.equal(byMonth[month].camposEntrada.qmaatu, undefined, `mês ${month} não pode ter QMAATU fictício`);
  assert.equal(byMonth[month].camposEntrada.qmaant, undefined, `mês ${month} não pode ter QMAANT fictício`);
  assert.equal(calculate(month).resultadoTecnicoClientesAtivos, null);
}

const march = calculate(3);
closeTo(march.resultadoTecnicoClientesAtivos, 2982989 / 1710374 - 1);
closeTo(march.percentualAtingidoTecnicoClientesAtivos, (2982989 / 1710374 - 1) / 0.28);
assert.equal(march.resultadoDocumentalClientesAtivos, 0.7441);
assert.equal(march.percentualAtingidoOficialClientesAtivos, 2.6573);
assert.equal(context.window.Calculations.formatarPercentual(march.percentualAtingidoOficialClientesAtivos, 2, 2), "265,73%");
assert.equal(context.window.Calculations.formatarPercentual(0.7441 / 0.28, 2, 2), "265,75%");

const june = calculate(6);
closeTo(june.resultadoTecnicoClientesAtivos, 3040125 / 1874815 - 1);
assert.equal(june.resultadoDocumentalClientesAtivos, 0.6216);
assert.equal(june.percentualAtingidoOficialClientesAtivos, 2.22);

const september = calculate(9);
closeTo(september.resultadoTecnicoClientesAtivos, 3079049 / 2016416 - 1);
assert.equal(september.resultadoDocumentalClientesAtivos, 0.527);
assert.equal(september.percentualAtingidoOficialClientesAtivos, 1.8821);

const incomplete = formulas.calcularIndicador(indicator, rule, { ...byMonth[3], camposEntrada: { qmaatu: 10 } }, []);
assert.equal(incomplete.erro, true);
const zeroBase = formulas.calcularIndicador(indicator, rule, { ...byMonth[3], camposEntrada: { qmaatu: 10, qmaant: 0 } }, []);
assert.equal(zeroBase.erro, true);
const documentaryWithoutSource = formulas.calcularIndicador(indicator, rule, { ...byMonth[4], camposEntrada: { resultadoDocumentalClientesAtivos: 0.5 } }, []);
assert.equal(documentaryWithoutSource.erro, true);

const quarters = [1, 2, 3, 4].map((number) => quarterly.consolidarTrimestre(
  indicator, rule, launches, `${number}TRI/2026`, { governancaHomologacaoAtual: [] }
));
assert.deepEqual(quarters.map((item) => item.metaTrimestral), [0.28, 0.28, 0.28, 0.28]);
assert.deepEqual(quarters.map((item) => item.resultadoDocumentalTrimestral), [0.7441, 0.6216, 0.527, null]);
assert.deepEqual(quarters.map((item) => item.desempenhoOficialDocumentalTrimestral), [2.6573, 2.22, 1.8821, null]);
assert.deepEqual(quarters.map((item) => item.statusTrimestre), ["Documental", "Documental", "Documental", "Sem dados"]);
assert.deepEqual(quarters.map((item) => item.possuiPosicaoOficialSistema), [false, false, false, false]);
assert.deepEqual(quarters.map((item) => item.possuiPosicaoDocumental), [true, true, true, false]);
assert.match(quarters[0].fonteDocumentalTrimestral, /0029\/2026/);
assert.match(quarters[1].fonteDocumentalTrimestral, /0056\/2026/);
assert.match(quarters[2].fonteDocumentalTrimestral, /0078\/2026/);

const dashboardLegacyOnly = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator], regras: [rule], lancamentos: launches,
  homologacoes: data.homologacoes, historico: data.historico, governancaHomologacaoAtual: []
}).resultadosOficiais[0];
assert.equal(dashboardLegacyOnly.possuiPosicaoOficial, false);
assert.equal(dashboardLegacyOnly.resultado, null);

const intermediateGovernanceOnly = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator], regras: [rule],
  lancamentos: launches.map((item) => Number(item.mes) === 2
    ? { ...item, status: "Homologado" }
    : { ...item, status: Number(item.mes) === 3 ? "Retificado" : item.status }),
  governancaHomologacaoAtual: [{ lancamentoId: byMonth[2].id, versao: byMonth[2].versaoAtual }]
}).resultadosOficiais[0];
assert.equal(intermediateGovernanceOnly.possuiPosicaoOficial, false, "FEV não pode substituir o fechamento de MAR");

const dashboardCurrent = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator], regras: [rule], lancamentos: launches,
  governancaHomologacaoAtual: [{ lancamentoId: 27, versao: 1 }]
}).resultadosOficiais[0];
assert.equal(dashboardCurrent.possuiPosicaoOficial, true);
assert.equal(dashboardCurrent.resultado, 0.7441);
assert.equal(dashboardCurrent.percentualAtingido, 2.6573);

const normalizedRule = context.window.DataStore.normalizeData("regrasIndicadores", [{
  indicadorId: 3,
  tipoCalculo: "crescimento_media_mensal",
  parametrosCalculo: { qmaatuCampo: "qmaatu", qmaantCampo: "qmaant", metaCrescimento: 0.28 },
  camposEntrada: []
}])[0];
assert.equal(normalizedRule.tipoConsolidacao, "ultima_posicao");
assert.equal(normalizedRule.exigirHomologacaoTransacionalVersaoAtual, true);
assert.deepEqual(Object.values(normalizedRule.parametrosCalculo.metasCanonicasPorCompetencia), Array(12).fill(0.28));
const untouchedSqlLaunch = context.window.DataStore.normalizeData("lancamentos", [{
  id: 28, indicadorId: 3, ano: 2026, mes: 4, metaMensal: null, camposEntrada: {}, status: "Não iniciado"
}])[0];
assert.equal(untouchedSqlLaunch.metaMensal, null, "DataStore não deve mascarar a meta persistida ausente do SQL");

const serviceSource = fs.readFileSync(path.join(root, "app", "services", "LancamentoService.php"), "utf8");
assert.match(serviceSource, /ClientesAtivosDigitaisCalculator::calculate/);
assert.match(serviceSource, /clientesAtivosDigitaisTarget/);
assert.match(serviceSource, /requiresEvidence\(\$indicator,\$x\).*hasCurrent\(\$id\)/s);
assert.match(serviceSource, /CompetenciaPeriodicidade::requiresEvidence\(\$indicator,\$rule,\$launch\)/);

const baseDataServiceSource = fs.readFileSync(path.join(root, "app", "services", "BaseDadosService.php"), "utf8");
assert.match(baseDataServiceSource, /CompetenciaPeriodicidade::requiresEvidence\(\$indicators\[\$indicatorId\], \$rule, \$item\)/);

const approvalServiceSource = fs.readFileSync(path.join(root, "app", "services", "HomologacaoService.php"), "utf8");
assert.match(approvalServiceSource, /\$action==='homologacao_lancamento'.*requiresEvidence\(\$indicator,\$before\).*hasCurrent\(\$id\)/s);
assert.match(approvalServiceSource, /CompetenciaPeriodicidade::requiresEvidence\(\$indicator,\$rule,\$launch\)/);

console.log("Indicador 03: modelo funcional, documentos, governança e apresentação validados.");
