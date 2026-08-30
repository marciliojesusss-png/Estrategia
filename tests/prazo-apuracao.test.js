const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { window: {}, Date, console };
context.window.window = context.window;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "prazo-apuracao.js"), "utf8"),
  context,
  { filename: "prazo-apuracao.js" }
);

const engine = context.window.PrazoApuracao;
const prazo = {
  competencia: "2026-08",
  dataLimitePreenchimento: "2026-09-05",
  dataLimiteHomologacao: "2026-09-09",
  ativo: true
};

function evaluate(status, date, deadline = prazo, launchExtra = {}) {
  return engine.avaliar({
    competencia: "2026-08",
    status,
    ...launchExtra
  }, deadline, date);
}

assert.equal(evaluate("Não iniciado", "2026-09-04").atrasado, false);
assert.equal(evaluate("Em preenchimento", "2026-09-05").atrasado, false);
assert.equal(evaluate("NÃƒÂ£o iniciado", "2026-09-06").codigo, engine.STATUS.PREENCHIMENTO_ATRASADO);
assert.equal(evaluate("Não iniciado", "2026-09-06").codigo, engine.STATUS.PREENCHIMENTO_ATRASADO);
assert.equal(evaluate("Em preenchimento", "2026-09-06").mensagem, "Preenchimento em atraso");
assert.equal(evaluate("Enviado para homologação", "2026-09-08").atrasado, false);
assert.equal(evaluate("Enviado para homologação", "2026-09-09").atrasado, false);
assert.equal(evaluate("Enviado para homologação", "2026-09-10").codigo, engine.STATUS.HOMOLOGACAO_ATRASADA);
assert.equal(evaluate("Enviado para homologaÃƒÂ§ÃƒÂ£o", "2026-09-10").codigo, engine.STATUS.HOMOLOGACAO_ATRASADA);
assert.equal(evaluate("Homologado", "2026-09-20").atrasado, false);
assert.equal(evaluate("Não iniciado", "2026-09-20", null).codigo, engine.STATUS.SEM_PRAZO);
assert.equal(evaluate("Devolvido para ajuste", "2026-09-06").codigo, engine.STATUS.AJUSTE_ATRASADO);
assert.equal(evaluate("Devolvido para ajuste", "2026-09-06").mensagem, "Ajuste em atraso");
assert.equal(evaluate("Reaberto", "2026-09-20").codigo, engine.STATUS.RETIFICACAO_EM_ANDAMENTO);
assert.equal(evaluate("Reaberto", "2026-09-20").atrasado, false);
assert.equal(evaluate("Retificado", "2026-09-20").atrasado, false);
assert.equal(evaluate("Não iniciado", "2026-09-20", { ...prazo, ativo: false }).codigo, engine.STATUS.SEM_PRAZO);
assert.equal(evaluate("Não iniciado", "2026-09-20", { ...prazo, competencia: "2026-09" }).codigo, engine.STATUS.SEM_PRAZO);
assert.equal(engine.formatDate("2026-09-05"), "05/09/2026");

console.log("Testes determinísticos dos prazos de apuração OK");
