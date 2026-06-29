const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const executiveSummary = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "executiveSummary.js"), "utf8");
const quarterlyView = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "quarterlyView.js"), "utf8");
const dashboard = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "dashboard.js"), "utf8");
const reports = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "reports.js"), "utf8");
const indicators = loadBootstrapData(path.join(__dirname, "..")).indicadores;

function limparNomeIndicador(nome) {
  return String(nome || "").replace(/^\s*\d+\.\s*/, "").trim();
}

assert.equal(limparNomeIndicador("6. IEO Recorrente"), "IEO Recorrente");
assert.equal(limparNomeIndicador("IEO Recorrente"), "IEO Recorrente");

[executiveSummary, quarterlyView, dashboard].forEach((source) => {
  assert.match(source, /function limparNomeIndicador/);
  assert.doesNotMatch(source, /<strong>\$\{escapeHtml\([^}]*numero[^}]*\)\}\.<\/strong>/);
});

assert.match(reports, /numero/);
assert.match(reports, /limparNomeIndicador/);

indicators.forEach((indicator) => {
  assert.equal(Number.isFinite(Number(indicator.numero)), true);
  assert.equal(limparNomeIndicador(indicator.indicador).length > 0, true);
});

console.log("Testes de exibição de nomes OK");
