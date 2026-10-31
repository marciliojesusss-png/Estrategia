const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date };
context.window.window = context.window;

function loadScript(file) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
}

loadScript("indicator-periodicity.js");
context.window.IndicatorPeriodicity = context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
loadScript("currency.js");
context.CurrencyBR = context.window.CurrencyBR;
loadScript("formulas.js");
context.IndicatorFormulas = context.window.IndicatorFormulas;
loadScript("quarterly.js");
loadScript("dashboard.js");

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 9);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 9);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 9);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

function closeTo(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deve ser próximo de ${expected}`);
}

assert.equal(indicator.unidadeApuradora, "SULOT");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PN");
assert.equal(indicator.tipoCalculo, "razao_pix");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_acumulada");
assert.equal(rule.parametrosCalculo.excluirInternetBankingCaixa, true);
assert.match(rule.parametrosCalculo.observacaoMetodologica, /Internet Banking CAIXA \(IBC\)/);
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);

assert.deepEqual(
  Object.fromEntries(Object.entries(rule.parametrosCalculo.metasTrimestrais)),
  { "1TRI/2026": 0.61, "2TRI/2026": 0.62, "3TRI/2026": 0.63, "4TRI/2026": 0.65 }
);
assert.deepEqual(
  Object.fromEntries(Object.entries(rule.parametrosCalculo.trajetoriaTecnicaAuxiliar)),
  { "2026-07": 0.6215, "2026-08": 0.6255, "2026-09": 0.6298 }
);
assert.deepEqual(
  bootstrap.metas.filter((item) => Number(item.indicadorId) === 9).map((item) => item.metaMensal),
  [0.63, 0.61, 0.61, 0.61, 0.61, 0.62, 0.63, 0.63, 0.63, 0.6342, 0.6383, 0.6543]
);
assert.equal(byMonth[12].metaMensal, 0.6543, "a meta mensal de dezembro deve permanecer operacional");
[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((month) => assert.equal(byMonth[month].status, "Em preenchimento"));
[10, 11, 12].forEach((month) => assert.equal(byMonth[month].status, "Não iniciado"));
assert.equal(launches.some((item) => item.status === "Homologado"), false);

const jan = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[1], [byMonth[1]]);
const feb = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[2], [byMonth[1], byMonth[2]]);
const mar = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[3], [byMonth[1], byMonth[2], byMonth[3]]);
const jun = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[6], launches.filter((item) => Number(item.mes) <= 6));
const set = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[9], launches.filter((item) => Number(item.mes) <= 9));
closeTo(jan.resultadoCalculado, 411428638.26 / 602431775.22);
closeTo(feb.resultadoCalculado, 767756452.21 / 1143106805.37);
closeTo(mar.resultadoCalculado, 1127026595.61 / 1686118105.09);
assert.equal(feb.pixAcumulado, 767756452.21, "posição acumulada não pode ser somada novamente");
assert.equal(feb.canaisEletronicosAcumulado, 1143106805.37, "denominador acumulado não pode ser somado novamente");
assert.equal(mar.resultadoOficialDocumental, 0.67);
assert.equal(mar.percentualAtingidoOficialDocumental, 1.1009);
assert.equal(mar.resultadoOficialAnualFormatado, "67%");
assert.equal(mar.percentualAtingidoAnualFormatado, "110,09%");
assert.equal(mar.situacao, "Atingido");
assert.equal(jun.resultadoOficialDocumental, 0.6713);
assert.equal(jun.percentualAtingidoOficialDocumental, 1.0914);
assert.equal(jun.resultadoOficialAnualFormatado, "67,13%");
assert.equal(jun.percentualAtingidoAnualFormatado, "109,14%");
assert.equal(jun.situacao, "Atingido");
closeTo(set.resultadoCalculado, 3538349227.36 / 5230842556.02);
assert.equal(set.pixAcumulado, 3538349227.36);
assert.equal(set.canaisEletronicosAcumulado, 5230842556.02);
assert.equal(byMonth[9].camposEntrada.arrecadacaoPixAcumuladaCompetenciaAproximada, 3538000000);
assert.equal(Object.prototype.hasOwnProperty.call(byMonth[9].camposEntrada, "lacunaComponenteFinanceiroPix"), false);
assert.equal(set.resultadoOficialDocumental, 0.6764);
assert.equal(set.percentualAtingidoOficialDocumental, 1.0737);
assert.equal(set.resultadoOficialAnualFormatado, "67,64%");
assert.equal(set.percentualAtingidoAnualFormatado, "107,37%");
assert.equal(set.situacao, "Atingido");
assert.equal(jan.situacao, "Em acompanhamento");

const abaixoDaMeta = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, {
  ...byMonth[6],
  camposEntrada: {
    ...byMonth[6].camposEntrada,
    resultadoOficialPix: 0.60,
    percentualAtingidoOficialPix: 0.9677
  }
}, launches.filter((item) => Number(item.mes) <= 6));
assert.equal(abaixoDaMeta.situacao, "Abaixo da meta");

const quarterly = context.window.QuarterlyConsolidation;
function quarter(number, closingMonth) {
  const quarterLaunches = launches.map((item) => ({
    ...item,
    status: Number(item.mes) === closingMonth ? "Homologado" : item.status
  }));
  return quarterly.consolidarTrimestre(indicator, rule, quarterLaunches, `${number}TRI/2026`);
}

const q1 = quarter(1, 3);
const q2 = quarter(2, 6);
const q3 = quarter(3, 9);
const q4 = quarterly.consolidarTrimestre(indicator, rule, launches, "4TRI/2026");

closeTo(q1.resultadoCalculadoTrimestral, 1127026595.61 / 1686118105.09);
closeTo(q2.resultadoCalculadoTrimestral, 2261919134.59 / 3369675084.95);
assert.equal(q1.resultadoTrimestral, 0.67);
assert.equal(q1.metaTrimestral, 0.61);
assert.equal(q1.desempenhoTrimestral, 1.1009);
assert.equal(q2.resultadoTrimestral, 0.6713);
assert.equal(q2.metaTrimestral, 0.62);
assert.equal(q2.desempenhoTrimestral, 1.0914);
closeTo(q3.resultadoCalculadoTrimestral, 3538349227.36 / 5230842556.02);
assert.equal(q3.resultadoTrimestral, 0.6764);
assert.equal(q3.metaTrimestral, 0.63);
assert.equal(q3.desempenhoTrimestral, 1.0737);
assert.equal(q4.metaTrimestral, 0.65);
assert.equal(q4.resultadoTrimestral, null);

const dashboardSemNovaHomologacao = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  lancamentos: launches,
  regras: [rule]
}).resultadosOficiais[0];
assert.equal(dashboardSemNovaHomologacao.possuiPosicaoOficial, false);
assert.equal(dashboardSemNovaHomologacao.lancamento, null);
assert.equal(dashboardSemNovaHomologacao.resultado, null);

[1, 2, 4, 5, 7, 8].forEach((month) => {
  assert.equal(byMonth[month].situacaoCalculada, "Em acompanhamento");
});

const dashboardInput = launches.map((item) => ({
  ...item,
  status: [3, 6].includes(Number(item.mes)) ? "Homologado" : item.status
}));
const dashboardQ2 = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  lancamentos: dashboardInput,
  regras: [rule]
}).resultadosOficiais[0];
assert.equal(dashboardQ2.lancamento.mes, 6, "mês intermediário não pode substituir fechamento homologado");
assert.equal(dashboardQ2.resultado, 0.6713);
assert.equal(dashboardQ2.percentualAtingido, 1.0914);

const dashboardQ3 = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  lancamentos: dashboardInput.map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item),
  regras: [rule]
}).resultadosOficiais[0];
assert.equal(dashboardQ3.lancamento.mes, 9);
assert.equal(dashboardQ3.resultado, 0.6764);
assert.equal(dashboardQ3.percentualAtingido, 1.0737);

assert.equal(bootstrap.homologacoes.filter((item) => Number(item.indicadorId) === 9).length, 0);
assert.equal(
  bootstrap.historico.filter((item) => [97, 98, 99].includes(Number(item.registroId))).length,
  6,
  "a trilha histórica da massa de teste deve permanecer preservada"
);
assert.deepEqual(
  bootstrap.historico.filter((item) => [97, 98, 99].includes(Number(item.registroId))).map((item) => Number(item.id)).sort((a, b) => a - b),
  [19, 20, 21, 22, 23, 24]
);

const expectedUnits = { 16: "GENOL", 17: "SULOT", 19: "GENOL" };
Object.entries(expectedUnits).forEach(([id, unit]) => {
  const item = bootstrap.indicadores.find((candidate) => Number(candidate.id) === Number(id));
  assert.equal(item.unidadeApuradora, unit);
  assert.equal(item.diretoriaResponsavel, "DICOT");
});

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261022_003_indicador09_modelagem_carga_oficial.sql"),
  "utf8"
);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /IF @@TRANCOUNT>0 ROLLBACK TRANSACTION/);
assert.doesNotMatch(migration, /STRING_AGG/i, "a instância SQL Server 2016 não suporta STRING_AGG");
assert.match(migration, /FOR XML PATH\(N''\), TYPE/);
assert.match(migration, /MASSA DE TESTE — NÃO OFICIAL/);
assert.match(migration, /ARQUIVAMENTO_MASSA_TESTE_NAO_OFICIAL/);
assert.match(migration, /AS motivo/);
assert.match(migration, /20261022_003_indicador09_modelagem_carga_oficial\.sql' AS migration_corretiva/);
assert.match(migration, /INSERT INTO dbo\.auditoria/);
assert.equal((migration.match(/FOR JSON PATH, INCLUDE_NULL_VALUES/g) || []).length, 4);
assert.match(migration, /#auditoriaAntes EXCEPT SELECT \* FROM dbo\.auditoria/);
assert.match(migration, /COUNT\(\*\)\+1 FROM #auditoriaAntes/);
assert.match(migration, /homologacoes_criadas/);
assert.match(migration, /evidencias_criadas/);
assert.match(migration, /Denominador exato de setembro não localizado/);
assert.doesNotMatch(migration, /INSERT INTO dbo\.homologacoes/i);
assert.doesNotMatch(migration, /INSERT INTO dbo\.evidencias/i);

["formulas.js", "quarterly.js", "dashboard.js"].forEach((file) => {
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    /trajetoriaTecnicaAuxiliar/,
    `${file} não pode consumir a trajetória técnica auxiliar como meta oficial`
  );
});

["bootstrap-data.js", "dashboard.js", "dataStore.js", "formulas.js", "launches.js", "quarterly.js"].forEach((file) => {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer idêntico em assets e public/assets`
  );
});

console.log("indicator09-official-load.test.js: ok");
