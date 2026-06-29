const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    get length() {
      return store.size;
    }
  };
}

const CURRENT_DATA_VERSION = "SQLITE-SEED-2026-06-29-001";
const CURRENT_DATA_SIGNATURE = "SQLITE-SEED-2026-06-29-001:authoritative-seed";

async function createDataStore({ localLaunches, currentVersion = false } = {}) {
  const localStorage = createLocalStorage();
  if (localLaunches) {
    localStorage.setItem("caixaLoterias:lancamentos", JSON.stringify(localLaunches));
  }
  if (currentVersion) {
    localStorage.setItem("caixaLoterias:operationalDataVersion", CURRENT_DATA_VERSION);
    localStorage.setItem("caixaLoterias:operationalDataSignature", CURRENT_DATA_SIGNATURE);
    localStorage.setItem("storageVersion", CURRENT_DATA_VERSION);
  }

  const context = {
    console,
    TextDecoder,
    CurrencyBR: {
      parseMoedaBR(value) {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number") return value;
        const parsed = Number(String(value).replace(/\./g, "").replace(",", ".").replace("R$", "").trim());
        return Number.isFinite(parsed) ? parsed : null;
      }
    },
    localStorage,
    window: {
      location: { protocol: "http:" },
      CAIXA_LOTERIAS_BOOTSTRAP_DATA: loadBootstrapData(path.join(__dirname, ".."))
    },
    fetch: async () => ({ ok: false, status: 404, json: async () => null })
  };
  context.window.CurrencyBR = context.CurrencyBR;
  context.window.localStorage = localStorage;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "assets", "js", "dataStore.js"), "utf8"),
    context
  );

  return { DataStore: context.window.DataStore, localStorage };
}

(async () => {
  const bootstrap = loadBootstrapData(path.join(__dirname, ".."));
  const localLaunches = [{ id: 1, indicadorId: 1, ano: 2026, mes: 1, status: "Local correto" }];
  const { DataStore, localStorage } = await createDataStore({ localLaunches });
  const loaded = await DataStore.loadJson("lancamentos");

  assert.equal(loaded[0].status, bootstrap.lancamentos[0].status, "Dados antigos de outro perfil devem ser substituidos pela base versionada.");
  assert.equal(localStorage.getItem("caixaLoterias:operationalDataVersion"), CURRENT_DATA_VERSION);
  assert.equal(localStorage.getItem("caixaLoterias:operationalDataSignature"), CURRENT_DATA_SIGNATURE);
  assert.equal(localStorage.getItem("caixaLoterias:localBackupBeforeCentral:lancamentos"), null);
  localStorage.setItem("caixaLoterias:centralBackupPending", "true");
  const storageInfo = await DataStore.getStorageInfo();
  assert.equal(storageInfo.hasPendingLocalBackup, false);
  assert.equal(localStorage.getItem("caixaLoterias:centralBackupPending"), null);
  await assert.rejects(
    () => DataStore.publicarDadosLocaisNaBaseCentral(),
    /Publicacao em base JSON foi desativada/
  );

  const current = await createDataStore({ localLaunches, currentVersion: true });
  const currentLoaded = await current.DataStore.loadJson("lancamentos");
  assert.equal(currentLoaded[0].status, "Local correto", "Dados locais da versao atual devem continuar preservados neste perfil.");

  const launchesWithout23 = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    indicadorId: 1,
    ano: 2026,
    mes: index + 1,
    status: "Existente"
  }));
  const completed = DataStore.completarLancamentosAusentes(
    launchesWithout23,
    [
      { id: 1, indicador: "Indicador existente", ativo: true, unidadeApuradora: "SUCOL", diretoriaResponsavel: "DICOT" },
      {
        id: 23,
        indicador: "Participação da Rede Lotérica nos Negócios",
        ativo: true,
        plano: "PN",
        pilar: "Atuação em Ecossistema",
        unidadeApuradora: "SUCOL",
        diretoriaResponsavel: "DICOT",
        metaAnualDescricao: "Resultado 2026 ≥ 102% da base 2025"
      }
    ],
    [
      { indicadorId: 23, ano: 2026, mes: 1, nomeMes: "Janeiro", metaMensal: 1.02 }
    ]
  );
  const redeLotericaLaunches = completed.filter((item) => Number(item.indicadorId) === 23);
  assert.equal(redeLotericaLaunches.length, 12, "Indicador 23 deve ganhar os 12 lançamentos mensais ausentes.");
  assert.equal(redeLotericaLaunches[0].unidadeApuradora, "SUCOL");
  assert.equal(redeLotericaLaunches[0].metaMensal, 1.02);
  assert.equal(redeLotericaLaunches[0].status, "Não iniciado");

  console.log("Testes de persistência local/SQLite OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
