const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 4);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 4);
const launches = bootstrap.lancamentos
  .filter((item) => Number(item.indicadorId) === 4 && Number(item.ano) === 2026)
  .sort((a, b) => Number(a.mes) - Number(b.mes));
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

assert.equal(indicator.indicador, "Aprimoramento da Experiência do Cliente");
assert.equal(indicator.plano, "PN");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(rule.tipoCalculo, "melhorias_acumuladas");
assert.equal(rule.tipoConsolidacao, "quantidade_acumulada");
assert.equal(rule.metaAnualValor, 0.25);
assert.equal(rule.parametrosCalculo.totalMelhoriasPlano2026, 22);
assert.equal(rule.parametrosCalculo.metaMinimaMelhoriasAno, 6);
assert.deepEqual(rule.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.deepEqual(launches.map((item) => item.id), [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]);

const formulas = require("../assets/js/formulas.js");
function calculate(month) {
  return formulas.calcularIndicador(
    indicator,
    rule,
    byMonth[month],
    launches.filter((item) => Number(item.mes) <= month)
  );
}

for (const month of [1, 2, 4, 5, 7, 8]) {
  assert.equal(formulas.resolverTipoPosicaoAprimoramento(byMonth[month]), "acompanhamento");
  assert.equal(calculate(month).resultadoMensal, null);
  assert.equal(calculate(month).percentualAtingidoMensal, null);
  assert.equal(calculate(month).situacao, "Em acompanhamento");
}
for (const month of [10, 11]) {
  assert.equal(formulas.resolverTipoPosicaoAprimoramento(byMonth[month]), "acompanhamento");
  assert.equal(calculate(month).resultadoMensal, null);
  assert.equal(calculate(month).percentualAtingidoMensal, null);
  assert.equal(calculate(month).situacao, "Sem avaliação");
}
assert.equal(formulas.resolverTipoPosicaoAprimoramento(byMonth[12]), "fechamento_quantitativo");
assert.equal(calculate(12).statusCalculo, "aguardando_resultado_oficial");
assert.equal(calculate(12).metaTrimestral, 6 / 22);
assert.equal(calculate(12).metaQuantidadeTrimestral, 6);
assert.equal(calculate(12).resultadoMensal, null);
assert.equal(calculate(12).situacao, "Sem avaliação");

const march = calculate(3);
assert.equal(march.metaTrimestral, 1 / 22);
assert.equal(march.resultadoMensal, 1 / 22);
assert.equal(march.percentualAtingidoMensal, 1);
assert.equal(march.melhoriasImplementadasAcumuladas, 1);
assert.equal(march.situacao, "Atingido");

const june = calculate(6);
assert.equal(june.metaTrimestral, 3 / 22);
assert.ok(Math.abs(june.resultadoMensal - (4 / 22)) < 1e-12);
assert.ok(Math.abs(june.percentualAtingidoMensal - (4 / 3)) < 1e-12);
assert.equal(june.percentualAtingidoMensalFormatado, "133,33%");
assert.notEqual(june.percentualAtingidoMensal, 0.1818 / 0.1364);
assert.equal(june.metaQuantidadeTrimestral, 3);
assert.equal(june.melhoriasImplementadasAcumuladas, 4);
assert.equal(june.situacao, "Atingido");

const september = calculate(9);
assert.equal(september.metaTrimestral, 4 / 22);
assert.ok(Math.abs(september.resultadoMensal - (6 / 22)) < 1e-12);
assert.equal(september.percentualAtingidoMensal, 1.5);
assert.equal(september.metaQuantidadeTrimestral, 4);
assert.equal(september.melhoriasImplementadasAcumuladas, 6);
assert.equal(september.situacao, "Atingido");

assert.equal(
  [3, 6, 9].reduce((sum, month) => sum + Number(byMonth[month].camposEntrada.melhoriasImplementadasMes), 0),
  6,
  "as melhorias devem ser incrementadas apenas nos três fechamentos"
);
assert.match(byMonth[3].camposEntrada.descricaoMelhoriasMes, /mensagens educativas/i);
assert.match(byMonth[6].camposEntrada.descricaoMelhoriasMes, /Teimosinhas/);
assert.equal(byMonth[6].camposEntrada.demandaTecnologicaAprimoramento, "24547165");
assert.match(byMonth[9].camposEntrada.descricaoMelhoriasMes, /login simplificado/i);
assert.match(byMonth[9].camposEntrada.descricaoMelhoriasMes, /Aviso de Instabilidade/i);
assert.equal(byMonth[9].camposEntrada.identificadorLoginSimplificado, "CHG00004941");
assert.equal(byMonth[9].camposEntrada.identificadorAvisoInstabilidadeAndroid, "STRY00058023");
assert.equal(byMonth[9].camposEntrada.identificadorAvisoInstabilidadeIos, "STRY00058012");

for (const launch of launches) {
  assert.equal(launch.camposEntrada.fontePlanilhaAprimoramento, "16.10(3).xlsx");
  assert.doesNotMatch(JSON.stringify(launch), /d1c657ca/i);
}
assert.equal(byMonth[6].camposEntrada.atingimentoPlanilhaAprimoramento, 0.1818 / 0.1364);
assert.equal(byMonth[6].percentualAtingido, 4 / 3);
assert.equal(byMonth[10].camposEntrada.realizadoPlanilhaAprimoramento, 0);
assert.equal(byMonth[10].resultadoMensal, null);
assert.equal(byMonth[12].resultadoMensal, null);

assert.equal(byMonth[1].status, "Homologado");
assert.equal(byMonth[2].status, "Homologado");
assert.equal(byMonth[3].status, "Homologado");
assert.equal(byMonth[1].homologadoPor, "Sistema");
assert.equal(byMonth[2].homologadoPor, "Sistema");
for (const month of [4, 5, 6, 7, 8, 9]) assert.equal(byMonth[month].status, "Em preenchimento");
for (const month of [10, 11, 12]) assert.equal(byMonth[month].status, "Não iniciado");

const ids = new Set(launches.map((item) => String(item.id)));
assert.equal((bootstrap.homologacoes || []).filter((item) => ids.has(String(item.lancamentoId))).length, 0);
assert.equal((bootstrap.evidencias || []).filter((item) => ids.has(String(item.lancamentoId))).length, 0);
assert.equal((bootstrap.historico || []).filter((item) => ids.has(String(item.entidadeId))).length, 0);

globalThis.IndicatorPeriodicity = require("../assets/js/indicator-periodicity.js");
globalThis.IndicatorFormulas = formulas;
delete require.cache[require.resolve("../assets/js/quarterly.js")];
require("../assets/js/quarterly.js");
const quarters = globalThis.QuarterlyConsolidation.consolidarAno(indicator, rule, launches);
assert.deepEqual(quarters.map((item) => item.mesesEsperados), [1, 1, 1, 1]);
assert.equal(quarters[0].statusTrimestre, "Fechado");
assert.equal(quarters[0].metaTrimestral, 1 / 22);
assert.equal(quarters[0].resultadoTrimestral, 1 / 22);
assert.equal(quarters[0].desempenhoTrimestral, 1);
assert.equal(quarters[1].statusTrimestre, "Parcial");
assert.ok(Math.abs(quarters[1].resultadoTrimestral - (4 / 22)) < 1e-12);
assert.ok(Math.abs(quarters[1].desempenhoTrimestral - (4 / 3)) < 1e-12);
assert.equal(quarters[2].statusTrimestre, "Parcial");
assert.ok(Math.abs(quarters[2].resultadoTrimestral - (6 / 22)) < 1e-12);
assert.equal(quarters[2].desempenhoTrimestral, 1.5);
assert.equal(quarters[3].statusTrimestre, "Sem dados");
assert.equal(quarters[3].metaTrimestral, 6 / 22);
assert.equal(quarters[3].resultadoTrimestral, null);

const context = { window: {}, console, URLSearchParams, Intl, Date };
context.window.window = context.window;
for (const file of ["indicator-periodicity.js", "currency.js", "ieo-recorrente.js", "calculations.js", "formulas.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  context.IndicatorPeriodicity = context.window.IndicatorPeriodicity;
  context.CurrencyBR = context.window.CurrencyBR;
  context.Calculations = context.window.Calculations;
  context.IndicatorFormulas = context.window.IndicatorFormulas;
}
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "dashboard.js"), "utf8"), context, { filename: "dashboard.js" });
const dashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  regras: [rule],
  lancamentos: launches
}).resultadosOficiais[0];
assert.equal(dashboard.competencia, "Março/2026");
assert.equal(Number(dashboard.lancamento.id), 39);
assert.equal(dashboard.resultado, 1 / 22);
assert.equal(dashboard.percentualAtingido, 1);
assert.equal(dashboard.situacaoCalculada, "Atingido");

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261024_001_indicador04_regularizacao_tecnica.sql"),
  "utf8"
);
assert.match(migration, /lançamentos 37–48/);
assert.match(migration, /N'42'/);
assert.match(migration, /N'45'/);
assert.match(migration, /\[3,6,9,12\]/);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\.(homologacoes|evidencias|auditoria)/i);
assert.doesNotMatch(migration, /DELETE\s+FROM/i);

// Estado real de MAR: fechamento reaberto e auditado, nunca re-homologado pela migration.
assert.match(migration, /id\s*=\s*N'39'[\s\S]*?status\s*=\s*N'Em preenchimento'[\s\S]*?versao_atual\s*=\s*2/);
assert.match(migration, /usuario_responsavel\s*=\s*N'UNIDADE-SUCOL'/);
assert.match(migration, /acao=N'lancamento_reaberto'/);
assert.match(migration, /acao=N'referencia_evidencia_atualizada'/);
assert.match(migration, /entidade=N'lancamentos' AND entidade_id=N'39'\) <> 2/);

const launchUpdateTargets = [...migration.matchAll(/UPDATE dbo\.lancamentos\s+SET[\s\S]*?WHERE id=N'(\d+)'/g)]
  .map((match) => Number(match[1]));
assert.deepEqual(launchUpdateTargets, [42, 45], "somente os lançamentos 42 e 45 podem receber UPDATE");
assert.doesNotMatch(migration, /UPDATE dbo\.lancamentos[\s\S]*?WHERE id=N'(?:37|38|39|40|41|43|44|46|47|48)'/);

// JUN: aceitar o estado parcial real e preservar integralmente os três valores numéricos.
assert.match(migration, /DECLARE @junInicial BIT/);
assert.match(migration, /DECLARE @junFinal BIT/);
assert.match(migration, /resultado_calculado=N'0\.181818'/);
assert.match(migration, /resultado_oficial=N'0\.181818'/);
assert.match(migration, /percentual_atingido=N'1\.33333'/);
assert.match(
  migration,
  /UPDATE dbo\.lancamentos\s+SET dados_entrada_json=@dadosJunDepois\s+WHERE id=N'42'/,
  "JUN deve receber somente merge do JSON"
);
assert.match(migration, /JSON_MODIFY\(@dadosJunAntes,'\$\.metaQuantidadeAcumuladaAprimoramento',3\)/);
assert.match(migration, /demandaTecnologicaAprimoramento',N'24547165'/);
assert.match(migration, /Informe DILOT\/GERIN nº 0056\/2026/);

// SET: o estado inicial Sem dados é válido; o resultado técnico usa 6/22 e o atingimento 6/4.
assert.match(migration, /DECLARE @setInicial BIT/);
assert.match(migration, /DECLARE @setFinal BIT/);
assert.match(migration, /situacao=N'Sem dados'/);
assert.match(migration, /resultado_calculado=N'0\.272727272727272727'/);
assert.match(migration, /percentual_atingido=N'1\.5'/);
assert.match(migration, /"melhoriasImplementadasMes":2/);
assert.match(migration, /"melhoriasImplementadasAcumuladas":6/);
assert.match(migration, /"metaQuantidadeAcumuladaAprimoramento":4/);

// Cadastro/configuração são condicionais e idempotentes.
assert.match(migration, /WHERE id=@indicadorId AND tipo_consolidacao IS NULL/);
assert.match(migration, /tipo_consolidacao = N'quantidade_acumulada'/);
assert.match(migration, /JSON_QUERY\(@regraAntes,'\$\.parametrosCalculo\.mesesFechamentoTrimestral'\) IS NULL/);
assert.match(migration, /@junInicial=0 AND @junFinal=0/);
assert.match(migration, /@setInicial=0 AND @setFinal=0/);
assert.match(migration, /mais de quatro linhas seriam alteradas/);

// Snapshot e comparação bidirecional protegem toda a governança, inclusive as auditorias de MAR.
for (const table of ["homologacoes", "evidencias", "retificacoes", "solicitacoes_reabertura", "auditoria"]) {
  assert.match(migration, new RegExp(`SELECT \\* INTO #[^\\s]+Antes FROM dbo\\.${table}`));
  assert.match(migration, new RegExp(`SELECT \\* FROM dbo\\.${table} EXCEPT SELECT \\* FROM #[^\\s]+Antes`));
  assert.match(migration, new RegExp(`SELECT \\* FROM #[^\\s]+Antes EXCEPT SELECT \\* FROM dbo\\.${table}`));
}
assert.match(migration, /WHERE id NOT IN \(N'42',N'45'\)/);
assert.match(migration, /outra regra de indicador foi alterada/);
assert.doesNotMatch(migration, /\b(?:INSERT|DELETE|MERGE)\s+(?:INTO\s+|FROM\s+)?dbo\./i);

const currentSqlState = {
  indicatorConsolidation: null,
  march: { status: "Em preenchimento", version: 2, result: 0.0454, performance: 1, situation: "Atingido", audits: 2 },
  june: { documented: false, resultStored: "0.181818", performanceStored: "1.33333" },
  september: { status: "Não iniciado", situation: "Sem dados", loaded: false },
  closingMonths: null
};
function plannedTargets(state) {
  if (state.march.status !== "Em preenchimento" || state.march.version !== 2 || state.march.audits !== 2) {
    throw new Error("estado inesperado de MAR");
  }
  const targets = [];
  if (state.indicatorConsolidation === null) targets.push("indicadores:4");
  else if (state.indicatorConsolidation !== "quantidade_acumulada") throw new Error("consolidação inesperada");
  if (!state.june.documented) targets.push("lancamentos:42");
  if (!state.september.loaded) targets.push("lancamentos:45");
  if (state.closingMonths === null) targets.push("configuracoes:regrasIndicadores");
  else assert.deepEqual(state.closingMonths, [3, 6, 9, 12]);
  return targets;
}
assert.deepEqual(plannedTargets(currentSqlState), [
  "indicadores:4",
  "lancamentos:42",
  "lancamentos:45",
  "configuracoes:regrasIndicadores"
]);
assert.deepEqual(plannedTargets({
  ...currentSqlState,
  indicatorConsolidation: "quantidade_acumulada",
  june: { ...currentSqlState.june, documented: true },
  september: { status: "Em preenchimento", situation: "Atingido", loaded: true },
  closingMonths: [3, 6, 9, 12]
}), [], "uma segunda execução deve ser idempotente");
assert.throws(() => plannedTargets({
  ...currentSqlState,
  march: { ...currentSqlState.march, status: "Homologado" }
}), /estado inesperado de MAR/);

console.log("indicator04-regularization.test.js: ok");
