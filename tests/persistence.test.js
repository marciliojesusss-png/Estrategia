const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createDataStore({ backendAvailable = true } = {}) {
  const requests = [];
  const localStorage = {
    getItem() { throw new Error("A fonte local nao deve ser lida."); },
    setItem() { throw new Error("A fonte local nao deve ser gravada."); },
    removeItem() { throw new Error("A fonte local nao deve ser alterada."); },
    get length() { return 0; }
  };
  const launches = [{ id: 1, indicadorId: 1, competencia: "2026-01", status: "Homologado" }];
  const context = {
    console,
    TextDecoder,
    localStorage,
    window: {
      location: { protocol: "http:" },
      CAIXA_LOTERIAS_AUTH_USER: { perfilCodigo: "administrador", csrfToken: "teste" },
      localStorage
    },
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      if (!backendAvailable) throw new Error("SQL Server indisponivel");
      if (String(url).includes("ping=1")) {
        return { ok: true, status: 200, json: async () => ({ ok: true, database: "sqlsrv", mode: "php_sqlserver" }) };
      }
      if (options.method === "POST") {
        return { ok: true, status: 200, json: async () => ({ ok: true, persisted: true }) };
      }
      return { ok: true, status: 200, json: async () => launches };
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", "js", "dataStore.js"), "utf8"), context);
  return { DataStore: context.window.DataStore, requests, launches };
}

(async () => {
  const connected = createDataStore();
  const loaded = await connected.DataStore.loadJson("lancamentos");
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].status, "Homologado");
  assert.ok(connected.requests.some((item) => String(item.url).includes("ping=1")));
  assert.ok(connected.requests.some((item) => String(item.url).includes("collection=lancamentos")));

  const storage = await connected.DataStore.getStorageInfo();
  assert.equal(storage.mode, "php_sqlserver");
  assert.equal(storage.localDatabase, "SQL Server");
  assert.equal(storage.hasPendingLocalBackup, false);

  await connected.DataStore.saveLocal("lancamentos", connected.launches);
  assert.ok(connected.requests.some((item) => item.options.method === "POST"));

  const disconnected = createDataStore({ backendAvailable: false });
  await assert.rejects(() => disconnected.DataStore.loadJson("lancamentos"), /SQL Server indisponivel/);

  console.log("Persistencia exclusiva no SQL Server OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
