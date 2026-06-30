const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = {
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  window: { location: { href: "" } },
  document: { body: { dataset: { page: "lancamentos" } } }
};
context.window.localStorage = context.localStorage;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "auth.js"), "utf8"), context);

const indicadores = [
  {
    id: 22,
    indicador: "Arrecadacao Gerada com o Ecossistema",
    unidadeApuradora: "SUCOL",
    diretoriaResponsavel: "DICOT"
  },
  {
    id: 99,
    indicador: "Indicador de outra unidade",
    unidadeApuradora: "GERIN",
    diretoriaResponsavel: "DICOT"
  }
];

const lancamentos = [
  { id: 253, indicadorId: "22", ano: 2026, mes: 1, status: "Nao iniciado" },
  { id: 999, indicadorId: 99, ano: 2026, mes: 1, status: "Nao iniciado" }
];

const user = {
  perfil: "Unidade Apuradora",
  unidade: "Unidade sucol ",
  diretoriaResponsavel: ""
};

const scopedIndicators = context.window.Auth.filterIndicatorsByUser(indicadores, user);
assert.deepEqual(scopedIndicators.map((item) => item.id), [22]);

const scopedLaunches = context.window.Auth.filterLaunchesByUser(lancamentos, indicadores, user);
assert.deepEqual(scopedLaunches.map((item) => item.id), [253]);

assert.equal(context.window.Auth.canAccess("lancamentos", user), true);

const bootstrap = loadBootstrapData(root);
const sucolUser = bootstrap.usuarios.find((item) => item.nome === "Unidade SUCOL");
const bootstrapIndicators = context.window.Auth.filterIndicatorsByUser(bootstrap.indicadores, sucolUser);
assert.equal(
  bootstrapIndicators.some((item) => Number(item.id) === 22 && item.indicador === "Arrecadação Gerada com o Ecossistema"),
  true
);

const bootstrapLaunches = context.window.Auth.filterLaunchesByUser(bootstrap.lancamentos, bootstrap.indicadores, sucolUser);
assert.equal(bootstrapLaunches.some((item) => Number(item.indicadorId) === 22), true);

console.log("Testes de escopo de autenticacao OK");
