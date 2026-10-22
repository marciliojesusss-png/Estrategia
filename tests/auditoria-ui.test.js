const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const routes = read("public/index.php");
const publicPage = read("public/auditoria.php");
const view = read("views/frontend/auditoria.php");
const script = read("assets/js/auditoria.js");
const publicScript = read("public/assets/js/auditoria.js");
const app = read("assets/js/app.js");
const styles = read("assets/css/styles.css");

assert.match(routes, /get\('\/auditoria',\$frontendPage\('auditoria\.php'\)\)/);
assert.equal(fs.existsSync(path.join(root, "views/administracao/audit.php")), false, "a auditoria não deve manter o layout legado");
assert.match(publicPage, /Auth::requirePagePermission\('auditoria', 'visualizar'\)/);
assert.match(publicPage, /render_frontend_page\('auditoria\.php'\)/);
assert.match(view, /data-page="auditoria"/);
assert.match(view, /id="appHeader"/);
assert.match(view, /id="appNav"/);
assert.match(view, /assets\/js\/auditoria\.js/);
assert.match(view, /id="auditFilterForm"/);
assert.match(view, /id="auditOperationsBody"/);
assert.match(view, /id="auditAccessBody"/);
assert.match(script, /api\/administracao\/\$\{resource\}/);
assert.match(script, /resource === "acessos" \? "matricula" : "usuario"/);
assert.match(script, /window\.PageModules\.auditoria/);
assert.match(script, /escapeHtml\(formatJson/);
assert.equal(publicScript, script, "o JavaScript publicado deve acompanhar a fonte");
assert.match(app, /independentAudit/);
assert.match(styles, /\.audit-pagination/);
assert.match(styles, /\.audit-filters/);

console.log("Interface de auditoria integrada ao shell frontend OK");
