const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const executiveSummary = fs.readFileSync(path.join(root, "assets", "js", "executiveSummary.js"), "utf8");
const executiveHtml = fs.readFileSync(path.join(root, "resumo-executivo.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "assets", "css", "styles.css"), "utf8");

assert.match(executiveSummary, /chartFilter:\s*\{/);
assert.match(executiveSummary, /function scrollToExecutiveTable\(delay = 0\)/);
assert.match(executiveSummary, /function applyChartFilter\(pilar, situacao, options = \{\}\)/);
assert.match(executiveSummary, /function clearChartFilter\(\)/);
assert.match(executiveSummary, /function filterResultsByChart\(results\)/);
assert.match(executiveSummary, /HIGHLIGHT_LIMIT = 12/);
assert.match(executiveSummary, /function applyHighlightFilter\(indicadorId\)/);
assert.match(executiveSummary, /function filterResultsByHighlight\(results\)/);
assert.match(executiveSummary, /function renderHighlights\(results\)/);
assert.match(executiveSummary, /chart\.getElementsAtEventForMode/);
assert.match(executiveSummary, /row\[segment\.key\]/);
assert.match(executiveSummary, /applyChartFilter\(row\.pillar, segment\.situation, \{ scrollToTable: true \}\)/);
assert.match(executiveSummary, /scrollToExecutiveTable\(100\)/);
assert.match(executiveSummary, /window\.setTimeout\(scroll, delay\)/);
assert.match(executiveSummary, /canvas\.style\.cursor/);
assert.match(executiveSummary, /Pilar: \$\{context\.label\}/);
assert.match(executiveSummary, /Situa/);
assert.match(executiveSummary, /Quantidade: \$\{quantity\}/);

assert.match(executiveHtml, /id="executiveChartFilterBanner"/);
assert.match(executiveHtml, /id="executiveChartFilterText"/);
assert.match(executiveHtml, /id="clearExecutiveChartFilter"/);
assert.match(executiveHtml, /id="executiveHighlights"/);
assert.match(executiveHtml, /Destaques dos Indicadores/);
assert.match(executiveHtml, /id="toggleExecutiveHighlights"/);
assert.match(executiveHtml, /id="viewAllExecutiveIndicators"/);
assert.match(executiveHtml, /id="clearExecutiveHighlightFilter"/);
assert.match(executiveHtml, /class="tabela-executiva"/);
assert.match(executiveHtml, /Limpar filtro do gr/);
assert.doesNotMatch(executiveHtml, /executivePillarCards/);
assert.doesNotMatch(executiveHtml, /executivePillarBreakdown/);
assert.doesNotMatch(executiveHtml, /Desempenho por pilar/);
assert.doesNotMatch(executiveHtml, /Panorama dos pilares/);

assert.match(styles, /\.executive-chart-filter-banner/);
assert.match(styles, /\.executive-chart-filter-banner\[hidden\]/);
assert.match(styles, /\.executive-table-panel\s*\{[\s\S]*scroll-margin-top: 140px;/);
assert.match(styles, /\.executive-highlights-panel/);
assert.match(styles, /@keyframes executiveHighlightsScroll/);
assert.match(styles, /\.executive-highlight-card/);
assert.match(styles, /\.tabela-executiva/);
assert.match(styles, /table-layout: fixed/);
assert.match(styles, /\.executive-table-wrap\s*\{[\s\S]*overflow-x: visible;/);
assert.doesNotMatch(styles, /\.executive-breakdown-table/);
assert.doesNotMatch(styles, /\.executive-pillar-grid/);
assert.doesNotMatch(styles, /\.executive-table-wrap table\s*\{[\s\S]*min-width: 1180px;/);

console.log("Testes do filtro interativo do grafico executivo OK");
