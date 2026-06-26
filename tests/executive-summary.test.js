const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {
  window: {},
  console,
  URLSearchParams,
  Intl,
  Date
};
context.window.window = context.window;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "currency.js"), "utf8"),
  context,
  { filename: "currency.js" }
);
context.CurrencyBR = context.window.CurrencyBR;

["calculations.js", "formulas.js"].forEach((file) => {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
});
context.Calculations = context.window.Calculations;
context.IndicatorFormulas = context.window.IndicatorFormulas;
vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "dashboard.js"), "utf8"),
  context,
  { filename: "dashboard.js" }
);

const indicators = JSON.parse(fs.readFileSync(path.join(root, "data", "indicadores.json"), "utf8"));
const launches = JSON.parse(fs.readFileSync(path.join(root, "data", "lancamentos.json"), "utf8"));
const rules = JSON.parse(fs.readFileSync(path.join(root, "data", "regras-indicadores.json"), "utf8"));
const results = context.window.StrategicResults.calcularDashboard({
  indicadores: indicators,
  lancamentos: launches,
  regras: rules
}).resultadosOficiais;

assert.equal(results.length, 23);
assert.equal(results.filter((item) => context.window.StrategicResults.officialSituation(item) === "Sem dados").length, 23);
assert.equal(results.filter((item) => item.indicador.plano === "PEI").length, 11);
assert.equal(results.filter((item) => item.indicador.plano === "PN").length, 12);
assert.equal(new Set(results.map((item) => item.indicador.pilar)).size, 6);

const digitalIndicator = indicators.find((item) => item.id === 8);
const digitalRule = rules.find((item) => item.indicadorId === 8);
const digitalDashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [digitalIndicator],
  regras: [digitalRule],
  lancamentos: [
    {
      id: 8001, indicadorId: 8, ano: 2026, mes: 1, nomeMes: "Janeiro", status: "Homologado",
      camposEntrada: { arrecadacaoCanaisEletronicosMes: 590000000, arrecadacaoTotalProdutosLoteriasMes: 1990000000 }
    },
    {
      id: 8002, indicadorId: 8, ano: 2026, mes: 2, nomeMes: "Fevereiro", status: "Homologado",
      camposEntrada: { arrecadacaoCanaisEletronicosMes: 590000000, arrecadacaoTotalProdutosLoteriasMes: 1990000000 }
    },
    {
      id: 8003, indicadorId: 8, ano: 2026, mes: 3, nomeMes: "Março", status: "Em preenchimento",
      camposEntrada: { arrecadacaoCanaisEletronicosMes: 590200000, arrecadacaoTotalProdutosLoteriasMes: 1986900000 }
    }
  ]
}).resultadosOficiais[0];
assert.ok(Math.abs(digitalDashboard.resultado - (1180000000 / 3980000000)) < 0.000001);
assert.equal(digitalDashboard.competencia, "Fevereiro/2026");
assert.equal(digitalDashboard.meta, 0.2805);

console.log("Testes do resumo executivo OK");
