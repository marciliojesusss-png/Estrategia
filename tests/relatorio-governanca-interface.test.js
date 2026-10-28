const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const reports = fs.readFileSync(path.join(root, 'assets', 'js', 'reports.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'views', 'frontend', 'relatorios.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'css', 'styles.css'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'app', 'controllers', 'RelatorioApiController.php'), 'utf8');
const service = fs.readFileSync(path.join(root, 'app', 'services', 'RelatorioGovernancaService.php'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'app', 'repositories', 'RelatorioGovernancaRepository.php'), 'utf8');

assert.match(view, /Relat.rio de Governan.a e Auditoria/);
assert.match(view, /id="governanceFilters"/);
for (const id of ['governanceFilterYear', 'governanceFilterIndicator', 'governanceFilterCompetence', 'governanceFilterQuarter', 'governanceFilterUnit', 'governanceFilterBoard', 'governanceFilterEvent', 'governanceFilterUser', 'governanceFilterStatus', 'governanceFilterVersion']) {
  assert.match(view, new RegExp(`id="${id}"`), `filtro ausente: ${id}`);
}
assert.match(view, /governanceTimeline/);
assert.match(view, /governanceEventsTable/);
assert.match(view, /governanceCurrentTable/);
assert.match(view, /governanceEvidenceTable/);
assert.match(view, /governanceDocuments/);
assert.match(reports, /params\.get\("tipo"\) === "governanca"/);
assert.match(reports, /api\/relatorios\/governanca/);
assert.match(reports, /window\.print\(\)/);
assert.match(reports, /governanceState\.page/);
assert.match(reports, /isActiveAdministrator\(user\)/);
assert.doesNotMatch(reports, /DataTable|jspdf|dompdf|mPDF|TCPDF/i);
assert.match(css, /\.governance-timeline/);
assert.match(css, /@page\s*\{[^}]*size:\s*A4 landscape/s);
assert.match(controller, /function governanca\(\)/);
assert.match(controller, /UnexpectedValueException[\s\S]*403/);
assert.match(service, /perfil_original/);
assert.match(service, /PAGE_SIZE\s*=\s*50/);
assert.match(repository, /prepare\(\$sql\)/);
assert.doesNotMatch(repository, /\b(?:INSERT|UPDATE|DELETE|MERGE)\b/i);

const context = { URLSearchParams, Intl, window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'currency.js'), 'utf8'), context);
context.CurrencyBR = context.window.CurrencyBR;
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'calculations.js'), 'utf8'), context);
context.Calculations = context.window.Calculations;
vm.runInContext(reports, context);
const internals = context.window.__REPORTS_TEST_INTERNALS__;

assert.equal(internals.isActiveAdministrator({ perfilCodigo: 'administrador', perfilOriginalCodigo: 'administrador' }), true);
for (const user of [
  { perfilCodigo: 'unidade_apuradora', perfilOriginalCodigo: 'administrador' },
  { perfilCodigo: 'homologador', perfilOriginalCodigo: 'administrador' },
  { perfilCodigo: 'homologador', perfilOriginalCodigo: 'homologador' },
  { perfilCodigo: 'consultor_diretoria', perfilOriginalCodigo: 'consultor_diretoria' },
  { perfilCodigo: 'unidade_apuradora', perfilOriginalCodigo: 'unidade_apuradora' },
  { perfilCodigo: 'usuario_companhia', perfilOriginalCodigo: 'usuario_companhia' }
]) assert.equal(internals.isActiveAdministrator(user), false);

context.window.location = { search: '?tipo=governanca' };
assert.equal(internals.governanceMode(), true);
assert.equal(internals.governanceApiUrl({ ano: 2026, indicador: 3 }), '/api/relatorios/governanca?ano=2026&indicador=3');

const details = internals.governanceEventDetails({
  descricao: '<img src=x onerror=alert(1)>', justificativa: '<script>alert(2)</script>',
  versaoAnterior: 1, versaoNova: 2,
  alteracoes: [{ campo: 'Observacao', antes: '<b>antes</b>', depois: '<svg onload=alert(3)>' }]
});
assert.doesNotMatch(details, /<script|<img|<svg/i);
assert.match(details, /&lt;script&gt;/);
assert.match(details, /&lt;img/);
assert.match(details, /&lt;svg/);

assert.match(reports, /escapeHtml\(event\.descricao\)/);
assert.match(reports, /escapeHtml\(event\.justificativa\)/);
assert.match(reports, /escapeHtml\(item\.nomeArquivo/);
assert.match(reports, /escapeHtml\(governanceUser\(item\.usuario\)\)/);
assert.match(reports, /escapeHtml\(item\.fonte/);
assert.match(reports, /escapeHtml\(item\.observacao/);

console.log('Relatorio de governanca: interface, acesso, filtros, paginacao, impressao e XSS validados.');
