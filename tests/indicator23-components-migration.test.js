const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261025_005_indicador23_componentes_rede_loterica.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const bootstrap = loadBootstrapData(root);

const rows = [
  { id: 265, month: 1, base: "1345843615.20", current: "1483427750.90", accumulatedBase: "1345843615.20", accumulatedCurrent: "1483427750.90", result: "1.102228917346800517", performance: "1.096745191389851261" },
  { id: 266, month: 2, base: "1691450489.90", current: "1439543898.10", accumulatedBase: "3037294105.10", accumulatedCurrent: "2922971649.00", result: "0.962360426042365086", performance: "0.957572563226233916" },
  { id: 267, month: 3, base: "1337016995.60", current: "1476242711.30", accumulatedBase: "4374311100.70", accumulatedCurrent: "4399214360.30", result: "1.005693070069025235", performance: "1.000689621959229090" },
  { id: 268, month: 4, base: "1435038130.70", current: "1520757013.20", accumulatedBase: "5809349231.40", accumulatedCurrent: "5919971373.50", result: "1.019042088484210662", performance: "1.008952562855654121" },
  { id: 269, month: 5, base: "1527837662.30", current: "1600397124.10", accumulatedBase: "7337186893.70", accumulatedCurrent: "7520368497.60", result: "1.024966190251646309", performance: "1.014818010150144860" },
  { id: 270, month: 6, base: "1862564945.90", current: "1573326249.20", accumulatedBase: "9199751839.60", accumulatedCurrent: "9093694746.80", result: "0.988471744167763192", performance: "0.978684895215607121" },
  { id: 271, month: 7, base: "1552114336.40", current: "1464165326.50", accumulatedBase: "10751866176.00", accumulatedCurrent: "10557860073.30", result: "0.981956053067973007", performance: "0.967444387259086706" },
  { id: 272, month: 8, base: "1468593628.90", current: "1516647865.60", accumulatedBase: "12220459804.90", accumulatedCurrent: "12074507938.90", result: "0.988056761502420872", performance: "0.973454937440808741" }
];

function cents(value) {
  return BigInt(value.replace(".", ""));
}

let base = 0n;
let current = 0n;
for (const row of rows) {
  base += cents(row.base);
  current += cents(row.current);
  assert.equal(base, cents(row.accumulatedBase), `base acumulada do mês ${row.month}`);
  assert.equal(current, cents(row.accumulatedCurrent), `realizado acumulado do mês ${row.month}`);
  for (const literal of [String(row.id), row.base, row.current, row.accumulatedBase, row.accumulatedCurrent, row.result, row.performance]) {
    assert.ok(sql.includes(literal), `literal ausente na migration: ${literal}`);
  }
}

assert.match(sql, /SET XACT_ABORT ON;/);
assert.match(sql, /BEGIN TRY[\s\S]*BEGIN TRANSACTION;[\s\S]*COMMIT TRANSACTION;[\s\S]*BEGIN CATCH[\s\S]*ROLLBACK TRANSACTION;/);
assert.doesNotMatch(sql, /\bFLOAT\b/i);
assert.match(sql, /DECIMAL\(19,2\)/);
assert.match(sql, /DECIMAL\(38,18\)/);
assert.match(sql, /@estadoInicial=0 AND @estadoFinal=0/);
assert.match(sql, /@esperadoLancamentos=CASE WHEN @estadoInicial=1 THEN 8 ELSE 0 END/);
assert.match(sql, /@linhasLancamentos<>@esperadoLancamentos/);
assert.match(sql, /linhas f[ií]sicas; PASS inicial=8 e PASS final=0/i);
assert.match(sql, /UPDATE l SET[\s\S]*FROM dbo\.lancamentos l INNER JOIN @alvos a ON a\.id=l\.id/);
assert.doesNotMatch(sql, /UPDATE\s+dbo\.configuracoes/i);
assert.doesNotMatch(sql, /(?:INSERT\s+INTO|DELETE\s+FROM|MERGE)\s+dbo\./i);
assert.match(sql, /id=N'273'[\s\S]*0\.981600000000000000[\s\S]*0\.967093596059113300/);
assert.match(sql, /id IN \(N'274',N'275',N'276'\)/);
assert.match(sql, /arrecadacaoRedeLoterica2025/);
assert.match(sql, /arrecadacaoRedeLoterica2026/);
assert.match(sql, /metaTrimestral/);
assert.match(sql, /#homologacoesAntes/);
assert.match(sql, /#evidenciasAntes/);
assert.match(sql, /#auditoriaAntes/);
assert.match(sql, /#retificacoesAntes/);
assert.match(sql, /#reaberturasAntes/);
assert.match(sql, /#configuracoesAntes/);
assert.match(sql, /#lancamentosOutrosAntes/);

const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 23);
for (const row of rows) {
  const launch = launches.find((item) => Number(item.id) === row.id);
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente, Number(row.base));
  assert.equal(launch.camposEntrada.arrecadacaoRedeLotericaMes2026, Number(row.current));
  assert.ok(Math.abs(launch.resultadoOficialAnual - Number(row.result)) < 1e-12);
  assert.ok(Math.abs(launch.percentualAtingidoAnual - Number(row.performance)) < 1e-12);
}

const march = launches.find((item) => Number(item.id) === 267).camposEntrada;
assert.equal(march.resultadoDocumentalRedeLoterica, 0.0057);
assert.equal(march.percentualAtingidoOficialRedeLoterica, 1.1386);
assert.match(march.fonteResultadoRedeLoterica, /0029\/2026/);
const june = launches.find((item) => Number(item.id) === 270).camposEntrada;
assert.equal(june.resultadoDocumentalRedeLoterica, 0.988);
assert.equal(june.percentualAtingidoOficialRedeLoterica, 0.9784);
assert.match(june.fonteResultadoRedeLoterica, /0056\/2026/);
const september = launches.find((item) => Number(item.id) === 273).camposEntrada;
assert.equal(september.resultadoDocumentalRedeLoterica, 0.9816);
assert.equal(september.percentualAtingidoOficialRedeLoterica, 0.9671);
assert.match(september.fonteResultadoRedeLoterica, /0078\/2026/);

for (const month of [9, 10, 11, 12]) {
  const inputs = launches.find((item) => Number(item.mes) === month).camposEntrada;
  assert.equal(inputs.arrecadacaoRedeLoterica2025PeriodoEquivalente, undefined);
  assert.equal(inputs.arrecadacaoRedeLotericaMes2026, undefined);
}

const serialized = JSON.stringify(launches);
assert.equal(serialized.includes("3000000000"), false);
assert.equal(serialized.includes("3017079000"), false);
assert.equal(serialized.includes("metaTrimestral"), false);

console.log("indicator23-components-migration.test.js: OK");
