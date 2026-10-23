const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Periodicity = require("../assets/js/indicator-periodicity.js");
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

loadScript("currency.js");
context.CurrencyBR = context.window.CurrencyBR;
loadScript("formulas.js");
context.IndicatorFormulas = context.window.IndicatorFormulas;
loadScript("quarterly.js");

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 17);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 17);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 17);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;

assert.equal(indicator.indicador, "Repasse Social");
assert.equal(indicator.unidadeApuradora, "SULOT");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PEI");
assert.equal(indicator.metaAnualDescricao, "≥ R$ 10,4 bilhões");
assert.equal(indicator.tipoCalculo, "valor_financeiro_acumulado");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_acumulada");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.equal(rule.parametrosCalculo.priorizarMetaCurvaConfigurada, true);

const exactCurve = [
  737118539.30,
  1394613495.00,
  2142991572.00,
  2926098294.00,
  3688125380.00,
  4545104157.26,
  5335136942.72,
  6121095220.48,
  7165115749.39,
  7982318714.00,
  8738217864.00,
  10452751135.00
];

assert.deepEqual(
  bootstrap.metas
    .filter((item) => Number(item.indicadorId) === 17)
    .sort((a, b) => Number(a.mes) - Number(b.mes))
    .map((item) => item.metaMensal),
  exactCurve
);

for (let month = 1; month <= 12; month += 1) {
  const competence = `2026-${String(month).padStart(2, "0")}`;
  assert.equal(rule.parametrosCalculo.metasAcumuladasPorCompetencia[competence], exactCurve[month - 1]);
  assert.equal(byMonth[month].metaMensal, exactCurve[month - 1]);
}

assert.equal(launches.length, 12);
assert.ok(launches.every((item) => item.unidadeApuradora === "SULOT"));
assert.ok(launches.every((item) => item.diretoriaResponsavel === "DICOT"));

// A migration corretiva não pode alterar a pendência histórica de JAN–MAR.
[1, 2, 3].forEach((month) => {
  assert.equal(byMonth[month].status, "Homologado");
  assert.equal(byMonth[month].homologadoPor, "Sistema");
  assert.equal(byMonth[month].dataHomologacao, "2026-03-31");
  assert.equal(byMonth[month].evidencia, "");
  assert.equal(byMonth[month].arquivoEvidencia, "");
});

const expectedSecondQuarter = {
  4: { value: 3035017772.90, percentage: 1.03722, evidence: "evidencia-6a984bd6e79f62.74256072" },
  5: { value: 3837408558.29, percentage: 1.04048, evidence: "evidencia-6a984dbc92ed64.29577074" },
  6: { value: 4615037076.03, percentage: 1.01539, evidence: "evidencia-6a984e1854e2e9.20825739" }
};

Object.entries(expectedSecondQuarter).forEach(([monthText, expected]) => {
  const item = byMonth[Number(monthText)];
  assert.equal(item.status, "Homologado");
  assert.equal(item.camposEntrada.repasseSocialAcumuladoCompetencia, expected.value);
  assert.equal(item.resultadoMensal, expected.value);
  assert.equal(item.resultadoOficialAnual, expected.value);
  assert.equal(item.percentualAtingido, expected.percentage);
  assert.equal(item.situacaoCalculada, "Atingido");
  assert.equal(item.evidenciaId, expected.evidence);
  assert.equal(item.preenchidoPor, "UNIDADE-GENOL");
  assert.equal(item.homologadoPor, "DIRETORIA-DICOT");
  assert.equal(item.versaoAtual, 1);
});

[7, 8, 9].forEach((month) => assert.equal(byMonth[month].status, "Em preenchimento"));
assert.equal(byMonth[7].situacaoCalculada, "Atingido");
assert.equal(byMonth[8].situacaoCalculada, "Atingido");
assert.equal(byMonth[9].situacaoCalculada, "Abaixo da meta");
assert.equal(rule.parametrosCalculo.mesesFechamentoTrimestral.includes(7), false);
assert.equal(rule.parametrosCalculo.mesesFechamentoTrimestral.includes(8), false);
assert.equal(rule.parametrosCalculo.mesesFechamentoTrimestral.includes(9), true);

// "Não especificada" preserva a cobrança mensal; os fechamentos vêm da regra.
assert.deepEqual(Periodicity.expectedMonths(indicator), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

function calculate(month, scopeMonths) {
  return formulas.calcularIndicador(
    indicator,
    rule,
    byMonth[month],
    scopeMonths.map((scopeMonth) => byMonth[scopeMonth])
  );
}

const q1Calculation = calculate(3, [1, 2, 3]);
const q2Calculation = calculate(6, [4, 5, 6]);
const q3Calculation = calculate(9, [7, 8, 9]);
const exactQ1Ratio = 2253033146.00 / 2142991572.00;
assert.equal(byMonth[3].percentualAtingido, exactQ1Ratio);
assert.notEqual(byMonth[3].percentualAtingido, 1.05135);
assert.equal(q1Calculation.percentualAtingidoMensal, exactQ1Ratio);
assert.equal(q1Calculation.percentualAtingidoMensalFormatado, "105,13%");
assert.notEqual(q1Calculation.percentualAtingidoMensalFormatado, "105,14%");
assert.equal(q1Calculation.situacao, "Atingido");
assert.equal(q2Calculation.percentualAtingidoMensalFormatado, "101,54%");
assert.equal(q2Calculation.situacao, "Atingido");
assert.equal(q3Calculation.percentualAtingidoMensalFormatado, "99,03%");
assert.equal(q3Calculation.situacao, "Abaixo da meta");

const q1 = quarterly.consolidarTrimestre(indicator, rule, launches, "1TRI/2026");
const q2 = quarterly.consolidarTrimestre(indicator, rule, launches, "2TRI/2026");
const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q1.situacaoTrimestral, "Atingido");
assert.equal(q2.situacaoTrimestral, "Atingido");
assert.equal(q3.statusTrimestre, "Sem dados", "SET não pode ser homologado automaticamente");

const q3Preview = quarterly.consolidarTrimestre(
  indicator,
  rule,
  launches.map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item),
  "3TRI/2026"
);
assert.equal(q3Preview.situacaoTrimestral, "Abaixo da meta");
assert.equal(q3Preview.resultadoTrimestral, 7095683438.69);
assert.equal(q3Preview.metaTrimestral, 7165115749.39);

const expectedUnits = { 9: "SULOT", 16: "GENOL", 19: "GENOL" };
Object.entries(expectedUnits).forEach(([idText, unit]) => {
  const protectedIndicator = bootstrap.indicadores.find((item) => Number(item.id) === Number(idText));
  assert.equal(protectedIndicator.unidadeApuradora, unit);
  assert.equal(protectedIndicator.diretoriaResponsavel, "DICOT");
});

const migrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261022_004_indicador17_correcao_tecnica_final.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /SET meta_referencia = CONVERT\(NVARCHAR\(100\), @metaJaneiro\)/);
assert.match(migration, /SET meta_referencia = CONVERT\(NVARCHAR\(100\), @metaJunho\)/);
assert.match(migration, /meta_referencia = N'7\.37119e\+008'/);
assert.match(migration, /SET tipo_consolidacao = N'ultima_posicao_acumulada'/);
assert.doesNotMatch(migration, /SET\s+periodicidade\s*=/i);
assert.doesNotMatch(migration, /SET\s+status\s*=/i);
assert.doesNotMatch(migration, /SET\s+versao_atual\s*=/i);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.match(migration, /#homologacoesAntes/);
assert.match(migration, /#evidenciasAntes/);
assert.match(migration, /#retificacoesAntes/);
assert.match(migration, /#reaberturasAntes/);
assert.match(migration, /#auditoriaAntes/);
assert.match(migration, /id = N'9'.*unidade_apuradora = N'SULOT'/s);
assert.match(migration, /id = N'16'.*unidade_apuradora = N'GENOL'/s);
assert.match(migration, /id = N'19'.*unidade_apuradora = N'GENOL'/s);

const precisionMigrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261022_005_indicador17_percentual_mar_precisao.sql"
);
const precisionMigration = fs.readFileSync(precisionMigrationPath, "utf8");
assert.match(precisionMigration, /BEGIN TRANSACTION/);
assert.match(precisionMigration, /COMMIT TRANSACTION/);
assert.match(precisionMigration, /ROLLBACK TRANSACTION/);
assert.match(precisionMigration, /@percentualExato DECIMAL\(38, 18\)/);
assert.match(precisionMigration, /@realizado \/ NULLIF\(@meta, 0\)/);
assert.match(precisionMigration, /SET percentual_atingido = CONVERT\(NVARCHAR\(100\), @percentualExato\)/);
assert.match(precisionMigration, /WHERE id = @lancamentoId/);
assert.equal((precisionMigration.match(/UPDATE dbo\.lancamentos/gi) || []).length, 1);
assert.doesNotMatch(precisionMigration, /SET\s+(?:meta_referencia|resultado_calculado|resultado_oficial|situacao|status|versao_atual|created_at|updated_at)\s*=/i);
assert.doesNotMatch(precisionMigration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias)/i);

const sourceBootstrap = fs.readFileSync(path.join(root, "assets", "js", "bootstrap-data.js"));
const publicBootstrap = fs.readFileSync(path.join(root, "public", "assets", "js", "bootstrap-data.js"));
assert.deepEqual(sourceBootstrap, publicBootstrap, "os espelhos bootstrap devem ser byte a byte idênticos");

console.log("indicator17-final-correction.test.js: ok");
