const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261103_002_normalizacao_feriados_nacionais_teste.sql"
);
const sql = fs.readFileSync(migrationPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/BEGIN TRANSACTION/i.test(sql), "A migration deve abrir transacao.");
assert(/COMMIT TRANSACTION/i.test(sql), "A migration deve confirmar a transacao.");
assert(/ROLLBACK TRANSACTION/i.test(sql), "A migration deve fazer rollback em falha.");
assert(/E\. South America Standard Time/i.test(sql), "O fuso de Sao Paulo deve ser explicito.");
assert(/@camposEsperados INT=90/i.test(sql), "O guard deve refletir os 90 campos auditados.");

[
  "2026-01-01",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
].forEach((holiday) => {
  assert(sql.includes(holiday), `Feriado nacional ausente: ${holiday}`);
});

["2026-02-16", "2026-02-17", "2026-06-04", "2026-10-28"].forEach((optionalDay) => {
  assert(!sql.includes(optionalDay), `Ponto facultativo nao deve ser tratado como feriado: ${optionalDay}`);
});

assert(/DATEADD\(DAY,1,[^)]+data_local\)/i.test(sql), "O feriado deve avancar inicialmente um dia.");
assert(/WHILE EXISTS/i.test(sql), "A migration deve procurar o proximo dia util.");
assert(/IN \(5,6\)/i.test(sql), "Sabado e domingo devem ser evitados.");
assert(/18:00:00/i.test(sql), "A validacao do limite de 18h deve permanecer.");
assert(/colisao no historico de homologacoes/i.test(sql), "Deve haver guard de unicidade das homologacoes.");

assert(/UPDATE l[\s\S]*created_at[\s\S]*updated_at/i.test(sql), "Somente datas dos lancamentos devem ser atualizadas.");
assert(/UPDATE h[\s\S]*data_acao[\s\S]*created_at/i.test(sql), "Somente datas das homologacoes devem ser atualizadas.");
assert(/UPDATE a[\s\S]*data_acao[\s\S]*created_at/i.test(sql), "Somente datas da auditoria devem ser atualizadas.");
assert(!/UPDATE\s+[^\s]+[\s\S]*SET[\s\S]*(resultado_|meta_|situacao|status|versao_atual|evidencia_id)\s*=/i.test(sql), "Campos de negocio nao podem ser alterados.");
assert(!/DELETE\s+FROM\s+dbo\./i.test(sql), "Nao pode excluir registros persistentes.");
assert(!/MERGE\s+dbo\./i.test(sql), "Nao pode usar MERGE persistente.");
assert(!/INSERT\s+INTO\s+dbo\./i.test(sql), "Nao pode inserir registros persistentes.");

console.log("Normalizacao de feriados nacionais: migration validada.");
