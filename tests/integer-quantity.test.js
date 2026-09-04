const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const CurrencyBR = require("../assets/js/currency.js");
const formulas = require("../assets/js/formulas.js");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const context = { window: {}, CurrencyBR };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "calculations.js"), "utf8"), context);
const { parseInteiroBR, formatarInteiroBR } = context.window.Calculations;

assert.equal(parseInteiroBR("3018556"), 3018556);
assert.equal(parseInteiroBR("3.018.556"), 3018556);
assert.equal(parseInteiroBR("2.371.981"), 2371981);
assert.equal(parseInteiroBR(2371981), 2371981);
assert.equal(parseInteiroBR("2.371.981,50"), null);
assert.equal(parseInteiroBR("12.5"), null);
assert.equal(parseInteiroBR(-1), null);
assert.equal(parseInteiroBR(1.5), null);
assert.equal(parseInteiroBR(null), null);
assert.equal(parseInteiroBR(undefined), null);
assert.equal(parseInteiroBR(""), null);
assert.equal(formatarInteiroBR(3018556), "3.018.556");
assert.equal(formatarInteiroBR(2371981), "2.371.981");
assert.equal(formatarInteiroBR(46), "46");
assert.equal(formatarInteiroBR(0), "0");
assert.equal(formatarInteiroBR(null), "-");
assert.equal(context.window.Calculations.formatarValor("3.018.556", "inteiro"), "3.018.556");

const data = loadBootstrapData();
const integerFields = new Set([
  "baseClientesAtivosCompetencia",
  "clientesUnicosComOfertaPersonalizadaCompetencia",
  "melhoriasImplementadasMes",
  "mulheresGestorasMes",
  "gestoresEnquadradosMes",
  "totalGestoresMes",
  "publicoAlvoElegivelCapacitacao",
  "empregadosCapacitadosCapacitacao",
  "quantidadeCursosMinimaCapacitacao",
  "publicoAlvoElegivelJR",
  "empregadosCapacitadosJR",
  "quantidadeMinimaIniciativasJR"
]);
const fields = data.regrasIndicadores.flatMap((rule) => rule.camposEntrada || []);
for (const fieldName of integerFields) {
  const matches = fields.filter((field) => field.nome === fieldName);
  assert.ok(matches.length > 0, `campo inteiro ausente: ${fieldName}`);
  matches.forEach((field) => assert.equal(field.tipo, "inteiro", fieldName));
}

for (const fieldName of ["qmaatu", "qmaant", "npsApurado", "notaClimaApurada", "metaReferenciaClima"]){
  const field = fields.find((item) => item.nome === fieldName);
  assert.equal(field?.tipo, "numero", `${fieldName} deve continuar aceitando a semântica numérica original`);
}
for (const fieldName of ["arrecadacaoTotalMes", "lucroLiquidoRecorrenteAcumulado", "despesaPessoalMes"]){
  const field = fields.find((item) => item.nome === fieldName);
  assert.equal(field?.tipo, "moeda", `${fieldName} deve continuar monetário`);
}

const regra = data.regrasIndicadores.find((item) => Number(item.indicadorId) === 1);
const indicador = { id: 1, indicador: "Índice de Ofertas Personalizadas aos Clientes Ativos", unidadeMedida: "percentual" };
const camposEntrada = {
  baseClientesAtivosCompetencia: parseInteiroBR("3.018.556"),
  clientesUnicosComOfertaPersonalizadaCompetencia: parseInteiroBR("2.371.981")
};
const launch = { ano: 2026, mes: 1, camposEntrada };
const result = formulas.calcularIndicador(indicador, regra, launch, [launch]);
assert.ok(Math.abs(result.resultadoMensal - (2371981 / 3018556)) < 0.000001);
assert.ok(Math.abs(result.percentualAtingidoMensal - ((2371981 / 3018556) / 0.10)) < 0.000001);
assert.equal(result.resultadoMensalFormatado, "78,58%");
assert.equal(result.percentualAtingidoMensalFormatado, "785,8%");
assert.equal(context.window.Calculations.calcularStatusDesempenho(result.percentualAtingidoMensal), "Atingido");
assert.deepEqual(camposEntrada, {
  baseClientesAtivosCompetencia: 3018556,
  clientesUnicosComOfertaPersonalizadaCompetencia: 2371981
});

const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(launchesSource, /data-entry-type="\$\{escapeHtml\(field\.tipo \|\| "numero"\)\}"/);
assert.match(launchesSource, /type === "inteiro"/);
assert.match(launchesSource, /Calculations\.parseInteiroBR\(input\.value\)/);
assert.match(launchesSource, /formatIntegerEntryInput/);

for (const file of ["bootstrap-data.js", "calculations.js", "dataStore.js", "launches.js", "indicators.js", "approvals.js"]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "assets", "js", file)),
    fs.readFileSync(path.join(root, "public", "assets", "js", file)),
    `${file} deve ser idêntico nos dois diretórios de assets`
  );
}

console.log("Testes de quantidades inteiras em padrão brasileiro OK");
