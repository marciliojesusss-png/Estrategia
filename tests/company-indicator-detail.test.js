const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const publicSource = fs.readFileSync(path.join(root, "public/assets/js/indicators.js"), "utf8");
const sourceMirror = fs.readFileSync(path.join(root, "assets/js/indicators.js"), "utf8");
const window = {
  __INDICATORS_TEST__: true,
  location: { search: "" },
};
window.window = window;
vm.runInNewContext(publicSource, { window, URLSearchParams, console });

const validate = window.IndicatorsInternals.validateInstitutionalDetailSource;

assert.doesNotThrow(() => validate({
  consulta: { institucional: true, somenteLeitura: true },
  fonte: { tipo: "institucional" },
}), "Usuário da Companhia deve aceitar a fonte institucional sanitizada");

assert.doesNotThrow(() => validate({
  consulta: { institucional: false, somenteLeitura: false },
  fonte: { tipo: "banco_central", driver: "sqlsrv" },
}), "Perfis operacionais devem continuar exigindo SQL Server");

assert.throws(() => validate({
  consulta: { institucional: true, somenteLeitura: true },
  fonte: { tipo: "banco_central" },
}), /fonte institucional protegida/, "Payload institucional não sanitizado deve ser rejeitado");

assert.throws(() => validate({
  consulta: { institucional: false, somenteLeitura: false },
  fonte: { tipo: "banco_central", driver: "sqlite" },
}), /SQL Server/, "Fonte operacional diferente de SQL Server deve ser rejeitada");

assert.equal(publicSource, sourceMirror, "Os espelhos de indicators.js devem permanecer idênticos");

console.log("company-indicator-detail.test.js: OK");
