const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const calls = [];

global.location = { protocol: "http:" };
global.CAIXA_LOTERIAS_AUTH_USER = { csrfToken: "token-teste" };
global.DataStore = {
  salvarLancamentos: async () => true,
  saveLocal: async () => true
};
global.fetch = async (url, options) => {
  calls.push({ url, options });
  return {
    ok: true,
    json: async () => url.includes("ping=1")
      ? { ok: true, database: "sqlsrv", mode: "php_sqlserver" }
      : { ok: true, persisted: true, lancamento: { id: "L1", usuarioResponsavel: "C123456" } }
  };
};

require(path.join(root, "assets/js/central-persistence.js"));

(async () => {
  const saved = await global.CentralPersistence.persistLaunchAction("send", [
    { id: "L1", indicadorId: 1, updatedAt: "antigo", camposEntrada: { valor: 3 } },
    { id: "L2", indicadorId: 2, updatedAt: "preservado", camposEntrada: {} }
  ], "L1");
  assert.equal(saved.usuarioResponsavel, "C123456");
  assert.equal(calls.length, 2);
  const request = calls[1];
  const body = JSON.parse(request.options.body);
  assert.equal(body.key, "lancamento_acao");
  assert.equal(body.action, "send");
  assert.equal(body.lancamentoId, "L1");
  assert.equal(body.value[0].updatedAt, undefined);
  assert.equal(body.value[1].updatedAt, "preservado");
  assert.equal(request.options.headers["X-CSRF-Token"], "token-teste");

  const launches = read("assets/js/launches.js");
  const saveAction = launches.slice(launches.indexOf("async function saveLaunchData"), launches.indexOf("function recomputeAccumulatedForIndicator"));
  assert.match(saveAction, /persistLaunchAction\(action, changedLaunches, updated\.id\)/);
  assert.doesNotMatch(saveAction, /DataStore\.appendHistory|DataStore\.salvarLancamentos/);

  const service = read("app/services/BaseDadosService.php");
  const action = service.slice(service.indexOf("public function saveLaunchAction"), service.indexOf("private function evidenceReferenceChanges"));
  assert.match(action, /\$user\['matricula'\]/);
  assert.match(action, /\$this->db->beginTransaction\(\)/);
  assert.match(action, /\$this->auditoria->append\(/);
  assert.match(action, /\$this->homologacoes->recordSubmission\(/);
  assert.match(action, /\$this->db->commit\(\)/);

  console.log("Auditoria de preenchimento e envio: requisicao e transacao verificadas.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
