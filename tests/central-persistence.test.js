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
  getMetaCompetencia: (launch) => ({
    "2026-01": 0.1449,
    "2026-07": 0.1423833333333333,
    "2026-08": 0.2664
  })[launch.competencia] ?? null
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

const julyPrepared = global.CentralPersistence.prepareLaunchForCentral({
  id: "teste-ieo-julho",
  indicadorId: 6,
  competencia: "2026-07",
  ano: 2026,
  mes: 7,
  metaMensal: null,
  metaReferencia: null,
  camposEntrada: {}
});
assert.equal(julyPrepared.metaMensal, 0.1423833333333333);
assert.equal(julyPrepared.metaReferencia, 0.1423833333333333);

const augustPrepared = global.CentralPersistence.prepareLaunchForCentral({
  id: "teste-ieo-agosto",
  indicadorId: 6,
  competencia: "2026-08",
  ano: 2026,
  mes: 8,
  metaMensal: null,
  metaReferencia: null,
  camposEntrada: {}
});
assert.equal(augustPrepared.metaMensal, 0.2664);
assert.equal(augustPrepared.metaReferencia, 0.2664);

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
