const fs = require("fs");
const path = require("path");
const vm = require("node:vm");

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

const approvalsContext = {
  URLSearchParams,
  console,
  window: {
    location: { search: "" },
    IndicatorPeriodicity: { isExpectedCompetence() { return true; } }
  }
};
vm.createContext(approvalsContext);
vm.runInContext(approvals, approvalsContext);
const approvalRules = approvalsContext.window.__APPROVALS_FILTER_TEST_INTERNALS__;
const ownLaunch = {
  id: 152,
  indicadorId: 13,
  status: "Enviado para homologação",
  usuarioResponsavel: "C118119",
  versaoAtual: 2
};
const canonicalOwnLaunch = { ...ownLaunch, status: "Enviado para homologacao" };
const independentLaunch = { ...ownLaunch, usuarioResponsavel: "C999999" };
const canonicalIndependentLaunch = { ...canonicalOwnLaunch, usuarioResponsavel: "C999999" };
const indicator = { id: 13, periodicidade: "Mensal" };
const originalAdminAsReviewer = {
  matricula: "C118119",
  perfil: "Diretoria Homologadora",
  perfilCodigo: "homologador",
  perfilOriginalCodigo: "administrador"
};
const unitParticipant = {
  matricula: "C118119",
  perfil: "Unidade Apuradora",
  perfilCodigo: "unidade_apuradora",
  perfilOriginalCodigo: "unidade_apuradora"
};
const reviewerParticipant = {
  matricula: "C118119",
  perfil: "Diretoria Homologadora",
  perfilCodigo: "homologador",
  perfilOriginalCodigo: "homologador"
};
const consultantParticipant = {
  matricula: "C118119",
  perfil: "Consultor da Diretoria",
  perfilCodigo: "consultor_diretoria",
  perfilOriginalCodigo: "consultor_diretoria"
};
const forgedContextualAdmin = {
  matricula: "C118119",
  perfil: "Administrador",
  perfilCodigo: "administrador",
  perfilOriginalCodigo: "homologador"
};
const originalAdminInAdminView = {
  matricula: "C118119",
  perfil: "Administrador",
  perfilCodigo: "administrador",
  perfilOriginalCodigo: "administrador"
};

ok(approvalRules.normalizeApprovalStatus("Enviado para homologacao") === "Enviado para homologacao", "status canonico deve ser preservado");
ok(approvalRules.normalizeApprovalStatus("Enviado para homologação") === "Enviado para homologacao", "variante acentuada deve ser normalizada para o status canonico");
ok(approvalRules.approvalStatusLabel("Enviado para homologacao") === "Enviado para homologação", "status canonico deve manter rotulo visual acentuado");
ok(approvalRules.canApproveOrReturn(canonicalOwnLaunch, originalAdminInAdminView, [indicator]), "administrador original deve aprovar lancamento proprio com status canonico");
ok(approvalRules.canApproveOrReturn(ownLaunch, originalAdminInAdminView, [indicator]), "variante acentuada do status deve permanecer compativel");
ok(!approvalRules.canApproveOrReturn(canonicalOwnLaunch, reviewerParticipant, [indicator]), "homologador participante deve permanecer bloqueado com status canonico");
ok(!approvalRules.canApproveOrReturn(canonicalOwnLaunch, consultantParticipant, [indicator]), "consultor participante deve permanecer bloqueado com status canonico");
ok(approvalRules.canApproveOrReturn(canonicalIndependentLaunch, reviewerParticipant, [indicator]), "homologador independente deve aprovar status canonico");
for (const status of ["Não iniciado", "Em preenchimento", "Retificado", "Reaberto", "Homologado", "Outro status"]) {
  ok(!approvalRules.canApproveOrReturn({ ...canonicalOwnLaunch, status }, originalAdminInAdminView, [indicator]), `status ${status} nao deve ser acionavel`);
}
ok(approvalRules.independentReviewAllowed(ownLaunch, originalAdminAsReviewer), "administrador original deve homologar lancamento proprio na visao de homologador");
ok(!approvalRules.independentReviewAllowed(ownLaunch, unitParticipant), "unidade participante nao deve homologar");
ok(!approvalRules.independentReviewAllowed(ownLaunch, reviewerParticipant), "homologador participante nao deve homologar");
ok(!approvalRules.independentReviewAllowed(ownLaunch, consultantParticipant), "consultor participante nao deve homologar");
ok(approvalRules.independentReviewAllowed(independentLaunch, reviewerParticipant), "homologador independente deve homologar");
ok(approvalRules.independentReviewAllowed(independentLaunch, originalAdminAsReviewer), "administrador nao participante deve homologar");
ok(!approvalRules.independentReviewAllowed(ownLaunch, forgedContextualAdmin), "perfil contextual adulterado nao deve conceder bypass sem perfil original administrador");
ok(approvalRules.independentReviewAllowed({ ...ownLaunch, usuarioResponsavel: "", preenchidoPor: "" }, originalAdminAsReviewer), "administrador deve homologar legado sem autoria conhecida");

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
ok(view.includes("approvals.js?v=STATUS-HOMOLOGACAO-001"), "view deve invalidar o cache da normalizacao do status de homologacao");

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
