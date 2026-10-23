const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date };
context.window.window = context.window;
for (const file of ["currency.js", "formulas.js", "quarterly.js"]) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
  if (file === "formulas.js") context.IndicatorFormulas = context.window.IndicatorFormulas;
}

const bootstrap = loadBootstrapData(root);
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 20);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 20);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 20);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

assert.equal(indicator.indicador, "Visibilidade dos Repasses Sociais das Loterias CAIXA");
assert.equal(indicator.unidadeApuradora, "SUCOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PN");
assert.equal(indicator.pilar, "Sustentabilidade e Cidadania");
assert.equal(indicator.metaAnualDescricao, "Implantar 100% das ações propostas");
assert.equal(rule.tipoCalculo, "execucao_acoes_propostas");
assert.equal(rule.tipoConsolidacao, "acoes_realizadas_acumuladas");
assert.equal(rule.parametrosCalculo.totalAcoesPropostas, 2);
assert.equal(rule.parametrosCalculo.statusQueConta, "Publicada/realizada");
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(
  bootstrap.metas
    .filter((item) => Number(item.indicadorId) === 20 && Number(item.ano) === 2026)
    .sort((a, b) => Number(a.mes) - Number(b.mes))
    .map((item) => Number(item.metaMensal)),
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2]
);

assert.equal(launches.length, 12);
assert.ok(launches.every((item) => item.unidadeApuradora === "SUCOL"));
assert.ok(launches.every((item) => item.diretoriaResponsavel === "DICOT"));

// JAN–MAR preservam somente o status legado, sem fabricar evento transacional.
[1, 2, 3].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Homologado");
  assert.equal(launch.metaMensal, 0);
  assert.equal(launch.resultadoAcumulado, 0);
  assert.equal(launch.percentualAtingido, null);
  assert.notEqual(launch.situacaoCalculada, "Abaixo da meta");
  assert.equal(launch.homologadoPor, null);
  assert.equal(launch.dataHomologacao, null);
  assert.ok(!launch.evidenciaId);
});

// ABR/MAI são meses de acompanhamento; somente JUN fecha o 2TRI.
[4, 5].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.metaMensal, 1);
  assert.equal(launch.resultadoMensal, 0);
  assert.equal(launch.percentualAtingido, 0);
  assert.equal(launch.situacaoCalculada, "Em acompanhamento");
  assert.equal(launch.usuarioResponsavel, "UNIDADE-SUCOL");
  assert.equal(launch.versaoAtual, 1);
});

const june = byMonth[6];
assert.equal(june.status, "Em preenchimento");
assert.equal(june.metaMensal, 1);
assert.equal(june.camposEntrada.acaoPropostaVisibilidade, "relatorio_sorte_em_numeros_2025");
assert.equal(june.camposEntrada.statusAcaoVisibilidade, "Publicada/realizada");
assert.equal(june.camposEntrada.dataConclusaoVisibilidade, "2026-06-17");
assert.equal(june.resultadoMensal, 0.5);
assert.equal(june.percentualAtingido, 1);
assert.equal(june.situacaoCalculada, "Atingido");
assert.ok(!june.evidenciaId);

// JUL–SET carregam a mesma ação de JUN, não quatro ações distintas.
[7, 8, 9].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.metaMensal, 1);
  assert.equal(launch.camposEntrada.acaoPropostaVisibilidade, "relatorio_sorte_em_numeros_2025");
  assert.equal(launch.camposEntrada.statusAcaoVisibilidade, "Publicada/realizada");
  assert.equal(launch.camposEntrada.dataConclusaoVisibilidade, "2026-06-17");
  assert.equal(launch.resultadoMensal, 0.5, "realizado anual deve permanecer em 50%");
  assert.equal(launch.percentualAtingido, 1, "atingimento do período deve permanecer em 100%");
  assert.ok(!launch.evidenciaId);
  assert.equal(launch.homologadoPor, null);
});
assert.equal(byMonth[7].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[8].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[9].situacaoCalculada, "Atingido");

[10, 11, 12].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Não iniciado");
  assert.equal(launch.metaMensal, 2);
  assert.deepEqual(launch.camposEntrada, {});
  assert.equal(launch.resultadoMensal, null);
  assert.equal(launch.percentualAtingido, null);
});

const calculate = (month) => formulas.calcularIndicador(
  indicator,
  rule,
  byMonth[month],
  launches.filter((item) => Number(item.mes) <= month)
);
const marchResult = calculate(3);
assert.equal(marchResult.acoesRealizadasAcumuladas, 0);
assert.equal(marchResult.percentualAtingidoMensal, null);
assert.notEqual(marchResult.situacao, "Abaixo da meta");

const aprilResult = calculate(4);
const mayResult = calculate(5);
assert.equal(aprilResult.situacao, "Em acompanhamento");
assert.equal(mayResult.situacao, "Em acompanhamento");

[6, 7, 8, 9].forEach((month) => {
  const result = calculate(month);
  assert.equal(result.acoesRealizadasAcumuladas, 1, "a mesma ação deve ser deduplicada pelo Set");
  assert.equal(result.resultadoOficialAnual, 0.5);
  assert.equal(result.percentualAtingidoMensal, 1);
  assert.deepEqual(Array.from(result.acoesRealizadas), ["relatorio_sorte_em_numeros_2025"]);
});
assert.equal(calculate(7).situacao, "Em acompanhamento");
assert.equal(calculate(8).situacao, "Em acompanhamento");
assert.equal(calculate(9).situacao, "Atingido");

const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Sem dados", "SET não deve virar posição oficial sem homologação real");
const q3Preview = quarterly.consolidarTrimestre(
  indicator,
  rule,
  launches.map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item),
  "3TRI/2026"
);
assert.equal(q3Preview.resultadoTrimestral, 1);
assert.equal(q3Preview.metaTrimestral, 1);
assert.equal(q3Preview.situacaoTrimestral, "Atingido");

// Proteções explícitas dos indicadores já regularizados.
const protectedIndicators = Object.fromEntries(
  bootstrap.indicadores
    .filter((item) => [9, 16, 17, 19].includes(Number(item.id)))
    .map((item) => [Number(item.id), item])
);
assert.equal(protectedIndicators[9].unidadeApuradora, "SULOT");
assert.equal(protectedIndicators[16].unidadeApuradora, "GENOL");
assert.equal(protectedIndicators[17].unidadeApuradora, "SULOT");
assert.equal(protectedIndicators[19].unidadeApuradora, "GENOL");
assert.ok([16, 17, 19].every((id) => protectedIndicators[id].diretoriaResponsavel === "DICOT"));

const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261023_003_indicador20_regularizacao_tecnica.sql"),
  "utf8"
);
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /SET tipo_consolidacao = N'acoes_realizadas_acumuladas'/);
assert.match(migration, /id IN \(N'232',N'233'\)/);
assert.match(migration, /id IN \(N'235',N'236',N'237'\)/);
assert.match(migration, /relatorio_sorte_em_numeros_2025/);
assert.match(migration, /N'\[3,6,9,12\]'/);
assert.match(migration, /@linhasIndicador <> 1 OR @linhasLancamentos <> 5 OR @linhasConfiguracoes <> 2/);
assert.match(migration, /governança foi criada, removida ou alterada/);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+dbo\./i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+dbo\./i);

for (const file of ["bootstrap-data.js", "formulas.js", "quarterly.js", "dashboard.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`
  );
}

console.log("indicator20-regularization.test.js: OK");
