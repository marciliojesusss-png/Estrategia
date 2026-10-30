const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 4);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 4);
const launches = bootstrap.lancamentos
  .filter((item) => Number(item.indicadorId) === 4 && Number(item.ano) === 2026)
  .sort((left, right) => Number(left.mes) - Number(right.mes));
const formulas = require("../assets/js/formulas.js");

function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${(Number(value) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

const calculations = {
  formatarPercentual: formatPercent,
  formatarValor(value, unit) {
    return unit === "percentual" ? formatPercent(value) : value == null ? "-" : String(value);
  },
  resolverMetaPercentualAcoesPropostas() { return null; }
};
const context = {
  window: { PageModules: {}, Calculations: calculations, IndicatorFormulas: formulas },
  Calculations: calculations,
  IndicatorFormulas: formulas
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8"), context);
const table = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

const rows = launches.map((launch) => {
  const scope = launches.filter((item) => Number(item.mes) <= Number(launch.mes));
  const calculation = formulas.calcularIndicador(indicator, rule, launch, scope);
  const performance = table.getLaunchListPerformance(rule, launch, calculation);
  return {
    month: Number(launch.mes),
    meta: formatPercent(table.getDisplayMeta(rule, launch, bootstrap.metas)),
    result: formatPercent(performance.resultado),
    performance: performance.percentual,
    calculation
  };
});

assert.deepEqual(
  rows.map(({ meta, result }) => [meta, result]),
  [
    ["4,55%", "4,55%"],
    ["4,55%", "4,55%"],
    ["4,55%", "4,55%"],
    ["13,64%", "4,55%"],
    ["13,64%", "18,18%"],
    ["13,64%", "18,18%"],
    ["18,18%", "22,73%"],
    ["18,18%", "22,73%"],
    ["18,18%", "27,27%"],
    ["27,27%", "-"],
    ["27,27%", "-"],
    ["27,27%", "-"]
  ]
);

assert.equal(rows[2].performance, 1);
assert.equal(rows[5].performance, 4 / 3);
assert.equal(rows[8].performance, 1.5);
assert.equal(rows[3].calculation.resultadoMensal, null);
assert.equal(rows[3].calculation.situacao, "Em acompanhamento");
assert.equal(rows[4].calculation.resultadoMensal, null);
assert.equal(rows[6].calculation.resultadoMensal, null);
assert.equal(rows[7].calculation.resultadoMensal, null);
assert.equal(rows[9].calculation.resultadoMensal, null);
assert.equal(rows[10].calculation.resultadoMensal, null);
assert.equal(rows[11].calculation.resultadoMensal, null);

assert.deepEqual(
  rows.slice(0, 9).map(({ calculation }) => (
    calculation.posicaoAcompanhamentoAprimoramento ?? calculation.melhoriasImplementadasAcumuladas
  )),
  [1, 1, 1, 1, 4, 4, 5, 5, 6]
);

console.log("indicator04-screen-table.test.js: ok");
