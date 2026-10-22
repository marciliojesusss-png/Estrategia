const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const rule19 = bootstrap.regrasIndicadores.find((rule) => Number(rule.indicadorId) === 19);
const rule16 = bootstrap.regrasIndicadores.find((rule) => Number(rule.indicadorId) === 16);
const launches19 = bootstrap.lancamentos.filter((launch) => Number(launch.indicadorId) === 19);
const byId = Object.fromEntries(launches19.map((launch) => [Number(launch.id), launch]));

assert.deepEqual(rule19.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.equal(rule19.parametrosCalculo.lucroLiquidoReferencia, 1305400000);
assert.equal(rule19.parametrosCalculo.curvaTrimestralAcumulada["1TRI/2026"].metaValorAcumulado, 0);
assert.equal(rule19.parametrosCalculo.curvaTrimestralAcumulada["2TRI/2026"].metaValorAcumulado, 652700);
assert.equal(rule19.parametrosCalculo.curvaTrimestralAcumulada["3TRI/2026"].metaValorAcumulado, 1305400);
assert.equal(rule19.parametrosCalculo.curvaTrimestralAcumulada["4TRI/2026"].metaValorAcumulado, 4307900);
assert.equal(rule19.parametrosCalculo.curvaTrimestralAcumulada["4TRI/2026"].metaPercentualLucro, 0.0033);

assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.valorInvestidoMes), [190000, 0, 0]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.valorInvestidoAcumuladoCompetencia), [190000, 190000, 190000]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.dataBaseApuracao), ["2026-07-31", "2026-08-31", "2026-09-30"]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].status), ["Em preenchimento", "Em preenchimento", "Em preenchimento"]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.dataInvestimentoSocioambiental), ["", "", ""]);
assert.equal([223, 224, 225].reduce((total, id) => total + byId[id].camposEntrada.valorInvestidoMes, 0), 190000);
assert.ok([223, 224, 225].every((id) => byId[id].resultadoMensal === 190000));
assert.ok([223, 224, 225].every((id) => Math.abs(byId[id].percentualAtingido - (190000 / 1305400)) < 0.000000000001));

assert.deepEqual([217, 218, 219].map((id) => byId[id].status), ["Homologado", "Homologado", "Homologado"]);
assert.deepEqual([220, 221, 222].map((id) => byId[id].status), ["Não iniciado", "Não iniciado", "Não iniciado"]);
assert.ok([217, 218, 219].every((id) => byId[id].metaMensal === 0));
assert.ok([220, 221, 222].every((id) => byId[id].metaMensal === 652700));
assert.equal(rule16.tipoCalculo, "iniciativas_apoiadas");

const mirroredAssets = [
  "bootstrap-data.js",
  "calculations.js",
  "dashboard.js",
  "dataStore.js",
  "executiveSummary.js",
  "formulas.js",
  "indicators.js",
  "launches.js",
  "quarterly.js"
];
mirroredAssets.forEach((file) => {
  assert.equal(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    fs.readFileSync(path.join(root, "public", "assets", "js", file), "utf8"),
    `${file} deve permanecer idêntico em assets/js e public/assets/js`
  );
});

const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261022_001_indicador19_modelagem_carga_3tri.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /@julhoId NVARCHAR\(100\) = N'223'/);
assert.match(migration, /@agostoId NVARCHAR\(100\) = N'224'/);
assert.match(migration, /@setembroId NVARCHAR\(100\) = N'225'/);
assert.match(migration, /JSON_QUERY\(N'\[3,6,9,12\]'\)/);
assert.match(migration, /id NOT IN \(@julhoId, @agostoId, @setembroId\)/);
assert.match(migration, /homologação criada ou alterada/);
assert.match(migration, /retificação criada ou alterada/);
assert.match(migration, /evidência física criada ou alterada/);
assert.match(migration, /indicador 16/);
assert.doesNotMatch(migration, /570000/);

console.log("indicator19-controlled-load.test.js: OK");
