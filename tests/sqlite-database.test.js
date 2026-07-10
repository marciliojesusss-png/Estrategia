const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const dbPath = path.join(root, "database", "indicadores.sqlite");
const schemaPath = path.join(root, "database", "schema.sql");
const servicePath = path.join(root, "assets", "js", "databaseService.js");
const migrationReportPath = path.join(root, "database", "migration-report.json");
const adminHtml = fs.readFileSync(path.join(root, "administracao.html"), "utf8");
const reportsHtml = fs.readFileSync(path.join(root, "relatorios.html"), "utf8");
const app = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");
const service = fs.readFileSync(servicePath, "utf8");
const migrationReport = JSON.parse(fs.readFileSync(migrationReportPath, "utf8"));

assert.equal(fs.existsSync(dbPath), true);
assert.equal(fs.readFileSync(dbPath).subarray(0, 16).toString("ascii"), "SQLite format 3\u0000");
assert.equal(migrationReport.status, "ok");
assert.equal(migrationReport.counts.json.indicadores, 23);
assert.equal(migrationReport.counts.sqlite.indicadores, 23);

[
  "indicadores",
  "lancamentos",
  "homologacoes",
  "retificacoes",
  "evidencias",
  "auditoria",
  "configuracoes",
  "usuarios_validacao",
  "backups_importacao"
].forEach((table) => {
  assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
});

[
  "inicializarBanco",
  "conectarBanco",
  "criarSchemaSeNecessario",
  "carregarIndicadores",
  "salvarIndicador",
  "carregarLancamentos",
  "salvarLancamento",
  "atualizarLancamento",
  "homologarLancamento",
  "reabrirLancamento",
  "registrarRetificacao",
  "registrarAuditoria",
  "carregarResumoExecutivo",
  "carregarVisaoTrimestral",
  "verificarIntegridadeBanco"
].forEach((fn) => {
  assert.match(service, new RegExp(`\\b${fn}\\b`));
});

[
  "migrarJsonParaSql",
  "exportarSqlParaJson",
  "importarJsonParaSql",
  "criarBackupBanco",
  "baixarBancoSqlite"
].forEach((fn) => {
  assert.doesNotMatch(service, new RegExp(`\\b${fn}\\b`));
});

assert.match(adminHtml, /id="databaseLocalPanel"/);
assert.match(reportsHtml, /id="databaseLocalPanel"/);
assert.match(adminHtml, /assets\/js\/databaseService\.js/);
assert.match(reportsHtml, /assets\/js\/databaseService\.js/);
[
  "resumo-executivo.html",
  "visao-trimestral.html",
  "indicadores.html",
  "lancamentos.html",
  "homologacao.html",
  "relatorios.html",
  "administracao.html"
].forEach((page) => {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  assert.match(html, /assets\/js\/databaseService\.js/, page);
});
assert.match(app, /Modo SQL local ativo/);
assert.match(app, /\/database\/indicadores\.sqlite/);
assert.match(readme, /database\/indicadores\.sqlite/);
assert.match(readme, /migrar-para-sqlserver\.py/);
assert.equal(fs.existsSync(path.join(root, "scripts", "migrar-para-sqlserver.py")), true);
assert.equal(fs.existsSync(path.join(root, "migrar-para-sqlserver.bat")), true);
assert.match(gitignore, /!\/database\/indicadores\.sqlite/);
assert.doesNotMatch(adminHtml, /migrateJsonToSqlButton|exportSqlJsonBackupButton|backupSqliteButton|downloadSqliteButton/);
assert.doesNotMatch(reportsHtml, /migrateJsonToSqlButton|exportSqlJsonBackupButton|backupSqliteButton|downloadSqliteButton/);

const query = [
  "import sqlite3",
  `con=sqlite3.connect(r'${dbPath}')`,
  "cur=con.cursor()",
  "print(cur.execute('select count(*) from indicadores').fetchone()[0])",
  "print(cur.execute('select count(*) from lancamentos').fetchone()[0])",
  "print(cur.execute('select count(*) from homologacoes').fetchone()[0])",
  "print(cur.execute('select count(*) from auditoria').fetchone()[0])",
  "con.close()"
].join(";");

const result = spawnSync("python", ["-c", query], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);
const [indicadores, lancamentos, homologacoes, auditoria] = result.stdout.trim().split(/\r?\n/).map(Number);
assert.equal(indicadores, 23);
assert.equal(lancamentos > 0, true);
assert.equal(homologacoes > 0, true);
assert.equal(auditoria > 0, true);

console.log("Testes do banco SQLite local OK");
