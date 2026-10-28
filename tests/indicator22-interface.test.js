const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const calculations = {
  formatarPercentual(value, minimumFractionDigits = 0, maximumFractionDigits = Math.max(2, minimumFractionDigits)) {
    if (value === null || value === undefined || value === "") return "-";
    return `${(Number(value) * 100).toLocaleString("pt-BR", { minimumFractionDigits, maximumFractionDigits })}%`;
  },
  formatarValor(value, unit) {
    if (value === null || value === undefined || value === "") return "-";
    if (unit === "moeda") {
      return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return String(value);
  }
};
const context = { window: { PageModules: {}, Calculations: calculations }, Calculations: calculations };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/launches.js"), "utf8"), context);
const ui = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

const official = {
  "1TRI": { metaOficialReportada: 0.0099, resultadoOficialReportado: 0.0067, percentualAtingidoOficialReportado: 0.6712, fonte: "Informe DILOT/GERIN nº 0029/2026" },
  "2TRI": { metaOficialReportada: 0.0086, resultadoOficialReportado: 0.0061, percentualAtingidoOficialReportado: 0.7112, fonte: "Informe DILOT/GERIN nº 0056/2026" },
  "3TRI": { metaOficialReportada: 0.0075, resultadoOficialReportado: 0.006, percentualAtingidoOficialReportado: 0.8, fonte: "Informe DILOT/GERIN nº 0078/2026" },
  "4TRI": { metaOficialReportada: 0.0066, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, fonte: null }
};
const rule = {
  indicadorId: 22,
  tipoCalculo: "participacao_ecossistema_lotex",
  parametrosCalculo: {
    apresentacoesOficiaisTrimestrais: official,
    historicoRevisao: { metasRetrospectivas: { "1TRI": 0.0091, "2TRI": 0.0079 } }
  }
};
const technical = {
  metaTecnica2026: 0.012,
  resultadoTecnicoLotex: 0.0068,
  atingimentoTecnicoLotex: 0.5629,
  situacao: "Abaixo da meta",
  arrTotal2025: 1000000,
  arrEcoLotex2025: 11000,
  arrEcoMarketplace2025: 500,
  referenciaLotex2025: 0.011,
  fatorMetaVigente: 1.1,
  arrEcoMarketplace2026: 600
};

const jan = JSON.parse(JSON.stringify(ui.indicator22PresentationModel(technical, rule, { mes: 1, camposEntrada: {} })));
assert.deepEqual(jan.summary, [
  ["Meta da competência", "1,20%"],
  ["Resultado Lotex", "0,68%"],
  ["Atingimento da meta", "56,29%"],
  ["Situação", "Abaixo da meta"]
]);
assert.equal(jan.official.visible, false, "JAN não deve exibir fechamento oficial");
assert.equal(jan.annualGoal, "Meta 2026: crescimento mínimo de 10% sobre o resultado de 2025.");
assert.equal(jan.source, "Tabela mensal de acompanhamento");
assert.ok(jan.memoryDetails.some(([label, value]) => label === "Marketplace participa do cálculo oficial" && value === "Não"));
assert.ok(jan.memoryDetails.some(([label, value]) => label === "Cenário oficial" && value === "Lotex"));

for (const [month, quarter, expected] of [
  [3, "1TRI", ["0,99%", "0,67%", "67,12%", "Informe DILOT/GERIN nº 0029/2026"]],
  [6, "2TRI", ["0,86%", "0,61%", "71,12%", "Informe DILOT/GERIN nº 0056/2026"]],
  [9, "3TRI", ["0,75%", "0,60%", "80,00%", "Informe DILOT/GERIN nº 0078/2026"]]
]) {
  const presentation = ui.indicator22OfficialPresentation(rule, { mes: month, camposEntrada: {} }, {});
  assert.equal(presentation.visible, true, `${quarter} deve exibir fechamento oficial`);
  assert.deepEqual([
    calculations.formatarPercentual(presentation.meta, 2, 2),
    calculations.formatarPercentual(presentation.result, 2, 2),
    calculations.formatarPercentual(presentation.performance, 2, 2),
    presentation.source
  ], expected);
}

const december = ui.indicator22OfficialPresentation(rule, { mes: 12, camposEntrada: {} }, {});
assert.equal(december.visible, true);
assert.equal(calculations.formatarPercentual(december.meta, 2, 2), "0,66%");
assert.equal(december.result, null);
assert.equal(december.performance, null);
assert.equal(december.source, null);
assert.equal(ui.indicator22AnnualGoalText({ mes: 8 }), "Meta 2026: crescimento mínimo de 1% sobre o resultado de 2025.");

const view = fs.readFileSync(path.join(root, "views/frontend/lancamentos.php"), "utf8");
const source = fs.readFileSync(path.join(root, "assets/js/launches.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "assets/css/styles.css"), "utf8");
assert.match(view, /id="indicator22SummarySection"/);
assert.match(view, /id="indicator22OfficialSection"[^>]*hidden/);
assert.match(view, /<details id="indicator22MemorySection"[^>]*hidden>/, "memória deve iniciar recolhida, sem atributo open");
assert.match(source, /Arrecadação Total 2026/);
assert.match(source, /Arrecadação Lotex 2026/);
assert.match(source, /Tabela mensal de acompanhamento/);
assert.match(source, /\(Arrecadação Eco Lotex \/ Arrecadação Total\) × 100/);
assert.match(source, /Atingimento = Resultado Lotex \/ Meta da competência × 100/);
assert.doesNotMatch(source, /details\.push\(\["Numerador oficial"/, "detalhes técnicos não devem duplicar a memória");
assert.match(styles, /\.indicator22-summary-grid[\s\S]*grid-template-columns:\s*repeat\(4,/);
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*\.indicator22-summary-grid[\s\S]*repeat\(2,/);
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*\.indicator22-summary-grid[\s\S]*minmax\(0, 1fr\)/);
assert.equal(
  fs.readFileSync(path.join(root, "assets/js/launches.js"), "utf8"),
  fs.readFileSync(path.join(root, "public/assets/js/launches.js"), "utf8"),
  "espelhos de launches.js devem ser idênticos"
);
assert.equal(
  fs.readFileSync(path.join(root, "assets/css/styles.css"), "utf8"),
  fs.readFileSync(path.join(root, "public/assets/css/styles.css"), "utf8"),
  "espelhos de styles.css devem ser idênticos"
);

console.log("Testes da interface didática do Indicador 22 OK");
