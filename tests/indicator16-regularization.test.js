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
const calculations = {
  formatarPercentual(value) { return value === null || value === undefined ? "-" : `${Number(value) * 100}%`; },
  formatarValor(value) { return value === null || value === undefined ? "-" : String(Number(value)); }
};
context.Calculations = calculations;
context.window.Calculations = calculations;
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8"), context, { filename: "launches.js" });
const launchInternals = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "dataStore.js"), "utf8"), context, { filename: "dataStore.js" });
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
  JSON.parse(JSON.stringify(rule.parametrosCalculo.apresentacoesOficiaisTrimestrais)),
  {
    "1TRI/2026": {
      metaOficialReportada: null,
      resultadoOficialReportado: null,
      percentualAtingidoOficialReportado: null,
      situacaoOficial: null,
      curvaPercentual: 0,
      apresentacaoLiteralVazia: true,
      fonte: "Informe DILOT/GERIN nº 0029/2026",
      observacao: "O quadro oficial apresenta meta, realizado e atingimento como '-'; a observação documental registra curva de 0% no 1TRI."
    },
    "2TRI/2026": { metaOficialReportada: 0.5, resultadoOficialReportado: 0, percentualAtingidoOficialReportado: 0, situacaoOficial: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0056/2026" },
    "3TRI/2026": { metaOficialReportada: 0.5, resultadoOficialReportado: 0.5, percentualAtingidoOficialReportado: 1, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0078/2026" },
    "4TRI/2026": { metaOficialReportada: 1, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: null, previsao: true, fonte: "Curva anual prevista nos Informes DILOT/GERIN nº 0029/2026, 0056/2026 e 0078/2026", observacao: "Previsão de 100% com a 2ª iniciativa realizada; resultado não antecipado." }
  }
);
const normalizedRuntimeRule = context.window.DataStore.normalizeData("regrasIndicadores", [{
  indicadorId: 16,
  parametrosCalculo: {},
  camposEntrada: []
}])[0];
assert.equal(normalizedRuntimeRule.parametrosCalculo.campoId, "idIniciativaSocioambiental");
assert.equal(normalizedRuntimeRule.parametrosCalculo.campoDescricao, "descricaoAndamentoSocioambiental");
assert.equal(normalizedRuntimeRule.parametrosCalculo.permitirPeriodoNaDescricaoSemDataPontual, true);
assert.deepEqual(Array.from(normalizedRuntimeRule.parametrosCalculo.mesesFechamentoTrimestral), [3, 6, 9, 12]);
assert.deepEqual(
  JSON.parse(JSON.stringify(normalizedRuntimeRule.parametrosCalculo.apresentacoesOficiaisTrimestrais)),
  JSON.parse(JSON.stringify(rule.parametrosCalculo.apresentacoesOficiaisTrimestrais))
);
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
assert.equal(march.apresentacaoLiteralVaziaSocioambiental, true);
assert.equal(march.fonteOficialDocumentalSocioambiental, "Informe DILOT/GERIN nº 0029/2026");
const june = calculate(6, launches.filter((item) => Number(item.mes) <= 6));
assert.equal(june.resultadoAcumulado, 0);
assert.equal(june.percentualAtingidoMensal, 0);
assert.equal(june.situacao, "Abaixo da meta");
assert.equal(june.metaOficialDocumentalSocioambiental, 0.5);
assert.equal(june.resultadoOficialDocumentalSocioambiental, 0);
assert.equal(june.percentualAtingidoOficialDocumentalSocioambiental, 0);
assert.equal(june.situacaoOficialDocumentalSocioambiental, "Abaixo da meta");

const july = calculate(7);
const august = calculate(8);
const september = calculate(9);
assert.equal(july.resultadoAcumulado, 1);
assert.equal(july.percentualMetaAnualRealizado, 0.5);
assert.equal(july.percentualAtingidoAnual, 0.5);
assert.equal(july.situacao, "Em acompanhamento");
assert.equal(august.resultadoAcumulado, 1, "a mesma iniciativa não pode ser contada novamente");
assert.equal(august.percentualAtingidoAnual, 0.5);
assert.equal(august.situacao, "Em acompanhamento");
assert.equal(september.resultadoAcumulado, 1);
assert.equal(september.resultadoOficialAnual, 1);
assert.equal(september.metaTrimestral, 1);
assert.equal(september.percentualAtingidoMensal, 1);
assert.equal(september.percentualMetaAnualRealizado, 0.5);
assert.equal(september.percentualAtingidoAnual, 0.5);
assert.equal(september.percentualAtingidoMensalFormatado, "100%");
assert.equal(september.percentualAtingidoAnualFormatado, "50%");
assert.equal(september.situacao, "Atingido");
assert.equal(september.metaOficialDocumentalSocioambiental, 0.5);
assert.equal(september.resultadoOficialDocumentalSocioambiental, 0.5);
assert.equal(september.percentualAtingidoOficialDocumentalSocioambiental, 1);
assert.equal(september.situacaoOficialDocumentalSocioambiental, "Atingido");
assert.equal(september.fonteOficialDocumentalSocioambiental, "Informe DILOT/GERIN nº 0078/2026");

const septemberDetails = Object.fromEntries(JSON.parse(JSON.stringify(
  launchInternals.indicator16CalculatedDetails(september, rule, byMonth[9])
)));
assert.equal(septemberDetails["Dados técnicos — Iniciativas apoiadas acumuladas"], "1 iniciativa");
assert.equal(septemberDetails["Dados técnicos — Meta anual"], "2 iniciativas");
assert.equal(septemberDetails["Dados técnicos — Progresso anual"], "50%");
assert.equal(septemberDetails["Fechamento oficial — Meta"], "50%");
assert.equal(septemberDetails["Fechamento oficial — Resultado"], "50%");
assert.equal(septemberDetails["Fechamento oficial — Atingimento"], "100%");
assert.equal(septemberDetails["Fechamento oficial — Fonte"], "Informe DILOT/GERIN nº 0078/2026");

const marchDetails = Object.fromEntries(JSON.parse(JSON.stringify(
  launchInternals.indicator16CalculatedDetails(march, rule, byMonth[3])
)));
assert.equal(marchDetails["Fechamento oficial — Meta"], "-");
assert.equal(marchDetails["Fechamento oficial — Resultado"], "-");
assert.equal(marchDetails["Fechamento oficial — Atingimento"], "-");
assert.equal(marchDetails["Curva documental do trimestre"], "0%");

const decemberWithSecondInitiative = {
  ...byMonth[12],
  status: "Em preenchimento",
  camposEntrada: {
    idIniciativaSocioambiental: "segunda-iniciativa-socioambiental-2026",
    nomeIniciativaSocioambiental: "Segunda iniciativa socioambiental de 2026",
    tipoIniciativaSocioambiental: "Desenvolvimento socioambiental",
    statusIniciativaSocioambiental: "Apoiada/realizada",
    dataApoioIniciativa: "2026-12-01",
    descricaoAndamentoSocioambiental: "Segunda iniciativa válida para simulação do fechamento anual."
  }
};
const december = formulas.calcularIndicador(
  indicator,
  rule,
  decemberWithSecondInitiative,
  [...launches.filter((item) => Number(item.mes) <= 9), decemberWithSecondInitiative]
);
assert.equal(december.resultadoAcumulado, 2);
assert.equal(december.resultadoOficialAnual, 2);
assert.equal(december.metaTrimestral, 2);
assert.equal(december.percentualAtingidoMensal, 1);
assert.equal(december.percentualAtingidoAnual, 1);
assert.equal(december.situacao, "Atingido");
assert.equal(december.metaOficialDocumentalSocioambiental, 1);
assert.equal(december.resultadoOficialDocumentalSocioambiental, 1);
assert.equal(december.percentualAtingidoOficialDocumentalSocioambiental, 1);
assert.equal(december.situacaoOficialDocumentalSocioambiental, "Atingido");
assert.equal(december.previsaoDocumentalSocioambiental, true);

const fallbackScope = [
  { ...byMonth[7], camposEntrada: { ...byMonth[7].camposEntrada, idIniciativaSocioambiental: "", nomeIniciativaSocioambiental: "Brasil Ladies Cup — 2026" } },
  { ...byMonth[8], camposEntrada: { ...byMonth[8].camposEntrada, idIniciativaSocioambiental: "", nomeIniciativaSocioambiental: "  BRASIL ladies cup 2026 " } }
];
assert.equal(formulas.calcularIndicador(indicator, rule, fallbackScope[1], fallbackScope).resultadoAcumulado, 1);

const q3 = quarterly.consolidarTrimestre(indicator, rule, launches, "3TRI/2026");
assert.equal(q3.statusTrimestre, "Sem dados", "SET não deve virar posição oficial sem homologação real");
assert.equal(q3.apresentacaoOficialDocumental, false);
assert.equal(q3.possuiPosicaoDocumental, false);
const q3Preview = quarterly.consolidarTrimestre(indicator, rule,
  launches.map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item), "3TRI/2026");
assert.equal(q3Preview.resultadoTrimestral, 0.5);
assert.equal(q3Preview.metaTrimestral, 0.5);
assert.equal(q3Preview.desempenhoTrimestral, 1);
assert.equal(q3Preview.situacaoTrimestral, "Atingido");
assert.equal(q3Preview.resultadoTecnicoTrimestral, 1);
assert.equal(q3Preview.metaTecnicaTrimestral, 1);
assert.equal(q3Preview.desempenhoTecnicoTrimestral, 1);
assert.equal(q3Preview.resultadoDocumentalTrimestral, 0.5);
assert.equal(q3Preview.desempenhoOficialDocumentalTrimestral, 1);
assert.equal(q3Preview.fonteDocumentalTrimestral, "Informe DILOT/GERIN nº 0078/2026");

const q1 = quarterly.consolidarTrimestre(indicator, rule, launches, "1TRI/2026");
assert.equal(q1.statusTrimestre, "Fechado");
assert.equal(q1.metaTrimestral, null);
assert.equal(q1.resultadoTrimestral, null);
assert.equal(q1.desempenhoTrimestral, null);
assert.equal(q1.metaTecnicaTrimestral, 0);
assert.equal(q1.resultadoTecnicoTrimestral, 0);
assert.equal(q1.apresentacaoOficialDocumental, true);
assert.equal(q1.fonteDocumentalTrimestral, "Informe DILOT/GERIN nº 0029/2026");

const q2Preview = quarterly.consolidarTrimestre(indicator, rule,
  launches.map((item) => Number(item.mes) === 6 ? { ...item, status: "Homologado" } : item), "2TRI/2026");
assert.equal(q2Preview.metaTrimestral, 0.5);
assert.equal(q2Preview.resultadoTrimestral, 0);
assert.equal(q2Preview.desempenhoTrimestral, 0);
assert.equal(q2Preview.situacaoTrimestral, "Abaixo da meta");
assert.equal(q2Preview.metaTecnicaTrimestral, 1);
assert.equal(q2Preview.resultadoTecnicoTrimestral, 0);
assert.equal(q2Preview.fonteDocumentalTrimestral, "Informe DILOT/GERIN nº 0056/2026");

const q4Simulation = quarterly.consolidarTrimestre(
  indicator,
  rule,
  [
    ...launches.filter((item) => Number(item.mes) <= 9)
      .map((item) => Number(item.mes) === 9 ? { ...item, status: "Homologado" } : item),
    { ...decemberWithSecondInitiative, status: "Homologado" }
  ],
  "4TRI/2026"
);
assert.equal(q4Simulation.metaTrimestral, 1);
assert.equal(q4Simulation.resultadoTrimestral, 1);
assert.equal(q4Simulation.desempenhoTrimestral, 1);
assert.equal(q4Simulation.situacaoTrimestral, "Atingido");
assert.equal(q4Simulation.metaTecnicaTrimestral, 2);
assert.equal(q4Simulation.resultadoTecnicoTrimestral, 2);

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

for (const file of ["bootstrap-data.js", "dataStore.js", "formulas.js", "launches.js", "quarterly.js"]) {
  assert.deepEqual(fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve permanecer byte a byte idêntico no espelho público`);
}

console.log("indicator16-regularization.test.js: ok");
