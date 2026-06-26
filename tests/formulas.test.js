const assert = require("node:assert/strict");
const fs = require("node:fs");
const formulas = require("../assets/js/formulas.js");

function closeTo(actual, expected, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be close to ${expected}`);
}

const indicador = (id, nome = "Indicador") => ({ id, indicador: nome, unidadeMedida: "percentual" });

closeTo(formulas.normalizarPercentual("6,42"), 0.0642);
closeTo(formulas.normalizarPercentual(6.42), 0.0642);
closeTo(formulas.normalizarPercentual("14.03"), 0.1403);
closeTo(formulas.normalizarPercentual("10"), 0.1);
closeTo(formulas.normalizarPercentual("42,5"), 0.425);
closeTo(formulas.normalizarPercentual(0.0642), 0.0642);

const regraOfertas = {
  indicadorId: 1,
  tipoCalculo: "percentual_direto",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.1,
  parametrosCalculo: { metaReferencia: 0.1, validarNumeradorAteDenominador: false },
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

const ofertasAcimaDaBase = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivos: 100000, clientesComOfertaPersonalizada: 120000 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivos: 100000, clientesComOfertaPersonalizada: 120000 } }]
);
closeTo(ofertasAcimaDaBase.resultadoMensal, 1.2);
closeTo(ofertasAcimaDaBase.percentualAtingidoMensal, 12);

const ofertasExemploUsuario = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivos: 248005, clientesComOfertaPersonalizada: 636553 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivos: 248005, clientesComOfertaPersonalizada: 636553 } }]
);
closeTo(ofertasExemploUsuario.resultadoMensal, 636553 / 248005);
closeTo(ofertasExemploUsuario.percentualAtingidoMensal, (636553 / 248005) / 0.1);
assert.equal(ofertasExemploUsuario.resultadoMensalFormatado, "256,67%");
assert.equal(ofertasExemploUsuario.percentualAtingidoMensalFormatado, "2.566,69%");

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
  tipoCalculo: "pontuacao_minima",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "pontos",
  metaAnualValor: 62,
  parametrosCalculo: { campoValor: "npsRealizado" },
  camposEntrada: [{ nome: "npsRealizado", obrigatorio: true }]
};

const nps = formulas.calcularIndicador(
  indicador(2, "Índice de Satisfação de Clientes - NPS"),
  regraNps,
  { mes: 1, metaMensal: 58, camposEntrada: { npsRealizado: 55 } },
  [{ mes: 1, metaMensal: 58, camposEntrada: { npsRealizado: 55 } }]
);
closeTo(nps.resultadoMensal, 55);
closeTo(nps.percentualAtingidoMensal, 55 / 58);
closeTo(nps.resultadoOficialAnual, 55);
closeTo(nps.percentualAtingidoAnual, 55 / 58);
assert.equal(nps.resultadoMensalFormatado, "55");
assert.equal(nps.percentualAtingidoMensalFormatado, "94,83%");

const regraDigitais = {
  indicadorId: 3,
  tipoCalculo: "crescimento_media_mensal",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.28,
  parametrosCalculo: { qmaatuCampo: "qmaatu", qmaantCampo: "qmaant", metaCrescimento: 0.28 },
  camposEntrada: [
    { nome: "qmaatu", obrigatorio: true },
    { nome: "qmaant", obrigatorio: true },
    { nome: "dataBaseApuracao", obrigatorio: false }
  ]
};

const digitaisLancamentos = [
  { mes: 1, camposEntrada: { qmaatu: 2480052, qmaant: 1424272, dataBaseApuracao: "2026-01-31" } }
];
const digitais = formulas.calcularIndicador(
  indicador(3, "Índice de Clientes Ativos em Canais Digitais"),
  regraDigitais,
  digitaisLancamentos[0],
  digitaisLancamentos
);
closeTo(digitais.resultadoMensal, 2480052 / 1424272 - 1);
closeTo(digitais.percentualAtingidoMensal, (2480052 / 1424272 - 1) / 0.28);
closeTo(digitais.resultadoOficialAnual, 2480052 / 1424272 - 1);
closeTo(digitais.percentualAtingidoAnual, (2480052 / 1424272 - 1) / 0.28);
assert.equal(digitais.resultadoMensalFormatado, "74,13%");
assert.equal(digitais.percentualAtingidoMensalFormatado, "264,74%");

const digitaisSemBase = formulas.calcularIndicador(
  indicador(3, "Índice de Clientes Ativos em Canais Digitais"),
  regraDigitais,
  { mes: 1, camposEntrada: { qmaatu: 2480052, qmaant: 0 } },
  [{ mes: 1, camposEntrada: { qmaatu: 2480052, qmaant: 0 } }]
);
assert.equal(digitaisSemBase.erro, true);
assert.equal(digitaisSemBase.mensagem, "QMAANT deve ser maior que zero para cálculo do indicador.");

const regraAprimoramento = {
  indicadorId: 4,
  tipoCalculo: "quantidade_acumulada",
  tipoConsolidacao: "soma_acumulada_no_ano",
  unidadeMedida: "melhorias",
  metaAnualValor: 6,
  parametrosCalculo: {
    campoValor: "melhoriasEntreguesMes",
    totalMelhoriasPlano2026: 22,
    metaMinimaMelhoriasAno: 6,
    metaPercentualReferencia: 0.25
  },
  camposEntrada: [
    { nome: "melhoriasEntreguesMes", obrigatorio: true },
    { nome: "dataBaseApuracao", obrigatorio: false }
  ]
};

const melhoriasLancamentos = [
  { mes: 1, camposEntrada: { melhoriasEntreguesMes: 1, dataBaseApuracao: "2026-01-31" } }
];
const melhorias = formulas.calcularIndicador(
  indicador(4, "Aprimoramento da Experiência do Cliente"),
  regraAprimoramento,
  melhoriasLancamentos[0],
  melhoriasLancamentos
);
closeTo(melhorias.resultadoMensal, 1 / 22);
closeTo(melhorias.resultadoAcumulado, 1 / 22);
closeTo(melhorias.resultadoOficialAnual, 1 / 22);
closeTo(melhorias.percentualAtingidoMensal, 1 / 6);
closeTo(melhorias.percentualAtingidoAnual, 1 / 6);
assert.equal(melhorias.resultadoMensalFormatado, "4,55%");
assert.equal(melhorias.percentualAtingidoMensalFormatado, "16,67%");
assert.equal(melhorias.melhoriasEntreguesAcumuladas, 1);
assert.equal(melhorias.situacao, "Em andamento");

const melhoriasAcimaDoPlano = formulas.calcularIndicador(
  indicador(4, "Aprimoramento da Experiência do Cliente"),
  regraAprimoramento,
  { mes: 2, camposEntrada: { melhoriasEntreguesMes: 12 } },
  [
    { mes: 1, camposEntrada: { melhoriasEntreguesMes: 11 } },
    { mes: 2, camposEntrada: { melhoriasEntreguesMes: 12 } }
  ]
);
assert.equal(melhoriasAcimaDoPlano.erro, true);
assert.equal(melhoriasAcimaDoPlano.mensagem, "O total de melhorias entregues não pode ser maior que o total de melhorias previstas no plano.");

const regraGgr = {
  indicadorId: 5,
  tipoCalculo: "valor_financeiro_acumulado",
  tipoConsolidacao: "soma_acumulada_no_ano",
  unidadeMedida: "moeda",
  metaAnualValor: 15600000000,
  parametrosCalculo: { campoValor: "ggrRealizadoMes", usarMetaMensalNoResultado: true },
  camposEntrada: [{ nome: "ggrRealizadoMes", obrigatorio: true }]
};

const ggr = formulas.calcularIndicador(
  indicador(5, "Gross Gaming Revenue (GGR)"),
  regraGgr,
  { mes: 1, metaMensal: 1056593038.57, camposEntrada: { ggrRealizadoMes: 1131557094.81 } },
  [{ mes: 1, metaMensal: 1056593038.57, camposEntrada: { ggrRealizadoMes: 1131557094.81 } }]
);
closeTo(ggr.resultadoMensal, 1131557094.81);
closeTo(ggr.percentualAtingidoMensal, 1131557094.81 / 1056593038.57);
closeTo(ggr.resultadoOficialAnual, 1131557094.81);
closeTo(ggr.percentualAtingidoAnual, 1131557094.81 / 15600000000);
assert.equal(ggr.resultadoMensalFormatado, "R$ 1.131.557.094,81");
assert.equal(ggr.percentualAtingidoMensalFormatado, "107,09%");
assert.equal(ggr.percentualAtingidoAnualFormatado, "7,25%");

const regraPix = {
  indicadorId: 9,
  tipoCalculo: "razao_pix",
  tipoConsolidacao: "razao_acumulada_no_ano",
  unidadeMedida: "percentual",
  metaAnualValor: 0.65,
  parametrosCalculo: {
    campoNumerador: "arrecadacaoPixMes",
    campoDenominador: "arrecadacaoTotalCanaisEletronicosMes"
  },
  camposEntrada: [
    { nome: "arrecadacaoPixMes", obrigatorio: true },
    { nome: "arrecadacaoTotalCanaisEletronicosMes", obrigatorio: false }
  ]
};

const regraCanaisDigitais = {
  indicadorId: 8,
  tipoCalculo: "razao_canais_digitais",
  tipoConsolidacao: "razao_acumulada_no_periodo",
  unidadeMedida: "percentual",
  metaAnualValor: 0.2805,
  parametrosCalculo: {
    campoNumerador: "arrecadacaoCanaisEletronicosMes",
    campoDenominador: "arrecadacaoTotalProdutosLoteriasMes",
    metaReferencia: 0.2805
  },
  camposEntrada: [
    { nome: "arrecadacaoCanaisEletronicosMes", obrigatorio: true },
    { nome: "arrecadacaoTotalProdutosLoteriasMes", obrigatorio: true }
  ]
};
const canaisDigitaisLancamentos = [
  { mes: 1, camposEntrada: { arrecadacaoCanaisEletronicosMes: "R$ 590.000.000,00", arrecadacaoTotalProdutosLoteriasMes: "1.990.000.000,00" } },
  { mes: 2, camposEntrada: { arrecadacaoCanaisEletronicosMes: "590.000.000,00", arrecadacaoTotalProdutosLoteriasMes: "1.990.000.000,00" } },
  { mes: 3, camposEntrada: { arrecadacaoCanaisEletronicosMes: "590.200.000,00", arrecadacaoTotalProdutosLoteriasMes: "1.986.900.000,00" } }
];
const canaisDigitaisTri = formulas.calcularIndicador(
  indicador(8, "Vendas Provenientes de Canais Digitais"),
  regraCanaisDigitais,
  canaisDigitaisLancamentos[2],
  canaisDigitaisLancamentos
);
closeTo(canaisDigitaisTri.resultadoAcumulado, 1770200000 / 5966900000);
closeTo(canaisDigitaisTri.percentualAtingidoAcumulado, (1770200000 / 5966900000) / 0.2805);
assert.equal(canaisDigitaisTri.resultadoAcumuladoFormatado, "29,67%");
assert.equal(canaisDigitaisTri.situacao, "Atingido");
assert.equal(canaisDigitaisTri.canaisEletronicosAcumulado, 1770200000);
assert.equal(canaisDigitaisTri.produtosLoteriasAcumulado, 5966900000);

const canaisDigitaisSemDenominador = formulas.calcularIndicador(
  indicador(8, "Vendas Provenientes de Canais Digitais"),
  regraCanaisDigitais,
  { mes: 1, camposEntrada: { arrecadacaoCanaisEletronicosMes: 590000000 } },
  [{ mes: 1, camposEntrada: { arrecadacaoCanaisEletronicosMes: 590000000 } }]
);
assert.equal(canaisDigitaisSemDenominador.statusCalculo, "aguardando_dados");
assert.match(canaisDigitaisSemDenominador.mensagem, /produtos de loterias/);

const pixLancamentos = [
  { mes: 1, camposEntrada: { arrecadacaoPixMes: "R$ 411.428.638,26", arrecadacaoTotalCanaisEletronicosMes: "625.000.000,00" } },
  { mes: 2, camposEntrada: { arrecadacaoPixMes: "356.327.813,95", arrecadacaoTotalCanaisEletronicosMes: "R$ 525.000.000,00" } },
  { mes: 3, camposEntrada: { arrecadacaoPixMes: "359.270.143,40", arrecadacaoTotalCanaisEletronicosMes: "536.100.000,00" } }
];
const pixJaneiro = formulas.calcularIndicador(indicador(9, "Vendas com Meio de Pagamento PIX"), regraPix, pixLancamentos[0], pixLancamentos.slice(0, 1));
closeTo(pixJaneiro.resultadoMensal, 411428638.26 / 625000000);
closeTo(pixJaneiro.resultadoAcumulado, 411428638.26 / 625000000);
closeTo(pixJaneiro.percentualAtingidoMensal, (411428638.26 / 625000000) / 0.65);
assert.equal(pixJaneiro.resultadoMensalFormatado, "65,83%");

const pixMarco = formulas.calcularIndicador(indicador(9, "Vendas com Meio de Pagamento PIX"), regraPix, pixLancamentos[2], pixLancamentos);
closeTo(pixMarco.resultadoMensal, 359270143.4 / 536100000);
closeTo(pixMarco.resultadoAcumulado, 1127026595.61 / 1686100000);
closeTo(pixMarco.percentualAtingidoAcumulado, (1127026595.61 / 1686100000) / 0.65);
assert.equal(pixMarco.resultadoAcumuladoFormatado, "66,84%");
assert.equal(pixMarco.resultadoMensalFormatado, "67,02%");

const pixSemDenominador = formulas.calcularIndicador(
  indicador(9, "Vendas com Meio de Pagamento PIX"),
  regraPix,
  { mes: 1, camposEntrada: { arrecadacaoPixMes: 411428638.26 } },
  [{ mes: 1, camposEntrada: { arrecadacaoPixMes: 411428638.26 } }]
);
assert.equal(pixSemDenominador.erro, undefined);
assert.equal(pixSemDenominador.statusCalculo, "aguardando_dados");
assert.equal(pixSemDenominador.resultadoMensal, null);

const regraIeo = {
  indicadorId: 6,
  tipoCalculo: "indice_inverso_ajustado",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.1403,
  parametrosCalculo: { campoValor: "ieoRealizadoMes", campoPercentual: true, metaReferencia: 0.1403, quantoMenorMelhor: true },
  camposEntrada: [{ nome: "ieoRealizadoMes", obrigatorio: true }]
};

const ieo = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { mes: 1, metaMensal: 0.1449, camposEntrada: { ieoRealizadoMes: 6.42 } },
  [{ mes: 1, metaMensal: 0.1449, camposEntrada: { ieoRealizadoMes: 6.42 } }]
);
closeTo(ieo.resultadoMensal, 0.0642);
closeTo(ieo.resultadoOficialAnual, 0.0642);
assert.equal(ieo.resultadoMensalFormatado, "6,42%");
assert.equal(ieo.resultadoOficialAnualFormatado, "6,42%");
assert.equal(ieo.situacao, "Atingido");

const ieoNaoAtingido = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { mes: 1, camposEntrada: { ieoRealizadoMes: 15 } },
  [{ mes: 1, camposEntrada: { ieoRealizadoMes: 15 } }]
);
assert.equal(ieoNaoAtingido.situacao, "Não atingido");

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
  3: { qmaatu: 2480052, qmaant: 1424272, dataBaseApuracao: "2026-01-31" },
  4: { melhoriasEntreguesMes: 6, dataBaseApuracao: "2026-12-31" },
  5: { ggrRealizadoMes: 15600000000 },
  6: { ieoRealizadoMes: 0.0642 },
  7: { lucroLiquidoRecorrenteAcumulado: 1209000000 },
  8: { arrecadacaoCanaisEletronicosMes: 15, arrecadacaoTotalProdutosLoteriasMes: 100 },
  9: { arrecadacaoPixMes: 411428638.26, arrecadacaoTotalCanaisEletronicosMes: 600000000 },
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
  const lancamento = {
    mes: 12,
    metaMensal: regra.indicadorId === 5 ? 15600000000 : undefined,
    camposEntrada: amostras[regra.indicadorId]
  };
  const resultado = formulas.calcularIndicador(indicador(regra.indicadorId, regra.nome), regra, lancamento, [lancamento]);
  assert.equal(resultado.erro, undefined, `Regra ${regra.indicadorId} não deveria falhar: ${resultado.mensagem}`);
  assert.notEqual(resultado.percentualAtingidoMensal, null, `Regra ${regra.indicadorId} sem percentual mensal`);
}

console.log("Testes de fórmulas OK");
