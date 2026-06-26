const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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

async function createDataStore({ localLaunches, centralLaunches }) {
  const writes = [];
  const central = {
    lancamentos: centralLaunches,
    homologacoes: [],
    historico: []
  };
  const localStorage = createLocalStorage();
  if (localLaunches) {
    localStorage.setItem("caixaLoterias:lancamentos", JSON.stringify(localLaunches));
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
      location: { protocol: "http:" }
    },
    fetch: async (url, options = {}) => {
      if (url === "api/health") {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      const match = String(url).match(/^api\/data\/(.+)$/);
      if (!match) throw new Error(`URL inesperada: ${url}`);
      const key = decodeURIComponent(match[1]);
      if (options.method === "PUT" || options.method === "POST") {
        central[key] = JSON.parse(options.body);
        writes.push({ key, value: central[key] });
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => central[key] ?? [] };
    }
  };
  context.window.CurrencyBR = context.CurrencyBR;
  context.window.localStorage = localStorage;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "assets", "js", "dataStore.js"), "utf8"),
    context
  );

  return { DataStore: context.window.DataStore, localStorage, central, writes };
}

(async () => {
  const localLaunches = [{ id: 1, indicadorId: 1, ano: 2026, mes: 1, status: "Local correto" }];
  const centralLaunches = [{ id: 1, indicadorId: 1, ano: 2026, mes: 1, status: "Central oficial" }];

  const { DataStore, localStorage, central, writes } = await createDataStore({ localLaunches, centralLaunches });
  const loaded = await DataStore.loadJson("lancamentos");

  assert.equal(loaded[0].status, "Central oficial", "A base central deve vencer o localStorage ao carregar.");
  assert.equal(
    JSON.parse(localStorage.getItem("caixaLoterias:localBackupBeforeCentral:lancamentos")).data[0].status,
    "Local correto",
    "O localStorage divergente deve ser preservado como backup."
  );

  const publishResult = await DataStore.publicarDadosLocaisNaBaseCentral();
  assert.deepEqual(Array.from(publishResult.keys), ["lancamentos"]);
  assert.equal(central.lancamentos[0].status, "Local correto", "A publicação explícita deve promover o backup local para a base central.");
  assert.equal(writes.some((item) => item.key === "lancamentos"), true);
  assert.equal(localStorage.getItem("caixaLoterias:localBackupBeforeCentral:lancamentos"), null);

  console.log("Testes de persistência central/localStorage OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
