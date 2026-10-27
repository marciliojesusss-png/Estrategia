const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 2);
const indicator = bootstrap.indicadores.find((item) => Number(item.numero) === 2);
const npsLaunches = bootstrap.lancamentos
  .filter((item) => Number(item.indicadorId) === 2 && Number(item.ano) === 2026)
  .sort((a, b) => Number(a.mes) - Number(b.mes));

assert.equal(rule.metaAnualValor, 60);
assert.equal(rule.parametrosCalculo.metaTipo, "meta_absoluta_por_competencia");
assert.equal(rule.parametrosCalculo.metaVigenteNPS2026, 60);
assert.equal(rule.parametrosCalculo.baselineNPS, 55);
assert.equal(rule.parametrosCalculo.notaReferenciaNPS, 70);
assert.deepEqual(
  Object.values(rule.parametrosCalculo.referenciasPorCompetencia),
  [55, 55, 55, 58, 58, 60, 60, 60, 60, 60, 60, 60]
);
assert.equal(rule.parametrosCalculo.contextoMetodologicoMeta58.valor, 58);
assert.deepEqual(rule.parametrosCalculo.contextoMetodologicoMeta58.aplicaCompetencias, ["2026-04", "2026-05"]);
assert.equal(
  rule.camposEntrada.find((field) => field.nome === "metaReferenciaCompetenciaNPS")?.somenteLeitura,
  true
);
for (const fieldName of [
  "tipoPosicaoNPS", "metaReferenciaCompetenciaNPS", "percentualPromotores", "percentualDetratores",
  "totalRespondentesNPS", "quantidadePromotoresNPS", "quantidadeNeutrosNPS", "quantidadeDetratoresNPS",
  "npsApurado", "resultadoDocumentalNPS", "metaDocumentalNPS", "percentualAtingidoOficialNPS",
  "dataBasePesquisaNPS", "fontePesquisaNPS", "observacaoArea"
]) {
  assert.ok(rule.camposEntrada.some((field) => field.nome === fieldName), `${fieldName} deve estar modelado`);
}
assert.equal(rule.camposEntrada.find((field) => field.nome === "percentualPromotores")?.entradaPtBr, true);
assert.equal(rule.camposEntrada.find((field) => field.nome === "percentualDetratores")?.entradaPtBr, true);
assert.equal(rule.camposEntrada.find((field) => field.nome === "npsApurado")?.somenteLeitura, true);
assert.match(indicator.metaAnualDescricao, /58 em ABR\/MAI e 60 pontos de JUN a DEZ/);
assert.equal(npsLaunches.length, 12);
assert.deepEqual(npsLaunches.map((item) => item.metaMensal), [55, 55, 55, 58, 58, 60, 60, 60, 60, 60, 60, 60]);
assert.deepEqual(
  npsLaunches.map((item) => item.camposEntrada.metaReferenciaCompetenciaNPS),
  [55, 55, 55, 58, 58, 60, 60, 60, 60, 60, 60, 60]
);
assert.deepEqual(npsLaunches.map((item) => item.status), [
  "Em preenchimento", "Em preenchimento", "Em preenchimento", "Em preenchimento", "Em preenchimento",
  "Em preenchimento", "Em preenchimento", "Em preenchimento", "Em preenchimento",
  "Não iniciado", "Não iniciado", "Não iniciado"
]);
assert.deepEqual(npsLaunches.map((item) => item.resultadoMensal), [55, 55, 55, 55, 55, 59.2, 59.2, 59.2, 59.2, null, null, null]);
for (const launch of npsLaunches.slice(0, 3)) {
  assert.equal(launch.camposEntrada.homologadoDiretoriaHistorico, true);
  assert.equal(launch.camposEntrada.fonteHomologacaoHistorica, "Planilha 16.10");
}
assert.equal(npsLaunches[5].percentualAtingidoMensal, 0.9866);
assert.equal(npsLaunches[5].situacaoCalculada, "Abaixo da meta");
assert.doesNotMatch(npsLaunches[5].camposEntrada.observacaoArea, /102,07%/);

for (const relative of ["bootstrap-data.js", "dataStore.js", "formulas.js", "dashboard.js", "executiveSummary.js", "quarterly.js", "indicators.js", "launches.js", "approvals.js"]) {
  assert.equal(
    fs.readFileSync(path.join(root, "assets", "js", relative), "utf8"),
    fs.readFileSync(path.join(root, "public", "assets", "js", relative), "utf8"),
    `${relative} deve permanecer idêntico nos dois diretórios de assets`
  );
}

console.log("NPS: curva mensal 55/58/60, carregamento de posição e governança legada validados.");
