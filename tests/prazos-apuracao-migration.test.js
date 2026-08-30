const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20260829_001_prazos_apuracao.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const schema = fs.readFileSync(path.join(root, "database", "sqlserver", "schema.sql"), "utf8");
const admin = fs.readFileSync(path.join(root, "assets", "js", "admin.js"), "utf8");
const executive = fs.readFileSync(path.join(root, "assets", "js", "executiveSummary.js"), "utf8");
const view = fs.readFileSync(path.join(root, "views", "frontend", "administracao.php"), "utf8");

assert.match(migration, /IF OBJECT_ID\(N'dbo\.prazos_apuracao', N'U'\) IS NULL/);
assert.match(migration, /CONSTRAINT uq_prazos_apuracao_competencia UNIQUE \(competencia\)/);
assert.match(migration, /CONSTRAINT ck_prazos_apuracao_datas CHECK/);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\.prazos_apuracao/i);
assert.doesNotMatch(migration, /localhost|password|senha|connection string/i);
assert.match(schema, /CREATE TABLE dbo\.prazos_apuracao/);
assert.match(view, /data-admin-module="prazosApuracao"/);
assert.match(admin, /api\/prazos-apuracao/);
assert.match(executive, /deadline-alert/);
assert.match(executive, /deadlineStatusForResult/);

console.log("Migration e integração dos prazos de apuração validadas");

