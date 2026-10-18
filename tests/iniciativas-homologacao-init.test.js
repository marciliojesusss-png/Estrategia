const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function element(id = "") {
  return {
    id,
    children: [],
    dataset: {},
    hidden: false,
    classList: { add() {} },
    addEventListener() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    insertAdjacentHTML() {},
    querySelector() { return { addEventListener() {} }; },
  };
}

function appContext(page) {
  let domReady = null;
  const elements = {
    appHeader: element("appHeader"),
    appNav: element("appNav"),
  };
  const content = element("content");
  const document = {
    documentElement: { dataset: {} },
    body: Object.assign(element("body"), { dataset: { page } }),
    getElementById(id) { return elements[id] || (elements[id] = element(id)); },
    querySelector(selector) { return selector === ".content" ? content : null; },
    addEventListener(name, callback) { if (name === "DOMContentLoaded") domReady = callback; },
  };
  let storageCalls = 0;
  let loadAllCalls = 0;
  let moduleCalls = 0;
  const window = {
    APP_BASE_PATH: "",
    PageModules: {
      [page]: { async init() { moduleCalls += 1; } },
    },
    DataService: { initBaseValidacaoLocal() {} },
  };
  const context = {
    window,
    document,
    DataStore: {
      async getStorageInfo() { storageCalls += 1; return { centralAvailable: true }; },
      async loadAll() { loadAllCalls += 1; return { origem: "legada" }; },
    },
    Auth: {
      requireAuth() { return { nome: "Teste", perfil: "Administrador", perfilCodigo: "administrador" }; },
      canAccess() { return true; },
      getScopeDescription() { return ""; },
      consumeFlashMessage() { return null; },
      isAdministrador() { return true; },
    },
    URLSearchParams,
    console,
  };
  window.window = window;
  window.document = document;
  vm.runInNewContext(read("assets/js/app.js"), context);
  return {
    context,
    async start() { domReady(); await new Promise((resolve) => setImmediate(resolve)); },
    calls: () => ({ storageCalls, loadAllCalls, moduleCalls }),
  };
}

function initiativeContext(payload, ok = true) {
  const elements = {
    initiativeApprovalTable: element("initiativeApprovalTable"),
    initiativeApproveButton: element("initiativeApproveButton"),
    initiativeReturnButton: element("initiativeReturnButton"),
    initiativeReopenButton: element("initiativeReopenButton"),
  };
  const document = {
    getElementById(id) { return elements[id] || (elements[id] = element(id)); },
    querySelectorAll() { return []; },
    createElement(tag) { return element(tag); },
  };
  const errors = [];
  const window = {
    appUrl(route) { return route; },
    Auth: { canAccess() { return true; } },
    ActionFeedback: { show() {} },
    PageModules: {},
  };
  const context = {
    window,
    document,
    FormData: class FormData {},
    fetch: async () => ({ ok, async json() { return ok ? { sucesso: true, dados: payload } : { sucesso: false, mensagem: "Falha controlada" }; } }),
    console: { error(...args) { errors.push(args); } },
    URLSearchParams,
  };
  window.window = window;
  window.document = document;
  vm.runInNewContext(read("assets/js/iniciativas.js"), context);
  return { window, elements, errors };
}

(async () => {
  const approvalApp = appContext("iniciativasHomologacao");
  approvalApp.context.DataStore.getStorageInfo = async () => { throw new Error("não deveria executar"); };
  approvalApp.context.DataStore.loadAll = async () => { throw new Error("não deveria executar"); };
  await approvalApp.start();
  assert.deepStrictEqual(approvalApp.calls(), { storageCalls: 0, loadAllCalls: 0, moduleCalls: 1 }, "homologação deve inicializar sem DataStore");

  const legacyApp = appContext("indicadores");
  await legacyApp.start();
  assert.deepStrictEqual(legacyApp.calls(), { storageCalls: 1, loadAllCalls: 1, moduleCalls: 1 }, "módulo legado deve manter DataStore.loadAll");

  const rows = Array.from({ length: 27 }, (_, index) => ({
    id: `TEST_PHASE5E_${index}`,
    pilarSnapshot: "Pilar",
    codigo: `INI-TESTE-${index}`,
    tituloSnapshot: "Iniciativa",
    unidadeSnapshot: "Unidade",
    trimestre: "1TRI",
    ano: 2026,
    statusIniciativa: "EM_ANDAMENTO",
    createdAt: "2026-01-01T00:00:00",
  }));
  const populated = initiativeContext(rows);
  await populated.window.PageModules.iniciativasHomologacao.init({ user: { perfilCodigo: "administrador" } });
  assert.strictEqual(populated.elements.initiativeApprovalTable.children.length, 27, "27 registros devem gerar 27 linhas");

  const empty = initiativeContext([]);
  await empty.window.PageModules.iniciativasHomologacao.init({ user: { perfilCodigo: "administrador" } });
  assert.strictEqual(empty.elements.initiativeApprovalTable.children[0].children[0].textContent, "Nenhuma iniciativa aguardando homologação.");

  const failed = initiativeContext([], false);
  await failed.window.PageModules.iniciativasHomologacao.init({ user: { perfilCodigo: "administrador" } });
  assert.strictEqual(failed.elements.initiativeApprovalTable.children[0].children[0].textContent, "Não foi possível carregar as iniciativas para homologação.");
  assert.strictEqual(failed.errors.length, 1, "falha técnica deve ser registrada no console");

  assert.strictEqual(read("assets/js/app.js"), read("public/assets/js/app.js"), "app.js deve permanecer idêntico ao asset público");
  assert.strictEqual(read("assets/js/iniciativas.js"), read("public/assets/js/iniciativas.js"), "iniciativas.js deve permanecer idêntico ao asset público");
  console.log("FASE5E_INIT independente=OK filas=27/0/erro módulos_legados=OK assets=identicos");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
