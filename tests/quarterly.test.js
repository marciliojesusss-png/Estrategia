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
    campoValor: "ggrRealizadoMes",
    metaMensalFixa: 100
  },
  camposEntrada: [{ nome: "ggrRealizadoMes", obrigatorio: true }]
};
const launches = [
  { id: 1, indicadorId: 5, ano: 2026, mes: 1, nomeMes: "Janeiro", status: "Homologado", camposEntrada: { ggrRealizadoMes: 90 } },
  { id: 2, indicadorId: 5, ano: 2026, mes: 2, nomeMes: "Fevereiro", status: "Homologado", camposEntrada: { ggrRealizadoMes: 110 } },
  { id: 3, indicadorId: 5, ano: 2026, mes: 3, nomeMes: "Março", status: "Em preenchimento", camposEntrada: { ggrRealizadoMes: 100 } },
  { id: 4, indicadorId: 5, ano: 2026, mes: 4, nomeMes: "Abril", status: "Cancelado", camposEntrada: { ggrRealizadoMes: 500 } }
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

console.log("Testes trimestrais OK");
