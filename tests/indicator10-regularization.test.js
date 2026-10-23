const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date };
context.window.window = context.window;
for (const file of ["currency.js", "formulas.js", "indicator-periodicity.js", "quarterly.js"]) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
  if (file === "formulas.js") context.IndicatorFormulas = context.window.IndicatorFormulas;
  if (file === "indicator-periodicity.js") context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
}

const bootstrap = loadBootstrapData(root);
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const closeTo = (actual, expected, epsilon = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} não está próximo de ${expected}`);
};
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 10);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 10);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 10);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

assert.equal(indicator.indicador, "Share da Plataforma de Jogos");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PEI");
assert.equal(indicator.pilar, "Tecnologia e Inovação");
assert.equal(indicator.metaAnualDescricao, "Piloto ou MVP da Plataforma de Jogos");
assert.equal(indicator.tipoCalculo, "projeto_marco_entrega");
assert.equal(indicator.unidadeMedida, "percentual");

assert.equal(rule.tipoCalculo, "projeto_marco_entrega");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_trimestral");
assert.equal(rule.unidadeMedida, "percentual");
assert.equal(rule.parametrosCalculo.campoPercentual, "percentualEvolucaoPlataformaJogos");
assert.equal(rule.parametrosCalculo.metaTipo, "meta_oficial_trimestral_projeto");
assert.equal(rule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(
  Object.values(rule.parametrosCalculo.metasTrimestraisOficiais),
  [null, 1 / 3, 0.67, 1]
);
assert.equal(
  rule.parametrosCalculo.marcosTrimestraisOficiais["4TRI/2026"],
  "Piloto/MVP da Plataforma de Jogos"
);

assert.deepEqual(
  bootstrap.metas
    .filter((item) => Number(item.indicadorId) === 10 && Number(item.ano) === 2026)
    .sort((a, b) => Number(a.mes) - Number(b.mes))
    .map((item) => item.metaMensal),
  [null, null, null, 1 / 3, 1 / 3, 1 / 3, 0.67, 0.67, 0.67, 1, 1, 1]
);

assert.equal(launches.length, 12);
assert.ok(launches.every((item) => item.unidadeApuradora === "SUCOL"));
assert.ok(launches.every((item) => item.diretoriaResponsavel === "DICOT"));

// 1TRI permanece legado e qualitativo, sem fabricar governança ou desempenho.
[1, 2, 3].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Homologado");
  assert.equal(launch.metaMensal, null);
  assert.equal(launch.resultadoMensal, null);
  assert.equal(launch.percentualAtingido, null);
  assert.equal(launch.situacaoCalculada, "Em andamento");
  assert.equal(launch.homologadoPor, null);
  assert.equal(launch.dataHomologacao, null);
  assert.ok(!launch.evidenciaId);
});

// ABR/MAI são acompanhamento qualitativo; JUN fecha o 2TRI.
[4, 5].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.metaMensal, 1 / 3);
  assert.equal(launch.resultadoMensal, null);
  assert.equal(launch.percentualAtingido, null);
  assert.equal(launch.situacaoCalculada, "Em acompanhamento");
  assert.equal(launch.camposEntrada.percentualEvolucaoPlataformaJogos, undefined);
  assert.equal(launch.usuarioResponsavel, "UNIDADE-SUCOL");
  assert.equal(launch.versaoAtual, 1);
});
assert.equal(byMonth[6].status, "Em preenchimento");
assert.equal(byMonth[6].metaMensal, 1 / 3);
assert.equal(byMonth[6].resultadoMensal, 0.1);
assert.equal(byMonth[6].percentualAtingido, 0.3);
assert.equal(byMonth[6].situacaoCalculada, "Abaixo da meta");
assert.equal(byMonth[6].usuarioResponsavel, "UNIDADE-SUCOL");
assert.equal(byMonth[6].versaoAtual, 1);
assert.equal(
  byMonth[6].camposEntrada.marcoAtualPlataformaJogos,
  "Registro de Aposta finalizado em ambiente de desenvolvimento"
);

// JUL/AGO não interpolam a evolução; SET guarda somente o fechamento oficial.
[7, 8].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.metaMensal, 0.67);
  assert.equal(launch.resultadoMensal, null);
  assert.equal(launch.percentualAtingido, null);
  assert.equal(launch.situacaoCalculada, "Em acompanhamento");
  assert.equal(launch.camposEntrada.percentualEvolucaoPlataformaJogos, undefined);
});
assert.equal(byMonth[9].status, "Em preenchimento");
assert.equal(byMonth[9].metaMensal, 0.67);
assert.equal(byMonth[9].resultadoMensal, 0.38);
assert.equal(byMonth[9].percentualAtingido, 0.5672);
assert.equal(byMonth[9].situacaoCalculada, "Abaixo da meta");
assert.match(byMonth[9].camposEntrada.descricaoAndamentoPlataformaJogos, /264 histórias de usuário/);
assert.match(byMonth[9].camposEntrada.descricaoAndamentoPlataformaJogos, /37,9%/);
assert.equal(byMonth[9].camposEntrada.referenciaDocumentalPlataformaJogos, "Informe DILOT/GERIN nº 0078/2026");

// OUT/NOV são acompanhamento futuro e DEZ é apenas a meta/marco do fechamento.
[10, 11, 12].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Não iniciado");
  assert.equal(launch.metaMensal, 1);
  assert.equal(launch.resultadoMensal, null);
  assert.equal(launch.percentualAtingido, null);
  assert.equal(launch.situacaoCalculada, undefined);
  assert.deepEqual(launch.camposEntrada, {});
});

const calculate = (month) => formulas.calcularIndicador(
  indicator,
  rule,
  byMonth[month],
  launches.filter((item) => Number(item.mes) <= month)
);
const march = calculate(3);
assert.equal(march.resultadoMensal, null);
assert.equal(march.metaTrimestral, null);
assert.equal(march.percentualAtingidoMensal, null);
assert.notEqual(march.situacao, "Abaixo da meta");

const june = calculate(6);
assert.equal(june.resultadoMensal, 0.1);
assert.equal(june.metaTrimestral, 1 / 3);
closeTo(june.percentualAtingidoMensal, 0.3);
assert.equal(june.situacao, "Abaixo da meta");

for (const month of [7, 8]) {
  const result = calculate(month);
  assert.equal(result.resultadoMensal, null);
  assert.equal(result.metaTrimestral, 0.67);
  assert.equal(result.percentualAtingidoMensal, null);
  assert.equal(result.situacao, "Em acompanhamento");
}

const september = calculate(9);
assert.equal(september.resultadoMensal, 0.38);
assert.equal(september.metaTrimestral, 0.67);
assert.equal(september.percentualAtingidoMensalFormatado, "56,72%");
assert.equal(september.situacao, "Abaixo da meta");

const q2Preview = quarterly.consolidarTrimestre(
  indicator,
  rule,
  launches.map((item) => Number(item.mes) === 6 ? { ...item, status: "Homologado" } : item),
  "2TRI/2026"
);
assert.equal(q2Preview.metaTrimestral, 1 / 3);
assert.equal(q2Preview.resultadoTrimestral, 0.1);
assert.equal(q2Preview.desempenhoTrimestral, 0.3);
assert.equal(q2Preview.situacaoTrimestral, "Abaixo da meta");

const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Sem dados", "SET em preenchimento não deve virar posição oficial");
const q3Preview = quarterly.consolidarTrimestre(
  indicator,
  rule,
  launches.map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item),
  "3TRI/2026"
);
assert.equal(q3Preview.metaTrimestral, 0.67);
assert.equal(q3Preview.resultadoTrimestral, 0.38);
assert.equal(q3Preview.desempenhoTrimestral, 0.5672);
assert.equal(q3Preview.situacaoTrimestral, "Abaixo da meta");

const serializedIndicator10 = JSON.stringify({ indicator, rule, launches });
assert.doesNotMatch(serializedIndicator10, /11\.11/);
assert.doesNotMatch(serializedIndicator10, /share de mercado\s*=\s*(?:38|100)%/i);

const protectedIndicators = Object.fromEntries(
  bootstrap.indicadores
    .filter((item) => [9, 16, 17, 19, 20].includes(Number(item.id)))
    .map((item) => [Number(item.id), item])
);
assert.equal(protectedIndicators[9].unidadeApuradora, "SULOT");
assert.equal(protectedIndicators[16].unidadeApuradora, "GENOL");
assert.equal(protectedIndicators[17].unidadeApuradora, "SULOT");
assert.equal(protectedIndicators[19].unidadeApuradora, "GENOL");
assert.equal(protectedIndicators[20].unidadeApuradora, "SUCOL");

for (const file of ["launches.js", "indicators.js", "approvals.js", "dashboard.js", "quarterlyView.js"]) {
  const source = fs.readFileSync(path.join(root, "assets", "js", file), "utf8");
  assert.match(source, /Evolução (?:oficial do projeto|do MVP|realizada do MVP)|evolução do MVP\/projeto/);
  assert.doesNotMatch(source, /share de mercado\s*=\s*(?:38|100)%/i);
}

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261023_004_indicador10_regularizacao_tecnica.sql"),
  "utf8"
);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /SET tipo_consolidacao = N'ultima_posicao_trimestral'/);
assert.match(migration, /unidade_medida = N'percentual'/);
assert.match(migration, /id IN \(N'115',N'116'\)/);
assert.match(migration, /id = N'117'/);
assert.match(migration, /id IN \(N'118',N'119',N'120'\)/);
assert.match(migration, /0\.5672/);
assert.match(migration, /264 histórias de usuário/);
assert.match(migration, /11\.11 não integra esta migration/);
assert.match(migration, /@linhasIndicador <> 1 OR @linhasLancamentos <> 6 OR @linhasConfiguracoes <> 2/);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\./i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+dbo\./i);

for (const file of ["bootstrap-data.js", "dataStore.js", "dashboard.js", "quarterlyView.js", "formulas.js", "quarterly.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`
  );
}

console.log("indicator10-regularization.test.js: OK");
