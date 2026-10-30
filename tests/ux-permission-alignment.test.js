const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const auth = read("assets", "js", "auth.js");
const app = read("assets", "js", "app.js");
const launches = read("assets", "js", "launches.js");
const approvals = read("assets", "js", "approvals.js");
const launchView = read("views", "frontend", "lancamentos.php");
const approvalView = read("views", "frontend", "homologacao.php");
const legacyLaunchView = read("views", "lancamentos", "show.php");

const context = {
  URLSearchParams,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: { location: { search: "", href: "" } },
  document: { body: { dataset: { page: "lancamentos" } } }
};
context.window.localStorage = context.localStorage;
vm.createContext(context);
vm.runInContext(auth, context);

const profiles = {
  admin: { perfil: "Administrador" },
  unit: { perfil: "Unidade Apuradora", perfilCodigo: "unidade_apuradora" },
  reviewer: { perfil: "Diretoria Homologadora", perfilCodigo: "homologador" },
  consultant: { perfil: "Consultor da Diretoria", perfilCodigo: "consultor_diretoria" },
  company: { perfil: "Usuario Companhia", perfilCodigo: "usuario_companhia" }
};

assert.equal(context.window.Auth.canAccess("lancamentos", profiles.reviewer), true);
assert.equal(context.window.Auth.canAccess("lancamentos", profiles.consultant), true);
assert.equal(context.window.Auth.canAccess("homologacao", profiles.unit), true);
assert.equal(context.window.Auth.canAccess("lancamentos", profiles.company), false);
assert.equal(context.window.Auth.canAccess("homologacao", profiles.company), false);

const scopedIndicators = [
  { id: 1, unidadeApuradora: "SUCOL", diretoriaResponsavel: "DICOT" },
  { id: 2, unidadeApuradora: "GENOL", diretoriaResponsavel: "DICOT" },
  { id: 3, unidadeApuradora: "GERIN", diretoriaResponsavel: "DILOT" }
];
assert.deepEqual(
  Array.from(context.window.Auth.filterIndicatorsByUser(scopedIndicators, { ...profiles.reviewer, diretoriaResponsavel: "DICOT" })).map((item) => item.id),
  [1, 2]
);
assert.deepEqual(
  Array.from(context.window.Auth.filterIndicatorsByUser(scopedIndicators, { ...profiles.unit, unidadeApuradora: "SUCOL" })).map((item) => item.id),
  [1]
);

const launchContext = { window: {} };
vm.createContext(launchContext);
vm.runInContext(launches, launchContext);
const launchRules = launchContext.window.__LAUNCHES_FILTER_TEST_INTERNALS__;
assert.equal(launchRules.canManageLaunches(profiles.admin), true);
assert.equal(launchRules.canManageLaunches(profiles.unit), true);
assert.equal(launchRules.canManageLaunches(profiles.reviewer), false);
assert.equal(launchRules.canManageLaunches(profiles.consultant), false);

const approvalContext = { window: {} };
vm.createContext(approvalContext);
vm.runInContext(approvals, approvalContext);
const approvalRules = approvalContext.window.__APPROVALS_FILTER_TEST_INTERNALS__;
assert.equal(approvalRules.isUnitReader(profiles.unit), true);
assert.equal(approvalRules.isUnitReader(profiles.reviewer), false);

assert.match(app, /Lançamentos \(consulta\)/);
assert.match(app, /Histórico de Homologações/);
assert.match(launches, /function canManageLaunches/);
assert.match(launches, /profile === "administrador" \|\| profile === "unidade_apuradora"/);
assert.match(launches, /document\.getElementById\("launchEvidenceUploadControls"\)\.hidden = readOnly/);
for (const id of ["saveDraftButton", "sendApprovalButton", "requestReopenButton", "clearLaunchButton"]) {
  assert.match(launches, new RegExp(`"${id}"`));
}
assert.match(launchView, /id="launchReadOnlyNotice"/);
assert.match(launchView, /id="launchEvidenceUploadControls"/);

assert.match(approvals, /function isUnitReader/);
assert.match(approvals, /document\.getElementById\("approvalDecisionField"\)\.hidden = !decisionProfile/);
assert.match(approvals, /approveButton\.hidden = !decisionProfile/);
assert.match(approvals, /returnButton\.hidden = !decisionProfile/);
assert.match(approvals, /reopenButton\.hidden = !decisionProfile/);
assert.match(approvalView, /id="approvalReadOnlyNotice"/);
assert.match(approvalView, /id="approvalDecisionField"/);

assert.match(legacyLaunchView, /<\?php if \(\$canManage\): \?>\s*<form method="post" enctype="multipart\/form-data"/);
assert.match(legacyLaunchView, /Baixar evidência atual/);

for (const file of ["auth.js", "app.js", "launches.js", "approvals.js"]) {
  assert.strictEqual(read("assets", "js", file), read("public", "assets", "js", file), `${file} deve permanecer espelhado`);
}

console.log("Alinhamento de UX entre perfis e permissoes validado");
