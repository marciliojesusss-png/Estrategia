const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const indicator19 = bootstrap.indicadores.find((item) => Number(item.id) === 19);
const indicator16 = bootstrap.indicadores.find((item) => Number(item.id) === 16);
const indicator09 = bootstrap.indicadores.find((item) => Number(item.id) === 9);
const indicator17 = bootstrap.indicadores.find((item) => Number(item.id) === 17);
const rule19 = bootstrap.regrasIndicadores.find((rule) => Number(rule.indicadorId) === 19);
const rule16 = bootstrap.regrasIndicadores.find((rule) => Number(rule.indicadorId) === 16);
const launches19 = bootstrap.lancamentos.filter((launch) => Number(launch.indicadorId) === 19);
const launches16 = bootstrap.lancamentos.filter((launch) => Number(launch.indicadorId) === 16);
const byId = Object.fromEntries(launches19.map((launch) => [Number(launch.id), launch]));
const byId16 = Object.fromEntries(launches16.map((launch) => [Number(launch.id), launch]));

assert.equal(indicator19.indicador, "Incentivo Socioambiental");
assert.equal(indicator19.unidadeApuradora, "GENOL");
assert.equal(indicator19.diretoriaResponsavel, "DICOT");
assert.equal(indicator19.plano, "PN");
assert.equal(indicator19.pilar, "Sustentabilidade e Cidadania");
assert.equal(rule19.tipoCalculo, "investimento_socioambiental");
assert.equal(rule19.tipoConsolidacao, "valor_acumulado");
assert.deepEqual(rule19.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.equal(rule19.parametrosCalculo.lucroLiquidoReferencia, 1305400000);
assert.equal(rule19.parametrosCalculo.percentualMetaAnual, 0.0033);
assert.equal(rule19.metaAnualValor, 4307900);
assert.deepEqual(
  ["1TRI/2026", "2TRI/2026", "3TRI/2026", "4TRI/2026"].map(
    (quarter) => rule19.parametrosCalculo.curvaTrimestralAcumulada[quarter].metaValorAcumulado
  ),
  [0, 652700, 1305400, 4307900]
);

const metas19 = bootstrap.metas
  .filter((meta) => Number(meta.indicadorId) === 19 && Number(meta.ano) === 2026)
  .sort((a, b) => Number(a.mes) - Number(b.mes));
assert.equal(metas19.length, 12);
assert.deepEqual(
  metas19.map((meta) => Number(meta.metaMensal)),
  [0, 0, 0, 652700, 652700, 652700, 1305400, 1305400, 1305400, 4307900, 4307900, 4307900]
);

// JAN–MAR preservam apenas o status legado; o fixture não fabrica ator ou data de homologação.
assert.deepEqual([217, 218, 219].map((id) => byId[id].status), ["Homologado", "Homologado", "Homologado"]);
assert.ok([217, 218, 219].every((id) => byId[id].homologadoPor === null));
assert.ok([217, 218, 219].every((id) => byId[id].dataHomologacao === null));
assert.ok([217, 218, 219].every((id) => !byId[id].evidenciaId));

// ABR–JUN reproduzem o estado real já existente no SQL Server.
assert.deepEqual([220, 221, 222].map((id) => byId[id].status), ["Homologado", "Homologado", "Homologado"]);
assert.ok([220, 221, 222].every((id) => byId[id].metaMensal === 652700));
assert.ok([220, 221, 222].every((id) => byId[id].resultadoMensal === 0));
assert.ok([220, 221, 222].every((id) => byId[id].percentualAtingido === 0));
assert.ok([220, 221, 222].every((id) => byId[id].situacaoCalculada === "Abaixo da meta"));
assert.ok([220, 221, 222].every((id) => byId[id].homologadoPor === "DIRETORIA-DICOT"));
assert.ok([220, 221, 222].every((id) => byId[id].usuarioResponsavel === "UNIDADE-GENOL"));
assert.ok([220, 221, 222].every((id) => byId[id].versaoAtual === 1));
assert.deepEqual(
  [220, 221, 222].map((id) => byId[id].evidenciaId),
  [
    "evidencia-6a98533e3a3972.30845880",
    "evidencia-6a98567ec1b2a7.54255601",
    "evidencia-6a986cb5075e53.24463386"
  ]
);
assert.deepEqual(
  [220, 221, 222].map((id) => byId[id].updatedAt),
  [
    "2026-09-02T15:37:59-03:00",
    "2026-09-02T15:38:07-03:00",
    "2026-09-02T15:38:15-03:00"
  ]
);
const homologacoes19 = bootstrap.homologacoes
  .filter((item) => Number(item.indicadorId) === 19)
  .sort((a, b) => Number(a.mes) - Number(b.mes));
assert.deepEqual(homologacoes19.map((item) => Number(item.lancamentoId)), [220, 221, 222]);
assert.deepEqual(
  homologacoes19.map((item) => item.id),
  [
    "homologacao-6a986d07df65c7.82309601",
    "homologacao-6a986d0fc84003.79789225",
    "homologacao-6a986d1722dbf6.62798576"
  ]
);
assert.deepEqual(
  homologacoes19.map((item) => item.dataHomologacao),
  [
    "2026-09-02T15:37:59-03:00",
    "2026-09-02T15:38:07-03:00",
    "2026-09-02T15:38:15-03:00"
  ]
);

// JUL–SET mantêm os números oficiais e recebem apenas identidade documental canônica.
assert.deepEqual([223, 224, 225].map((id) => byId[id].status), ["Em preenchimento", "Em preenchimento", "Em preenchimento"]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.valorInvestidoMes), [190000, 0, 0]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.valorInvestidoAcumuladoCompetencia), [190000, 190000, 190000]);
assert.deepEqual([223, 224, 225].map((id) => byId[id].camposEntrada.dataBaseApuracao), ["2026-07-31", "2026-08-31", "2026-09-30"]);
assert.ok([223, 224, 225].every((id) => byId[id].camposEntrada.idProjetoIncentivoSocioambiental === "brasil-ladies-cup-2026"));
assert.ok([223, 224, 225].every((id) => byId[id].camposEntrada.nomeProjetoIncentivoSocioambiental === "Patrocínio da edição 2026 da Brasil Ladies Cup"));
assert.ok([223, 224, 225].every((id) => byId[id].resultadoMensal === 190000));
assert.ok([223, 224, 225].every((id) => Math.abs(byId[id].percentualAtingido - (190000 / 1305400)) < 1e-15));
assert.equal([223, 224, 225].reduce((total, id) => total + byId[id].camposEntrada.valorInvestidoMes, 0), 190000);
assert.equal(byId[225].situacaoCalculada, "Abaixo da meta");
assert.equal(Number(((190000 / 1305400000) * 100).toFixed(5)), 0.01455);
assert.equal(Number(((190000 / 1305400) * 100).toFixed(2)), 14.55);

// Proteções explícitas dos Indicadores 16, 09 e 17.
assert.equal(indicator16.unidadeApuradora, "GENOL");
assert.equal(indicator16.diretoriaResponsavel, "DICOT");
assert.equal(rule16.tipoConsolidacao, "iniciativas_acumuladas");
assert.ok([187, 188, 189].every((id) => byId16[id].resultadoMensal === 1));
assert.equal(byId16[189].percentualAtingido, 1);
assert.equal(byId16[189].status, "Em preenchimento");
assert.equal(byId16[189].situacaoCalculada, "Atingido");
assert.ok([187, 188, 189].every((id) => !byId16[id].evidenciaId));
assert.equal(indicator09.unidadeApuradora, "SULOT");
assert.equal(indicator17.unidadeApuradora, "SULOT");

const mirroredAssets = [
  "bootstrap-data.js", "calculations.js", "dashboard.js", "dataStore.js",
  "executiveSummary.js", "formulas.js", "indicators.js", "launches.js", "quarterly.js"
];
mirroredAssets.forEach((file) => {
  assert.equal(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    fs.readFileSync(path.join(root, "public", "assets", "js", file), "utf8"),
    `${file} deve permanecer idêntico em assets/js e public/assets/js`
  );
});

const migrationPath = path.join(
  root, "database", "sqlserver", "migrations",
  "20261023_002_indicador19_correcao_tecnica_final.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /SET tipo_consolidacao = N'valor_acumulado'/);
assert.match(migration, /SET valor_json = @metasDepois/);
assert.match(migration, /SET dados_entrada_json = JSON_MODIFY/);
assert.match(migration, /N'Patrocínio da edição 2026 da Brasil Ladies Cup'/);
assert.match(migration, /N'brasil-ladies-cup-2026'/);
assert.match(migration, /@linhasIndicador <> 1 OR @linhasLancamentos <> 3 OR @linhasConfiguracoes <> 1/);
assert.match(migration, /outro indicador, inclusive o 16, foi alterado/);
assert.match(migration, /governança foi criada, removida ou alterada/);
assert.doesNotMatch(migration, /UPDATE\s+dbo\.(homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\./i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+dbo\./i);
assert.doesNotMatch(migration, /570000/);

console.log("indicator19-controlled-load.test.js: OK");
