const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const view = read("views", "frontend", "administracao.php");
const admin = read("assets", "js", "admin.js");
const publicAdmin = read("public", "assets", "js", "admin.js");
const styles = read("assets", "css", "styles.css");
const publicStyles = read("public", "assets", "css", "styles.css");
const controller = read("app", "controllers", "AdministracaoApiController.php");
const repository = read("app", "repositories", "AdministracaoRepository.php");

assert.equal(admin, publicAdmin, "admin.js deve permanecer idêntico ao espelho público");
assert.equal(styles, publicStyles, "styles.css deve permanecer idêntico ao espelho público");
assert.match(view, /data-admin-module="cobertura">Matriz de Cobertura/);
assert.match(view, /id="accessCoverageDirectoryFilter"/);
assert.match(view, /id="accessCoverageUnitFilter"/);
assert.match(view, /id="accessCoverageFunctionFilter"/);
assert.match(view, /id="accessCoverageStatusFilter"/);
assert.match(view, /Posições de cobertura pendentes|accessCoverageCards/);
assert.match(view, /Usuários ativos por cobertura/);
assert.match(view, /admin\.js\?v=MATRIZ-COBERTURA-003/);

assert.match(admin, /adminApi\("api\/administracao\/cobertura-acessos"\)/);
assert.match(admin, /status === "Completa"/);
assert.match(admin, /status === "Reduzida"/);
assert.match(admin, /Nenhum usuário ativo nesta cobertura/);
assert.match(admin, /function accessUnitLabel\(item = \{\}\)/);
assert.match(admin, /if \(isAdministratorAccess\(item\)\) return "GERAL"/);
assert.match(admin, /profile === "unidade_apuradora" \? \(item\.unidadeApuradora \|\| "-"\) : "-"/);
assert.match(admin, /function accessDirectoryLabel\(item = \{\}\)/);
assert.match(admin, /\["homologador", "consultor_diretoria"\]\.includes\(profile\) \? \(item\.diretoriaResponsavel \|\| "-"\) : "-"/);
assert.match(admin, /escapeHtml\(accessUnitLabel\(item\)\)/);
assert.match(admin, /escapeHtml\(accessDirectoryLabel\(item\)\)/);
assert.doesNotMatch(admin, /item\.unidadeApuradora \|\| item\.sgUnidade/);
assert.doesNotMatch(admin, /Vacâncias/);
assert.doesNotMatch(admin, /Substituição temporária/);

assert.match(controller, /\$resource==='cobertura-acessos'/);
assert.match(controller, /requirePermission\(\$resource==='auditoria'\?'auditoria':'administracao'/);
assert.match(repository, /WHERE ativo=1 ORDER BY nome,matricula/);

console.log("Interface da Matriz de Cobertura somente leitura OK");
