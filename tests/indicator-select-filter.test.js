const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadInternals(file, globalName) {
  const context = { window: { PageModules: {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "indicator-periodicity.js"), "utf8"), context);
  context.window.IndicatorPeriodicity = context.IndicatorPeriodicity;
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context);
  return context.window[globalName];
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const indicadores = [
  { id: 9, numero: 9, indicador: "09. Vendas Pix" },
  { id: 3, numero: 3, indicador: "Canais Digitais" },
  { id: 17, numero: 17, indicador: "Repasse Social" },
  { id: 8, numero: 8, indicador: "08 - Vendas Canais Digitais" }
];
const lancamentos = [
  { id: "L9", indicadorId: "9", nomeMes: "Maio", mes: 5, status: "Não iniciado" },
  { id: "L3", indicadorId: 3, nomeMes: "Maio", mes: 5, status: "Enviado para homologação" },
  { id: "L8", indicadorId: 8, nomeMes: "Junho", mes: 6, status: "Não iniciado" },
  { id: "LX", indicadorId: 99, nomeMes: "Maio", mes: 5, status: "Não iniciado" }
];
const expectedOptions = [
  { value: "3", label: "03 - Canais Digitais" },
  { value: "8", label: "08 - Vendas Canais Digitais" },
  { value: "9", label: "09 - Vendas Pix" }
];

for (const module of [
  { file: "launches.js", global: "__LAUNCHES_FILTER_TEST_INTERNALS__" },
  { file: "approvals.js", global: "__APPROVALS_FILTER_TEST_INTERNALS__" }
]) {
  const internals = loadInternals(module.file, module.global);
  assert.deepEqual(plain(internals.indicatorFilterOptions(lancamentos, indicadores)), expectedOptions);

  assert.deepEqual(
    plain(internals.filterLaunches(lancamentos, { mes: "Todos", status: "Todos", indicador: "" })).map((item) => item.id),
    ["L9", "L3", "L8", "LX"]
  );
  assert.deepEqual(
    plain(internals.filterLaunches(lancamentos, { mes: "Maio", status: "Todos", indicador: "9" })).map((item) => item.id),
    ["L9"]
  );
  assert.deepEqual(
    plain(internals.filterLaunches(lancamentos, { mes: "Todos", status: "Enviado para homologação", indicador: "3" })).map((item) => item.id),
    ["L3"]
  );
  assert.deepEqual(
    plain(internals.filterLaunches(lancamentos, { mes: "Junho", status: "Não iniciado", indicador: "8" })).map((item) => item.id),
    ["L8"]
  );
  assert.equal(internals.filterLaunches(lancamentos, { mes: "Maio", status: "Não iniciado", indicador: "8" }).length, 0);
  assert.deepEqual(
    plain(internals.officialOperationalLaunches(
      [
        { id: "L18APR", indicadorId: 18, mes: 4 },
        { id: "L18JUN", indicadorId: 18, mes: 6 }
      ],
      [{ id: 18, periodicidade: "Trimestral" }]
    )).map((item) => item.id),
    ["L18JUN"],
    "Abril não pode permanecer na fila operacional do indicador trimestral."
  );
}

for (const view of ["lancamentos.php", "homologacao.php"]) {
  const html = fs.readFileSync(path.join(root, "views", "frontend", view), "utf8");
  assert.match(html, /<label>Indicador <select data-filter="indicador"><\/select><\/label>/);
}

console.log("Testes do filtro de indicador em lançamentos e homologação OK");
