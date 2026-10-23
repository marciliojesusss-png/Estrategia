const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, console, Intl, Date };
context.window.window = context.window;
for (const file of ["currency.js", "formulas.js", "quarterly.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", file), "utf8"), context, { filename: file });
  if (file === "currency.js") context.CurrencyBR = context.window.CurrencyBR;
  if (file === "formulas.js") context.IndicatorFormulas = context.window.IndicatorFormulas;
}

const bootstrap = loadBootstrapData(root);
const formulas = context.window.IndicatorFormulas;
const quarterly = context.window.QuarterlyConsolidation;
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 16);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 16);
const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === 16);
const byMonth = Object.fromEntries(launches.map((item) => [Number(item.mes), item]));

assert.equal(indicator.indicador, "Apoio ao Desenvolvimento Socioambiental");
assert.equal(indicator.unidadeApuradora, "GENOL");
assert.equal(indicator.diretoriaResponsavel, "DICOT");
assert.equal(indicator.plano, "PEI");
assert.equal(indicator.metaAnualDescricao, "02 iniciativas apoiadas");
assert.equal(rule.tipoConsolidacao, "iniciativas_acumuladas");
assert.equal(rule.parametrosCalculo.campoId, "idIniciativaSocioambiental");
assert.equal(rule.parametrosCalculo.campoDescricao, "descricaoAndamentoSocioambiental");
assert.equal(rule.parametrosCalculo.permitirPeriodoNaDescricaoSemDataPontual, true);
assert.deepEqual(Array.from(rule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(
  bootstrap.metas.filter((item) => Number(item.indicadorId) === 16)
    .sort((a, b) => Number(a.mes) - Number(b.mes)).map((item) => item.metaMensal),
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2]
);

assert.equal(launches.length, 12);
assert.ok(launches.every((item) => item.unidadeApuradora === "GENOL"));
assert.ok(launches.every((item) => item.diretoriaResponsavel === "DICOT"));

// A carga legada de JAN–MAR é preservada, sem fabricar governança.
[1, 2, 3].forEach((month) => {
  assert.equal(byMonth[month].status, "Homologado");
  assert.equal(byMonth[month].homologadoPor, "Sistema");
  assert.equal(byMonth[month].evidencia, "");
});

// ABR–JUN refletem o estado real já existente e não são homologados.
[4, 5, 6].forEach((month) => {
  assert.equal(byMonth[month].status, "Em preenchimento");
  assert.equal(byMonth[month].resultadoMensal, 0);
  assert.equal(byMonth[month].percentualAtingido, 0);
  assert.ok(byMonth[month].evidenciaId);
  assert.equal(byMonth[month].preenchidoPor, "UNIDADE-SULOT");
});
assert.equal(byMonth[4].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[5].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[6].situacaoCalculada, "Abaixo da meta");

// JUL–SET representam uma única iniciativa, sem data pontual inventada.
[7, 8, 9].forEach((month) => {
  const launch = byMonth[month];
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.camposEntrada.idIniciativaSocioambiental, "brasil-ladies-cup-2026");
  assert.equal(launch.camposEntrada.statusIniciativaSocioambiental, "Apoiada/realizada");
  assert.equal(launch.camposEntrada.dataApoioIniciativa, "");
  assert.match(launch.camposEntrada.descricaoAndamentoSocioambiental, /09 e 12\/07\/2026/);
  assert.match(launch.camposEntrada.descricaoAndamentoSocioambiental, /Campinas\/SP/);
  assert.match(launch.camposEntrada.descricaoAndamentoSocioambiental, /R\$ 190\.000,00/);
  assert.equal(launch.resultadoAcumulado, 1);
  assert.equal(launch.percentualAtingido, 1);
  assert.equal(launch.evidenciaId, undefined);
  assert.equal(launch.homologadoPor, null);
});
assert.equal(byMonth[7].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[8].situacaoCalculada, "Em acompanhamento");
assert.equal(byMonth[9].situacaoCalculada, "Atingido");

const calculate = (month, scope = launches) => formulas.calcularIndicador(indicator, rule, byMonth[month], scope);
const march = calculate(3, launches.filter((item) => Number(item.mes) <= 3));
assert.equal(march.resultadoAcumulado, 0);
assert.equal(march.percentualAtingidoMensal, null);
assert.equal(march.situacao, "Em prospecção/estruturação");
const june = calculate(6, launches.filter((item) => Number(item.mes) <= 6));
assert.equal(june.resultadoAcumulado, 0);
assert.equal(june.percentualAtingidoMensal, 0);
assert.equal(june.situacao, "Abaixo da meta");

const july = calculate(7);
const august = calculate(8);
const september = calculate(9);
assert.equal(july.resultadoAcumulado, 1);
assert.equal(july.percentualMetaAnualRealizado, 0.5);
assert.equal(july.situacao, "Em acompanhamento");
assert.equal(august.resultadoAcumulado, 1, "a mesma iniciativa não pode ser contada novamente");
assert.equal(august.situacao, "Em acompanhamento");
assert.equal(september.resultadoAcumulado, 1);
assert.equal(september.percentualAtingidoMensal, 1);
assert.equal(september.percentualMetaAnualRealizado, 0.5);
assert.equal(september.situacao, "Atingido");

const fallbackScope = [
  { ...byMonth[7], camposEntrada: { ...byMonth[7].camposEntrada, idIniciativaSocioambiental: "", nomeIniciativaSocioambiental: "Brasil Ladies Cup — 2026" } },
  { ...byMonth[8], camposEntrada: { ...byMonth[8].camposEntrada, idIniciativaSocioambiental: "", nomeIniciativaSocioambiental: "  BRASIL ladies cup 2026 " } }
];
assert.equal(formulas.calcularIndicador(indicator, rule, fallbackScope[1], fallbackScope).resultadoAcumulado, 1);

const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Sem dados", "SET não deve virar posição oficial sem homologação real");
const q3Preview = quarterly.consolidarTrimestre(indicator, rule,
  launches.map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item), "3TRI/2026");
assert.equal(q3Preview.resultadoTrimestral, 1);
assert.equal(q3Preview.metaTrimestral, 1);
assert.equal(q3Preview.situacaoTrimestral, "Atingido");

const indicator19 = bootstrap.indicadores.find((item) => Number(item.id) === 19);
assert.equal(indicator19.unidadeApuradora, "GENOL");
assert.equal(indicator19.diretoriaResponsavel, "DICOT");
[223, 224, 225].forEach((id) => {
  const launch = bootstrap.lancamentos.find((item) => Number(item.id) === id);
  assert.equal(launch.status, "Em preenchimento");
  assert.equal(launch.resultadoMensal, 190000);
});

const migration = fs.readFileSync(path.join(root, "database", "sqlserver", "migrations",
  "20261023_001_indicador16_regularizacao_tecnica.sql"), "utf8");
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /SET tipo_consolidacao = N'iniciativas_acumuladas'/);
assert.match(migration, /id IN \(N'187',N'188',N'189'\)/);
assert.match(migration, /brasil-ladies-cup-2026/);
assert.match(migration, /dataApoioIniciativa\":\"\"/);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+dbo\.(?:homologacoes|evidencias|retificacoes|solicitacoes_reabertura|auditoria)/i);
assert.match(migration, /#homologacoesAntes/);
assert.match(migration, /#evidenciasAntes/);
assert.match(migration, /#auditoriaAntes/);

for (const file of ["bootstrap-data.js", "formulas.js", "launches.js"]) {
  assert.deepEqual(fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`);
}

console.log("indicator16-regularization.test.js: ok");
