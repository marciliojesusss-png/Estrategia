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
assert.equal(results.filter((item) => context.window.StrategicResults.officialSituation(item) === "Sem dados").length, 2);
assert.equal(results.filter((item) => item.indicador.plano === "PEI").length, 11);
assert.equal(results.filter((item) => item.indicador.plano === "PN").length, 12);
assert.equal(new Set(results.map((item) => item.indicador.pilar)).size, 6);

const ofertasDashboardOficial = results.find((item) => item.indicador.id === 1);
assert.equal(context.window.StrategicResults.officialSituation(ofertasDashboardOficial), "Atingido");
assert.equal(ofertasDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(ofertasDashboardOficial.meta - 0.1) < 0.000001);
assert.ok(Math.abs(ofertasDashboardOficial.resultado - (1241587 / 2773599)) < 0.000001);
assert.ok(Math.abs(ofertasDashboardOficial.percentualAtingido - ((1241587 / 2773599) / 0.1)) < 0.000001);

const npsDashboardOficial = results.find((item) => item.indicador.id === 2);
assert.equal(context.window.StrategicResults.officialSituation(npsDashboardOficial), "Em acompanhamento");
assert.equal(npsDashboardOficial.competencia, "Março/2026");
assert.equal(npsDashboardOficial.meta, 55);
assert.equal(npsDashboardOficial.resultado, 55);
assert.equal(npsDashboardOficial.percentualAtingido, 1);

const climaDashboardOficial = results.find((item) => item.indicador.id === 12);
assert.equal(context.window.StrategicResults.officialSituation(climaDashboardOficial), "Em acompanhamento");
assert.equal(climaDashboardOficial.competencia, "Março/2026");
assert.equal(climaDashboardOficial.meta, 60);
assert.equal(climaDashboardOficial.resultado, 60);
assert.equal(climaDashboardOficial.percentualAtingido, 1);

const aprimoramentoDashboardOficial = results.find((item) => item.indicador.id === 4);
assert.equal(context.window.StrategicResults.officialSituation(aprimoramentoDashboardOficial), "Atingido");
assert.equal(aprimoramentoDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(aprimoramentoDashboardOficial.meta - 0.0454) < 0.000001);
assert.ok(Math.abs(aprimoramentoDashboardOficial.resultado - 0.0454) < 0.000001);
assert.ok(Math.abs(aprimoramentoDashboardOficial.percentualAtingido - 1) < 0.000001);

const capacidadeTicDashboardOficial = results.find((item) => item.indicador.id === 11);
assert.equal(context.window.StrategicResults.officialSituation(capacidadeTicDashboardOficial), "Atingido");
assert.equal(capacidadeTicDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(capacidadeTicDashboardOficial.meta - 0.35) < 0.000001);
assert.ok(Math.abs(capacidadeTicDashboardOficial.resultado - 0.35) < 0.000001);
assert.ok(Math.abs(capacidadeTicDashboardOficial.percentualAtingido - 1) < 0.000001);

const plataformaJogosDashboardOficial = results.find((item) => item.indicador.id === 10);
assert.equal(context.window.StrategicResults.officialSituation(plataformaJogosDashboardOficial), "Em andamento");
assert.equal(plataformaJogosDashboardOficial.competencia, "Março/2026");
assert.equal(plataformaJogosDashboardOficial.meta, null);
assert.equal(plataformaJogosDashboardOficial.resultado, null);
assert.equal(plataformaJogosDashboardOficial.percentualAtingido, null);

const principiosJogoResponsavelDashboardOficial = results.find((item) => item.indicador.id === 18);
assert.equal(context.window.StrategicResults.officialSituation(principiosJogoResponsavelDashboardOficial), "Atingido");
assert.equal(principiosJogoResponsavelDashboardOficial.competencia, "Março/2026");
assert.equal(principiosJogoResponsavelDashboardOficial.meta, 1);
assert.equal(principiosJogoResponsavelDashboardOficial.resultado, 1);
assert.equal(principiosJogoResponsavelDashboardOficial.percentualAtingido, 1);

const apoioSocioambientalDashboardOficial = results.find((item) => item.indicador.id === 16);
assert.equal(context.window.StrategicResults.officialSituation(apoioSocioambientalDashboardOficial), "Em prospecção/estruturação");
assert.equal(apoioSocioambientalDashboardOficial.competencia, "Março/2026");
assert.equal(apoioSocioambientalDashboardOficial.meta, 0);
assert.equal(apoioSocioambientalDashboardOficial.resultado, 0);
assert.equal(apoioSocioambientalDashboardOficial.percentualAtingido, null);

const capacitacaoDashboardOficial = results.find((item) => item.indicador.id === 15);
assert.equal(context.window.StrategicResults.officialSituation(capacitacaoDashboardOficial), "Atingido");
assert.equal(capacitacaoDashboardOficial.competencia, "Março/2026");
assert.equal(capacitacaoDashboardOficial.meta, 0.90);
assert.ok(Math.abs(capacitacaoDashboardOficial.resultado - (137 / 151)) < 0.000001);
assert.equal(capacitacaoDashboardOficial.percentualAtingido, 1);

const incentivoDashboardOficial = results.find((item) => item.indicador.id === 19);
assert.equal(context.window.StrategicResults.officialSituation(incentivoDashboardOficial), "Em prospecção/estruturação");
assert.equal(incentivoDashboardOficial.competencia, "Março/2026");
assert.equal(incentivoDashboardOficial.meta, 0);
assert.equal(incentivoDashboardOficial.resultado, 0);
assert.equal(incentivoDashboardOficial.percentualAtingido, null);

const visibilidadeDashboardOficial = results.find((item) => item.indicador.id === 20);
assert.equal(context.window.StrategicResults.officialSituation(visibilidadeDashboardOficial), "Em elaboração/homologação");
assert.equal(visibilidadeDashboardOficial.competencia, "Março/2026");
assert.equal(visibilidadeDashboardOficial.meta, 0);
assert.equal(visibilidadeDashboardOficial.resultado, 0);
assert.equal(visibilidadeDashboardOficial.percentualAtingido, null);

const jogoResponsavelCapacitacaoDashboardOficial = results.find((item) => item.indicador.id === 21);
assert.equal(context.window.StrategicResults.officialSituation(jogoResponsavelCapacitacaoDashboardOficial), "Atingido");
assert.equal(jogoResponsavelCapacitacaoDashboardOficial.competencia, "Março/2026");
assert.equal(jogoResponsavelCapacitacaoDashboardOficial.meta, 0.90);
assert.ok(Math.abs(jogoResponsavelCapacitacaoDashboardOficial.resultado - (137 / 151)) < 0.000001);
assert.equal(jogoResponsavelCapacitacaoDashboardOficial.percentualAtingido, 1);

const lucroDashboardOficial = results.find((item) => item.indicador.id === 7);
assert.equal(context.window.StrategicResults.officialSituation(lucroDashboardOficial), "Atingido");
assert.equal(lucroDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(lucroDashboardOficial.meta - 268666666.67) < 0.0001);
assert.ok(Math.abs(lucroDashboardOficial.resultado - 336321887.69) < 0.0001);

const ieoDashboardOficial = results.find((item) => item.indicador.id === 6);
assert.equal(context.window.StrategicResults.officialSituation(ieoDashboardOficial), "Atingido");
assert.equal(ieoDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(ieoDashboardOficial.meta - 0.1441) < 0.000001);
assert.ok(Math.abs(ieoDashboardOficial.resultado - 0.108) < 0.000001);
assert.ok(Math.abs(ieoDashboardOficial.percentualAtingido - 1.0422) < 0.000001);

const repasseDashboardOficial = results.find((item) => item.indicador.id === 17);
assert.equal(context.window.StrategicResults.officialSituation(repasseDashboardOficial), "Atingido");
assert.equal(repasseDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(repasseDashboardOficial.meta - 2142991572.00) < 0.0001);
assert.ok(Math.abs(repasseDashboardOficial.resultado - 2253033146.00) < 0.0001);
assert.ok(Math.abs(repasseDashboardOficial.percentualAtingido - (2253033146.00 / 2142991572.00)) < 0.000001);

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
