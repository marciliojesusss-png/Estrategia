const fs = require("fs");
const path = require("path");

function ok(condition, message) {
  if (!condition) {
    console.error(`FALHA: ${message}`);
    process.exit(1);
  }
}

const root = path.resolve(__dirname, "..");
const approvals = fs.readFileSync(path.join(root, "assets/js/approvals.js"), "utf8");
const publicApprovals = fs.readFileSync(path.join(root, "public/assets/js/approvals.js"), "utf8");
const launches = fs.readFileSync(path.join(root, "assets/js/launches.js"), "utf8");
const admin = fs.readFileSync(path.join(root, "assets/js/admin.js"), "utf8");
const view = fs.readFileSync(path.join(root, "views/frontend/homologacao.php"), "utf8");
const sqlsrvAdapter = fs.readFileSync(path.join(root, "app/core/database/SqlsrvStatementAdapter.php"), "utf8");

const decisionStart = approvals.indexOf("async function persistDecision");
const decisionEnd = approvals.indexOf("async function reopenLaunch", decisionStart);
const decision = approvals.slice(decisionStart, decisionEnd);

ok(decision.includes("api/homologacoes/${encodeURIComponent(lancamento.id)}/aprovar"), "homologar deve usar endpoint oficial");
ok(decision.includes("api/homologacoes/${encodeURIComponent(lancamento.id)}/rejeitar"), "devolver deve usar endpoint oficial");
ok(!decision.includes("DataStore"), "decisao nao deve persistir por DataStore");
ok(!decision.includes("upsertHomologacao"), "decisao nao deve simular homologacao local");
ok(decision.indexOf("await apiJson") < decision.indexOf("applyOfficialLaunch"), "estado visual so deve mudar depois da API");
ok(decision.includes("observacaoDiretoria.length < 5"), "devolucao deve validar cinco caracteres");
ok(decision.includes("Lançamento homologado com sucesso."), "homologacao deve confirmar sucesso padronizado");
ok(decision.includes("Lançamento devolvido para ajuste com sucesso."), "devolucao deve confirmar sucesso padronizado");
ok(decision.includes("catch (error)"), "falhas de decisao devem ser visiveis");
ok(approvals === publicApprovals, "assets e public de homologacao devem permanecer sincronizados");
ok(view.includes("ACTION-FEEDBACK-001"), "view deve invalidar cache do feedback de acao");

ok(launches.includes("Rascunho salvo com sucesso."), "rascunho deve confirmar sucesso");
ok(launches.includes("Lançamento enviado para homologação com sucesso."), "envio deve confirmar sucesso");
ok(launches.includes("Evidência anexada com sucesso."), "anexo deve confirmar sucesso");
ok(launches.includes("Evidência removida com sucesso."), "remocao deve confirmar sucesso");
ok(launches.includes("Solicitação de reabertura enviada com sucesso."), "solicitacao deve confirmar sucesso");
ok(admin.includes("Lançamento reaberto para edição com sucesso."), "reabertura deve confirmar sucesso");
ok(admin.includes("Solicitação de reabertura negada com sucesso."), "negativa deve confirmar sucesso");
ok(admin.includes("Prazo salvo com sucesso."), "prazo deve confirmar sucesso");
ok(sqlsrvAdapter.includes("preg_match('/^\\s*SELECT\\b/i'"), "cursor buffered deve ficar restrito a consultas SELECT");

console.log("Testes do fluxo visual de homologacao e feedback OK");
