const assert = require("node:assert/strict");
const formulas = require("../assets/js/formulas.js");

globalThis.IndicatorFormulas = formulas;
require("../assets/js/quarterly.js");

const { consolidarTrimestre, obterTrimestrePorMes, obterMesesDoTrimestre } = globalThis.QuarterlyConsolidation;
const indicator = { id: 5, indicador: "GGR", unidadeMedida: "moeda" };
const rule = {
  indicadorId: 5,
  tipoCalculo: "valor_financeiro_acumulado",
  tipoConsolidacao: "soma_acumulada_no_ano",
  unidadeMedida: "moeda",
  metaAnualValor: 1200,
  parametrosCalculo: {
    campoValor: "valorRealizadoMes",
    metaMensalFixa: 100
  },
  camposEntrada: [{ nome: "valorRealizadoMes", obrigatorio: true }]
};
const launches = [
  { id: 1, indicadorId: 5, ano: 2026, mes: 1, nomeMes: "Janeiro", status: "Homologado", camposEntrada: { valorRealizadoMes: 90 } },
  { id: 2, indicadorId: 5, ano: 2026, mes: 2, nomeMes: "Fevereiro", status: "Homologado", camposEntrada: { valorRealizadoMes: 110 } },
  { id: 3, indicadorId: 5, ano: 2026, mes: 3, nomeMes: "Março", status: "Em preenchimento", camposEntrada: { valorRealizadoMes: 100 } },
  { id: 4, indicadorId: 5, ano: 2026, mes: 4, nomeMes: "Abril", status: "Cancelado", camposEntrada: { valorRealizadoMes: 500 } }
];

assert.equal(obterTrimestrePorMes("março"), "1TRI/2026");
assert.equal(obterTrimestrePorMes(8), "3TRI/2026");
assert.deepEqual(obterMesesDoTrimestre("4TRI/2026"), [10, 11, 12]);

const partial = consolidarTrimestre(indicator, rule, launches, "1TRI/2026");
assert.equal(partial.statusTrimestre, "Parcial");
assert.equal(partial.mesesHomologados, 2);
assert.equal(partial.resultadoTrimestral, 200);
assert.equal(partial.metaTrimestral, 300);
assert.equal(partial.desempenhoTrimestral, 200 / 300);
assert.match(partial.mensagem, /2 de 3 meses homologados/);

const closed = consolidarTrimestre(
  indicator,
  rule,
  launches.map((item) => item.mes === 3 ? { ...item, status: "Homologado" } : item),
  "1TRI/2026"
);
assert.equal(closed.statusTrimestre, "Fechado");
assert.equal(closed.mesesHomologados, 3);
assert.equal(closed.resultadoTrimestral, 300);
assert.equal(closed.desempenhoTrimestral, 1);

const empty = consolidarTrimestre(indicator, rule, launches, "2TRI/2026");
assert.equal(empty.statusTrimestre, "Sem dados");
assert.equal(empty.resultadoTrimestral, null);
assert.equal(empty.mesesHomologados, 0);

const returned = consolidarTrimestre(
  indicator,
  rule,
  launches.map((item) => item.mes === 3 ? { ...item, status: "Devolvido para ajuste" } : item),
  "1TRI/2026"
);
assert.equal(returned.possuiMesDevolvido, true);
assert.match(returned.mensagem, /mês devolvido para ajuste/);

const npsQuarter = consolidarTrimestre(
  { id: 2, indicador: "Índice de Satisfação de Clientes - NPS", unidadeMedida: "pontos" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { tipoPosicaoNPS: "Acompanhamento" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { tipoPosicaoNPS: "Acompanhamento" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { tipoPosicaoNPS: "Baseline", metaReferenciaCompetenciaNPS: 55, npsApurado: 55, dataBasePesquisaNPS: "2026-03-31" } }
  ],
  "1TRI/2026"
);
assert.equal(npsQuarter.statusTrimestre, "Fechado");
assert.equal(npsQuarter.mesesHomologados, 3);
assert.equal(npsQuarter.metaTrimestral, 55);
assert.equal(npsQuarter.resultadoTrimestral, 55);
assert.equal(npsQuarter.desempenhoTrimestral, 1);
assert.equal(npsQuarter.situacaoTrimestral, "Em acompanhamento");

const climaQuarter = consolidarTrimestre(
  { id: 12, indicador: "Clima Organizacional", unidadeMedida: "pontos" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { tipoPosicaoClima: "Acompanhamento", metaReferenciaClima: 60, notaClimaApurada: 60 } }
  ],
  "1TRI/2026"
);
assert.equal(climaQuarter.statusTrimestre, "Fechado");
assert.equal(climaQuarter.mesesHomologados, 3);
assert.equal(climaQuarter.metaTrimestral, 60);
assert.equal(climaQuarter.resultadoTrimestral, 60);
assert.equal(climaQuarter.desempenhoTrimestral, 1);
assert.equal(climaQuarter.situacaoTrimestral, "Em acompanhamento");

const capacitacaoQuarter = consolidarTrimestre(
  { id: 15, indicador: "Capacitação dos Empregados da CAIXA Loterias", unidadeMedida: "percentual" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { quantidadeCursosMinimaCapacitacao: 1 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { quantidadeCursosMinimaCapacitacao: 1 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { publicoAlvoElegivelCapacitacao: 151, empregadosCapacitadosCapacitacao: 137, quantidadeCursosMinimaCapacitacao: 1 } }
  ],
  "1TRI/2026"
);
assert.equal(capacitacaoQuarter.statusTrimestre, "Fechado");
assert.equal(capacitacaoQuarter.mesesHomologados, 3);
assert.equal(capacitacaoQuarter.metaTrimestral, 0.90);
assert.ok(Math.abs(capacitacaoQuarter.resultadoTrimestral - (137 / 151)) < 0.000001);
assert.equal(capacitacaoQuarter.desempenhoTrimestral, 1);
assert.equal(capacitacaoQuarter.situacaoTrimestral, "Atingido");

const aprimoramentoQuarter = consolidarTrimestre(
  { id: 4, indicador: "Aprimoramento da Experiência do Cliente", unidadeMedida: "percentual" },
  {
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
    camposEntrada: [{ nome: "melhoriasImplementadasMes", obrigatorio: true }]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { melhoriasImplementadasMes: 0 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { melhoriasImplementadasMes: 0 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { melhoriasImplementadasMes: 1 } }
  ],
  "1TRI/2026"
);
assert.equal(aprimoramentoQuarter.statusTrimestre, "Fechado");
assert.equal(aprimoramentoQuarter.mesesHomologados, 3);
assert.ok(Math.abs(aprimoramentoQuarter.metaTrimestral - 0.0454) < 0.000001);
assert.ok(Math.abs(aprimoramentoQuarter.resultadoTrimestral - 0.0454) < 0.000001);
assert.ok(Math.abs(aprimoramentoQuarter.desempenhoTrimestral - 1) < 0.000001);
assert.equal(aprimoramentoQuarter.dadosCalculados.melhoriasImplementadasAcumuladas, 1);
assert.equal(aprimoramentoQuarter.situacaoTrimestral, "Atingido");

const capacidadeTicQuarter = consolidarTrimestre(
  { id: 11, indicador: "Ampliar Capacidade de Desenvolvimento de Soluções de TIC", unidadeMedida: "percentual" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { marcoAlcancadoTIC: "Não iniciado" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { marcoAlcancadoTIC: "Não iniciado" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { marcoAlcancadoTIC: "Consulta Pública de Informações - RFI realizada" } }
  ],
  "1TRI/2026"
);
assert.equal(capacidadeTicQuarter.statusTrimestre, "Fechado");
assert.equal(capacidadeTicQuarter.mesesHomologados, 3);
assert.ok(Math.abs(capacidadeTicQuarter.metaTrimestral - 0.35) < 0.000001);
assert.ok(Math.abs(capacidadeTicQuarter.resultadoTrimestral - 0.35) < 0.000001);
assert.ok(Math.abs(capacidadeTicQuarter.desempenhoTrimestral - 1) < 0.000001);
assert.equal(capacidadeTicQuarter.dadosCalculados.marcoAlcancado, "Consulta Pública de Informações - RFI realizada");
assert.equal(capacidadeTicQuarter.situacaoTrimestral, "Atingido");

const plataformaJogosQuarter = consolidarTrimestre(
  { id: 10, indicador: "Share da Plataforma de Jogos", unidadeMedida: "marco" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { marcoAtualPlataformaJogos: "Equipe do projeto alocada", statusProjetoPlataformaJogos: "Em andamento" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { marcoAtualPlataformaJogos: "Kickoff realizado", statusProjetoPlataformaJogos: "Em andamento" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { marcoAtualPlataformaJogos: "Sprints iniciais executadas", statusProjetoPlataformaJogos: "Em andamento" } }
  ],
  "1TRI/2026"
);
assert.equal(plataformaJogosQuarter.statusTrimestre, "Fechado");
assert.equal(plataformaJogosQuarter.mesesHomologados, 3);
assert.equal(plataformaJogosQuarter.metaTrimestral, null);
assert.equal(plataformaJogosQuarter.resultadoTrimestral, null);
assert.equal(plataformaJogosQuarter.desempenhoTrimestral, null);
assert.equal(plataformaJogosQuarter.situacaoTrimestral, "Em andamento");
assert.equal(plataformaJogosQuarter.dadosCalculados.desempenhoNaoAplicavel, true);

const principiosJogoResponsavelQuarter = consolidarTrimestre(
  { id: 18, indicador: "Princípios de Jogo Responsável", unidadeMedida: "quantidade" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Pesquisa", acaoExecutada: "Ação em elaboração", statusAcao: "Em andamento" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Envolvimento das partes interessadas", acaoExecutada: "Preparação do fórum", statusAcao: "Concluída" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { elementoRGF: "Envolvimento das partes interessadas", acaoExecutada: "Instituição do Fórum de Jogo Responsável", statusAcao: "Concluída" } }
  ],
  "1TRI/2026"
);
assert.equal(principiosJogoResponsavelQuarter.statusTrimestre, "Fechado");
assert.equal(principiosJogoResponsavelQuarter.mesesHomologados, 3);
assert.equal(principiosJogoResponsavelQuarter.metaTrimestral, 1);
assert.equal(principiosJogoResponsavelQuarter.resultadoTrimestral, 1);
assert.equal(principiosJogoResponsavelQuarter.desempenhoTrimestral, 1);
assert.deepEqual(principiosJogoResponsavelQuarter.dadosCalculados.elementosAtendidos, ["Envolvimento das partes interessadas"]);
assert.equal(principiosJogoResponsavelQuarter.situacaoTrimestral, "Atingido");

const apoioSocioambientalRule = {
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
    }
  },
  camposEntrada: [
    { nome: "nomeIniciativaSocioambiental", obrigatorio: true },
    { nome: "statusIniciativaSocioambiental", obrigatorio: true }
  ]
};
const apoioSocioambientalQuarter = consolidarTrimestre(
  { id: 16, indicador: "Apoio ao Desenvolvimento Socioambiental", unidadeMedida: "quantidade" },
  apoioSocioambientalRule,
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em prospecção" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em estruturação" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em prospecção" } }
  ],
  "1TRI/2026"
);
assert.equal(apoioSocioambientalQuarter.statusTrimestre, "Fechado");
assert.equal(apoioSocioambientalQuarter.mesesHomologados, 3);
assert.equal(apoioSocioambientalQuarter.metaTrimestral, 0);
assert.equal(apoioSocioambientalQuarter.resultadoTrimestral, 0);
assert.equal(apoioSocioambientalQuarter.desempenhoTrimestral, null);
assert.equal(apoioSocioambientalQuarter.situacaoTrimestral, "Em prospecção/estruturação");

const apoioSocioambiental2TriQuarter = consolidarTrimestre(
  { id: 16, indicador: "Apoio ao Desenvolvimento Socioambiental", unidadeMedida: "quantidade" },
  apoioSocioambientalRule,
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em prospecção" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em estruturação" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "Projeto socioambiental em prospecção", statusIniciativaSocioambiental: "Em estruturação" } },
    { ano: 2026, mes: 4, status: "Homologado", competencia: "2026-04", trimestre: "2TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "1ª iniciativa socioambiental apoiada", statusIniciativaSocioambiental: "Em rito de governança" } },
    { ano: 2026, mes: 5, status: "Homologado", competencia: "2026-05", trimestre: "2TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "1ª iniciativa socioambiental apoiada", statusIniciativaSocioambiental: "Em rito de governança" } },
    { ano: 2026, mes: 6, status: "Homologado", competencia: "2026-06", trimestre: "2TRI/2026", camposEntrada: { nomeIniciativaSocioambiental: "1ª iniciativa socioambiental apoiada", statusIniciativaSocioambiental: "Apoiada/realizada" } }
  ],
  "2TRI/2026"
);
assert.equal(apoioSocioambiental2TriQuarter.statusTrimestre, "Fechado");
assert.equal(apoioSocioambiental2TriQuarter.metaTrimestral, 1);
assert.equal(apoioSocioambiental2TriQuarter.resultadoTrimestral, 1);
assert.equal(apoioSocioambiental2TriQuarter.desempenhoTrimestral, 1);
assert.equal(apoioSocioambiental2TriQuarter.situacaoTrimestral, "Atingido");

const ratioRule = {
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
const ratio = consolidarTrimestre(
  { id: 8, indicador: "Vendas digitais", unidadeMedida: "percentual" },
  ratioRule,
  [
    { ano: 2026, mes: 1, status: "Homologado", camposEntrada: { arrecadacaoCanaisEletronicosMes: 600000000, arrecadacaoTotalProdutosLoteriasMes: 2000000000 } },
    { ano: 2026, mes: 2, status: "Homologado", camposEntrada: { arrecadacaoCanaisEletronicosMes: 570000000, arrecadacaoTotalProdutosLoteriasMes: 1966900000 } },
    { ano: 2026, mes: 3, status: "Em preenchimento", camposEntrada: { arrecadacaoCanaisEletronicosMes: 600200000, arrecadacaoTotalProdutosLoteriasMes: 2000000000 } }
  ],
  "1TRI/2026"
);
assert.ok(Math.abs(ratio.resultadoTrimestral - (1170000000 / 3966900000)) < 0.000001);
assert.ok(Math.abs(ratio.desempenhoTrimestral - ((1170000000 / 3966900000) / 0.2805)) < 0.000001);
assert.equal(ratio.metaTrimestral, 0.2805);
assert.equal(ratio.statusTrimestre, "Parcial");
assert.equal(ratio.canaisDigitaisAcumuladoTrimestre, 1170000000);
assert.equal(ratio.produtosLoteriasAcumuladoTrimestre, 3966900000);

const ggrFormulaQuarter = consolidarTrimestre(
  { id: 5, indicador: "Gross Gaming Revenue (GGR)", unidadeMedida: "moeda" },
  {
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
        "2026-06": 6512131485,
        "2026-09": 10271204884,
        "2026-12": 15600000000
      }
    },
    camposEntrada: [
      { nome: "arrecadacaoTotalMes", obrigatorio: true },
      { nome: "premiosAPagarMes", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", camposEntrada: { arrecadacaoTotalMes: 1900000000, premiosAPagarMes: 843406961.43 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", camposEntrada: { arrecadacaoTotalMes: 1700000000, premiosAPagarMes: 759933545.57 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", camposEntrada: { arrecadacaoTotalMes: 2350000000, premiosAPagarMes: 1024454998.71 } }
  ],
  "1TRI/2026"
);
assert.equal(ggrFormulaQuarter.statusTrimestre, "Fechado");
assert.ok(Math.abs(ggrFormulaQuarter.metaTrimestral - 3070246140.78) < 0.0001);
assert.ok(Math.abs(ggrFormulaQuarter.resultadoTrimestral - 3322204494.29) < 0.0001);
assert.ok(Math.abs(ggrFormulaQuarter.desempenhoTrimestral - (3322204494.29 / 3070246140.78)) < 0.000001);
assert.equal(ggrFormulaQuarter.situacaoTrimestral, "Atingido");

const ieoQuarter = consolidarTrimestre(
  { id: 6, indicador: "IEO Recorrente", unidadeMedida: "percentual" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", camposEntrada: {} },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", camposEntrada: {} },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", camposEntrada: { ieoApuradoInformado: 0.108, percentualAtingidoOficialInformado: 104.22 } }
  ],
  "1TRI/2026"
);
assert.equal(ieoQuarter.statusTrimestre, "Fechado");
assert.equal(ieoQuarter.mesesHomologados, 3);
assert.ok(Math.abs(ieoQuarter.metaTrimestral - 0.1441) < 0.000001);
assert.ok(Math.abs(ieoQuarter.resultadoTrimestral - 0.108) < 0.000001);
assert.ok(Math.abs(ieoQuarter.desempenhoTrimestral - 1.0422) < 0.000001);
assert.equal(ieoQuarter.situacaoTrimestral, "Atingido");

const ofertasQuarter = consolidarTrimestre(
  { id: 1, indicador: "Índice de Ofertas Personalizadas aos Clientes Ativos", unidadeMedida: "percentual" },
  {
    indicadorId: 1,
    tipoCalculo: "percentual_direto",
    tipoConsolidacao: "acumulado_por_competencia",
    unidadeMedida: "percentual",
    metaAnualValor: 0.10,
    parametrosCalculo: {
      numeradorCampo: "clientesUnicosComOfertaPersonalizadaCompetencia",
      denominadorCampo: "baseClientesAtivosCompetencia",
      metaReferencia: 0.10,
      metaTipo: "fixa",
      sentidoMeta: "quanto_maior_melhor",
      validarNumeradorAteDenominador: false
    },
    camposEntrada: [
      { nome: "baseClientesAtivosCompetencia", obrigatorio: true },
      { nome: "clientesUnicosComOfertaPersonalizadaCompetencia", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", camposEntrada: {} },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", camposEntrada: {} },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", camposEntrada: { baseClientesAtivosCompetencia: 2773599, clientesUnicosComOfertaPersonalizadaCompetencia: 1241587 } }
  ],
  "1TRI/2026"
);
assert.equal(ofertasQuarter.statusTrimestre, "Fechado");
assert.equal(ofertasQuarter.mesesHomologados, 3);
assert.equal(ofertasQuarter.metaTrimestral, 0.10);
assert.ok(Math.abs(ofertasQuarter.resultadoTrimestral - (1241587 / 2773599)) < 0.000001);
assert.ok(Math.abs(ofertasQuarter.desempenhoTrimestral - ((1241587 / 2773599) / 0.10)) < 0.000001);
assert.equal(ofertasQuarter.situacaoTrimestral, "Atingido");

const repasseQuarter = consolidarTrimestre(
  { id: 17, indicador: "Repasse Social", unidadeMedida: "moeda" },
  {
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
        "2026-06": 4545104157.00,
        "2026-09": 7165115749.00,
        "2026-12": 10452751135.00
      },
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [{ nome: "repasseSocialAcumuladoCompetencia", obrigatorio: true }]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", camposEntrada: { repasseSocialAcumuladoCompetencia: 769496203.10 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", camposEntrada: { repasseSocialAcumuladoCompetencia: 1506381391.00 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", camposEntrada: { repasseSocialAcumuladoCompetencia: 2253033146.00 } }
  ],
  "1TRI/2026"
);
assert.equal(repasseQuarter.statusTrimestre, "Fechado");
assert.equal(repasseQuarter.mesesHomologados, 3);
assert.ok(Math.abs(repasseQuarter.metaTrimestral - 2142991572.00) < 0.0001);
assert.ok(Math.abs(repasseQuarter.resultadoTrimestral - 2253033146.00) < 0.0001);
assert.ok(Math.abs(repasseQuarter.desempenhoTrimestral - (2253033146.00 / 2142991572.00)) < 0.000001);
assert.equal(repasseQuarter.situacaoTrimestral, "Atingido");

const incentivoQuarter = consolidarTrimestre(
  { id: 19, indicador: "Incentivo Socioambiental", unidadeMedida: "moeda" },
  {
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
        "1TRI/2026": { metaPercentualLucro: 0, metaValorAcumulado: 0 }
      }
    },
    camposEntrada: [
      { nome: "nomeProjetoIncentivoSocioambiental", obrigatorio: true },
      { nome: "statusProjetoIncentivoSocioambiental", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em prospecção", valorInvestidoMes: 0 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em estruturação", valorInvestidoMes: 0 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { nomeProjetoIncentivoSocioambiental: "Projeto", statusProjetoIncentivoSocioambiental: "Em prospecção", valorInvestidoMes: 0 } }
  ],
  "1TRI/2026"
);
assert.equal(incentivoQuarter.statusTrimestre, "Fechado");
assert.equal(incentivoQuarter.mesesHomologados, 3);
assert.equal(incentivoQuarter.metaTrimestral, 0);
assert.equal(incentivoQuarter.resultadoTrimestral, 0);
assert.equal(incentivoQuarter.desempenhoTrimestral, null);
assert.equal(incentivoQuarter.situacaoTrimestral, "Em prospecção/estruturação");

const visibilidadeQuarter = consolidarTrimestre(
  { id: 20, indicador: "Visibilidade dos Repasses Sociais das Loterias CAIXA", unidadeMedida: "percentual" },
  {
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
        "1TRI/2026": { metaPercentual: 0, metaAcoesRealizadasAcumuladas: 0 }
      }
    },
    camposEntrada: [
      { nome: "acaoPropostaVisibilidade", obrigatorio: true },
      { nome: "statusAcaoVisibilidade", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em elaboração" } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em elaboração" } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { acaoPropostaVisibilidade: "relatorio_sorte_em_numeros_2025", statusAcaoVisibilidade: "Em homologação" } }
  ],
  "1TRI/2026"
);
assert.equal(visibilidadeQuarter.statusTrimestre, "Fechado");
assert.equal(visibilidadeQuarter.mesesHomologados, 3);
assert.equal(visibilidadeQuarter.metaTrimestral, 0);
assert.equal(visibilidadeQuarter.resultadoTrimestral, 0);
assert.equal(visibilidadeQuarter.desempenhoTrimestral, null);
assert.equal(visibilidadeQuarter.situacaoTrimestral, "Em elaboração/homologação");

const jogoResponsavelCapacitacaoQuarter = consolidarTrimestre(
  { id: 21, indicador: "Jogo Responsável 2026 (Capacitação e Disseminação)", unidadeMedida: "percentual" },
  {
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
        }
      }
    },
    camposEntrada: [
      { nome: "publicoAlvoElegivelJR", obrigatorio: true },
      { nome: "empregadosCapacitadosJR", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { quantidadeMinimaIniciativasJR: 1 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { quantidadeMinimaIniciativasJR: 1 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { publicoAlvoElegivelJR: 151, empregadosCapacitadosJR: 137, quantidadeMinimaIniciativasJR: 1 } }
  ],
  "1TRI/2026"
);
assert.equal(jogoResponsavelCapacitacaoQuarter.statusTrimestre, "Fechado");
assert.equal(jogoResponsavelCapacitacaoQuarter.mesesHomologados, 3);
assert.equal(jogoResponsavelCapacitacaoQuarter.metaTrimestral, 0.90);
assert.ok(Math.abs(jogoResponsavelCapacitacaoQuarter.resultadoTrimestral - (137 / 151)) < 0.000001);
assert.equal(jogoResponsavelCapacitacaoQuarter.desempenhoTrimestral, 1);
assert.equal(jogoResponsavelCapacitacaoQuarter.situacaoTrimestral, "Atingido");

const lastPosition = consolidarTrimestre(
  { id: 2, indicador: "NPS", unidadeMedida: "pontos" },
  {
    indicadorId: 2,
    tipoCalculo: "pontuacao_minima",
    tipoConsolidacao: "ultima_posicao",
    unidadeMedida: "pontos",
    metaAnualValor: 60,
    parametrosCalculo: { campoValor: "npsRealizado" },
    camposEntrada: [{ nome: "npsRealizado", obrigatorio: true }]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", camposEntrada: { npsRealizado: 50 } },
    { ano: 2026, mes: 2, status: "Homologado", camposEntrada: { npsRealizado: 65 } },
    { ano: 2026, mes: 3, status: "Em preenchimento", camposEntrada: { npsRealizado: 80 } }
  ],
  "1TRI/2026"
);
assert.equal(lastPosition.resultadoTrimestral, 65);
assert.equal(lastPosition.statusTrimestre, "Parcial");

const pixQuarter = consolidarTrimestre(
  { id: 9, indicador: "Vendas com Meio de Pagamento PIX", unidadeMedida: "percentual" },
  {
    indicadorId: 9,
    tipoCalculo: "razao_pix",
    tipoConsolidacao: "razao_acumulada_no_ano",
    unidadeMedida: "percentual",
    metaAnualValor: 0.65,
    parametrosCalculo: {
      campoNumerador: "arrecadacaoPixMes",
      campoDenominador: "arrecadacaoTotalCanaisEletronicosMes",
      metasTrimestrais: { "1TRI/2026": 0.61 }
    },
    camposEntrada: [
      { nome: "arrecadacaoPixMes", obrigatorio: true },
      { nome: "arrecadacaoTotalCanaisEletronicosMes", obrigatorio: false }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", camposEntrada: { arrecadacaoPixMes: 411428638.26, arrecadacaoTotalCanaisEletronicosMes: 600000000 } },
    { ano: 2026, mes: 2, status: "Homologado", camposEntrada: { arrecadacaoPixMes: 356327813.95, arrecadacaoTotalCanaisEletronicosMes: 530000000 } },
    { ano: 2026, mes: 3, status: "Homologado", camposEntrada: { arrecadacaoPixMes: 359270143.4, arrecadacaoTotalCanaisEletronicosMes: 556100000 } }
  ],
  "1TRI/2026"
);
assert.equal(pixQuarter.statusTrimestre, "Fechado");
assert.ok(Math.abs(pixQuarter.resultadoCalculadoTrimestral - (1127026595.61 / 1686100000)) < 0.000001);
assert.equal(pixQuarter.resultadoOficialApresentado, 0.67);
assert.equal(pixQuarter.resultadoTrimestral, 0.67);
assert.equal(pixQuarter.pixAcumuladoTrimestre, 1127026595.61);
assert.equal(pixQuarter.canaisAcumuladoTrimestre, 1686100000);
assert.ok(Math.abs(pixQuarter.desempenhoTrimestral - (0.67 / 0.61)) < 0.000001);
assert.equal(pixQuarter.situacaoTrimestral, "Atingido");

const lucroQuarter = consolidarTrimestre(
  { id: 7, indicador: "Lucro Liquido Recorrente", unidadeMedida: "moeda" },
  {
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 119377680.03 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 222011430.58 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", camposEntrada: { lucroLiquidoRecorrenteAcumulado: 336321887.69 } }
  ],
  "1TRI/2026"
);
assert.equal(lucroQuarter.statusTrimestre, "Fechado");
assert.ok(Math.abs(lucroQuarter.metaTrimestral - 268666666.67) < 0.0001);
assert.ok(Math.abs(lucroQuarter.resultadoTrimestral - 336321887.69) < 0.0001);
assert.ok(Math.abs(lucroQuarter.desempenhoTrimestral - (336321887.69 / 268666666.67)) < 0.000001);
assert.equal(lucroQuarter.situacaoTrimestral, "Atingido");

const ecossistemaQuarter = consolidarTrimestre(
  { id: 22, indicador: "Arrecadação Gerada com o Ecossistema", unidadeMedida: "percentual" },
  {
    indicadorId: 22,
    tipoCalculo: "crescimento_comparado_base_2025",
    tipoConsolidacao: "acumulado_periodo_equivalente",
    unidadeMedida: "percentual",
    metaAnualValor: 1.1,
    parametrosCalculo: {
      campoValor2026Mes: "arrecadacaoEcossistemaMes2026",
      campoBase2025PeriodoEquivalente: "arrecadacaoEcossistema2025PeriodoEquivalente",
      metaCrescimento: 0.1,
      metaIndice: 1.1
    },
    camposEntrada: [
      { nome: "arrecadacaoEcossistema2025PeriodoEquivalente", obrigatorio: true },
      { nome: "arrecadacaoEcossistemaMes2026", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 10000000, arrecadacaoEcossistemaMes2026: 12000000 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 12000000, arrecadacaoEcossistemaMes2026: 13000000 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoEcossistema2025PeriodoEquivalente: 13000000, arrecadacaoEcossistemaMes2026: 14000000 } }
  ],
  "1TRI/2026"
);
assert.equal(ecossistemaQuarter.statusTrimestre, "Fechado");
assert.equal(ecossistemaQuarter.metaTrimestral, 38500000);
assert.equal(ecossistemaQuarter.resultadoTrimestral, 39000000);
assert.equal(ecossistemaQuarter.resultadoCalculadoTrimestral, 39000000);
assert.equal(ecossistemaQuarter.resultadoOficialApresentado, 39000000);
assert.ok(Math.abs(ecossistemaQuarter.desempenhoTrimestral - (39000000 / 38500000)) < 0.000001);
assert.equal(ecossistemaQuarter.baseReferencia2025Trimestre, 35000000);
assert.ok(Math.abs(ecossistemaQuarter.indiceTrimestral - (39000000 / 35000000)) < 0.000001);
assert.ok(Math.abs(ecossistemaQuarter.crescimentoTrimestral - ((39000000 / 35000000) - 1)) < 0.000001);
assert.equal(ecossistemaQuarter.situacaoTrimestral, "Atingido");

const ecossistemaCenariosQuarter = consolidarTrimestre(
  { id: 22, indicador: "Arrecadação Gerada com o Ecossistema", unidadeMedida: "percentual" },
  {
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
      curvasCenarios: {
        lotex: { "1TRI": { referencia2025: 0.90, meta2026: 0.99 } },
        lotex_marketplace: { "1TRI": { referencia2025: 3.42, meta2026: 3.76 } }
      },
      cenarios: [
        { value: "lotex", label: "Lotex" },
        { value: "lotex_marketplace", label: "Lotex + Marketplace" }
      ]
    },
    camposEntrada: [
      { nome: "cenarioApuracaoEcossistema", obrigatorio: true },
      { nome: "arrecadacaoViaEcossistema", obrigatorio: true },
      { nome: "arrecadacaoTotal", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { cenarioApuracaoEcossistema: "lotex_marketplace", arrecadacaoViaEcossistema: 242300000, arrecadacaoTotal: 5966900000 } }
  ],
  "1TRI/2026"
);
assert.equal(ecossistemaCenariosQuarter.statusTrimestre, "Parcial");
assert.ok(Math.abs(ecossistemaCenariosQuarter.metaTrimestral - 0.0376) < 0.000001);
assert.ok(Math.abs(ecossistemaCenariosQuarter.resultadoTrimestral - (242300000 / 5966900000)) < 0.000001);
assert.ok(Math.abs(ecossistemaCenariosQuarter.desempenhoTrimestral - ((242300000 / 5966900000) / 0.0376)) < 0.000001);
assert.equal(ecossistemaCenariosQuarter.cenarioEcossistemaLabel, "Lotex + Marketplace");
assert.ok(Math.abs(ecossistemaCenariosQuarter.referencia2025EcossistemaTrimestre - 0.0342) < 0.000001);
assert.equal(ecossistemaCenariosQuarter.situacaoTrimestral, "Atingido");

const redeLotericaQuarter = consolidarTrimestre(
  { id: 23, indicador: "Participação da Rede Lotérica nos Negócios", unidadeMedida: "percentual" },
  {
    indicadorId: 23,
    tipoCalculo: "crescimento_rede_loterica_base_2025",
    tipoConsolidacao: "acumulado_periodo_equivalente",
    unidadeMedida: "percentual",
    metaAnualValor: 1.02,
    parametrosCalculo: {
      campoValor2026Mes: "arrecadacaoRedeLotericaMes2026",
      campoBase2025PeriodoEquivalente: "arrecadacaoRedeLoterica2025PeriodoEquivalente",
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
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 1000000000, arrecadacaoRedeLotericaMes2026: 1030000000 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 950000000, arrecadacaoRedeLotericaMes2026: 980000000 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025PeriodoEquivalente: 1050000000, arrecadacaoRedeLotericaMes2026: 1080000000 } }
  ],
  "1TRI/2026"
);
assert.equal(redeLotericaQuarter.statusTrimestre, "Fechado");
assert.equal(redeLotericaQuarter.metaTrimestral, 3060000000);
assert.equal(redeLotericaQuarter.resultadoTrimestral, 3090000000);
assert.ok(Math.abs(redeLotericaQuarter.desempenhoTrimestral - (3090000000 / 3060000000)) < 0.000001);
assert.equal(redeLotericaQuarter.baseReferencia2025Trimestre, 3000000000);
assert.ok(Math.abs(redeLotericaQuarter.indiceTrimestral - 1.03) < 0.000001);
assert.ok(Math.abs(redeLotericaQuarter.crescimentoTrimestral - 0.03) < 0.000001);
assert.equal(redeLotericaQuarter.situacaoTrimestral, "Atingido");

const redeLotericaIncrementoQuarter = consolidarTrimestre(
  { id: 23, indicador: "Participação da Rede Lotérica nos Negócios da CAIXA Loterias", unidadeMedida: "percentual" },
  {
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
      }
    },
    camposEntrada: [
      { nome: "arrecadacaoRedeLoterica2025", obrigatorio: true },
      { nome: "arrecadacaoRedeLoterica2026", obrigatorio: true }
    ]
  },
  [
    { ano: 2026, mes: 1, status: "Homologado", competencia: "2026-01", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025: 1000000000, arrecadacaoRedeLoterica2026: 1005693000 } },
    { ano: 2026, mes: 2, status: "Homologado", competencia: "2026-02", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025: 1000000000, arrecadacaoRedeLoterica2026: 1005693000 } },
    { ano: 2026, mes: 3, status: "Homologado", competencia: "2026-03", trimestre: "1TRI/2026", camposEntrada: { arrecadacaoRedeLoterica2025: 1000000000, arrecadacaoRedeLoterica2026: 1005693000 } }
  ],
  "1TRI/2026"
);
assert.equal(redeLotericaIncrementoQuarter.statusTrimestre, "Fechado");
assert.ok(Math.abs(redeLotericaIncrementoQuarter.metaTrimestral - 0.005) < 0.000001);
assert.ok(Math.abs(redeLotericaIncrementoQuarter.resultadoTrimestral - 0.005693) < 0.000001);
assert.ok(Math.abs(redeLotericaIncrementoQuarter.desempenhoTrimestral - 1.1386) < 0.000001);
assert.ok(Math.abs(redeLotericaIncrementoQuarter.indiceRedeLotericaTrimestre - 1.005693) < 0.000001);
assert.ok(Math.abs(redeLotericaIncrementoQuarter.incrementoRedeLotericaTrimestre - 0.005693) < 0.000001);
assert.equal(redeLotericaIncrementoQuarter.situacaoTrimestral, "Atingido");
console.log("Testes trimestrais OK");


