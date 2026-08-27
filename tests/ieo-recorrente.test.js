const assert = require("node:assert/strict");
require("../assets/js/currency.js");
require("../assets/js/formulas.js");
const ieoPatch = require("../assets/js/ieo-recorrente.js");

function closeTo(actual, expected, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be close to ${expected}`);
}

const regra = {
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
  camposEntrada: [
    { nome: "despesaPessoalMes", tipo: "moeda" },
    { nome: "despesasAdministrativasMes", tipo: "moeda" },
    { nome: "receitasLiquidasMes", tipo: "moeda" },
    { nome: "ieoApuradoInformado", tipo: "percentual" },
    { nome: "percentualAtingidoOficialInformado", tipo: "percentual" }
  ]
};

ieoPatch.ajustarRegraIeo(regra);
assert.equal(regra.parametrosCalculo.campoPercentualOficial, undefined);
assert.equal(regra.camposEntrada.some((campo) => campo.nome === "percentualAtingidoOficialInformado"), false);
assert.equal(regra.camposEntrada.some((campo) => campo.nome === "observacaoAjusteOficial"), false);
assert.equal(regra.camposEntrada.filter((campo) => campo.nome !== "ieoApuradoInformado").every((campo) => campo.obrigatorio), true);
assert.equal(regra.parametrosCalculo.metasAcumuladasPorCompetencia["2026-01"], 0.1449);
assert.equal(regra.parametrosCalculo.metasAcumuladasPorCompetencia["2026-12"], 0.1403);

const janeiro = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 1,
  competencia: "2026-01",
  camposEntrada: {
    despesaPessoalMes: 5700000,
    despesasAdministrativasMes: 8655120,
    receitasLiquidasMes: 223600000,
    percentualAtingidoOficialInformado: 999
  }
});
closeTo(janeiro.resultadoMensal, 0.0642);
closeTo(janeiro.percentualAtingidoMensal, 0.1449 / 0.0642);
assert.equal(janeiro.percentualAtingidoMensalFormatado, "225,7%");
assert.equal(janeiro.situacao, "Atingido");
assert.equal(janeiro.metaReferencia, 0.1449);
assert.equal(janeiro.origemResultado, "calculado");

const fevereiro = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 2,
  competencia: "2026-02",
  camposEntrada: {
    despesaPessoalMes: 19000000,
    despesasAdministrativasMes: 29279000,
    receitasLiquidasMes: 438900000
  }
});
closeTo(fevereiro.percentualAtingidoMensal, 0.1445 / 0.11);
assert.equal(fevereiro.percentualAtingidoMensalFormatado, "131,36%");
assert.equal(fevereiro.situacao, "Atingido");

const marco = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 3,
  competencia: "2026-03",
  camposEntrada: {
    despesaPessoalMes: 28000000,
    despesasAdministrativasMes: 43625600,
    receitasLiquidasMes: 663200000,
    ieoApuradoInformado: 0.50,
    percentualAtingidoOficialInformado: 104.22
  }
});
closeTo(marco.resultadoMensal, 0.108);
closeTo(marco.percentualAtingidoMensal, 0.1441 / 0.108);
assert.equal(marco.percentualAtingidoMensalFormatado, "133,43%");
assert.equal(marco.situacao, "Atingido");
assert.equal(marco.metaReferencia, 0.1441);
assert.equal(marco.origemResultado, "calculado");

const marcoLegadoNormalizado = ieoPatch.normalizarLancamentoParaExibicao({
  indicadorId: 6,
  ano: 2026,
  mes: 3,
  competencia: "2026-03",
  metaReferencia: 0.1441,
  percentualAtingido: 1.0422,
  situacaoCalculada: "Atingido",
  camposEntrada: {
    despesaPessoalMes: 28000000,
    despesasAdministrativasMes: 43625600,
    receitasLiquidasMes: 663200000,
    percentualAtingidoOficialInformado: 104.22
  }
}, regra);
closeTo(marcoLegadoNormalizado.percentualAtingido, 0.1441 / 0.108);
assert.equal(marcoLegadoNormalizado.situacaoCalculada, "Atingido");

const acimaDaMeta = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 3,
  competencia: "2026-03",
  camposEntrada: { ieoApuradoInformado: 0.16 }
});
closeTo(acimaDaMeta.percentualAtingidoMensal, 0.1441 / 0.16);
assert.equal(acimaDaMeta.situacao, "Abaixo da meta");

console.log("IEO Recorrente: curva mensal, cálculo inverso e remoção do percentual oficial validados.");
