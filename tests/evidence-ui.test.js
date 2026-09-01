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
assert(launchView.includes('id="launchEvidencePendingStatus"'), "estado de arquivo selecionado deve estar visivel");
assert(!/id="evidenceWrapper"[^>]*hidden/.test(launchView), "secao de evidencias nao pode ser escondida");

assert(launches.includes('action === "send" && regra.exigeEvidencia'), "arquivo deve ser exigido apenas no envio");
assert(launches.includes("async function uploadPendingEvidence(lancamento)"), "upload pendente deve usar fluxo centralizado");
assert(launches.includes('validateLaunch(indicador, action, { allowPendingEvidence: true })'), "envio deve aceitar o arquivo pendente apenas antes do upload");
assert(launches.includes("await uploadPendingEvidence(lancamento)"), "salvar e adicionar devem processar o arquivo pendente");
assert(launches.includes("if (!validateLaunch(indicador, action)) return;"), "validacao final deve exigir evidencia confirmada pelo backend");
assert(launches.includes("O lançamento não foi enviado para homologação"), "falha no upload deve impedir o envio");
assert(launches.includes("O arquivo continua selecionado para nova tentativa"), "falha no rascunho deve preservar e explicar o arquivo pendente");
assert(launches.includes('addEventListener("change", () => renderPendingEvidenceStatus())'), "selecao deve exibir feedback antes do upload");
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
