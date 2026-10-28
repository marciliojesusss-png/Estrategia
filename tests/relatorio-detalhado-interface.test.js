const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const reportsPath = path.join(root, 'assets', 'js', 'reports.js');
const reports = fs.readFileSync(reportsPath, 'utf8');
const view = fs.readFileSync(path.join(root, 'views', 'frontend', 'relatorios.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'css', 'styles.css'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'app', 'controllers', 'RelatorioApiController.php'), 'utf8');
const service = fs.readFileSync(path.join(root, 'app', 'services', 'RelatorioIndicadorService.php'), 'utf8');
const accessPolicy = fs.readFileSync(path.join(root, 'app', 'auth', 'AccessPolicy.php'), 'utf8');
const publicReports = fs.readFileSync(path.join(root, 'public', 'relatorios.php'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets', 'js', 'app.js'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'assets', 'js', 'auth.js'), 'utf8');

assert.match(reports, /api\/relatorios\/indicador\/\$\{encodeURIComponent\(indicatorId\)\}/);
assert.match(reports, /tipo:\s*"detalhado"/);
assert.match(reports, /report-detail-link/);
assert.match(reports, /window\.print\(\)/);
assert.match(reports, /cache:\s*"no-store"/);
assert.match(reports, /\["Observação de acompanhamento",\s*indicator\.descricao\]/);
assert.doesNotMatch(reports, /\["Descrição",\s*indicator\.descricao\]/);
assert.match(reports, /if \(mode\)[\s\S]*loadDetailedReport\(mode\)[\s\S]*return;[\s\S]*DataStore\.loadAll\(\)/,
  'modo detalhado deve consultar somente o endpoint do indicador e encerrar antes do carregamento operacional');
assert.doesNotMatch(reports, /jspdf|dompdf|mPDF|TCPDF/i);

for (const id of [
  'detailedIndicatorReport', 'detailedReportTitle', 'detailedContextGeneratedAt', 'detailedContextGeneratedBy',
  'detailedIndicatorIdentification', 'detailedTrajectoryTable', 'detailedQuarterTable', 'detailedObservations',
  'detailedCurrentEvidenceTable', 'detailedHistoricalEvidenceTable', 'detailedVersionHistoryTable',
  'detailedGovernanceTable', 'printDetailedReport', 'backToConsolidatedReport'
]) assert.match(view, new RegExp(`id="${id}"`), `elemento detalhado ausente: ${id}`);

assert.match(view, /Evolu..o JAN.*DEZ/s);
assert.match(view, /Fechamentos trimestrais/);
assert.match(view, /Observa..o oficial da .rea/);
assert.match(view, /Evid.ncia da vers.o atual/);
assert.match(view, /Evid.ncias de vers.es anteriores/);
assert.match(view, /Ver hist.rico de vers.es/);
assert.match(view, /Governan.a resumida/);
assert.match(view, /RELATORIO-DETALHADO-002/);

assert.match(controller, /Cache-Control: private, no-store/);
assert.equal((controller.match(/Auth::requirePermission\('relatorios', 'visualizar', true\)/g) || []).length, 3,
  'consolidado, detalhado e governança devem compartilhar a autorização backend de Relatórios');
assert.match(service, /AccessPolicy::scopeAllows/);
assert.match(service, /Sem posicao oficial/);
assert.match(service, /Homologado legado - sem evento transacional/);
assert.match(service, /observacaoDocumental/);
assert.doesNotMatch(service, /INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/i);
assert.match(accessPolicy, /'relatorios'\s*=>\s*array\('visualizar'\s*=>\s*array\('administrador',\s*'homologador',\s*'consultor_diretoria',\s*'unidade_apuradora'\)\)/);
assert.doesNotMatch(accessPolicy, /'relatorios'\s*=>[^\r\n]*usuario_companhia/);
assert.match(publicReports, /Auth::requirePagePermission\('relatorios', 'visualizar'\)/);
assert.match(app, /\.filter\(\(\[, , key\]\)\s*=>\s*Auth\.canAccess\(key, user\)\)/);
assert.match(auth, /relatorios:\s*\["Administrador",\s*"Unidade Apuradora",\s*"Diretoria Homologadora",\s*"Consultor da Diretoria"\]/);
assert.doesNotMatch(auth, /relatorios:\s*\[[^\]]*(?:Usuario|Usuário) Companhia/);

assert.match(css, /\.detailed-identification-grid/);
assert.match(css, /\.detailed-document-grid/);
assert.match(css, /\.detailed-collapsible/);
assert.match(css, /@page\s*\{[^}]*size:\s*A4 landscape/s);
assert.match(css, /@media print[\s\S]*\.topbar, \.sidebar, \.no-print/);
assert.match(css, /\.detailed-collapsible:not\(\[open\]\) > :not\(summary\)\s*\{\s*display:\s*block !important/);

const context = {
  URLSearchParams,
  Intl,
  window: { location: { search: '?tipo=detalhado&indicador=3&ano=2026' } }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'currency.js'), 'utf8'), context);
context.CurrencyBR = context.window.CurrencyBR;
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'calculations.js'), 'utf8'), context);
context.Calculations = context.window.Calculations;
vm.runInContext(reports, context);
const internals = context.window.__REPORTS_TEST_INTERNALS__;
assert.equal(JSON.stringify(internals.detailedMode()), JSON.stringify({ indicatorId: '3', year: '2026' }));
assert.equal(internals.detailedApiUrl(3, 2026), '/api/relatorios/indicador/3?ano=2026');
assert.equal(internals.detailedReportUrl(3), '/relatorios?tipo=detalhado&indicador=3');
assert.equal(internals.evidenceDownloadUrl('evidencia v2'), '/evidencias/evidencia%20v2/download');
assert.equal(internals.formatMeasure(null, 'percentual'), '—');
assert.equal(internals.formatMeasure(0, 'percentual'), '0%');
assert.equal(internals.formatMeasure(0.7441, 'percentual'), '74,41%');
assert.equal(context.window.Calculations.formatarPercentual(2.6573), '265,73%');
assert.equal(internals.governanceLabel('Sem posicao oficial'), 'Sem posição oficial');

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
for (const relative of ['js/reports.js', 'js/auth.js', 'js/app.js', 'css/styles.css']) {
  assert.equal(hash(path.join(root, 'assets', relative)), hash(path.join(root, 'public', 'assets', relative)), `espelho dessincronizado: ${relative}`);
}

console.log('Relatorio detalhado: interface, seguranca, impressao, formatacao e espelhos validados.');
