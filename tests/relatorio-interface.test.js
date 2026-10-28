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
const app = fs.readFileSync(path.join(root, 'assets', 'js', 'app.js'), 'utf8');

assert.match(reports, /api\/relatorios\/consolidado/);
assert.match(reports, /window\.print\(\)/);
assert.match(reports, /cache:\s*"no-store"/);
assert.match(reports, /DataStore\.loadAll\(\)/);
assert.match(reports, /if \(isActiveAdministrator\(user\)\)/);
assert.doesNotMatch(reports, /DataTable|jspdf|dompdf|mPDF|TCPDF/i);
assert.match(view, /Relat.rio Consolidado de Indicadores/);
assert.match(view, /operationalReportsSection/);
assert.match(view, /Consulta\/Exporta..o Operacional/);
assert.match(view, /officialReportFilterSummary/);
assert.match(view, /reportContextGeneratedAt/);
assert.match(view, /reportContextGeneratedBy/);
assert.match(view, /<th[^>]*>Meta oficial<\/th>/);
assert.match(view, /<th[^>]*>Resultado oficial<\/th>/);
assert.match(view, /<th[^>]*>Governan.a<\/th>/);
assert.match(css, /@page\s*\{[^}]*size:\s*A4 landscape/s);
assert.match(css, /@media print/);
assert.match(css, /\.topbar, \.sidebar, \.no-print, \.report-screen-heading\s*\{\s*display:\s*none/s);
assert.match(css, /thead\s*\{\s*display:\s*table-header-group/);
assert.match(app, /independentReports/);

const context = {
  URLSearchParams,
  Intl,
  window: {}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'currency.js'), 'utf8'), context);
context.CurrencyBR = context.window.CurrencyBR;
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'calculations.js'), 'utf8'), context);
context.Calculations = context.window.Calculations;
vm.runInContext(reports, context);
const internals = context.window.__REPORTS_TEST_INTERNALS__;
assert.equal(internals.isActiveAdministrator({ perfilCodigo: 'administrador', perfilOriginalCodigo: 'administrador' }), true);
assert.equal(internals.isActiveAdministrator({ perfilCodigo: 'homologador', perfilOriginalCodigo: 'administrador' }), false);
assert.equal(internals.formatMeasure(null, 'percentual'), '—');
assert.equal(internals.formatMeasure(0, 'percentual'), '0%');
assert.equal(internals.formatMeasure(0.7441, 'percentual'), '74,41%');
assert.equal(context.window.Calculations.formatarPercentual(2.6573), '265,73%');
assert.equal(internals.governanceLabel('Sem posicao oficial'), 'Sem posição oficial');

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
for (const relative of ['js/reports.js', 'js/auth.js', 'js/app.js', 'css/styles.css']) {
  assert.equal(
    hash(path.join(root, 'assets', relative)),
    hash(path.join(root, 'public', 'assets', relative)),
    `espelho dessincronizado: ${relative}`
  );
}

console.log('Relatorio consolidado: interface, impressao A4 e espelhos validados.');
