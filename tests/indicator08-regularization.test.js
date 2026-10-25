const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const formulas = require("../assets/js/formulas.js");
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 8);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 8);
const bootstrapLaunches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 8);
const byMonth = Object.fromEntries(bootstrapLaunches.map((item) => [Number(item.mes), item]));
const closeTo = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deveria ser aproximadamente ${expected}`);
};

assert.equal(indicator.tipoConsolidacao, "razao_acumulada_no_periodo");
assert.equal(rule.tipoCalculo, "razao_canais_digitais");
assert.equal(rule.tipoConsolidacao, "razao_acumulada_no_periodo");
assert.equal(rule.campoResultadoPrincipal, "resultadoAcumulado");
assert.equal(rule.campoPercentualAtingido, "percentualAtingidoAnual");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);

const targetCurve = [0.2770, 0.2829, 0.2805, 0.2803, 0.2798, 0.2798, 0.2815, 0.2827, 0.2837, 0.2859, 0.2878, 0.2911];
assert.deepEqual(
  Array.from({ length: 12 }, (_, index) => rule.parametrosCalculo.metasPorCompetencia[`2026-${String(index + 1).padStart(2, "0")}`]),
  targetCurve
);
assert.deepEqual(
  bootstrap.metas.filter((item) => Number(item.indicadorId) === 8).sort((a, b) => a.mes - b.mes).map((item) => item.metaMensal),
  targetCurve
);

// A fotografia transacional atual não antecipa a retificação futura de JAN–MAR.
for (const id of [85, 86, 87]) {
  const launch = bootstrapLaunches.find((item) => Number(item.id) === id);
  assert.equal(launch.status, "Reaberto");
  assert.equal(launch.versaoAtual, 2);
  assert.equal(launch.evidenciaId, null);
  assert.equal(launch.observacaoArea, "teste");
}
assert.equal(byMonth[1].camposEntrada.arrecadacaoCanaisEletronicosMes, 560000000);
assert.equal(byMonth[2].camposEntrada.arrecadacaoCanaisEletronicosMes, 590000000);
assert.equal(byMonth[3].camposEntrada.arrecadacaoCanaisEletronicosMes, 620200000);
for (const id of [85, 86, 87]) {
  assert.ok(bootstrap.homologacoes.some((item) => Number(item.lancamentoId) === id && item.status === "Homologado"));
  assert.ok(bootstrap.homologacoes.some((item) => Number(item.lancamentoId) === id && item.acao === "lancamento_reaberto" && item.status === "Reaberto"));
  assert.ok(bootstrap.historico.some((item) => Number(item.registroId) === id && item.acao === "lancamento_reaberto"));
}

const components = [
  [2030288935.15, 624392611.64],
  [1954616641.35, 580582876.90],
  [1982006914.05, 565188124.10],
  [2036790906.20, 584304495.10],
  [2129528475.60, 606895557.45],
  [2058726434.20, 576730146.88],
  [1965181462.25, 574100983.07],
  [2043755619.10, 609265150.11]
];
const expectedAccumulated = [
  0.30753879451836, 0.30238495377307, 0.29666324341835, 0.29417233385936,
  0.29224276148960, 0.29019897567803, 0.29046790964108, 0.29143203706977
];
const realLaunches = components.map(([total, channels], index) => ({
  id: 85 + index,
  indicadorId: 8,
  ano: 2026,
  mes: index + 1,
  competencia: `2026-${String(index + 1).padStart(2, "0")}`,
  metaMensal: targetCurve[index],
  status: index < 3 ? "Retificado" : "Em preenchimento",
  camposEntrada: {
    arrecadacaoTotalProdutosLoteriasMes: total,
    arrecadacaoCanaisEletronicosMes: channels
  }
}));

for (let index = 0; index < realLaunches.length; index += 1) {
  const result = formulas.calcularIndicador(indicator, rule, realLaunches[index], realLaunches.slice(0, index + 1));
  closeTo(result.resultadoMensal, components[index][1] / components[index][0]);
  closeTo(result.resultadoAcumulado, expectedAccumulated[index]);
  closeTo(result.percentualAtingidoAnual, expectedAccumulated[index] / targetCurve[index]);
  closeTo(result.percentualAtingidoAcumulado, expectedAccumulated[index] / targetCurve[index]);
}

const feb = formulas.calcularIndicador(indicator, rule, realLaunches[1], realLaunches.slice(0, 2));
closeTo(feb.resultadoMensal, 0.2970315839012848);
closeTo(feb.resultadoAcumulado, 0.3023849537730697);
assert.equal(feb.resultadoMensalFormatado, "29,7%");
assert.equal(feb.resultadoAcumuladoFormatado, "30,24%");

const mar = formulas.calcularIndicador(indicator, rule, realLaunches[2], realLaunches.slice(0, 3));
closeTo(mar.resultadoMensal, 0.2851595118531166);
closeTo(mar.resultadoAcumulado, 0.2966632434183453);
assert.equal(mar.resultadoMensalFormatado, "28,52%");
assert.equal(mar.resultadoAcumuladoFormatado, "29,67%");

// A listagem deve escolher a posição acumulada, nunca a razão isolada do mês.
const calculations = {
  formatarPercentual(value, minimumFractionDigits = 0, maximumFractionDigits = Math.max(2, minimumFractionDigits)) {
    if (value === null || value === undefined || value === "") return "-";
    return `${(Number(value) * 100).toLocaleString("pt-BR", { minimumFractionDigits, maximumFractionDigits })}%`;
  },
  formatarValor(value) { return String(value); },
  resolverMetaPercentualAcoesPropostas() { return null; }
};
const testSituations = {
  normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
};
const launchContext = {
  window: { PageModules: {}, Calculations: calculations, Situations: testSituations },
  Calculations: calculations,
  Situations: testSituations
};
vm.createContext(launchContext);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8"), launchContext);
const launchInternals = launchContext.window.__LAUNCHES_FILTER_TEST_INTERNALS__;
const listedMar = launchInternals.getLaunchListPerformance(rule, realLaunches[2], mar);
closeTo(listedMar.resultado, 0.2966632434183453);
closeTo(listedMar.percentual, 0.2966632434183453 / 0.2805);
for (const fieldName of ["resultadoAcumuladoDocumentalCanaisDigitais", "percentualAtingidoOficialCanaisDigitais"]) {
  const field = { nome: fieldName, tipo: "percentual" };
  assert.equal(launchInternals.usesDecimalPercentageEntry(field), true);
  closeTo(launchInternals.parseEntryValue("percentual", launchInternals.formatEntryValue(field, 1.0282)), 1.0282);
}
const janDetails = JSON.parse(JSON.stringify(launchInternals.indicator08CalculatedDetails(
  formulas.calcularIndicador(indicator, rule, realLaunches[0], [realLaunches[0]])
)));
assert.deepEqual(janDetails, [
  ["Atingimento técnico", "111,02%"],
  ["Resultado acumulado documental", "-"],
  ["Atingimento oficial documental", "-"]
]);
for (const field of [
  { nome: "resultadoAcumuladoDocumentalCanaisDigitais", rotulo: "Resultado acumulado documental", tipo: "percentual" },
  { nome: "percentualAtingidoOficialCanaisDigitais", rotulo: "Atingimento oficial documental", tipo: "percentual" },
  { nome: "tipoPosicaoCanaisDigitais", rotulo: "Natureza da posicao", tipo: "texto" },
  { nome: "fonteResultadoCanaisDigitais", rotulo: "Fonte documental", tipo: "texto" }
]) {
  const html = launchInternals.renderEntryInput(field, null);
  assert.match(html, /placeholder="-"/);
  assert.match(html, /value=""/);
  assert.doesNotMatch(html, /value="0(?:,|\.)00/);
}

// SET é uma posição documental direta; componentes financeiros inexistentes continuam inexistentes.
const september = {
  indicadorId: 8,
  ano: 2026,
  mes: 9,
  competencia: "2026-09",
  metaMensal: 0.2837,
  status: "Em preenchimento",
  camposEntrada: {
    resultadoAcumuladoDocumentalCanaisDigitais: 0.2917,
    percentualAtingidoOficialCanaisDigitais: 1.0282,
    tipoPosicaoCanaisDigitais: "fechamento_trimestral"
  }
};
const septemberResult = formulas.calcularIndicador(indicator, rule, september, [...realLaunches, september]);
assert.equal(septemberResult.resultadoMensal, null);
assert.equal(septemberResult.resultadoCalculadoAcumulado, null);
assert.equal(septemberResult.resultadoAcumulado, 0.2917);
assert.equal(septemberResult.percentualAtingidoAnual, 1.0282);
assert.equal(septemberResult.situacao, "Atingido");
assert.equal(septemberResult.origemResultadoCanaisDigitais, "documental_direta");

for (const month of [4, 5, 6, 7, 8]) assert.equal(byMonth[month].status, "Em preenchimento");
assert.equal(byMonth[9].status, "Em preenchimento");
assert.equal(byMonth[9].camposEntrada.arrecadacaoCanaisEletronicosMes, undefined);
assert.equal(byMonth[9].camposEntrada.arrecadacaoTotalProdutosLoteriasMes, undefined);
for (const month of [10, 11, 12]) {
  assert.equal(byMonth[month].status, "Não iniciado");
  assert.equal(byMonth[month].resultadoOficialAnual, null);
  assert.equal(byMonth[month].metaMensal, targetCurve[month - 1]);
}

const appContext = { window: {}, console, URLSearchParams, Intl, Date };
appContext.window.window = appContext.window;
for (const file of ["indicator-periodicity.js", "currency.js", "calculations.js", "formulas.js", "quarterly.js", "dashboard.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), appContext, { filename: file });
  if (file === "indicator-periodicity.js") appContext.IndicatorPeriodicity = appContext.window.IndicatorPeriodicity;
  if (file === "currency.js") appContext.CurrencyBR = appContext.window.CurrencyBR;
  if (file === "calculations.js") appContext.Calculations = appContext.window.Calculations;
  if (file === "formulas.js") appContext.IndicatorFormulas = appContext.window.IndicatorFormulas;
}
const quarterly = appContext.window.QuarterlyConsolidation;
const allTechnicalLaunches = [...realLaunches, september,
  { indicadorId: 8, ano: 2026, mes: 10, status: "Não iniciado", metaMensal: 0.2859, camposEntrada: {} },
  { indicadorId: 8, ano: 2026, mes: 11, status: "Não iniciado", metaMensal: 0.2878, camposEntrada: {} },
  { indicadorId: 8, ano: 2026, mes: 12, status: "Não iniciado", metaMensal: 0.2911, camposEntrada: {} }
];
for (const [quarter, meta, result, performance] of [
  ["1TRI/2026", 0.2805, 0.2967, 1.058],
  ["2TRI/2026", 0.2798, 0.2902, 1.0372],
  ["3TRI/2026", 0.2837, 0.2917, 1.0282]
]) {
  const consolidated = quarterly.consolidarTrimestre(indicator, rule, allTechnicalLaunches, quarter);
  assert.equal(consolidated.statusTrimestre, "Parcial", "fechamento ainda não homologado não pode ser marcado como fechado");
  assert.equal(consolidated.mesesHomologados, 0);
  closeTo(consolidated.metaTrimestral, meta);
  closeTo(consolidated.resultadoTrimestral, result);
  closeTo(consolidated.desempenhoTrimestral, performance);
}
const q4 = quarterly.consolidarTrimestre(indicator, rule, allTechnicalLaunches, "4TRI/2026");
assert.equal(q4.statusTrimestre, "Sem dados");
assert.equal(q4.metaTrimestral, 0.2911);
assert.equal(q4.resultadoTrimestral, null);

const dashboard = appContext.window.StrategicResults.calcularDashboard({
  indicadores: [indicator],
  regras: [rule],
  lancamentos: allTechnicalLaunches
}).resultadosOficiais[0];
assert.equal(dashboard.status, null);
assert.equal(dashboard.competencia, null);
assert.equal(dashboard.possuiPosicaoOficial, false);
assert.equal(dashboard.resultado, null);

const migration = fs.readFileSync(path.join(root, "database", "sqlserver", "migrations", "20261024_003_indicador08_regularizacao_tecnica.sql"), "utf8");
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /status=N'Retificado'/);
assert.match(migration, /versao_atual=2/);
assert.match(migration, /ABORTADO: JAN\/FEV\/MAR ainda não foram corrigidos/);
assert.match(migration, /N'88',0\.2803/);
assert.match(migration, /N'93',0\.2837,NULL,0\.291700000000000000,1\.028200000000000000/);
assert.match(migration, /N'96',0\.2911,NULL,NULL,NULL,NULL,N'Não iniciado'/);
assert.match(migration, /@linhasIndicador<>1 OR @linhasLancamentos<>9 OR @linhasConfiguracoes<>2/);
assert.match(migration, /JSON_MODIFY\(@regrasAntes,'\$\[7\]'/);
assert.match(migration, /JSON_MODIFY\(@metasDepois,'\$\[66\]\.metaMensal'/);
assert.doesNotMatch(migration, /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)dbo\.(?:homologacoes|evidencias|auditoria|retificacoes|solicitacoes_reabertura)\b/i);
const launchDml = migration.match(/UPDATE l SET([\s\S]*?)SET @linhasLancamentos=@@ROWCOUNT;/i);
assert.ok(launchDml, "DML dos lançamentos alvo deve ser identificável");
assert.match(launchDml[0], /INNER JOIN @alvos a ON a\.id=l\.id/);
assert.doesNotMatch(launchDml[0], /N?'(?:85|86|87)'/);

// A edicao da versao reaberta usa o servico transacional que cria a retificacao real.
const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
const persistenceSource = fs.readFileSync(path.join(root, "assets", "js", "central-persistence.js"), "utf8");
assert.match(launchesSource, /unresolvedReopenCycle\(lancamento\)/);
assert.match(launchesSource, /prompt\("Informe a justificativa da retifica\\u00e7\\u00e3o:/);
assert.match(persistenceSource, /justificativaRetificacao:\s*reason/);
assert.match(persistenceSource, /api\/lancamentos\/\$\{encodeURIComponent\(launchId\)\}/);
assert.match(persistenceSource, /method:\s*"PATCH"/);
assert.match(persistenceSource, /api\/lancamentos\/\$\{encodeURIComponent\(launchId\)\}\/submeter/);

const reopenEvents = [{
  lancamentoId: 85,
  acao: "lancamento_reaberto",
  dataAcao: "2026-10-24T17:40:00-03:00"
}];
assert.equal(launchInternals.unresolvedReopenCycle({ id: 85, status: "Em preenchimento", versaoAtual: 2 }, reopenEvents), true);
assert.equal(launchInternals.requiresTransactionalPersistence({ id: 85, status: "Em preenchimento", versaoAtual: 2 }, reopenEvents), true);
assert.equal(launchInternals.unresolvedReopenCycle({ id: 86, status: "Reaberto", versaoAtual: 2 }, reopenEvents), true);
assert.equal(launchInternals.requiresTransactionalPersistence({ id: 87, status: "Retificado", versaoAtual: 2 }, reopenEvents), true);
assert.equal(launchInternals.requiresTransactionalPersistence({ id: 88, status: "Em preenchimento", versaoAtual: 1 }, reopenEvents), false);

const baseService = fs.readFileSync(path.join(root, "app", "services", "BaseDadosService.php"), "utf8");
assert.match(baseService, /LancamentoStateMachine::REOPENED/);
assert.match(baseService, /LancamentoStateMachine::RECTIFIED/);
assert.match(baseService, /LancamentoStateMachine::HOMOLOGATED/);
assert.match(baseService, /PATCH \/api\/lancamentos\/\{id\}/);

const launchService = fs.readFileSync(path.join(root, "app", "services", "LancamentoService.php"), "utf8");
assert.match(launchService, /pendingRetificationCycle/);
assert.match(launchService, /reopenCycleActive/);
assert.match(launchService, /existsForVersionTransition/);
assert.match(launchService, /RazaoCanaisDigitaisCalculator::calculate/);

console.log("Indicator 08 regularization tests passed.");
