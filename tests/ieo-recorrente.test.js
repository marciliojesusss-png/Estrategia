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
assert.equal(ieo.getMetaCompetencia("2026-08"), 0.2988);
assert.equal(ieo.getMetaCompetencia("2026-09"), 0.2923);
assert.equal(ieo.getMetaCompetencia("2026-10"), 0.2913);
assert.equal(ieo.getMetaCompetencia("2026-11"), 0.2929);
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
closeTo(janeiro.percentualAtingidoMensal, 1.0943749269091334);
assert.equal(janeiro.percentualAtingidoMensalFormatado, "109,44%");
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
closeTo(fevereiro.percentualAtingidoMensal, 1.0403272939801285);
assert.equal(fevereiro.percentualAtingidoMensalFormatado, "104,03%");
assert.equal(fevereiro.situacao, "Atingido");

const marco = ieo.calcularIeo(regraBase, {
  competencia: "2026-03",
  camposEntrada: {
    despesaPessoalMes: 28000000,
    despesasAdministrativasMes: 43625600,
    receitasLiquidasMes: 663200000,
    ieoApuradoInformado: 0.108
  }
});
closeTo(marco.resultadoMensal, 0.108);
closeTo(marco.percentualAtingidoMensal, 1.0421778245122093);
assert.equal(marco.percentualAtingidoMensalFormatado, "104,22%");
assert.equal(marco.situacao, "Atingido");
assert.equal(marco.origemResultado, "calculado_conferido");
assert.equal(marco.resultadoCalculado, 0.108);
assert.equal(marco.resultadoInformado, 0.108);
assert.equal(marco.resultadoOficial, 0.108);
assert.equal(marco.valoresConferidosIeo, true);
assert.equal(marco.divergenciaIeo, false);

const resultadosDocumentaisSemComponentes = [
  ["2026-01", 0.1449, 0.0642, "109,44%", 109.44],
  ["2026-02", 0.1445, 0.11, "104,03%", 104.03],
  ["2026-03", 0.1441, 0.108, "104,22%", 104.22],
  ["2026-04", 0.1436, 0.1113, "103,77%", 103.77],
  ["2026-05", 0.1432, 0.1115, "103,7%", 103.70],
  ["2026-06", 0.1428, 0.1115, "103,65%", 103.65]
].map(([competencia, metaReferencia, ieoApuradoInformado, percentualFormatadoEsperado, percentualEsperado]) => {
  const calculo = ieo.calcularIeo(regraBase, {
    competencia,
    metaReferencia,
    camposEntrada: { ieoApuradoInformado }
  });
  assert.equal(calculo.metodologiaIeo, "original");
  assert.equal(calculo.resultadoMensal, ieoApuradoInformado);
  assert.equal(calculo.percentualAtingidoMensalFormatado, percentualFormatadoEsperado);
  assert.equal(Math.round(calculo.percentualAtingidoMensal * 10000) / 100, percentualEsperado);
  assert.equal(calculo.situacao, "Atingido");
  assert.equal(calculo.origemResultado, "informado");
  assert.equal(calculo.resultadoCalculado, null);
  assert.equal(calculo.resultadoInformado, ieoApuradoInformado);
  assert.equal(calculo.resultadoOficial, ieoApuradoInformado);
  assert.equal(calculo.divergenciaIeo, false);
  assert.equal(calculo.numeradorIeo, undefined);
  assert.equal(calculo.denominadorIeo, undefined);
  return calculo;
});
assert.equal(resultadosDocumentaisSemComponentes.length, 6);

const abrilConferidoNaPrecisaoOficial = ieo.calcularIeo(regraBase, {
  competencia: "2026-04",
  metaReferencia: 0.1436,
  camposEntrada: {
    despesaPessoalMes: 89043444.39,
    despesasAdministrativasMes: 0,
    receitasLiquidasMes: 800062366.68,
    ieoApuradoInformado: 0.1113
  }
});
closeTo(abrilConferidoNaPrecisaoOficial.resultadoCalculadoBruto, 0.11129562906389598, Number.EPSILON);
assert.equal(abrilConferidoNaPrecisaoOficial.resultadoCalculado, 0.1113);
assert.equal(abrilConferidoNaPrecisaoOficial.resultadoInformado, 0.1113);
assert.equal(abrilConferidoNaPrecisaoOficial.resultadoOficial, 0.1113);
assert.equal(abrilConferidoNaPrecisaoOficial.origemResultado, "calculado_conferido");
assert.equal(abrilConferidoNaPrecisaoOficial.valoresConferidosIeo, true);
assert.equal(abrilConferidoNaPrecisaoOficial.divergenciaIeo, false);

const abrilDivergente = ieo.calcularIeo(regraBase, {
  competencia: "2026-04",
  metaReferencia: 0.1436,
  camposEntrada: {
    despesaPessoalMes: 100,
    despesasAdministrativasMes: 0,
    receitasLiquidasMes: 1000,
    ieoApuradoInformado: 0.1113
  }
});
assert.equal(abrilDivergente.resultadoCalculado, 0.1);
assert.equal(abrilDivergente.resultadoInformado, 0.1113);
assert.equal(abrilDivergente.resultadoOficial, 0.1113);
assert.equal(abrilDivergente.resultadoMensal, 0.1113);
assert.equal(abrilDivergente.origemResultado, "informado_com_divergencia");
assert.equal(abrilDivergente.valoresConferidosIeo, false);
assert.equal(abrilDivergente.divergenciaIeo, true);
assert.equal(abrilDivergente.submissaoBloqueadaPorDivergenciaIeo, true);
closeTo(abrilDivergente.percentualAtingidoMensal, ieo.calcularPercentualAtingido(0.1436, 0.1113), Number.EPSILON);

const componentesInvalidosNaoCedemAoInformado = ieo.calcularIeo(regraBase, {
  competencia: "2026-04",
  metaReferencia: 0.1436,
  camposEntrada: {
    despesaPessoalMes: 100,
    despesasAdministrativasMes: 0,
    receitasLiquidasMes: 0,
    ieoApuradoInformado: 0.1113
  }
});
assert.equal(componentesInvalidosNaoCedemAoInformado.statusCalculo, "erro");
assert.match(componentesInvalidosNaoCedemAoInformado.mensagem, /maiores que zero/);

const junhoDocumentalSemRateioArtificial = ieo.calcularIeo(regraBase, {
  competencia: "2026-06",
  metaReferencia: 0.1428,
  camposEntrada: {
    despesaPessoalMes: "",
    despesasAdministrativasMes: "",
    receitasLiquidasMes: "",
    ieoApuradoInformado: 0.1115
  }
});
assert.equal(junhoDocumentalSemRateioArtificial.metodologiaIeo, "original");
assert.equal(junhoDocumentalSemRateioArtificial.resultadoMensal, 0.1115);
closeTo(junhoDocumentalSemRateioArtificial.percentualAtingidoMensal, 1.0365142323845078, Number.EPSILON);
assert.equal(junhoDocumentalSemRateioArtificial.percentualAtingidoMensalFormatado, "103,65%");
assert.equal(junhoDocumentalSemRateioArtificial.situacao, "Atingido");
assert.equal(junhoDocumentalSemRateioArtificial.origemResultado, "informado");
assert.equal(junhoDocumentalSemRateioArtificial.numeradorIeo, undefined);
assert.equal(junhoDocumentalSemRateioArtificial.denominadorIeo, undefined);

closeTo(ieo.calcularPercentualAtingido(0.1449, 0.1449), 1, Number.EPSILON);
assert.ok(ieo.calcularPercentualAtingido(0.1449, 0.20) < 1);
closeTo(ieo.calcularPercentualAtingido(0.1449, 1), 0, Number.EPSILON);
assert.throws(
  () => ieo.calcularPercentualAtingido(1, 0.5),
  /divisão por zero/
);

const detalhesPreservados = ieo.acrescentarMetodologiaDetalhes("Texto de negócio preservado.", 0.1449, 0.0642);
assert.match(detalhesPreservados, /^Texto de negócio preservado\./);
assert.match(detalhesPreservados, /% Atingido = 1 - \(\(Realizado - Meta\) \/ \(VRM - Meta\)\)/);
assert.match(detalhesPreservados, /VRM = 100%/);
assert.match(detalhesPreservados, /Meta: 14,49%/);
assert.match(detalhesPreservados, /Realizado: 6,42%/);
assert.match(detalhesPreservados, /= 109,44%/);
const detalhesRegravados = ieo.acrescentarMetodologiaDetalhes(detalhesPreservados, 0.1449, 0.0642);
assert.equal((detalhesRegravados.match(/Metodologia do percentual atingido:/g) || []).length, 1);
assert.doesNotMatch(ieo.gerarDetalhesMetaMensal(0.1449, null), /Cálculo da competência:/);

const outraRegra = { indicadorId: 7, tipoCalculo: "percentual_direto" };
assert.strictEqual(ieo.ajustarRegraIeo(outraRegra, "2026-01"), outraRegra);

const agostoAtingido = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: {
    despesasGeraisAdministrativasMes: 100,
    despesasServicosPagamentosMes: 50,
    outrasDespesasOperacionaisMes: 30,
    receitasOperacionaisMes: 1000,
    despesasTributosMes: 100
  }
});
closeTo(agostoAtingido.numeradorIeo, 180);
closeTo(agostoAtingido.denominadorIeo, 900);
closeTo(agostoAtingido.resultadoMensal, 0.20);
closeTo(agostoAtingido.percentualAtingidoMensal, 1.1409013120365088);
assert.equal(agostoAtingido.resultadoMensalFormatado, "20,00%");
assert.equal(agostoAtingido.percentualAtingidoMensalFormatado, "114,09%");
assert.equal(agostoAtingido.situacao, "Atingido");
assert.equal(agostoAtingido.origemResultado, "calculado");
assert.equal(agostoAtingido.resultadoCalculado, 0.2);
assert.equal(agostoAtingido.resultadoInformado, null);

const exemploFormularioAgosto = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: {
    despesasGeraisAdministrativasMes: 100000000,
    despesasServicosPagamentosMes: 40000000,
    outrasDespesasOperacionaisMes: 20000000,
    receitasOperacionaisMes: 800000000,
    despesasTributosMes: 100000000
  }
});
closeTo(exemploFormularioAgosto.numeradorIeo, 160000000);
closeTo(exemploFormularioAgosto.denominadorIeo, 700000000);
closeTo(exemploFormularioAgosto.resultadoBruto, 160000000 / 700000000);
assert.equal(exemploFormularioAgosto.resultadoMensal, 0.2286);
assert.equal(exemploFormularioAgosto.resultadoMensalFormatado, "22,86%");
assert.equal(exemploFormularioAgosto.percentualAtingidoMensalFormatado, "110,01%");
assert.equal(exemploFormularioAgosto.situacao, "Atingido");
assert.equal(exemploFormularioAgosto.origemResultado, "calculado");

const agostoDivergente = ieo.calcularIeo(regraBase, {
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
assert.equal(agostoDivergente.resultadoCalculado, 0.2);
assert.equal(agostoDivergente.resultadoInformado, 0.25);
assert.equal(agostoDivergente.resultadoOficial, 0.25);
assert.equal(agostoDivergente.resultadoMensal, 0.25);
assert.equal(agostoDivergente.origemResultado, "informado_com_divergencia");
assert.equal(agostoDivergente.divergenciaIeo, true);

const agostoOficialArredondado = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  metaReferencia: 0.2988,
  camposEntrada: {
    despesasGeraisAdministrativasMes: 176094338.69,
    despesasServicosPagamentosMes: 52856703.22,
    outrasDespesasOperacionaisMes: 100306.69,
    receitasOperacionaisMes: 1598637627.79,
    despesasTributosMes: 174627188.33
  }
});
closeTo(agostoOficialArredondado.resultadoBruto, 0.16084948695099363, Number.EPSILON);
assert.equal(agostoOficialArredondado.resultadoMensal, 0.1608);
assert.equal(agostoOficialArredondado.resultadoMensalFormatado, "16,08%");
closeTo(agostoOficialArredondado.percentualAtingidoMensal, 1.1968054763262979, Number.EPSILON);
assert.equal(agostoOficialArredondado.percentualAtingidoMensalFormatado, "119,68%");

const setembroOficialArredondado = ieo.calcularIeo(regraBase, {
  competencia: "2026-09",
  metaReferencia: 0.2923,
  camposEntrada: {
    despesasGeraisAdministrativasMes: 207600617.97,
    despesasServicosPagamentosMes: 60460075.58,
    outrasDespesasOperacionaisMes: 321534.28,
    receitasOperacionaisMes: 1850907955.34,
    despesasTributosMes: 201813909.75
  }
});
closeTo(setembroOficialArredondado.resultadoBruto, 0.16274525309681798, Number.EPSILON);
assert.equal(setembroOficialArredondado.resultadoMensal, 0.1627);
assert.equal(setembroOficialArredondado.resultadoMensalFormatado, "16,27%");
closeTo(setembroOficialArredondado.percentualAtingidoMensal, 1.1831284442560408, Number.EPSILON);
assert.equal(setembroOficialArredondado.percentualAtingidoMensalFormatado, "118,31%");

assert.equal(ieo.arredondarIeoOficial(0.16084948695099363), 0.1608);
assert.equal(ieo.arredondarIeoOficial(0.16274525309681798), 0.1627);

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
closeTo(agostoAbaixo.percentualAtingidoMensal, 0.9507510933637574);
assert.equal(agostoAbaixo.percentualAtingidoMensalFormatado, "95,08%");
assert.equal(agostoAbaixo.situacao, "Abaixo da meta");

const componentesAusentes = ieo.calcularIeo(regraBase, {
  competencia: "2026-08",
  camposEntrada: { ieoApuradoInformado: 0.20 }
});
assert.equal(componentesAusentes.statusCalculo, "calculado");
assert.equal(componentesAusentes.resultadoMensal, 0.2);
assert.equal(componentesAusentes.resultadoCalculado, null);
assert.equal(componentesAusentes.resultadoOficial, 0.2);
assert.equal(componentesAusentes.origemResultado, "informado");

const julhoSemResultado = ieo.calcularIeo(regraBase, {
  competencia: "2026-07",
  metaReferencia: 0.1423833333333333,
  camposEntrada: {}
});
assert.equal(julhoSemResultado.metodologiaIeo, "original");
assert.equal(julhoSemResultado.resultadoMensal, null);
assert.equal(julhoSemResultado.percentualAtingidoMensal, null);

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
assert.equal(julhoNormalizado.metaReferencia, 999, "a normalização não deve substituir a meta persistida");
assert.equal(julhoNormalizado.metodologiaIeo, "original");

const agostoNormalizado = ieo.normalizarLancamentoParaExibicao({
  indicadorId: 6,
  competencia: "2026-08",
  metaReferencia: 0.1419666666666667,
  camposEntrada: {}
}, regraBase);
assert.equal(agostoNormalizado.metaReferencia, 0.1419666666666667, "a meta persistida deve prevalecer na nova vigência");
assert.equal(agostoNormalizado.metodologiaIeo, "ca_agosto_2026");

console.log("IEO Recorrente: vigência Jul/Ago, fórmulas, metas, validações e histórico validados.");
