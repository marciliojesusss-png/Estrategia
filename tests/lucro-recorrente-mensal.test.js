const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const context = {
  console: { log() {}, info() {}, warn() {}, error: console.error },
  TextDecoder,
  Uint8Array,
  fetch: async (target) => {
    const value = String(target);
    if (value.includes("ping=1")) {
      return { ok: true, status: 200, json: async () => ({ ok: true, database: "sqlsrv" }) };
    }
    const match = value.match(/[?&]collection=([^&]+)/);
    const key = match ? decodeURIComponent(match[1]) : "";
    return { ok: true, status: 200, json: async () => bootstrap[key] || [] };
  },
  window: {
    location: { protocol: "http:" },
    CAIXA_LOTERIAS_AUTH_USER: { perfilCodigo: "administrador" },
    appUrl: (route) => route
  }
};
context.window.window = context.window;
vm.createContext(context);
for (const file of ["currency.js", "lucro-recorrente.js", "dataStore.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
}

const metasMensaisEsperadas = {
  "2026-01": 89555555.56,
  "2026-02": 89555555.55,
  "2026-03": 89555555.56,
  "2026-04": 89555555.55,
  "2026-05": 89555555.56,
  "2026-06": 89555555.55,
  "2026-07": 89555555.56,
  "2026-08": 89555555.55,
  "2026-09": 89555555.56,
  "2026-10": 89555555.56,
  "2026-11": 89555555.55,
  "2026-12": 223888888.89
};

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
  assert.equal(rule.metaAnualValor, 1209000000.00);
  assert.deepEqual({ ...monthlyTargets }, metasMensaisEsperadas);
  assert.deepEqual(Array.from(rule.camposEntrada, (field) => field.nome), ["lucroLiquidoRecorrenteCompetencia"]);
  assert.equal(rule.camposEntrada[0].rotulo, "Lucro líquido recorrente da competência");
  assert.equal(rule.camposEntrada[0].obrigatorio, true);
  assert.equal(rule.camposEntradaLegados[0].nome, "lucroLiquidoRecorrenteAcumulado");
  assert.equal(rule.camposEntradaLegados[0].tipo, "moeda");
  assert.equal(Object.values(monthlyTargets).reduce((sum, value) => sum + Math.round(value * 100), 0) / 100, 1209000000.00);
  assert.equal(accumulatedTargets["2026-01"], 89555555.56);
  assert.equal(accumulatedTargets["2026-03"], 268666666.67);
  assert.equal(accumulatedTargets["2026-06"], 537333333.33);
  assert.equal(accumulatedTargets["2026-09"], 806000000.00);
  assert.equal(accumulatedTargets["2026-12"], 1209000000.00);
  assert.equal(indicator.periodicidade, "Mensal");
  assert.equal(indicator.metaAnualDescricao, "R$ 1.209.000.000,00");
  assert.equal(
    Object.values(monthlyTargets).reduce((sum, value) => sum + Math.round(value * 100), 0) / 100,
    rule.metaAnualValor,
    "a curva mensal oficial deve fechar exatamente com a meta anual"
  );

  for (let mes = 1; mes <= 12; mes += 1) {
    const key = `2026-${String(mes).padStart(2, "0")}`;
    assert.equal(metas.find((item) => Number(item.indicadorId) === 7 && Number(item.mes) === mes).metaMensal, metasMensaisEsperadas[key]);
    const launch = launches.find((item) => Number(item.indicadorId) === 7 && Number(item.mes) === mes);
    assert.equal(launch.metaMensal, metasMensaisEsperadas[key]);
    assert.equal(launch.metaReferencia, metasMensaisEsperadas[key]);
  }

  const january = launches.find((item) => Number(item.indicadorId) === 7 && Number(item.mes) === 1);
  assert.equal(january.camposEntrada.lucroLiquidoRecorrenteAcumulado, 119377680.03);
  assert.equal(january.camposEntrada.lucroLiquidoRecorrenteCompetencia, undefined, "A normalização não deve adulterar o JSON histórico antes da migration");

  const lucroApi = context.window.LucroRecorrente;
  const untouchedIeo = { indicadorId: 6, tipoCalculo: "indice_inverso" };
  assert.strictEqual(lucroApi.ajustarRegra(untouchedIeo), untouchedIeo, "A regra específica não pode alterar o IEO");
  const institutional = lucroApi.normalizarDados({
    indicadores: [{ id: 7 }],
    regrasIndicadores: [{ indicadorId: 7 }],
    lancamentos: [{ indicadorId: 7, ano: 2026, mes: 4, metaReferencia: 1 }]
  });
  assert.equal(institutional.regrasIndicadores[0].tipoCalculo, "lucro_recorrente_mensal");
  assert.equal(institutional.lancamentos[0].metaReferencia, 1, "a normalização não deve sobrescrever a meta persistida");

  const migration = fs.readFileSync(
    path.join(root, "database", "sqlserver", "migrations", "20261020_001_indicador07_curva_oficial_acumulado.sql"),
    "utf8"
  );
  assert.match(migration, /WHERE l\.indicador_id = @indicador_id[\s\S]*l\.ano = 2026/);
  assert.match(migration, /lucro_recorrente_mensal/);
  assert.match(migration, /ultima_posicao_mensal_homologada/);
  assert.match(migration, /dados_entrada_json/);
  for (const value of Object.values(metasMensaisEsperadas)) {
    assert.ok(migration.includes(value.toFixed(2)), `Migration sem a meta mensal ${value.toFixed(2)}`);
  }
  assert.match(migration, /WHERE chave = N'regrasIndicadores'/);
  assert.match(migration, /resultado_calculado/);
  assert.doesNotMatch(migration, /ALTER\s+TABLE/i);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\.lancamentos/i);
  assert.doesNotMatch(migration, /SET\s+l\.status\s*=/i);

  const historicalMigration = fs.readFileSync(
    path.join(root, "database", "sqlserver", "migrations", "20260902_001_indicador07_lucro_recorrente_mensal.sql"),
    "utf8"
  );
  assert.match(historicalMigration, /1305318247\.20/, "a migration histórica deve permanecer intacta");

  console.log("Testes do Lucro Recorrente mensal OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
