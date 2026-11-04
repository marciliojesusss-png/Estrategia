const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(
  root,
  "database/sqlserver/migrations/20261103_001_normalizacao_datas_operacionais_teste.sql"
), "utf8");

assert.match(migration, /SET XACT_ABORT ON/);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /IF XACT_STATE\(\)<>0 ROLLBACK TRANSACTION/);
assert.match(migration, /AT TIME ZONE 'E\. South America Standard Time'/);
assert.match(migration, /WHEN 5 THEN -1/);
assert.match(migration, /WHEN 6 THEN 1/);
assert.match(migration, />CONVERT\(TIME\(7\),'18:00:00'\)/);
assert.match(migration, /@camposEsperados INT=133/);
assert.match(migration, /@camposNormalizados NOT IN \(0,@camposEsperados\)/);
assert.match(migration, /A normalizacao produziria colisao no historico de homologacoes/);
assert.match(migration, /Ainda existem datas operacionais fora de dia util ou posteriores a 18h/);

assert.match(migration, /UPDATE l\s+SET created_at=/);
assert.match(migration, /UPDATE h\s+SET data_acao=/);
assert.match(migration, /UPDATE a\s+SET data_acao=/);
assert.doesNotMatch(migration, /UPDATE\s+dbo\.(?:indicadores|configuracoes|evidencias|retificacoes|solicitacoes_reabertura|usuarios_acesso)/i);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)\s+dbo\./i);
assert.doesNotMatch(migration, /CREATE\s+TABLE\s+dbo\./i);

for (const field of [
  "resultado_calculado",
  "resultado_oficial",
  "meta_referencia",
  "percentual_atingido",
  "situacao",
  "status",
  "versao_atual",
  "usuario_responsavel"
]) {
  const updateBlocks = [...migration.matchAll(/UPDATE\s+[lha]\s+SET([\s\S]*?)FROM\s+dbo\./g)].map((match) => match[1]).join("\n");
  assert.doesNotMatch(updateBlocks, new RegExp(`\\b${field}\\s*=`), `${field} não pode ser alterado`);
}

console.log("Normalização transacional das datas operacionais: migration validada.");
