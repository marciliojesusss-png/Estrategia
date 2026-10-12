const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

for (const file of ["auth.js", "dataStore.js", "dashboard.js", "indicators.js", "executiveSummary.js", "admin.js", "approvals.js"]) {
  assert.equal(read("assets", "js", file), read("public", "assets", "js", file), `${file} deve estar sincronizado`);
}

const authContext = {
  URLSearchParams,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: { location: { search: "", href: "" } },
  document: { body: { dataset: { page: "homologacao" } } }
};
vm.createContext(authContext);
vm.runInContext(read("assets", "js", "auth.js"), authContext);

const consultant = { perfil: "Consultor da Diretoria", perfilCodigo: "consultor_diretoria", diretoriaResponsavel: "DIFIR" };
assert.equal(authContext.window.Auth.canAccess("homologacao", consultant), true);
assert.equal(authContext.window.Auth.canAccess("lancamentos", consultant), false);
assert.deepEqual(
  Array.from(authContext.window.Auth.filterIndicatorsByUser([
    { id: 1, diretoriaResponsavel: "DIFIR" },
    { id: 2, diretoriaResponsavel: "DICOT" }
  ], consultant), (item) => item.id),
  [1]
);

const approvals = read("assets", "js", "approvals.js");
assert.match(approvals, /Consultor da Diretoria/);
assert.match(approvals, /api\/lancamentos\/\$\{encodeURIComponent\(id\)\}\/reabertura/);
assert.match(approvals, /Reabrir para edição/);
assert.doesNotMatch(approvals, /reopenButton\.textContent[^\n]+Solicitar reabertura/);
assert.match(approvals, /preenchido ou enviado por você/);

const admin = read("assets", "js", "admin.js");
assert.match(admin, /fechamentoCa: "Fechamento para o Conselho de Administração"/);
assert.match(admin, /fechamentosConselhoAdministracao/);
assert.match(admin, /dataFechamento >= values\.dataReuniao/);
assert.match(admin, /consultor_diretoria/);

for (const view of ["administracao.php", "homologacao.php", "indicadores.php", "lancamentos.php", "login.php", "relatorios.php", "resumo-executivo.php", "visao-trimestral.php"]) {
  const source = read("views", "frontend", view);
  assert.match(source, /auth\.js\?v=GOVERNANCA-CA-001/);
  assert.match(source, /dataStore\.js\?v=GOVERNANCA-CA-001/);
}

console.log("Interface de governança, consultor e fechamento CA OK");
