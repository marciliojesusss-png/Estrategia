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

async function createContext() {
  const bootstrap = loadBootstrapData(path.join(__dirname, ".."));
  const localStorage = createLocalStorage();
  const context = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    TextDecoder,
    document: {
      getElementById: () => null
    },
    localStorage,
    window: {
      location: { protocol: "file:" },
      confirm: () => true
    },
    CurrencyBR: {
      parseMoedaBR(value) {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number") return value;
        const parsed = Number(String(value).replace(/\./g, "").replace(",", ".").replace("R$", "").trim());
        return Number.isFinite(parsed) ? parsed : null;
      }
    },
    fetch: async () => ({ ok: false, status: 404, json: async () => null })
  };
  context.window.CAIXA_LOTERIAS_BOOTSTRAP_DATA = bootstrap;
  context.window.localStorage = localStorage;
  context.window.CurrencyBR = context.CurrencyBR;
  context.window.document = context.document;
  context.window.DataTransfer = undefined;

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", "js", "dataStore.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", "js", "dataService.js"), "utf8"), context);
  return context;
}

(async () => {
  const context = await createContext();
  const { DataService } = context.window;

  const base = await DataService.carregarBaseValidacao();
  assert.equal(context.localStorage.getItem("central_indicadores_base_validacao") !== null, true);
  assert.equal(base.metadata.modo, "validacao_local");
  assert.equal(base.indicadores.length, 23);

  const integridade = await DataService.verificarIntegridadeBase(base);
  assert.equal(integridade.status, "Base integra");

  const savedBase = await DataService.salvarBaseValidacao({
    ...base,
    metadata: { ...base.metadata, dataAtualizacao: "2026-06-28T15:30:00.000Z" },
    lancamentos: [{ ...base.lancamentos[0], status: "Homologado" }]
  });
  assert.equal(savedBase.lancamentos[0].status, "Homologado");

  const saved = JSON.parse(context.localStorage.getItem("central_indicadores_base_validacao"));
  assert.equal(saved.lancamentos[0].status, "Homologado");

  assert.equal("importarBaseValidacao" in DataService, false);
  assert.equal("exportarBaseValidacao" in DataService, false);
  assert.equal("criarBackupLocal" in DataService, false);
  assert.equal("restaurarBackupLocal" in DataService, false);

  const cleared = await DataService.limparDadosLocais({ skipConfirmation: true });
  assert.equal(cleared.cleared, true);
  assert.equal(context.localStorage.getItem("central_indicadores_base_validacao"), null);

  console.log("Testes da base de validacao local OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
