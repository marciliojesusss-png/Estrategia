const assert = require("node:assert/strict");
const fs = require("node:fs");
const formulas = require("../assets/js/formulas.js");

function closeTo(actual, expected, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be close to ${expected}`);
}

const indicador = (id, nome = "Indicador") => ({ id, indicador: nome, unidadeMedida: "percentual" });

const regraOfertas = {
  indicadorId: 1,
  tipoCalculo: "percentual_direto",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.1,
  parametrosCalculo: { metaReferencia: 0.1 },
  camposEntrada: [
    { nome: "baseClientesAtivos", obrigatorio: true },
    { nome: "clientesComOfertaPersonalizada", obrigatorio: true }
  ]
};

const ofertas = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivos: 100000, clientesComOfertaPersonalizada: 20840 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivos: 100000, clientesComOfertaPersonalizada: 20840 } }]
);
closeTo(ofertas.resultadoMensal, 0.2084);
closeTo(ofertas.percentualAtingidoMensal, 2.084);
closeTo(ofertas.resultadoOficialAnual, 0.2084);
closeTo(ofertas.percentualAtingidoAnual, 2.084);
assert.equal(ofertas.resultadoMensalFormatado, "20,84%");
assert.equal(ofertas.percentualAtingidoMensalFormatado, "208,4%");

const ofertasInvalidas = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivos: 100000, clientesComOfertaPersonalizada: 120000 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivos: 100000, clientesComOfertaPersonalizada: 120000 } }]
);
assert.equal(ofertasInvalidas.erro, true);
assert.equal(ofertasInvalidas.mensagem, "Clientes com oferta personalizada não pode ser maior que a base de clientes ativos.");

const regraMulheresGestoras = {
  indicadorId: 13,
  tipoCalculo: "percentual_direto",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.425,
  parametrosCalculo: {
    numeradorCampo: "mulheresGestorasMes",
    denominadorCampo: "totalGestoresMes",
    metaReferencia: 0.425
  },
  camposEntrada: [
    { nome: "mulheresGestorasMes", obrigatorio: true },
    { nome: "totalGestoresMes", obrigatorio: true },
    { nome: "dataBaseApuracao", obrigatorio: true }
  ]
};

const mulheresGestoras = formulas.calcularIndicador(
  indicador(13, "Mulheres Chefes de Unidade e Gestoras"),
  regraMulheresGestoras,
  { mes: 12, camposEntrada: { mulheresGestorasMes: 20, totalGestoresMes: 40, dataBaseApuracao: "2026-12-31" } },
  [{ mes: 12, camposEntrada: { mulheresGestorasMes: 20, totalGestoresMes: 40, dataBaseApuracao: "2026-12-31" } }]
);
closeTo(mulheresGestoras.resultadoMensal, 0.5);
closeTo(mulheresGestoras.percentualAtingidoMensal, 1.1764705882);
closeTo(mulheresGestoras.resultadoOficialAnual, 0.5);
closeTo(mulheresGestoras.percentualAtingidoAnual, 1.1764705882);
assert.equal(mulheresGestoras.resultadoMensalFormatado, "50%");
assert.equal(mulheresGestoras.percentualAtingidoMensalFormatado, "117,65%");

const mulheresGestorasParcial = formulas.calcularIndicador(
  indicador(13, "Mulheres Chefes de Unidade e Gestoras"),
  regraMulheresGestoras,
  { mes: 12, camposEntrada: { mulheresGestorasMes: 14, totalGestoresMes: 40, dataBaseApuracao: "2026-12-31" } },
  [{ mes: 12, camposEntrada: { mulheresGestorasMes: 14, totalGestoresMes: 40, dataBaseApuracao: "2026-12-31" } }]
);
closeTo(mulheresGestorasParcial.resultadoMensal, 0.35);
closeTo(mulheresGestorasParcial.percentualAtingidoMensal, 0.8235294118);
closeTo(mulheresGestorasParcial.resultadoOficialAnual, 0.35);
closeTo(mulheresGestorasParcial.percentualAtingidoAnual, 0.8235294118);
assert.equal(mulheresGestorasParcial.resultadoMensalFormatado, "35%");
assert.equal(mulheresGestorasParcial.percentualAtingidoMensalFormatado, "82,35%");

const mulheresGestorasInvalidas = formulas.calcularIndicador(
  indicador(13, "Mulheres Chefes de Unidade e Gestoras"),
  regraMulheresGestoras,
  { mes: 12, camposEntrada: { mulheresGestorasMes: 41, totalGestoresMes: 40, dataBaseApuracao: "2026-12-31" } },
  [{ mes: 12, camposEntrada: { mulheresGestorasMes: 41, totalGestoresMes: 40, dataBaseApuracao: "2026-12-31" } }]
);
assert.equal(mulheresGestorasInvalidas.erro, true);

const regraNps = {
  indicadorId: 2,
  tipoCalculo: "reducao_de_gap",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "pontos",
  metaAnualValor: 62,
  parametrosCalculo: { notaBase: 60, notaReferencia: 70, percentualReducaoGap: 0.2, metaFinalCalculada: 62 },
  camposEntrada: [{ nome: "npsRealizado", obrigatorio: true }]
};

const nps = formulas.calcularIndicador(
  indicador(2, "Índice de Satisfação de Clientes - NPS"),
  regraNps,
  { mes: 1, camposEntrada: { npsRealizado: 61 } },
  [{ mes: 1, camposEntrada: { npsRealizado: 61 } }]
);
closeTo(nps.percentualAtingidoMensal, 0.5);

const regraDigitais = {
  indicadorId: 3,
  tipoCalculo: "crescimento_media_mensal",
  tipoConsolidacao: "media_mensal_acumulada",
  unidadeMedida: "percentual",
  metaAnualValor: 0.28,
  parametrosCalculo: { qmaant: 100000, metaCrescimento: 0.28 },
  camposEntrada: [{ nome: "clientesAtivosDigitaisMes", obrigatorio: true }]
};

const digitaisLancamentos = [
  { mes: 1, camposEntrada: { clientesAtivosDigitaisMes: 120000 } },
  { mes: 2, camposEntrada: { clientesAtivosDigitaisMes: 130000 } },
  { mes: 3, camposEntrada: { clientesAtivosDigitaisMes: 140000 } }
];
const digitais = formulas.calcularIndicador(
  indicador(3, "Índice de Clientes Ativos em Canais Digitais"),
  regraDigitais,
  digitaisLancamentos[2],
  digitaisLancamentos
);
closeTo(digitais.resultadoAcumulado, 0.3);
closeTo(digitais.percentualAtingidoAcumulado, 1.0714285714);

const regraAprimoramento = {
  indicadorId: 4,
  tipoCalculo: "percentual_acumulado",
  tipoConsolidacao: "acumulado_no_ano",
  unidadeMedida: "percentual",
  metaAnualValor: 0.25,
  parametrosCalculo: { totalMelhoriasIdentificadasBaseline: 200, metaExecucao: 0.25 },
  camposEntrada: [{ nome: "melhoriasImplementadasMes", obrigatorio: true }]
};

const melhoriasLancamentos = [
  { mes: 1, camposEntrada: { melhoriasImplementadasMes: 10 } },
  { mes: 2, camposEntrada: { melhoriasImplementadasMes: 20 } },
  { mes: 3, camposEntrada: { melhoriasImplementadasMes: 20 } }
];
const melhorias = formulas.calcularIndicador(
  indicador(4, "Aprimoramento da Experiência do Cliente"),
  regraAprimoramento,
  melhoriasLancamentos[2],
  melhoriasLancamentos
);
closeTo(melhorias.resultadoAcumulado, 0.25);
closeTo(melhorias.percentualAtingidoAcumulado, 1);

const regraEcossistema = {
  indicadorId: 22,
  tipoCalculo: "crescimento_relativo_participacao",
  tipoConsolidacao: "razao_acumulada_no_ano",
  unidadeMedida: "percentual",
  metaAnualValor: null,
  parametrosCalculo: {
    campoNumerador: "arrecadacaoEcossistemaMes",
    campoDenominador: "arrecadacaoTotalMes",
    campoReferencia2025: "participacaoEcossistema2025",
    campoNumerador2025: "arrecadacaoEcossistema2025",
    campoDenominador2025: "arrecadacaoTotal2025",
    metaCrescimento: 0.1
  },
  camposEntrada: [
    { nome: "arrecadacaoEcossistemaMes", obrigatorio: true },
    { nome: "arrecadacaoTotalMes", obrigatorio: true },
    { nome: "participacaoEcossistema2025", obrigatorio: false }
  ]
};

const ecossistema = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistema,
  { mes: 1, camposEntrada: { arrecadacaoEcossistemaMes: 1000000, arrecadacaoTotalMes: 10000000, participacaoEcossistema2025: 0.08 } },
  [{ mes: 1, camposEntrada: { arrecadacaoEcossistemaMes: 1000000, arrecadacaoTotalMes: 10000000, participacaoEcossistema2025: 0.08 } }]
);
closeTo(ecossistema.resultadoMensal, 0.1);
closeTo(ecossistema.resultadoOficialAnual, 0.1);
closeTo(ecossistema.resultadoReferencia2025, 0.08);
closeTo(ecossistema.metaCalculada2026, 0.088);
closeTo(ecossistema.crescimentoVs2025, 0.25);
closeTo(ecossistema.percentualAtingidoMensal, 1.1363636364);
assert.equal(ecossistema.percentualAtingidoMensalFormatado, "113,64%");

const ecossistemaReferenciaPercentualInteiro = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistema,
  { mes: 1, camposEntrada: { arrecadacaoEcossistemaMes: 1000000, arrecadacaoTotalMes: 10000000, participacaoEcossistema2025: 8 } },
  [{ mes: 1, camposEntrada: { arrecadacaoEcossistemaMes: 1000000, arrecadacaoTotalMes: 10000000, participacaoEcossistema2025: 8 } }]
);
closeTo(ecossistemaReferenciaPercentualInteiro.resultadoReferencia2025, 0.08);
closeTo(ecossistemaReferenciaPercentualInteiro.percentualAtingidoMensal, 1.1363636364);

const ecossistemaSemReferencia = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistema,
  { mes: 1, camposEntrada: { arrecadacaoEcossistemaMes: 1000000, arrecadacaoTotalMes: 10000000 } },
  [{ mes: 1, camposEntrada: { arrecadacaoEcossistemaMes: 1000000, arrecadacaoTotalMes: 10000000 } }]
);
assert.equal(ecossistemaSemReferencia.erro, true);
assert.equal(ecossistemaSemReferencia.mensagem, "Resultado referência de 2025 não informado. Não é possível calcular a meta 2026.");

const regras = JSON.parse(fs.readFileSync("data/regras-indicadores.json", "utf8"));
const amostras = {
  1: { baseClientesAtivos: 1000, clientesComOfertaPersonalizada: 100 },
  2: { npsRealizado: 62 },
  3: { clientesAtivosDigitaisMes: 128000 },
  4: { melhoriasImplementadasMes: 50 },
  5: { arrecadacaoTotalMes: 1000, premiosAPagarMes: 200 },
  6: { despesaPessoalMes: 10, despesasAdministrativasMes: 4.03, receitasLiquidasMes: 100 },
  7: { lucroLiquidoRecorrenteAcumulado: 1209000000 },
  8: { arrecadacaoCanaisEletronicosMes: 15, arrecadacaoTotalProdutosLoteriasMes: 100 },
  9: { arrecadacaoPixMes: 25, arrecadacaoTotalCanaisEletronicosMes: 100 },
  10: { etapaAtualProjeto: "MVP entregue", percentualExecucao: 80, evidenciaEntrega: "Termo" },
  11: { etapaAtual: "formalizado", percentualExecucao: 70, modalidade: "Contrato", numeroProcesso: "123" },
  12: { mediaGeralGPTW: 60, dataPesquisa: "2026-12-01", relatorioGPTW: "Relatorio oficial" },
  13: { mulheresGestorasMes: 425, totalGestoresMes: 1000, dataBaseApuracao: "2026-12-31" },
  14: { gestoresEnquadradosMes: 350, totalGestoresMes: 1000, dataBaseApuracao: "2026-12-31" },
  15: { empregadosElegiveisMes: 1000, empregadosCapacitadosMes: 900 },
  16: { quantidadeIniciativasApoiadasMes: 2, nomeIniciativa: "Projeto", dataApoio: "2026-12-01" },
  17: { repasseSocialAcumulado: 10400000000, dataBaseApuracao: "2026-12-31" },
  18: { elementosExecutadosAcumulado: 10, elementoRGF: "1", acaoMelhoria: "Acao", statusAcao: "Executada", dataExecucao: "2026-12-01" },
  19: { valorInvestidoAcumulado: 3300, lucroLiquidoBase: 1000000 },
  20: { totalAcoesPropostas: 10, totalAcoesRealizadas: 10, statusAcao: "Concluida" },
  21: { empregadosElegiveisMes: 1000, empregadosComDuasIniciativasConcluidas: 900 },
  22: { arrecadacaoEcossistemaMes: 10, arrecadacaoTotalMes: 100, participacaoEcossistema2025: 0.08 },
  23: { arrecadacaoRedeLotericaMes2026: 102, arrecadacaoRedeLotericaMes2025: 100 }
};

assert.equal(regras.length, 23);
assert.equal(new Set(regras.map((regra) => regra.indicadorId)).size, 23);
for (const regra of regras) {
  const lancamento = { mes: 12, camposEntrada: amostras[regra.indicadorId] };
  const resultado = formulas.calcularIndicador(indicador(regra.indicadorId, regra.nome), regra, lancamento, [lancamento]);
  assert.equal(resultado.erro, undefined, `Regra ${regra.indicadorId} nao deveria falhar: ${resultado.mensagem}`);
  assert.notEqual(resultado.percentualAtingidoMensal, null, `Regra ${regra.indicadorId} sem percentual mensal`);
}

console.log("Testes de fórmulas OK");
