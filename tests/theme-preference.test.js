const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const appPublic = fs.readFileSync(path.join(root, "public", "assets", "js", "app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "assets", "css", "styles.css"), "utf8");
const cssPublic = fs.readFileSync(path.join(root, "public", "assets", "css", "styles.css"), "utf8");
const executiveSource = fs.readFileSync(path.join(root, "assets", "js", "executiveSummary.js"), "utf8");
const executivePublic = fs.readFileSync(path.join(root, "public", "assets", "js", "executiveSummary.js"), "utf8");

assert.equal(appSource, appPublic, "O gerenciador de tema publicado deve espelhar o código-fonte");
assert.equal(cssSource, cssPublic, "As paletas publicadas devem espelhar o código-fonte");

assert.equal(executiveSource, executivePublic);

const stored = new Map();
const bodyClasses = new Map();
const chart = {
  options: {
    plugins: { legend: { labels: {} }, tooltip: {} },
    scales: { x: { ticks: {}, grid: {} }, y: { ticks: {}, grid: {} } }
  },
  updateMode: null,
  update(mode) { this.updateMode = mode; }
};
const Chart = {
  defaults: {
    plugins: { legend: { labels: {} }, tooltip: {} },
    font: {}
  },
  instances: { 1: chart }
};
const document = {
  documentElement: { dataset: { appVersion: "1.0.0" } },
  body: {
    classList: {
      toggle(name, enabled) { bodyClasses.set(name, enabled); }
    },
    insertAdjacentHTML() {}
  },
  addEventListener() {}
};
const context = {
  URLSearchParams,
  console,
  document,
  Chart,
  CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
  window: {
    document,
    Chart,
    localStorage: {
      getItem(key) { return stored.get(key) ?? null; },
      setItem(key, value) { stored.set(key, value); }
    },
    matchMedia() { return { matches: true }; },
    dispatchEvent() {}
  }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(appSource, context, { filename: "app.js" });

const internals = context.window.__APP_HEADER_TEST_INTERNALS__;
assert.equal(internals.normalizeThemePreference("LIGHT"), "light");
assert.equal(internals.normalizeThemePreference("desconhecido"), "dark");
assert.equal(internals.resolvedTheme("system"), "light", "Automático deve seguir a preferência clara do dispositivo");

const applied = internals.applyTheme("light", { persist: true });
assert.equal(applied.theme, "light");
assert.equal(document.documentElement.dataset.theme, "light");
assert.equal(document.documentElement.dataset.themePreference, "light");
assert.equal(stored.get("caixa-loterias-theme"), "light");
assert.equal(bodyClasses.get("theme-light-institutional"), true);
assert.equal(bodyClasses.get("theme-dark-blue"), false);
assert.equal(Chart.defaults.color, "#40566d");
assert.equal(chart.options.plugins.legend.labels.color, "#24384d");
assert.equal(chart.options.scales.y.ticks.color, "#40566d");
assert.equal(chart.updateMode, "none");

internals.applyTheme("dark", { persist: true });
assert.equal(document.documentElement.dataset.theme, "dark");
assert.equal(stored.get("caixa-loterias-theme"), "dark");
assert.equal(bodyClasses.get("theme-dark-blue"), true);
assert.equal(Chart.defaults.color, "#afc4dd");

assert.match(appSource, /Claro Institucional/);
assert.match(appSource, /Azul Noturno/);
assert.match(appSource, /Automático/);
assert.match(cssSource, /:root\[data-theme="light"\]/);
assert.match(cssSource, /\.theme-preference/);
assert.doesNotMatch(executiveSource, /color:\s*"#d8efff"/);
assert.doesNotMatch(executiveSource, /color:\s*"#afc4dd"/);
assert.doesNotMatch(executiveSource, /color:\s*"#f5f9ff"/);

console.log("theme-preference.test.js: OK");
