const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "assets", "js", "indicator-evolution.js");
const publicPath = path.join(root, "public", "assets", "js", "indicator-evolution.js");
const source = fs.readFileSync(sourcePath, "utf8");

assert.equal(source, fs.readFileSync(publicPath, "utf8"), "O módulo publicado deve espelhar o código-fonte");

const context = {
  window: {},
  console,
  Intl,
  Date
};
context.window.window = context.window;
vm.createContext(context);

vm.runInContext(
  fs.readFileSync(path.join(root, "assets", "js", "indicator-periodicity.js"), "utf8"),
  context,
  { filename: "indicator-periodicity.js" }
);
context.window.IndicatorPeriodicity = context.IndicatorPeriodicity;

vm.runInContext(
  fs.readFileSync(path.join(root, "assets", "js", "currency.js"), "utf8"),
  context,
  { filename: "currency.js" }
);
context.CurrencyBR = context.window.CurrencyBR;

vm.runInContext(
  fs.readFileSync(path.join(root, "assets", "js", "ieo-recorrente.js"), "utf8"),
  context,
  { filename: "ieo-recorrente.js" }
);

["calculations.js", "formulas.js", "dashboard.js", "indicator-evolution.js"].forEach((file) => {
  vm.runInContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
  if (context.window.Calculations) context.Calculations = context.window.Calculations;
  if (context.window.IndicatorFormulas) context.IndicatorFormulas = context.window.IndicatorFormulas;
  if (context.window.StrategicResults) context.StrategicResults = context.window.StrategicResults;
});

const bootstrap = loadBootstrapData(root);
const evolution = context.window.IndicatorEvolution;
assert.ok(evolution, "O módulo de evolução deve ser registrado no navegador");

assert.equal(evolution.chartThemeColors().text, "#c9ddf3", "O fallback escuro deve continuar legível");
context.window.document = { documentElement: { dataset: { theme: "light" } } };
context.window.getComputedStyle = () => ({
  getPropertyValue(name) {
    return {
      "--chart-text": "#40566d",
      "--chart-legend": "#24384d",
      "--chart-grid": "rgba(67, 101, 133, 0.16)"
    }[name] || "";
  }
});
assert.equal(evolution.chartThemeColors().text, "#40566d", "Eixos e competências devem usar texto escuro no tema claro");
assert.equal(evolution.chartThemeColors().legend, "#24384d", "A legenda deve usar contraste próprio no tema claro");

const lucro = bootstrap.indicadores.find((item) => Number(item.id) === 7);
const lucroSeries = evolution.buildSeries({
  indicator: lucro,
  launches: bootstrap.lancamentos,
  rules: bootstrap.regrasIndicadores,
  year: 2026
});

assert.equal(lucroSeries.mode, "standard", "Lucro recorrente deve comparar cada competência individualmente");
assert.ok(lucroSeries.numericPoints.length >= 2, "A série deve recuperar mais de uma posição oficial homologada");
assert.ok(lucroSeries.numericPoints.every((point) => point.official), "O gráfico não deve promover posição não homologada");
const lucroMonths = Array.from(lucroSeries.numericPoints, (point) => point.month);
assert.deepEqual(
  [...lucroMonths].sort((left, right) => left - right),
  lucroMonths,
  "As competências devem permanecer em ordem cronológica"
);
assert.ok(lucroSeries.numericPoints.every((point) => point.meta !== null && point.realized !== null));

const canaisDigitais = bootstrap.indicadores.find((item) => Number(item.id) === 8);
const canaisSeries = evolution.buildSeries({
  indicator: canaisDigitais,
  launches: bootstrap.lancamentos,
  rules: bootstrap.regrasIndicadores,
  year: 2026
});
assert.equal(canaisSeries.mode, "accumulated", "Indicadores acumulados devem usar evolução em linhas");

const plataforma = bootstrap.indicadores.find((item) => Number(item.id) === 10);
const plataformaSeries = evolution.buildSeries({
  indicator: plataforma,
  launches: bootstrap.lancamentos,
  rules: bootstrap.regrasIndicadores,
  year: 2026
});
assert.equal(plataformaSeries.qualitative, true, "Indicador sem medida numérica deve cair na linha do tempo qualitativa");
assert.equal(plataformaSeries.numericPoints.length, 0);
assert.ok(plataformaSeries.points.length > 0);

const indicatorView = fs.readFileSync(path.join(root, "views", "frontend", "indicadores.php"), "utf8");
const executiveView = fs.readFileSync(path.join(root, "views", "frontend", "resumo-executivo.php"), "utf8");
assert.match(indicatorView, /id="indicatorEvolutionChart"/);
assert.match(indicatorView, /indicator-evolution\.js/);
assert.match(executiveView, /id="executiveEvolutionChart"/);
assert.match(executiveView, /id="executiveEvolutionIndicator"/);

console.log("indicator-evolution.test.js: OK");
