const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(__dirname, "../database/sqlserver/migrations/20261109_001_indicador22_meta_julho.sql"),
  "utf8"
);

assert.match(migration, /SET XACT_ABORT ON/);
assert.match(migration, /BEGIN TRY[\s\S]*BEGIN TRANSACTION[\s\S]*COMMIT TRANSACTION/);
assert.match(migration, /2026-01[\s\S]*2026-06[\s\S]*1\.10/);
assert.match(migration, /2026-07[\s\S]*2026-12[\s\S]*1\.01/);
assert.match(migration, /0\.007843218609671960/);
assert.match(migration, /0\.789620598999537400/);
assert.match(migration, /indicador_id=N?'22'[\s\S]*competencia=N?'2026-07'/);
assert.match(migration, /INSERT INTO dbo\.auditoria/);
assert.match(migration, /ROLLBACK TRANSACTION[\s\S]*THROW/);

console.log("Indicador 22: migration da nova vigência de julho validada.");
