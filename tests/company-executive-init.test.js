const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const executiveSource = fs.readFileSync(path.join(root, "assets/js/executiveSummary.js"), "utf8");

function element(id = "") {
  return {
    id,
    className: "",
    dataset: {},
    hidden: false,
    innerHTML: "",
    classList: { add() {} },
    addEventListener() {},
    insertAdjacentHTML() {},
    querySelector() { return { addEventListener() {} }; },
  };
}

function createContext(user, page = "resumoExecutivo") {
  let domReady;
  let storageCalls = 0;
  let loadAllCalls = 0;
  let moduleCalls = 0;
  const errors = [];
  const elements = { appHeader: element("appHeader"), appNav: element("appNav") };
  const content = element("content");
  const document = {
    documentElement: { dataset: {} },
    body: Object.assign(element("body"), { dataset: { page } }),
    getElementById(id) { return elements[id] || (elements[id] = element(id)); },
    querySelector(selector) { return selector === ".content" ? content : null; },
    addEventListener(name, callback) { if (name === "DOMContentLoaded") domReady = callback; },
  };
  const window = {
    APP_BASE_PATH: "",
    location: { search: "" },
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
      async loadAll() { loadAllCalls += 1; return {}; },
    },
    Auth: {
      requireAuth() { return user; },
      canAccess() { return true; },
      getScopeDescription() { return ""; },
      consumeFlashMessage() { return null; },
      isAdministrador(profile) { return profile === "Administrador"; },
    },
    URLSearchParams,
    console: { error(error) { errors.push(error); } },
  };
  window.window = window;
  window.document = document;
  vm.runInNewContext(appSource, context);
  return {
    async start() {
      domReady();
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(errors, [], "a inicializacao nao deve falhar");
    },
    calls() { return { storageCalls, loadAllCalls, moduleCalls }; },
  };
}

async function loadExecutivePayload(user, data) {
  const window = {
    __EXECUTIVE_SUMMARY_TEST__: true,
    APP_BASE_PATH: "",
    location: { search: "" },
    fetch: async () => ({
      ok: true,
      async json() { return { sucesso: true, dados: data }; },
    }),
  };
  const context = {
    window,
    document: {},
    URLSearchParams,
    console,
    setTimeout,
    clearTimeout,
  };
  window.window = window;
  vm.runInNewContext(executiveSource, context);
  return window.ExecutiveSummaryInternals.loadCentralExecutiveData("general", user);
}

(async () => {
  const company = createContext({
    nome: "Companhia",
    perfil: "Usuario Companhia",
    perfilCodigo: "usuario_companhia",
  });
  await company.start();
  assert.deepEqual(company.calls(), { storageCalls: 0, loadAllCalls: 0, moduleCalls: 1 },
    "Companhia deve iniciar o Resumo Executivo sem consultar storage operacional");

  for (const user of [
    { nome: "Unidade", perfil: "Unidade Apuradora", perfilCodigo: "unidade_apuradora" },
    { nome: "Homologador", perfil: "Diretoria Homologadora", perfilCodigo: "homologador" },
    { nome: "Consultor", perfil: "Consultor da Diretoria", perfilCodigo: "consultor_diretoria" },
  ]) {
    const scoped = createContext(user);
    await scoped.start();
    assert.deepEqual(scoped.calls(), { storageCalls: 0, loadAllCalls: 0, moduleCalls: 1 },
      `${user.perfilCodigo} nao deve depender do diagnostico administrativo`);
  }

  const administrator = createContext({
    nome: "Administrador",
    perfil: "Administrador",
    perfilCodigo: "administrador",
    perfilOriginalCodigo: "administrador",
  });
  await administrator.start();
  assert.deepEqual(administrator.calls(), { storageCalls: 1, loadAllCalls: 0, moduleCalls: 1 },
    "Administrador ativo deve manter o diagnostico tecnico");

  const simulatedCompany = createContext({
    nome: "Administrador simulado",
    perfil: "Usuario Companhia",
    perfilCodigo: "usuario_companhia",
    perfilOriginalCodigo: "administrador",
    podeAlternarVisao: true,
    visaoAdministrador: "usuario_companhia",
  });
  await simulatedCompany.start();
  assert.deepEqual(simulatedCompany.calls(), { storageCalls: 0, loadAllCalls: 0, moduleCalls: 1 },
    "a visao simulada deve seguir o perfil ativo, nao o perfil original");

  const basePayload = {
    indicadores: Array.from({ length: 23 }, (_, index) => ({ id: index + 1 })),
    lancamentos: [],
    regrasIndicadores: [],
    frequenciasCobrancaOperacional: [],
    prazos: [],
    escopoVisualizacao: "geral",
  };
  const institutionalPayload = await loadExecutivePayload(
    { perfilCodigo: "usuario_companhia", perfilOriginalCodigo: "administrador" },
    { ...basePayload, acessoInstitucional: true, fonte: { tipo: "institucional" } },
  );
  assert.equal(institutionalPayload.indicadores.length, 23, "Companhia deve receber os 23 indicadores institucionais");
  assert.deepEqual(institutionalPayload.fonte, { tipo: "institucional" }, "Companhia deve receber fonte minima");
  assert.equal("driver" in institutionalPayload.fonte, false, "Companhia nao deve receber fonte.driver");
  assert.equal("banco" in institutionalPayload.fonte, false, "Companhia nao deve receber fonte.banco");

  const operationalPayload = await loadExecutivePayload(
    { perfilCodigo: "administrador", perfilOriginalCodigo: "administrador" },
    { ...basePayload, fonte: { tipo: "banco_central", driver: "sqlsrv", banco: "Estrategia" } },
  );
  assert.equal(operationalPayload.fonte.driver, "sqlsrv", "Administrador deve manter a validacao operacional vigente");

  const databaseApi = fs.readFileSync(path.join(root, "api/database.php"), "utf8");
  assert.match(databaseApi, /\(\$_GET\['ping'\] \?\? ''\) !== ''[\s\S]*=== 'usuario_companhia'[\s\S]*403/,
    "o ping tecnico deve continuar bloqueado para Companhia");
  assert.equal(
    fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8"),
    fs.readFileSync(path.join(root, "public/assets/js/app.js"), "utf8"),
    "os espelhos de app.js devem permanecer identicos",
  );

  console.log("company-executive-init.test.js: OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
