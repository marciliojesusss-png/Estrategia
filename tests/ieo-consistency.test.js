const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const dataStore = read("assets", "js", "dataStore.js");
const formulas = read("assets", "js", "formulas.js");
const indicators = read("assets", "js", "indicators.js");
const persistence = read("assets", "js", "central-persistence.js");
const launches = read("assets", "js", "launches.js");
const approvals = read("assets", "js", "approvals.js");
const migration = read("database", "sqlserver", "migrations", "20260904_001_indicador06_ieo_metodologia_ca_agosto_2026.sql");

assert.match(dataStore, /window\.IeoRecorrente\?\.IEO_META_MENSAL_2026/);
assert.doesNotMatch(dataStore, /"2026-01": null/);
assert.doesNotMatch(dataStore, /campoPercentualOficial:\s*"percentualAtingidoOficialInformado"/);
assert.doesNotMatch(formulas, /percentualOficial\s*\?\?/);
assert.match(formulas, /meta \/ resultado/);
assert.match(indicators, /const isIeoInverse = Number\(indicador\.id\) === 6/);
assert.match(persistence, /root\.IeoRecorrente\?\.getMetaCompetencia/);
assert.doesNotMatch(persistence, /delete prepared\.camposEntrada\.percentualAtingidoOficialInformado/);
assert.match(launches, /getCamposEntrada/);
assert.match(launches, /getMetodologiaIeoPorCompetencia/);
assert.match(launches, /admin && !metodologiaCa/);
assert.match(launches, /resultado\.metaAcumulada !== undefined && !metodologiaCa/);
assert.match(launches, /resultado\.percentualMetaAcumulada !== undefined && !metodologiaCa/);
assert.match(approvals, /getCamposEntrada/);
assert.match(indicators, /getMetodologiaIeoPorCompetencia/);
assert.match(migration, /2026-08.*2026-09.*2026-10.*2026-11.*2026-12/s);
assert.match(migration, /l\.status = N'Não iniciado'/);
assert.match(migration, /l\.resultado_calculado IS NULL/);
assert.match(migration, /l\.resultado_oficial IS NULL/);
assert.doesNotMatch(migration, /^\s*ALTER\s+TABLE/im);
assert.doesNotMatch(migration, /UPDATE\s+dbo\.indicadores/i);
assert.doesNotMatch(migration, /SET\s+l\.(status|situacao|dados_entrada_json|updated_at)\s*=/i);

[
  "administracao.php",
  "homologacao.php",
  "indicadores.php",
  "lancamentos.php",
  "login.php",
  "relatorios.php",
  "resumo-executivo.php",
  "visao-trimestral.php"
].forEach((view) => {
  const html = read("views", "frontend", view);
  const ieoIndex = html.indexOf("ieo-recorrente.js");
  const storeIndex = html.indexOf("dataStore.js");
  assert.ok(ieoIndex >= 0, `${view} deve carregar a regra oficial do IEO`);
  assert.ok(storeIndex < 0 || ieoIndex < storeIndex, `${view} deve carregar o IEO antes do dataStore`);
});

console.log("IEO Recorrente: fonte única e ordem de carregamento validadas.");
