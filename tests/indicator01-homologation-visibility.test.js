const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: { PageModules: {}, location: { search: "", href: "" } },
  document: { body: { dataset: {} } }
};
context.window.localStorage = context.localStorage;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/auth.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/indicator-periodicity.js"), "utf8"), context);
context.window.IndicatorPeriodicity = context.IndicatorPeriodicity;
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/approvals.js"), "utf8"), context);

const approvals = context.window.__APPROVALS_FILTER_TEST_INTERNALS__;
const indicator = {
  id: 1,
  periodicidade: "Trimestral",
  tipoConsolidacao: "ultima_posicao_trimestral",
  mesesFechamentoTrimestral: [3, 6, 9, 12]
};
const launches = [
  { id: 1, indicadorId: 1, mes: 1, competencia: "2026-01", status: "Homologado" },
  { id: 2, indicadorId: 1, mes: 2, competencia: "2026-02", status: "Homologado" },
  { id: 3, indicadorId: 1, mes: 3, competencia: "2026-03", status: "Em preenchimento" },
  { id: 4, indicadorId: 1, mes: 4, competencia: "2026-04", status: "Em preenchimento" },
  { id: 5, indicadorId: 1, mes: 5, competencia: "2026-05", status: "Enviado para homologação" },
  { id: 6, indicadorId: 1, mes: 6, competencia: "2026-06", status: "Em preenchimento" },
  { id: 7, indicadorId: 1, mes: 7, competencia: "2026-07", status: "Retificado" },
  { id: 8, indicadorId: 1, mes: 8, competencia: "2026-08", status: "Reaberto" },
  { id: 9, indicadorId: 1, mes: 9, competencia: "2026-09", status: "Em preenchimento" },
  { id: 10, indicadorId: 1, mes: 10, competencia: "2026-10", status: "Não iniciado" },
  { id: 11, indicadorId: 1, mes: 11, competencia: "2026-11", status: "Não iniciado" },
  { id: 12, indicadorId: 1, mes: 12, competencia: "2026-12", status: "Não iniciado" }
];

const visibleIds = JSON.parse(JSON.stringify(
  approvals.homologationVisibleLaunches(launches, [indicator]).map((launch) => launch.id)
));
assert.deepEqual(visibleIds, [1, 2, 3, 6, 7, 8, 9, 12]);

const scopedIndicator = { ...indicator, diretoriaResponsavel: "DICOT", unidadeApuradora: "SUCOL" };
for (const user of [
  { perfil: "Administrador" },
  { perfil: "Diretoria Homologadora", diretoriaResponsavel: "DICOT" }
]) {
  const scoped = context.window.Auth.filterLaunchesByUser(launches, [scopedIndicator], user);
  const scopedVisibleIds = JSON.parse(JSON.stringify(
    approvals.homologationVisibleLaunches(scoped, [scopedIndicator]).map((launch) => launch.id)
  ));
  assert.equal(scopedVisibleIds.includes(1), true, `${user.perfil} deve visualizar JAN`);
  assert.equal(scopedVisibleIds.includes(2), true, `${user.perfil} deve visualizar FEV`);
}
assert.equal(approvals.isConsultableHistoricalLaunch(launches[0]), true);
assert.equal(approvals.isConsultableHistoricalLaunch(launches[1]), true);
assert.equal(approvals.isOfficialApprovalCompetence(launches[0], [indicator]), false);
assert.equal(approvals.isOfficialApprovalCompetence(launches[1], [indicator]), false);

for (const month of [3, 6, 9, 12]) {
  assert.equal(
    approvals.isOfficialApprovalCompetence(launches[month - 1], [indicator]),
    true,
    `mês ${month} deve permanecer homologável como fechamento oficial`
  );
}
for (const month of [1, 2, 4, 5, 7, 8, 10, 11]) {
  assert.equal(
    approvals.isOfficialApprovalCompetence(launches[month - 1], [indicator]),
    false,
    `mês ${month} não pode virar fechamento oficial`
  );
}

const approvalsSource = fs.readFileSync(path.join(root, "assets/js/approvals.js"), "utf8");
const homologationService = fs.readFileSync(path.join(root, "app/services/HomologacaoService.php"), "utf8");
const launchService = fs.readFileSync(path.join(root, "app/services/LancamentoService.php"), "utf8");
assert.match(approvalsSource, /isOfficialApprovalCompetence\(lancamento\)/);
assert.match(approvalsSource, /api\/lancamentos\/\$\{encodeURIComponent\(id\)\}\/reabertura/);
assert.match(approvalsSource, /api\/lancamentos\/\$\{encodeURIComponent\(lancamento\.id\)\}\/reabrir/);
assert.match(homologationService, /CompetenciaPeriodicidade::assertExpected\(\$indicator,\$before\)/);
assert.match(launchService, /Somente lançamentos homologados podem ser reabertos/);

console.log("Testes de visibilidade e reabertura do Indicador 01 OK");
