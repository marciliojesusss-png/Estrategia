const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const launchView = read("views/frontend/lancamentos.php");
const approvalView = read("views/frontend/homologacao.php");
const launches = read("assets/js/launches.js");
const approvals = read("assets/js/approvals.js");
const routes = read("public/index.php");

assert(launchView.includes('id="launchEvidenceHistoryList"'), "lancamento deve expor historico separado");
assert(approvalView.includes('id="approvalEvidenceHistoryList"'), "homologacao deve expor historico separado");
assert(launchView.includes("não comprova a versão atual"), "lancamento deve alertar sobre evidencia historica");
assert(approvalView.includes("não comprova a versão atual"), "homologacao deve alertar sobre evidencia historica");
assert(launches.includes("evidencias/historico"), "lancamento deve carregar endpoint historico");
assert(approvals.includes("evidencias/historico"), "homologacao deve carregar endpoint historico");
assert(routes.includes("listHistoryApi"), "rota historica deve estar registrada");

const launchHistoryStart = launches.indexOf("function renderHistoricalEvidenceList");
const launchHistoryEnd = launches.indexOf("async function loadEvidenceList", launchHistoryStart);
assert(launchHistoryStart >= 0 && launchHistoryEnd > launchHistoryStart, "render historico do lancamento deve existir");
assert(!launches.slice(launchHistoryStart, launchHistoryEnd).includes("data-remove-evidence"), "historico do lancamento nao pode permitir remocao");

const approvalHistoryStart = approvals.indexOf("function renderApprovalHistoricalEvidenceList");
const approvalHistoryEnd = approvals.indexOf("async function loadApprovalEvidences", approvalHistoryStart);
assert(approvalHistoryStart >= 0 && approvalHistoryEnd > approvalHistoryStart, "render historico da homologacao deve existir");
assert(!approvals.slice(approvalHistoryStart, approvalHistoryEnd).includes("data-remove-evidence"), "historico da homologacao nao pode permitir remocao");

assert.strictEqual(read("assets/js/launches.js"), read("public/assets/js/launches.js"));
assert.strictEqual(read("assets/js/approvals.js"), read("public/assets/js/approvals.js"));
assert.strictEqual(read("assets/css/styles.css"), read("public/assets/css/styles.css"));

console.log("Interface do versionamento de evidencias OK");
