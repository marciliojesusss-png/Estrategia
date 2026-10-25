const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, URLSearchParams, Intl, Date };
context.window.window = context.window;

for (const file of ["indicator-periodicity.js", "currency.js", "calculations.js", "formulas.js", "quarterly.js", "dashboard.js"]) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
  if (file === "indicator-periodicity.js") context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
  if (file === "calculations.js") context.Calculations = context.window.Calculations;
  if (file === "formulas.js") context.IndicatorFormulas = context.window.IndicatorFormulas;
}

const bootstrap = loadBootstrapData(root);
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 5);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 5);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 5);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const closeTo = (actual, expected, tolerance = 0.000001) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deveria ser aproximadamente ${expected}`);
};

assert.equal(indicator.indicador, "Gross Gaming Revenue (GGR)");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.metaAnualDescricao, "≥ R$ 14.996.238.568,92");
assert.equal(rule.tipoCalculo, "ggr_formula");
assert.equal(rule.tipoConsolidacao, "acumulado_por_soma_mensal");
assert.equal(rule.metaAnualValor, 14996238568.92);
assert.equal(rule.parametrosCalculo.metaAnualOriginalGGR, 15600000000);
assert.equal(rule.parametrosCalculo.campoGgrAcumuladoDocumental, "ggrAcumuladoOficial");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);

const expected = {
  4: [4193018946.75, 4455763900.80, 1.0626624771761772, "Em acompanhamento", "acompanhamento"],
  5: [5285128207.78, 5640812286.33, 1.0672990445201336, "Em acompanhamento", "acompanhamento"],
  6: [6782063824.52, 6784050495.32, 1.0002929301244285, "Atingido", "fechamento_trimestral"],
  7: [7644597006.08, 7883901606.54, 1.0313037561390972, "Em acompanhamento", "acompanhamento"],
  8: [8771034926.84, 9031400541.43, 1.0296847084479464, "Em acompanhamento", "acompanhamento"],
  9: [10271204883.87, 10435959467.05, 1.0160404339162517, "Atingido", "fechamento_trimestral"]
};

for (const [monthText, [meta, realized, performance, situation, positionType]] of Object.entries(expected)) {
  const month = Number(monthText);
  const launch = byMonth[month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.metaMensal, meta);
  assert.equal(launch.camposEntrada.ggrAcumuladoOficial, realized);
  assert.equal(launch.camposEntrada.tipoPosicaoGGR, positionType);
  assert.equal(launch.resultadoOficialAnual, realized);
  closeTo(launch.percentualAtingido, performance, 1e-15);
  assert.equal(launch.situacaoCalculada, situation);

  const calculated = formulas.calcularIndicador(
    indicator,
    rule,
    launch,
    launches.filter((item) => Number(item.mes) <= month)
  );
  assert.equal(calculated.ggrAcumuladoDocumental, true);
  assert.equal(calculated.ggrCalculadoMes, null, "posição acumulada não pode ser apresentada como GGR isolado do mês");
  assert.equal(calculated.resultadoOficialAnual, realized, "posição acumulada atual não pode ser somada às anteriores");
  closeTo(calculated.percentualAtingidoAnual, realized / meta, 1e-15);
  assert.equal(calculated.situacao, situation);
}

// JUN preserva simultaneamente a memória operacional da planilha e o fechamento do Informe.
assert.equal(byMonth[6].camposEntrada.metaPlanilhaGGR, 6512131484.93);
closeTo(byMonth[6].camposEntrada.atingimentoPlanilhaGGR, 1.04175576169174, 1e-15);
assert.equal(byMonth[6].camposEntrada.metaOficialFechamentoGGR, 6782063824.52);
assert.equal(byMonth[6].camposEntrada.resultadoOficialGGR, 6784050495.32);
closeTo(byMonth[6].camposEntrada.atingimentoOficialGGR, 1.0002929301244285, 1e-15);
assert.equal(byMonth[6].camposEntrada.fontePlanilhaGGR, "16.10(3).xlsx");
assert.equal(byMonth[6].camposEntrada.fonteOficialGGR, "Informe DILOT/GERIN nº 0056/2026");

// Natureza JAN–DEZ: somente MAR/JUN/SET/DEZ fecham trimestre.
for (let month = 1; month <= 12; month += 1) {
  const expectedType = [3, 6, 9, 12].includes(month) ? "fechamento_trimestral" : "acompanhamento";
  assert.equal(formulas.resolverTipoPosicaoGgr(byMonth[month], rule), expectedType);
}

assert.equal(byMonth[12].metaMensal, 14996238568.92);
assert.equal(byMonth[12].status, "Não iniciado");
assert.equal(byMonth[12].resultadoOficialAnual, null);
assert.equal(byMonth[12].percentualAtingido, null);

const q1 = quarterly.consolidarTrimestre(indicator, rule, launches, "1TRI/2026");
assert.equal(q1.statusTrimestre, "Fechado");
assert.equal(q1.metaTrimestral, 3070246140.78);
assert.equal(q1.resultadoTrimestral, 3322204494.29);
closeTo(q1.desempenhoTrimestral, 1.0820645453025435, 1e-15);

const q2 = quarterly.consolidarTrimestre(indicator, rule, launches, "2TRI/2026");
assert.equal(q2.statusTrimestre, "Parcial", "fechamento técnico sem homologação deve permanecer parcial");
assert.equal(q2.metaTrimestral, 6782063824.52);
assert.equal(q2.resultadoTrimestral, 6784050495.32);
closeTo(q2.desempenhoTrimestral, 1.0002929301244285, 1e-15);
assert.equal(q2.situacaoTrimestral, "Atingido");

const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Parcial");
assert.equal(q3.metaTrimestral, 10271204883.87);
assert.equal(q3.resultadoTrimestral, 10435959467.05);
closeTo(q3.desempenhoTrimestral, 1.0160404339162517, 1e-15);
assert.equal(q3.situacaoTrimestral, "Atingido");

const q4 = quarterly.consolidarTrimestre(indicator, rule, launches, "4TRI/2026");
assert.equal(q4.statusTrimestre, "Sem dados");
assert.equal(q4.metaTrimestral, 14996238568.92);
assert.equal(q4.resultadoTrimestral, null);

const dashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  regras: [rule],
  lancamentos: launches
}).resultadosOficiais[0];
assert.equal(dashboard.competencia, "Março/2026", "JUN/SET sem homologação não podem substituir MAR no Resumo Executivo");
assert.equal(dashboard.status, "Homologado");
assert.equal(dashboard.meta, 3070246140.78);
assert.equal(dashboard.resultado, 3322204494.29);

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261024_002_indicador05_ggr_regularizacao_tecnica.sql"),
  "utf8"
);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /N'52',N'53',N'54',N'55',N'56',N'57'/);
assert.match(migration, /id=N'60'/);
assert.match(migration, /14996238568\.92/);
assert.match(migration, /metaPlanilhaGGR/);
assert.match(migration, /metaOficialFechamentoGGR/);
assert.match(migration, /N'\[3,6,9,12\]'/);
assert.match(migration, /governança foi criada, removida ou alterada/);
for (const [month, initial, final] of [
  [4, "4193018947.00", "4193018946.75"],
  [5, "5285128208.00", "5285128207.78"],
  [6, "6512131485.00", "6782063824.52"],
  [7, "7644597006.00", "7644597006.08"],
  [8, "8771034927.00", "8771034926.84"],
  [9, "10271204884.00", "10271204883.87"],
  [12, "15600000000.00", "14996238568.92"]
]) {
  const tuple = `(${month},${initial},${final}`;
  assert.ok(migration.includes(tuple), `guard da meta ${month} deve reconhecer o valor real atual e o valor final`);
}
assert.match(migration, /@regraEstadoInicial/);
assert.match(migration, /@regraEstadoFinal/);
assert.match(migration, /@alvosEstadoInicial/);
assert.match(migration, /@metasEstadoInicial/);
assert.match(migration, /estado parcialmente migrado ou inconsistente/);
assert.match(migration, /governança dos lançamentos 49–60 divergiu do estado real reconhecido/);
assert.match(migration, /meta fora do escopo autorizado foi alterada/);
const finalRuleMatch = migration.match(/SET @regraFinal=N'(\{.*?\})';\s*\r?\n\s*IF ISJSON/s);
assert.ok(finalRuleMatch, "JSON final da regra deve estar declarado antes do guard ISJSON");
assert.doesNotThrow(() => JSON.parse(finalRuleMatch[1].replace(/''/g, "'")));
const jsonModifyCount = (migration.match(/JSON_MODIFY\s*\(/gi) || []).length;
const literalJsonModifyPaths = Array.from(
  migration.matchAll(/JSON_MODIFY\s*\(\s*@[A-Za-z0-9_]+\s*,\s*(N?'[^']+')\s*,/gi),
  (match) => match[1]
);
assert.equal(jsonModifyCount, 11);
assert.equal(literalJsonModifyPaths.length, jsonModifyCount, "todo JSON_MODIFY deve usar path literal");
for (const pathLiteral of literalJsonModifyPaths) {
  assert.match(pathLiteral, /^N?'\$\[\d+\](?:\.[A-Za-z0-9_]+)?'$/);
}
assert.doesNotMatch(migration, /JSON_MODIFY\s*\([^,]+,\s*(?:CONCAT\s*\(|@[A-Za-z0-9_]+)/i);
assert.match(migration, /índice literal \$\[4\] de regrasIndicadores/);
assert.match(migration, /índices literais \$\[30\] a \$\[41\] de metas/);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|auditoria|retificacoes|solicitacoes_reabertura)/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\./i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+dbo\./i);

for (const file of ["bootstrap-data.js", "dataStore.js", "formulas.js", "indicators.js", "launches.js", "quarterly.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`
  );
}

console.log("indicator05-ggr-regularization.test.js: OK");
