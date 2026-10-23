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
const results = context.window.StrategicResults.calcularDashboard({
  indicadores: indicators,
  lancamentos: launches,
  regras: rules
}).resultadosOficiais;

assert.equal(results.length, 23);
assert.equal(results.filter((item) => context.window.StrategicResults.officialSituation(item) === "Sem dados").length, 4);
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
assert.equal(context.window.StrategicResults.officialSituation(npsDashboardOficial), "Atingido");
assert.equal(npsDashboardOficial.competencia, "Março/2026");
assert.equal(npsDashboardOficial.meta, 55);
assert.equal(npsDashboardOficial.resultado, 55);
assert.equal(npsDashboardOficial.percentualAtingido, 1);

const npsBoundaryDashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicators.find((item) => item.id === 2)],
  regras: [rules.find((item) => item.indicadorId === 2)],
  lancamentos: [
    {
      id: "nps-junho-historico",
      indicadorId: 2,
      ano: 2026,
      mes: 6,
      competencia: "2026-06",
      nomeMes: "Junho",
      status: "Homologado",
      metaMensal: 58,
      camposEntrada: { tipoPosicaoNPS: "Pesquisa oficial", metaReferenciaCompetenciaNPS: 58, percentualPromotores: 0.7263, percentualDetratores: 0.1343, npsApurado: 61 }
    },
    {
      id: "nps-julho-acompanhamento",
      indicadorId: 2,
      ano: 2026,
      mes: 7,
      competencia: "2026-07",
      nomeMes: "Julho",
      status: "Homologado",
      metaMensal: 60,
      camposEntrada: { tipoPosicaoNPS: "Acompanhamento sem nova pesquisa", metaReferenciaCompetenciaNPS: 60 }
    }
  ]
}).resultadosOficiais[0];
assert.equal(npsBoundaryDashboard.competenciaAtual, "Julho/2026");
assert.equal(npsBoundaryDashboard.competenciaMedicao, "Junho/2026");
assert.equal(npsBoundaryDashboard.competenciaMedicaoCurta, "Jun/2026");
assert.ok(Math.abs(npsBoundaryDashboard.resultado - 59.2) < 0.000001);
assert.equal(npsBoundaryDashboard.meta, 58);
assert.ok(Math.abs(npsBoundaryDashboard.percentualAtingido - (59.2 / 58)) < 0.000001);
assert.equal(context.window.StrategicResults.officialSituation(npsBoundaryDashboard), "Em acompanhamento");

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
assert.equal(context.window.StrategicResults.officialSituation(plataformaJogosDashboardOficial), "Sem dados");
assert.equal(plataformaJogosDashboardOficial.competencia, null);
assert.equal(plataformaJogosDashboardOficial.meta, null);
assert.equal(plataformaJogosDashboardOficial.resultado, null);
assert.equal(plataformaJogosDashboardOficial.percentualAtingido, null);

const indicadorPlataformaJogos = indicators.find((item) => item.id === 10);
const regraPlataformaJogos = rules.find((item) => item.indicadorId === 10);
const plataformaJogos1TriHistorico = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicadorPlataformaJogos],
  regras: [regraPlataformaJogos],
  lancamentos: [
    { id: "pj-mar-historico", indicadorId: 10, ano: 2026, mes: 3, nomeMes: "Março", status: "Homologado", camposEntrada: { marcoAtualPlataformaJogos: "Sprints iniciais executadas", statusProjetoPlataformaJogos: "Em andamento" } }
  ]
}).resultadosOficiais[0];
assert.equal(context.window.StrategicResults.officialSituation(plataformaJogos1TriHistorico), "Em acompanhamento");
assert.equal(plataformaJogos1TriHistorico.resultado, null);
assert.equal(plataformaJogos1TriHistorico.percentualAtingido, null);

const plataformaJogos2TriDashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicadorPlataformaJogos],
  regras: [regraPlataformaJogos],
  lancamentos: [
    { id: "pj-abr", indicadorId: 10, ano: 2026, mes: 4, nomeMes: "Abril", status: "Homologado", camposEntrada: { marcoAtualPlataformaJogos: "Arquitetura do sistema em definição", statusProjetoPlataformaJogos: "Piloto/MVP em desenvolvimento" } },
    { id: "pj-mai", indicadorId: 10, ano: 2026, mes: 5, nomeMes: "Maio", status: "Homologado", camposEntrada: { marcoAtualPlataformaJogos: "Funcionalidade negocial definida", statusProjetoPlataformaJogos: "Piloto/MVP em desenvolvimento" } },
    { id: "pj-jun", indicadorId: 10, ano: 2026, mes: 6, nomeMes: "Junho", status: "Homologado", camposEntrada: { marcoAtualPlataformaJogos: "Registro de Aposta finalizado em ambiente de desenvolvimento", statusProjetoPlataformaJogos: "Piloto/MVP em desenvolvimento", percentualEvolucaoPlataformaJogos: 0.10 } }
  ]
}).resultadosOficiais[0];
assert.equal(plataformaJogos2TriDashboard.competencia, "Junho/2026");
assert.ok(Math.abs(plataformaJogos2TriDashboard.meta - (1 / 3)) < 0.000001);
assert.ok(Math.abs(plataformaJogos2TriDashboard.resultado - 0.10) < 0.000001);
assert.ok(Math.abs(plataformaJogos2TriDashboard.percentualAtingido - 0.30) < 0.000001);
assert.equal(context.window.StrategicResults.officialSituation(plataformaJogos2TriDashboard), "Abaixo da meta");
assert.equal(context.window.StrategicResults.formatOfficialResult(plataformaJogos2TriDashboard), "10,00%");
assert.equal(context.window.StrategicResults.formatOfficialMeta(plataformaJogos2TriDashboard), "33,33%");

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
assert.equal(context.window.StrategicResults.officialSituation(incentivoDashboardOficial), "Abaixo da meta");
assert.equal(incentivoDashboardOficial.competencia, "Junho/2026");
assert.equal(incentivoDashboardOficial.meta, 652700);
assert.equal(incentivoDashboardOficial.resultado, 0);
assert.equal(incentivoDashboardOficial.percentualAtingido, 0);
assert.equal(incentivoDashboardOficial.lancamento.id, 222);
assert.equal(incentivoDashboardOficial.lancamentoAcao.id, 225);

const indicadorIncentivo = indicators.find((item) => item.id === 19);
const regraIncentivo = rules.find((item) => item.indicadorId === 19);
const incentivoAposHomologacaoAutenticaSetembro = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicadorIncentivo],
  regras: [regraIncentivo],
  lancamentos: [
    { id: 223, indicadorId: 19, ano: 2026, mes: 7, nomeMes: "Julho", competencia: "2026-07", trimestre: "3TRI/2026", status: "Em preenchimento", metaReferencia: 1305400, camposEntrada: { nomeProjetoIncentivoSocioambiental: "Brasil Ladies Cup 2026", statusProjetoIncentivoSocioambiental: "Investimento realizado", valorInvestidoMes: 190000, valorInvestidoAcumuladoCompetencia: 190000 } },
    { id: 224, indicadorId: 19, ano: 2026, mes: 8, nomeMes: "Agosto", competencia: "2026-08", trimestre: "3TRI/2026", status: "Em preenchimento", metaReferencia: 1305400, camposEntrada: { nomeProjetoIncentivoSocioambiental: "Brasil Ladies Cup 2026", statusProjetoIncentivoSocioambiental: "Investimento realizado", valorInvestidoMes: 0, valorInvestidoAcumuladoCompetencia: 190000 } },
    { id: 225, indicadorId: 19, ano: 2026, mes: 9, nomeMes: "Setembro", competencia: "2026-09", trimestre: "3TRI/2026", status: "Homologado", metaReferencia: 1305400, camposEntrada: { nomeProjetoIncentivoSocioambiental: "Brasil Ladies Cup 2026", statusProjetoIncentivoSocioambiental: "Investimento realizado", valorInvestidoMes: 0, valorInvestidoAcumuladoCompetencia: 190000 } }
  ]
}).resultadosOficiais[0];
assert.equal(incentivoAposHomologacaoAutenticaSetembro.competencia, "Setembro/2026");
assert.equal(incentivoAposHomologacaoAutenticaSetembro.resultadoFinanceiro, 190000);
assert.equal(incentivoAposHomologacaoAutenticaSetembro.metaFinanceira, 1305400);
assert.ok(Math.abs(incentivoAposHomologacaoAutenticaSetembro.resultadoPercentualOficial - (190000 / 1305400000)) < 0.000000000001);
assert.ok(Math.abs(incentivoAposHomologacaoAutenticaSetembro.percentualAtingido - (190000 / 1305400)) < 0.000000000001);
assert.equal(context.window.StrategicResults.formatOfficialResult(incentivoAposHomologacaoAutenticaSetembro), "0,01455%");
assert.equal(context.window.StrategicResults.formatOfficialMeta(incentivoAposHomologacaoAutenticaSetembro), "0,10%");
assert.equal(context.window.StrategicResults.officialSituation(incentivoAposHomologacaoAutenticaSetembro), "Abaixo da meta");

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

const jogoResponsavelComSetembroPendente = context.window.StrategicResults.calcularDashboard({
  indicadores: [indicators.find((item) => item.id === 21)],
  regras: [rules.find((item) => item.indicadorId === 21)],
  lancamentos: [
    { id: "JR-ABR", indicadorId: 21, ano: 2026, mes: 4, nomeMes: "Abril", competencia: "2026-04", trimestre: "2TRI/2026", status: "Homologado", metaReferencia: 0.90, camposEntrada: { publicoAlvoElegivelJR: 184, empregadosCapacitadosJR: 151, quantidadeMinimaIniciativasJR: 2 } },
    { id: "JR-MAI", indicadorId: 21, ano: 2026, mes: 5, nomeMes: "Maio", competencia: "2026-05", trimestre: "2TRI/2026", status: "Homologado", metaReferencia: 0.90, camposEntrada: { publicoAlvoElegivelJR: 184, empregadosCapacitadosJR: 82, quantidadeMinimaIniciativasJR: 2 } },
    { id: "JR-JUN", indicadorId: 21, ano: 2026, mes: 6, nomeMes: "Junho", competencia: "2026-06", trimestre: "2TRI/2026", status: "Homologado", metaReferencia: 0.90, camposEntrada: { publicoAlvoElegivelJR: 184, empregadosCapacitadosJR: 123, quantidadeMinimaIniciativasJR: 2 } },
    { id: "JR-SET", indicadorId: 21, ano: 2026, mes: 9, nomeMes: "Setembro", competencia: "2026-09", trimestre: "3TRI/2026", status: "Em preenchimento", metaReferencia: 0.90, camposEntrada: { publicoAlvoElegivelJR: 171, empregadosCapacitadosJR: 99, quantidadeMinimaIniciativasJR: 2 } }
  ]
}).resultadosOficiais[0];
assert.equal(jogoResponsavelComSetembroPendente.lancamento.id, "JR-JUN");
assert.equal(jogoResponsavelComSetembroPendente.competencia, "Junho/2026");
assert.equal(jogoResponsavelComSetembroPendente.status, "Homologado");
assert.equal(jogoResponsavelComSetembroPendente.meta, 0);
assert.equal(jogoResponsavelComSetembroPendente.resultado, 0.6685);
assert.equal(jogoResponsavelComSetembroPendente.percentualAtingido, 0.6685);
assert.equal(jogoResponsavelComSetembroPendente.situacaoOficial, "No prazo");
assert.ok(Math.abs(jogoResponsavelComSetembroPendente.resultadoTecnico - (123 / 184)) < 0.000001);
assert.ok(Math.abs(jogoResponsavelComSetembroPendente.percentualAtingidoTecnico - ((123 / 184) / 0.90)) < 0.000001);

const lucroDashboardOficial = results.find((item) => item.indicador.id === 7);
assert.equal(context.window.StrategicResults.officialSituation(lucroDashboardOficial), "Atingido");
assert.equal(lucroDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(lucroDashboardOficial.meta - 89555555.56) < 0.0001);
assert.ok(Math.abs(lucroDashboardOficial.resultado - 114310457.11) < 0.0001);
assert.ok(Math.abs(lucroDashboardOficial.percentualAtingido - (114310457.11 / 89555555.56)) < 0.000001);

const ieoDashboardOficial = results.find((item) => item.indicador.id === 6);
assert.equal(context.window.StrategicResults.officialSituation(ieoDashboardOficial), "Atingido");
assert.equal(ieoDashboardOficial.competencia, "Março/2026");
assert.ok(Math.abs(ieoDashboardOficial.meta - 0.1441) < 0.000001);
assert.ok(Math.abs(ieoDashboardOficial.resultado - 0.108) < 0.000001);
assert.ok(Math.abs(ieoDashboardOficial.percentualAtingido - (1 - ((0.108 - 0.1441) / (1 - 0.1441)))) < 0.000001);

const ieoIndicator = indicators.find((item) => item.id === 6);
const ieoRule = rules.find((item) => item.indicadorId === 6);
const ieoDashboardAgosto = context.window.StrategicResults.calcularDashboard({
  indicadores: [ieoIndicator],
  regras: [ieoRule],
  lancamentos: [{
    id: 6008,
    indicadorId: 6,
    ano: 2026,
    mes: 8,
    nomeMes: "Agosto",
    competencia: "2026-08",
    status: "Homologado",
    camposEntrada: {
      despesasGeraisAdministrativasMes: 100,
      despesasServicosPagamentosMes: 50,
      outrasDespesasOperacionaisMes: 30,
      receitasOperacionaisMes: 1000,
      despesasTributosMes: 100
    }
  }]
}).resultadosOficiais[0];
assert.equal(context.window.StrategicResults.officialSituation(ieoDashboardAgosto), "Atingido");
assert.equal(ieoDashboardAgosto.competencia, "Agosto/2026");
assert.ok(Math.abs(ieoDashboardAgosto.meta - 0.2664) < 0.000001);
assert.ok(Math.abs(ieoDashboardAgosto.resultado - 0.20) < 0.000001);
assert.ok(Math.abs(ieoDashboardAgosto.percentualAtingido - (1 - ((0.20 - 0.2664) / (1 - 0.2664)))) < 0.000001);

const repasseDashboardOficial = results.find((item) => item.indicador.id === 17);
assert.equal(context.window.StrategicResults.officialSituation(repasseDashboardOficial), "Atingido");
assert.equal(repasseDashboardOficial.competencia, "Junho/2026");
assert.ok(Math.abs(repasseDashboardOficial.meta - 4545104157.26) < 0.0001);
assert.ok(Math.abs(repasseDashboardOficial.resultado - 4615037076.03) < 0.0001);
assert.ok(Math.abs(repasseDashboardOficial.percentualAtingido - (4615037076.03 / 4545104157.26)) < 0.000001);

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
const aprimoramentoIndicator = { ...indicators.find((item) => item.id === 4), periodicidade: "Mensal" };
const aprimoramentoRule = rules.find((item) => item.indicadorId === 4);
const aprimoramentoPositions = [
  { id: "A-MAR", indicadorId: 4, ano: 2026, mes: 3, nomeMes: "Março", trimestre: "1TRI/2026", status: "Homologado", camposEntrada: { melhoriasImplementadasMes: 1 } },
  { id: "A-ABR", indicadorId: 4, ano: 2026, mes: 4, nomeMes: "Abril", trimestre: "2TRI/2026", status: "Homologado", camposEntrada: { tipoPosicaoAprimoramento: "acompanhamento" } },
  { id: "A-MAI", indicadorId: 4, ano: 2026, mes: 5, nomeMes: "Maio", trimestre: "2TRI/2026", status: "Homologado", camposEntrada: { tipoPosicaoAprimoramento: "acompanhamento" } }
];
const aprimoramentoEntrePosicoes = context.window.StrategicResults.calcularDashboard({
  indicadores: [aprimoramentoIndicator], regras: [aprimoramentoRule], lancamentos: aprimoramentoPositions
}).resultadosOficiais[0];
assert.equal(aprimoramentoEntrePosicoes.competencia, "Março/2026");
assert.ok(Math.abs(aprimoramentoEntrePosicoes.resultado - 0.0454) < 0.000001);
assert.equal(aprimoramentoEntrePosicoes.situacaoAtual, "Em acompanhamento");

const aprimoramentoJunhoDashboard = context.window.StrategicResults.calcularDashboard({
  indicadores: [aprimoramentoIndicator],
  regras: [aprimoramentoRule],
  lancamentos: [
    ...aprimoramentoPositions,
    { id: "A-JUN", indicadorId: 4, ano: 2026, mes: 6, nomeMes: "Junho", trimestre: "2TRI/2026", status: "Homologado", camposEntrada: { tipoPosicaoAprimoramento: "fechamento_quantitativo", melhoriasImplementadasMes: 3 } }
  ]
}).resultadosOficiais[0];
assert.equal(aprimoramentoJunhoDashboard.competencia, "Junho/2026");
assert.ok(Math.abs(aprimoramentoJunhoDashboard.resultado - (4 / 22)) < 0.000001);
assert.ok(Math.abs(aprimoramentoJunhoDashboard.meta - 0.1364) < 0.000001);
assert.ok(Math.abs(aprimoramentoJunhoDashboard.percentualAtingido - (4 / 3)) < 0.000001);
assert.equal(aprimoramentoJunhoDashboard.situacaoCalculada, "Atingido");

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

const principiosSeptemberDraft = context.window.StrategicResults.calcularDashboard({
  indicadores: [principiosIndicator],
  regras: [principiosRule],
  lancamentos: [
    ...principiosBase.map((item) => item.id === "P-JUN" ? {
      ...item,
      status: "Homologado",
      camposEntrada: { elementoRGF: "Orientação ao jogador para tratamento", acaoExecutada: "Revisão", statusAcao: "Concluída" }
    } : item),
    {
      id: "P-SET",
      indicadorId: 18,
      ano: 2026,
      mes: 9,
      nomeMes: "Setembro",
      trimestre: "3TRI/2026",
      status: "Em preenchimento",
      metaReferencia: 5,
      camposEntrada: { elementosRGFAtendidos: [
        "Pesquisa", "Programa para empregados", "Programa para revendedores", "Desenho para jogos",
        "Canais de jogos remotos", "Orientação ao jogador para tratamento",
        "Envolvimento das partes interessadas", "Relatório de medições e riscos"
      ].map((elemento) => ({ elemento, status: "Concluída" })) }
    }
  ]
}).resultadosOficiais[0];
assert.equal(principiosSeptemberDraft.competencia, "Junho/2026");
assert.equal(principiosSeptemberDraft.resultado, 2);
assert.equal(principiosSeptemberDraft.meta, 2);
assert.equal(principiosSeptemberDraft.percentualAtingido, 1);

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

const capacitacaoSetembroPendente = {
  id: "C-SET",
  indicadorId: 15,
  ano: 2026,
  mes: 9,
  nomeMes: "Setembro",
  competencia: "2026-09",
  trimestre: "3TRI/2026",
  status: "Em preenchimento",
  metaReferencia: 0.90,
  camposEntrada: {
    tipoPosicaoCapacitacao: "apuracao_quantitativa",
    modoResultadoCapacitacao: "oficial_informado",
    resultadoOficialInformadoCapacitacao: 0.932,
    percentualAtingidoOficialCapacitacao: 1.0355,
    quantidadeCursosMinimaCapacitacao: 4,
    componentesResultadoCapacitacao: [
      { curso: "Customer Experience", empregadosCapacitados: 163, publicoAlvoElegivel: 171 },
      { curso: "Ecossistema Negocial", empregadosCapacitados: 154, publicoAlvoElegivel: 171 }
    ]
  }
};
const capacitacaoComSetembroPendente = context.window.StrategicResults.calcularDashboard({
  indicadores: [capacitacaoIndicator],
  regras: [capacitacaoRule],
  lancamentos: [...capacitacaoPositions, {
    id: "C-JUN", indicadorId: 15, ano: 2026, mes: 6, nomeMes: "Junho", trimestre: "2TRI/2026", status: "Homologado",
    camposEntrada: { tipoPosicaoCapacitacao: "apuracao_quantitativa", publicoAlvoElegivelCapacitacao: 183, empregadosCapacitadosCapacitacao: 177 }
  }, capacitacaoSetembroPendente]
}).resultadosOficiais[0];
assert.equal(capacitacaoComSetembroPendente.competencia, "Junho/2026");
assert.ok(Math.abs(capacitacaoComSetembroPendente.resultado - (177 / 183)) < 0.000001);
assert.equal(capacitacaoComSetembroPendente.percentualAtingido, 1);

const capacitacaoComSetembroHomologado = context.window.StrategicResults.calcularDashboard({
  indicadores: [capacitacaoIndicator],
  regras: [capacitacaoRule],
  lancamentos: [...capacitacaoPositions, {
    id: "C-JUN", indicadorId: 15, ano: 2026, mes: 6, nomeMes: "Junho", trimestre: "2TRI/2026", status: "Homologado",
    camposEntrada: { tipoPosicaoCapacitacao: "apuracao_quantitativa", publicoAlvoElegivelCapacitacao: 183, empregadosCapacitadosCapacitacao: 177 }
  }, { ...capacitacaoSetembroPendente, status: "Homologado" }]
}).resultadosOficiais[0];
assert.equal(capacitacaoComSetembroHomologado.competencia, "Setembro/2026");
assert.equal(capacitacaoComSetembroHomologado.resultado, 0.932);
assert.equal(capacitacaoComSetembroHomologado.percentualAtingido, 1.0355);
assert.equal(capacitacaoComSetembroHomologado.situacaoCalculada, "Superado");

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
assert.equal(climaComAcompanhamentos.competenciaMedicaoCurta, null);
assert.equal(climaComAcompanhamentos.competenciaResultadoReportadoCurta, "Mar/2026");
assert.equal(climaComAcompanhamentos.resultado, 60);
assert.equal(climaComAcompanhamentos.percentualAtingido, 1);
assert.equal(climaComAcompanhamentos.situacaoAtual, "Em acompanhamento");
assert.equal(climaComAcompanhamentos.statusAtual, "Homologado");
assert.equal(climaComAcompanhamentos.lancamento.status, "Homologado");
assert.equal(climaComAcompanhamentos.medicaoOficialPesquisa2026, false);
assert.equal(climaComAcompanhamentos.resultadoOficialReportado, true);
assert.equal(climaComAcompanhamentos.contextoResultadoOficial, "Resultado oficial reportado no 1TRI/2026");
assert.equal(context.window.StrategicResults.officialSituation(climaComAcompanhamentos), "Em acompanhamento");

const climaComSetembroQualitativo = context.window.StrategicResults.calcularDashboard({
  indicadores: [climaIndicator],
  regras: [climaRule],
  lancamentos: [
    ...climaPositions,
    { id: "CLIMA-7", indicadorId: 12, ano: 2026, mes: 7, nomeMes: "Julho", competencia: "2026-07", status: "Não iniciado", camposEntrada: {} },
    { id: "CLIMA-8", indicadorId: 12, ano: 2026, mes: 8, nomeMes: "Agosto", competencia: "2026-08", status: "Não iniciado", camposEntrada: {} },
    {
      id: "CLIMA-9", indicadorId: 12, ano: 2026, mes: 9, nomeMes: "Setembro", competencia: "2026-09", status: "Em preenchimento",
      camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: "", dataBasePesquisaClima: "2026-09-30" }
    }
  ]
}).resultadosOficiais[0];
assert.equal(climaComSetembroQualitativo.lancamento.id, "CLIMA-MAR");
assert.equal(climaComSetembroQualitativo.lancamentoAcao.id, "CLIMA-9");
assert.equal(climaComSetembroQualitativo.competencia, "Março/2026");
assert.equal(climaComSetembroQualitativo.competenciaAtual, "Setembro/2026");
assert.equal(climaComSetembroQualitativo.resultado, 60);
assert.equal(climaComSetembroQualitativo.percentualAtingido, 1);
assert.equal(climaComSetembroQualitativo.statusAtual, "Em preenchimento");
assert.equal(climaComSetembroQualitativo.situacaoAtual, "Em acompanhamento");
assert.equal(climaComSetembroQualitativo.medicaoOficialPesquisa2026, false);
assert.equal(climaComSetembroQualitativo.competenciaMedicaoCurta, null);
assert.equal(climaComSetembroQualitativo.competenciaResultadoReportadoCurta, "Mar/2026");

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
assert.equal(climaFuturo.medicaoOficialPesquisa2026, true);
assert.equal(climaFuturo.resultadoOficialReportado, false);

const climaSemMedicao = context.window.StrategicResults.calcularDashboard({
  indicadores: [climaIndicator], regras: [climaRule], lancamentos: climaPositions.slice(1)
}).resultadosOficiais[0];
assert.equal(climaSemMedicao.lancamento, null);
assert.equal(climaSemMedicao.lancamentoAcao.id, "CLIMA-6");
assert.equal(climaSemMedicao.resultado, null);
assert.equal(climaSemMedicao.percentualAtingido, null);
assert.equal(climaSemMedicao.situacaoAtual, "Em acompanhamento");
assert.equal(climaSemMedicao.medicaoOficialPesquisa2026, false);
assert.equal(climaSemMedicao.resultadoOficialReportado, false);
assert.equal(context.window.StrategicResults.officialSituation(climaSemMedicao), "Em acompanhamento");

// A Tabela Executiva usa somente competências homologadas como posição oficial.
const officialResultFor = (indicator, rule, indicatorLaunches) => (
  context.window.StrategicResults.calcularDashboard({
    indicadores: [indicator],
    regras: [rule],
    lancamentos: indicatorLaunches
  }).resultadosOficiais[0]
);

const lucroIndicator = indicators.find((item) => item.id === 7);
const lucroRule = rules.find((item) => item.indicadorId === 7);
const lucroHomologatedThroughMarch = launches
  .filter((item) => item.indicadorId === 7 && item.mes <= 3)
  .map((item) => ({ ...item, status: "Homologado" }));
const lucroPendingAfterMarch = [4, 5, 6, 7, 8, 9].map((mes) => ({
  id: `LUCRO-${mes}`,
  indicadorId: 7,
  ano: 2026,
  mes,
  nomeMes: ["Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro"][mes - 4],
  competencia: `2026-${String(mes).padStart(2, "0")}`,
  status: "Em preenchimento",
  camposEntrada: { lucroLiquidoRecorrenteCompetencia: 100000000 + mes }
}));
const lucroOfficialOnly = officialResultFor(
  lucroIndicator,
  lucroRule,
  [...lucroHomologatedThroughMarch, ...lucroPendingAfterMarch]
);
assert.equal(lucroOfficialOnly.competencia, "Março/2026");
assert.equal(lucroOfficialOnly.status, "Homologado");
assert.equal(lucroOfficialOnly.lancamentoAcao.competencia, "2026-09");

const repasseIndicator = indicators.find((item) => item.id === 17);
const repasseRule = rules.find((item) => item.indicadorId === 17);
const repasseOfficialOnly = officialResultFor(
  repasseIndicator,
  repasseRule,
  launches
    .filter((item) => item.indicadorId === 17 && item.mes <= 9)
    .map((item) => item.id === 198 ? {
      ...item,
      status: "Homologado",
      camposEntrada: { repasseSocialAcumuladoCompetencia: 4615037076.03, dataBaseApuracao: "2026-06-30" },
      realizado: 4615037076.03,
      resultadoMensal: 4615037076.03
    } : item)
);
assert.equal(repasseOfficialOnly.competencia, "Junho/2026");
assert.equal(repasseOfficialOnly.status, "Homologado");
assert.equal(repasseOfficialOnly.resultado, 4615037076.03);
assert.equal(repasseOfficialOnly.lancamentoAcao.competencia, "2026-09");

const womenIndicator = indicators.find((item) => item.id === 13);
const womenRule = rules.find((item) => item.indicadorId === 13);
const womenLaunch = (id, mes, nomeMes, status, mulheres, total) => ({
  id,
  indicadorId: 13,
  ano: 2026,
  mes,
  nomeMes,
  competencia: `2026-${String(mes).padStart(2, "0")}`,
  status,
  metaReferencia: 0.425,
  camposEntrada: {
    mulheresGestorasMes: mulheres,
    totalGestoresMes: total,
    dataBaseApuracao: `2026-${String(mes).padStart(2, "0")}-${mes === 9 ? "30" : "31"}`
  }
});
const womenPositions = [
  womenLaunch("MULHERES-JUL", 7, "Julho", "Homologado", 19, 46),
  womenLaunch("MULHERES-AGO", 8, "Agosto", "Retificado", 20, 46),
  womenLaunch("MULHERES-SET", 9, "Setembro", "Em preenchimento", 20, 46)
];
const womenOfficialJuly = officialResultFor(womenIndicator, womenRule, womenPositions);
assert.equal(womenOfficialJuly.lancamento.id, "MULHERES-JUL");
assert.equal(womenOfficialJuly.competencia, "Julho/2026");
assert.equal(womenOfficialJuly.status, "Homologado");
assert.equal(womenOfficialJuly.lancamentoAcao.id, "MULHERES-SET");
assert.ok(Math.abs(womenOfficialJuly.resultado - (19 / 46)) < 0.000001);
assert.ok(Math.abs(womenOfficialJuly.percentualAtingido - ((19 / 46) / 0.425)) < 0.000001);

const womenWithReopenedAugust = officialResultFor(womenIndicator, womenRule, [
  womenPositions[0],
  womenLaunch("MULHERES-AGO-REABERTO", 8, "Agosto", "Reaberto", 20, 46)
]);
assert.equal(womenWithReopenedAugust.lancamento.id, "MULHERES-JUL");

const womenWithRetifiedAugust = officialResultFor(womenIndicator, womenRule, womenPositions.slice(0, 2));
assert.equal(womenWithRetifiedAugust.lancamento.id, "MULHERES-JUL");

const womenWithoutHomologation = officialResultFor(womenIndicator, womenRule, womenPositions.slice(1));
assert.equal(womenWithoutHomologation.lancamento, null);
assert.equal(womenWithoutHomologation.competencia, null);
assert.equal(womenWithoutHomologation.meta, null);
assert.equal(womenWithoutHomologation.resultado, null);
assert.equal(womenWithoutHomologation.percentualAtingido, null);
assert.equal(womenWithoutHomologation.status, null);
assert.equal(context.window.StrategicResults.officialSituation(womenWithoutHomologation), "Sem dados");

const womenAfterSeptemberApproval = officialResultFor(
  womenIndicator,
  womenRule,
  womenPositions.map((item) => item.id === "MULHERES-SET" ? { ...item, status: "Homologado" } : item)
);
assert.equal(womenAfterSeptemberApproval.lancamento.id, "MULHERES-SET");
assert.equal(womenAfterSeptemberApproval.competencia, "Setembro/2026");
assert.equal(womenAfterSeptemberApproval.status, "Homologado");
assert.ok(Math.abs(womenAfterSeptemberApproval.resultado - (20 / 46)) < 0.000001);
assert.ok(Math.abs(womenAfterSeptemberApproval.percentualAtingido - ((20 / 46) / 0.425)) < 0.000001);

const diversityIndicator = indicators.find((item) => item.id === 14);
const diversityRule = rules.find((item) => item.indicadorId === 14);
const diversityLaunch = (id, mes, status, gestores, total) => ({
  id,
  indicadorId: 14,
  ano: 2026,
  mes,
  nomeMes: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro"][mes - 1],
  competencia: `2026-${String(mes).padStart(2, "0")}`,
  status,
  metaReferencia: 0.35,
  camposEntrada: { gestoresEnquadradosMes: gestores, totalGestoresMes: total }
});
const diversityPositions = [
  diversityLaunch("DIVERSIDADE-JUL", 7, "Homologado", 12, 46),
  diversityLaunch("DIVERSIDADE-AGO", 8, "Em preenchimento", 12, 46),
  diversityLaunch("DIVERSIDADE-SET", 9, "Em preenchimento", 12, 46)
];
const diversityOfficialJuly = officialResultFor(diversityIndicator, diversityRule, diversityPositions);
assert.equal(diversityRule.parametrosCalculo.arredondarResultadoAntesAtingimento, true);
assert.equal(diversityRule.parametrosCalculo.casasDecimaisResultadoPercentual, 2);
assert.equal(diversityOfficialJuly.lancamento.id, "DIVERSIDADE-JUL");
assert.equal(diversityOfficialJuly.competencia, "Julho/2026");
assert.equal(diversityOfficialJuly.status, "Homologado");
assert.equal(diversityOfficialJuly.lancamentoAcao.id, "DIVERSIDADE-SET");
assert.ok(Math.abs(diversityOfficialJuly.resultado - 0.2609) < 1e-12);
assert.ok(Math.abs(diversityOfficialJuly.percentualAtingido - (0.2609 / 0.35)) < 1e-12);

const ieoMarchLaunch = launches.find((item) => item.indicadorId === 6 && item.mes === 3);
const ieoWithPendingSeptember = officialResultFor(ieoIndicator, ieoRule, [
  { ...ieoMarchLaunch, status: "Homologado" },
  {
    ...ieoMarchLaunch,
    id: "IEO-SET-PENDENTE",
    mes: 9,
    nomeMes: "Setembro",
    competencia: "2026-09",
    status: "Em preenchimento"
  }
]);
assert.equal(ieoWithPendingSeptember.lancamento.id, ieoMarchLaunch.id);
assert.equal(ieoWithPendingSeptember.competencia, "Março/2026");
assert.ok(Math.abs(ieoWithPendingSeptember.resultado - ieoDashboardOficial.resultado) < 0.000001);
assert.ok(Math.abs(ieoWithPendingSeptember.percentualAtingido - ieoDashboardOficial.percentualAtingido) < 0.000001);

assert.equal(womenRule.tipoCalculo, "percentual_direto");
assert.equal(lucroRule.tipoCalculo, "lucro_recorrente_mensal");

console.log("Testes do resumo executivo OK");
