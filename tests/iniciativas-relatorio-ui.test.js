const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const routes = read("public/index.php");
const page = read("public/relatorio-iniciativas.php");
const view = read("views/frontend/relatorio-iniciativas.php");
const script = read("assets/js/initiativeReport.js");
const publicScript = read("public/assets/js/initiativeReport.js");
const styles = read("assets/css/styles.css");
const controller = read("app/controllers/RelatorioApiController.php");
const service = read("app/services/IniciativaRelatorioService.php");
const repository = read("app/repositories/IniciativasAcompanhamentosRepository.php");
const reports = read("assets/js/reports.js");

assert(routes.includes("/relatorios/iniciativas"), "rota da página do relatório deve existir");
assert(routes.includes("/api/relatorios/iniciativas"), "rota da API do relatório deve existir");
assert(page.includes("requirePagePermission('relatorios', 'visualizar')"), "página deve exigir permissão de relatórios");
assert(controller.includes("IniciativaRelatorioService") && controller.includes("public function iniciativas()"), "controller deve expor relatório de iniciativas");
assert(service.includes("normalizeFilters") && service.includes("scopeLabel"), "serviço deve validar filtros e escopo");
assert(repository.includes("public function reportAll") && repository.includes("homologacao_iniciativa"), "repositório deve carregar a homologação");
assert(view.includes("exportInitiativeReport") && view.includes("printInitiativeReport"), "tela deve oferecer CSV e impressão/PDF");
assert(view.includes("initiativeReportWorkflowStatus") && view.includes('value="HOMOLOGADO" selected'), "relatório deve iniciar em homologados");
assert(view.includes('id="initiativeReportList"') && !view.includes('id="initiativeReportTable"'), "relatório deve usar lista sem tabela horizontal");
assert(script.includes("function groupRows") && script.includes("initiative-report-details"), "iniciativas devem ser agrupadas com detalhes expansíveis");
assert(script.includes("Andamento da iniciativa") && script.includes("Histórico trimestral"), "andamento atual e histórico devem permanecer acessíveis");
assert(styles.includes(".initiative-report-card") && !styles.includes("min-width: 2200px"), "layout não deve exigir rolagem horizontal fixa");
assert(script.includes('type: "text/csv;charset=utf-8"') && script.includes('"\\ufeff"'), "CSV deve ser compatível com Excel");
assert(script.includes("textContent") && !script.includes("innerHTML"), "dados do relatório devem ser renderizados sem HTML livre");
assert(reports.includes('label: "Iniciativas"') && reports.includes('appUrl("relatorios/iniciativas")'), "módulo Relatórios deve apontar para iniciativas");
assert.strictEqual(script, publicScript, "asset do relatório deve ser idêntico à cópia pública");

console.log("Relatório de iniciativas: rota, escopo, governança, CSV e impressão OK");
