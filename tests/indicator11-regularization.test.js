const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date, URLSearchParams };
context.window.window = context.window;
for (const file of ["currency.js", "formulas.js", "indicator-periodicity.js", "quarterly.js", "dataStore.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
  if (file === "formulas.js") context.IndicatorFormulas = context.window.IndicatorFormulas;
  if (file === "indicator-periodicity.js") context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
}

const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 11);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 11);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 11);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const dataStore = context.window.DataStore;
const closeTo = (actual, expected, epsilon = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} não está próximo de ${expected}`);
};

assert.equal(indicator.indicador, "Ampliar a Capacidade de Desenvolvimento de Soluções de TIC");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PN");
assert.equal(indicator.pilar, "Tecnologia e Inovação");
assert.equal(indicator.tipoCalculo, "marco_projeto_percentual");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_trimestral");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(Object.values(rule.parametrosCalculo.curvaTrimestralPercentual).map((item) => item.metaPercentual), [0.35, 0.70, 0.85, 1]);
assert.equal(launches.length, 12);

const expected = {
  1: ["acompanhamento", null, null, null, "Em acompanhamento"],
  2: ["acompanhamento", null, null, null, "Em acompanhamento"],
  3: ["fechamento_trimestral", 0.35, 0.35, 1, "Atingido"],
  4: ["acompanhamento", null, null, null, "Em acompanhamento"],
  5: ["acompanhamento", null, null, null, "Em acompanhamento"],
  6: ["fechamento_trimestral", 0.70, 0.35, 0.50, "Abaixo da meta"],
  7: ["acompanhamento", null, null, null, "Em acompanhamento"],
  8: ["acompanhamento", null, null, null, "Em acompanhamento"],
  9: ["fechamento_trimestral", 0.85, 1, 1 / 0.85, "Atingido"],
  10: ["acompanhamento", null, null, null, undefined],
  11: ["acompanhamento", null, null, null, undefined],
  12: ["fechamento_trimestral", 1, null, null, undefined]
};

for (const [monthText, values] of Object.entries(expected)) {
  const month = Number(monthText);
  const launch = byMonth[month];
  const [type, meta, result, achievement, situation] = values;
  assert.equal(launch.camposEntrada.tipoPosicaoTIC, type, `tipo da competência ${month}`);
  assert.equal(launch.metaMensal, meta, `meta oficial da competência ${month}`);
  assert.equal(launch.resultadoMensal, result, `resultado oficial da competência ${month}`);
  if (achievement === null) assert.equal(launch.percentualAtingido, null, `atingimento da competência ${month}`);
  else closeTo(launch.percentualAtingido, achievement);
  assert.equal(launch.situacaoCalculada, situation, `situação da competência ${month}`);
  assert.equal(launch.camposEntrada.fonteAcompanhamentoTIC, "16.10(3).xlsx");
  assert.equal(launch.camposEntrada.fontePlanilhaTIC, "16.10(3).xlsx");
}

// O status legado não transforma JAN/FEV em fechamento oficial.
for (const month of [1, 2]) {
  assert.equal(byMonth[month].status, "Homologado");
  assert.equal(byMonth[month].homologadoPor, null);
  assert.equal(byMonth[month].dataHomologacao, null);
  assert.notEqual(byMonth[month].situacaoCalculada, "Abaixo da meta");
}

assert.equal(byMonth[3].camposEntrada.fonteFechamentoTIC, "Informe DILOT/GERIN nº 0029/2026");
assert.equal(byMonth[6].camposEntrada.fonteFechamentoTIC, "Informe DILOT/GERIN nº 0056/2026");
assert.equal(byMonth[9].camposEntrada.fonteFechamentoTIC, "Informe DILOT/GERIN nº 0078/2026");
assert.equal(byMonth[12].camposEntrada.marcoEsperadoTIC, "Contrato assinado com fornecedor");

// A memória da planilha é rastreável, mas independente dos números oficiais.
assert.equal(byMonth[4].camposEntrada.metaPlanilhaTIC, 0);
assert.equal(byMonth[4].camposEntrada.realizadoPlanilhaTIC, 0.70);
assert.match(byMonth[4].camposEntrada.descricaoPlanilhaTIC, /Consolidação das contribuições/);
assert.equal(byMonth[6].camposEntrada.realizadoPlanilhaTIC, 0.70);
assert.equal(byMonth[6].camposEntrada.atingimentoPlanilhaTIC, 1);
assert.equal(byMonth[6].resultadoMensal, 0.35);
assert.match(byMonth[5].camposEntrada.descricaoPlanilhaTIC, /Gartner/);
assert.match(byMonth[5].camposEntrada.descricaoPlanilhaTIC, /Salesforce/);
assert.match(byMonth[5].camposEntrada.descricaoPlanilhaTIC, /TAO/);
assert.match(byMonth[6].observacaoArea, /23 profissionais/);

// AGO guarda o fato operacional; apenas SET o consolida como fechamento oficial.
for (const month of [8, 9]) {
  const input = byMonth[month].camposEntrada;
  assert.equal(input.eventoCapacidadeTicId, "os-25173021-spassu-2026");
  assert.equal(input.numeroOrdemServicoTIC, "25173021");
  assert.equal(input.dataAberturaOrdemServicoTIC, "2026-06-10");
  assert.equal(input.dataConclusaoOrdemServicoTIC, "2026-08-14");
  assert.equal(input.quantidadeProfissionaisAdicionaisTIC, 18);
  assert.equal(input.fabricaSoftwareTIC, "Spassu");
}
assert.equal(byMonth[8].resultadoMensal, null);
assert.equal(byMonth[8].percentualAtingido, null);
assert.match(byMonth[9].camposEntrada.descricaoAndamentoTIC, /não representa nova contratação/);

const calculate = (month) => formulas.calcularIndicador(
  indicator,
  rule,
  byMonth[month],
  launches.filter((item) => Number(item.mes) <= month)
);
for (const month of [1, 2, 4, 5, 7, 8, 10, 11]) {
  const result = calculate(month);
  assert.equal(result.resultadoMensal, null, `fórmula não deve apurar resultado oficial em ${month}`);
  assert.equal(result.percentualAtingidoMensal, null, `fórmula não deve apurar atingimento oficial em ${month}`);
  assert.equal(result.situacao, "Em acompanhamento", `fórmula deve reconhecer acompanhamento em ${month}`);
  assert.equal(result.tipoPosicaoTIC, "acompanhamento");
}
const march = calculate(3);
closeTo(march.resultadoMensal, 0.35);
closeTo(march.percentualAtingidoMensal, 1);
assert.equal(march.situacao, "Atingido");
assert.equal(march.tipoPosicaoTIC, "fechamento_trimestral");
const june = calculate(6);
closeTo(june.resultadoMensal, 0.35);
closeTo(june.percentualAtingidoMensal, 0.50);
assert.equal(june.situacao, "Abaixo da meta");
const september = calculate(9);
closeTo(september.resultadoMensal, 1);
closeTo(september.percentualAtingidoMensal, 1 / 0.85);
assert.equal(september.percentualAtingidoMensalFormatado, "117,65%");
assert.equal(september.situacao, "Atingido");
const december = calculate(12);
assert.equal(december.erro, true);
assert.equal(december.resultadoMensal, null);

// DataStore separa a referência trimestral da meta oficial da competência.
assert.equal(dataStore.getCapacidadeTicMetaTrimestral(2026, 8), 0.85);
assert.equal(dataStore.getCapacidadeTicMetaOficialCompetencia(2026, 8), null);
assert.equal(dataStore.getCapacidadeTicMetaOficialCompetencia(2026, 9), 0.85);
assert.equal(dataStore.resolveMeta(11, 2026, 8, [], 0.85), null);
assert.equal(dataStore.resolveMeta(11, 2026, 9, [], 0.85), 0.85);
const normalizedAugust = dataStore.normalizeData("lancamentos", [{
  ...byMonth[8],
  metaMensal: 0.85,
  resultadoMensal: 1,
  percentualAtingido: 1 / 0.85,
  situacaoCalculada: "Atingido"
}])[0];
assert.equal(normalizedAugust.metaMensal, null);
assert.equal(normalizedAugust.resultadoMensal, null);
assert.equal(normalizedAugust.percentualAtingido, null);
assert.equal(normalizedAugust.metaReferenciaTrimestre, 0.85);
assert.equal(normalizedAugust.situacaoCalculada, "Em acompanhamento");

// A visão trimestral ignora os acompanhamentos homologados de JAN/FEV e usa somente MAR.
const q1 = quarterly.consolidarTrimestre(indicator, rule, launches, "1TRI/2026");
assert.equal(q1.statusTrimestre, "Fechado");
assert.equal(q1.mesesHomologados, 1);
closeTo(q1.metaTrimestral, 0.35);
closeTo(q1.resultadoTrimestral, 0.35);
assert.equal(q1.situacaoTrimestral, "Atingido");
const q2 = quarterly.consolidarTrimestre(indicator, rule, launches, "2TRI/2026");
assert.equal(q2.statusTrimestre, "Parcial");
assert.equal(q2.mesesHomologados, 0);
closeTo(q2.metaTrimestral, 0.70);
closeTo(q2.resultadoTrimestral, 0.35);
closeTo(q2.desempenhoTrimestral, 0.50);
assert.equal(q2.situacaoTrimestral, "Abaixo da meta");
const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Parcial");
assert.equal(q3.mesesHomologados, 0);
closeTo(q3.metaTrimestral, 0.85);
closeTo(q3.resultadoTrimestral, 1);
closeTo(q3.desempenhoTrimestral, 1 / 0.85);
assert.equal(q3.situacaoTrimestral, "Atingido");
const q4 = quarterly.consolidarTrimestre(indicator, rule, launches, "4TRI/2026");
assert.equal(q4.statusTrimestre, "Sem dados");
closeTo(q4.metaTrimestral, 1);
assert.equal(q4.resultadoTrimestral, null);

const migration = fs.readFileSync(path.join(root, "database", "sqlserver", "migrations", "20261023_006_indicador11_fechamento_trimestral.sql"), "utf8");
const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(launchesSource, /Acompanhamento do trimestre/);
assert.match(launchesSource, /Meta do fechamento trimestral/);
assert.match(launchesSource, /Posição oficial somente no fechamento/);
assert.doesNotMatch(launchesSource, /Meta de referência do trimestre/);
const indicatorsSource = fs.readFileSync(path.join(root, "assets", "js", "indicators.js"), "utf8");
assert.match(indicatorsSource, /<th>Meta oficial<\/th>/);
assert.match(indicatorsSource, /Meta oficial da competência/);
assert.match(indicatorsSource, /Resultado oficial da competência/);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /0 AS lancamentos_alterados/);
assert.match(migration, /16\.10\(3\)\.xlsx/);
assert.match(migration, /Informes DILOT\/GERIN 0029, 0056 e 0078\/2026/);
assert.match(migration, /1\.176470588235294118/);
assert.match(migration, /os-25173021-spassu-2026/);
assert.match(migration, /JAN\/FEV: o bruto legado 35%\/0%\/0%\/Abaixo da meta permanece intocado/);
assert.match(migration, /Comparação integral validada por EXCEPT/);
assert.doesNotMatch(migration, /UPDATE\s+(?:dbo\.)?lancamentos/i);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\./i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+dbo\./i);

for (const file of ["bootstrap-data.js", "dataStore.js", "formulas.js", "indicators.js", "launches.js", "quarterly.js", "dashboard.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`
  );
}

console.log("indicator11-regularization.test.js: OK");
