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
assert.equal(regra.parametrosCalculo.metasAcumuladasPorCompetencia["2026-01"], 0.1449);
assert.equal(regra.parametrosCalculo.metasAcumuladasPorCompetencia["2026-12"], 0.1403);

const janeiro = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 1,
  competencia: "2026-01",
  camposEntrada: { ieoApuradoInformado: 0.0642, percentualAtingidoOficialInformado: 999 }
});
closeTo(janeiro.percentualAtingidoMensal, 0.1449 / 0.0642);
assert.equal(janeiro.percentualAtingidoMensalFormatado, "225,7%");
assert.equal(janeiro.situacao, "Atingido");
assert.equal(janeiro.metaReferencia, 0.1449);

const fevereiro = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 2,
  competencia: "2026-02",
  camposEntrada: { ieoApuradoInformado: 0.11 }
});
closeTo(fevereiro.percentualAtingidoMensal, 0.1445 / 0.11);
assert.equal(fevereiro.percentualAtingidoMensalFormatado, "131,36%");
assert.equal(fevereiro.situacao, "Atingido");

const marco = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 3,
  competencia: "2026-03",
  camposEntrada: {
    despesaPessoalMes: 60,
    despesasAdministrativasMes: 48,
    receitasLiquidasMes: 1000,
    percentualAtingidoOficialInformado: 104.22
  }
});
closeTo(marco.resultadoMensal, 0.108);
closeTo(marco.percentualAtingidoMensal, 0.1441 / 0.108);
assert.equal(marco.percentualAtingidoMensalFormatado, "133,43%");
assert.equal(marco.situacao, "Atingido");
assert.equal(marco.metaReferencia, 0.1441);

const acimaDaMeta = ieoPatch.calcularIeo(regra, {
  ano: 2026,
  mes: 3,
  competencia: "2026-03",
  camposEntrada: { ieoApuradoInformado: 0.16 }
});
closeTo(acimaDaMeta.percentualAtingidoMensal, 0.1441 / 0.16);
assert.equal(acimaDaMeta.situacao, "Abaixo da meta");

console.log("IEO Recorrente: curva mensal, cálculo inverso e remoção do percentual oficial validados.");
