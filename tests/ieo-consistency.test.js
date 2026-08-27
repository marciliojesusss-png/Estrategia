const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const dataStore = read("assets", "js", "dataStore.js");
const formulas = read("assets", "js", "formulas.js");
const indicators = read("assets", "js", "indicators.js");
const persistence = read("assets", "js", "central-persistence.js");

assert.match(dataStore, /window\.IeoRecorrente\?\.IEO_META_MENSAL_2026/);
assert.doesNotMatch(dataStore, /"2026-01": null/);
assert.doesNotMatch(dataStore, /campoPercentualOficial:\s*"percentualAtingidoOficialInformado"/);
assert.doesNotMatch(formulas, /percentualOficial\s*\?\?/);
assert.match(formulas, /meta \/ resultado/);
assert.match(indicators, /const isIeoInverse = Number\(indicador\.id\) === 6/);
assert.match(persistence, /root\.IeoRecorrente\?\.IEO_META_MENSAL_2026/);
assert.doesNotMatch(persistence, /delete prepared\.camposEntrada\.percentualAtingidoOficialInformado/);

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
