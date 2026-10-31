const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const formulas = require("../assets/js/formulas.js");

const root = path.resolve(__dirname, "..");
const indicador = { id: 7, indicador: "Lucro Líquido Recorrente", unidadeMedida: "moeda" };
const metas = {
  "2026-01": 89555555.56,
  "2026-02": 89555555.55,
  "2026-03": 89555555.56,
  "2026-04": 89555555.55,
  "2026-05": 89555555.56,
  "2026-06": 89555555.55,
  "2026-07": 89555555.56,
  "2026-08": 89555555.55,
  "2026-09": 89555555.56
};
const regra = {
  indicadorId: 7,
  tipoCalculo: "lucro_recorrente_mensal",
  tipoConsolidacao: "ultima_posicao_mensal_homologada",
  unidadeMedida: "moeda",
  metaAnualValor: 1209000000,
  parametrosCalculo: {
    campoValorMensal: "lucroLiquidoRecorrenteCompetencia",
    campoValorAcumuladoLegado: "lucroLiquidoRecorrenteAcumulado",
    metaTipo: "curva_mensal_por_competencia",
    metasMensaisPorCompetencia: metas
  }
};
const historico = [
  {
    indicadorId: 7, ano: 2026, mes: 1, competencia: "2026-01", status: "Homologado",
    resultadoMensal: "1.19378e+008",
    camposEntrada: { lucroLiquidoRecorrenteAcumulado: 119377680.03 },
    metaReferencia: metas["2026-01"]
  },
  {
    indicadorId: 7, ano: 2026, mes: 2, competencia: "2026-02", status: "Homologado",
    resultadoMensal: "2.22011e+008",
    camposEntrada: { lucroLiquidoRecorrenteAcumulado: 222011430.58 },
    metaReferencia: metas["2026-02"]
  },
  {
    indicadorId: 7, ano: 2026, mes: 3, competencia: "2026-03", status: "Homologado",
    resultadoMensal: "3.36322e+008",
    camposEntrada: { lucroLiquidoRecorrenteAcumulado: 336321887.69 },
    metaReferencia: metas["2026-03"]
  }
];

const calculados = historico.map((lancamento) => formulas.calcularIndicador(
  indicador,
  regra,
  lancamento,
  historico.filter((item) => item.mes <= lancamento.mes)
));

assert.deepEqual(
  calculados.map((resultado) => resultado.resultadoMensal),
  [119377680.03, 102633750.55, 114310457.11],
  "a apresentação deve ignorar os acumulados científicos persistidos e usar o JSON histórico exato"
);
assert.equal(calculados[2].resultadoAcumulado, 336321887.69);
assert.equal(calculados[2].metaAcumulada, 268666666.67);
assert.equal(Math.round(calculados[2].percentualAtingidoAcumulado * 10000) / 100, 125.18);
assert.deepEqual(calculados.map((resultado) => resultado.situacao), ["Atingido", "Atingido", "Atingido"]);

const abrilASetembro = [
  111802634.71, 114547512.59, 108526486.50,
  109426456.08, 120214081.41, 140116636.10
].map((valor, index) => ({
  indicadorId: 7,
  ano: 2026,
  mes: index + 4,
  competencia: `2026-${String(index + 4).padStart(2, "0")}`,
  camposEntrada: { lucroLiquidoRecorrenteCompetencia: valor },
  metaReferencia: metas[`2026-${String(index + 4).padStart(2, "0")}`]
}));
const anoAteSetembro = [...historico, ...abrilASetembro];
assert.deepEqual(
  abrilASetembro.map((lancamento) => formulas.calcularIndicador(indicador, regra, lancamento, anoAteSetembro).resultadoMensal),
  [111802634.71, 114547512.59, 108526486.50, 109426456.08, 120214081.41, 140116636.10],
  "resultados mensais explícitos de abril a setembro devem permanecer inalterados"
);

const launches = fs.readFileSync(path.join(root, "assets/js/launches.js"), "utf8");
const publicLaunches = fs.readFileSync(path.join(root, "public/assets/js/launches.js"), "utf8");
const approvals = fs.readFileSync(path.join(root, "assets/js/approvals.js"), "utf8");
const publicApprovals = fs.readFileSync(path.join(root, "public/assets/js/approvals.js"), "utf8");
const formulasSource = fs.readFileSync(path.join(root, "assets/js/formulas.js"), "utf8");
const publicFormulasSource = fs.readFileSync(path.join(root, "public/assets/js/formulas.js"), "utf8");
assert.match(launches, /"lucro_recorrente_mensal", "razao_canais_digitais", "razao_pix", "melhorias_acumuladas"\]\.includes\(regra\?\.tipoCalculo\)/);
assert.match(approvals, /"lucro_recorrente_mensal"\]\.includes\(regra\?\.tipoCalculo\)/);
assert.equal(launches, publicLaunches, "launches.js deve ser idêntico nos dois diretórios de assets");
assert.equal(approvals, publicApprovals, "approvals.js deve ser idêntico nos dois diretórios de assets");
assert.equal(formulasSource, publicFormulasSource, "formulas.js deve ser idêntico nos dois diretórios de assets");

console.log("Testes da apresentação do Lucro Recorrente legado OK");
