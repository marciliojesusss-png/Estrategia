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
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 11);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 11);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 11);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const closeTo = (actual, expected, epsilon = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} não está próximo de ${expected}`);
};

assert.equal(indicator.indicador, "Ampliar a Capacidade de Desenvolvimento de Soluções de TIC");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PN");
assert.equal(indicator.pilar, "Tecnologia e Inovação");
assert.equal(indicator.tipoCalculo, "marco_projeto_percentual");
assert.equal(indicator.unidadeMedida, "percentual");
assert.equal(
  indicator.metaAnualDescricao,
  "Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026."
);

assert.equal(rule.nome, indicator.indicador);
assert.equal(rule.tipoCalculo, "marco_projeto_percentual");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_trimestral");
assert.equal(rule.unidadeMedida, "percentual");
assert.equal(rule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(
  Object.values(rule.parametrosCalculo.curvaTrimestralPercentual).map((item) => item.metaPercentual),
  [0.35, 0.70, 0.85, 1]
);

assert.equal(launches.length, 12);

// 1TRI legado preservado, sem atribuição sintética de homologação.
for (const month of [1, 2]) {
  assert.equal(byMonth[month].status, "Homologado");
  assert.equal(byMonth[month].metaMensal, 0.35);
  assert.equal(byMonth[month].resultadoMensal, 0);
  assert.equal(byMonth[month].percentualAtingido, 0);
  assert.equal(byMonth[month].situacaoCalculada, "Abaixo da meta");
  assert.equal(byMonth[month].homologadoPor, null);
  assert.equal(byMonth[month].dataHomologacao, null);
}
assert.equal(byMonth[3].status, "Homologado");
assert.equal(byMonth[3].metaMensal, 0.35);
assert.equal(byMonth[3].resultadoMensal, 0.35);
assert.equal(byMonth[3].percentualAtingido, 1);
assert.equal(byMonth[3].situacaoCalculada, "Atingido");
assert.equal(byMonth[3].homologadoPor, null);
assert.equal(byMonth[3].dataHomologacao, null);

// 2TRI permanece concentrado em JUN, inclusive a observação histórica de 23 profissionais.
for (const month of [4, 5]) {
  assert.equal(byMonth[month].status, "Não iniciado");
  assert.equal(byMonth[month].metaMensal, 0.70);
  assert.equal(byMonth[month].resultadoMensal, null);
}
assert.equal(byMonth[6].status, "Em preenchimento");
assert.equal(byMonth[6].metaMensal, 0.70);
assert.equal(byMonth[6].resultadoMensal, 0.35);
assert.equal(byMonth[6].percentualAtingido, 0.50);
assert.equal(byMonth[6].situacaoCalculada, "Abaixo da meta");
assert.match(byMonth[6].observacaoArea, /23 profissionais/);

// JUL é qualitativo; AGO e SET apontam para o mesmo evento, sem duplicar contratação.
assert.equal(byMonth[7].status, "Em preenchimento");
assert.equal(byMonth[7].metaMensal, 0.85);
assert.equal(byMonth[7].resultadoMensal, null);
assert.equal(byMonth[7].percentualAtingido, null);
assert.equal(byMonth[7].situacaoCalculada, "Em acompanhamento");

for (const month of [8, 9]) {
  assert.equal(byMonth[month].status, "Em preenchimento");
  assert.equal(byMonth[month].metaMensal, 0.85);
  assert.equal(byMonth[month].resultadoMensal, 1);
  closeTo(byMonth[month].percentualAtingido, 1 / 0.85);
  assert.equal(byMonth[month].camposEntrada.eventoCapacidadeTicId, "os-25173021-spassu-2026");
  assert.equal(byMonth[month].camposEntrada.numeroOrdemServicoTIC, "25173021");
  assert.equal(byMonth[month].camposEntrada.dataAberturaOrdemServicoTIC, "2026-06-10");
  assert.equal(byMonth[month].camposEntrada.dataConclusaoOrdemServicoTIC, "2026-08-14");
  assert.equal(byMonth[month].camposEntrada.quantidadeProfissionaisAdicionaisTIC, 18);
  assert.equal(byMonth[month].camposEntrada.fabricaSoftwareTIC, "Spassu");
}
assert.equal(byMonth[8].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[9].situacaoCalculada, "Atingido");
assert.match(byMonth[9].camposEntrada.descricaoAndamentoTIC, /mesmo evento/);
assert.match(byMonth[9].camposEntrada.descricaoAndamentoTIC, /não representa nova contratação/);

const calculate = (month) => formulas.calcularIndicador(
  indicator,
  rule,
  byMonth[month],
  launches.filter((item) => Number(item.mes) <= month)
);
const july = calculate(7);
assert.equal(july.resultadoMensal, null);
assert.equal(july.percentualAtingidoMensal, null);
assert.equal(july.situacao, "Em acompanhamento");

const august = calculate(8);
assert.equal(august.resultadoMensal, 1);
closeTo(august.percentualAtingidoMensal, 1 / 0.85);
assert.equal(august.percentualAtingidoMensalFormatado, "117,65%");
assert.equal(august.situacao, "Em acompanhamento");

const september = calculate(9);
assert.equal(september.resultadoMensal, 1);
closeTo(september.percentualAtingidoMensal, 1 / 0.85);
assert.equal(september.percentualAtingidoMensalFormatado, "117,65%");
assert.equal(september.situacao, "Atingido");

// SET ainda não é posição oficial enquanto estiver em preenchimento.
const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Sem dados");
assert.equal(q3.resultadoTrimestral, null);

for (const month of [10, 11, 12]) {
  assert.equal(byMonth[month].status, "Não iniciado");
  assert.equal(byMonth[month].metaMensal, 1);
  assert.equal(byMonth[month].resultadoMensal, null);
  assert.equal(byMonth[month].percentualAtingido, null);
  assert.equal(byMonth[month].situacaoCalculada, undefined);
}

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261023_005_indicador11_regularizacao_tecnica.sql"),
  "utf8"
);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /@linhasIndicador <> 1 OR @linhasLancamentos <> 3 OR @linhasConfiguracoes <> 1/);
assert.match(migration, /id = N'127'/);
assert.match(migration, /id = N'128'/);
assert.match(migration, /id = N'129'/);
assert.match(migration, /1\.176470588235294118/);
assert.match(migration, /os-25173021-spassu-2026/);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\./i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+dbo\./i);

for (const file of ["bootstrap-data.js", "dataStore.js", "formulas.js", "quarterly.js", "dashboard.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`
  );
}

console.log("indicator11-regularization.test.js: OK");
