const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = {
  window: {},
  console,
  URLSearchParams,
  Intl,
  Date
};
context.window.window = context.window;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "indicator-periodicity.js"), "utf8"),
  context,
  { filename: "indicator-periodicity.js" }
);
context.window.IndicatorPeriodicity = context.IndicatorPeriodicity;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "currency.js"), "utf8"),
  context,
  { filename: "currency.js" }
);
context.CurrencyBR = context.window.CurrencyBR;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "ieo-recorrente.js"), "utf8"),
  context,
  { filename: "ieo-recorrente.js" }
);

["calculations.js", "formulas.js"].forEach((file) => {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
    context,
    { filename: file }
  );
});
context.Calculations = context.window.Calculations;
context.IndicatorFormulas = context.window.IndicatorFormulas;
vm.runInNewContext(
  fs.readFileSync(path.join(root, "assets", "js", "dashboard.js"), "utf8"),
  context,
  { filename: "dashboard.js" }
);

const bootstrap = loadBootstrapData(root);
const indicators = bootstrap.indicadores;
const launches = bootstrap.lancamentos;
const rules = bootstrap.regrasIndicadores;
const lucroMensalTargets = {
  1: 90811101.33,
  2: 77462728.16,
  3: 90084434.66
};
const lucroMensalResults = {
  1: 119377680.03,
  2: 102633750.55,
  3: 114310457.11
};
Object.assign(rules.find((item) => item.indicadorId === 7), {
  tipoCalculo: "lucro_recorrente_mensal",
  tipoConsolidacao: "ultima_posicao_mensal_homologada",
  unidadeMedida: "moeda",
  metaAnualValor: 1305318247.20,
  parametrosCalculo: {
    campoValorMensal: "lucroLiquidoRecorrenteCompetencia",
    campoValorAcumuladoLegado: "lucroLiquidoRecorrenteAcumulado",
    metaTipo: "curva_mensal_por_competencia",
    metasMensaisPorCompetencia: {
      "2026-01": lucroMensalTargets[1],
      "2026-02": lucroMensalTargets[2],
      "2026-03": lucroMensalTargets[3]
    }
  },
  camposEntrada: [{ nome: "lucroLiquidoRecorrenteCompetencia", obrigatorio: true }]
});
launches.filter((item) => item.indicadorId === 7 && lucroMensalResults[item.mes]).forEach((item) => {
  const result = lucroMensalResults[item.mes];
  const target = lucroMensalTargets[item.mes];
  item.camposEntrada = { ...item.camposEntrada, lucroLiquidoRecorrenteCompetencia: result };
  item.metaMensal = target;
  item.resultadoMensal = result;
  item.resultadoOficialAnual = result;
  item.percentualAtingido = result / target;
  item.percentualAtingidoMensal = result / target;
  item.percentualAtingidoAnual = result / target;
  item.situacaoCalculada = result >= target ? "Atingido" : "Abaixo da meta";
});
const results = context.window.StrategicResults.calcularDashboard({
  indicadores: indicators,
  lancamentos: launches,
  regras: rules
}).resultadosOficiais;

assert.equal(results.length, 23);
assert.equal(results.filter((item) => context.window.StrategicResults.officialSituation(item) === "Sem dados").length, 2);
assert.equal(results.filter((item) => item.indicador.plano === "PEI").length, 11);
assert.equal(results.filter((item) => item.indicador.plano === "PN").length, 12);
assert.equal(new Set(results.map((item) => item.indicador.pilar)).size, 6);

const ofertasDashboardOficial = results.find((item) => item.indicador.id === 1);
assert.equal(context.window.StrategicResults.officialSituation(ofertasDashboardOficial), "Atingido");
assert.equal(ofertasDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(ofertasDashboardOficial.meta - 0.1) < 0.000001);
assert.ok(Math.abs(ofertasDashboardOficial.resultado - (1241587 / 2773599)) < 0.000001);
assert.ok(Math.abs(ofertasDashboardOficial.percentualAtingido - ((1241587 / 2773599) / 0.1)) < 0.000001);

const npsDashboardOficial = results.find((item) => item.indicador.id === 2);
assert.equal(context.window.StrategicResults.officialSituation(npsDashboardOficial), "Em acompanhamento");
assert.equal(npsDashboardOficial.competencia, "Março/2026");
assert.equal(npsDashboardOficial.meta, 55);
assert.equal(npsDashboardOficial.resultado, 55);
assert.equal(npsDashboardOficial.percentualAtingido, 1);

const climaDashboardOficial = results.find((item) => item.indicador.id === 12);
assert.equal(context.window.StrategicResults.officialSituation(climaDashboardOficial), "Em acompanhamento");
assert.equal(climaDashboardOficial.competencia, "Março/2026");
assert.equal(climaDashboardOficial.meta, 60);
assert.equal(climaDashboardOficial.resultado, 60);
assert.equal(climaDashboardOficial.percentualAtingido, 1);

const aprimoramentoDashboardOficial = results.find((item) => item.indicador.id === 4);
assert.equal(context.window.StrategicResults.officialSituation(aprimoramentoDashboardOficial), "Atingido");
assert.equal(aprimoramentoDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(aprimoramentoDashboardOficial.meta - 0.0454) < 0.000001);
assert.ok(Math.abs(aprimoramentoDashboardOficial.resultado - 0.0454) < 0.000001);
assert.ok(Math.abs(aprimoramentoDashboardOficial.percentualAtingido - 1) < 0.000001);

const capacidadeTicDashboardOficial = results.find((item) => item.indicador.id === 11);
assert.equal(context.window.StrategicResults.officialSituation(capacidadeTicDashboardOficial), "Atingido");
assert.equal(capacidadeTicDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(capacidadeTicDashboardOficial.meta - 0.35) < 0.000001);
assert.ok(Math.abs(capacidadeTicDashboardOficial.resultado - 0.35) < 0.000001);
assert.ok(Math.abs(capacidadeTicDashboardOficial.percentualAtingido - 1) < 0.000001);

const plataformaJogosDashboardOficial = results.find((item) => item.indicador.id === 10);
assert.equal(context.window.StrategicResults.officialSituation(plataformaJogosDashboardOficial), "Em andamento");
assert.equal(plataformaJogosDashboardOficial.competencia, "Março/2026");
assert.equal(plataformaJogosDashboardOficial.meta, null);
assert.equal(plataformaJogosDashboardOficial.resultado, null);
assert.equal(plataformaJogosDashboardOficial.percentualAtingido, null);

const principiosJogoResponsavelDashboardOficial = results.find((item) => item.indicador.id === 18);
assert.equal(context.window.StrategicResults.officialSituation(principiosJogoResponsavelDashboardOficial), "Atingido");
assert.equal(principiosJogoResponsavelDashboardOficial.competencia, "Março/2026");
assert.equal(principiosJogoResponsavelDashboardOficial.meta, 1);
assert.equal(principiosJogoResponsavelDashboardOficial.resultado, 1);
assert.equal(principiosJogoResponsavelDashboardOficial.percentualAtingido, 1);

const apoioSocioambientalDashboardOficial = results.find((item) => item.indicador.id === 16);
assert.equal(context.window.StrategicResults.officialSituation(apoioSocioambientalDashboardOficial), "Em prospecção/estruturação");
assert.equal(apoioSocioambientalDashboardOficial.competencia, "Março/2026");
assert.equal(apoioSocioambientalDashboardOficial.meta, 0);
assert.equal(apoioSocioambientalDashboardOficial.resultado, 0);
assert.equal(apoioSocioambientalDashboardOficial.percentualAtingido, null);

const capacitacaoDashboardOficial = results.find((item) => item.indicador.id === 15);
assert.equal(context.window.StrategicResults.officialSituation(capacitacaoDashboardOficial), "Atingido");
assert.equal(capacitacaoDashboardOficial.competencia, "Março/2026");
assert.equal(capacitacaoDashboardOficial.meta, 0.90);
assert.ok(Math.abs(capacitacaoDashboardOficial.resultado - (137 / 151)) < 0.000001);
assert.equal(capacitacaoDashboardOficial.percentualAtingido, 1);

const incentivoDashboardOficial = results.find((item) => item.indicador.id === 19);
assert.equal(context.window.StrategicResults.officialSituation(incentivoDashboardOficial), "Em prospecção/estruturação");
assert.equal(incentivoDashboardOficial.competencia, "Março/2026");
assert.equal(incentivoDashboardOficial.meta, 0);
assert.equal(incentivoDashboardOficial.resultado, 0);
assert.equal(incentivoDashboardOficial.percentualAtingido, null);

const visibilidadeDashboardOficial = results.find((item) => item.indicador.id === 20);
assert.equal(context.window.StrategicResults.officialSituation(visibilidadeDashboardOficial), "Em elaboração/homologação");
assert.equal(visibilidadeDashboardOficial.competencia, "Março/2026");
assert.equal(visibilidadeDashboardOficial.meta, 0);
assert.equal(visibilidadeDashboardOficial.resultado, 0);
assert.equal(visibilidadeDashboardOficial.percentualAtingido, null);

const jogoResponsavelCapacitacaoDashboardOficial = results.find((item) => item.indicador.id === 21);
assert.equal(context.window.StrategicResults.officialSituation(jogoResponsavelCapacitacaoDashboardOficial), "Atingido");
assert.equal(jogoResponsavelCapacitacaoDashboardOficial.competencia, "Março/2026");
assert.equal(jogoResponsavelCapacitacaoDashboardOficial.meta, 0.90);
assert.ok(Math.abs(jogoResponsavelCapacitacaoDashboardOficial.resultado - (137 / 151)) < 0.000001);
assert.equal(jogoResponsavelCapacitacaoDashboardOficial.percentualAtingido, 1);

const lucroDashboardOficial = results.find((item) => item.indicador.id === 7);
assert.equal(context.window.StrategicResults.officialSituation(lucroDashboardOficial), "Atingido");
assert.equal(lucroDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(lucroDashboardOficial.meta - 90084434.66) < 0.0001);
assert.ok(Math.abs(lucroDashboardOficial.resultado - 114310457.11) < 0.0001);
assert.ok(Math.abs(lucroDashboardOficial.percentualAtingido - (114310457.11 / 90084434.66)) < 0.000001);

const ieoDashboardOficial = results.find((item) => item.indicador.id === 6);
assert.equal(context.window.StrategicResults.officialSituation(ieoDashboardOficial), "Atingido");
assert.equal(ieoDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(ieoDashboardOficial.meta - 0.1441) < 0.000001);
assert.ok(Math.abs(ieoDashboardOficial.resultado - 0.108) < 0.000001);
assert.ok(Math.abs(ieoDashboardOficial.percentualAtingido - (0.1441 / 0.108)) < 0.000001);

const repasseDashboardOficial = results.find((item) => item.indicador.id === 17);
assert.equal(context.window.StrategicResults.officialSituation(repasseDashboardOficial), "Atingido");
assert.equal(repasseDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(repasseDashboardOficial.meta - 2142991572.00) < 0.0001);
assert.ok(Math.abs(repasseDashboardOficial.resultado - 2253033146.00) < 0.0001);
assert.ok(Math.abs(repasseDashboardOficial.percentualAtingido - (2253033146.00 / 2142991572.00)) < 0.000001);

const digitalIndicator = indicators.find((item) => item.id === 8);
const digitalRule = rules.find((item) => item.indicadorId === 8);
const digitalDashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [digitalIndicator],
  regras: [digitalRule],
  lancamentos: [
    {
      id: 8001, indicadorId: 8, ano: 2026, mes: 1, nomeMes: "Janeiro", status: "Homologado",
      camposEntrada: { arrecadacaoCanaisEletronicosMes: 590000000, arrecadacaoTotalProdutosLoteriasMes: 1990000000 }
    },
    {
      id: 8002, indicadorId: 8, ano: 2026, mes: 2, nomeMes: "Fevereiro", status: "Homologado",
      camposEntrada: { arrecadacaoCanaisEletronicosMes: 590000000, arrecadacaoTotalProdutosLoteriasMes: 1990000000 }
    },
    {
      id: 8003, indicadorId: 8, ano: 2026, mes: 3, nomeMes: "Março", status: "Em preenchimento",
      camposEntrada: { arrecadacaoCanaisEletronicosMes: 590200000, arrecadacaoTotalProdutosLoteriasMes: 1986900000 }
    }
  ]
}).resultadosOficiais[0];
assert.ok(Math.abs(digitalDashboard.resultado - (1180000000 / 3980000000)) < 0.000001);
assert.equal(digitalDashboard.competencia, "Fevereiro/2026");
assert.equal(digitalDashboard.meta, 0.2805);

const principiosIndicator = { ...indicators.find((item) => item.id === 18), periodicidade: "Trimestral" };
const principiosRule = rules.find((item) => item.indicadorId === 18);
const principiosBase = [
  { id: "P-MAR", indicadorId: 18, ano: 2026, mes: 3, nomeMes: "Março", trimestre: "1TRI/2026", status: "Homologado", camposEntrada: { elementoRGF: "Envolvimento das partes interessadas", acaoExecutada: "Instituição do Fórum", statusAcao: "Concluída" } },
  { id: "P-ABR", indicadorId: 18, ano: 2026, mes: 4, nomeMes: "Abril", trimestre: "2TRI/2026", status: "Em preenchimento", camposEntrada: { elementoRGF: "Orientação ao jogador para tratamento", acaoExecutada: "Revisão da relação de entidades", statusAcao: "Concluída" } },
  { id: "P-JUN", indicadorId: 18, ano: 2026, mes: 6, nomeMes: "Junho", trimestre: "2TRI/2026", status: "Não iniciado", camposEntrada: {} }
];
const principiosBeforeJune = context.window.StrategicResults.calcularDashboard({
  indicadores: [principiosIndicator], regras: [principiosRule], lancamentos: principiosBase
}).resultadosOficiais[0];
assert.equal(principiosBeforeJune.competencia, "Março/2026", "Abril não pode substituir a posição trimestral oficial.");

const principiosJune = context.window.StrategicResults.calcularDashboard({
  indicadores: [principiosIndicator],
  regras: [principiosRule],
  lancamentos: principiosBase.map((item) => item.id === "P-JUN" ? {
    ...item,
    status: "Homologado",
    camposEntrada: { elementoRGF: "Orientação ao jogador para tratamento", acaoExecutada: "Revisão da relação de entidades", statusAcao: "Concluída" }
  } : item)
}).resultadosOficiais[0];
assert.equal(principiosJune.competencia, "Junho/2026");
assert.equal(principiosJune.meta, 2);
assert.equal(principiosJune.resultado, 2);
assert.equal(principiosJune.percentualAtingido, 1);

const capacitacaoIndicator = { ...indicators.find((item) => item.id === 15), periodicidade: "Mensal" };
const capacitacaoRule = rules.find((item) => item.indicadorId === 15);
const capacitacaoPositions = [
  {
    id: "C-MAR", indicadorId: 15, ano: 2026, mes: 3, nomeMes: "Março", trimestre: "1TRI/2026", status: "Homologado",
    camposEntrada: { tipoPosicaoCapacitacao: "apuracao_quantitativa", publicoAlvoElegivelCapacitacao: 151, empregadosCapacitadosCapacitacao: 137 }
  },
  {
    id: "C-ABR", indicadorId: 15, ano: 2026, mes: 4, nomeMes: "Abril", trimestre: "2TRI/2026", status: "Homologado",
    camposEntrada: { tipoPosicaoCapacitacao: "acompanhamento", acoesAcompanhamentoCapacitacao: "Concluído relatório técnico." }
  },
  {
    id: "C-MAI", indicadorId: 15, ano: 2026, mes: 5, nomeMes: "Maio", trimestre: "2TRI/2026", status: "Homologado",
    camposEntrada: { tipoPosicaoCapacitacao: "acompanhamento", acoesAcompanhamentoCapacitacao: "Realizada apresentação oficial da Trilha." }
  }
];
const capacitacaoEntreMedicoes = context.window.StrategicResults.calcularDashboard({
  indicadores: [capacitacaoIndicator], regras: [capacitacaoRule], lancamentos: capacitacaoPositions
}).resultadosOficiais[0];
assert.equal(capacitacaoEntreMedicoes.competencia, "Março/2026");
assert.ok(Math.abs(capacitacaoEntreMedicoes.resultado - (137 / 151)) < 0.000001);
assert.equal(capacitacaoEntreMedicoes.percentualAtingido, 1);
assert.equal(capacitacaoEntreMedicoes.situacaoCalculada, "Atingido");
assert.equal(capacitacaoEntreMedicoes.lancamentoAcao.nomeMes, "Maio");

const capacitacaoJunho = context.window.StrategicResults.calcularDashboard({
  indicadores: [capacitacaoIndicator],
  regras: [capacitacaoRule],
  lancamentos: [
    ...capacitacaoPositions,
    {
      id: "C-JUN", indicadorId: 15, ano: 2026, mes: 6, nomeMes: "Junho", trimestre: "2TRI/2026", status: "Homologado",
      camposEntrada: { tipoPosicaoCapacitacao: "apuracao_quantitativa", publicoAlvoElegivelCapacitacao: 183, empregadosCapacitadosCapacitacao: 177 }
    }
  ]
}).resultadosOficiais[0];
assert.equal(capacitacaoJunho.competencia, "Junho/2026");
assert.ok(Math.abs(capacitacaoJunho.resultado - (177 / 183)) < 0.000001);
assert.equal(capacitacaoJunho.percentualAtingido, 1);
assert.equal(capacitacaoJunho.situacaoCalculada, "Atingido");

const climaIndicator = { ...indicators.find((item) => item.id === 12), periodicidade: "Mensal" };
const climaRule = rules.find((item) => item.indicadorId === 12);
const climaPositions = [
  {
    id: "CLIMA-MAR", indicadorId: 12, ano: 2026, mes: 3, nomeMes: "Março", competencia: "2026-03", status: "Homologado",
    camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: 60 }
  },
  ...[4, 5, 6].map((mes) => ({
    id: `CLIMA-${mes}`, indicadorId: 12, ano: 2026, mes, nomeMes: ["Abril", "Maio", "Junho"][mes - 4], competencia: `2026-0${mes}`, status: "Homologado",
    camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: "", acoesRealizadasClima: "Plano de ação em acompanhamento." }
  }))
];
const climaComAcompanhamentos = context.window.StrategicResults.calcularDashboard({
  indicadores: [climaIndicator], regras: [climaRule], lancamentos: climaPositions
}).resultadosOficiais[0];
assert.equal(climaComAcompanhamentos.lancamento.id, "CLIMA-MAR");
assert.equal(climaComAcompanhamentos.lancamentoAcao.id, "CLIMA-6");
assert.equal(climaComAcompanhamentos.competencia, "Março/2026");
assert.equal(climaComAcompanhamentos.competenciaAtual, "Junho/2026");
assert.equal(climaComAcompanhamentos.competenciaMedicaoCurta, "Mar/2026");
assert.equal(climaComAcompanhamentos.resultado, 60);
assert.equal(climaComAcompanhamentos.percentualAtingido, 1);
assert.equal(climaComAcompanhamentos.situacaoAtual, "Em acompanhamento");
assert.equal(climaComAcompanhamentos.statusAtual, "Homologado");
assert.equal(context.window.StrategicResults.officialSituation(climaComAcompanhamentos), "Em acompanhamento");

const climaFuturo = context.window.StrategicResults.calcularDashboard({
  indicadores: [climaIndicator],
  regras: [climaRule],
  lancamentos: [
    ...climaPositions,
    {
      id: "CLIMA-OUT", indicadorId: 12, ano: 2026, mes: 10, nomeMes: "Outubro", competencia: "2026-10", status: "Homologado",
      camposEntrada: { tipoPosicaoClima: "Pesquisa oficial", metaReferenciaClima: 60, notaClimaApurada: 62 }
    },
    {
      id: "CLIMA-NOV", indicadorId: 12, ano: 2026, mes: 11, nomeMes: "Novembro", competencia: "2026-11", status: "Homologado",
      camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: "", acoesRealizadasClima: "Acompanhamento futuro." }
    }
  ]
}).resultadosOficiais[0];
assert.equal(climaFuturo.lancamento.id, "CLIMA-OUT");
assert.equal(climaFuturo.lancamentoAcao.id, "CLIMA-NOV");
assert.equal(climaFuturo.competenciaAtual, "Novembro/2026");
assert.equal(climaFuturo.competenciaMedicaoCurta, "Out/2026");
assert.equal(climaFuturo.resultado, 62);
assert.ok(Math.abs(climaFuturo.percentualAtingido - (62 / 60)) < 0.000001);
assert.equal(climaFuturo.situacaoAtual, "Em acompanhamento");

const climaSemMedicao = context.window.StrategicResults.calcularDashboard({
  indicadores: [climaIndicator], regras: [climaRule], lancamentos: climaPositions.slice(1)
}).resultadosOficiais[0];
assert.equal(climaSemMedicao.lancamento, null);
assert.equal(climaSemMedicao.lancamentoAcao.id, "CLIMA-6");
assert.equal(climaSemMedicao.resultado, null);
assert.equal(climaSemMedicao.percentualAtingido, null);
assert.equal(climaSemMedicao.situacaoAtual, "Em acompanhamento");
assert.equal(context.window.StrategicResults.officialSituation(climaSemMedicao), "Em acompanhamento");

console.log("Testes do resumo executivo OK");
