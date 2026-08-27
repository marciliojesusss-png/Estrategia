const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assetPath = path.join(__dirname, "../assets/js/central-persistence.js");
const publicPath = path.join(__dirname, "../public/assets/js/central-persistence.js");

assert.equal(
  fs.readFileSync(assetPath, "utf8"),
  fs.readFileSync(publicPath, "utf8"),
  "A cópia publicada da persistência central deve ser idêntica ao arquivo-fonte."
);

global.location = { protocol: "http:" };
global.CAIXA_LOTERIAS_AUTH_USER = { csrfToken: "teste" };
global.DataStore = {
  salvarLancamentos: async () => true,
  saveLocal: async () => true
};
global.IeoRecorrente = {
  IEO_META_MENSAL_2026: {
    "2026-01": 0.1449,
    "2026-02": 0.1445,
    "2026-03": 0.1441
  }
};

require(assetPath);

assert.ok(global.CentralPersistence, "CentralPersistence deve ser exposto globalmente.");
assert.equal(global.DataStore.__centralPersistenceInstalled, true);

const prepared = global.CentralPersistence.prepareLaunchForCentral({
  id: "teste-ieo",
  indicadorId: 6,
  competencia: "2026-01",
  ano: 2026,
  mes: 1,
  metaMensal: null,
  metaReferencia: null,
  updatedAt: "2026-06-29T10:00:00-03:00",
  percentualAtingido: 0.5,
  camposEntrada: {
    despesaPessoalMes: 5700000,
    despesasAdministrativasMes: 8655120,
    receitasLiquidasMes: 223600000,
    percentualAtingidoOficialInformado: 1.0422,
    observacaoAjusteOficial: "legado"
  }
});

assert.equal(prepared.metaMensal, 0.1449);
assert.equal(prepared.metaReferencia, 0.1449);
assert.equal(prepared.updatedAt, undefined, "updated_at deve ser gerado pelo backend no momento da gravação.");
assert.equal(prepared.camposEntrada.percentualAtingidoOficialInformado, 1.0422);
assert.equal(prepared.camposEntrada.observacaoAjusteOficial, "legado");
assert.equal(prepared.camposEntrada.despesaPessoalMes, 5700000);

const normalLaunch = global.CentralPersistence.prepareLaunchForCentral({
  id: "outro-indicador",
  indicadorId: 5,
  ano: 2026,
  mes: 1,
  metaMensal: 123,
  updatedAt: "antigo",
  camposEntrada: { arrecadacaoTotalMes: 1000 }
});
assert.equal(normalLaunch.metaMensal, 123);
assert.equal(normalLaunch.updatedAt, undefined);

const lancamentosView = fs.readFileSync(path.join(__dirname, "../views/frontend/lancamentos.php"), "utf8");
const homologacaoView = fs.readFileSync(path.join(__dirname, "../views/frontend/homologacao.php"), "utf8");
assert.match(lancamentosView, /central-persistence\.js/);
assert.match(homologacaoView, /central-persistence\.js/);

console.log("Persistência central: chunking, normalização do IEO e integração das telas validados.");
