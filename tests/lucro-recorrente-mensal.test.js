const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  key(index) { return [...storage.keys()][index] ?? null; },
  get length() { return storage.size; }
};
const context = {
  console: { log() {}, warn() {}, error: console.error },
  TextDecoder,
  Uint8Array,
  localStorage,
  window: {
    location: { protocol: "file:" },
    CAIXA_LOTERIAS_BOOTSTRAP_DATA: loadBootstrapData(root)
  }
};
context.window.window = context.window;
context.window.localStorage = localStorage;
vm.createContext(context);
for (const file of ["currency.js", "dataStore.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
}

(async () => {
  const rules = await context.window.DataStore.loadJson("regrasIndicadores");
  const indicators = await context.window.DataStore.loadJson("indicadores");
  const metas = await context.window.DataStore.loadJson("metas");
  const launches = await context.window.DataStore.loadJson("lancamentos");
  const rule = rules.find((item) => Number(item.indicadorId) === 7);
  const indicator = indicators.find((item) => Number(item.id) === 7);
  const monthlyTargets = rule.parametrosCalculo.metasMensaisPorCompetencia;
  const accumulatedTargets = rule.parametrosCalculo.metasAcumuladasPorCompetencia;

  assert.equal(rule.tipoCalculo, "lucro_recorrente_mensal");
  assert.equal(rule.tipoConsolidacao, "ultima_posicao_mensal_homologada");
  assert.equal(rule.metaAnualValor, 1305318247.20);
  assert.deepEqual(Array.from(rule.camposEntrada, (field) => field.nome), ["lucroLiquidoRecorrenteCompetencia"]);
  assert.equal(rule.camposEntrada[0].rotulo, "Lucro líquido recorrente da competência");
  assert.equal(Object.values(monthlyTargets).reduce((sum, value) => sum + Math.round(value * 100), 0) / 100, 1305318247.20);
  assert.equal(accumulatedTargets["2026-06"], 554969793.69);
  assert.equal(accumulatedTargets["2026-12"], 1305318247.20);
  assert.equal(indicator.periodicidade, "Mensal");
  assert.equal(indicator.metaAnualDescricao, "R$ 1.305.318.247,20");
  assert.equal(metas.find((item) => Number(item.indicadorId) === 7 && Number(item.mes) === 6).metaMensal, 106104677.05);

  const january = launches.find((item) => Number(item.indicadorId) === 7 && Number(item.mes) === 1);
  assert.equal(january.metaMensal, 90811101.33);
  assert.equal(january.camposEntrada.lucroLiquidoRecorrenteAcumulado, 119377680.03);
  assert.equal(january.camposEntrada.lucroLiquidoRecorrenteCompetencia, undefined, "A normalização não deve adulterar o JSON histórico antes da migration");

  const migration = fs.readFileSync(
    path.join(root, "database", "sqlserver", "migrations", "20260902_001_indicador07_lucro_recorrente_mensal.sql"),
    "utf8"
  );
  assert.match(migration, /WHERE l\.indicador_id = @indicador_id[\s\S]*l\.ano = 2026/);
  assert.match(migration, /JSON_MODIFY[\s\S]*lucroLiquidoRecorrenteCompetencia/);
  assert.match(migration, /lucroLiquidoRecorrenteAcumulado/);
  assert.doesNotMatch(migration, /ALTER\s+TABLE/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\.lancamentos/i);
  assert.doesNotMatch(migration, /SET\s+l\.status\s*=/i);

  console.log("Testes do Lucro Recorrente mensal OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
