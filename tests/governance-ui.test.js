const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

for (const file of ["auth.js", "dataStore.js", "dashboard.js", "indicators.js", "executiveSummary.js", "admin.js", "approvals.js", "launches.js", "databaseService.js"]) {
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
assert.match(approvals, /participou do preenchimento ou envio/);
assert.match(approvals, /id="reopenLaunchJustification"/);
assert.match(approvals, /document\.getElementById\("reopenLaunchJustification"\)\.value = ""/);
assert.match(approvals, /Justificativa da reabertura/);
assert.doesNotMatch(approvals, /body: JSON\.stringify\(\{ justificativa: observacaoDiretoria \}\)/);

const admin = read("assets", "js", "admin.js");
assert.match(admin, /fechamentoCa: "Fechamento para o Conselho de Administração"/);
assert.match(admin, /fechamentosConselhoAdministracao/);
assert.match(admin, /dataFechamento >= values\.dataReuniao/);
assert.match(admin, /consultor_diretoria/);
assert.match(admin, /id="adminReopenJustification"/);
assert.match(admin, /Este período já foi fechado para apresentação ao Conselho de Administração/);

const launches = read("assets", "js", "launches.js");
assert.match(launches, /exceptionalCorrectionCycleActive/);
assert.match(launches, /api\/lancamentos\/\$\{encodeURIComponent\(lancamento\.id\)\}\/edicao/);
assert.match(launches, /Alteração indisponível\. Esta competência foi fechada/);
assert.match(launches, /requestButton\.hidden = true/);

const databaseService = read("assets", "js", "databaseService.js");
assert.match(databaseService, /api\/lancamentos\/\$\{encodeURIComponent\(id\)\}\/reabrir/);
assert.doesNotMatch(databaseService, /status: "Reaberto"/);

assert.match(read("views", "frontend", "administracao.php"), /admin\.js\?v=GOVERNANCA-CA-002/);
assert.match(read("views", "frontend", "homologacao.php"), /approvals\.js\?v=GOVERNANCA-CA-002/);
assert.match(read("views", "frontend", "lancamentos.php"), /launches\.js\?v=GOVERNANCA-CA-002/);

for (const view of ["administracao.php", "homologacao.php", "indicadores.php", "lancamentos.php", "login.php", "relatorios.php", "resumo-executivo.php", "visao-trimestral.php"]) {
  const source = read("views", "frontend", view);
  assert.match(source, /auth\.js\?v=GOVERNANCA-CA-001/);
  assert.match(source, /dataStore\.js\?v=GOVERNANCA-CA-001/);
}

console.log("Interface de governança, consultor e fechamento CA OK");
