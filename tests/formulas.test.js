const assert = require("node:assert/strict");
const fs = require("node:fs");
const formulas = require("../assets/js/formulas.js");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

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
  tipoConsolidacao: "acumulado_por_competencia",
  unidadeMedida: "percentual",
  metaAnualValor: 0.1,
  parametrosCalculo: {
    numeradorCampo: "clientesUnicosComOfertaPersonalizadaCompetencia",
    denominadorCampo: "baseClientesAtivosCompetencia",
    metaReferencia: 0.1,
    validarNumeradorAteDenominador: false
  },
  camposEntrada: [
    { nome: "baseClientesAtivosCompetencia", obrigatorio: true },
    { nome: "clientesUnicosComOfertaPersonalizadaCompetencia", obrigatorio: true }
  ]
};

const ofertas = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 100000, clientesUnicosComOfertaPersonalizadaCompetencia: 20840 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 100000, clientesUnicosComOfertaPersonalizadaCompetencia: 20840 } }]
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
  { mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 100000, clientesUnicosComOfertaPersonalizadaCompetencia: 120000 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 100000, clientesUnicosComOfertaPersonalizadaCompetencia: 120000 } }]
);
closeTo(ofertasAcimaDaBase.resultadoMensal, 1.2);
closeTo(ofertasAcimaDaBase.percentualAtingidoMensal, 12);

const ofertasExemploUsuario = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 248005, clientesUnicosComOfertaPersonalizadaCompetencia: 636553 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 248005, clientesUnicosComOfertaPersonalizadaCompetencia: 636553 } }]
);
closeTo(ofertasExemploUsuario.resultadoMensal, 636553 / 248005);
closeTo(ofertasExemploUsuario.percentualAtingidoMensal, (636553 / 248005) / 0.1);
assert.equal(ofertasExemploUsuario.resultadoMensalFormatado, "256,67%");
assert.equal(ofertasExemploUsuario.percentualAtingidoMensalFormatado, "2.566,69%");

const ofertasInforme1Tri = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { baseClientesAtivosCompetencia: 2773599, clientesUnicosComOfertaPersonalizadaCompetencia: 1241587 } },
  [
    { ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: {} },
    { ano: 2026, mes: 2, competencia: "2026-02", camposEntrada: {} },
    { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { baseClientesAtivosCompetencia: 2773599, clientesUnicosComOfertaPersonalizadaCompetencia: 1241587 } }
  ]
);
closeTo(ofertasInforme1Tri.resultadoMensal, 1241587 / 2773599);
closeTo(ofertasInforme1Tri.percentualAtingidoMensal, (1241587 / 2773599) / 0.1);
assert.equal(ofertasInforme1Tri.resultadoMensalFormatado, "44,76%");
assert.equal(ofertasInforme1Tri.percentualAtingidoMensalFormatado, "447,64%");
assert.ok(ofertasInforme1Tri.percentualAtingidoMensal > 1);

const ofertasSemBase = formulas.calcularIndicador(
  indicador(1, "Índice de Ofertas Personalizadas aos Clientes Ativos"),
  regraOfertas,
  { mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 0, clientesUnicosComOfertaPersonalizadaCompetencia: 100 } },
  [{ mes: 1, camposEntrada: { baseClientesAtivosCompetencia: 0, clientesUnicosComOfertaPersonalizadaCompetencia: 100 } }]
);
assert.equal(ofertasSemBase.statusCalculo, "aguardando_dados");
assert.equal(ofertasSemBase.mensagem, "Dados insuficientes para cálculo.");

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
  tipoCalculo: "nota_pesquisa_nps",
  tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
  unidadeMedida: "pontos",
  metaAnualValor: 58,
  parametrosCalculo: {
    campoTipoPosicao: "tipoPosicaoNPS",
    campoNps: "npsApurado",
    campoPromotores: "percentualPromotores",
    campoDetratores: "percentualDetratores",
    campoMetaReferencia: "metaReferenciaCompetenciaNPS",
    metaTipo: "baseline_com_meta_anual_corrigida",
    baselineNPS: 55,
    notaReferenciaNPS: 70,
    percentualReducaoGap: 0.20,
    metaAnualMetodologica: 58,
    referenciasPorCompetencia: { "2026-03": 55 },
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [{ nome: "tipoPosicaoNPS", obrigatorio: true }]
};

const nps = formulas.calcularIndicador(
  indicador(2, "Índice de Satisfação de Clientes - NPS"),
  regraNps,
  { ano: 2026, mes: 3, competencia: "2026-03", metaMensal: 55, camposEntrada: { tipoPosicaoNPS: "Baseline", metaReferenciaCompetenciaNPS: 55, npsApurado: 55, dataBasePesquisaNPS: "2026-03-31", fontePesquisaNPS: "Informe" } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", metaMensal: 55, camposEntrada: { tipoPosicaoNPS: "Baseline", metaReferenciaCompetenciaNPS: 55, npsApurado: 55 } }]
);
closeTo(nps.resultadoMensal, 55);
closeTo(nps.percentualAtingidoMensal, 1);
closeTo(nps.resultadoOficialAnual, 55);
closeTo(nps.percentualAtingidoAnual, 1);
assert.equal(nps.resultadoMensalFormatado, "55");
assert.equal(nps.percentualAtingidoMensalFormatado, "100%");
assert.equal(nps.metaReferenciaPeriodo, 55);
assert.equal(nps.metaAnualCorretaNPS, 58);
assert.equal(nps.situacao, "Em acompanhamento");

const npsDetalhado = formulas.calcularIndicador(
  indicador(2, "Índice de Satisfação de Clientes - NPS"),
  regraNps,
  { ano: 2026, mes: 12, competencia: "2026-12", camposEntrada: { tipoPosicaoNPS: "Pesquisa oficial", percentualPromotores: 0.72, percentualDetratores: 0.12 } },
  [{ ano: 2026, mes: 12, competencia: "2026-12", camposEntrada: { tipoPosicaoNPS: "Pesquisa oficial", percentualPromotores: 0.72, percentualDetratores: 0.12 } }]
);
closeTo(npsDetalhado.resultadoMensal, 60);
closeTo(npsDetalhado.percentualAtingidoMensal, 60 / 58);
assert.equal(npsDetalhado.situacao, "Atingido");

const regraClimaOrganizacional = {
  indicadorId: 12,
  tipoCalculo: "nota_pesquisa_anual",
  tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
  unidadeMedida: "pontos",
  metaAnualValor: 60,
  parametrosCalculo: {
    campoTipoPosicao: "tipoPosicaoClima",
    campoMetaReferencia: "metaReferenciaClima",
    campoNota: "notaClimaApurada",
    metaTipo: "fixa_anual",
    metaReferencia: 60,
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [{ nome: "tipoPosicaoClima", obrigatorio: true }]
};

const climaAcompanhamento = formulas.calcularIndicador(
  indicador(12, "Clima Organizacional"),
  regraClimaOrganizacional,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: 60 } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: 60 } }]
);
closeTo(climaAcompanhamento.resultadoMensal, 60);
closeTo(climaAcompanhamento.percentualAtingidoMensal, 1);
assert.equal(climaAcompanhamento.situacao, "Em acompanhamento");

const climaFechamentoAnual = formulas.calcularIndicador(
  indicador(12, "Clima Organizacional"),
  regraClimaOrganizacional,
  { ano: 2026, mes: 12, competencia: "2026-12", camposEntrada: { tipoPosicaoClima: "Fechamento anual", metaReferenciaClima: 60, notaClimaApurada: 61 } },
  [{ ano: 2026, mes: 12, competencia: "2026-12", camposEntrada: { tipoPosicaoClima: "Fechamento anual", metaReferenciaClima: 60, notaClimaApurada: 61 } }]
);
closeTo(climaFechamentoAnual.percentualAtingidoMensal, 61 / 60);
assert.equal(climaFechamentoAnual.situacao, "Atingido");

const regraCapacitacaoEmpregados = {
  indicadorId: 15,
  tipoCalculo: "cobertura_capacitacao",
  tipoConsolidacao: "ultima_posicao_acumulada",
  unidadeMedida: "percentual",
  metaAnualValor: 0.90,
  parametrosCalculo: {
    campoPublicoAlvo: "publicoAlvoElegivelCapacitacao",
    campoCapacitados: "empregadosCapacitadosCapacitacao",
    campoQuantidadeCursos: "quantidadeCursosMinimaCapacitacao",
    metaTipo: "curva_trimestral_quantidade_cursos",
    metaCobertura: 0.90,
    curvaTrimestralCursos: {
      "1TRI/2026": { metaCobertura: 0.90, quantidadeCursosMinima: 1, descricao: "90% do público-alvo com 01 curso concluído: Curso de Jogo Responsável" }
    },
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [
    { nome: "publicoAlvoElegivelCapacitacao", obrigatorio: true },
    { nome: "empregadosCapacitadosCapacitacao", obrigatorio: true }
  ]
};

const capacitacaoEmpregados = formulas.calcularIndicador(
  indicador(15, "Capacitação dos Empregados da CAIXA Loterias"),
  regraCapacitacaoEmpregados,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { publicoAlvoElegivelCapacitacao: 151, empregadosCapacitadosCapacitacao: 137, quantidadeCursosMinimaCapacitacao: 1 } },
  [{ ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { publicoAlvoElegivelCapacitacao: 151, empregadosCapacitadosCapacitacao: 137 } }]
);
closeTo(capacitacaoEmpregados.resultadoMensal, 137 / 151);
closeTo(capacitacaoEmpregados.percentualAtingidoMensal, 1);
closeTo(capacitacaoEmpregados.percentualAtingidoMatematico, (137 / 151) / 0.9);
assert.equal(capacitacaoEmpregados.quantidadeCursosMinimaCapacitacao, 1);
assert.equal(capacitacaoEmpregados.situacao, "Atingido");

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
  tipoCalculo: "melhorias_acumuladas",
  tipoConsolidacao: "quantidade_acumulada",
  unidadeMedida: "percentual",
  metaAnualValor: 0.25,
  parametrosCalculo: {
    campoValor: "melhoriasImplementadasMes",
    totalMelhoriasPlano2026: 22,
    metaPercentualAnualAprimoramento: 0.25,
    metaMinimaMelhoriasAno: 6,
    metaTipo: "curva_trimestral_acumulada",
    curvaTrimestralAcumulada: {
      "1TRI/2026": { metaPercentual: 0.0454, metaQuantidadeAcumulada: 1 },
      "2TRI/2026": { metaPercentual: 0.1364, metaQuantidadeAcumulada: 3 },
      "3TRI/2026": { metaPercentual: 0.1818, metaQuantidadeAcumulada: 4 },
      "4TRI/2026": { metaPercentual: 0.25, metaQuantidadeAcumulada: 6 }
    },
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [
    { nome: "melhoriasImplementadasMes", obrigatorio: true },
    { nome: "descricaoMelhoriasMes", obrigatorio: false },
    { nome: "evidenciaMelhoriasMes", obrigatorio: false }
  ]
};

const melhoriasLancamentos = [
  { ano: 2026, mes: 1, status: "Homologado", camposEntrada: { melhoriasImplementadasMes: 0 } },
  { ano: 2026, mes: 2, status: "Homologado", camposEntrada: { melhoriasImplementadasMes: 0 } },
  { ano: 2026, mes: 3, status: "Homologado", camposEntrada: { melhoriasImplementadasMes: 1 } }
];
const melhorias = formulas.calcularIndicador(
  indicador(4, "Aprimoramento da Experiência do Cliente"),
  regraAprimoramento,
  melhoriasLancamentos[2],
  melhoriasLancamentos
);
closeTo(melhorias.resultadoMensal, 0.0454);
closeTo(melhorias.resultadoAcumulado, 0.0454);
closeTo(melhorias.resultadoOficialAnual, 0.0454);
closeTo(melhorias.percentualAtingidoMensal, 1);
closeTo(melhorias.percentualAtingidoAnual, 1);
assert.equal(melhorias.resultadoMensalFormatado, "4,54%");
assert.equal(melhorias.percentualAtingidoMensalFormatado, "100%");
assert.equal(melhorias.melhoriasEntreguesAcumuladas, 1);
assert.equal(melhorias.melhoriasImplementadasAcumuladas, 1);
assert.equal(melhorias.percentualPlanoExecutadoCalculado > 0.0454, true);
assert.equal(melhorias.situacao, "Atingido");

const melhoriasAcimaDoPlano = formulas.calcularIndicador(
  indicador(4, "Aprimoramento da Experiência do Cliente"),
  regraAprimoramento,
  { ano: 2026, mes: 2, camposEntrada: { melhoriasImplementadasMes: 12 } },
  [
    { ano: 2026, mes: 1, camposEntrada: { melhoriasImplementadasMes: 11 } },
    { ano: 2026, mes: 2, camposEntrada: { melhoriasImplementadasMes: 12 } }
  ]
);
assert.equal(melhoriasAcimaDoPlano.erro, true);
assert.equal(melhoriasAcimaDoPlano.mensagem, "O total de melhorias entregues não pode ser maior que o total de melhorias previstas no plano.");

const regraGgr = {
  indicadorId: 5,
  tipoCalculo: "ggr_formula",
  tipoConsolidacao: "acumulado_por_soma_mensal",
  unidadeMedida: "moeda",
  metaAnualValor: 15600000000,
  parametrosCalculo: {
    campoArrecadacao: "arrecadacaoTotalMes",
    campoPremios: "premiosAPagarMes",
    metaTipo: "curva_acumulada_por_competencia",
    metasAcumuladasPorCompetencia: {
      "2026-01": 1056593039,
      "2026-02": 1997659493,
      "2026-03": 3070246140.78,
      "2026-12": 15600000000
    }
  },
  camposEntrada: [
    { nome: "arrecadacaoTotalMes", obrigatorio: true },
    { nome: "premiosAPagarMes", obrigatorio: true }
  ]
};

const ggr = formulas.calcularIndicador(
  indicador(5, "Gross Gaming Revenue (GGR)"),
  regraGgr,
  { ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { arrecadacaoTotalMes: 1900000000, premiosAPagarMes: 843406961.43 } },
  [{ ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { arrecadacaoTotalMes: 1900000000, premiosAPagarMes: 843406961.43 } }]
);
closeTo(ggr.resultadoMensal, 1056593038.57);
closeTo(ggr.ggrCalculadoMes, 1056593038.57);
closeTo(ggr.percentualAtingidoMensal, 1056593038.57 / 1056593039);
closeTo(ggr.resultadoOficialAnual, 1056593038.57);
closeTo(ggr.percentualAtingidoAnual, 1056593038.57 / 1056593039);
assert.equal(ggr.resultadoMensalFormatado, "R$\u00a01.056.593.038,57");
assert.equal(ggr.percentualAtingidoMensalFormatado, "100%");

const ggrSemPremios = formulas.calcularIndicador(
  indicador(5, "Gross Gaming Revenue (GGR)"),
  regraGgr,
  { ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { arrecadacaoTotalMes: 1900000000 } },
  [{ ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { arrecadacaoTotalMes: 1900000000 } }]
);
assert.equal(ggrSemPremios.statusCalculo, "aguardando_dados");
assert.equal(ggrSemPremios.mensagem, "Dados insuficientes para cálculo.");

const regraLucroLiquido = {
  indicadorId: 7,
  tipoCalculo: "valor_financeiro_acumulado",
  tipoConsolidacao: "ultima_posicao_acumulada",
  unidadeMedida: "moeda",
  metaAnualValor: 1209000000,
  parametrosCalculo: {
    valorAcumuladoCampo: "lucroLiquidoRecorrenteAcumulado",
    metaTipo: "curva_acumulada_por_competencia",
    metasAcumuladasPorCompetencia: {
      "2026-01": 89555555.56,
      "2026-02": 179111111.11,
      "2026-03": 268666666.67,
      "2026-04": null,
      "2026-12": 1209000000
    }
  },
  camposEntrada: [{ nome: "lucroLiquidoRecorrenteAcumulado", obrigatorio: true }]
};
const lucroJaneiro = formulas.calcularIndicador(
  indicador(7, "Lucro Liquido Recorrente"),
  regraLucroLiquido,
  { ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 119377680.03 } },
  [{ ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 119377680.03 } }]
);
closeTo(lucroJaneiro.percentualAtingidoMensal, 119377680.03 / 89555555.56);
assert.equal(lucroJaneiro.situacao, "Atingido");
const lucroMarco = formulas.calcularIndicador(
  indicador(7, "Lucro Liquido Recorrente"),
  regraLucroLiquido,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 336321887.69 } },
  [
    { ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 119377680.03 } },
    { ano: 2026, mes: 2, competencia: "2026-02", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 222011430.58 } },
    { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 336321887.69 } }
  ]
);
closeTo(lucroMarco.percentualAtingidoMensal, 336321887.69 / 268666666.67);
closeTo(lucroMarco.resultadoOficialAnual, 336321887.69);
closeTo(lucroMarco.metaAcumulada, 268666666.67);
const lucroAbrilSemCurva = formulas.calcularIndicador(
  indicador(7, "Lucro Liquido Recorrente"),
  regraLucroLiquido,
  { ano: 2026, mes: 4, competencia: "2026-04", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 400000000 } },
  [{ ano: 2026, mes: 4, competencia: "2026-04", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 400000000 } }]
);
assert.equal(lucroAbrilSemCurva.statusCalculo, "aguardando_dados");
assert.equal(lucroAbrilSemCurva.percentualAtingidoMensal, null);
assert.equal(lucroAbrilSemCurva.metaReferenciaMensagem, "Pendente de curva orçamentária");
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
    metaTipo: "curva_acumulada_por_competencia",
    metasAcumuladasPorCompetencia: {
      "2026-01": null,
      "2026-02": null,
      "2026-03": 0.1441,
      "2026-12": 0.1403
    },
    sentidoMeta: "quanto_menor_melhor"
  },
  camposEntrada: [
    { nome: "despesaPessoalMes", obrigatorio: false },
    { nome: "despesasAdministrativasMes", obrigatorio: false },
    { nome: "receitasLiquidasMes", obrigatorio: false },
    { nome: "ieoApuradoInformado", obrigatorio: false },
    { nome: "percentualAtingidoOficialInformado", obrigatorio: false }
  ]
};

const ieo = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.108, percentualAtingidoOficialInformado: 104.22 } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.108, percentualAtingidoOficialInformado: 104.22 } }]
);
closeTo(ieo.resultadoMensal, 0.108);
closeTo(ieo.resultadoOficialAnual, 0.108);
closeTo(ieo.percentualAtingidoMensal, 1.0422);
assert.equal(ieo.resultadoMensalFormatado, "10,8%");
assert.equal(ieo.resultadoOficialAnualFormatado, "10,8%");
assert.equal(ieo.situacao, "Atingido");

const ieoCalculado = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { despesaPessoalMes: 60, despesasAdministrativasMes: 48, receitasLiquidasMes: 1000 } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { despesaPessoalMes: 60, despesasAdministrativasMes: 48, receitasLiquidasMes: 1000 } }]
);
closeTo(ieoCalculado.resultadoMensal, 0.108);
closeTo(ieoCalculado.percentualAtingidoMensal, 1 + ((0.1441 - 0.108) / 0.1441));
assert.equal(ieoCalculado.situacao, "Atingido");

const ieoJaneiroSemMeta = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  {
    ano: 2026,
    mes: 1,
    competencia: "2026-01",
    camposEntrada: {
      despesaPessoalMes: 5700000,
      despesasAdministrativasMes: 8655120,
      receitasLiquidasMes: 223600000
    }
  },
  [{
    ano: 2026,
    mes: 1,
    competencia: "2026-01",
    camposEntrada: {
      despesaPessoalMes: 5700000,
      despesasAdministrativasMes: 8655120,
      receitasLiquidasMes: 223600000
    }
  }]
);
closeTo(ieoJaneiroSemMeta.resultadoMensal, 0.0642);
assert.equal(ieoJaneiroSemMeta.resultadoMensalFormatado, "6,42%");
assert.equal(ieoJaneiroSemMeta.percentualAtingidoMensal, null);
assert.equal(ieoJaneiroSemMeta.situacao, "Sem meta de referência");
assert.equal(ieoJaneiroSemMeta.metaPendente, true);

const ieoAbaixo = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.16 } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.16 } }]
);
assert.equal(ieoAbaixo.situacao, "Abaixo da meta");

const ieoAbaixoMetaBaixo = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.18 } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.18 } }]
);
assert.equal(ieoAbaixoMetaBaixo.situacao, "Abaixo da meta");

const ieoSemDenominador = formulas.calcularIndicador(
  indicador(6, "IEO Recorrente"),
  regraIeo,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { despesaPessoalMes: 60, despesasAdministrativasMes: 48 } },
  [{ ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { despesaPessoalMes: 60, despesasAdministrativasMes: 48 } }]
);
assert.equal(ieoSemDenominador.statusCalculo, "aguardando_dados");
assert.equal(ieoSemDenominador.mensagem, "Dados insuficientes para cálculo.");

const regraEcossistema = {
  indicadorId: 22,
  tipoCalculo: "crescimento_comparado_base_2025",
  tipoConsolidacao: "acumulado_periodo_equivalente",
  unidadeMedida: "percentual",
  metaAnualValor: 1.1,
  parametrosCalculo: {
    campoValor2026Mes: "arrecadacaoEcossistemaMes2026",
    campoValor2026Acumulado: "arrecadacaoEcossistemaAcumulada2026",
    campoBase2025PeriodoEquivalente: "arrecadacaoEcossistema2025PeriodoEquivalente",
    campoBase2025Acumulada: "arrecadacaoEcossistema2025Acumulada",
    campoNumerador: "arrecadacaoEcossistemaMes2026",
    campoNumerador2025: "arrecadacaoEcossistema2025PeriodoEquivalente",
    metaCrescimento: 0.1,
    metaIndice: 1.1
  },
  camposEntrada: [
    { nome: "arrecadacaoEcossistema2025PeriodoEquivalente", obrigatorio: true },
    { nome: "arrecadacaoEcossistemaMes2026", obrigatorio: true },
    { nome: "arrecadacaoEcossistemaAcumulada2026", obrigatorio: false },
    { nome: "descricaoComposicaoEcossistema", obrigatorio: false },
    { nome: "fonteEvidenciaEcossistema", obrigatorio: false },
    { nome: "observacaoArea", obrigatorio: false }
  ]
};

const lancamentosEcossistema = [
  { mes: 1, status: "Homologado", camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 10000000, arrecadacaoEcossistemaMes2026: 12000000 } },
  { mes: 2, status: "Homologado", camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 12000000, arrecadacaoEcossistemaMes2026: 13000000 } },
  { mes: 3, status: "Homologado", camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 13000000, arrecadacaoEcossistemaMes2026: 14000000 } }
];
const ecossistema = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistema,
  lancamentosEcossistema[2],
  lancamentosEcossistema
);
closeTo(ecossistema.baseReferencia2025Periodo, 35000000);
closeTo(ecossistema.realizado2026Periodo, 39000000);
closeTo(ecossistema.metaCalculada2026, 38500000);
closeTo(ecossistema.indiceEmRelacaoA2025, 39000000 / 35000000);
closeTo(ecossistema.resultadoMensal, 39000000 / 35000000);
closeTo(ecossistema.resultadoOficialAnual, 39000000 / 35000000);
closeTo(ecossistema.crescimentoVs2025, (39000000 / 35000000) - 1);
closeTo(ecossistema.percentualAtingidoMensal, 39000000 / 38500000);
assert.equal(ecossistema.situacao, "Atingido");
assert.equal(ecossistema.realizado2026PeriodoFormatado.replace(/\u00a0/g, " "), "R$ 39.000.000,00");

const ecossistemaSemReferencia = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistema,
  { mes: 1, camposEntrada: { arrecadacaoEcossistemaMes2026: 1000000 } },
  [{ mes: 1, camposEntrada: { arrecadacaoEcossistemaMes2026: 1000000 } }]
);
assert.equal(ecossistemaSemReferencia.erro, true);
assert.equal(ecossistemaSemReferencia.mensagem, "Preencha os campos obrigatórios: arrecadacaoEcossistema2025PeriodoEquivalente.");

const ecossistemaBaseZero = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistema,
  { mes: 1, camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 0, arrecadacaoEcossistemaMes2026: 1000000 } },
  [{ mes: 1, camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 0, arrecadacaoEcossistemaMes2026: 1000000 } }]
);
assert.equal(ecossistemaBaseZero.erro, true);
assert.equal(ecossistemaBaseZero.mensagem, "Dados insuficientes: informe a base de referência de 2025 para o período equivalente.");

const regraEcossistemaCenarios = {
  indicadorId: 22,
  tipoCalculo: "participacao_ecossistema_com_cenarios",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.10,
  parametrosCalculo: {
    campoCenario: "cenarioApuracaoEcossistema",
    campoNumerador: "arrecadacaoViaEcossistema",
    campoDenominador: "arrecadacaoTotal",
    cenarioOficialResumoExecutivo: "lotex_marketplace",
    cenarios: [
      { value: "lotex", label: "Lotex" },
      { value: "lotex_marketplace", label: "Lotex + Marketplace" }
    ],
    curvasCenarios: {
      lotex: {
        "1TRI": { referencia2025: 0.90, meta2026: 0.99 },
        "2TRI": { referencia2025: 0.78, meta2026: 0.86 },
        "3TRI": { referencia2025: 0.74, meta2026: 0.81 },
        "4TRI": { referencia2025: 0.65, meta2026: 0.72 }
      },
      lotex_marketplace: {
        "1TRI": { referencia2025: 3.42, meta2026: 3.76 },
        "2TRI": { referencia2025: 3.27, meta2026: 3.60 },
        "3TRI": { referencia2025: 3.32, meta2026: 3.65 },
        "4TRI": { referencia2025: 3.46, meta2026: 3.80 }
      }
    }
  },
  camposEntrada: [
    { nome: "cenarioApuracaoEcossistema", obrigatorio: true },
    { nome: "arrecadacaoViaEcossistema", obrigatorio: true },
    { nome: "arrecadacaoTotal", obrigatorio: true }
  ]
};

const ecossistemaLotex1Tri = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistemaCenarios,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { cenarioApuracaoEcossistema: "lotex", arrecadacaoViaEcossistema: 39800000, arrecadacaoTotal: 5966900000 } },
  []
);
closeTo(ecossistemaLotex1Tri.referencia2025Trimestre, 0.009);
closeTo(ecossistemaLotex1Tri.metaTrimestral2026, 0.0099);
closeTo(ecossistemaLotex1Tri.resultadoCalculado, 39800000 / 5966900000);
closeTo(ecossistemaLotex1Tri.percentualAtingidoMensal, (39800000 / 5966900000) / 0.0099);
assert.equal(ecossistemaLotex1Tri.cenarioApuracaoEcossistemaLabel, "Lotex");
assert.equal(ecossistemaLotex1Tri.situacao, "Abaixo da meta");

const ecossistemaMarketplace1Tri = formulas.calcularIndicador(
  indicador(22, "Arrecadação Gerada com o Ecossistema"),
  regraEcossistemaCenarios,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { cenarioApuracaoEcossistema: "lotex_marketplace", arrecadacaoViaEcossistema: 242300000, arrecadacaoTotal: 5966900000 } },
  []
);
closeTo(ecossistemaMarketplace1Tri.referencia2025Trimestre, 0.0342);
closeTo(ecossistemaMarketplace1Tri.metaTrimestral2026, 0.0376);
closeTo(ecossistemaMarketplace1Tri.resultadoCalculado, 242300000 / 5966900000);
closeTo(ecossistemaMarketplace1Tri.percentualAtingidoMensal, (242300000 / 5966900000) / 0.0376);
assert.equal(ecossistemaMarketplace1Tri.cenarioApuracaoEcossistemaLabel, "Lotex + Marketplace");
assert.equal(ecossistemaMarketplace1Tri.situacao, "Atingido");

const regraRedeLoterica = {
  indicadorId: 23,
  tipoCalculo: "crescimento_rede_loterica_base_2025",
  tipoConsolidacao: "acumulado_periodo_equivalente",
  unidadeMedida: "percentual",
  metaAnualValor: 1.02,
  parametrosCalculo: {
    campoValor2026Mes: "arrecadacaoRedeLotericaMes2026",
    campoValor2026Acumulado: "arrecadacaoRedeLotericaAcumulada2026",
    campoBase2025PeriodoEquivalente: "arrecadacaoRedeLoterica2025PeriodoEquivalente",
    campoBase2025Acumulada: "arrecadacaoRedeLoterica2025Acumulada",
    campoValor2026PeriodoAtual: "arrecadacaoRedeLoterica2026PeriodoAtual",
    campoNumerador: "arrecadacaoRedeLotericaMes2026",
    campoNumerador2025: "arrecadacaoRedeLoterica2025PeriodoEquivalente",
    metaCrescimento: 0.02,
    metaIndice: 1.02,
    mensagemBaseInsuficiente: "Dados insuficientes: informe a arrecadação da Rede Lotérica em 2025 para o período equivalente."
  },
  camposEntrada: [
    { nome: "arrecadacaoRedeLoterica2025PeriodoEquivalente", obrigatorio: true },
    { nome: "arrecadacaoRedeLotericaMes2026", obrigatorio: true },
    { nome: "arrecadacaoRedeLotericaAcumulada2026", obrigatorio: false },
    { nome: "arrecadacaoRedeLoterica2026PeriodoAtual", obrigatorio: false },
    { nome: "arrecadacaoTotalLoteriasPeriodo", obrigatorio: false },
    { nome: "fonteEvidenciaRedeLoterica", obrigatorio: false },
    { nome: "observacaoArea", obrigatorio: false }
  ]
};

const lancamentosRedeLoterica = [
  { mes: 1, status: "Homologado", camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 1000000000, arrecadacaoRedeLotericaMes2026: 1030000000 } },
  { mes: 2, status: "Homologado", camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 950000000, arrecadacaoRedeLotericaMes2026: 980000000 } },
  { mes: 3, status: "Homologado", camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 1050000000, arrecadacaoRedeLotericaMes2026: 1080000000 } }
];
const redeLoterica = formulas.calcularIndicador(
  indicador(23, "Participação da Rede Lotérica nos Negócios"),
  regraRedeLoterica,
  lancamentosRedeLoterica[2],
  lancamentosRedeLoterica
);
closeTo(redeLoterica.baseReferencia2025Periodo, 3000000000);
closeTo(redeLoterica.realizado2026Periodo, 3090000000);
closeTo(redeLoterica.metaCalculada2026, 3060000000);
closeTo(redeLoterica.indiceEmRelacaoA2025, 1.03);
closeTo(redeLoterica.crescimentoVs2025, 0.03);
closeTo(redeLoterica.percentualAtingidoMensal, 3090000000 / 3060000000);
assert.equal(redeLoterica.situacao, "Atingido");

const redeLotericaBaseZero = formulas.calcularIndicador(
  indicador(23, "Participação da Rede Lotérica nos Negócios"),
  regraRedeLoterica,
  { mes: 1, camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 0, arrecadacaoRedeLotericaMes2026: 1000000 } },
  [{ mes: 1, camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 0, arrecadacaoRedeLotericaMes2026: 1000000 } }]
);
assert.equal(redeLotericaBaseZero.erro, true);
assert.equal(redeLotericaBaseZero.mensagem, "Dados insuficientes: informe a arrecadação da Rede Lotérica em 2025 para o período equivalente.");

const regraRedeLotericaIncremento = {
  indicadorId: 23,
  tipoCalculo: "incremento_rede_loterica_base_2025",
  tipoConsolidacao: "ultima_posicao",
  unidadeMedida: "percentual",
  metaAnualValor: 0.02,
  parametrosCalculo: {
    campoValor2026: "arrecadacaoRedeLoterica2026",
    campoBase2025: "arrecadacaoRedeLoterica2025",
    metaTipo: "curva_trimestral_incremento",
    curvaIncrementoTrimestral: {
      "1TRI": { metaIncremento: 0.50 },
      "2TRI": { metaIncremento: 1.00 },
      "3TRI": { metaIncremento: 1.50 },
      "4TRI": { metaIncremento: 2.00 }
    },
    mensagemBaseInsuficiente: "Dados insuficientes: informe a arrecadação da Rede Lotérica em 2025 para o período equivalente."
  },
  camposEntrada: [
    { nome: "arrecadacaoRedeLoterica2025", obrigatorio: true },
    { nome: "arrecadacaoRedeLoterica2026", obrigatorio: true },
    { nome: "metaTrimestral", obrigatorio: false }
  ]
};

const redeLotericaIncremento1Tri = formulas.calcularIndicador(
  indicador(23, "Participação da Rede Lotérica nos Negócios da CAIXA Loterias"),
  regraRedeLotericaIncremento,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025: 3000000000, arrecadacaoRedeLoterica2026: 3017079000 } },
  []
);
closeTo(redeLotericaIncremento1Tri.indiceRedeLoterica, 1.005693);
closeTo(redeLotericaIncremento1Tri.incrementoRedeLoterica, 0.005693);
closeTo(redeLotericaIncremento1Tri.resultadoMensal, 0.005693);
closeTo(redeLotericaIncremento1Tri.metaTrimestral, 0.005);
closeTo(redeLotericaIncremento1Tri.percentualAtingidoMensal, 1.1386);
assert.equal(redeLotericaIncremento1Tri.situacao, "Atingido");

const redeLotericaIncrementoAbaixo = formulas.calcularIndicador(
  indicador(23, "Participação da Rede Lotérica nos Negócios da CAIXA Loterias"),
  regraRedeLotericaIncremento,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025: 3000000000, arrecadacaoRedeLoterica2026: 3012000000 } },
  []
);
closeTo(redeLotericaIncrementoAbaixo.incrementoRedeLoterica, 0.004);
closeTo(redeLotericaIncrementoAbaixo.percentualAtingidoMensal, 0.8);
assert.equal(redeLotericaIncrementoAbaixo.situacao, "Abaixo da meta");

const redeLotericaIncrementoAbaixoMetaBaixo = formulas.calcularIndicador(
  indicador(23, "Participação da Rede Lotérica nos Negócios da CAIXA Loterias"),
  regraRedeLotericaIncremento,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025: 3000000000, arrecadacaoRedeLoterica2026: 3006000000 } },
  []
);
closeTo(redeLotericaIncrementoAbaixoMetaBaixo.incrementoRedeLoterica, 0.002);
closeTo(redeLotericaIncrementoAbaixoMetaBaixo.percentualAtingidoMensal, 0.4);
assert.equal(redeLotericaIncrementoAbaixoMetaBaixo.situacao, "Abaixo da meta");

const regraRepasseSocial = {
  indicadorId: 17,
  tipoCalculo: "valor_financeiro_acumulado",
  tipoConsolidacao: "ultima_posicao_acumulada",
  unidadeMedida: "moeda",
  metaAnualValor: 10400000000,
  parametrosCalculo: {
    valorAcumuladoCampo: "repasseSocialAcumuladoCompetencia",
    metaTipo: "curva_acumulada_por_competencia",
    metasAcumuladasPorCompetencia: {
      "2026-01": 737118539.30,
      "2026-02": 1394613495.00,
      "2026-03": 2142991572.00,
      "2026-12": 10452751135.00
    },
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [{ nome: "repasseSocialAcumuladoCompetencia", obrigatorio: true }]
};
const repasseMarco = formulas.calcularIndicador(
  indicador(17, "Repasse Social", "moeda"),
  regraRepasseSocial,
  { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { repasseSocialAcumuladoCompetencia: 2253033146.00 } },
  [
    { ano: 2026, mes: 1, competencia: "2026-01", camposEntrada: { repasseSocialAcumuladoCompetencia: 769496203.10 } },
    { ano: 2026, mes: 2, competencia: "2026-02", camposEntrada: { repasseSocialAcumuladoCompetencia: 1506381391.00 } },
    { ano: 2026, mes: 3, competencia: "2026-03", camposEntrada: { repasseSocialAcumuladoCompetencia: 2253033146.00 } }
  ]
);
closeTo(repasseMarco.resultadoMensal, 2253033146.00);
closeTo(repasseMarco.resultadoOficialAnual, 2253033146.00);
closeTo(repasseMarco.percentualAtingidoMensal, 2253033146.00 / 2142991572.00);
assert.equal(repasseMarco.situacao, "Atingido");

const regraCapacidadeTic = {
  indicadorId: 11,
  tipoCalculo: "marco_projeto_percentual",
  tipoConsolidacao: "ultima_posicao_trimestral",
  unidadeMedida: "percentual",
  metaAnualValor: 1,
  parametrosCalculo: {
    campoStatus: "marcoAlcancadoTIC",
    campoPercentual: "percentualRealizadoTIC",
    metaTipo: "curva_trimestral_percentual",
    curvaTrimestralPercentual: {
      "1TRI/2026": { metaPercentual: 0.35, marcoEsperado: "Realização de Consulta Pública de Informações - RFI" },
      "2TRI/2026": { metaPercentual: 0.70, marcoEsperado: "Realização de Consulta Pública de Propostas - RFP" },
      "3TRI/2026": { metaPercentual: 0.85, marcoEsperado: "Iniciação da Fase Seleção" },
      "4TRI/2026": { metaPercentual: 1.00, marcoEsperado: "Contrato assinado com fornecedor" }
    },
    marcosCapacidadeTIC: [
      { label: "Não iniciado", percentual: 0 },
      { label: "Consulta Pública de Informações - RFI realizada", percentual: 0.35 },
      { label: "Consulta Pública de Propostas - RFP realizada", percentual: 0.70 },
      { label: "Fase de Seleção iniciada", percentual: 0.85 },
      { label: "Contrato assinado com fornecedor", percentual: 1.00 }
    ]
  },
  camposEntrada: [{ nome: "marcoAlcancadoTIC", obrigatorio: true }]
};
const capacidadeTic = formulas.calcularIndicador(
  indicador(11, "Ampliar Capacidade de Desenvolvimento de Soluções de TIC"),
  regraCapacidadeTic,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { marcoAlcancadoTIC: "Consulta Pública de Informações - RFI realizada" } },
  []
);
closeTo(capacidadeTic.resultadoMensal, 0.35);
closeTo(capacidadeTic.percentualAtingidoMensal, 1);
assert.equal(capacidadeTic.marcoEsperadoTrimestre, "Realização de Consulta Pública de Informações - RFI");
assert.equal(capacidadeTic.situacao, "Atingido");

const regraPlataformaJogos = {
  indicadorId: 10,
  tipoCalculo: "projeto_marco_entrega",
  tipoConsolidacao: "ultima_posicao_trimestral",
  unidadeMedida: "marco",
  metaAnualValor: null,
  parametrosCalculo: {
    campoMarco: "marcoAtualPlataformaJogos",
    campoStatus: "statusProjetoPlataformaJogos",
    metaTipo: "marco_anual",
    sentidoMeta: "marco_concluido",
    metaAnualMarco: "Piloto/MVP da Plataforma de Jogos",
    marcoConcluido: "Piloto/MVP concluído",
    statusConcluido: "Piloto/MVP concluído"
  },
  camposEntrada: [
    { nome: "marcoAtualPlataformaJogos", obrigatorio: true },
    { nome: "statusProjetoPlataformaJogos", obrigatorio: true }
  ]
};
const plataformaJogos1Tri = formulas.calcularIndicador(
  indicador(10, "Share da Plataforma de Jogos"),
  regraPlataformaJogos,
  {
    ano: 2026,
    mes: 3,
    trimestre: "1TRI/2026",
    camposEntrada: {
      marcoAtualPlataformaJogos: "Sprints iniciais executadas",
      statusProjetoPlataformaJogos: "Em andamento",
      descricaoAndamentoPlataformaJogos: "Projeto em andamento."
    }
  },
  []
);
assert.equal(plataformaJogos1Tri.resultadoMensal, null);
assert.equal(plataformaJogos1Tri.percentualAtingidoMensal, null);
assert.equal(plataformaJogos1Tri.desempenhoNaoAplicavel, true);
assert.equal(plataformaJogos1Tri.situacao, "Em andamento");

const plataformaJogosConcluida = formulas.calcularIndicador(
  indicador(10, "Share da Plataforma de Jogos"),
  regraPlataformaJogos,
  {
    ano: 2026,
    mes: 12,
    trimestre: "4TRI/2026",
    camposEntrada: {
      marcoAtualPlataformaJogos: "Piloto/MVP concluído",
      statusProjetoPlataformaJogos: "Piloto/MVP concluído"
    }
  },
  []
);
assert.equal(plataformaJogosConcluida.resultadoMensal, 1);
assert.equal(plataformaJogosConcluida.percentualAtingidoMensal, null);
assert.equal(plataformaJogosConcluida.situacao, "Atingido");

const regraPrincipiosJogoResponsavel = {
  indicadorId: 18,
  tipoCalculo: "plano_acao_por_elementos",
  tipoConsolidacao: "elementos_acumulados",
  unidadeMedida: "quantidade",
  metaAnualValor: 10,
  parametrosCalculo: {
    campoElemento: "elementoRGF",
    campoStatus: "statusAcao",
    metaTipo: "curva_trimestral_acumulada",
    curvaTrimestralAcumulada: {
      "1TRI/2026": { metaElementosAcumulados: 1 },
      "2TRI/2026": { metaElementosAcumulados: 2 },
      "3TRI/2026": { metaElementosAcumulados: 5 },
      "4TRI/2026": { metaElementosAcumulados: 10 }
    },
    statusQueContam: ["Concluída", "Homologada"]
  },
  camposEntrada: [
    { nome: "elementoRGF", obrigatorio: true },
    { nome: "acaoExecutada", obrigatorio: true },
    { nome: "statusAcao", obrigatorio: true }
  ]
};
const principiosJogoResponsavel = formulas.calcularIndicador(
  indicador(18, "Princípios de Jogo Responsável"),
  regraPrincipiosJogoResponsavel,
  { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Envolvimento das partes interessadas", acaoExecutada: "Instituição do Fórum de Jogo Responsável", statusAcao: "Concluída" } },
  [
    { ano: 2026, mes: 1, trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Pesquisa", acaoExecutada: "Ação em elaboração", statusAcao: "Em andamento" } },
    { ano: 2026, mes: 2, trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Envolvimento das partes interessadas", acaoExecutada: "Preparação do fórum", statusAcao: "Concluída" } },
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Envolvimento das partes interessadas", acaoExecutada: "Instituição do Fórum de Jogo Responsável", statusAcao: "Concluída" } }
  ]
);
assert.equal(principiosJogoResponsavel.resultadoMensal, 1);
assert.equal(principiosJogoResponsavel.elementosAtendidosAcumulados, 1);
assert.deepEqual(principiosJogoResponsavel.elementosAtendidos, ["Envolvimento das partes interessadas"]);
closeTo(principiosJogoResponsavel.percentualAtingidoMensal, 1);
assert.equal(principiosJogoResponsavel.situacao, "Atingido");

const regraApoioSocioambiental = {
  indicadorId: 16,
  tipoCalculo: "iniciativas_apoiadas",
  tipoConsolidacao: "iniciativas_acumuladas",
  unidadeMedida: "quantidade",
  metaAnualValor: 2,
  parametrosCalculo: {
    campoNome: "nomeIniciativaSocioambiental",
    campoStatus: "statusIniciativaSocioambiental",
    statusQueConta: "Apoiada/realizada",
    metaTipo: "curva_trimestral_acumulada",
    curvaTrimestralAcumulada: {
      "1TRI/2026": { metaPercentual: 0, metaQuantidadeAcumulada: 0 },
      "2TRI/2026": { metaPercentual: 0.5, metaQuantidadeAcumulada: 1 },
      "3TRI/2026": { metaPercentual: 0.5, metaQuantidadeAcumulada: 1 },
      "4TRI/2026": { metaPercentual: 1, metaQuantidadeAcumulada: 2 }
    },
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [
    { nome: "nomeIniciativaSocioambiental", obrigatorio: true },
    { nome: "statusIniciativaSocioambiental", obrigatorio: true }
  ]
};
const apoioSocioambiental1Tri = formulas.calcularIndicador(
  indicador(16, "Apoio ao Desenvolvimento Socioambiental"),
  regraApoioSocioambiental,
  {
    ano: 2026,
    mes: 3,
    trimestre: "1TRI/2026",
    camposEntrada: {
      nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção",
      statusIniciativaSocioambiental: "Em prospecção",
      descricaoAndamentoSocioambiental: "Projetos em fase de prospecção e estruturação."
    }
  },
  [
    { ano: 2026, mes: 1, trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em prospecção" } },
    { ano: 2026, mes: 2, trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em estruturação" } },
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em prospecção" } }
  ]
);
assert.equal(apoioSocioambiental1Tri.resultadoMensal, 0);
assert.equal(apoioSocioambiental1Tri.iniciativasApoiadasAcumuladas, 0);
assert.equal(apoioSocioambiental1Tri.percentualAtingidoMensal, null);
assert.equal(apoioSocioambiental1Tri.situacao, "Em prospecção/estruturação");
assert.equal(apoioSocioambiental1Tri.statusCalculo, "sem_meta_periodo");

const apoioSocioambiental2Tri = formulas.calcularIndicador(
  indicador(16, "Apoio ao Desenvolvimento Socioambiental"),
  regraApoioSocioambiental,
  {
    ano: 2026,
    mes: 6,
    trimestre: "2TRI/2026",
    camposEntrada: {
      nomeIniciativaSocioambiental: "1ª iniciativa socioambiental apoiada",
      statusIniciativaSocioambiental: "Apoiada/realizada"
    }
  },
  [
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em prospecção" } },
    { ano: 2026, mes: 6, trimestre: "2TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "1ª iniciativa socioambiental apoiada", statusIniciativaSocioambiental: "Apoiada/realizada" } }
  ]
);
assert.equal(apoioSocioambiental2Tri.resultadoMensal, 1);
assert.equal(apoioSocioambiental2Tri.iniciativasApoiadasAcumuladas, 1);
closeTo(apoioSocioambiental2Tri.percentualAtingidoMensal, 1);
assert.equal(apoioSocioambiental2Tri.situacao, "Atingido");

const regraIncentivoSocioambiental = {
  indicadorId: 19,
  tipoCalculo: "investimento_socioambiental",
  tipoConsolidacao: "valor_acumulado",
  unidadeMedida: "moeda",
  metaAnualValor: 4307900,
  parametrosCalculo: {
    campoStatus: "statusProjetoIncentivoSocioambiental",
    campoValorMes: "valorInvestidoMes",
    campoValorAcumulado: "valorInvestidoAcumuladoCompetencia",
    statusQueConta: "Investimento realizado",
    metaTipo: "curva_trimestral_acumulada",
    curvaTrimestralAcumulada: {
      "1TRI/2026": { metaPercentualLucro: 0, metaValorAcumulado: 0 },
      "2TRI/2026": { metaPercentualLucro: 0.0005, metaValorAcumulado: 652700 }
    },
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [
    { nome: "nomeProjetoIncentivoSocioambiental", obrigatorio: true },
    { nome: "statusProjetoIncentivoSocioambiental", obrigatorio: true }
  ]
};
const incentivo1Tri = formulas.calcularIndicador(
  indicador(19, "Incentivo Socioambiental"),
  regraIncentivoSocioambiental,
  {
    ano: 2026,
    mes: 3,
    trimestre: "1TRI/2026",
    camposEntrada: {
      nomeProjetoIncentivoSocioambiental: "Projeto de impacto socioambiental em prospecção",
      statusProjetoIncentivoSocioambiental: "Em prospecção",
      valorInvestidoMes: 0
    }
  },
  [
    { ano: 2026, mes: 1, trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em prospecção", valorInvestidoMes: 0 } },
    { ano: 2026, mes: 2, trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em estruturação", valorInvestidoMes: 0 } },
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em prospecção", valorInvestidoMes: 0 } }
  ]
);
assert.equal(incentivo1Tri.resultadoMensal, 0);
assert.equal(incentivo1Tri.percentualAtingidoMensal, null);
assert.equal(incentivo1Tri.statusCalculo, "sem_meta_periodo");
assert.equal(incentivo1Tri.situacao, "Em prospecção/estruturação");

const incentivo2Tri = formulas.calcularIndicador(
  indicador(19, "Incentivo Socioambiental"),
  regraIncentivoSocioambiental,
  {
    ano: 2026,
    mes: 6,
    trimestre: "2TRI/2026",
    camposEntrada: {
      nomeProjetoIncentivoSocioambiental: "Projeto de impacto socioambiental apoiado",
      statusProjetoIncentivoSocioambiental: "Investimento realizado",
      valorInvestidoMes: 652700
    }
  },
  [
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em prospecção", valorInvestidoMes: 0 } },
    { ano: 2026, mes: 6, trimestre: "2TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto de impacto socioambiental apoiado", statusProjetoIncentivoSocioambiental: "Investimento realizado", valorInvestidoMes: 652700 } }
  ]
);
assert.equal(incentivo2Tri.resultadoMensal, 652700);
closeTo(incentivo2Tri.percentualAtingidoMensal, 1);
assert.equal(incentivo2Tri.situacao, "Atingido");

const regraVisibilidadeRepasses = {
  indicadorId: 20,
  tipoCalculo: "execucao_acoes_propostas",
  tipoConsolidacao: "acoes_realizadas_acumuladas",
  unidadeMedida: "percentual",
  metaAnualValor: 1,
  parametrosCalculo: {
    campoAcao: "acaoPropostaVisibilidade",
    campoStatus: "statusAcaoVisibilidade",
    statusQueConta: "Publicada/realizada",
    totalAcoesPropostas: 2,
    metaTipo: "curva_trimestral_acumulada",
    curvaTrimestralAcumulada: {
      "1TRI/2026": { metaPercentual: 0, metaAcoesRealizadasAcumuladas: 0 },
      "2TRI/2026": { metaPercentual: 0.5, metaAcoesRealizadasAcumuladas: 1 },
      "3TRI/2026": { metaPercentual: 0.5, metaAcoesRealizadasAcumuladas: 1 },
      "4TRI/2026": { metaPercentual: 1, metaAcoesRealizadasAcumuladas: 2 }
    },
    acoesPropostasVisibilidade: [
      { id: "relatorio_sorte_em_numeros_2025", nome: "Publicar relatório institucional A Sorte em Números 2025" },
      { id: "campanha_repasses_sociais", nome: "Realizar campanha publicitária exclusiva" }
    ],
    sentidoMeta: "quanto_maior_melhor"
  },
  camposEntrada: [
    { nome: "acaoPropostaVisibilidade", obrigatorio: true },
    { nome: "statusAcaoVisibilidade", obrigatorio: true }
  ]
};
const visibilidade1Tri = formulas.calcularIndicador(
  indicador(20, "Visibilidade dos Repasses Sociais das Loterias CAIXA"),
  regraVisibilidadeRepasses,
  {
    ano: 2026,
    mes: 3,
    trimestre: "1TRI/2026",
    camposEntrada: {
      acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025",
      statusAcaoVisibilidade: "Em homologação",
      etapaAtualVisibilidade: "Diagramação e layout concluídos; relatório em homologação prévia à publicação"
    }
  },
  [
    { ano: 2026, mes: 1, trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em elaboração" } },
    { ano: 2026, mes: 2, trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em elaboração" } },
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em homologação" } }
  ]
);
assert.equal(visibilidade1Tri.resultadoMensal, 0);
assert.equal(visibilidade1Tri.acoesRealizadasAcumuladas, 0);
assert.equal(visibilidade1Tri.percentualAtingidoMensal, null);
assert.equal(visibilidade1Tri.statusCalculo, "sem_meta_periodo");
assert.equal(visibilidade1Tri.situacao, "Em elaboração/homologação");

const visibilidade2Tri = formulas.calcularIndicador(
  indicador(20, "Visibilidade dos Repasses Sociais das Loterias CAIXA"),
  regraVisibilidadeRepasses,
  {
    ano: 2026,
    mes: 6,
    trimestre: "2TRI/2026",
    camposEntrada: {
      acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025",
      statusAcaoVisibilidade: "Publicada/realizada",
      dataConclusaoVisibilidade: "2026-06-30"
    }
  },
  [
    { ano: 2026, mes: 3, trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em homologação" } },
    { ano: 2026, mes: 5, trimestre: "2TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Publicada/realizada" } },
    { ano: 2026, mes: 6, trimestre: "2TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Publicada/realizada" } }
  ]
);
closeTo(visibilidade2Tri.resultadoMensal, 0.5);
assert.equal(visibilidade2Tri.acoesRealizadasAcumuladas, 1);
closeTo(visibilidade2Tri.percentualAtingidoMensal, 1);
assert.equal(visibilidade2Tri.situacao, "Atingido");

const regraJogoResponsavelCapacitacao = {
  indicadorId: 21,
  tipoCalculo: "cobertura_capacitacao_jogo_responsavel",
  tipoConsolidacao: "ultima_posicao_acumulada",
  unidadeMedida: "percentual",
  metaAnualValor: 0.90,
  parametrosCalculo: {
    campoPublicoAlvo: "publicoAlvoElegivelJR",
    campoCapacitados: "empregadosCapacitadosJR",
    campoQuantidadeMinima: "quantidadeMinimaIniciativasJR",
    metaTipo: "cobertura_com_quantidade_minima_de_iniciativas",
    metaCobertura: 0.90,
    curvaJogoResponsavel2026: {
      "1TRI/2026": {
        metaCobertura: 0.90,
        quantidadeMinimaIniciativas: 1,
        descricao: "90% do público-alvo com pelo menos 1 ação de disseminação concluída"
      },
      "2TRI/2026": {
        metaCobertura: 0.90,
        quantidadeMinimaIniciativas: 2,
        descricao: "90% do público-alvo com pelo menos 2 iniciativas concluídas"
      }
    }
  },
  camposEntrada: [
    { nome: "publicoAlvoElegivelJR", obrigatorio: true },
    { nome: "empregadosCapacitadosJR", obrigatorio: true }
  ]
};
const jogoResponsavel1Tri = formulas.calcularIndicador(
  indicador(21, "Jogo Responsável 2026 (Capacitação e Disseminação)"),
  regraJogoResponsavelCapacitacao,
  {
    ano: 2026,
    mes: 3,
    trimestre: "1TRI/2026",
    camposEntrada: {
      publicoAlvoElegivelJR: 151,
      empregadosCapacitadosJR: 137,
      quantidadeMinimaIniciativasJR: 1,
      iniciativasConsideradasJR: "Ação de disseminação de Jogo Responsável na Universidade CAIXA"
    }
  },
  []
);
closeTo(jogoResponsavel1Tri.resultadoMensal, 137 / 151);
assert.equal(jogoResponsavel1Tri.percentualAtingidoMensal, 1);
assert.equal(jogoResponsavel1Tri.quantidadeMinimaIniciativasJR, 1);
assert.equal(jogoResponsavel1Tri.situacao, "Atingido");

const regras = loadBootstrapData().regrasIndicadores;
const amostras = {
  1: { baseClientesAtivosCompetencia: 1000, clientesUnicosComOfertaPersonalizadaCompetencia: 100 },
  2: { tipoPosicaoNPS: "Fechamento anual", metaReferenciaCompetenciaNPS: 58, npsApurado: 58, dataBasePesquisaNPS: "2026-12-31", fontePesquisaNPS: "Relatorio oficial" },
  3: { qmaatu: 2480052, qmaant: 1424272, dataBaseApuracao: "2026-01-31" },
  4: { melhoriasImplementadasMes: 6, descricaoMelhoriasMes: "Melhorias executadas", evidenciaMelhoriasMes: "Informe" },
  5: { arrecadacaoTotalMes: 1900000000, premiosAPagarMes: 843406961.43 },
  6: { ieoApuradoInformado: 0.0642 },
  7: { lucroLiquidoRecorrenteAcumulado: 1209000000 },
  8: { arrecadacaoCanaisEletronicosMes: 15, arrecadacaoTotalProdutosLoteriasMes: 100 },
  9: { arrecadacaoPixMes: 411428638.26, arrecadacaoTotalCanaisEletronicosMes: 600000000 },
  10: { marcoAtualPlataformaJogos: "Piloto/MVP concluído", statusProjetoPlataformaJogos: "Piloto/MVP concluído", descricaoAndamentoPlataformaJogos: "MVP concluído", evidenciaPlataformaJogos: "Termo" },
  11: { marcoAlcancadoTIC: "Contrato assinado com fornecedor", percentualRealizadoTIC: 1, descricaoAndamentoTIC: "Contrato assinado", evidenciaTIC: "Termo" },
  12: { tipoPosicaoClima: "Fechamento anual", metaReferenciaClima: 60, notaClimaApurada: 60, dataBasePesquisaClima: "2026-12-01", fonteEvidenciaClima: "Relatorio oficial" },
  13: { mulheresGestorasMes: 425, totalGestoresMes: 1000, dataBaseApuracao: "2026-12-31" },
  14: { gestoresEnquadradosMes: 350, totalGestoresMes: 1000, dataBaseApuracao: "2026-12-31" },
  15: { publicoAlvoElegivelCapacitacao: 1000, empregadosCapacitadosCapacitacao: 900, quantidadeCursosMinimaCapacitacao: 5, cursosConsideradosCapacitacao: "Trilha completa" },
  16: { nomeIniciativaSocioambiental: "1ª iniciativa socioambiental apoiada", tipoIniciativaSocioambiental: "Parceria", statusIniciativaSocioambiental: "Apoiada/realizada", dataApoioIniciativa: "2026-12-01", descricaoAndamentoSocioambiental: "Apoiada", evidenciaIniciativaSocioambiental: "Documento", observacaoArea: "Validado" },
  17: { repasseSocialAcumuladoCompetencia: 10452751135, dataBaseApuracao: "2026-12-31" },
  18: { elementoRGF: "Pesquisa", acaoExecutada: "Acao", descricaoAcao: "Descricao", statusAcao: "Concluída", dataConclusao: "2026-12-01", evidenciaAcao: "Evidencia" },
  19: { nomeProjetoIncentivoSocioambiental: "Projeto apoiado", statusProjetoIncentivoSocioambiental: "Investimento realizado", valorInvestidoAcumuladoCompetencia: 4307900, evidenciaIncentivoSocioambiental: "Documento" },
  20: { acaoPropostaVisibilidade: "campanha_repasses_sociais", statusAcaoVisibilidade: "Publicada/realizada" },
  21: { publicoAlvoElegivelJR: 1000, empregadosCapacitadosJR: 900, quantidadeMinimaIniciativasJR: 2, iniciativasConsideradasJR: "Duas iniciativas concluídas" },
  22: { arrecadacaoEcossistema2025PeriodoEquivalente: 10000000, arrecadacaoEcossistemaMes2026: 12000000 },
  23: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 1000000000, arrecadacaoRedeLotericaMes2026: 1030000000 }
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
  if (regra.indicadorId === 10) {
    assert.equal(resultado.percentualAtingidoMensal, null, "Regra 10 não deve calcular percentual mensal em 2026");
    assert.equal(resultado.situacao, "Atingido");
  } else {
    assert.notEqual(resultado.percentualAtingidoMensal, null, `Regra ${regra.indicadorId} sem percentual mensal`);
  }
}

console.log("Testes de fórmulas OK");


