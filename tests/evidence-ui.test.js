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
const migration = read("database/sqlserver/migrations/20260831_002_evidencias_lancamentos.sql");

assert(!launchView.includes('id="launchJustificativa"'), "justificativa normal deve ser removida");
assert(!launchView.includes('id="launchEvidencia"'), "textarea legado de evidencia deve ser removido");
assert(launchView.includes('id="launchObservacaoArea"'), "observacao da area deve permanecer");
assert(launchView.includes('id="launchEvidenceReference"'), "referencia/link deve estar visivel");
assert(launchView.includes('id="launchEvidenceList"'), "lista de anexos deve estar visivel");
assert(!/id="evidenceWrapper"[^>]*hidden/.test(launchView), "secao de evidencias nao pode ser escondida");

assert(launches.includes('action === "send" && regra.exigeEvidencia'), "arquivo deve ser exigido apenas no envio");
assert(launches.includes("api/lancamentos/"), "frontend deve usar API central de evidencias");
assert(launches.includes("data-remove-evidence"), "apurador deve ter acao de remocao em estado editavel");
assert(approvalView.includes('id="approvalEvidenceList"'), "homologacao deve listar anexos");
assert(!approvals.includes("data-remove-evidence"), "homologador nao pode receber acao de remocao");

assert(routes.includes("listApi"), "rota de listagem deve existir");
assert(routes.includes("uploadApi"), "rota de upload deve existir");
assert(routes.includes("removeApi"), "rota de remocao deve existir");
assert(migration.includes("COL_LENGTH"), "migration deve ser idempotente");
assert(migration.includes("DB_NAME() <> N'Estrategia'"), "migration deve proteger o banco alvo");

assert.strictEqual(read("assets/js/launches.js"), read("public/assets/js/launches.js"));
assert.strictEqual(read("assets/js/approvals.js"), read("public/assets/js/approvals.js"));
assert.strictEqual(read("assets/css/styles.css"), read("public/assets/css/styles.css"));

console.log("Testes da interface de evidencias OK");
