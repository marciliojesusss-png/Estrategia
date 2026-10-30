const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 4);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 4);
const formulas = require("../assets/js/formulas.js");

function closing(month, increment) {
  return {
    id: 400 + month,
    indicadorId: 4,
    ano: 2026,
    mes: month,
    competencia: `2026-${String(month).padStart(2, "0")}`,
    trimestre: `${Math.ceil(month / 3)}TRI/2026`,
    status: "Homologado",
    camposEntrada: {
      tipoPosicaoAprimoramento: "fechamento_quantitativo",
      melhoriasImplementadasMes: increment
    }
  };
}

function tracking(month, accumulated) {
  return {
    id: 400 + month,
    indicadorId: 4,
    ano: 2026,
    mes: month,
    competencia: `2026-${String(month).padStart(2, "0")}`,
    trimestre: `${Math.ceil(month / 3)}TRI/2026`,
    status: "Em preenchimento",
    camposEntrada: {
      tipoPosicaoAprimoramento: "acompanhamento",
      melhoriasImplementadasAcumuladas: accumulated
    }
  };
}

function calculate(current, scope) {
  return formulas.calcularIndicador(indicator, rule, current, scope);
}

const march = closing(3, 1);
const april = tracking(4, 1);
const may = tracking(5, 4);
const june = closing(6, 3);
const july = tracking(7, 5);
const august = tracking(8, 5);
const september = closing(9, 2);
const trajectory = [march, april, may, june, july, august, september];

for (const [month, accumulated, expected] of [
  [1, 1, "4,55%"],
  [5, 4, "18,18%"],
  [7, 5, "22,73%"],
  [8, 6, "27,27%"]
]) {
  const item = tracking(month, accumulated);
  const result = calculate(item, [item]);
  assert.equal(result.statusCalculo, "acompanhamento");
  assert.equal(result.resultadoMensal, null, "acompanhamento não pode virar resultado oficial");
  assert.equal(result.percentualAtingidoMensal, null, "acompanhamento não pode virar atingimento oficial");
  assert.equal(result.posicaoAcompanhamentoAprimoramento, accumulated);
  assert.ok(Math.abs(result.percentualAcompanhamentoAprimoramento - (accumulated / 22)) < 1e-12);
  assert.equal(result.percentualAcompanhamentoAprimoramentoFormatado, expected);
  assert.equal(result.situacao, "Em acompanhamento");
}

const mayResult = calculate(may, [march, april, may]);
assert.equal(mayResult.posicaoAcompanhamentoAprimoramento, 4);
assert.equal(mayResult.situacao, "Em acompanhamento", "posição acima da curva não promove acompanhamento");

const juneResult = calculate(june, [march, april, may, june]);
assert.equal(juneResult.melhoriasImplementadasAcumuladas, 4, "MAR +1, MAI informativo 4 e JUN +3 devem fechar em 4");
assert.ok(Math.abs(juneResult.resultadoMensal - (4 / 22)) < 1e-12);
assert.ok(Math.abs(juneResult.percentualAtingidoMensal - (4 / 3)) < 1e-12);

assert.equal(calculate(july, trajectory.slice(0, 5)).posicaoAcompanhamentoAprimoramento, 5);
assert.equal(calculate(august, trajectory.slice(0, 6)).posicaoAcompanhamentoAprimoramento, 5);
const septemberResult = calculate(september, trajectory);
assert.equal(septemberResult.melhoriasImplementadasAcumuladas, 6, "JUL/AGO informativos não podem somar; SET +2 deve fechar em 6");
assert.ok(Math.abs(septemberResult.resultadoMensal - (6 / 22)) < 1e-12);
assert.equal(septemberResult.percentualAtingidoMensal, 1.5);

globalThis.IndicatorPeriodicity = require("../assets/js/indicator-periodicity.js");
globalThis.IndicatorFormulas = formulas;
delete require.cache[require.resolve("../assets/js/quarterly.js")];
require("../assets/js/quarterly.js");
const quarters = globalThis.QuarterlyConsolidation.consolidarAno(
  indicator,
  rule,
  trajectory.map((item) => ({ ...item, status: "Homologado" }))
);
assert.ok(Math.abs(quarters[1].resultadoTrimestral - (4 / 22)) < 1e-12);
assert.ok(Math.abs(quarters[2].resultadoTrimestral - (6 / 22)) < 1e-12);
assert.equal(quarters[2].dadosCalculados.melhoriasImplementadasAcumuladas, 6);

const context = { window: {}, console, URLSearchParams, Intl, Date };
context.window.window = context.window;
for (const file of ["indicator-periodicity.js", "currency.js", "ieo-recorrente.js", "calculations.js", "formulas.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
  context.CurrencyBR = context.window.CurrencyBR;
  context.Calculations = context.window.Calculations;
  context.IndicatorFormulas = context.window.IndicatorFormulas;
}
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "dashboard.js"), "utf8"), context, { filename: "dashboard.js" });
const dashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  regras: [rule],
  lancamentos: trajectory.map((item) => ({ ...item, status: "Homologado" }))
}).resultadosOficiais[0];
assert.equal(Number(dashboard.lancamento.id), september.id, "Dashboard deve selecionar o último fechamento quantitativo");
assert.ok(Math.abs(dashboard.resultado - (6 / 22)) < 1e-12);
assert.equal(dashboard.percentualAtingido, 1.5);

const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(launchesSource, /positionWrapper\.hidden = !\(tracking \|\| quantitative\)/);
assert.match(launchesSource, /input\.readOnly = quantitative/);
assert.match(launchesSource, /Percentual acumulado de acompanhamento/);
assert.match(launchesSource, /delete camposEntrada\.melhoriasImplementadasMes/);

console.log("indicator04-monthly-tracking.test.js: ok");
