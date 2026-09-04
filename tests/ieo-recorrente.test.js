const assert = require("node:assert/strict");
require("../assets/js/currency.js");
require("../assets/js/formulas.js");
const ieo = require("../assets/js/ieo-recorrente.js");

function closeTo(actual, expected, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be close to ${expected}`);
}

const regraBase = {
  indicadorId: 6,
  tipoCalculo: "indice_inverso",
  tipoConsolidacao: "ultima_posicao_acumulada",
  unidadeMedida: "percentual",
  metaAnualValor: 0.1403,
  parametrosCalculo: {
    campoDespesaPessoal: "despesaPessoalMes",
    campoDespesasAdministrativas: "despesasAdministrativasMes",
    campoReceitasLiquidas: "receitasLiquidasMes",
    campoIeoInformado: "ieoApuradoInformado",
    campoPercentualOficial: "percentualAtingidoOficialInformado",
    sentidoMeta: "quanto_menor_melhor"
  },
  camposEntrada: []
};

assert.equal(ieo.getMetodologiaIeoPorCompetencia("2026-07").codigo, "original");
assert.equal(ieo.getMetodologiaIeoPorCompetencia("2026-08").codigo, "ca_agosto_2026");
assert.equal(ieo.getMetaCompetencia("2026-07"), 0.1423833333333333);
assert.equal(ieo.getMetaCompetencia("2026-08"), 0.2664);
assert.equal(ieo.getMetaCompetencia("2026-12"), 0.2664);

const regraJulho = ieo.ajustarRegraIeo(structuredClone(regraBase), "2026-07");
assert.equal(regraJulho.metodologiaIeo, "original");
assert.deepEqual(
  regraJulho.camposEntrada.map((campo) => campo.nome),
  ["despesaPessoalMes", "despesasAdministrativasMes", "receitasLiquidasMes", "ieoApuradoInformado"]
);
assert.equal(regraJulho.parametrosCalculo.campoPercentualOficial, undefined);

const regraAgosto = ieo.ajustarRegraIeo(structuredClone(regraBase), "2026-08");
assert.equal(regraAgosto.metodologiaIeo, "ca_agosto_2026");
assert.deepEqual(
  regraAgosto.camposEntrada.map((campo) => campo.nome),
  [
    "despesasGeraisAdministrativasMes",
    "despesasServicosPagamentosMes",
    "outrasDespesasOperacionaisMes",
    "receitasOperacionaisMes",
    "despesasTributosMes"
  ]
);
assert.equal(regraAgosto.camposEntrada.slice(0, 5).every((campo) => campo.obrigatorio), true);

const janeiro = ieo.calcularIeo(regraBase, {
  competencia: "2026-01",
  camposEntrada: {
    despesaPessoalMes: 5700000,
    despesasAdministrativasMes: 8655120,
    receitasLiquidasMes: 223600000
  }
});
closeTo(janeiro.resultadoMensal, 0.0642);
closeTo(janeiro.percentualAtingidoMensal, 0.1449 / 0.0642);
assert.equal(janeiro.situacao, "Atingido");

const fevereiro = ieo.calcularIeo(regraBase, {
  competencia: "2026-02",
  camposEntrada: {
    despesaPessoalMes: 19000000,
    despesasAdministrativasMes: 29279000,
    receitasLiquidasMes: 438900000
  }
});
closeTo(fevereiro.resultadoMensal, 0.11);
assert.equal(fevereiro.situacao, "Atingido");

const marco = ieo.calcularIeo(regraBase, {
  competencia: "2026-03",
  camposEntrada: {
    despesaPessoalMes: 28000000,
    despesasAdministrativasMes: 43625600,
    receitasLiquidasMes: 663200000,
    ieoApuradoInformado: 0.50
  }
});
closeTo(marco.resultadoMensal, 0.108);
assert.equal(marco.situacao, "Atingido");
assert.equal(marco.origemResultado, "calculado");

const agostoAtingido = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: {
    despesasGeraisAdministrativasMes: 100,
    despesasServicosPagamentosMes: 50,
    outrasDespesasOperacionaisMes: 30,
    receitasOperacionaisMes: 1000,
    despesasTributosMes: 100,
    ieoApuradoInformado: 0.25
  }
});
closeTo(agostoAtingido.numeradorIeo, 180);
closeTo(agostoAtingido.denominadorIeo, 900);
closeTo(agostoAtingido.resultadoMensal, 0.20);
closeTo(agostoAtingido.percentualAtingidoMensal, 1.332);
assert.equal(agostoAtingido.resultadoMensalFormatado, "20,00%");
assert.equal(agostoAtingido.percentualAtingidoMensalFormatado, "133,20%");
assert.equal(agostoAtingido.situacao, "Atingido");
assert.equal(agostoAtingido.origemResultado, "calculado_metodologia_ca");

const exemploFormularioAgosto = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: {
    despesasGeraisAdministrativasMes: 100000000,
    despesasServicosPagamentosMes: 40000000,
    outrasDespesasOperacionaisMes: 20000000,
    receitasOperacionaisMes: 800000000,
    despesasTributosMes: 100000000,
    ieoApuradoInformado: 0.01
  }
});
closeTo(exemploFormularioAgosto.numeradorIeo, 160000000);
closeTo(exemploFormularioAgosto.denominadorIeo, 700000000);
closeTo(exemploFormularioAgosto.resultadoMensal, 160000000 / 700000000);
assert.equal(exemploFormularioAgosto.resultadoMensalFormatado, "22,86%");
assert.equal(exemploFormularioAgosto.percentualAtingidoMensalFormatado, "116,55%");
assert.equal(exemploFormularioAgosto.situacao, "Atingido");
assert.equal(exemploFormularioAgosto.origemResultado, "calculado_metodologia_ca");

const agostoAbaixo = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: {
    despesasGeraisAdministrativasMes: 100,
    despesasServicosPagamentosMes: 100,
    outrasDespesasOperacionaisMes: 100,
    receitasOperacionaisMes: 1000,
    despesasTributosMes: 100
  }
});
closeTo(agostoAbaixo.resultadoMensal, 1 / 3);
closeTo(agostoAbaixo.percentualAtingidoMensal, 0.7992);
assert.equal(agostoAbaixo.percentualAtingidoMensalFormatado, "79,92%");
assert.equal(agostoAbaixo.situacao, "Abaixo da meta");

const componentesAusentes = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: { ieoApuradoInformado: 0.20 }
});
assert.equal(componentesAusentes.statusCalculo, "aguardando_dados");
assert.equal(componentesAusentes.resultadoMensal, null);

const denominadorZero = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: {
    despesasGeraisAdministrativasMes: 100,
    despesasServicosPagamentosMes: 50,
    outrasDespesasOperacionaisMes: 30,
    receitasOperacionaisMes: 100,
    despesasTributosMes: 100
  }
});
assert.equal(denominadorZero.statusCalculo, "erro");
assert.equal(denominadorZero.mensagem, "Receitas Operacionais menos Despesas de Tributos deve resultar em valor maior que zero.");
assert.equal(Number.isFinite(denominadorZero.resultadoMensal), false);

const julhoNormalizado = ieo.normalizarLancamentoParaExibicao({
  indicadorId: 6,
  competencia: "2026-07",
  metaReferencia: 999,
  camposEntrada: { ieoApuradoInformado: 0.14 }
}, regraBase);
assert.equal(julhoNormalizado.metaReferencia, 0.1423833333333333);
assert.equal(julhoNormalizado.metodologiaIeo, "original");

const agostoNormalizado = ieo.normalizarLancamentoParaExibicao({
  indicadorId: 6,
  competencia: "2026-08",
  metaReferencia: 0.1419666666666667,
  camposEntrada: {}
}, regraBase);
assert.equal(agostoNormalizado.metaReferencia, 0.2664);
assert.equal(agostoNormalizado.metodologiaIeo, "ca_agosto_2026");

console.log("IEO Recorrente: vigência Jul/Ago, fórmulas, metas, validações e histórico validados.");
