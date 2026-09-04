const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 2);
const indicator = bootstrap.indicadores.find((item) => Number(item.numero) === 2);
const npsLaunches = bootstrap.lancamentos
  .filter((item) => Number(item.indicadorId) === 2 && Number(item.ano) === 2026)
  .sort((a, b) => Number(a.mes) - Number(b.mes));

assert.equal(rule.metaAnualValor, 60);
assert.equal(rule.parametrosCalculo.metaTipo, "meta_absoluta_por_competencia");
assert.equal(rule.parametrosCalculo.metaVigenteNPS2026, 60);
assert.equal(rule.parametrosCalculo.baselineNPS, 55);
assert.equal(rule.parametrosCalculo.notaReferenciaNPS, 70);
assert.deepEqual(
  Object.values(rule.parametrosCalculo.referenciasPorCompetencia),
  [55, 55, 55, 58, 58, 58, 60, 60, 60, 60, 60, 60]
);
assert.equal(
  rule.camposEntrada.find((field) => field.nome === "metaReferenciaCompetenciaNPS")?.somenteLeitura,
  true
);
assert.deepEqual(
  rule.camposEntrada.slice(0, 6).map((field) => field.nome),
  [
    "tipoPosicaoNPS",
    "metaReferenciaCompetenciaNPS",
    "percentualPromotores",
    "percentualDetratores",
    "npsApurado",
    "dataBasePesquisaNPS"
  ]
);
assert.equal(rule.camposEntrada.find((field) => field.nome === "percentualPromotores")?.entradaPtBr, true);
assert.equal(rule.camposEntrada.find((field) => field.nome === "percentualDetratores")?.entradaPtBr, true);
assert.equal(rule.camposEntrada.find((field) => field.nome === "npsApurado")?.somenteLeitura, true);
assert.match(indicator.metaAnualDescricao, /60 pontos a partir do 3TRI\/2026/);
assert.equal(npsLaunches.length, 12);
assert.deepEqual(npsLaunches.map((item) => item.metaMensal), [55, 55, 55, 58, 58, 58, 60, 60, 60, 60, 60, 60]);
assert.deepEqual(
  npsLaunches.map((item) => item.camposEntrada.metaReferenciaCompetenciaNPS),
  [55, 55, 55, 58, 58, 58, 60, 60, 60, 60, 60, 60]
);

for (const relative of ["bootstrap-data.js", "dataStore.js", "formulas.js", "dashboard.js", "executiveSummary.js", "quarterly.js", "indicators.js", "launches.js", "approvals.js"]) {
  assert.equal(
    fs.readFileSync(path.join(root, "assets", "js", relative), "utf8"),
    fs.readFileSync(path.join(root, "public", "assets", "js", relative), "utf8"),
    `${relative} deve permanecer idêntico nos dois diretórios de assets`
  );
}

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20260904_002_indicador02_nps_meta_por_vigencia.sql"),
  "utf8"
);
assert.match(migration, /l\.mes BETWEEN 4 AND 12/);
assert.match(migration, /l\.mes BETWEEN 7 AND 12/);
assert.match(migration, /l\.status = N'Não iniciado'/);
assert.match(migration, /resultado_calculado IS NULL/);
assert.match(migration, /resultado_oficial IS NULL/);
assert.match(migration, /59\.2 \/ 58\.0/);
assert.doesNotMatch(migration, /\bALTER\s+TABLE\b/i);
assert.doesNotMatch(migration, /\bCREATE\s+TABLE\b/i);
assert.doesNotMatch(migration, /\bDROP\b/i);

console.log("NPS: vigência 55/58/60, fronteira Jun/Jul e migration idempotente validadas.");
