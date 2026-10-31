const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const formulas = require("../assets/js/formulas.js");
const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 8);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 8);

const closeTo = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deveria ser aproximadamente ${expected}`);
};

const monthlyComponents = [
  [2030288935.15, 624392611.64],
  [1954616641.35, 580582876.90],
  [1982006914.05, 565188124.10],
  [2036790906.20, 584304495.10],
  [2129528475.60, 606895557.45],
  [2058726434.20, 576730146.88],
  [1965181462.25, 574100983.07],
  [2043755619.10, 609265150.11]
];
const launchesThroughAugust = monthlyComponents.map(([total, channels], index) => ({
  id: 85 + index,
  indicadorId: 8,
  ano: 2026,
  mes: index + 1,
  competencia: `2026-${String(index + 1).padStart(2, "0")}`,
  camposEntrada: {
    arrecadacaoCanaisEletronicosMes: channels,
    arrecadacaoTotalProdutosLoteriasMes: total
  }
}));

const august = launchesThroughAugust.at(-1);
const augustResult = formulas.calcularIndicador(indicator, rule, august, launchesThroughAugust);
closeTo(augustResult.canaisEletronicosAcumulado, 4721459945.25, 0.001);
closeTo(augustResult.produtosLoteriasAcumulado, 16200895387.90, 0.001);
closeTo(augustResult.resultadoCalculadoAcumulado, 4721459945.25 / 16200895387.90);
assert.equal(augustResult.resultadoAcumuladoFormatado, "29,14%");

// Simula a tela com o snapshot persistido anterior de SET ainda na colecao.
const staleSeptember = {
  id: 93,
  indicadorId: 8,
  ano: 2026,
  mes: 9,
  competencia: "2026-09",
  metaMensal: 0.2837,
  status: "Em preenchimento",
  camposEntrada: {
    resultadoAcumuladoDocumentalCanaisDigitais: 0.2917,
    percentualAtingidoOficialCanaisDigitais: 1.0282,
    tipoPosicaoCanaisDigitais: "fechamento_trimestral"
  }
};
const currentSeptember = {
  ...staleSeptember,
  camposEntrada: {
    ...staleSeptember.camposEntrada,
    arrecadacaoCanaisEletronicosMes: 734340549.16,
    arrecadacaoTotalProdutosLoteriasMes: 2505439613.65
  }
};

const expectedChannels = 5455800494.41;
const expectedTotal = 18706335001.55;
const expectedMonthly = 734340549.16 / 2505439613.65;
const expectedAccumulated = expectedChannels / expectedTotal;

const calculateSeptember = (collection) => formulas.calcularIndicador(
  indicator,
  rule,
  currentSeptember,
  collection
);

const fromStaleCollection = calculateSeptember([...launchesThroughAugust, staleSeptember]);
closeTo(fromStaleCollection.resultadoMensal, expectedMonthly);
closeTo(fromStaleCollection.canaisEletronicosAcumulado, expectedChannels, 0.001);
closeTo(fromStaleCollection.produtosLoteriasAcumulado, expectedTotal, 0.001);
closeTo(fromStaleCollection.resultadoCalculadoAcumulado, expectedAccumulated);
assert.equal(fromStaleCollection.resultadoMensalFormatado, "29,31%");
assert.equal(fromStaleCollection.resultadoAcumulado, 0.2917, "a apresentacao oficial documental deve ser preservada");
assert.equal(fromStaleCollection.resultadoAcumuladoFormatado, "29,17%");
assert.equal(fromStaleCollection.percentualAtingidoAnual, 1.0282);
assert.equal(fromStaleCollection.percentualAtingidoAnualFormatado, "102,82%");
assert.equal(fromStaleCollection.situacao, "Atingido");
assert.equal(fromStaleCollection.origemResultadoCanaisDigitais, "documental_com_componentes");

// A competencia atual ja presente na colecao deve ser substituida, nunca somada novamente.
for (const collection of [
  [...launchesThroughAugust, currentSeptember],
  [...launchesThroughAugust, currentSeptember, staleSeptember]
]) {
  const result = calculateSeptember(collection);
  closeTo(result.canaisEletronicosAcumulado, expectedChannels, 0.001);
  closeTo(result.produtosLoteriasAcumulado, expectedTotal, 0.001);
  closeTo(result.resultadoCalculadoAcumulado, expectedAccumulated);
}

assert.equal(
  fs.readFileSync(path.join(root, "assets", "js", "formulas.js"), "utf8"),
  fs.readFileSync(path.join(root, "public", "assets", "js", "formulas.js"), "utf8"),
  "os espelhos de formulas.js devem permanecer byte a byte identicos"
);

console.log("Indicador 08: SET participa uma unica vez do acumulado tecnico JAN-SET.");
