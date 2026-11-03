const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date };
context.window.window = context.window;

function loadScript(file) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
}

loadScript("currency.js");
context.CurrencyBR = context.window.CurrencyBR;
loadScript("formulas.js");

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 9);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 9);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 9);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

const expected = {
  1: { reference: 0.5765344478939639, target: 0.626534447893964, result: 0.6829464433707065, technical: 1.0900381386312694, main: 1.0900381386312694 },
  2: { reference: 0.5554815010570819, target: 0.605481501057082, result: 0.6716401727321475, technical: 1.109266214673053, main: 1.109266214673053 },
  3: { reference: 0.5571564106775918, target: 0.6071564106775919, result: 0.6684149776980438, technical: 1.1008942110190139, main: 1.1009 },
  4: { reference: 0.5586020793706576, target: 0.6086020793706577, result: 0.6672021098560117, technical: 1.0962862804312976, main: 1.0962862804312976 },
  5: { reference: 0.5614741270016698, target: 0.6114741270016698, result: 0.6694483719344916, technical: 1.0948106262763648, main: 1.0948106262763648 },
  6: { reference: 0.5650349765523601, target: 0.6150349765523602, result: 0.6712573401193555, technical: 1.0914132784482524, main: 1.0914 },
  7: { reference: 0.5714995696445511, target: 0.6215, result: 0.6728979984025613, technical: 1.0826999169791813, main: 1.0826999169791813 },
  8: { reference: 0.5754574701911309, target: 0.6255, result: 0.6752740974570057, technical: 1.0796, main: 1.0796 },
  9: { reference: 0.5798204855357663, target: 0.6298, result: 0.676439634622119, technical: 1.0741, main: 1.0737 }
};

function closeTo(actual, wanted, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - wanted) <= tolerance, `${actual} deve ser próximo de ${wanted}`);
}

Object.entries(expected).forEach(([monthText, values]) => {
  const month = Number(monthText);
  const calculation = context.window.IndicatorFormulas.calcularIndicador(
    indicator,
    rule,
    byMonth[month],
    launches.filter((item) => Number(item.mes) <= month)
  );
  closeTo(calculation.participacaoPix2025Acumulada, values.reference);
  closeTo(calculation.metaTecnicaPix, values.target);
  closeTo(calculation.resultadoCalculado, values.result);
  closeTo(calculation.percentualAtingidoTecnicoPix, values.technical);
  closeTo(calculation.percentualAtingidoAnual, values.main);
});

assert.equal(context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[3], launches).resultadoOficialDocumental, 0.67);
assert.equal(context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[6], launches).resultadoOficialDocumental, 0.6713);
assert.equal(context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[9], launches).resultadoOficialDocumental, 0.6764);

[10, 11, 12].forEach((month) => {
  const calculation = context.window.IndicatorFormulas.calcularIndicador(indicator, rule, byMonth[month], launches);
  assert.equal(calculation.percentualAtingidoAnual, null, `competência ${month} não pode antecipar atingimento`);
  assert.equal(byMonth[month].resultadoOficialAnual, null, `competência ${month} não pode antecipar resultado`);
});

console.log("indicator09-technical-memory.test.js: ok");
